import type { ChainControl, LaneClosure, TravelTime } from '@/lib/schemas';

const CHAIN_LEVEL_DESC: Record<string, string> = {
  R1: 'R1 — Chains required on all vehicles without snow tires',
  R2: 'R2 — Chains required on all vehicles (no exceptions)',
  R3: 'R3 — Road closed to all traffic',
};

interface ConditionBadgesProps {
  chainControls: ChainControl[];
  closures: LaneClosure[];
  travelTime: TravelTime | null;
  compact?: boolean;
}

export function ConditionBadges({ chainControls, closures, travelTime, compact = true }: ConditionBadgesProps) {
  if (chainControls.length === 0 && closures.length === 0 && !travelTime) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {chainControls.length > 0 && (
        <span
          className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-blue-400 cursor-help"
          title={CHAIN_LEVEL_DESC[chainControls[0].level] || `Chain control level ${chainControls[0].level}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          {compact ? chainControls[0].level : `Chains: ${chainControls[0].level}`}
        </span>
      )}
      {closures.length > 0 && (
        <span
          className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-orange-400 cursor-help"
          title={`${closures.length} lane${closures.length > 1 ? 's' : ''} closed on this segment`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          {compact ? `${closures.length} closure${closures.length > 1 ? 's' : ''}` : `${closures.length} lane closure${closures.length > 1 ? 's' : ''}`}
        </span>
      )}
      {travelTime && (
        <span
          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold border cursor-help ${
            travelTime.delay > 10
              ? 'bg-red-500/15 border-red-500/30 text-red-400'
              : travelTime.delay > 5
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-green-500/15 border-green-500/30 text-green-400'
          }`}
          title={`Travel time on ${travelTime.corridor}: currently ${Math.round(travelTime.currentTime)} min vs typical ${Math.round(travelTime.typicalTime)} min. Delay: ${Math.round(travelTime.delay)} min.`}
        >
          {compact
            ? `${travelTime.delay > 0 ? '+' : ''}${Math.round(travelTime.delay)}m delay`
            : `${travelTime.corridor}: ${Math.round(travelTime.currentTime)}m (typical ${Math.round(travelTime.typicalTime)}m)`
          }
        </span>
      )}
    </div>
  );
}
