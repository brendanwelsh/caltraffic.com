export const prerender = false;

import type { APIRoute } from 'astro';

const PEMS_DISTRICTS = new Set([3, 4, 5, 6, 7, 8, 10, 11, 12]);

interface VDSStation {
  id: string;
  name: string;
  freewayId: string;
  freewayDir: string;
  latitude: number;
  longitude: number;
  lanes: number;
}

// Module-level VDS cache (refreshes every 6 hours)
let vdsCache: Map<string, VDSStation> = new Map();
let vdsCacheTime = 0;
const VDS_CACHE_TTL = 6 * 60 * 60 * 1000;

async function loadVDSConfig(): Promise<Map<string, VDSStation>> {
  if (vdsCache.size > 0 && Date.now() - vdsCacheTime < VDS_CACHE_TTL) {
    return vdsCache;
  }

  const res = await fetch('https://pems.dot.ca.gov/feeds/vds_config.xml');
  if (!res.ok) throw new Error(`VDS config fetch failed: ${res.status}`);
  const xml = await res.text();

  const stations = new Map<string, VDSStation>();
  // Parse with regex — faster than XML parser for this flat structure
  const vdsRegex = /<vds\s+id="(\d+)"\s+name="([^"]*)"\s+type="([^"]*)"\s+[^>]*?freeway_id="(\d+)"\s+freeway_dir="([NSEW])"\s+lanes="(\d+)"\s+[^>]*?latitude="([^"]*)"\s+longitude="([^"]*)"/g;
  let match;
  while ((match = vdsRegex.exec(xml)) !== null) {
    const [, id, name, type, freewayId, freewayDir, lanes, lat, lon] = match;
    // Only mainline stations — skip ramps, HOV, connectors
    if (type !== 'ML') continue;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    if (isNaN(latitude) || isNaN(longitude) || latitude === 0) continue;
    stations.set(id, { id, name, freewayId, freewayDir, latitude, longitude, lanes: parseInt(lanes, 10) });
  }

  vdsCache = stations;
  vdsCacheTime = Date.now();
  return stations;
}

export interface PemsStation {
  id: string;
  name: string;
  freewayId: string;
  freewayDir: string;
  latitude: number;
  longitude: number;
  lanes: number;
  speed: number | null;
  flow: number;
  occupancy: number;
}

export const GET: APIRoute = async ({ params }) => {
  const districtParam = params.district!;
  const districtNum = parseInt(districtParam, 10);

  if (isNaN(districtNum) || !PEMS_DISTRICTS.has(districtNum)) {
    return new Response(JSON.stringify({ error: 'invalid_district', supported: [...PEMS_DISTRICTS] }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Fetch VDS config and 5-min data in parallel
    const [vds, dataRes] = await Promise.all([
      loadVDSConfig(),
      fetch(`https://pems.dot.ca.gov/feeds/D${districtNum}/Data/5min/5minagg_latest.txt`),
    ]);

    if (!dataRes.ok) throw new Error(`PeMS data fetch failed: ${dataRes.status}`);
    const text = await dataRes.text();
    const lines = text.trim().split('\n');

    // First line is timestamp
    const timestamp = lines[0]?.trim() ?? '';
    const stations: PemsStation[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < 4) continue;

      const stationId = parts[0].trim();
      const vdsStation = vds.get(stationId);
      if (!vdsStation) continue; // Skip stations not in VDS config (ramps, etc. already filtered)

      const flow = parseFloat(parts[1]) || 0;
      const occupancy = parseFloat(parts[2]) || 0;
      const speed = parts[3].trim() ? parseFloat(parts[3]) : null;

      // Skip stations with no meaningful data
      if (speed === null && flow === 0) continue;

      stations.push({
        ...vdsStation,
        speed,
        flow,
        occupancy,
      });
    }

    return new Response(JSON.stringify({ timestamp, stations }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, s-maxage=60',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'upstream_error', message: String(error) }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10, s-maxage=15',
      },
    });
  }
};
