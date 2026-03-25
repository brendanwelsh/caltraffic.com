import { cn } from '@/lib/utils';
import type { Incident } from '@/lib/schemas';

interface IncidentCardProps {
  incident: Incident;
}

const severityColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  '1': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-500' },
  '2': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-500' },
  '3': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  '4': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-500' },
};

function getSeverityStyle(severity: string) {
  return severityColors[severity] ?? severityColors['3'];
}

export function IncidentCard({ incident }: IncidentCardProps) {
  const style = getSeverityStyle(incident.severity);

  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg',
      style.border,
    )}>
      {/* Incident type header */}
      <div className={cn('px-3 py-2.5', style.bg)}>
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={style.text}>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <path d="M12 9v4"/><path d="M12 17h.01"/>
          </svg>
          <span className={cn('text-xs font-semibold uppercase tracking-wide', style.text)}>
            {incident.type}
          </span>
          <span className={cn('ml-auto inline-flex h-1.5 w-1.5 rounded-full', style.dot)} />
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5 space-y-2">
        <p className="text-sm font-medium leading-tight">{incident.description}</p>
        <p className="text-xs text-muted-foreground">{incident.location}</p>

        {/* Latest log entries */}
        {incident.logEntries.length > 0 && (
          <div className="space-y-1 border-t border-border pt-2">
            {incident.logEntries.slice(0, 3).map((entry, i) => (
              <p key={i} className="text-[11px] text-muted-foreground leading-snug">
                <span className="font-medium">{entry.time}</span> — {entry.text}
              </p>
            ))}
            {incident.logEntries.length > 3 && (
              <p className="text-[10px] text-muted-foreground/60">
                +{incident.logEntries.length - 3} more entries
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
