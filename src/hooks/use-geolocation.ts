import { useEffect, useState } from 'react';
import { DISTRICT_CENTERS } from '@/lib/constants';
import { haversineDistance } from '@/lib/utils';
import { selectedDistrict } from '@/stores/filters';

/**
 * Attempts to detect the user's location and auto-select the nearest Caltrans district.
 * Only runs once on mount. Only sets the district if none is already selected.
 */
export function useGeolocation() {
  const [detected, setDetected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't override if user already selected a district
    if (selectedDistrict.get() !== null) return;

    // Check if we have a cached district from a previous session
    try {
      const cached = localStorage.getItem('california-traffic-lens-geo-district');
      if (cached) {
        const district = parseInt(cached, 10);
        if (district >= 1 && district <= 12) {
          selectedDistrict.set(district);
          setDetected(district);
          return;
        }
      }
    } catch {}

    const fallbackToSacramento = () => {
      selectedDistrict.set(3);
      setDetected(3);
    };

    if (!navigator.geolocation) {
      fallbackToSacramento();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Find nearest district center
        let nearestDistrict = 3;
        let minDist = Infinity;

        for (const [distStr, center] of Object.entries(DISTRICT_CENTERS)) {
          const dist = haversineDistance(latitude, longitude, center.lat, center.lon);
          if (dist < minDist) {
            minDist = dist;
            nearestDistrict = parseInt(distStr, 10);
          }
        }

        // Auto-select nearest if within ~200km, otherwise default to Sacramento
        const district = minDist < 200 ? nearestDistrict : 3;
        selectedDistrict.set(district);
        setDetected(district);
        try {
          localStorage.setItem('california-traffic-lens-geo-district', String(district));
        } catch {}
      },
      () => {
        // Geolocation denied — default to Sacramento
        fallbackToSacramento();
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
    );
  }, []);

  return { detected, error };
}
