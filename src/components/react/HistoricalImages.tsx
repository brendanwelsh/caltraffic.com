import { useState } from 'react';

interface HistoricalImagesProps {
  images: string[];
  cameraName: string;
}

export function HistoricalImages({ images, cameraName }: HistoricalImagesProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return <p className="text-sm text-muted-foreground">No historical images available.</p>;
  }

  return (
    <div>
      {selectedIndex !== null ? (
        <div className="space-y-2">
          <img
            src={images[selectedIndex]}
            alt={`${cameraName} - ${selectedIndex + 1} updates ago`}
            className="w-full rounded-lg"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedIndex((i) => Math.max(0, (i ?? 0) - 1))}
              disabled={selectedIndex === 0}
              className="rounded-md border border-input px-3 py-1 text-sm disabled:opacity-50 hover:bg-accent transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedIndex + 1} of {images.length}
              </span>
              <button
                onClick={() => setSelectedIndex(null)}
                className="rounded-md border border-input px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
              >
                Grid
              </button>
            </div>
            <button
              onClick={() => setSelectedIndex((i) => Math.min(images.length - 1, (i ?? 0) + 1))}
              disabled={selectedIndex === images.length - 1}
              className="rounded-md border border-input px-3 py-1 text-sm disabled:opacity-50 hover:bg-accent transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className={`grid gap-1.5 ${
          // Pick column count that divides evenly or minimizes orphans
          (() => {
            const n = images.length;
            if (n <= 4) return 'grid-cols-2';
            if (n % 4 === 0 || n >= 12) return 'grid-cols-4';
            if (n % 3 === 0) return 'grid-cols-3';
            if (n % 4 <= n % 3) return 'grid-cols-4';
            return 'grid-cols-3';
          })()
        }`}>
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className="aspect-video overflow-hidden rounded-md border border-border hover:border-primary/50 transition-colors"
            >
              <img
                src={url}
                alt={`${cameraName} - ${i + 1} updates ago`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
