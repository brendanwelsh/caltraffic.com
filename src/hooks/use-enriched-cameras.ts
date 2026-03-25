import { useMemo } from 'react';
import { useCameras } from './use-cameras';
import { useCMS } from './use-cms';
import { useIncidents } from './use-incidents';
import { useWeatherAlerts } from './use-weather';
import { useChainControl } from './use-chain-control';
import { useClosures } from './use-closures';
import { useTravelTimes } from './use-travel-times';
import {
  matchCMSToCamera,
  matchIncidentsToCamera,
  matchClosuresToCamera,
  matchChainControlToCamera,
  matchTravelTimeToCamera,
} from '@/lib/matching';
import type { Camera, CMS, Incident, WeatherAlert, ChainControl, LaneClosure, TravelTime } from '@/lib/schemas';

export interface EnrichedCamera extends Camera {
  nearbyCMS: CMS[];
  nearbyIncidents: Incident[];
  weatherAlerts: WeatherAlert[];
  chainControls: ChainControl[];
  nearbyClosures: LaneClosure[];
  travelTime: TravelTime | null;
}

export function useEnrichedCameras(district: number | null) {
  const { data: cameras = [], error: camerasError, isLoading: camerasLoading } = useCameras(district);
  const { data: cmsList = [] } = useCMS(district);
  const { data: incidents = [] } = useIncidents();
  const { data: weatherAlerts = [] } = useWeatherAlerts();
  const { data: chainControls = [] } = useChainControl(district);
  const { data: closures = [] } = useClosures(district);
  const { data: travelTimes = [] } = useTravelTimes(district);

  const enrichedCameras = useMemo(() => {
    if (!cameras.length) return [];

    return cameras
      .filter((c) => c.inService)
      .map((camera): EnrichedCamera => ({
        ...camera,
        nearbyCMS: matchCMSToCamera(camera, cmsList),
        nearbyIncidents: matchIncidentsToCamera(camera, incidents),
        weatherAlerts: weatherAlerts,
        chainControls: matchChainControlToCamera(camera, chainControls),
        nearbyClosures: matchClosuresToCamera(camera, closures),
        travelTime: matchTravelTimeToCamera(camera, travelTimes),
      }));
  }, [cameras, cmsList, incidents, weatherAlerts, chainControls, closures, travelTimes]);

  return {
    cameras: enrichedCameras,
    isLoading: camerasLoading,
    error: camerasError,
    totalCount: cameras.length,
  };
}
