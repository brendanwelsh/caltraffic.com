import useSWR from 'swr';
import { PEMS_DISTRICTS } from '@/lib/constants';

export interface PemsStation {
  id: string;
  name: string;
  freewayId: string;
  freewayDir: string;
  latitude: number;
  longitude: number;
  lanes: number;
  speed: number | null;
  flow: number;
  occupancy: number;
}

export interface PemsResponse {
  timestamp: string;
  stations: PemsStation[];
}

const fetcher = (url: string): Promise<PemsResponse> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<PemsResponse>;
  });

async function fetchMultipleDistricts(districts: number[]): Promise<PemsResponse> {
  const supported = districts.filter((d) => PEMS_DISTRICTS.has(d));
  if (supported.length === 0) return { timestamp: '', stations: [] };

  const results = await Promise.allSettled(
    supported.map((d) => fetcher(`/api/pems/${d}`))
  );

  const allStations: PemsStation[] = [];
  let latestTimestamp = '';

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allStations.push(...result.value.stations);
      if (result.value.timestamp > latestTimestamp) latestTimestamp = result.value.timestamp;
    }
  }

  return { timestamp: latestTimestamp, stations: allStations };
}

export function usePems(districts: number | number[] | null) {
  const districtList = districts === null ? [] : Array.isArray(districts) ? districts : [districts];
  const supported = districtList.filter((d) => PEMS_DISTRICTS.has(d));
  const key = supported.length > 0 ? `pems:${supported.sort().join(',')}` : null;

  return useSWR<PemsResponse>(
    key,
    () => supported.length === 1
      ? fetcher(`/api/pems/${supported[0]}`)
      : fetchMultipleDistricts(supported),
    {
      refreshInterval: 60_000,
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
      fallbackData: { timestamp: '', stations: [] },
    }
  );
}
