import { describe, it, expect } from 'vitest';
import { haversineDistance, parseInService, extractRouteNumber, cleanLocationName } from '../utils';

describe('haversineDistance', () => {
  it('calculates distance between Sacramento and SF', () => {
    const d = haversineDistance(38.58, -121.49, 37.77, -122.42);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(130);
  });

  it('returns 0 for same point', () => {
    expect(haversineDistance(38.5, -121.5, 38.5, -121.5)).toBe(0);
  });
});

describe('parseInService', () => {
  it('handles Y', () => expect(parseInService('Y')).toBe(true));
  it('handles true', () => expect(parseInService('true')).toBe(true));
  it('handles True', () => expect(parseInService('True')).toBe(true));
  it('handles N', () => expect(parseInService('N')).toBe(false));
  it('handles empty', () => expect(parseInService('')).toBe(false));
});

describe('extractRouteNumber', () => {
  it('extracts number from route object', () => {
    expect(extractRouteNumber({ '@_value': '80' })).toBe(80);
  });
  it('extracts from plain string', () => {
    expect(extractRouteNumber('99')).toBe(99);
  });
  it('returns 0 for invalid', () => {
    expect(extractRouteNumber(undefined)).toBe(0);
  });
});
