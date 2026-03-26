export const prerender = false;

import type { APIRoute } from 'astro';

interface Suggestion {
  lat: number;
  lon: number;
  label: string;
}

// Detect if query looks like a street address (starts with a number)
function looksLikeAddress(q: string): boolean {
  return /^\d+\s+\w/.test(q.trim());
}

// Parse "1221 F Street Sacramento" into structured parts
function parseAddress(q: string): { street: string; city: string } | null {
  // Try to split on last comma or last known city-like word
  const commaIdx = q.lastIndexOf(',');
  if (commaIdx > 0) {
    return {
      street: q.slice(0, commaIdx).trim(),
      city: q.slice(commaIdx + 1).trim(),
    };
  }
  // Try to find city at the end: "1221 F Street Sacramento" -> street="1221 F Street", city="Sacramento"
  // Split by spaces, try progressively shorter city names from the end
  const words = q.trim().split(/\s+/);
  if (words.length >= 3) {
    // Try last 2 words as city, then last 1 word
    for (const n of [2, 1]) {
      const city = words.slice(-n).join(' ');
      const street = words.slice(0, -n).join(' ');
      if (street.length > 2 && city.length > 2) {
        return { street, city };
      }
    }
  }
  return null;
}

// Nominatim structured query — best for specific addresses (3s timeout)
async function nominatimStructured(street: string, city: string): Promise<Suggestion[]> {
  const params = new URLSearchParams({
    street,
    city,
    state: 'California',
    countrycodes: 'us',
    format: 'json',
    limit: '5',
    addressdetails: '1',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'CalTraffic/1.0' },
      signal: controller.signal,
    });
    if (!resp.ok) return [];
    const results = await resp.json() as any[];
    return results
      .filter((r: any) => r.address?.state === 'California')
      .map((r: any) => {
        const addr = r.address ?? {};
        const parts: string[] = [];
        if (addr.house_number && addr.road) parts.push(`${addr.house_number} ${addr.road}`);
        else if (addr.road) parts.push(addr.road);
        if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
        if (addr.county) parts.push(addr.county);
        return {
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          label: parts.join(', ') || r.display_name.split(',').slice(0, 3).join(',').trim(),
        };
      });
  } catch {
    return []; // Timeout or network error — fall through to Photon
  } finally {
    clearTimeout(timeout);
  }
}

// Photon — best for general place/city/landmark autocomplete (3s timeout)
async function photonSearch(q: string): Promise<Suggestion[]> {
  const encoded = encodeURIComponent(q);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const resp = await fetch(
      `https://photon.komoot.io/api/?q=${encoded}&limit=8&lat=37.5&lon=-119.5&lang=en`,
      { signal: controller.signal },
    );
    if (!resp.ok) return [];
    const data = await resp.json() as any;
    const features = (data.features ?? []).filter((f: any) => f.properties?.state === 'California');

    const seen = new Set<string>();
    return features
      .map((f: any) => {
        const p = f.properties ?? {};
        const coords = f.geometry?.coordinates ?? [0, 0];
        const parts: string[] = [];
        if (p.housenumber && p.street) parts.push(`${p.housenumber} ${p.street}`);
        else if (p.street) parts.push(p.street);
        else if (p.name) parts.push(p.name);
        if (p.city && !parts.includes(p.city)) parts.push(p.city);
        if (p.county) parts.push(p.county);
        return { lat: coords[1], lon: coords[0], label: parts.join(', ') || p.name || 'Unknown' };
      })
      .filter((s: Suggestion) => {
        if (seen.has(s.label)) return false;
        seen.add(s.label);
        return true;
      })
      .slice(0, 6);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q');
  if (!q || q.length < 2) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let suggestions: Suggestion[] = [];

    if (looksLikeAddress(q)) {
      // Address-like query: race Nominatim + Photon in parallel, prefer Nominatim if it returns results
      const parsed = parseAddress(q);
      if (parsed) {
        const [nominatimResults, photonResults] = await Promise.all([
          nominatimStructured(parsed.street, parsed.city),
          photonSearch(q),
        ]);
        suggestions = nominatimResults.length > 0 ? nominatimResults : photonResults;
      } else {
        suggestions = await photonSearch(q);
      }
    } else {
      // General search: use Photon (better for cities, landmarks, roads)
      suggestions = await photonSearch(q);
    }

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
