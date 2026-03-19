import { describe, it, expect } from 'vitest';
import { matchCMSToCamera, matchIncidentsToCamera, matchClosuresToCamera, findNearestRWIS } from '../matching';
import type { Camera, CMS, Incident, LaneClosure, RWIS } from '../schemas';

const makeCamera = (overrides: Partial<Camera> = {}): Camera => ({
  id: 'C1', district: 3, route: 'I-80', routeType: 'I', direction: 'EB',
  county: 'Sacramento', city: 'Sacramento', location: 'Test',
  latitude: 38.6, longitude: -121.5, postmile: 5.0,
  imageUrl: 'https://example.com/img.jpg', historicalImages: [],
  streamUrl: null, inService: true, lastUpdated: '2026-01-01T00:00:00Z',
  isStale: false, hasVideo: true,
  ...overrides,
});

const makeCMS = (overrides: Partial<CMS> = {}): CMS => ({
  id: 'CMS1', district: 3, route: 'I-80', routeType: 'I', direction: 'EB',
  county: 'Sacramento', latitude: 38.6, longitude: -121.5, postmile: 5.5,
  location: 'Test CMS', inService: true,
  phase1Lines: ['EXPECT DELAYS', 'AHEAD'], phase2Lines: null,
  lastUpdated: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('matchCMSToCamera', () => {
  it('matches CMS within 1 mile on same route', () => {
    const camera = makeCamera();
    const cmsList = [makeCMS({ postmile: 5.8 })];
    expect(matchCMSToCamera(camera, cmsList)).toHaveLength(1);
  });

  it('does not match CMS on different route', () => {
    const camera = makeCamera();
    const cmsList = [makeCMS({ route: 'I-5' })];
    expect(matchCMSToCamera(camera, cmsList)).toHaveLength(0);
  });

  it('does not match CMS beyond 1 mile', () => {
    const camera = makeCamera();
    const cmsList = [makeCMS({ postmile: 7.0 })];
    expect(matchCMSToCamera(camera, cmsList)).toHaveLength(0);
  });
});

describe('matchIncidentsToCamera', () => {
  it('matches incident within 2km', () => {
    const camera = makeCamera();
    const incidents: Incident[] = [{
      id: 'INC1', type: 'Collision', location: 'I-80 EB', description: 'Multi-vehicle',
      latitude: 38.601, longitude: -121.501, severity: 'Major',
      dispatchCenter: 'Sacramento', logEntries: [], timestamp: '2026-01-01T00:00:00Z',
    }];
    expect(matchIncidentsToCamera(camera, incidents)).toHaveLength(1);
  });

  it('does not match incident beyond 2km', () => {
    const camera = makeCamera();
    const incidents: Incident[] = [{
      id: 'INC1', type: 'Collision', location: 'I-80 EB', description: 'Multi-vehicle',
      latitude: 38.65, longitude: -121.55, severity: 'Major',
      dispatchCenter: 'Sacramento', logEntries: [], timestamp: '2026-01-01T00:00:00Z',
    }];
    expect(matchIncidentsToCamera(camera, incidents)).toHaveLength(0);
  });
});

describe('findNearestRWIS', () => {
  it('finds nearest sensor', () => {
    const camera = makeCamera();
    const sensors: RWIS[] = [
      { id: 'R1', district: 3, route: 'I-80', location: 'Far', latitude: 39.0, longitude: -121.0, airTemp: 50, surfaceTemp: 48, humidity: 70, windSpeed: 5, windDirection: 'W', visibility: 10, precipitationType: null },
      { id: 'R2', district: 3, route: 'I-80', location: 'Near', latitude: 38.61, longitude: -121.51, airTemp: 55, surfaceTemp: 52, humidity: 65, windSpeed: 3, windDirection: 'NW', visibility: 15, precipitationType: null },
    ];
    const result = findNearestRWIS(camera, sensors);
    expect(result?.id).toBe('R2');
  });

  it('returns null when no sensors within range', () => {
    const camera = makeCamera();
    const sensors: RWIS[] = [
      { id: 'R1', district: 3, route: 'I-80', location: 'Very far', latitude: 40.0, longitude: -120.0, airTemp: 50, surfaceTemp: 48, humidity: 70, windSpeed: 5, windDirection: 'W', visibility: 10, precipitationType: null },
    ];
    const result = findNearestRWIS(camera, sensors);
    expect(result).toBeNull();
  });
});
