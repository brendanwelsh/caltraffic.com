import useSWR from 'swr';
import type { Camera } from '@/lib/schemas';

const districtFetcher = (url: string): Promise<Camera[]> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<Camera[]>;
  });

const ALL_DISTRICTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

async function fetchAllDistricts(): Promise<Camera[]> {
  const results = await Promise.allSettled(
    ALL_DISTRICTS.map((d) =>
      fetch(`/api/cameras/${d}`).then((r) => {
        if (!r.ok) throw new Error(`D${d}: HTTP ${r.status}`);
        return r.json() as Promise<Camera[]>;
      })
    )
  );
  return results
    .filter((r): r is PromiseFulfilledResult<Camera[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

async function fetchDistricts(districts: number[]): Promise<Camera[]> {
  const results = await Promise.allSettled(
    districts.map((d) =>
      fetch(`/api/cameras/${d}`).then((r) => {
        if (!r.ok) throw new Error(`D${d}: HTTP ${r.status}`);
        return r.json() as Promise<Camera[]>;
      })
    )
  );
  return results
    .filter((r): r is PromiseFulfilledResult<Camera[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

export function useCameras(district: number | null | number[]) {
  const key = district === null
    ? 'cameras:all'
    : Array.isArray(district)
      ? `cameras:${district.join(',')}`
      : `/api/cameras/${district}`;

  const fetcher = () => {
    if (district === null) return fetchAllDistricts();
    if (Array.isArray(district)) return fetchDistricts(district);
    return districtFetcher(`/api/cameras/${district}`);
  };

  return useSWR<Camera[]>(key, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
    fallbackData: [],
  });
}
