import useSWR from 'swr';
import type { CMS } from '@/lib/schemas';

const fetcher = (url: string): Promise<CMS[]> => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<CMS[]>;
});

export function useCMS(district: number | null) {
  const key = district === null ? '/api/cms/all' : `/api/cms/${district}`;

  return useSWR<CMS[]>(key, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    fallbackData: [],
  });
}
