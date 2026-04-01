# CLAUDE.md

## caltraffic.com

California traffic camera viewer. Built with Astro + React. Deployed as a Cloudflare Worker.

## Development

```bash
npm install
npm run dev        # Local dev server
npm run build      # Build to dist/
```

## Deploy

The site is a Cloudflare **Worker** (not Pages). The Astro Cloudflare adapter generates `dist/server/wrangler.json` which needs patching before deploy:

```bash
npm run build && python3 -c "
import json
with open('dist/server/wrangler.json') as f:
    data = json.load(f)
data['name'] = 'caltraffic'
for key in ['pages_build_output_dir', 'images']:
    data.pop(key, None)
data['kv_namespaces'] = [ns for ns in data.get('kv_namespaces', []) if ns.get('id')]
with open('dist/server/wrangler.json', 'w') as f:
    json.dump(data, f)
" && npx wrangler deploy --config dist/server/wrangler.json
```

## Part of ~/Projects/prod/ — see parent CLAUDE.md for full project layout.
