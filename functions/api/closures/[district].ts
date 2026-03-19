import type { EventContext } from '@cloudflare/workers-types';
import { checkRateLimit, cleanupExpired } from '../../lib/rate-limiter';
import { fetchUpstream } from '../../lib/fetch-upstream';
import { buildCwwp2Url, CACHE_TTLS } from '../../../src/lib/constants';
import { extractRouteNumber, extractDirection, extractPostmile } from '../../../src/lib/utils';
import { getRouteType, formatRoute } from '../../../src/lib/constants';

interface Env {
  CIRCUIT_BREAKER?: KVNamespace;
}

function transformClosures(data: unknown, districtNum: number) {
  const raw = data as { data?: unknown[] } | unknown[];
  const items = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);

  return items
    .map((item: unknown) => {
      try {
        const record = item as Record<string, unknown>;
        const lcs = (record.lcs ?? record) as Record<string, unknown>;
        const loc = (lcs.location ?? {}) as Record<string, unknown>;
        const routeNum = extractRouteNumber(loc.route as { '@_value': string } | string | undefined);

        return {
          id: `LCS-D${String(districtNum).padStart(2, '0')}-${lcs.index ?? Math.random()}`,
          district: districtNum,
          route: formatRoute(routeNum),
          routeType: getRouteType(routeNum),
          direction: extractDirection(loc.direction as { '@_value': string } | string | undefined),
          county: String(loc.county ?? ''),
          location: String(loc.locationName ?? ''),
          lanesAffected: String(lcs.lanesAffected ?? ''),
          closureType: String(lcs.closureType ?? lcs.type ?? 'Unknown'),
          startTime: String(lcs.startTime ?? ''),
          endTime: String(lcs.endTime ?? ''),
          latitude: parseFloat(String(loc.latitude ?? '0')),
          longitude: parseFloat(String(loc.longitude ?? '0')),
          postmile: extractPostmile(loc.postmile as { '@_value': string } | string | undefined),
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

  try {
    const result = await fetchUpstream(
      { url: buildCwwp2Url('lcs', districtNum), cacheKey: `lcs-d${districtNum}`, cacheTtl: CACHE_TTLS.lcs, circuitKey: `lcs:d${districtNum}`, kv: context.env.CIRCUIT_BREAKER },
      (data) => transformClosures(data, districtNum),
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
