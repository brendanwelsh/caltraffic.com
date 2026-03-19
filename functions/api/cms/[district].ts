import type { EventContext } from '@cloudflare/workers-types';
import { checkRateLimit, cleanupExpired } from '../../lib/rate-limiter';
import { fetchUpstream } from '../../lib/fetch-upstream';
import { buildCwwp2Url, CACHE_TTLS } from '../../../src/lib/constants';
import { extractRouteNumber, extractDirection, extractPostmile, parseInService, cleanLocationName } from '../../../src/lib/utils';
import { getRouteType, formatRoute } from '../../../src/lib/constants';

interface Env {
  CIRCUIT_BREAKER?: KVNamespace;
}

function extractLines(phase: Record<string, string> | undefined, prefix: string): string[] {
  if (!phase) return [];
  return [1, 2, 3, 4]
    .map((n) => (phase[`${prefix}Line${n}`] ?? '').trim())
    .filter((line) => line.length > 0);
}

function transformCMS(data: unknown, districtNum: number) {
  const raw = data as { data?: unknown[] } | unknown[];
  const items = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);

  return items
    .map((item: unknown) => {
      try {
        const record = item as Record<string, unknown>;
        const cms = (record.cms ?? record) as Record<string, unknown>;
        const loc = cms.location as Record<string, unknown> | undefined;
        const routeNum = extractRouteNumber(loc?.route as { '@_value': string } | string | undefined);
        const routeType = getRouteType(routeNum);

        const message = cms.message as Record<string, Record<string, string>> | undefined;
        const phase1Lines = extractLines(message?.phase1, 'phase1');
        const phase2Lines = extractLines(message?.phase2, 'phase2');

        const district = parseInt(String(loc?.district ?? districtNum), 10);

        return {
          id: `CMS-D${String(district).padStart(2, '0')}-${cms.index}`,
          district,
          route: formatRoute(routeNum),
          routeType,
          direction: extractDirection(loc?.direction as { '@_value': string } | string | undefined),
          county: (loc?.county as string) ?? '',
          latitude: parseFloat(String(loc?.latitude ?? '0')),
          longitude: parseFloat(String(loc?.longitude ?? '0')),
          postmile: extractPostmile(loc?.postmile as { '@_value': string } | string | undefined),
          location: cleanLocationName(String(loc?.locationName ?? '')),
          inService: parseInService(String(cms.inService ?? '')),
          phase1Lines,
          phase2Lines: phase2Lines.length > 0 ? phase2Lines : null,
          lastUpdated: ((cms.recordTimestamp as Record<string, string>)?.recordDate) ?? new Date().toISOString(),
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
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const districtParam = context.params.district as string;
  const districtNum = parseInt(districtParam, 10);

  if (districtParam !== 'all' && (isNaN(districtNum) || districtNum < 1 || districtNum > 12)) {
    return new Response(JSON.stringify({ error: 'invalid_district' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (districtParam === 'all') {
      const districts = Array.from({ length: 12 }, (_, i) => i + 1);
      const results = await Promise.allSettled(
        districts.map(async (d) => {
          const result = await fetchUpstream(
            { url: buildCwwp2Url('cms', d), cacheKey: `cms-d${d}`, cacheTtl: CACHE_TTLS.cms, circuitKey: `cms:d${d}`, kv: context.env.CIRCUIT_BREAKER },
            (data) => transformCMS(data, d),
          );
          return result.data;
        })
      );
      const all = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => (r as PromiseFulfilledResult<unknown[]>).value);
      return new Response(JSON.stringify(all), { headers: { 'Content-Type': 'application/json' } });
    }

    const result = await fetchUpstream(
      { url: buildCwwp2Url('cms', districtNum), cacheKey: `cms-d${districtNum}`, cacheTtl: CACHE_TTLS.cms, circuitKey: `cms:d${districtNum}`, kv: context.env.CIRCUIT_BREAKER },
      (data) => transformCMS(data, districtNum),
    );
    return new Response(JSON.stringify(result.data), {
      headers: { 'Content-Type': 'application/json', 'X-Cache-Status': result.fromCache ? 'HIT' : 'MISS' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'upstream_error' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
