# caltraffic.com

Real-time California traffic cameras, incidents, and road conditions from Caltrans, CHP, and NWS.

**Live:** [caltraffic.com](https://caltraffic.com)

## Stack

- [Astro](https://astro.build) static site generator
- Hosted on [Cloudflare Pages](https://pages.cloudflare.com)

## Development

```bash
npm install
npm run dev
```

## Build & Deploy

```bash
npm run build
wrangler pages deploy dist/ --project-name=caltraffic
```

## Data Sources

- **Caltrans CWWP2** — CCTV cameras, CMS signs, chain control, lane closures, RWIS, travel times
- **CHP** — Live traffic incidents
- **NWS** — Weather alerts for California

## Notes

- DNS managed via Cloudflare (Zone ID: `0c7e94d5a3b8a1fb690bcfd91498bc4b`)
