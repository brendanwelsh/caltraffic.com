import { useState, useMemo, lazy, Suspense } from 'react';
import { useIncidents } from '@/hooks/use-incidents';
import { useWeatherAlerts } from '@/hooks/use-weather';
import { useChainControl } from '@/hooks/use-chain-control';
import { useClosures } from '@/hooks/use-closures';
import { useTravelTimes } from '@/hooks/use-travel-times';
import { useCMS } from '@/hooks/use-cms';
import { cn } from '@/lib/utils';
import { DISTRICTS } from '@/lib/constants';
import type { Incident, WeatherAlert, ChainControl, LaneClosure, TravelTime, CMS } from '@/lib/schemas';

const IncidentMap = lazy(() => import('./IncidentMap').then((m) => ({ default: m.IncidentMap })));

type Tab = 'overview' | 'incidents' | 'conditions' | 'weather' | 'signs';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'conditions', label: 'Road Conditions' },
  { id: 'weather', label: 'Weather' },
  { id: 'signs', label: 'Highway Signs' },
];

const severityColors: Record<string, { bg: string; border: string; text: string }> = {
  Extreme: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  Severe: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  Moderate: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  Minor: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  Unknown: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400' },
};

const incidentSeverityColors: Record<string, string> = {
  '1': 'bg-red-500',
  '2': 'bg-orange-500',
  '3': 'bg-yellow-500',
  '4': 'bg-blue-500',
};

function StatCard({ value, label, accent }: { value: string | number; label: string; accent?: string }) {
  return (
    <div className={cn('rounded-xl border p-4 text-center', accent ?? 'border-border bg-card')}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Overview Tab ───

function OverviewTab({
  incidents,
  alerts,
  chainControls,
  closures,
  travelTimes,
  cmsSigns,
}: {
  incidents: Incident[];
  alerts: WeatherAlert[];
  chainControls: ChainControl[];
  closures: LaneClosure[];
  travelTimes: TravelTime[];
  cmsSigns: CMS[];
}) {
  const delayedCorridors = travelTimes.filter((t) => t.delay > 5);
  const activeSigns = cmsSigns.filter(
    (s) => s.inService && s.phase1Lines.some((l) => l.trim().length > 0),
  );

  const byArea = useMemo(() => {
    const areaMap: Record<string, string> = {
      SACC: 'Sacramento', SLAC: 'Sacramento', LACC: 'Los Angeles', LA: 'Los Angeles',
      OAKC: 'Bay Area', OAK: 'Bay Area', SJCC: 'Bay Area', SFCC: 'Bay Area',
      FRCC: 'Fresno', SDCC: 'San Diego', SD: 'San Diego', SBCC: 'San Bernardino',
      INCC: 'Inland Empire', STCC: 'Stockton', RDCC: 'Redding', EUCC: 'Eureka',
      SLCC: 'San Luis Obispo', BICC: 'Bishop',
    };
    const map = new Map<string, number>();
    for (const inc of incidents) {
      const area = areaMap[inc.dispatchCenter] || inc.dispatchCenter || 'Other';
      map.set(area, (map.get(area) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [incidents]);

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard value={incidents.length} label="Active Incidents" />
        <StatCard value={alerts.length} label="Weather Alerts" />
        <StatCard value={chainControls.length} label="Chain Controls" />
        <StatCard value={closures.length} label="Lane Closures" />
        <StatCard value={delayedCorridors.length} label="Delayed Corridors" />
        <StatCard value={activeSigns.length} label="Active Signs" />
      </div>

      {/* Incident Map */}
      {incidents.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Incident Map</h2>
          <Suspense fallback={<div className="h-[400px] animate-pulse rounded-xl bg-muted" />}>
            <IncidentMap incidents={incidents} />
          </Suspense>
        </section>
      )}

      {/* Incidents by Region */}
      {byArea.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Incidents by Region</h2>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="space-y-2">
              {byArea.slice(0, 10).map(([area, count]) => (
                <div key={area} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{area}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${(count / incidents.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Quick summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chain Controls Quick View */}
        {chainControls.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Active Chain Controls
            </h3>
            <div className="flex gap-4 mb-3">
              {(['R1', 'R2', 'R3'] as const).map((level) => {
                const count = chainControls.filter((c) => c.level === level).length;
                if (count === 0) return null;
                const colors = { R1: 'text-yellow-400', R2: 'text-orange-400', R3: 'text-red-400' };
                return (
                  <span key={level} className={cn('text-lg font-bold', colors[level])}>
                    {level}: {count}
                  </span>
                );
              })}
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {chainControls.slice(0, 8).map((cc) => (
                <div key={cc.id} className="flex items-center gap-2 text-sm">
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-xs font-bold',
                    cc.level === 'R3' ? 'bg-red-500/20 text-red-400' :
                    cc.level === 'R2' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400',
                  )}>{cc.level}</span>
                  <span className="truncate">{cc.route} — {cc.location}</span>
                </div>
              ))}
              {chainControls.length > 8 && (
                <p className="text-xs text-muted-foreground mt-1">+{chainControls.length - 8} more</p>
              )}
            </div>
          </section>
        )}

        {/* Travel Delays Quick View */}
        {delayedCorridors.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Travel Delays ({'>'}5 min)
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {delayedCorridors
                .sort((a, b) => b.delay - a.delay)
                .slice(0, 8)
                .map((tt) => (
                  <div key={tt.id} className="flex items-center justify-between text-sm">
                    <span className="truncate mr-2">{tt.corridor}</span>
                    <span className={cn(
                      'font-bold flex-shrink-0',
                      tt.delay > 15 ? 'text-red-400' : tt.delay > 10 ? 'text-orange-400' : 'text-yellow-400',
                    )}>
                      +{Math.round(tt.delay)} min
                    </span>
                  </div>
                ))}
              {delayedCorridors.length > 8 && (
                <p className="text-xs text-muted-foreground mt-1">+{delayedCorridors.length - 8} more</p>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Weather Alerts Quick View */}
      {alerts.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Active Weather Alerts</h2>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => {
              const style = severityColors[alert.severity] ?? severityColors.Unknown;
              return (
                <div key={alert.id} className={cn('rounded-lg border p-3', style.border, style.bg)}>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-semibold uppercase', style.text)}>
                      {alert.severity}
                    </span>
                    <span className="text-sm font-medium">{alert.event}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{alert.headline}</p>
                </div>
              );
            })}
            {alerts.length > 5 && (
              <p className="text-sm text-muted-foreground">+{alerts.length - 5} more alerts</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Incidents Tab ───

function IncidentsTab({ incidents }: { incidents: Incident[] }) {
  const byType = useMemo(() => {
    const map = new Map<string, number>();
    for (const inc of incidents) {
      map.set(inc.type || 'Unknown', (map.get(inc.type || 'Unknown') ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [incidents]);

  const byCenter = useMemo(() => {
    const map = new Map<string, number>();
    for (const inc of incidents) {
      const center = inc.dispatchCenter || 'Unknown';
      map.set(center, (map.get(center) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [incidents]);

  const recent = useMemo(() => {
    return [...incidents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
  }, [incidents]);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">CHP Incidents</span> — Reports from the California Highway Patrol Computer-Aided Dispatch (CAD) system. Includes collisions, hazards, road work, debris, and full closures. Severity 1 (red) is highest priority; 4 (blue) is lowest.
        </p>
      </div>

      {/* Incident Map */}
      {incidents.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Incident Map</h2>
          <Suspense fallback={<div className="h-[400px] animate-pulse rounded-xl bg-muted" />}>
            <IncidentMap incidents={incidents} />
          </Suspense>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Type */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            By Type ({incidents.length} total)
          </h3>
          {byType.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active incidents</p>
          ) : (
            <div className="space-y-2">
              {byType.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${(count / incidents.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Dispatch Center */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            By Dispatch Center
          </h3>
          {byCenter.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {byCenter.map(([center, count]) => (
                <div key={center} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{center}</span>
                  <span className="text-sm text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Incidents */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Recent Incidents</h2>
        {recent.length === 0 ? (
          <p className="text-muted-foreground">No recent incidents.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((inc) => (
              <div
                key={inc.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
              >
                <span
                  className={cn(
                    'mt-1.5 h-2 w-2 rounded-full flex-shrink-0',
                    incidentSeverityColors[inc.severity] ?? 'bg-yellow-500',
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      {inc.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(inc.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-tight">{inc.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{inc.location}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Road Conditions Tab ───

function ConditionsTab({
  chainControls,
  closures,
  travelTimes,
}: {
  chainControls: ChainControl[];
  closures: LaneClosure[];
  travelTimes: TravelTime[];
}) {
  const ccByLevel = useMemo(() => {
    const r1 = chainControls.filter((c) => c.level === 'R1');
    const r2 = chainControls.filter((c) => c.level === 'R2');
    const r3 = chainControls.filter((c) => c.level === 'R3');
    return { r1, r2, r3 };
  }, [chainControls]);

  const closuresByDistrict = useMemo(() => {
    const map = new Map<number, LaneClosure[]>();
    for (const c of closures) {
      const existing = map.get(c.district) ?? [];
      existing.push(c);
      map.set(c.district, existing);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [closures]);

  const sortedTravelTimes = useMemo(() => {
    return [...travelTimes].sort((a, b) => b.delay - a.delay);
  }, [travelTimes]);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-2 text-sm text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Chain Controls</span> — Caltrans road condition reports for mountain passes and winter routes.{' '}
          <span className="font-medium text-foreground">R1</span> = chains or snow tires required.{' '}
          <span className="font-medium text-foreground">R2</span> = chains required on all vehicles.{' '}
          <span className="font-medium text-foreground">R3</span> = highway closed.
        </p>
        <p>
          <span className="font-semibold text-foreground">Lane Closures</span> — Caltrans planned and active lane closures for construction and maintenance.
        </p>
        <p>
          <span className="font-semibold text-foreground">Travel Times</span> — Real-time corridor travel estimates from Caltrans sensors. Available for Sacramento, Inland Empire, San Diego, and Orange County.
        </p>
      </div>

      {/* Chain Controls */}
      <section>
        <h2 className="text-xl font-semibold mb-3">
          Chain Controls ({chainControls.length})
        </h2>
        {chainControls.length === 0 ? (
          <p className="text-muted-foreground">No active chain controls.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{ccByLevel.r1.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">R1 — Chains/Snow Tires</p>
              </div>
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-orange-400">{ccByLevel.r2.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">R2 — Chains Required</p>
              </div>
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{ccByLevel.r3.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">R3 — Road Closed</p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium">Level</th>
                      <th className="px-3 py-2 text-left font-medium">Route</th>
                      <th className="px-3 py-2 text-left font-medium">Location</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chainControls.map((cc) => (
                      <tr key={cc.id} className="border-b border-border/50">
                        <td className="px-3 py-2">
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs font-bold',
                            cc.level === 'R3' ? 'bg-red-500/20 text-red-400' :
                            cc.level === 'R2' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-yellow-500/20 text-yellow-400',
                          )}>{cc.level}</span>
                        </td>
                        <td className="px-3 py-2 font-medium">{cc.route}</td>
                        <td className="px-3 py-2">{cc.location}</td>
                        <td className="px-3 py-2 text-muted-foreground">{cc.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Lane Closures */}
      <section>
        <h2 className="text-xl font-semibold mb-3">
          Lane Closures ({closures.length})
        </h2>
        {closures.length === 0 ? (
          <p className="text-muted-foreground">No active lane closures.</p>
        ) : (
          <>
            {/* By district summary */}
            <div className="flex flex-wrap gap-2 mb-4">
              {closuresByDistrict.map(([district, items]) => (
                <span key={district} className="px-2.5 py-1 rounded-lg bg-muted text-xs font-medium">
                  D{district} — {DISTRICTS[district]?.description.split(' (')[0] ?? district}: {items.length}
                </span>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium">Route</th>
                      <th className="px-3 py-2 text-left font-medium">Location</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-left font-medium">Lanes</th>
                      <th className="px-3 py-2 text-left font-medium">Start</th>
                      <th className="px-3 py-2 text-left font-medium">End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closures.slice(0, 100).map((c) => (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="px-3 py-2 font-medium whitespace-nowrap">
                          {c.route} {c.direction}
                        </td>
                        <td className="px-3 py-2 max-w-xs truncate">{c.location}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{c.closureType}</td>
                        <td className="px-3 py-2 text-muted-foreground">{c.lanesAffected}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                          {c.startTime ? new Date(c.startTime).toLocaleString() : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                          {c.endTime ? new Date(c.endTime).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {closures.length > 100 && (
                  <p className="text-xs text-muted-foreground mt-2 px-3">
                    Showing 100 of {closures.length} closures.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Travel Times */}
      <section>
        <h2 className="text-xl font-semibold mb-3">
          Travel Times ({travelTimes.length} corridors)
        </h2>
        {travelTimes.length === 0 ? (
          <p className="text-muted-foreground">No travel time data available.</p>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium">Corridor</th>
                    <th className="px-3 py-2 text-right font-medium">Current</th>
                    <th className="px-3 py-2 text-right font-medium">Typical</th>
                    <th className="px-3 py-2 text-right font-medium">Delay</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTravelTimes.slice(0, 50).map((tt) => (
                    <tr key={tt.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-medium">{tt.corridor}</td>
                      <td className="px-3 py-2 text-right">{Math.round(tt.currentTime)} min</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{Math.round(tt.typicalTime)} min</td>
                      <td className="px-3 py-2 text-right">
                        {tt.delay > 0 ? (
                          <span className={cn(
                            'font-bold',
                            tt.delay > 15 ? 'text-red-400' : tt.delay > 5 ? 'text-orange-400' : 'text-yellow-400',
                          )}>
                            +{Math.round(tt.delay)} min
                          </span>
                        ) : (
                          <span className="text-green-400">On time</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Weather Tab ───

function WeatherTab({ alerts }: { alerts: WeatherAlert[] }) {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
        <p>
          Issued by the <span className="font-medium text-foreground">National Weather Service (NWS)</span> for conditions affecting California highways — winter storms, high wind, fog, flood watches, and more. Alerts expire automatically when the event ends.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['Extreme', 'Severe', 'Moderate', 'Minor'] as const).map((sev) => {
          const count = alerts.filter((a) => a.severity === sev).length;
          const style = severityColors[sev];
          return (
            <div key={sev} className={cn('rounded-xl border p-3 text-center', style.border, style.bg)}>
              <p className={cn('text-2xl font-bold', style.text)}>{count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sev}</p>
            </div>
          );
        })}
      </div>

      {alerts.length === 0 ? (
        <p className="text-muted-foreground">No active weather alerts for California.</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const style = severityColors[alert.severity] ?? severityColors.Unknown;
            return (
              <div
                key={alert.id}
                className={cn('rounded-xl border p-4', style.border, style.bg)}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <span className={cn('text-xs font-semibold uppercase tracking-wide', style.text)}>
                      {alert.severity} — {alert.event}
                    </span>
                    <h3 className="text-sm font-medium mt-1">{alert.headline}</h3>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Onset: {new Date(alert.onset).toLocaleString()}</span>
                  <span>Expires: {new Date(alert.expires).toLocaleString()}</span>
                </div>
                {alert.affectedAreas.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Areas: {alert.affectedAreas.join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Highway Signs Tab ───

function SignsTab({ signs }: { signs: CMS[] }) {
  const activeSigns = useMemo(() => {
    return signs
      .filter((s) => s.inService && s.phase1Lines.some((l) => l.trim().length > 0))
      .sort((a, b) => a.route.localeCompare(b.route) || a.postmile - b.postmile);
  }, [signs]);

  const byDistrict = useMemo(() => {
    const map = new Map<number, CMS[]>();
    for (const s of activeSigns) {
      const existing = map.get(s.district) ?? [];
      existing.push(s);
      map.set(s.district, existing);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [activeSigns]);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Changeable Message Signs (CMS)</span> — Electronic overhead highway signs displaying real-time travel times, incident alerts, speed advisories, and Amber alerts.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard value={signs.length} label="Total Signs" />
        <StatCard value={activeSigns.length} label="Active Messages" />
        <StatCard value={signs.length - activeSigns.length} label="Blank / Inactive" />
      </div>

      {activeSigns.length === 0 ? (
        <p className="text-muted-foreground">No active sign messages.</p>
      ) : (
        <div className="space-y-6">
          {byDistrict.map(([district, distSigns]) => (
            <section key={district}>
              <h3 className="text-lg font-semibold mb-2">
                D{district.toString().padStart(2, '0')} — {DISTRICTS[district]?.description ?? `District ${district}`} ({distSigns.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {distSigns.slice(0, 30).map((sign) => (
                  <div key={sign.id} className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground mb-1.5">
                      {sign.route} {sign.direction} — {sign.location}
                    </p>
                    <div className="font-mono text-xs bg-black/80 text-amber-400 rounded p-2 leading-relaxed">
                      {sign.phase1Lines.map((line, i) => (
                        <div key={i}>{line || '\u00A0'}</div>
                      ))}
                    </div>
                    {sign.phase2Lines && sign.phase2Lines.some((l) => l.trim()) && (
                      <div className="font-mono text-xs bg-black/80 text-amber-400 rounded p-2 mt-1 leading-relaxed">
                        {sign.phase2Lines.map((line, i) => (
                          <div key={i}>{line || '\u00A0'}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {distSigns.length > 30 && (
                  <p className="text-xs text-muted-foreground col-span-full">
                    +{distSigns.length - 30} more signs in this district
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

export function TrafficReports() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: incidents = [], isLoading: incLoading } = useIncidents();
  const { data: alerts = [], isLoading: alertsLoading } = useWeatherAlerts();
  const { data: chainControls = [], isLoading: ccLoading } = useChainControl(null);
  const { data: closures = [], isLoading: closuresLoading } = useClosures(null);
  const { data: travelTimes = [], isLoading: ttLoading } = useTravelTimes(null);
  const { data: cmsSigns = [], isLoading: cmsLoading } = useCMS(null);

  const isLoading = incLoading || alertsLoading || ccLoading || closuresLoading || ttLoading || cmsLoading;
  const hasAnyData = incidents.length > 0 || alerts.length > 0 || chainControls.length > 0 ||
    closures.length > 0 || travelTimes.length > 0 || cmsSigns.length > 0;

  if (isLoading && !hasAnyData) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Traffic Reports</h1>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Spinner />
          <span>Loading live traffic data from all sources...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Traffic Reports</h1>
        <p className="text-muted-foreground">
          Live statewide traffic conditions for California highways. All data refreshes automatically.
        </p>
      </div>

      {/* Tab Navigation */}
      <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-card border border-b-0 border-border text-foreground -mb-px'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            {tab.label}
            {tab.id === 'incidents' && incidents.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{incidents.length}</span>
            )}
            {tab.id === 'conditions' && (chainControls.length + closures.length) > 0 && (
              <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{chainControls.length + closures.length}</span>
            )}
            {tab.id === 'weather' && alerts.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{alerts.length}</span>
            )}
            {tab.id === 'signs' && cmsSigns.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">
                {cmsSigns.filter((s) => s.inService && s.phase1Lines.some((l) => l.trim())).length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          incidents={incidents}
          alerts={alerts}
          chainControls={chainControls}
          closures={closures}
          travelTimes={travelTimes}
          cmsSigns={cmsSigns}
        />
      )}
      {activeTab === 'incidents' && <IncidentsTab incidents={incidents} />}
      {activeTab === 'conditions' && (
        <ConditionsTab chainControls={chainControls} closures={closures} travelTimes={travelTimes} />
      )}
      {activeTab === 'weather' && <WeatherTab alerts={alerts} />}
      {activeTab === 'signs' && <SignsTab signs={cmsSigns} />}

      <p className="text-xs text-muted-foreground pt-4 border-t border-border">
        Incidents from CHP CAD. Chain controls, lane closures, travel times, and CMS signs from Caltrans CWWP2. Weather alerts from the National Weather Service.
      </p>
    </div>
  );
}
