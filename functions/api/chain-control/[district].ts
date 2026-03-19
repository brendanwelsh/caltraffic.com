import type { EventContext } from '@cloudflare/workers-types';
import { checkRateLimit, cleanupExpired } from '../../lib/rate-limiter';
import { fetchUpstream } from '../../lib/fetch-upstream';
import { buildCwwp2Url, CACHE_TTLS } from '../../../src/lib/constants';
import { extractRouteNumber, extractPostmile } from '../../../src/lib/utils';
import { getRouteType, formatRoute } from '../../../src/lib/constants';

interface Env {
  CIRCUIT_BREAKER?: KVNamespace;
}

function transformChainControl(data: unknown, districtNum: number) {
  const raw = data as { data?: unknown[] } | unknown[];
  const items = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);

  return items
    .map((item: unknown) => {
      try {
        const record = item as Record<string, unknown>;
        const cc = (record.cc ?? record) as Record<string, unknown>;
        const loc = (cc.location ?? {}) as Record<string, unknown>;
        const routeNum = extractRouteNumber(loc.route as { '@_value': string } | string | undefined);

        return {
          id: `CC-D${String(districtNum).padStart(2, '0')}-${cc.index ?? Math.random()}`,
          district: districtNum,
          route: formatRoute(routeNum),
          routeType: getRouteType(routeNum),
          location: String(loc.locationName ?? ''),
          level: String(cc.chainControlLevel ?? cc.level ?? 'R1'),
          status: String(cc.status ?? 'Active'),
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
      { url: buildCwwp2Url('cc', districtNum), cacheKey: `cc-d${districtNum}`, cacheTtl: CACHE_TTLS.chainControl, circuitKey: `cc:d${districtNum}`, kv: context.env.CIRCUIT_BREAKER },
      (data) => transformChainControl(data, districtNum),
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
