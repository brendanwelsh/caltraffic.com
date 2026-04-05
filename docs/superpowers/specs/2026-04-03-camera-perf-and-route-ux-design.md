# Camera Loading Performance & Route Planner UX

**Date:** 2026-04-03
**Status:** Draft

## Problem

1. **Camera feeds show black screens for 2-5 seconds on page load.** The `playAllLive` nanostore defaults to `true`, so every camera on a route immediately mounts an HLS.js player. Each player shows `bg-black` while waiting for the Caltrans HLS manifest + first segment + poster image. With 15-25 cameras per route, this creates dozens of concurrent HLS connections that compete for bandwidth and Caltrans server capacity.

2. **FROM/TO labels on the Route Planner are hard to distinguish.** They're 10px muted gray text inside the input, visually identical to placeholder text.

## Root Cause (Camera Loading)

Commit `086c852` changed `playAll` from local component state (`useState(false)`) to a global nanostore (`playAllLive = atom<boolean>(true)`). This means:

- **Before:** Cameras loaded as fast static JPEG snapshots. User opted into video via "Play All" button.
- **After:** Every camera immediately mounts `VideoPlayer` with HLS.js on page load, triggering concurrent manifest + segment fetches against slow Caltrans servers.

Additionally, `StableFeed` with `forcePlay=true` skips the IntersectionObserver entirely (line 44), so even off-screen cameras mount HLS streams.

## Design

### 1. Viewport-Aware Streaming with Image-First Loading

**Principle:** The static snapshot is the content. The live video stream is a progressive enhancement that replaces it.

#### Loading sequence per camera:

1. **Shimmer placeholder** — `animate-pulse bg-muted/30` while the snapshot image loads (matches existing `CameraCard` pattern)
2. **Static snapshot** — JPEG from `camera.imageUrl` loads (~100-200ms). This is what the user sees and it's a real, meaningful traffic image.
3. **Video upgrade** — When the camera is in or near the viewport, mount HLS.js behind the snapshot. Once the video is playing, crossfade from snapshot to live video (CSS `opacity` transition, ~300ms).
4. **Stream release** — When the camera scrolls out of the viewport (plus margin), destroy the HLS instance to free bandwidth and memory.

#### Key parameters:

- **Prefetch margin:** `rootMargin: '400px'` — start loading streams for cameras ~400px below the viewport so they're often ready by the time the user scrolls to them.
- **Release margin:** `rootMargin: '200px'` — keep streams alive for cameras slightly off-screen (user might scroll back) but release them once they're well out of view.
- **Max concurrent streams:** Cap at 4 active HLS instances. If a 5th enters the viewport, release the oldest one. This prevents bandwidth competition on slow connections.

#### Component changes:

**`StableFeed` (RouteLiveView.tsx):**
- Remove `forcePlay` bypass of IntersectionObserver
- Add a second observer (or modify existing) for viewport exit detection
- Always render `<img>` first, render `<video>` layered on top
- Add `onPlaying` callback to trigger crossfade
- Track active stream count via a shared ref/context

**`VideoPlayer` (VideoPlayer.tsx):**
- Add `onPlaying` callback prop — fires when video starts playing
- Keep `poster={imageUrl}` as backup, but the parent image handles the visual
- No changes to HLS.js config (timeouts are already aggressive)

**`playAllLive` store (filters.ts):**
- Keep default as `true` — Play All is the expected experience
- But now "Play All" means "stream cameras as they enter the viewport" rather than "mount all streams immediately"

### 2. FROM/TO Colored Pill Badges

Replace the plain text labels with colored pill badges inside each input:

- **FROM:** Green pill (`text-green-400 bg-green-500/10 border-green-500/30`) — matches the existing "selected" green border on the input
- **TO:** Blue pill (`text-blue-400 bg-blue-500/10 border-blue-500/30`) — contrasts with FROM, matches map destination marker conventions

**Component change:** `AutocompleteInput` in `RoutePlanner.tsx` — replace the `<span>` label with a styled pill. The label text stays the same ("FROM" / "TO"), just with color-coded background and border.

#### Label styling:
```
font-size: 9px
font-weight: 700
letter-spacing: 0.5px
padding: 2px 6px
border-radius: 4px
```

Input `padding-left` increases from `pl-12` to `pl-14` to accommodate the slightly wider pill.

## Out of Scope

- Route progress bar (potential future enhancement on top of viewport streaming)
- Changing the HLS.js configuration or timeouts
- Caltrans API caching or proxying (the bottleneck is their servers, not ours)
- Changing the camera grid view (this design focuses on the RouteLiveView list)

## Success Criteria

- No black screens on route page load — shimmer → snapshot → video
- Max 4 concurrent HLS streams regardless of route length
- Streams release when scrolled past, restart when scrolled back
- FROM/TO labels immediately distinguishable at a glance
- No regression in camera detail dialog or Watch Room video playback
