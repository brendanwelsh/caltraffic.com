import { useState } from 'react';
import { useWeatherAlerts } from '@/hooks/use-weather';
import { cn } from '@/lib/utils';

export function WeatherAlertBanner() {
  const { data: alerts = [] } = useWeatherAlerts();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const activeAlerts = alerts
    .filter((a) => !dismissed.has(a.id))
    .filter((a) => a.severity === 'Extreme' || a.severity === 'Severe');

  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {activeAlerts.slice(0, 3).map((alert) => (
        <div
          key={alert.id}
          className={cn(
            'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
            alert.severity === 'Extreme'
              ? 'border-red-500/30 bg-red-500/10 text-red-200'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
          )}
        >
          <span className="mt-0.5 flex-shrink-0">
            {alert.severity === 'Extreme' ? '\uD83D\uDD34' : '\uD83D\uDFE1'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{alert.headline}</p>
            <p className="text-xs opacity-70 mt-0.5">
              {alert.event} — Expires: {new Date(alert.expires).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => setDismissed((prev) => new Set(prev).add(alert.id))}
            className="flex-shrink-0 rounded p-1 hover:bg-white/10 transition-colors"
            aria-label="Dismiss alert"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
}
