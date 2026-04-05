export const prerender = false;

import type { APIRoute } from 'astro';

const ALLOWED_HOST = 'cwwp2.dot.ca.gov';
const ALLOWED_STREAM_HOST = 'wzmedia.dot.ca.gov';

export const GET: APIRoute = async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get('src');

  if (!src) {
    return new Response('Missing src parameter', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }

  if (parsed.hostname !== ALLOWED_HOST && parsed.hostname !== ALLOWED_STREAM_HOST) {
    return new Response('Host not allowed', { status: 403 });
  }

  try {
    const upstream = await fetch(src, {
      headers: { 'Accept': 'image/jpeg, image/png, image/*' },
    });

    if (!upstream.ok) {
      return new Response('Upstream error', {
        status: upstream.status,
        headers: { 'Cache-Control': 'public, max-age=10, s-maxage=15' },
      });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';

    // Don't proxy HTML error pages (Caltrans returns 200 + HTML on some failures)
    if (contentType.includes('text/html')) {
      return new Response('Upstream returned HTML (likely error)', {
        status: 502,
        headers: { 'Cache-Control': 'public, max-age=10, s-maxage=15' },
      });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=45, s-maxage=45',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('Fetch failed', {
      status: 502,
      headers: { 'Cache-Control': 'public, max-age=5' },
    });
  }
};
