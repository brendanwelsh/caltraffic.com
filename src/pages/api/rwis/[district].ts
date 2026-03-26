export const prerender = false;

import type { APIRoute } from 'astro';
import { buildCwwp2Url, RWIS_DISTRICTS } from '@/lib/constants';

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

async function fetchDistrict(d: number) {
  if (!RWIS_DISTRICTS.has(d)) return [];
  const url = buildCwwp2Url('rwis', d);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return transformRWIS(data, d);
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
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120' },
    });
  }

  const districtNum = parseInt(districtParam, 10);
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
    const items = await fetchDistrict(districtNum);
    return new Response(JSON.stringify(items), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'upstream_error', message: String(error) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
