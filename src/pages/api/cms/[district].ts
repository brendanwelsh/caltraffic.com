export const prerender = false;

import type { APIRoute } from 'astro';
import { buildCwwp2Url } from '@/lib/constants';
import { extractRoute, extractRouteNumber, extractDirection, extractPostmile, parseInService, cleanLocationName } from '@/lib/utils';
import { getRouteType, formatRoute } from '@/lib/constants';

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
        const routeRaw = extractRoute(loc?.route as { '@_value': string } | string | undefined);
        const routeNum = extractRouteNumber(loc?.route as { '@_value': string } | string | undefined);
        const routeType = getRouteType(routeNum);

        const message = cms.message as Record<string, Record<string, string>> | undefined;
        const phase1Lines = extractLines(message?.phase1, 'phase1');
        const phase2Lines = extractLines(message?.phase2, 'phase2');

        const district = parseInt(String(loc?.district ?? districtNum), 10);

        return {
          id: `CMS-D${String(district).padStart(2, '0')}-${cms.index}`,
          district,
          route: routeRaw && routeRaw.includes('-') ? routeRaw : formatRoute(routeNum),
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

async function fetchDistrict(d: number) {
  const url = buildCwwp2Url('cms', d);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return transformCMS(data, d);
}

export const GET: APIRoute = async ({ params }) => {
  const districtParam = params.district!;

  if (districtParam === 'all') {
    const districts = Array.from({ length: 12 }, (_, i) => i + 1);
    const results = await Promise.allSettled(districts.map(fetchDistrict));
    const all = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => (r as PromiseFulfilledResult<unknown[]>).value);
    return new Response(JSON.stringify(all), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30, s-maxage=60' },
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
    const cms = await fetchDistrict(districtNum);
    return new Response(JSON.stringify(cms), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30, s-maxage=60' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'upstream_error' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=10, s-maxage=15' },
    });
  }
};
