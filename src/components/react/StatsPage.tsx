import { useMemo } from 'react';
import { useCameras } from '@/hooks/use-cameras';
import { useCMS } from '@/hooks/use-cms';
import { useIncidents } from '@/hooks/use-incidents';
import { useWeatherAlerts } from '@/hooks/use-weather';
import { DISTRICTS, PHOTO_ONLY_DISTRICTS } from '@/lib/constants';
import type { Camera, CMS, Incident } from '@/lib/schemas';

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function CameraNetworkStats({ cameras }: { cameras: Camera[] }) {
  const byDistrict = useMemo(() => {
    const map = new Map<number, number>();
    for (const cam of cameras) {
      map.set(cam.district, (map.get(cam.district) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [cameras]);

  const videoCount = cameras.filter((c) => c.hasVideo).length;
  const photoCount = cameras.length - videoCount;

  const byRoute = useMemo(() => {
    const map = new Map<string, number>();
    for (const cam of cameras) {
      const key = `${cam.routeType}-${cam.route}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [cameras]);

  const byCity = useMemo(() => {
    const map = new Map<string, number>();
    for (const cam of cameras) {
      const city = cam.city || 'Unknown';
      map.set(city, (map.get(city) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [cameras]);

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Camera Network</h2>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard value={cameras.length} label="Total Cameras" />
        <StatCard value={videoCount} label="Live Video" />
        <StatCard value={photoCount} label="Photo Only" />
        <StatCard value={byRoute.length > 0 ? byRoute.length + '+' : '0'} label="Routes Covered" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By District */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Cameras by District
          </h3>
          <div className="space-y-2">
            {byDistrict.map(([district, count]) => {
              const info = DISTRICTS[district];
              const maxCount = Math.max(...byDistrict.map(([, c]) => c));
              return (
                <div key={district} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-16 flex-shrink-0">
                    D{district.toString().padStart(2, '0')}
                  </span>
                  <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full rounded bg-amber-500/70"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Routes */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Top 20 Routes by Camera Count
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {byRoute.map(([route, count]) => {
              const maxCount = byRoute[0]?.[1] ?? 1;
              return (
                <div key={route} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-14 flex-shrink-0">{route}</span>
                  <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full rounded bg-blue-500/70"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Cities */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Top 20 Cities by Camera Count
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {byCity.map(([city, count], i) => (
            <div key={city} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
              <span className="text-sm">
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                {city}
              </span>
              <span className="text-sm text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CurrentConditions({
  incidents,
  signs,
  alertCount,
}: {
  incidents: Incident[];
  signs: CMS[];
  alertCount: number;
}) {
  const activeSigns = signs.filter(
    (s) => s.inService && s.phase1Lines.some((l) => l.trim().length > 0),
  );

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Current Conditions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard value={incidents.length} label="Active Incidents" />
        <StatCard value={activeSigns.length} label="Active CMS Signs" />
        <StatCard value={alertCount} label="Weather Alerts" />
      </div>
    </section>
  );
}

function DistrictBreakdown({
  cameras,
  signs,
  incidents,
}: {
  cameras: Camera[];
  signs: CMS[];
  incidents: Incident[];
}) {
  const rows = useMemo(() => {
    const districtIds = Object.keys(DISTRICTS).map(Number).sort((a, b) => a - b);

    return districtIds.map((d) => {
      const dCameras = cameras.filter((c) => c.district === d);
      const dSigns = signs.filter((s) => s.district === d);
      const isPhotoOnly = PHOTO_ONLY_DISTRICTS.has(d);
      const liveCount = dCameras.filter((c) => c.hasVideo).length;
      const photoCount = dCameras.length - liveCount;

      // Incidents don't have a district field, so we skip per-district incident counts
      // unless we match by dispatch center (which is a string, not district number)
      return {
        district: d,
        name: DISTRICTS[d]?.description ?? `District ${d}`,
        cameras: dCameras.length,
        live: liveCount,
        photo: photoCount,
        signs: dSigns.length,
      };
    });
  }, [cameras, signs]);

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">District Breakdown</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border rounded-lg">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">District</th>
              <th className="px-3 py-2 text-right font-medium">Cameras</th>
              <th className="px-3 py-2 text-right font-medium">Live Video</th>
              <th className="px-3 py-2 text-right font-medium">Photo</th>
              <th className="px-3 py-2 text-right font-medium">CMS Signs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.district} className="border-b border-border">
                <td className="px-3 py-2 font-medium">
                  D{row.district.toString().padStart(2, '0')} — {row.name}
                </td>
                <td className="px-3 py-2 text-right">{row.cameras}</td>
                <td className="px-3 py-2 text-right text-green-500">{row.live}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{row.photo}</td>
                <td className="px-3 py-2 text-right">{row.signs}</td>
              </tr>
            ))}
            <tr className="bg-muted/30 font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right">{rows.reduce((s, r) => s + r.cameras, 0)}</td>
              <td className="px-3 py-2 text-right text-green-500">{rows.reduce((s, r) => s + r.live, 0)}</td>
              <td className="px-3 py-2 text-right text-muted-foreground">{rows.reduce((s, r) => s + r.photo, 0)}</td>
              <td className="px-3 py-2 text-right">{rows.reduce((s, r) => s + r.signs, 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CoverageStats({ cameras }: { cameras: Camera[] }) {
  const coverage = useMemo(() => {
    if (cameras.length === 0) return null;
    const lats = cameras.map((c) => c.latitude).filter((l) => l !== 0);
    const lons = cameras.map((c) => c.longitude).filter((l) => l !== 0);
    if (lats.length === 0 || lons.length === 0) return null;

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    // Rough area calculation (degrees to miles at CA latitude ~37)
    const latMiles = (maxLat - minLat) * 69;
    const lonMiles = (maxLon - minLon) * 69 * Math.cos((37 * Math.PI) / 180);

    return {
      minLat: minLat.toFixed(3),
      maxLat: maxLat.toFixed(3),
      minLon: minLon.toFixed(3),
      maxLon: maxLon.toFixed(3),
      latSpan: latMiles.toFixed(0),
      lonSpan: lonMiles.toFixed(0),
      area: (latMiles * lonMiles).toFixed(0),
    };
  }, [cameras]);

  if (!coverage) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Coverage Area</h2>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-lg font-bold">{coverage.latSpan} mi</p>
            <p className="text-xs text-muted-foreground">North-South Span</p>
          </div>
          <div>
            <p className="text-lg font-bold">{coverage.lonSpan} mi</p>
            <p className="text-xs text-muted-foreground">East-West Span</p>
          </div>
          <div>
            <p className="text-lg font-bold">{Number(coverage.area).toLocaleString()} mi<sup>2</sup></p>
            <p className="text-xs text-muted-foreground">Coverage Area</p>
          </div>
          <div>
            <p className="text-lg font-bold">
              {coverage.minLat} to {coverage.maxLat}
            </p>
            <p className="text-xs text-muted-foreground">Latitude Range</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StatsPage() {
  const { data: cameras = [], isLoading: camLoading } = useCameras(null);
  const { data: signs = [], isLoading: cmsLoading } = useCMS(null);
  const { data: incidents = [], isLoading: incLoading } = useIncidents();
  const { data: alerts = [], isLoading: alertsLoading } = useWeatherAlerts();

  const isLoading = camLoading || cmsLoading || incLoading || alertsLoading;
  const hasData = cameras.length > 0;

  if (isLoading && !hasData) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Network Stats</h1>
        <div className="flex items-center gap-3 text-muted-foreground">
          <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading camera network data (all 12 districts)...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Network Stats</h1>
        <p className="text-muted-foreground text-lg">
          Comprehensive statistics about California's traffic camera network and current conditions.
        </p>
      </div>

      <CameraNetworkStats cameras={cameras} />
      <CurrentConditions incidents={incidents} signs={signs} alertCount={alerts.length} />
      <DistrictBreakdown cameras={cameras} signs={signs} incidents={incidents} />
      <CoverageStats cameras={cameras} />

      <p className="text-xs text-muted-foreground pt-4 border-t border-border">
        Data refreshes automatically. Camera and sign data from Caltrans CWWP2, incidents from CHP, weather alerts from NWS.
      </p>
    </div>
  );
}
