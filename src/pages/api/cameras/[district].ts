export const prerender = false;

import type { APIRoute } from 'astro';
import { buildCwwp2Url, PHOTO_ONLY_DISTRICTS } from '@/lib/constants';
import { extractRoute, extractRouteNumber, extractDirection, extractPostmile, parseInService, cleanLocationName } from '@/lib/utils';
import { getRouteType, formatRoute } from '@/lib/constants';

interface RawCCTV {
  cctv: {
    index: string;
    location: {
      locationName?: string;
      nearbyPlace?: string;
      district: string;
      county?: string;
      route?: { '@_value': string } | string;
      direction?: { '@_value': string } | string;
      latitude?: string;
      longitude?: string;
      postmile?: { '@_value': string } | string;
    };
    inService: string;
    imageData: {
      static: {
        currentImageURL: string;
        currentImageUpdateFrequency?: string;
      };
      streamingVideoURL?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

function transformCameras(data: unknown, districtNum: number) {
  const raw = data as { data?: RawCCTV[] } | RawCCTV[];
  const items = Array.isArray(raw) ? raw : ((raw as { data?: RawCCTV[] }).data ?? []);

  return items
    .map((item: RawCCTV) => {
      try {
        const loc = item.cctv.location;
        const routeRaw = extractRoute(loc.route);
        const routeNum = extractRouteNumber(loc.route);
        // Use the pre-formatted route string from Caltrans (e.g. "I-5") if available
        const route = routeRaw && routeRaw.includes('-') ? routeRaw : formatRoute(routeNum);
        const routeType = getRouteType(routeNum);
        const district = parseInt(loc.district, 10) || districtNum;
        const hasVideo = !PHOTO_ONLY_DISTRICTS.has(district) && !!item.cctv.imageData.streamingVideoURL;

        const historicalImages: string[] = [];
        const imgData = item.cctv.imageData.static as Record<string, unknown>;
        for (let i = 1; i <= 12; i++) {
          const key1 = `referenceImage${i}UpdatesAgoURL`;
          const key2 = `referenceImages${i}UpdatesAgoURL`;
          const url = (imgData[key1] ?? imgData[key2]) as string | undefined;
          if (url && typeof url === 'string' && url.startsWith('http')) {
            historicalImages.push(url);
          }
        }

        const lastUpdateField = (item.cctv as Record<string, unknown>).lastUpdateTime as string | undefined;
        const lastUpdated = lastUpdateField ?? new Date().toISOString();
        const isStale = lastUpdateField
          ? (Date.now() - new Date(lastUpdateField).getTime()) > 15 * 60 * 1000
          : false;

        const elevRaw = (loc as Record<string, unknown>).elevation;
        const elevation = elevRaw != null ? parseFloat(String(elevRaw)) : null;
        const imageDesc = (item.cctv.imageData as Record<string, unknown>).imageDescription as string | undefined;

        return {
          id: `D${String(district).padStart(2, '0')}-${item.cctv.index}`,
          district,
          route,
          routeType,
          direction: extractDirection(loc.direction),
          county: loc.county ?? '',
          city: loc.nearbyPlace ?? '',
          location: cleanLocationName(loc.locationName ?? ''),
          latitude: parseFloat(loc.latitude ?? '0'),
          longitude: parseFloat(loc.longitude ?? '0'),
          postmile: extractPostmile(loc.postmile),
          elevation: isNaN(elevation ?? NaN) ? null : elevation,
          imageDescription: imageDesc && imageDesc !== 'Not Reported' ? imageDesc : null,
          imageUrl: item.cctv.imageData.static.currentImageURL,
          historicalImages,
          streamUrl: hasVideo ? (item.cctv.imageData.streamingVideoURL ?? null) : null,
          inService: parseInService(item.cctv.inService),
          lastUpdated,
          isStale,
          hasVideo,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

const STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

/** HEAD-check a sample of image URLs to detect district-wide staleness */
async function checkDistrictFreshness(cameras: { imageUrl: string }[]): Promise<boolean> {
  const sample = cameras.filter((_, i) => i % Math.max(1, Math.floor(cameras.length / 5)) === 0).slice(0, 5);
  if (sample.length === 0) return false;

  const results = await Promise.allSettled(
    sample.map(async (cam) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      try {
        const res = await fetch(cam.imageUrl, { method: 'HEAD', signal: controller.signal });
        const lastMod = res.headers.get('last-modified');
        if (lastMod) return Date.now() - new Date(lastMod).getTime() > STALE_THRESHOLD;
        return false;
      } finally {
        clearTimeout(timeout);
      }
    })
  );

  const staleCount = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
  // If majority of sampled images are stale, the district is stale
  return staleCount > sample.length / 2;
}

async function fetchDistrict(d: number) {
  const url = buildCwwp2Url('cctv', d);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const cameras = transformCameras(data, d);

  // Check freshness via image Last-Modified headers (sampled)
  const districtStale = await checkDistrictFreshness(cameras as { imageUrl: string }[]);
  if (districtStale) {
    return cameras.map((cam: Record<string, unknown>) => ({ ...cam, isStale: true }));
  }

  return cameras;
}

/** Rewrite Caltrans image URL to go through our edge-cached proxy */
function proxyUrl(url: string, origin: string): string {
  if (!url || !url.startsWith('http')) return url;
  return `${origin}/api/img?src=${encodeURIComponent(url)}`;
}

export const GET: APIRoute = async ({ params, request }) => {
  const districtParam = params.district!;

  const districtNum = parseInt(districtParam, 10);
  if (isNaN(districtNum) || districtNum < 1 || districtNum > 12) {
    return new Response(JSON.stringify({ error: 'invalid_district' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const cameras = await fetchDistrict(districtNum);
    const origin = new URL(request.url).origin;
    const proxied = cameras.map((cam: Record<string, unknown>) => ({
      ...cam,
      imageUrl: proxyUrl(cam.imageUrl as string, origin),
      historicalImages: (cam.historicalImages as string[]).map((u) => proxyUrl(u, origin)),
    }));
    return new Response(JSON.stringify(proxied), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, s-maxage=60',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'upstream_error', message: String(error) }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10, s-maxage=15',
      },
    });
  }
};
