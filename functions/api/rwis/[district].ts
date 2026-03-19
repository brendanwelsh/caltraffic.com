import type { EventContext } from '@cloudflare/workers-types';
import { checkRateLimit, cleanupExpired } from '../../lib/rate-limiter';
import { fetchUpstream } from '../../lib/fetch-upstream';
import { buildCwwp2Url, CACHE_TTLS, RWIS_DISTRICTS } from '../../../src/lib/constants';

interface Env {
  CIRCUIT_BREAKER?: KVNamespace;
}

function transformRWIS(data: unknown, districtNum: number) {
  const raw = data as { data?: unknown[] } | unknown[];
  const items = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);

  return items
    .map((item: unknown) => {
      try {
        const record = item as Record<string, unknown>;
        const rwis = (record.rwis ?? record) as Record<string, unknown>;
        const loc = (rwis.location ?? {}) as Record<string, unknown>;
        const route = loc.route as { '@_value': string } | string | undefined;

        return {
          id: `RWIS-D${String(districtNum).padStart(2, '0')}-${rwis.index ?? Math.random()}`,
          district: districtNum,
          route: typeof route === 'string' ? route : (route?.['@_value'] ?? ''),
          location: String(loc.locationName ?? ''),
          latitude: parseFloat(String(loc.latitude ?? '0')),
          longitude: parseFloat(String(loc.longitude ?? '0')),
          airTemp: (rwis.airTemperature as Record<string, string>)?.value ? parseFloat((rwis.airTemperature as Record<string, string>).value) : null,
          surfaceTemp: (rwis.surfaceTemperature as Record<string, string>)?.value ? parseFloat((rwis.surfaceTemperature as Record<string, string>).value) : null,
          humidity: (rwis.humidity as Record<string, string>)?.value ? parseFloat((rwis.humidity as Record<string, string>).value) : null,
          windSpeed: (rwis.windSpeed as Record<string, string>)?.value ? parseFloat((rwis.windSpeed as Record<string, string>).value) : null,
          windDirection: (rwis.windDirection as Record<string, string>)?.value ?? null,
          visibility: (rwis.visibility as Record<string, string>)?.value ? parseFloat((rwis.visibility as Record<string, string>).value) : null,
          precipitationType: (rwis.precipitationType as Record<string, string>)?.value ?? null,
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

  if (!RWIS_DISTRICTS.has(districtNum)) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await fetchUpstream(
      { url: buildCwwp2Url('rwis', districtNum), cacheKey: `rwis-d${districtNum}`, cacheTtl: CACHE_TTLS.rwis, circuitKey: `rwis:d${districtNum}`, kv: context.env.CIRCUIT_BREAKER },
      (data) => transformRWIS(data, districtNum),
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
