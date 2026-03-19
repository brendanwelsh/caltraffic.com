import { describe, it, expect } from 'vitest';
import {
  CameraSchema,
  CMSSchema,
  IncidentSchema,
  WeatherAlertSchema,
  ChainControlSchema,
  LaneClosureSchema,
  RWISSchema,
  TravelTimeSchema,
  RawCameraSchema,
  RawCMSSchema,
} from '../schemas';

describe('CameraSchema', () => {
  it('validates a well-formed camera', () => {
    const camera = {
      id: 'D03-C001',
      district: 3,
      route: 'I-80',
      routeType: 'I' as const,
      direction: 'EB',
      county: 'Sacramento',
      city: 'Sacramento',
      location: 'At W. El Camino Ave',
      latitude: 38.6,
      longitude: -121.5,
      postmile: 5.2,
      imageUrl: 'https://cwwp2.dot.ca.gov/data/d3/cctv/image/test.jpg',
      historicalImages: [],
      streamUrl: null,
      inService: true,
      lastUpdated: '2026-03-18T10:00:00Z',
      isStale: false,
      hasVideo: true,
    };
    expect(CameraSchema.safeParse(camera).success).toBe(true);
  });

  it('rejects camera with invalid district', () => {
    const bad = { id: 'X', district: 15, route: 'I-5', routeType: 'I', direction: 'NB',
      county: 'X', city: 'X', location: 'X', latitude: 0, longitude: 0, postmile: 0,
      imageUrl: 'https://example.com/img.jpg', historicalImages: [], streamUrl: null,
      inService: true, lastUpdated: '2026-01-01T00:00:00Z', isStale: false, hasVideo: false };
    expect(CameraSchema.safeParse(bad).success).toBe(false);
  });
});

describe('RawCameraSchema', () => {
  it('validates raw CWWP2 CCTV shape', () => {
    const raw = {
      cctv: {
        index: '1',
        location: {
          locationName: 'I-80 at W. El Camino',
          nearbyPlace: 'Sacramento',
          district: '3',
          county: 'Sacramento',
          route: { '@_value': '80' },
          direction: { '@_value': 'EB' },
          latitude: '38.6',
          longitude: '-121.5',
          postmile: { '@_value': '5.2' },
        },
        inService: 'true',
        imageData: {
          static: {
            currentImageURL: 'https://example.com/img.jpg',
            currentImageUpdateFrequency: '60',
          },
          streamingVideoURL: 'https://example.com/stream.m3u8',
        },
      },
    };
    expect(RawCameraSchema.safeParse(raw).success).toBe(true);
  });
});
