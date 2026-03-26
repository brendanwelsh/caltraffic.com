import { useState, useCallback, useMemo } from 'react';
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

const CORRIDOR_WIDTH_KM = 5; // cameras within 5km of the line

/**
 * Find cameras near a straight-line corridor between two points.
 * Uses point-to-line-segment distance. No routing API needed — instant.
 */
function matchCamerasToCorridorLine(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  cameras: Camera[],
): RouteCamera[] {
  const totalDist = haversineDistance(from.lat, from.lon, to.lat, to.lon);
  if (totalDist === 0) return [];

  const matches: { camera: Camera; dist: number; progress: number }[] = [];

  for (const cam of cameras) {
    if (cam.latitude === 0 && cam.longitude === 0) continue;

    // Project camera onto the line segment from→to
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
  return matches as any; // enriched below
}

export function useRoutePlanner() {
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);

  // Fetch all cameras statewide (cached by SWR after first load)
  const { data: allCameras = [], isLoading: camerasLoading } = useCameras(null);
  const { data: allCMS = [] } = useCMS(null);
  const { data: allIncidents = [] } = useIncidents();
  const { data: allChainControls = [] } = useChainControl(null);
  const { data: allClosures = [] } = useClosures(null);
  const { data: allTravelTimes = [] } = useTravelTimes(null);

  // Match cameras to corridor — instant, no API call
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

  const routeDistance = origin && destination
    ? haversineDistance(origin.lat, origin.lon, destination.lat, destination.lon) * 1000 // meters
    : 0;

  // Rough driving time estimate: ~1.3x straight-line distance at 65mph avg
  const routeDuration = routeDistance > 0
    ? (routeDistance * 1.3) / (105 * 1000 / 3600) // seconds (105 km/h ~= 65 mph)
    : 0;

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
    routeData: origin && destination ? { geometry: { type: 'LineString', coordinates: [[origin.lon, origin.lat], [destination.lon, destination.lat]] }, distance: routeDistance, duration: routeDuration } : null,
    routeCameras,
    routeError: null,
    routeLoading: camerasLoading,
    routeDistance,
    routeDuration,
  };
}
