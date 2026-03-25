import { haversineDistance } from './utils';
import type { Camera } from './schemas';

interface RouteCoordinate {
  lat: number;
  lon: number;
}

export interface RouteCameraMatch {
  camera: Camera;
  distanceFromRoute: number;
  progressAlongRoute: number;
  nearestRoutePoint: RouteCoordinate;
}

const MAX_DISTANCE_FROM_ROUTE_KM = 1.5;

function nearestPointOnSegment(
  point: RouteCoordinate,
  segStart: RouteCoordinate,
  segEnd: RouteCoordinate,
): { fraction: number; nearest: RouteCoordinate } {
  const dx = segEnd.lon - segStart.lon;
  const dy = segEnd.lat - segStart.lat;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return { fraction: 0, nearest: segStart };
  }

  let t = ((point.lon - segStart.lon) * dx + (point.lat - segStart.lat) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    fraction: t,
    nearest: {
      lat: segStart.lat + t * dy,
      lon: segStart.lon + t * dx,
    },
  };
}

export function matchCamerasToRoute(
  routeCoords: [number, number][],
  cameras: Camera[],
  maxDistanceKm: number = MAX_DISTANCE_FROM_ROUTE_KM,
): RouteCameraMatch[] {
  if (routeCoords.length < 2 || cameras.length === 0) return [];

  const segmentDistances: number[] = [0];
  let totalDistance = 0;
  for (let i = 1; i < routeCoords.length; i++) {
    const d = haversineDistance(
      routeCoords[i - 1][1], routeCoords[i - 1][0],
      routeCoords[i][1], routeCoords[i][0],
    );
    totalDistance += d;
    segmentDistances.push(totalDistance);
  }

  const matches: RouteCameraMatch[] = [];

  for (const camera of cameras) {
    if (camera.latitude === 0 && camera.longitude === 0) continue;

    let bestDistance = Infinity;
    let bestProgress = 0;
    let bestNearest: RouteCoordinate = { lat: 0, lon: 0 };

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const segStart: RouteCoordinate = { lat: routeCoords[i][1], lon: routeCoords[i][0] };
      const segEnd: RouteCoordinate = { lat: routeCoords[i + 1][1], lon: routeCoords[i + 1][0] };

      const { fraction, nearest } = nearestPointOnSegment(
        { lat: camera.latitude, lon: camera.longitude },
        segStart,
        segEnd,
      );

      const dist = haversineDistance(camera.latitude, camera.longitude, nearest.lat, nearest.lon);

      if (dist < bestDistance) {
        bestDistance = dist;
        bestNearest = nearest;
        const segDist = segmentDistances[i] + fraction * (segmentDistances[i + 1] - segmentDistances[i]);
        bestProgress = totalDistance > 0 ? segDist / totalDistance : 0;
      }
    }

    if (bestDistance <= maxDistanceKm) {
      matches.push({
        camera,
        distanceFromRoute: bestDistance,
        progressAlongRoute: bestProgress,
        nearestRoutePoint: bestNearest,
      });
    }
  }

  matches.sort((a, b) => a.progressAlongRoute - b.progressAlongRoute);

  return matches;
}
