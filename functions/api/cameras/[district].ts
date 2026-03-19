import type { EventContext } from '@cloudflare/workers-types';
import { checkRateLimit, cleanupExpired } from '../../lib/rate-limiter';
import { fetchUpstream } from '../../lib/fetch-upstream';
import { buildCwwp2Url, PHOTO_ONLY_DISTRICTS, CACHE_TTLS } from '../../../src/lib/constants';
import { extractRouteNumber, extractDirection, extractPostmile, parseInService, cleanLocationName } from '../../../src/lib/utils';
import { getRouteType, formatRoute } from '../../../src/lib/constants';

interface Env {
  CIRCUIT_BREAKER?: KVNamespace;
}

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
        const routeNum = extractRouteNumber(loc.route);
        const routeType = getRouteType(routeNum);
        const route = formatRoute(routeNum);
        const district = parseInt(loc.district, 10) || districtNum;
        const hasVideo = !PHOTO_ONLY_DISTRICTS.has(district) && !!item.cctv.imageData.streamingVideoURL;

        // Extract historical images
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

        // Staleness detection
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

export const onRequest = async (context: EventContext<Env, 'district', Record<string, unknown>>) => {
  const ip = context.request.headers.get('cf-connecting-ip') ?? 'unknown';
  cleanupExpired();
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: 'rate_limit_exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const districtParam = context.params.district as string;

  if (districtParam === 'all') {
    const districts = Array.from({ length: 12 }, (_, i) => i + 1);
    const results = await Promise.allSettled(
      districts.map(async (d) => {
        const url = buildCwwp2Url('cctv', d);
        const result = await fetchUpstream<unknown[]>(
          { url, cacheKey: `cameras-d${d}`, cacheTtl: CACHE_TTLS.cctv, circuitKey: `cctv:d${d}`, kv: context.env.CIRCUIT_BREAKER },
          (data) => transformCameras(data, d),
        );
        return result.data;
      })
    );

    const allCameras = results
      .filter((r): r is PromiseFulfilledResult<unknown[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    return new Response(JSON.stringify(allCameras), {
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
    const url = buildCwwp2Url('cctv', districtNum);
    const result = await fetchUpstream(
      { url, cacheKey: `cameras-d${districtNum}`, cacheTtl: CACHE_TTLS.cctv, circuitKey: `cctv:d${districtNum}`, kv: context.env.CIRCUIT_BREAKER },
      (data) => transformCameras(data, districtNum),
    );

    return new Response(JSON.stringify(result.data), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache-Status': result.fromCache ? 'HIT' : 'MISS',
        'X-Circuit': result.circuitOpen ? 'OPEN' : 'CLOSED',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'upstream_error', message: String(error) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
