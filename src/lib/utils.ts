import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const EARTH_RADIUS_KM = 6371;

export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseInService(value: string): boolean {
  return value === 'Y' || value === 'true' || value === 'True';
}

export function extractRoute(
  route: { '@_value': string } | string | undefined,
): string {
  if (!route) return '';
  return typeof route === 'string' ? route : route['@_value'];
}

export function extractRouteNumber(
  route: { '@_value': string } | string | undefined,
): number {
  const str = extractRoute(route);
  // Route may be "I-5", "US-101", "SR-99" or just "5"
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export function extractDirection(
  dir: { '@_value': string } | string | undefined,
): string {
  if (!dir) return '';
  return typeof dir === 'string' ? dir : dir['@_value'];
}

export function extractPostmile(
  pm: { '@_value': string } | string | undefined,
): number {
  if (!pm) return 0;
  const str = typeof pm === 'string' ? pm : pm['@_value'];
  return parseFloat(str) || 0;
}

export function cleanLocationName(name: string): string {
  return name
    // Strip leading camera IDs: "TV102 -- ", "(C 348) ", "(C002) "
    .replace(/^(?:TV\d+\s*--\s*|\(C\s*\d+\)\s*)/i, '')
    // Strip route prefix: "I-5 : ", "US-101 : ", "SR-20 : ", "Hwy 5 "
    .replace(/^(?:I-\d+|US-\d+|SR-\d+)\s*:\s*/i, '')
    .replace(/^Hwy \d+\s*/i, '')
    // Strip "at " prefix (D3 pattern)
    .replace(/^at /i, '')
    // Strip leading parenthetical numbers: "(196) ", "(2) "
    .replace(/^\(\d+\)\s*/i, '')
    // Strip CMS numbering prefix: "015 - "
    .replace(/^\d{2,3}\s*-\s*/i, '')
    // Strip trailing camera IDs: " (C020)"
    .replace(/\s*\(C\d+\)\s*$/i, '')
    // Strip "- Looking East/West/North/South" suffixes
    .replace(/\s*-?\s*Looking\s+\w+$/i, '')
    // Clean up underscores and extra spaces
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
