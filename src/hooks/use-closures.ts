import useSWR from 'swr';
import type { LaneClosure } from '@/lib/schemas';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useClosures(district: number | null) {
  const key = district ? `/api/closures/${district}` : null;
  return useSWR<LaneClosure[]>(key, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    fallbackData: [],
  });
}
