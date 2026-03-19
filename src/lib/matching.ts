import { haversineDistance } from './utils';
import type { Camera, CMS, Incident, LaneClosure, ChainControl, RWIS, TravelTime } from './schemas';

const CMS_POSTMILE_THRESHOLD = 1;
const INCIDENT_DISTANCE_KM = 2;
const CLOSURE_POSTMILE_THRESHOLD = 2;
const RWIS_MAX_DISTANCE_KM = 50;

export function matchCMSToCamera(camera: Camera, cmsList: CMS[]): CMS[] {
  return cmsList.filter(
    (cms) =>
      cms.route === camera.route &&
      cms.direction === camera.direction &&
      Math.abs(cms.postmile - camera.postmile) <= CMS_POSTMILE_THRESHOLD &&
      cms.inService
  );
}

export function matchIncidentsToCamera(camera: Camera, incidents: Incident[]): Incident[] {
  return incidents.filter(
    (inc) =>
      haversineDistance(camera.latitude, camera.longitude, inc.latitude, inc.longitude) <= INCIDENT_DISTANCE_KM
  );
}

export function matchClosuresToCamera(camera: Camera, closures: LaneClosure[]): LaneClosure[] {
  return closures.filter(
    (cl) =>
      cl.route === camera.route &&
      cl.direction === camera.direction &&
      Math.abs(cl.postmile - camera.postmile) <= CLOSURE_POSTMILE_THRESHOLD
  );
}

export function matchChainControlToCamera(camera: Camera, chains: ChainControl[]): ChainControl[] {
  return chains.filter(
    (cc) => cc.route === camera.route && cc.district === camera.district
  );
}

export function findNearestRWIS(camera: Camera, sensors: RWIS[]): RWIS | null {
  let nearest: RWIS | null = null;
  let minDist = RWIS_MAX_DISTANCE_KM;
  for (const sensor of sensors) {
    const dist = haversineDistance(camera.latitude, camera.longitude, sensor.latitude, sensor.longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = sensor;
    }
  }
  return nearest;
}

export function matchTravelTimeToCamera(camera: Camera, times: TravelTime[]): TravelTime | null {
  return times.find((tt) => tt.route === camera.route) ?? null;
}
