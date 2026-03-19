import type { EventContext } from '@cloudflare/workers-types';
import { checkRateLimit, cleanupExpired } from '../lib/rate-limiter';
import { fetchUpstream } from '../lib/fetch-upstream';
import { parseXML } from '../lib/xml-parser';
import { CACHE_TTLS } from '../../src/lib/constants';

interface Env {
  CIRCUIT_BREAKER?: KVNamespace;
}

const CHP_FEED_URL = 'https://media.chp.ca.gov/sa_xml/sa.xml';

function transformIncidents(data: unknown) {
  const xmlText = data as string;
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
            id: logObj.ID ?? `INC-${Date.now()}-${Math.random()}`,
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

export const onRequest = async (context: EventContext<Env, string, Record<string, unknown>>) => {
  const ip = context.request.headers.get('cf-connecting-ip') ?? 'unknown';
  cleanupExpired();
  if (!checkRateLimit(ip).allowed) {
    return new Response(JSON.stringify({ error: 'rate_limit_exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await fetchUpstream(
      { url: CHP_FEED_URL, cacheKey: 'incidents', cacheTtl: CACHE_TTLS.incidents, circuitKey: 'incidents', kv: context.env.CIRCUIT_BREAKER },
      transformIncidents,
    );
    return new Response(JSON.stringify(result.data), {
      headers: { 'Content-Type': 'application/json', 'X-Cache-Status': result.fromCache ? 'HIT' : 'MISS' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'upstream_error' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
