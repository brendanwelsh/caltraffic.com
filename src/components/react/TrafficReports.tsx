import { useMemo } from 'react';
import { useIncidents } from '@/hooks/use-incidents';
import { useWeatherAlerts } from '@/hooks/use-weather';
import { cn } from '@/lib/utils';
import type { Incident, WeatherAlert } from '@/lib/schemas';

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

function IncidentSummary({ incidents }: { incidents: Incident[] }) {
  const byType = useMemo(() => {
    const map = new Map<string, number>();
    for (const inc of incidents) {
      const type = inc.type || 'Unknown';
      map.set(type, (map.get(type) ?? 0) + 1);
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

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Active Incidents Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
            By Region / Dispatch Center
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
    </section>
  );
}

function WeatherAlertsSection({ alerts }: { alerts: WeatherAlert[] }) {
  if (alerts.length === 0) {
    return (
      <section>
        <h2 className="text-2xl font-semibold mb-4">Weather Alerts</h2>
        <p className="text-muted-foreground">No active weather alerts for California.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Weather Alerts ({alerts.length})</h2>
      <div className="space-y-3">
        {alerts.map((alert) => {
          const style = severityColors[alert.severity] ?? severityColors.Unknown;
          return (
            <div
              key={alert.id}
              className={cn(
                'rounded-xl border p-4',
                style.border,
                style.bg,
              )}
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
    </section>
  );
}

function RecentIncidents({ incidents }: { incidents: Incident[] }) {
  const recent = useMemo(() => {
    return [...incidents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }, [incidents]);

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Recent Incidents</h2>
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
  );
}

export function TrafficReports() {
  const { data: incidents = [], isLoading: incLoading } = useIncidents();
  const { data: alerts = [], isLoading: alertsLoading } = useWeatherAlerts();

  const isLoading = incLoading || alertsLoading;

  if (isLoading && incidents.length === 0 && alerts.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Traffic Reports</h1>
        <div className="flex items-center gap-3 text-muted-foreground">
          <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading live traffic data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Traffic Reports</h1>
        <p className="text-muted-foreground text-lg">
          Live statewide traffic conditions for California highways.
        </p>
      </div>

      {/* Statewide Overview */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Statewide Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-3xl font-bold">{incidents.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Active Incidents</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-3xl font-bold">{alerts.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Weather Alerts</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-3xl font-bold">
              {incidents.filter((i) => i.type.toLowerCase().includes('closure') || i.type.toLowerCase().includes('chain')).length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Closures / Chain Controls</p>
          </div>
        </div>
      </section>

      <IncidentSummary incidents={incidents} />
      <WeatherAlertsSection alerts={alerts} />
      <RecentIncidents incidents={incidents} />

      <p className="text-xs text-muted-foreground pt-4 border-t border-border">
        Data refreshes automatically. Incidents from CHP, weather alerts from the National Weather Service.
      </p>
    </div>
  );
}
