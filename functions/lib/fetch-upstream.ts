import { isCircuitOpen, recordSuccess, recordFailure } from './circuit-breaker';
import { withCache, getStaleCache } from './cache';

interface FetchOptions {
  url: string;
  cacheKey: string;
  cacheTtl: number;
  circuitKey: string;
  kv?: KVNamespace;
  timeoutMs?: number;
}

export async function fetchUpstream<T>(
  options: FetchOptions,
  transform: (data: unknown) => T,
): Promise<{ data: T; fromCache: boolean; circuitOpen: boolean }> {
  const { url, cacheKey, cacheTtl, circuitKey, kv, timeoutMs = 5000 } = options;

  const cache = await caches.open('api-cache');

  // Check circuit breaker
  if (await isCircuitOpen(kv, circuitKey)) {
    const stale = await getStaleCache<T>(cache, cacheKey);
    if (stale) {
      return { data: stale, fromCache: true, circuitOpen: true };
    }
    throw new Error(`Circuit open for ${circuitKey} and no stale cache available`);
  }

  try {
    const result = await withCache<T>(cache, { ttl: cacheTtl, key: cacheKey }, async () => {
      const data = await fetchWithRetry(url, timeoutMs);
      return transform(data);
    });

    await recordSuccess(kv, circuitKey);
    return { ...result, circuitOpen: false };
  } catch (error) {
    await recordFailure(kv, circuitKey);

    // Try stale cache
    const stale = await getStaleCache<T>(cache, cacheKey);
    if (stale) {
      return { data: stale, fromCache: true, circuitOpen: false };
    }

    throw error;
  }
}

async function fetchWithRetry(url: string, timeoutMs: number, retries = 1): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('xml') || contentType.includes('text')) {
        return await response.text();
      }
      return await response.json();
    } catch (error) {
      if (attempt === retries) throw error;
      // Exponential backoff
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Unreachable');
}
