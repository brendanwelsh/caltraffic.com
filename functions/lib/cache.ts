export interface CacheOptions {
  ttl: number;
  key: string;
}

export async function withCache<T>(
  cacheApi: Cache,
  options: CacheOptions,
  fetchFn: () => Promise<T>,
): Promise<{ data: T; fromCache: boolean }> {
  const cacheKey = new Request(`https://cache.internal/${options.key}`);

  const cached = await cacheApi.match(cacheKey);
  if (cached) {
    const data = await cached.json() as T;
    return { data, fromCache: true };
  }

  const data = await fetchFn();

  const response = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `s-maxage=${options.ttl}`,
    },
  });

  // Don't await — fire and forget
  cacheApi.put(cacheKey, response);

  return { data, fromCache: false };
}

export async function getStaleCache<T>(
  cacheApi: Cache,
  key: string,
): Promise<T | null> {
  const cacheKey = new Request(`https://cache.internal/${key}`);
  const cached = await cacheApi.match(cacheKey);
  if (!cached) return null;
  return cached.json() as Promise<T>;
}
