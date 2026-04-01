import { useStore } from '@nanostores/react';
import { featuredCategory, showDisabledFeatured } from '@/stores/filters';
import { CATEGORY_LABELS } from '@/lib/featured-cameras';

const ALL_CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'mountain-pass', label: 'Mountain Pass' },
  { key: 'scenic', label: 'Scenic' },
  { key: 'bottleneck', label: 'Bottleneck' },
  { key: 'landmark', label: 'Landmark' },
  { key: 'remote', label: 'Remote' },
];

export function FeaturedCategoryBar({ count }: { count: number }) {
  const category = useStore(featuredCategory);
  const showDisabled = useStore(showDisabledFeatured);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 mt-2" style={{ WebkitOverflowScrolling: 'touch' }}>
      {ALL_CATEGORIES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => featuredCategory.set(key)}
          className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors shrink-0 ${
            category === key
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:bg-accent'
          }`}
        >
          {label}
        </button>
      ))}

      <button
        onClick={() => showDisabledFeatured.set(!showDisabled)}
        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors shrink-0 ml-1 ${
          showDisabled
            ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
            : 'border-border text-muted-foreground hover:bg-accent'
        }`}
      >
        {showDisabled ? 'Showing Offline' : 'Show Offline'}
      </button>

      <span className="text-xs text-muted-foreground ml-auto shrink-0">{count} cameras</span>
    </div>
  );
}
