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

function transformIncidents(xmlText: string) {
  const parsed = parseXML(xmlText);
  const chp = parsed as Record<string, unknown>;
  const centers = (chp.CHP as Record<string, unknown>)?.Center;
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
          const lat = parseFloat(String(logObj.Latitude ?? '0'));
          const lon = parseFloat(String(logObj.Longitude ?? '0'));
          if (lat === 0 && lon === 0) continue;

          const logDetails = (logObj.LogDetails as Record<string, unknown>)?.LogDetail;
          const detailArray = logDetails ? (Array.isArray(logDetails) ? logDetails : [logDetails]) : [];

          incidents.push({
            id: logObj.ID ?? `INC-${incidents.length}`,
            type: logObj.LogType ?? 'Unknown',
            location: logObj.Location ?? '',
            description: logObj.LogTypeDesc ?? logObj.LogType ?? '',
            latitude: lat,
            longitude: lon,
            severity: logObj.Severity ?? 'Unknown',
            dispatchCenter: centerObj.ID ?? dispatchObj.ID ?? '',
            logEntries: detailArray.map((d: unknown) => {
              const detail = d as Record<string, unknown>;
              return {
                time: detail.LogTime ?? '',
                text: detail.LogDetail ?? detail.DetailMessage ?? '',
              };
            }),
            timestamp: logObj.LogTime ?? new Date().toISOString(),
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
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'upstream_error', message: String(error) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
