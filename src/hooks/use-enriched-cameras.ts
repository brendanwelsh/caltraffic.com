import { useMemo } from 'react';
import { useCameras } from './use-cameras';
import { useCMS } from './use-cms';
import { useIncidents } from './use-incidents';
import { useWeatherAlerts } from './use-weather';
import {
  matchCMSToCamera,
  matchIncidentsToCamera,
} from '@/lib/matching';
import type { Camera, CMS, Incident, WeatherAlert } from '@/lib/schemas';

export interface EnrichedCamera extends Camera {
  nearbyCMS: CMS[];
  nearbyIncidents: Incident[];
  weatherAlerts: WeatherAlert[];
}

export function useEnrichedCameras(district: number | null) {
  const { data: cameras = [], error: camerasError, isLoading: camerasLoading } = useCameras(district);
  const { data: cmsList = [] } = useCMS(district);
  const { data: incidents = [] } = useIncidents();
  const { data: weatherAlerts = [] } = useWeatherAlerts();

  const enrichedCameras = useMemo(() => {
    if (!cameras.length) return [];

    return cameras
      .filter((c) => c.inService)
      .map((camera): EnrichedCamera => ({
        ...camera,
        nearbyCMS: matchCMSToCamera(camera, cmsList),
        nearbyIncidents: matchIncidentsToCamera(camera, incidents),
        weatherAlerts: weatherAlerts,
      }));
  }, [cameras, cmsList, incidents, weatherAlerts]);

  return {
    cameras: enrichedCameras,
    isLoading: camerasLoading,
    error: camerasError,
    totalCount: cameras.length,
  };
}
