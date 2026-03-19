import type { EventContext } from '@cloudflare/workers-types';
import { checkRateLimit, cleanupExpired } from '../../lib/rate-limiter';
import { fetchUpstream } from '../../lib/fetch-upstream';
import { CACHE_TTLS } from '../../../src/lib/constants';

interface Env {
  CIRCUIT_BREAKER?: KVNamespace;
}

const NWS_URL = 'https://api.weather.gov/alerts/active?area=CA';

function transformAlerts(data: unknown) {
  const geojson = data as { features?: unknown[] };
  const features = geojson.features ?? [];

  return features.map((f: unknown) => {
    const feature = f as { id?: string; properties?: Record<string, unknown> };
    const props = feature.properties ?? {};
    return {
      id: (props.id as string) ?? feature.id ?? '',
      event: (props.event as string) ?? '',
      severity: (props.severity as string) ?? 'Unknown',
      headline: (props.headline as string) ?? '',
      description: (props.description as string) ?? '',
      affectedAreas: ((props.areaDesc as string) ?? '')
        .split(';')
        .map((s: string) => s.trim())
        .filter(Boolean),
      onset: (props.onset as string) ?? '',
      expires: (props.expires as string) ?? '',
    };
  });
}

export const onRequest = async (context: EventContext<Env, string, Record<string, unknown>>) => {
  const ip = context.request.headers.get('cf-connecting-ip') ?? 'unknown';
  cleanupExpired();
  if (!checkRateLimit(ip).allowed) {
    return new Response(JSON.stringify({ error: 'rate_limit_exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await fetchUpstream(
      { url: NWS_URL, cacheKey: 'weather-alerts', cacheTtl: CACHE_TTLS.weatherAlerts, circuitKey: 'weather-alerts', kv: context.env.CIRCUIT_BREAKER },
      transformAlerts,
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
