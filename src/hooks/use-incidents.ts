import useSWR from 'swr';
import type { Incident } from '@/lib/schemas';

const fetcher = (url: string): Promise<Incident[]> => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<Incident[]>;
});

export function useIncidents() {
  return useSWR<Incident[]>('/api/incidents', fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    fallbackData: [],
  });
}
