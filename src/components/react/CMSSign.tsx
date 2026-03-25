interface CMSSignProps {
  phase1Lines: string[];
  phase2Lines: string[] | null;
  location: string;
  compact?: boolean;
}

export function CMSSign({ phase1Lines, phase2Lines, location, compact = false }: CMSSignProps) {
  const allBlank = phase1Lines.every((l) => !l.trim()) && (!phase2Lines || phase2Lines.every((l) => !l.trim()));
  if (allBlank) return null;

  if (compact) {
    const text = [...phase1Lines, ...(phase2Lines ?? [])].filter((l) => l.trim()).join(' / ');
    return (
      <div className="rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1">
        <p className="text-[10px] font-mono font-bold text-amber-400 truncate">{text}</p>
        <p className="text-[9px] text-muted-foreground truncate">{location}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="px-3 py-1.5 bg-zinc-800 border-b border-zinc-700 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
          <rect width="18" height="18" x="3" y="3" rx="2"/>
          <path d="M3 9h18"/>
        </svg>
        <span className="text-[10px] text-muted-foreground truncate">{location}</span>
      </div>
      <div className="px-4 py-3 bg-[#0a1a0a]">
        {phase1Lines.map((line, i) => (
          <div key={i} className="text-center text-sm font-mono font-bold tracking-wider text-amber-300 leading-relaxed">
            {line || '\u00A0'}
          </div>
        ))}
        {phase2Lines && phase2Lines.length > 0 && phase2Lines.some((l) => l.trim()) && (
          <>
            <div className="my-2 border-t border-green-900/50" />
            {phase2Lines.map((line, i) => (
              <div key={i} className="text-center text-sm font-mono font-bold tracking-wider text-amber-300 leading-relaxed">
                {line || '\u00A0'}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
