import useSWR from 'swr';
import type { Camera } from '@/lib/schemas';

const fetcher = (url: string): Promise<Camera[]> => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<Camera[]>;
});

export function useCameras(district: number | null) {
  const key = district === null ? '/api/cameras/all' : `/api/cameras/${district}`;

  return useSWR<Camera[]>(key, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
    fallbackData: [],
  });
}
