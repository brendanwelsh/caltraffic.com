import { getRouteType } from './constants';

export function getShieldUrl(routeNum: number): string {
  const type = getRouteType(routeNum);
  const prefix = type === 'I' ? 'I' : type === 'US' ? 'US' : 'SR';
  return `https://shields.caltranscameras.app/${prefix}-${routeNum}.svg`;
}

export function getShieldUrlFromString(route: string): string {
  if (/^(I|US|SR)-\d+$/.test(route)) {
    return `https://shields.caltranscameras.app/${route}.svg`;
  }
  const num = parseInt(route, 10);
  if (!isNaN(num)) return getShieldUrl(num);
  return '';
}
