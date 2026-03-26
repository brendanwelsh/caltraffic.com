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

// ─── Hero Section ───

function HeroSection({ cameras, coverageArea }: { cameras: Camera[]; coverageArea: string }) {
  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-amber-500/10 via-card to-blue-500/10 p-8 text-center">
      <h1 className="text-4xl font-bold mb-3">
        {cameras.length.toLocaleString()} cameras monitoring {coverageArea} sq mi of California highways
      </h1>
      <p className="text-muted-foreground text-lg">
        Real-time coverage across all 12 Caltrans districts.
      </p>
    </section>
  );
}

// ─── Right Now Section ───

function RightNowSection({
  incidents,
  cameras,
  signs,
}: {
  incidents: Incident[];
  cameras: Camera[];
  signs: CMS[];
}) {
  const liveFeeds = cameras.filter((c) => c.inService && !c.isStale).length;
  const activeSigns = signs.filter(
    (s) => s.inService && s.phase1Lines.some((l) => l.trim().length > 0),
  ).length;

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Right Now</h2>
      <p className="text-lg text-muted-foreground mb-4">
        {incidents.length} active incidents &middot; {liveFeeds.toLocaleString()} live feeds &middot; {activeSigns} active highway signs
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard value={incidents.length} label="Active Incidents" />
        <StatCard value={liveFeeds.toLocaleString()} label="Live Camera Feeds" />
        <StatCard value={activeSigns} label="Active CMS Signs" />
      </div>
    </section>
  );
}

// ─── Camera Health Section ───

function CameraHealthSection({ cameras }: { cameras: Camera[] }) {
  const health = useMemo(() => {
    const reporting = cameras.filter((c) => c.inService && !c.isStale);
    const down = cameras.filter((c) => !c.inService || c.isStale);

    const downByDistrict = new Map<number, { down: number; total: number }>();
    for (const cam of cameras) {
      const entry = downByDistrict.get(cam.district) ?? { down: 0, total: 0 };
      entry.total++;
      if (!cam.inService || cam.isStale) {
        entry.down++;
      }
      downByDistrict.set(cam.district, entry);
    }

    const districtRows = [...downByDistrict.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([district, { down: d, total }]) => ({
        district,
        name: DISTRICTS[district]?.description ?? `District ${district}`,
        down: d,
        total,
        uptime: total > 0 ? ((total - d) / total * 100).toFixed(1) : '100.0',
      }));

    return { reporting: reporting.length, down: down.length, districtRows };
  }, [cameras]);

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Camera Health</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{health.reporting.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Cameras currently reporting</p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{health.down.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Cameras down or stale</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Per-District Health
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium">District</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2 text-right font-medium">Down/Stale</th>
                <th className="px-3 py-2 text-right font-medium">Uptime</th>
              </tr>
            </thead>
            <tbody>
              {health.districtRows.map((row) => (
                <tr key={row.district} className="border-b border-border/50">
                  <td className="px-3 py-2 font-medium">
                    D{row.district.toString().padStart(2, '0')} — {row.name}
                  </td>
                  <td className="px-3 py-2 text-right">{row.total}</td>
                  <td className="px-3 py-2 text-right">
                    {row.down > 0 ? (
                      <span className="text-red-400">{row.down}</span>
                    ) : (
                      <span className="text-green-400">0</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={Number(row.uptime) < 90 ? 'text-red-400' : Number(row.uptime) < 98 ? 'text-yellow-400' : 'text-green-400'}>
                      {row.uptime}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── Busiest Routes Section ───

function BusiestRoutesSection({ incidents }: { incidents: Incident[] }) {
  const byRoute = useMemo(() => {
    const map = new Map<string, number>();
    for (const inc of incidents) {
      // Extract route from location text, e.g. "I-5 NB" or "SR-99 SB"
      const match = inc.location.match(/\b(I-?\d+|US-?\d+|SR-?\d+|CA-?\d+|Hwy\s*\d+)\b/i);
      const route = match ? match[1].replace(/^(I|US|SR|CA|Hwy)\s*-?\s*/i, (_, prefix) => prefix.toUpperCase() + '-') : 'Other';
      map.set(route, (map.get(route) ?? 0) + 1);
    }
    return [...map.entries()]
      .filter(([route]) => route !== 'Other')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [incidents]);

  if (byRoute.length === 0) return null;

  const maxCount = byRoute[0]?.[1] ?? 1;

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Busiest Routes</h2>
      <p className="text-sm text-muted-foreground mb-4">Top 5 routes with the most active incidents right now.</p>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="space-y-3">
          {byRoute.map(([route, count]) => (
            <div key={route} className="flex items-center gap-3">
              <span className="text-sm font-bold w-16 flex-shrink-0">{route}</span>
              <div className="flex-1 h-6 rounded bg-muted overflow-hidden">
                <div
                  className="h-full rounded bg-red-500/70 flex items-center justify-end pr-2"
                  style={{ width: `${Math.max((count / maxCount) * 100, 15)}%` }}
                >
                  <span className="text-xs font-semibold text-white">{count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Camera Density Section ───

function CameraDensitySection({ cameras }: { cameras: Camera[] }) {
  // Rough route mileage estimates for major CA highways
  const routeMiles: Record<string, number> = {
    'I-5': 797, 'I-10': 243, 'I-15': 287, 'I-40': 155, 'I-80': 208,
    'I-405': 73, 'I-580': 77, 'I-680': 71, 'I-880': 46, 'I-280': 57,
    'I-210': 86, 'I-110': 26, 'I-105': 18, 'US-101': 808, 'US-50': 328,
    'US-395': 557, 'SR-99': 425, 'SR-1': 656, 'SR-152': 78, 'SR-58': 183,
  };

  const density = useMemo(() => {
    const byRoute = new Map<string, number>();
    for (const cam of cameras) {
      const key = `${cam.routeType}-${cam.route}`;
      byRoute.set(key, (byRoute.get(key) ?? 0) + 1);
    }

    return Object.entries(routeMiles)
      .map(([route, miles]) => {
        const count = byRoute.get(route) ?? 0;
        if (count === 0) return null;
        return {
          route,
          cameras: count,
          miles,
          perMile: (count / miles).toFixed(2),
        };
      })
      .filter(Boolean)
      .sort((a, b) => Number(b!.perMile) - Number(a!.perMile))
      .slice(0, 10) as { route: string; cameras: number; miles: number; perMile: string }[];
  }, [cameras]);

  if (density.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Camera Density</h2>
      <p className="text-sm text-muted-foreground mb-4">Cameras per mile for major highways (estimated route lengths).</p>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium">Route</th>
                <th className="px-3 py-2 text-right font-medium">Cameras</th>
                <th className="px-3 py-2 text-right font-medium">Est. Miles</th>
                <th className="px-3 py-2 text-right font-medium">Cameras/Mile</th>
              </tr>
            </thead>
            <tbody>
              {density.map((row) => (
                <tr key={row.route} className="border-b border-border/50">
                  <td className="px-3 py-2 font-medium">{row.route}</td>
                  <td className="px-3 py-2 text-right">{row.cameras}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{row.miles}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-semibold">{row.perMile}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── District Breakdown (kept from before) ───

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

// ─── Coverage Stats (kept from before) ───

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

// ─── Main StatsPage ───

export function StatsPage() {
  const { data: cameras = [], isLoading: camLoading } = useCameras(null);
  const { data: signs = [], isLoading: cmsLoading } = useCMS(null);
  const { data: incidents = [], isLoading: incLoading } = useIncidents();
  const { data: alerts = [], isLoading: alertsLoading } = useWeatherAlerts();

  const isLoading = camLoading || cmsLoading || incLoading || alertsLoading;
  const hasData = cameras.length > 0;

  // Compute coverage area for the hero section
  const coverageArea = useMemo(() => {
    if (cameras.length === 0) return '0';
    const lats = cameras.map((c) => c.latitude).filter((l) => l !== 0);
    const lons = cameras.map((c) => c.longitude).filter((l) => l !== 0);
    if (lats.length === 0 || lons.length === 0) return '0';

    const latMiles = (Math.max(...lats) - Math.min(...lats)) * 69;
    const lonMiles = (Math.max(...lons) - Math.min(...lons)) * 69 * Math.cos((37 * Math.PI) / 180);
    return Math.round(latMiles * lonMiles).toLocaleString();
  }, [cameras]);

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
      {/* Hero */}
      <HeroSection cameras={cameras} coverageArea={coverageArea} />

      {/* Right Now */}
      <RightNowSection incidents={incidents} cameras={cameras} signs={signs} />

      {/* Camera Health */}
      <CameraHealthSection cameras={cameras} />

      {/* Busiest Routes */}
      <BusiestRoutesSection incidents={incidents} />

      {/* Camera Density */}
      <CameraDensitySection cameras={cameras} />

      {/* District Breakdown */}
      <DistrictBreakdown cameras={cameras} signs={signs} incidents={incidents} />

      {/* Coverage */}
      <CoverageStats cameras={cameras} />

      <p className="text-xs text-muted-foreground pt-4 border-t border-border">
        Data refreshes automatically. Camera and sign data from Caltrans CWWP2, incidents from CHP, weather alerts from NWS.
      </p>
    </div>
  );
}
