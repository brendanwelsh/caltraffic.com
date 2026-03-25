import { useState, useEffect } from 'react';

interface DataFreshnessProps {
  /** Total items loaded */
  count: number;
  /** Whether data is currently being fetched */
  isLoading?: boolean;
}

export function DataFreshness({ count, isLoading }: DataFreshnessProps) {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [elapsed, setElapsed] = useState('just now');

  // Update the "last refreshed" timestamp whenever the count changes
  useEffect(() => {
    if (count > 0) {
      setLastRefresh(new Date());
    }
  }, [count]);

  // Tick the elapsed time display
  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
      if (seconds < 10) setElapsed('just now');
      else if (seconds < 60) setElapsed(`${seconds}s ago`);
      else setElapsed(`${Math.floor(seconds / 60)}m ago`);
    }, 5000);
    return () => clearInterval(interval);
  }, [lastRefresh]);

  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full transition-colors ${isLoading ? 'bg-blue-400 animate-pulse' : 'bg-green-500'}`} />
      <span>
        {isLoading ? 'Refreshing...' : `Updated ${elapsed}`}
      </span>
    </div>
  );
}
