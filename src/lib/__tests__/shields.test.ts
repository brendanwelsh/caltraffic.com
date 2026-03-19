import { describe, it, expect } from 'vitest';
import { getShieldUrl, getShieldUrlFromString } from '../shields';

describe('getShieldUrl', () => {
  it('returns interstate shield', () => {
    expect(getShieldUrl(5)).toBe('https://shields.caltranscameras.app/I-5.svg');
  });
  it('returns US route shield', () => {
    expect(getShieldUrl(101)).toBe('https://shields.caltranscameras.app/US-101.svg');
  });
  it('returns state route shield', () => {
    expect(getShieldUrl(99)).toBe('https://shields.caltranscameras.app/SR-99.svg');
  });
});

describe('getShieldUrlFromString', () => {
  it('handles pre-formatted route', () => {
    expect(getShieldUrlFromString('I-80')).toBe('https://shields.caltranscameras.app/I-80.svg');
  });
  it('handles plain number', () => {
    expect(getShieldUrlFromString('5')).toBe('https://shields.caltranscameras.app/I-5.svg');
  });
  it('returns empty for invalid', () => {
    expect(getShieldUrlFromString('abc')).toBe('');
  });
});
