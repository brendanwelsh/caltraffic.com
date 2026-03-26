import { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useCameras } from './use-cameras';
import { useCMS } from './use-cms';
import { useIncidents } from './use-incidents';
import { useChainControl } from './use-chain-control';
import { useClosures } from './use-closures';
import { useTravelTimes } from './use-travel-times';
import { haversineDistance } from '@/lib/utils';
import {
  matchCMSToCamera,
  matchIncidentsToCamera,
  matchClosuresToCamera,
  matchChainControlToCamera,
  matchTravelTimeToCamera,
} from '@/lib/matching';
import type { EnrichedCamera } from './use-enriched-cameras';
import type { Camera } from '@/lib/schemas';

export interface RouteCamera extends EnrichedCamera {
  distanceFromRoute: number;
  progressAlongRoute: number;
}

interface Location {
  lat: number;
  lon: number;
  label: string;
}

interface RouteGeometry {
  geometry: { type: string; coordinates: [number, number][] };
  distance: number;
  duration: number;
}

const CORRIDOR_WIDTH_KM = 5;

const routeFetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('Route fetch failed');
  return r.json();
});

/** Instant corridor matching — finds cameras near a straight line between two points */
function matchCamerasToCorridorLine(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  cameras: Camera[],
): { camera: Camera; dist: number; progress: number }[] {
  const totalDist = haversineDistance(from.lat, from.lon, to.lat, to.lon);
  if (totalDist === 0) return [];

  const matches: { camera: Camera; dist: number; progress: number }[] = [];

  for (const cam of cameras) {
    if (cam.latitude === 0 && cam.longitude === 0) continue;

    const dx = to.lon - from.lon;
    const dy = to.lat - from.lat;
    const lenSq = dx * dx + dy * dy;

    let t = ((cam.longitude - from.lon) * dx + (cam.latitude - from.lat) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const nearestLat = from.lat + t * dy;
    const nearestLon = from.lon + t * dx;
    const dist = haversineDistance(cam.latitude, cam.longitude, nearestLat, nearestLon);

    if (dist <= CORRIDOR_WIDTH_KM) {
      matches.push({ camera: cam, dist, progress: t });
    }
  }

  matches.sort((a, b) => a.progress - b.progress);
  return matches;
}

export function useRoutePlanner() {
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);

  // Background OSRM route fetch — for the map polyline only, not blocking cameras
  const routeKey = origin && destination
    ? `/api/route?from=${origin.lat},${origin.lon}&to=${destination.lat},${destination.lon}`
    : null;

  const { data: osrmRoute, isLoading: routeLineLoading } = useSWR<RouteGeometry>(
    routeKey,
    routeFetcher,
    { revalidateOnFocus: false, dedupingInterval: 120_000 },
  );

  // Fetch all cameras statewide (cached by SWR after first load)
  const { data: allCameras = [], isLoading: camerasLoading } = useCameras(null);
  const { data: allCMS = [] } = useCMS(null);
  const { data: allIncidents = [] } = useIncidents();
  const { data: allChainControls = [] } = useChainControl(null);
  const { data: allClosures = [] } = useClosures(null);
  const { data: allTravelTimes = [] } = useTravelTimes(null);

  // Instant corridor matching — no API call needed
  const routeCameras: RouteCamera[] = useMemo(() => {
    if (!origin || !destination || allCameras.length === 0) return [];

    const matches = matchCamerasToCorridorLine(origin, destination, allCameras);

    return matches.map((match): RouteCamera => ({
      ...match.camera,
      nearbyCMS: matchCMSToCamera(match.camera, allCMS),
      nearbyIncidents: matchIncidentsToCamera(match.camera, allIncidents),
      weatherAlerts: [],
      chainControls: matchChainControlToCamera(match.camera, allChainControls),
      nearbyClosures: matchClosuresToCamera(match.camera, allClosures),
      travelTime: matchTravelTimeToCamera(match.camera, allTravelTimes),
      distanceFromRoute: match.dist,
      progressAlongRoute: match.progress,
    }));
  }, [origin, destination, allCameras, allCMS, allIncidents, allChainControls, allClosures, allTravelTimes]);

  const straightLineDistance = origin && destination
    ? haversineDistance(origin.lat, origin.lon, destination.lat, destination.lon) * 1000
    : 0;

  // Use OSRM distance/duration if available, otherwise estimate from straight line
  const routeDistance = osrmRoute?.distance ?? straightLineDistance * 1.3;
  const routeDuration = osrmRoute?.duration ?? (straightLineDistance > 0 ? (straightLineDistance * 1.3) / (105 * 1000 / 3600) : 0);

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
    // Route polyline coords — OSRM when available, null while loading
    routeLineCoords: osrmRoute?.geometry?.coordinates ?? null,
    routeLineLoading,
    hasRoute: !!(origin && destination),
    routeCameras,
    routeLoading: camerasLoading,
    routeDistance,
    routeDuration,
  };
}
