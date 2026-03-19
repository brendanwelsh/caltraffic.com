interface CMSSignProps {
  phase1Lines: string[];
  phase2Lines: string[] | null;
  location: string;
}

export function CMSSign({ phase1Lines, phase2Lines, location }: CMSSignProps) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border-2 border-green-700 bg-green-950 px-4 py-3 font-mono">
        {phase1Lines.map((line, i) => (
          <div key={i} className="text-center text-sm font-bold tracking-wide text-amber-300">
            {line || '\u00A0'}
          </div>
        ))}
      </div>
      {phase2Lines && phase2Lines.length > 0 && (
        <div className="rounded-lg border-2 border-green-700 bg-green-950 px-4 py-3 font-mono">
          {phase2Lines.map((line, i) => (
            <div key={i} className="text-center text-sm font-bold tracking-wide text-amber-300">
              {line || '\u00A0'}
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground text-center">{location}</p>
    </div>
  );
}
