import { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useCameras } from './use-cameras';
import { useCMS } from './use-cms';
import { useIncidents } from './use-incidents';
import { useChainControl } from './use-chain-control';
import { useClosures } from './use-closures';
import { useTravelTimes } from './use-travel-times';
import { haversineDistance } from '@/lib/utils';
import { matchCamerasToRoute } from '@/lib/route-matching';
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
  distanceToNext: number | null; // km to the next camera
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

const routeFetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('Route fetch failed');
  return r.json();
});

/** Quick corridor match for instant results (before OSRM responds) */
function corridorMatch(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  cameras: Camera[],
): { camera: Camera; dist: number; progress: number }[] {
  const totalDist = haversineDistance(from.lat, from.lon, to.lat, to.lon);
  if (totalDist === 0) return [];

  // Tight corridor: 1km for short, 2km for medium, 3km for long
  const width = totalDist < 50 ? 1 : totalDist < 200 ? 2 : 3;
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
    if (dist <= width) {
      matches.push({ camera: cam, dist, progress: t });
    }
  }

  matches.sort((a, b) => a.progress - b.progress);
  return matches;
}

function enrichAndSort(
  matches: { camera: Camera; dist: number; progress: number }[],
  allCMS: any[], allIncidents: any[], allChainControls: any[], allClosures: any[], allTravelTimes: any[],
): RouteCamera[] {
  const enriched = matches.map((match): RouteCamera => ({
    ...match.camera,
    nearbyCMS: matchCMSToCamera(match.camera, allCMS),
    nearbyIncidents: matchIncidentsToCamera(match.camera, allIncidents),
    weatherAlerts: [],
    chainControls: matchChainControlToCamera(match.camera, allChainControls),
    nearbyClosures: matchClosuresToCamera(match.camera, allClosures),
    travelTime: matchTravelTimeToCamera(match.camera, allTravelTimes),
    distanceFromRoute: match.dist,
    progressAlongRoute: match.progress,
    distanceToNext: null,
  }));

  // Calculate distance to next camera
  for (let i = 0; i < enriched.length - 1; i++) {
    enriched[i].distanceToNext = haversineDistance(
      enriched[i].latitude, enriched[i].longitude,
      enriched[i + 1].latitude, enriched[i + 1].longitude,
    );
  }

  return enriched;
}

export function useRoutePlanner() {
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);

  // Background OSRM route fetch — for accurate matching + map polyline
  const routeKey = origin && destination
    ? `/api/route?from=${origin.lat},${origin.lon}&to=${destination.lat},${destination.lon}`
    : null;

  const { data: osrmRoute, isLoading: routeLineLoading } = useSWR<RouteGeometry>(
    routeKey,
    routeFetcher,
    { revalidateOnFocus: false, dedupingInterval: 120_000 },
  );

  const { data: allCameras = [], isLoading: camerasLoading } = useCameras(null);
  const { data: allCMS = [] } = useCMS(null);
  const { data: allIncidents = [] } = useIncidents();
  const { data: allChainControls = [] } = useChainControl(null);
  const { data: allClosures = [] } = useClosures(null);
  const { data: allTravelTimes = [] } = useTravelTimes(null);

  // Wait for OSRM route before matching — no corridor fallback (avoids showing wrong cameras)
  const routeCameras: RouteCamera[] = useMemo(() => {
    if (!origin || !destination || allCameras.length === 0) return [];
    if (!osrmRoute?.geometry?.coordinates) return []; // Wait for real route

    // Tight matching: 0.3km for short routes, 0.5km for longer ones
    const routeLen = osrmRoute.distance ? osrmRoute.distance / 1000 : 50;
    const tolerance = routeLen < 50 ? 0.3 : 0.5;
    const rawMatches = matchCamerasToRoute(osrmRoute.geometry.coordinates, allCameras, tolerance);
    // Convert RouteCameraMatch to the format enrichAndSort expects
    const matches = rawMatches.map((m) => ({
      camera: m.camera,
      dist: m.distanceFromRoute,
      progress: m.progressAlongRoute,
    }));
    return enrichAndSort(matches, allCMS, allIncidents, allChainControls, allClosures, allTravelTimes);
  }, [origin, destination, allCameras, osrmRoute, allCMS, allIncidents, allChainControls, allClosures, allTravelTimes]);

  const straightLineDistance = origin && destination
    ? haversineDistance(origin.lat, origin.lon, destination.lat, destination.lon) * 1000
    : 0;

  const rawDistance = osrmRoute?.distance ?? straightLineDistance * 1.3;
  const rawDuration = osrmRoute?.duration ?? (straightLineDistance > 0 ? (straightLineDistance * 1.3) / (105 * 1000 / 3600) : 0);
  const routeDistance = isNaN(rawDistance) ? 0 : rawDistance;
  const routeDuration = isNaN(rawDuration) ? 0 : rawDuration;

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
    routeLineCoords: osrmRoute?.geometry?.coordinates ?? null,
    routeLineLoading,
    hasRoute: !!(origin && destination),
    routeCameras,
    routeLoading: !!(origin && destination) && (camerasLoading || routeLineLoading),
    routeDistance,
    routeDuration,
  };
}
