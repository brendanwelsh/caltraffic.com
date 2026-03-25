export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  if (!from || !to) {
    return new Response(JSON.stringify({ error: 'Missing from and to parameters (lat,lon)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const [fromLat, fromLon] = from.split(',').map(Number);
  const [toLat, toLon] = to.split(',').map(Number);

  if ([fromLat, fromLon, toLat, toLon].some(isNaN)) {
    return new Response(JSON.stringify({ error: 'Invalid coordinates' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const inCA = (lat: number, lon: number) =>
    lat >= 32 && lat <= 42.1 && lon >= -124.5 && lon <= -114;

  if (!inCA(fromLat, fromLon) || !inCA(toLat, toLon)) {
    return new Response(JSON.stringify({ error: 'Coordinates must be within California' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&steps=true&annotations=duration,distance`;

  try {
    const resp = await fetch(osrmUrl, {
      headers: { 'User-Agent': 'CaliforniaTrafficLens/1.0' },
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'Routing service unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json() as any;

    if (data.code !== 'Ok' || !data.routes?.length) {
      return new Response(JSON.stringify({ error: 'No route found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const route = data.routes[0];

    return new Response(JSON.stringify({
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration,
      steps: route.legs[0]?.steps?.map((s: any) => ({
        name: s.name,
        distance: s.distance,
        duration: s.duration,
        maneuver: s.maneuver,
      })) ?? [],
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch route' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
