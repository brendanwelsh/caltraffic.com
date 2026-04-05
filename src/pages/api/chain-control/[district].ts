export const prerender = false;

import type { APIRoute } from 'astro';
import { buildCwwp2Url } from '@/lib/constants';
import { extractRouteNumber, extractPostmile } from '@/lib/utils';
import { getRouteType, formatRoute } from '@/lib/constants';

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

async function fetchDistrict(d: number) {
  const url = buildCwwp2Url('cc', d);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return transformChainControl(data, d);
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
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  }

  const districtNum = parseInt(districtParam, 10);
  if (isNaN(districtNum) || districtNum < 1 || districtNum > 12) {
    return new Response(JSON.stringify({ error: 'invalid_district' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=10, s-maxage=15' },
    });
  }

  try {
    const items = await fetchDistrict(districtNum);
    return new Response(JSON.stringify(items), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30, s-maxage=60' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'upstream_error', message: String(error) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=10, s-maxage=15' },
    });
  }
};
