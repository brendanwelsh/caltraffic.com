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

async function fetchDistrict(d: number) {
  const url = buildCwwp2Url('cctv', d);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return transformCameras(data, d);
}

export const GET: APIRoute = async ({ params }) => {
  const districtParam = params.district!;

  if (districtParam === 'all') {
    const districts = Array.from({ length: 12 }, (_, i) => i + 1);
    const results = await Promise.allSettled(districts.map(fetchDistrict));
    const all = results
      .filter((r): r is PromiseFulfilledResult<unknown[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);
    return new Response(JSON.stringify(all), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const districtNum = parseInt(districtParam, 10);
  if (isNaN(districtNum) || districtNum < 1 || districtNum > 12) {
    return new Response(JSON.stringify({ error: 'invalid_district' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const cameras = await fetchDistrict(districtNum);
    return new Response(JSON.stringify(cameras), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'upstream_error', message: String(error) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
