# Camera Loading Performance & Route UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate black screens on camera load by showing static snapshots first and only streaming video for visible cameras; make FROM/TO labels visually distinct with colored pill badges.

**Architecture:** Refactor `StableFeed` to always render an `<img>` layer, mount/unmount `VideoPlayer` based on viewport visibility with a max concurrent stream cap of 4. Add `onPlaying` callback to `VideoPlayer` for crossfade. Style FROM/TO labels as colored pills in `AutocompleteInput`.

**Tech Stack:** React, HLS.js, IntersectionObserver, Tailwind CSS, nanostores

---

### Task 1: Add `onPlaying` callback to VideoPlayer

**Files:**
- Modify: `src/components/react/VideoPlayer.tsx`

- [ ] **Step 1: Add `onPlaying` prop to VideoPlayer interface and wire it up**

```tsx
// In VideoPlayerProps interface, add:
onPlaying?: () => void;

// In the component signature:
export function VideoPlayer({ streamUrl, imageUrl, cameraName, hideControls, onPlaying }: VideoPlayerProps) {

// In the HLS MANIFEST_PARSED callback (line 43), after setIsPlaying(true):
video.play().then(() => { setIsPlaying(true); onPlaying?.(); clearTimeout(fallbackTimer); }).catch(() => setError(true));

// In the Safari native HLS path (line 56), same pattern:
video.play().then(() => { setIsPlaying(true); onPlaying?.(); clearTimeout(fallbackTimer); }).catch(() => setError(true));
```

- [ ] **Step 2: Verify dev server still starts**

Run: `npm run dev`
Expected: No TypeScript errors, site loads normally. Existing VideoPlayer consumers (FeaturedCameras, CameraGrid, CameraDetailDialog) don't pass `onPlaying` so they're unaffected.

- [ ] **Step 3: Commit**

```bash
git add src/components/react/VideoPlayer.tsx
git commit -m "feat: add onPlaying callback to VideoPlayer"
```

---

### Task 2: Rewrite StableFeed for viewport-aware streaming with image-first

**Files:**
- Modify: `src/components/react/RouteLiveView.tsx` (lines 38-67, the `StableFeed` component)

This is the core change. `StableFeed` currently mounts VideoPlayer and never unmounts it. The new version:
1. Always renders the static `<img>` as the base layer
2. Mounts `VideoPlayer` only when in/near viewport (400px margin)
3. Unmounts `VideoPlayer` when scrolled far away (600px margin)
4. Crossfades from image to video via CSS opacity when video starts playing
5. Respects a max concurrent stream cap of 4

- [ ] **Step 1: Replace StableFeed with viewport-aware version**

Replace the entire `StableFeed` function (lines 38-67 of RouteLiveView.tsx) with:

```tsx
/** Max concurrent HLS streams — prevents bandwidth competition */
const MAX_STREAMS = 4;
const activeStreams = { count: 0 };

/** Show static image immediately, mount video only when in viewport, unmount when scrolled away. */
function StableFeed({ camera, onClick, forcePlay }: { camera: RouteCamera; onClick?: () => void; forcePlay?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inViewport, setInViewport] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const streamSlotRef = useRef(false);

  // Viewport enter/exit observer
  useEffect(() => {
    if (!forcePlay || !camera.streamUrl) return;
    if (!ref.current) return;

    const enterObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !streamSlotRef.current && activeStreams.count < MAX_STREAMS) {
          streamSlotRef.current = true;
          activeStreams.count++;
          setInViewport(true);
        }
      },
      { rootMargin: '400px' },
    );

    const exitObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && streamSlotRef.current) {
          streamSlotRef.current = false;
          activeStreams.count--;
          setInViewport(false);
          setVideoPlaying(false);
        }
      },
      { rootMargin: '600px' },
    );

    enterObserver.observe(ref.current);
    exitObserver.observe(ref.current);

    return () => {
      enterObserver.disconnect();
      exitObserver.disconnect();
      if (streamSlotRef.current) {
        streamSlotRef.current = false;
        activeStreams.count--;
      }
    };
  }, [forcePlay, camera.streamUrl]);

  // When Play All is off but camera has a stream, still use viewport observer for on-demand play
  useEffect(() => {
    if (forcePlay || !camera.streamUrl) return;
    // No video — just show static image
    setInViewport(false);
    setVideoPlaying(false);
  }, [forcePlay, camera.streamUrl]);

  const showVideo = forcePlay && inViewport && camera.streamUrl;

  return (
    <div ref={ref} onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }} className={`h-full relative ${onClick ? 'cursor-pointer' : ''}`}>
      {/* Base layer: static snapshot — always rendered */}
      <img
        src={camera.imageUrl}
        alt={camera.location}
        className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
      />
      {/* Shimmer while image loads */}
      {!imgLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted/30" />
      )}
      {/* Video layer: mounted/unmounted based on viewport */}
      {showVideo && (
        <div className={`absolute inset-0 transition-opacity duration-300 ${videoPlaying ? 'opacity-100' : 'opacity-0'}`}>
          <VideoPlayer
            streamUrl={camera.streamUrl}
            imageUrl={camera.imageUrl}
            cameraName={camera.location}
            hideControls
            onPlaying={() => setVideoPlaying(true)}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Remove the old `bg-black` wrapper divs**

The old StableFeed wrapped content in `<div className="h-full overflow-hidden bg-black">`. The new version uses `relative` positioning with layers instead. Verify no other code references the old StableFeed structure.

- [ ] **Step 3: Test in dev server**

Run: `npm run dev`
Test: 
1. Navigate to a route (e.g., Sacramento to LA)
2. With Play All on: cameras should show shimmer → snapshot → live video fades in
3. Scroll down: new cameras start streaming, old ones release
4. Scroll back up: streams restart for visible cameras
5. With Play All off: all cameras show static snapshots only

- [ ] **Step 4: Commit**

```bash
git add src/components/react/RouteLiveView.tsx
git commit -m "feat: viewport-aware streaming with image-first loading in StableFeed"
```

---

### Task 3: FROM/TO colored pill badges

**Files:**
- Modify: `src/components/react/RoutePlanner.tsx` (lines 84-136, the `AutocompleteInput` component)

- [ ] **Step 1: Add `color` prop to AutocompleteInput and update label styling**

Change the `AutocompleteInput` function signature and label span. The component is at line 84 of RoutePlanner.tsx.

Replace the current label `<span>` (line 92):
```tsx
<span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground z-10">{label}</span>
```

With a color-aware pill based on the label prop:
```tsx
<span className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 text-[9px] font-bold tracking-wide rounded px-1.5 py-0.5 border ${
  label === 'FROM'
    ? 'text-green-400 bg-green-500/10 border-green-500/30'
    : 'text-blue-400 bg-blue-500/10 border-blue-500/30'
}`}>{label}</span>
```

Also update the input's left padding from `pl-12` to `pl-14` to accommodate the wider pill:
```tsx
className={`h-9 w-full rounded-lg border bg-background pl-14 pr-8 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
  ac.selected ? 'border-green-500/50' : 'border-input'
}`}
```

- [ ] **Step 2: Test in dev server**

Run: `npm run dev`
Test: Navigate to the home page (Route Planner). Verify:
1. FROM label is a green pill with tinted background
2. TO label is a blue pill with tinted background
3. Labels are clearly visible and distinguishable
4. Input text doesn't overlap the pill
5. Autocomplete dropdown still works
6. Green border still appears when a location is selected

- [ ] **Step 3: Commit**

```bash
git add src/components/react/RoutePlanner.tsx
git commit -m "feat: colored pill badges for FROM/TO labels on Route Planner"
```

---

### Task 4: Build verification

**Files:** None (verification only)

- [ ] **Step 1: Run production build**

Run: `npm run build`
Expected: Clean build with no TypeScript errors.

- [ ] **Step 2: Commit if build required any fixes**

Only if Step 1 revealed issues that needed fixing.
