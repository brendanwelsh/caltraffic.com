import { useMemo, useRef } from 'react';
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

  const prevRef = useRef<Map<string, EnrichedCamera>>(new Map());

  const enrichedCameras = useMemo(() => {
    if (!cameras.length) return [];

    const prevMap = prevRef.current;
    const nextMap = new Map<string, EnrichedCamera>();

    const result = cameras
      .filter((c) => c.inService)
      .map((camera): EnrichedCamera => {
        const nearbyIncidents = matchIncidentsToCamera(camera, incidents);
        const cameraChainControls = matchChainControlToCamera(camera, chainControls);
        const prev = prevMap.get(camera.id);

        // Reuse previous object if nothing meaningful changed to preserve reference stability
        if (
          prev &&
          prev.streamUrl === camera.streamUrl &&
          prev.imageUrl === camera.imageUrl &&
          prev.hasVideo === camera.hasVideo &&
          prev.isStale === camera.isStale &&
          prev.inService === camera.inService &&
          prev.nearbyIncidents.length === nearbyIncidents.length &&
          prev.chainControls.length === cameraChainControls.length
        ) {
          nextMap.set(camera.id, prev);
          return prev;
        }

        const enriched: EnrichedCamera = {
          ...camera,
          nearbyCMS: matchCMSToCamera(camera, cmsList),
          nearbyIncidents,
          weatherAlerts: weatherAlerts,
          chainControls: cameraChainControls,
          nearbyClosures: matchClosuresToCamera(camera, closures),
          travelTime: matchTravelTimeToCamera(camera, travelTimes),
        };
        nextMap.set(camera.id, enriched);
        return enriched;
      });

    prevRef.current = nextMap;
    return result;
  }, [cameras, cmsList, incidents, weatherAlerts, chainControls, closures, travelTimes]);

  return {
    cameras: enrichedCameras,
    isLoading: camerasLoading,
    error: camerasError,
    totalCount: cameras.length,
  };
}
