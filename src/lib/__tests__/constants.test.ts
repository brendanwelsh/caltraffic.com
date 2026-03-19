import { describe, it, expect } from 'vitest';
import { getRouteType, formatRoute, buildCwwp2Url, DISTRICTS, DISTRICT_CAPABILITIES } from '../constants';

describe('getRouteType', () => {
  it('identifies interstates', () => {
    expect(getRouteType(5)).toBe('I');
    expect(getRouteType(80)).toBe('I');
    expect(getRouteType(405)).toBe('I');
  });
  it('identifies US routes', () => {
    expect(getRouteType(101)).toBe('US');
    expect(getRouteType(50)).toBe('US');
    expect(getRouteType(395)).toBe('US');
  });
  it('identifies state routes', () => {
    expect(getRouteType(99)).toBe('SR');
    expect(getRouteType(1)).toBe('SR');
  });
});

describe('formatRoute', () => {
  it('formats interstates', () => expect(formatRoute(5)).toBe('I-5'));
  it('formats US routes', () => expect(formatRoute(101)).toBe('US-101'));
  it('formats state routes', () => expect(formatRoute(99)).toBe('SR-99'));
});

describe('buildCwwp2Url', () => {
  it('builds correct URL for district 3 cctv', () => {
    expect(buildCwwp2Url('cctv', 3)).toBe('https://cwwp2.dot.ca.gov/data/d3/cctv/cctvStatusD03.json');
  });
  it('builds correct URL for district 12 cms', () => {
    expect(buildCwwp2Url('cms', 12)).toBe('https://cwwp2.dot.ca.gov/data/d12/cms/cmsStatusD12.json');
  });
});

describe('DISTRICTS', () => {
  it('has all 12 districts', () => {
    expect(Object.keys(DISTRICTS)).toHaveLength(12);
  });
  it('each district has name and description', () => {
    for (const [, info] of Object.entries(DISTRICTS)) {
      expect(info.name).toBeTruthy();
      expect(info.description).toBeTruthy();
    }
  });
});

describe('DISTRICT_CAPABILITIES', () => {
  it('has all 12 districts', () => {
    expect(Object.keys(DISTRICT_CAPABILITIES)).toHaveLength(12);
  });
  it('all districts have CCTV and CMS', () => {
    for (const [, caps] of Object.entries(DISTRICT_CAPABILITIES)) {
      expect(caps.cctv).toBe(true);
      expect(caps.cms).toBe(true);
    }
  });
  it('D07-D12 are photo only', () => {
    for (let d = 7; d <= 12; d++) {
      expect(DISTRICT_CAPABILITIES[d].video).toBe(false);
    }
  });
});
