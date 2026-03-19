import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../rate-limiter';

describe('checkRateLimit', () => {
  it('allows first request', () => {
    const result = checkRateLimit('test-ip-' + Date.now());
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(119);
  });

  it('tracks request count', () => {
    const ip = 'counter-ip-' + Date.now();
    checkRateLimit(ip);
    checkRateLimit(ip);
    const result = checkRateLimit(ip);
    expect(result.remaining).toBe(117);
  });
});
