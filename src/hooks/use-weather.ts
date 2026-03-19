import useSWR from 'swr';
import type { WeatherAlert } from '@/lib/schemas';

const fetcher = (url: string): Promise<WeatherAlert[]> => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<WeatherAlert[]>;
});

export function useWeatherAlerts() {
  return useSWR<WeatherAlert[]>('/api/weather/alerts', fetcher, {
    refreshInterval: 300_000,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    fallbackData: [],
  });
}
