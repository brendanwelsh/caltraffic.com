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
