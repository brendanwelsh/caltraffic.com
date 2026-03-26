export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q');
  if (!q || q.length < 2) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Photon (by Komoot) — free geocoding API built on OSM, designed for autocomplete
  // Bias results toward California center (lat=37.5, lon=-119.5)
  const encoded = encodeURIComponent(q);
  const photonUrl = `https://photon.komoot.io/api/?q=${encoded}&limit=8&lat=37.5&lon=-119.5&lang=en`;

  try {
    const resp = await fetch(photonUrl);

    if (!resp.ok) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json() as any;
    const features = data.features ?? [];

    // Filter to California only
    const caFeatures = features.filter((f: any) =>
      f.properties?.state === 'California'
    );

    // Deduplicate by label
    const seen = new Set<string>();
    const suggestions = caFeatures
      .map((f: any) => {
        const p = f.properties ?? {};
        const coords = f.geometry?.coordinates ?? [0, 0];

        // Build a readable label
        const parts: string[] = [];
        if (p.housenumber && p.street) {
          parts.push(`${p.housenumber} ${p.street}`);
        } else if (p.street) {
          parts.push(p.street);
        } else if (p.name) {
          parts.push(p.name);
        }
        if (p.city && !parts.includes(p.city)) parts.push(p.city);
        if (p.county) parts.push(p.county);

        const label = parts.length > 0
          ? parts.join(', ')
          : p.name ?? 'Unknown';

        return {
          lat: coords[1],
          lon: coords[0],
          label,
        };
      })
      .filter((s: any) => {
        if (seen.has(s.label)) return false;
        seen.add(s.label);
        return true;
      })
      .slice(0, 6);

    return new Response(JSON.stringify(suggestions), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
