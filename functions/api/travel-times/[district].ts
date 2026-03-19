import type { EventContext } from '@cloudflare/workers-types';
import { checkRateLimit, cleanupExpired } from '../../lib/rate-limiter';
import { fetchUpstream } from '../../lib/fetch-upstream';
import { buildCwwp2Url, CACHE_TTLS, TRAVEL_TIME_DISTRICTS } from '../../../src/lib/constants';
import { formatRoute, getRouteType } from '../../../src/lib/constants';
import { extractRouteNumber } from '../../../src/lib/utils';

interface Env {
  CIRCUIT_BREAKER?: KVNamespace;
}

function transformTravelTimes(data: unknown, districtNum: number) {
  const raw = data as { data?: unknown[] } | unknown[];
  const items = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);

  return items
    .map((item: unknown) => {
      try {
        const record = item as Record<string, unknown>;
        const tt = (record.tt ?? record) as Record<string, unknown>;
        const loc = (tt.location ?? {}) as Record<string, unknown>;
        const routeNum = extractRouteNumber(loc.route as { '@_value': string } | string | undefined);

        return {
          id: `TT-D${String(districtNum).padStart(2, '0')}-${tt.index ?? Math.random()}`,
          district: districtNum,
          route: formatRoute(routeNum),
          corridor: String(tt.corridorName ?? loc.locationName ?? ''),
          currentTime: parseFloat(String(tt.currentTravelTime ?? '0')),
          typicalTime: parseFloat(String(tt.typicalTravelTime ?? '0')),
          delay: parseFloat(String(tt.delay ?? '0')),
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
  if (!checkRateLimit(ip).allowed) {
    return new Response(JSON.stringify({ error: 'rate_limit_exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const districtNum = parseInt(context.params.district as string, 10);
  if (isNaN(districtNum) || districtNum < 1 || districtNum > 12) {
    return new Response(JSON.stringify({ error: 'invalid_district' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!TRAVEL_TIME_DISTRICTS.has(districtNum)) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await fetchUpstream(
      { url: buildCwwp2Url('tt', districtNum), cacheKey: `tt-d${districtNum}`, cacheTtl: CACHE_TTLS.travelTimes, circuitKey: `tt:d${districtNum}`, kv: context.env.CIRCUIT_BREAKER },
      (data) => transformTravelTimes(data, districtNum),
    );
    return new Response(JSON.stringify(result.data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'upstream_error' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
