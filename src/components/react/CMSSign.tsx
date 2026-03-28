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
      <div className="max-w-[280px] mx-auto rounded border-2 border-amber-600/40 bg-[#0a0a0a] px-3 py-1.5">
        <p className="text-[10px] font-mono font-bold text-amber-400 text-center truncate" style={{ textShadow: '0 0 6px rgba(245, 158, 11, 0.4)' }}>{text}</p>
        <p className="text-[9px] text-amber-600/60 text-center truncate mt-0.5">{location}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[280px] mx-auto rounded-md border-2 border-amber-700/50 bg-[#0a0a0a] overflow-hidden shadow-md">
      <div className="px-3 py-2">
        {phase1Lines.map((line, i) => (
          <div key={i} className="text-center text-xs font-mono font-bold tracking-[0.15em] text-amber-400 leading-relaxed uppercase" style={{ textShadow: '0 0 6px rgba(245, 158, 11, 0.4)' }}>
            {line || '\u00A0'}
          </div>
        ))}
        {phase2Lines && phase2Lines.length > 0 && phase2Lines.some((l) => l.trim()) && (
          <>
            <div className="my-1.5 border-t border-amber-700/30" />
            {phase2Lines.map((line, i) => (
              <div key={i} className="text-center text-xs font-mono font-bold tracking-[0.15em] text-amber-400 leading-relaxed uppercase" style={{ textShadow: '0 0 6px rgba(245, 158, 11, 0.4)' }}>
                {line || '\u00A0'}
              </div>
            ))}
          </>
        )}
      </div>
      <div className="px-2 py-0.5 border-t border-amber-700/20">
        <p className="text-[8px] text-amber-700/60 text-center truncate font-mono">{location}</p>
      </div>
    </div>
  );
}
