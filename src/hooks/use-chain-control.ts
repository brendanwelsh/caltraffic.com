import useSWR from 'swr';
import type { ChainControl } from '@/lib/schemas';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useChainControl(district: number | null) {
  const key = district ? `/api/chain-control/${district}` : null;
  return useSWR<ChainControl[]>(key, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    fallbackData: [],
  });
}
