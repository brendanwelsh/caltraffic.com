export const prerender = false;

import type { APIRoute } from 'astro';

const CHP_FEED_URL = 'https://media.chp.ca.gov/sa_xml/sa.xml';

function parseXML(xml: string): Record<string, unknown> {
  xml = xml.replace(/<\?xml[^?]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  return parseElement(xml);
}

function parseElement(xml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const tagRegex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g;
  let match;

  while ((match = tagRegex.exec(xml)) !== null) {
    const [, tagName, , content] = match;
    if (/<\w+[^>]*>/.test(content)) {
      const parsed = parseElement(content);
      if (result[tagName]) {
        if (Array.isArray(result[tagName])) {
          (result[tagName] as unknown[]).push(parsed);
        } else {
          result[tagName] = [result[tagName], parsed];
        }
      } else {
        result[tagName] = parsed;
      }
    } else {
      if (result[tagName]) {
        if (Array.isArray(result[tagName])) {
          (result[tagName] as string[]).push(content.trim());
        } else {
          result[tagName] = [result[tagName] as string, content.trim()];
        }
      } else {
        result[tagName] = content.trim();
      }
    }
  }
  return result;
}

function stripQuotes(s: unknown): string {
  return String(s ?? '').replace(/^"|"$/g, '').trim();
}

function parseLatLon(latlon: unknown): { lat: number; lon: number } {
  const s = stripQuotes(latlon);
  const parts = s.split(':');
  if (parts.length !== 2) return { lat: 0, lon: 0 };
  // CHP format: "38872075:121127759" → 38.872075, -121.127759
  const lat = parseFloat(parts[0]) / 1000000;
  const lon = -parseFloat(parts[1]) / 1000000; // West longitude is negative
  return { lat: isNaN(lat) ? 0 : lat, lon: isNaN(lon) ? 0 : lon };
}

function transformIncidents(xmlText: string) {
  const parsed = parseXML(xmlText);
  const root = parsed as Record<string, unknown>;
  // Try both <State><Center> and <CHP><Center> structures
  const state = (root.State ?? root.CHP ?? root) as Record<string, unknown>;
  const centers = state.Center;
  if (!centers) return [];

  const centerArray = Array.isArray(centers) ? centers : [centers];
  const incidents: unknown[] = [];

  for (const center of centerArray) {
    const centerObj = center as Record<string, unknown>;
    const dispatches = centerObj.Dispatch;
    if (!dispatches) continue;
    const dispatchArray = Array.isArray(dispatches) ? dispatches : [dispatches];

    for (const dispatch of dispatchArray) {
      const dispatchObj = dispatch as Record<string, unknown>;
      const logs = dispatchObj.Log;
      if (!logs) continue;
      const logArray = Array.isArray(logs) ? logs : [logs];

      for (const log of logArray) {
        try {
          const logObj = log as Record<string, unknown>;
          const { lat, lon } = parseLatLon(logObj.LATLON);
          if (lat === 0 && lon === 0) continue;

          // Parse log details — CHP uses <details> and <units> inside <LogDetails>
          const logDetailsObj = logObj.LogDetails as Record<string, unknown> | undefined;
          const details = logDetailsObj?.details;
          const detailArray = details ? (Array.isArray(details) ? details : [details]) : [];

          incidents.push({
            id: stripQuotes(logObj.ID) || `INC-${incidents.length}`,
            type: stripQuotes(logObj.LogType).replace(/^"\d+-/, '').replace(/"$/, '') || 'Unknown',
            location: stripQuotes(logObj.Location),
            description: stripQuotes(logObj.LocationDesc || logObj.LogType),
            latitude: lat,
            longitude: lon,
            severity: stripQuotes(logObj.Severity) || 'Unknown',
            dispatchCenter: stripQuotes(centerObj.ID) || stripQuotes(dispatchObj.ID) || '',
            logEntries: detailArray.map((d: unknown) => {
              const detail = d as Record<string, unknown>;
              return {
                time: stripQuotes(detail.DetailTime),
                text: stripQuotes(detail.IncidentDetail),
              };
            }).filter((e: any) => e.text),
            timestamp: stripQuotes(logObj.LogTime) || new Date().toISOString(),
          });
        } catch {
          continue;
        }
      }
    }
  }
  return incidents;
}

export const GET: APIRoute = async () => {
  try {
    const res = await fetch(CHP_FEED_URL);
    if (!res.ok) throw new Error(`CHP feed returned ${res.status}`);
    const xmlText = await res.text();
    const incidents = transformIncidents(xmlText);
    return new Response(JSON.stringify(incidents), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30, s-maxage=60' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'upstream_error', message: String(error) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=10, s-maxage=15' },
    });
  }
};
