import useSWR from 'swr';
import type { ChainControl } from '@/lib/schemas';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ALL_DISTRICTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

async function fetchAllChainControls(): Promise<ChainControl[]> {
  const results = await Promise.allSettled(
    ALL_DISTRICTS.map((d) =>
      fetch(`/api/chain-control/${d}`).then((r) => {
        if (!r.ok) throw new Error(`D${d}: HTTP ${r.status}`);
        return r.json() as Promise<ChainControl[]>;
      })
    )
  );
  return results
    .filter((r): r is PromiseFulfilledResult<ChainControl[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

export function useChainControl(district: number | null) {
  const key = district ? `/api/chain-control/${district}` : 'chain-control:all';
  const swrFetcher = district
    ? () => fetcher(`/api/chain-control/${district}`)
    : fetchAllChainControls;

  return useSWR<ChainControl[]>(key, swrFetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    fallbackData: [],
  });
}
