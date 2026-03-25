export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q');
  if (!q || q.length < 2) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoded = encodeURIComponent(`${q}, California`);
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&countrycodes=us&viewbox=-124.5,42,-114,32.5&bounded=1`;

  try {
    const resp = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'CaliforniaTrafficLens/1.0' },
    });

    if (!resp.ok) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results = await resp.json() as any[];

    const suggestions = results.map((r: any) => ({
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      label: r.display_name.split(',').slice(0, 3).join(',').trim(),
    }));

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
