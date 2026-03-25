export const DISTRICTS: Record<number, { name: string; description: string }> = {
  1: { name: 'District 1', description: 'Eureka (North Coast)' },
  2: { name: 'District 2', description: 'Redding (North-eastern CA)' },
  3: { name: 'District 3', description: 'Marysville/Sacramento' },
  4: { name: 'District 4', description: 'Oakland/San Francisco (Bay Area)' },
  5: { name: 'District 5', description: 'San Luis Obispo (Central Coast)' },
  6: { name: 'District 6', description: 'Fresno (Central Valley)' },
  7: { name: 'District 7', description: 'Los Angeles' },
  8: { name: 'District 8', description: 'San Bernardino/Riverside (Inland Empire)' },
  9: { name: 'District 9', description: 'Bishop (Eastern Sierra)' },
  10: { name: 'District 10', description: 'Stockton (San Joaquin Valley)' },
  11: { name: 'District 11', description: 'San Diego' },
  12: { name: 'District 12', description: 'Irvine (Orange County)' },
};

export const PHOTO_ONLY_DISTRICTS = new Set([7, 8, 9, 10, 11, 12]);

export const RWIS_DISTRICTS = new Set([2, 3, 6, 8, 9, 10]);
export const TRAVEL_TIME_DISTRICTS = new Set([3, 8, 11, 12]);

export const DISTRICT_CAPABILITIES: Record<number, { cctv: boolean; cms: boolean; cc: boolean; lcs: boolean; rwis: boolean; tt: boolean; video: boolean }> = {
  1:  { cctv: true, cms: true, cc: true, lcs: true, rwis: false, tt: false, video: true },
  2:  { cctv: true, cms: true, cc: true, lcs: true, rwis: true,  tt: false, video: true },
  3:  { cctv: true, cms: true, cc: true, lcs: true, rwis: true,  tt: true,  video: true },
  4:  { cctv: true, cms: true, cc: true, lcs: true, rwis: false, tt: false, video: true },
  5:  { cctv: true, cms: true, cc: true, lcs: true, rwis: false, tt: false, video: true },
  6:  { cctv: true, cms: true, cc: true, lcs: true, rwis: true,  tt: false, video: true },
  7:  { cctv: true, cms: true, cc: true, lcs: true, rwis: false, tt: false, video: false },
  8:  { cctv: true, cms: true, cc: true, lcs: true, rwis: true,  tt: true,  video: false },
  9:  { cctv: true, cms: true, cc: true, lcs: true, rwis: true,  tt: false, video: false },
  10: { cctv: true, cms: true, cc: true, lcs: true, rwis: true,  tt: false, video: false },
  11: { cctv: true, cms: true, cc: true, lcs: true, rwis: false, tt: true,  video: false },
  12: { cctv: true, cms: true, cc: true, lcs: true, rwis: false, tt: true,  video: false },
};

export const INTERSTATE_ROUTES = new Set([5, 8, 10, 15, 40, 80, 105, 110, 205, 210, 215, 238, 280, 380, 405, 505, 580, 605, 680, 710, 780, 805, 880, 980]);
export const US_ROUTES = new Set([6, 50, 95, 97, 101, 199, 395]);

export function getRouteType(routeNum: number): 'I' | 'US' | 'SR' {
  if (INTERSTATE_ROUTES.has(routeNum)) return 'I';
  if (US_ROUTES.has(routeNum)) return 'US';
  return 'SR';
}

export function formatRoute(routeNum: number): string {
  const type = getRouteType(routeNum);
  return `${type}-${routeNum}`;
}

export function buildCwwp2Url(dataset: string, district: number): string {
  const padded = district.toString().padStart(2, '0');
  return `https://cwwp2.dot.ca.gov/data/d${district}/${dataset}/${dataset}StatusD${padded}.json`;
}

// Counties by Caltrans district (for filtering weather alerts to relevant area)
export const DISTRICT_COUNTIES: Record<number, string[]> = {
  1:  ['Del Norte', 'Humboldt', 'Lake', 'Mendocino'],
  2:  ['Lassen', 'Modoc', 'Plumas', 'Shasta', 'Siskiyou', 'Tehama', 'Trinity'],
  3:  ['Butte', 'Colusa', 'El Dorado', 'Glenn', 'Nevada', 'Placer', 'Sacramento', 'Sierra', 'Sutter', 'Yolo', 'Yuba'],
  4:  ['Alameda', 'Contra Costa', 'Marin', 'Napa', 'San Francisco', 'San Mateo', 'Santa Clara', 'Solano', 'Sonoma'],
  5:  ['Monterey', 'San Benito', 'San Luis Obispo', 'Santa Barbara', 'Santa Cruz'],
  6:  ['Fresno', 'Kern', 'Kings', 'Madera', 'Tulare'],
  7:  ['Los Angeles', 'Ventura'],
  8:  ['Riverside', 'San Bernardino'],
  9:  ['Inyo', 'Mono'],
  10: ['Alpine', 'Amador', 'Calaveras', 'Mariposa', 'Merced', 'San Joaquin', 'Stanislaus', 'Tuolumne'],
  11: ['Imperial', 'San Diego'],
  12: ['Orange'],
};

// District center coordinates for geolocation matching
export const DISTRICT_CENTERS: Record<number, { lat: number; lon: number }> = {
  1:  { lat: 40.80, lon: -124.16 },
  2:  { lat: 40.59, lon: -122.39 },
  3:  { lat: 38.58, lon: -121.49 },
  4:  { lat: 37.80, lon: -122.27 },
  5:  { lat: 35.28, lon: -120.66 },
  6:  { lat: 36.74, lon: -119.77 },
  7:  { lat: 34.05, lon: -118.24 },
  8:  { lat: 34.11, lon: -117.29 },
  9:  { lat: 37.36, lon: -118.39 },
  10: { lat: 37.95, lon: -121.29 },
  11: { lat: 32.72, lon: -117.16 },
  12: { lat: 33.68, lon: -117.79 },
};

export function getCountiesForDistrict(district: number | null): string[] {
  if (district === null) {
    return Object.values(DISTRICT_COUNTIES).flat().sort();
  }
  return (DISTRICT_COUNTIES[district] ?? []).sort();
}

export const CACHE_TTLS = {
  cctv: 30,
  cms: 60,
  incidents: 60,
  weatherAlerts: 300,
  chainControl: 60,
  lcs: 60,
  rwis: 120,
  travelTimes: 60,
} as const;
