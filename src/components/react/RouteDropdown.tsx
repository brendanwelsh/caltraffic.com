import { useState, useEffect, useRef } from 'react';
import { RouteShield } from './RouteShield';
import { cn } from '@/lib/utils';

interface RouteDropdownProps {
  routes: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}

/**
 * Custom dropdown that renders route shield icons as the primary identifier.
 * People recognize the shield shape + color, not "I-80" vs "SR-1".
 */
export function RouteDropdown({ routes, value, onChange }: RouteDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 rounded-md border px-2 pr-5 text-[11px] font-medium transition-colors',
          value ? 'border-primary/40 bg-primary/10 text-primary' : 'border-input bg-background text-muted-foreground hover:bg-accent',
        )}
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 4px center',
        }}
      >
        {value ? (
          <>
            <RouteShield route={value} size="md" />
          </>
        ) : (
          <>
            {/* Highway icon when no route selected */}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 19V5"/><path d="M18 19V5"/><path d="M6 13h12"/><path d="M6 5c3 0 3 2 6 2s3-2 6-2"/><path d="M6 19c3 0 3-2 6-2s3 2 6 2"/>
            </svg>
            Route
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-52 max-h-72 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors',
              !value && 'bg-accent font-semibold',
            )}
          >
            All Routes
          </button>
          {routes.map((r) => (
            <button
              key={r}
              onClick={() => { onChange(r); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-1.5 text-xs hover:bg-accent transition-colors border-t border-border/20',
                value === r && 'bg-accent font-semibold',
              )}
            >
              <RouteShield route={r} size="md" />
              <span className="text-muted-foreground">{r}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
