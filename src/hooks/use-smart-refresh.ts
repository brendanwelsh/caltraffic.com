import type { EnrichedCamera } from './use-enriched-cameras';

export function useSmartRefreshInterval(cameras: EnrichedCamera[]): number {
  if (cameras.some((c) => c.nearbyIncidents.length > 0)) return 15_000;
  if (cameras.some((c) => c.hasVideo)) return 30_000;
  return 60_000;
}
