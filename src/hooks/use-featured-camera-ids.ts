import { useMemo } from 'react';
import { FEATURED_CAMERAS } from '@/lib/featured-cameras';
import type { FeaturedCamera } from '@/lib/featured-cameras';
import { useEnrichedCameras } from '@/hooks/use-enriched-cameras';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';

export interface MatchedFeatured extends FeaturedCamera {
  cameraId: string;
}

/**
 * Resolves FEATURED_CAMERAS match terms against the full camera list.
 * Returns a Set of matched camera IDs and a Map for metadata lookup.
 */
export function useFeaturedCameraIds() {
  const { cameras: allCameras, isLoading } = useEnrichedCameras(null);

  const { featuredIds, featuredMeta } = useMemo(() => {
    const ids = new Set<string>();
    const meta = new Map<string, FeaturedCamera>();

    if (!allCameras.length) return { featuredIds: ids, featuredMeta: meta };

    for (const featured of FEATURED_CAMERAS) {
      const match = allCameras.find(
        (cam) =>
          featured.matchTerms.some(
            (term) =>
              cam.location?.toLowerCase().includes(term.toLowerCase()) ||
              cam.city?.toLowerCase().includes(term.toLowerCase())
          ) && cam.district === featured.district
      );
      if (match) {
        ids.add(match.id);
        meta.set(match.id, featured);
      }
    }

    return { featuredIds: ids, featuredMeta: meta };
  }, [allCameras]);

  return { featuredIds, featuredMeta, isLoading };
}
