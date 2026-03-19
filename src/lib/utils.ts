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

export function extractRouteNumber(
  route: { '@_value': string } | string | undefined,
): number {
  if (!route) return 0;
  const str = typeof route === 'string' ? route : route['@_value'];
  return parseInt(str, 10) || 0;
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
    .replace(/^Hwy \d+ /i, '')
    .replace(/\s+/g, ' ')
    .trim();
}
