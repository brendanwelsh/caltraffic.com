import { useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import {
  selectedDistrict,
  selectedRoute,
  selectedCity,
  selectedCounty,
  searchQuery,
  viewMode,
} from '@/stores/filters';

export function useUrlState() {
  const district = useStore(selectedDistrict);
  const route = useStore(selectedRoute);
  const city = useStore(selectedCity);
  const county = useStore(selectedCounty);
  const search = useStore(searchQuery);
  const view = useStore(viewMode);
  const isInitialized = useRef(false);

  // Initialize stores from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);

    const districtParam = params.get('district');
    if (districtParam) {
      const d = parseInt(districtParam, 10);
      if (d >= 1 && d <= 12) selectedDistrict.set(d);
    }

    const routeParam = params.get('route');
    if (routeParam) selectedRoute.set(routeParam);

    const cityParam = params.get('city');
    if (cityParam) selectedCity.set(cityParam);

    const countyParam = params.get('county');
    if (countyParam) selectedCounty.set(countyParam);

    const searchParam = params.get('q');
    if (searchParam) searchQuery.set(searchParam);

    const viewParam = params.get('view');
    if (viewParam === 'map') viewMode.set('map');
    else if (viewParam === 'grid') viewMode.set('grid');
    else if (viewParam === 'tiles') viewMode.set('tiles');

    isInitialized.current = true;
  }, []);

  // Sync stores back to URL
  useEffect(() => {
    if (!isInitialized.current || typeof window === 'undefined') return;

    const params = new URLSearchParams();

    if (district !== null) params.set('district', String(district));
    if (route) params.set('route', route);
    if (city) params.set('city', city);
    if (county) params.set('county', county);
    if (search) params.set('q', search);
    if (view !== 'tiles') params.set('view', view);

    const queryString = params.toString();
    const newUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    window.history.replaceState(null, '', newUrl);
  }, [district, route, city, county, search, view]);
}
