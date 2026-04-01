export const prerender = false;

import type { APIRoute } from 'astro';

interface RouteResult {
  geometry: { type: string; coordinates: [number, number][] };
  distance: number; // meters
  duration: number; // seconds
  steps: { name: string; distance: number; duration: number; maneuver: any }[];
}

/** Try Valhalla (openstreetmap.de) — more reliable, supports POST with JSON */
async function tryValhalla(fromLat: number, fromLon: number, toLat: number, toLon: number): Promise<RouteResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const resp = await fetch('https://valhalla1.openstreetmap.de/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'CalTraffic/1.0' },
      signal: controller.signal,
      body: JSON.stringify({
        locations: [
          { lat: fromLat, lon: fromLon },
          { lat: toLat, lon: toLon },
        ],
        costing: 'auto',
        units: 'km',
        directions_options: { units: 'km' },
      }),
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;

    const data = await resp.json() as any;
    const trip = data.trip;
    if (!trip?.legs?.length) return null;

    const leg = trip.legs[0];
    // Convert Valhalla shape (encoded polyline) to GeoJSON
    const shape = leg.shape ? decodePolyline(leg.shape) : [];
    const coords: [number, number][] = shape.map((p: [number, number]) => [p[1], p[0]]); // [lon, lat]

    return {
      geometry: { type: 'LineString', coordinates: coords },
      distance: (trip.summary?.length || 0) * 1000, // km to meters
      duration: trip.summary?.time || 0,
      steps: (leg.maneuvers || []).map((m: any) => ({
        name: m.street_names?.[0] || m.instruction || '',
        distance: (m.length || 0) * 1000,
        duration: m.time || 0,
        maneuver: { type: m.type === 1 ? 'depart' : m.type === 4 ? 'arrive' : 'turn', modifier: m.instruction },
      })),
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/** Decode Valhalla's encoded polyline format */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lon = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e6, lon / 1e6]);
  }
  return points;
}

/** Fallback: Try OSRM */
async function tryOSRM(fromLat: number, fromLon: number, toLat: number, toLon: number): Promise<RouteResult | null> {
  const coords = `${fromLon},${fromLat};${toLon},${toLat}`;
  const urls = [
    `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`,
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`,
  ];

  for (const url of urls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'CalTraffic/1.0' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!resp.ok) continue;

      const data = await resp.json() as any;
      if (data.code !== 'Ok' || !data.routes?.length) continue;

      const route = data.routes[0];
      return {
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        steps: route.legs[0]?.steps?.map((s: any) => ({
          name: s.name,
          distance: s.distance,
          duration: s.duration,
          maneuver: s.maneuver,
        })) ?? [],
      };
    } catch {
      clearTimeout(timeout);
      continue;
    }
  }
  return null;
}

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

  // Try Valhalla first (more reliable), fall back to OSRM
  const result = await tryValhalla(fromLat, fromLon, toLat, toLon)
    || await tryOSRM(fromLat, fromLon, toLat, toLon);

  if (!result) {
    return new Response(JSON.stringify({ error: 'All routing services unavailable. Please try again.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
