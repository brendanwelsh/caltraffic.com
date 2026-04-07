import useSWR from 'swr';
import type { LaneClosure } from '@/lib/schemas';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ALL_DISTRICTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

async function fetchAllClosures(): Promise<LaneClosure[]> {
  const results = await Promise.allSettled(
    ALL_DISTRICTS.map((d) =>
      fetch(`/api/closures/${d}`).then((r) => {
        if (!r.ok) throw new Error(`D${d}: HTTP ${r.status}`);
        return r.json() as Promise<LaneClosure[]>;
      })
    )
  );
  return results
    .filter((r): r is PromiseFulfilledResult<LaneClosure[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

export function useClosures(district: number | null) {
  const key = district ? `/api/closures/${district}` : 'closures:all';
  const swrFetcher = district
    ? () => fetcher(`/api/closures/${district}`)
    : fetchAllClosures;

  return useSWR<LaneClosure[]>(key, swrFetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    fallbackData: [],
  });
}
