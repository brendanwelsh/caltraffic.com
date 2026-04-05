import { RouteShield } from './RouteShield';
import { cn } from '@/lib/utils';
import type { CMS } from '@/lib/schemas';

interface CMSCardProps {
  cms: CMS;
  onClick?: (cms: CMS) => void;
}

export function CMSCard({ cms, onClick }: CMSCardProps) {
  const allBlank = cms.phase1Lines.every((l) => !l.trim()) &&
    (!cms.phase2Lines || cms.phase2Lines.every((l) => !l.trim()));

  if (allBlank) return null;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-amber-500/20 bg-card transition-all hover:border-amber-500/40 hover:shadow-lg',
        onClick && 'cursor-pointer',
      )}
      onClick={() => onClick?.(cms)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(cms) : undefined}
    >
      {/* Sign display */}
      <div className="relative aspect-video bg-[#080808] flex items-center justify-center px-5 py-4">
        <div className="w-full space-y-1">
          {cms.phase1Lines.filter((l) => l.trim()).map((line, i) => (
            <p key={`p1-${i}`} className="text-center font-[sv170singlestroke,monospace] text-sm sm:text-base font-bold tracking-[0.15em] text-yellow-400 leading-relaxed">
              {line}
            </p>
          ))}
          {cms.phase2Lines && cms.phase2Lines.some((l) => l.trim()) && (
            <>
              <div className="my-1.5 border-t border-amber-800/30 mx-4" />
              {cms.phase2Lines.filter((l) => l.trim()).map((line, i) => (
                <p key={`p2-${i}`} className="text-center font-[sv170singlestroke,monospace] text-sm sm:text-base font-bold tracking-[0.15em] text-yellow-400 leading-relaxed">
                  {line}
                </p>
              ))}
            </>
          )}
        </div>

        {/* Subtle border glow like a real sign */}
        <div className="absolute inset-0 rounded-t-xl border border-amber-500/10 pointer-events-none" />
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <RouteShield route={cms.route} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight">
            {cms.location.replace(/_/g, ' ').replace(/^\d+ - /, '')}
          </p>
          <p className="truncate text-[10px] text-muted-foreground/80">
            {cms.direction && <span>{cms.direction}</span>}
            {cms.direction && cms.county && ' \u2022 '}
            {cms.county}
          </p>
        </div>
      </div>
    </div>
  );
}
