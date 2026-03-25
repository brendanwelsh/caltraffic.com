// src/hooks/use-route-planner.ts
import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { useCameras } from './use-cameras';
import { useCMS } from './use-cms';
import { useIncidents } from './use-incidents';
import { useChainControl } from './use-chain-control';
import { useClosures } from './use-closures';
import { useTravelTimes } from './use-travel-times';
import { matchCamerasToRoute, type RouteCameraMatch } from '@/lib/route-matching';
import {
  matchCMSToCamera,
  matchIncidentsToCamera,
  matchClosuresToCamera,
  matchChainControlToCamera,
  matchTravelTimeToCamera,
} from '@/lib/matching';
import type { EnrichedCamera } from './use-enriched-cameras';

interface RouteGeometry {
  geometry: { type: string; coordinates: [number, number][] };
  distance: number;
  duration: number;
}

export interface RouteCamera extends EnrichedCamera {
  distanceFromRoute: number;
  progressAlongRoute: number;
}

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('Route fetch failed');
  return r.json();
});

export function useRoutePlanner() {
  const [origin, setOrigin] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lon: number; label: string } | null>(null);

  const routeKey = origin && destination
    ? `/api/route?from=${origin.lat},${origin.lon}&to=${destination.lat},${destination.lon}`
    : null;

  const { data: routeData, error: routeError, isLoading: routeLoading } = useSWR<RouteGeometry>(
    routeKey,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  // Fetch all cameras statewide for route matching
  const { data: allCameras = [] } = useCameras(null);
  const { data: allCMS = [] } = useCMS(null);
  const { data: allIncidents = [] } = useIncidents();
  // These return [] when district is null — fine for route planner v1
  const { data: allChainControls = [] } = useChainControl(null);
  const { data: allClosures = [] } = useClosures(null);
  const { data: allTravelTimes = [] } = useTravelTimes(null);

  // Match cameras to route
  const routeCameras: RouteCamera[] = routeData?.geometry?.coordinates
    ? matchCamerasToRoute(routeData.geometry.coordinates, allCameras)
        .map((match): RouteCamera => ({
          ...match.camera,
          nearbyCMS: matchCMSToCamera(match.camera, allCMS),
          nearbyIncidents: matchIncidentsToCamera(match.camera, allIncidents),
          weatherAlerts: [],
          chainControls: matchChainControlToCamera(match.camera, allChainControls),
          nearbyClosures: matchClosuresToCamera(match.camera, allClosures),
          travelTime: matchTravelTimeToCamera(match.camera, allTravelTimes),
          distanceFromRoute: match.distanceFromRoute,
          progressAlongRoute: match.progressAlongRoute,
        }))
    : [];

  const clearRoute = useCallback(() => {
    setOrigin(null);
    setDestination(null);
  }, []);

  return {
    origin,
    destination,
    setOrigin,
    setDestination,
    clearRoute,
    routeData,
    routeCameras,
    routeError,
    routeLoading,
    routeDistance: routeData?.distance ?? 0,
    routeDuration: routeData?.duration ?? 0,
  };
}
