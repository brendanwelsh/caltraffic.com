export const prerender = false;

import type { APIRoute } from 'astro';
import { buildCwwp2Url, TRAVEL_TIME_DISTRICTS } from '@/lib/constants';
import { extractRouteNumber } from '@/lib/utils';
import { formatRoute } from '@/lib/constants';

function transformTravelTimes(data: unknown, districtNum: number) {
  const raw = data as { data?: unknown[] } | unknown[];
  const items = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);

  return items
    .map((item: unknown) => {
      try {
        const record = item as Record<string, unknown>;
        const tt = (record.tt ?? record) as Record<string, unknown>;
        const loc = (tt.location ?? {}) as Record<string, unknown>;
        const begin = (loc.begin ?? {}) as Record<string, unknown>;
        const end = (loc.end ?? {}) as Record<string, unknown>;
        const traveltime = (tt.traveltime ?? {}) as Record<string, unknown>;

        const routeNum = extractRouteNumber(begin.beginRoute as { '@_value': string } | string | undefined);
        const currentTime = parseFloat(String(traveltime.calculatedTraveltime ?? '0'));
        // No typical time in this feed — estimate from route
        const corridor = `${String(begin.beginLocationName ?? '')} to ${String(end.endLocationName ?? '')}`;

        return {
          id: `TT-D${String(districtNum).padStart(2, '0')}-${tt.index ?? Math.random()}`,
          district: districtNum,
          route: formatRoute(routeNum),
          corridor: corridor || String(tt.index ?? ''),
          currentTime,
          typicalTime: currentTime, // No typical time available in this feed
          delay: 0,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function fetchDistrict(d: number) {
  if (!TRAVEL_TIME_DISTRICTS.has(d)) return [];
  const url = buildCwwp2Url('tt', d);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return transformTravelTimes(data, d);
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

  if (!TRAVEL_TIME_DISTRICTS.has(districtNum)) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30, s-maxage=60' },
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
