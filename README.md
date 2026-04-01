<p align="center">
  <img src="https://img.shields.io/badge/status-live-brightgreen" alt="Live">
  <img src="https://img.shields.io/badge/hosting-Cloudflare%20Pages-F38020" alt="Cloudflare Pages">
  <img src="https://img.shields.io/badge/framework-Astro%20%2B%20React-BC52EE" alt="Astro + React">
  <img src="https://img.shields.io/badge/cameras-3%2C400%2B-blue" alt="3,400+ Cameras">
  <img src="https://img.shields.io/badge/data-Caltrans%20%7C%20CHP%20%7C%20NWS-orange" alt="Data Sources">
</p>

<h1 align="center">CalTraffic</h1>
<p align="center"><strong>Real-time California traffic cameras, incidents, and road conditions</strong></p>
<p align="center">
  <a href="https://caltraffic.com">caltraffic.com</a>
</p>

<p align="center">
  <img src="preview.png" alt="CalTraffic Preview" width="700">
</p>

---

## About

Web app for browsing 3,400+ live Caltrans traffic cameras across all 12 California districts. Includes route planning (shows cameras along your drive), CHP incident feeds, NWS weather alerts, a multi-camera Watch Room, and historical image playback. Astro + React frontend with Cloudflare Workers API endpoints handling caching, rate limiting, and circuit breaking.

## Features

### Camera Browsing
- 3,400+ live Caltrans cameras organized by district, route, and location
- Thumbnail grid with adjustable density
- Full-size camera view with HLS video streaming (hls.js)
- Historical image scrubber
- Favorites (localStorage)
- Search and filter by route, keyword, status, district

### Route Planning
- Enter FROM/TO to see every camera along your drive
- Cameras in driving order with distance markers
- Interactive Leaflet map with route and camera pins
- 30+ California city shortcuts

### Watch Room
- Monitor up to 6 camera feeds at once
- Layout presets (1-up, 2x2, 3x2)
- Auto-rotate cameras per slot on a timer
- Shareable URLs

### Incidents & Weather
- Real-time CHP incident feed with severity badges
- Incident map (filterable by type)
- NWS weather alert banners

### Other
- Featured/curated camera collections
- Stats page (camera counts, coverage, data freshness)
- District map selector
- CMS sign data
- Dark mode
- Mobile responsive

## Architecture

```
Browser (Astro + React)
  |
  |  SWR data fetching
  v
Cloudflare Workers (API Layer)
  |
  |  /api/cameras/[district]
  |  /api/incidents
  |  /api/rwis/[district]
  |
  |  Middleware: rate limiter, circuit breaker, cache, XML parser
  v
Caltrans CWWP2  |  CHP API  |  NWS API
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Astro](https://astro.build) with React islands |
| UI | React 18, [shadcn/ui](https://ui.shadcn.com), Tailwind CSS |
| State | [nanostores](https://github.com/nanostores/nanostores) |
| Data | [SWR](https://swr.vercel.app) |
| Maps | [Leaflet](https://leafletjs.com) + React Leaflet |
| Video | [hls.js](https://github.com/video-dev/hls.js) |
| API | Cloudflare Pages Functions |
| Validation | [Zod](https://zod.dev) |
| Styling | Tailwind + [CVA](https://cva.style) |
| Icons | [Lucide](https://lucide.dev) |
| Fonts | Geist Variable |
| Testing | Vitest + Testing Library + Playwright |
| Hosting | Cloudflare Pages |

## Project Structure

```
caltraffic.com/
  src/
    components/
      astro/          # Header, Footer
      react/          # 40+ components (CameraGrid, WatchRoom, RoutePlanner, etc.)
      ui/             # shadcn/ui primitives
    pages/            # Astro routes
    stores/           # Nanostores state
    lib/              # Shared utils
  functions/
    api/
      cameras/[district].ts
      incidents.ts
      rwis/[district].ts
    lib/
      cache.ts
      rate-limiter.ts
      circuit-breaker.ts
      xml-parser.ts
      fetch-upstream.ts
  public/             # Static assets
```

## Development

```bash
npm install
npm run dev          # http://localhost:4321
npm run build
npm test
npm run lint
```

## Deploy

```bash
npm run build
wrangler pages deploy dist/ --project-name=caltraffic
```

## Data Sources

| Source | Data | Refresh |
|--------|------|---------|
| Caltrans CWWP2 | Cameras, CMS signs, chain control, lane closures, RWIS, travel times | ~5 min |
| CHP | Live traffic incidents | Real-time |
| NWS | Weather alerts | As issued |

All public domain government data.
