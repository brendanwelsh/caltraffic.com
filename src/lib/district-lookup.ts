import { DISTRICT_CENTERS } from './constants';

/** Find the closest districts to a lat/lon point, returns up to `count` district numbers */
export function findNearbyDistricts(lat: number, lon: number, count = 3): number[] {
  const distances = Object.entries(DISTRICT_CENTERS).map(([id, center]) => ({
    district: parseInt(id, 10),
    dist: Math.sqrt((lat - center.lat) ** 2 + (lon - center.lon) ** 2),
  }));
  distances.sort((a, b) => a.dist - b.dist);
  return distances.slice(0, count).map((d) => d.district);
}

/** Find all districts that a route corridor passes through */
export function findRouteDistricts(
  originLat: number, originLon: number,
  destLat: number, destLon: number,
): number[] {
  const originDistricts = findNearbyDistricts(originLat, originLon, 2);
  const destDistricts = findNearbyDistricts(destLat, destLon, 2);
  const midLat = (originLat + destLat) / 2;
  const midLon = (originLon + destLon) / 2;
  const midDistricts = findNearbyDistricts(midLat, midLon, 2);
  const all = new Set([...originDistricts, ...destDistricts, ...midDistricts]);
  return [...all].sort((a, b) => a - b);
}
