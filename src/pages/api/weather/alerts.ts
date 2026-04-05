export const prerender = false;

import type { APIRoute } from 'astro';

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

export const GET: APIRoute = async () => {
  try {
    const res = await fetch(NWS_URL, {
      headers: { 'User-Agent': 'california-traffic-lens/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const alerts = transformAlerts(data);
    return new Response(JSON.stringify(alerts), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30, s-maxage=60' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'upstream_error', message: String(error) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=10, s-maxage=15' },
    });
  }
};
