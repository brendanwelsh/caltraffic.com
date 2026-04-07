import useSWR from 'swr';
import type { TravelTime } from '@/lib/schemas';
import { TRAVEL_TIME_DISTRICTS } from '@/lib/constants';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

async function fetchAllTravelTimes(): Promise<TravelTime[]> {
  const districts = [...TRAVEL_TIME_DISTRICTS];
  const results = await Promise.allSettled(
    districts.map((d) =>
      fetch(`/api/travel-times/${d}`).then((r) => {
        if (!r.ok) throw new Error(`D${d}: HTTP ${r.status}`);
        return r.json() as Promise<TravelTime[]>;
      })
    )
  );
  return results
    .filter((r): r is PromiseFulfilledResult<TravelTime[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

export function useTravelTimes(district: number | null) {
  const key = district
    ? TRAVEL_TIME_DISTRICTS.has(district) ? `/api/travel-times/${district}` : null
    : 'travel-times:all';
  const swrFetcher = district
    ? () => fetcher(`/api/travel-times/${district}`)
    : fetchAllTravelTimes;

  return useSWR<TravelTime[]>(key, swrFetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    fallbackData: [],
  });
}
