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
            <span className="text-xs text-muted-foreground">
              {selectedIndex + 1} of {images.length} captures ago
            </span>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
