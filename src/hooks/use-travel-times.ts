import useSWR from 'swr';
import type { TravelTime } from '@/lib/schemas';
import { TRAVEL_TIME_DISTRICTS } from '@/lib/constants';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTravelTimes(district: number | null) {
  const hasData = district !== null && TRAVEL_TIME_DISTRICTS.has(district);
  const key = hasData ? `/api/travel-times/${district}` : null;
  return useSWR<TravelTime[]>(key, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    fallbackData: [],
  });
}
