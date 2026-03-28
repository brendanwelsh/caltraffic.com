import type { ChainControl, TravelTime } from '@/lib/schemas';

const CHAIN_TOOLTIP: Record<string, string> = {
  R1: 'Chain control R1 — Chains or snow tires required on drive wheels',
  R2: 'Chain control R2 — Chains required on ALL vehicles, no exceptions',
  R3: 'Chain control R3 — Highway closed to all traffic',
};

interface ConditionIconsProps {
  incidents?: { length: number }[];
  chainControls?: ChainControl[];
  travelTime?: TravelTime | null;
}

export function ConditionIcons({ incidents = [], chainControls = [], travelTime }: ConditionIconsProps) {
  const hasIncidents = incidents.length > 0;
  const hasChains = chainControls.length > 0;
  const hasDelay = travelTime && travelTime.delay > 2;

  if (!hasIncidents && !hasChains && !hasDelay) return null;

  return (
    <div className="flex items-center gap-1 shrink-0">
      {hasIncidents && (
        <div
          className="flex flex-col items-center gap-0.5 cursor-help"
          title={`${incidents.length} incident${incidents.length > 1 ? 's' : ''} nearby — crash, construction, or hazard`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="text-[8px] font-bold text-red-400">{incidents.length}</span>
        </div>
      )}
      {hasChains && (
        <div
          className="flex flex-col items-center gap-0.5 cursor-help"
          title={CHAIN_TOOLTIP[chainControls[0].level] || `Chain control: ${chainControls[0].level}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
          </svg>
          <span className="text-[8px] font-bold text-blue-400">{chainControls[0].level}</span>
        </div>
      )}
      {hasDelay && (
        <div
          className="flex flex-col items-center gap-0.5 cursor-help"
          title={`Travel time on ${travelTime!.corridor}: currently ${Math.round(travelTime!.currentTime)} min vs typical ${Math.round(travelTime!.typicalTime)} min. Delay: ${Math.round(travelTime!.delay)} min.`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <span className="text-[8px] font-bold text-amber-400">+{Math.round(travelTime!.delay)}m</span>
        </div>
      )}
    </div>
  );
}
