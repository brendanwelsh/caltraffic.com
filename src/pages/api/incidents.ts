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

// ─── CHP code → human-readable translations ───

/** CHP incident type codes to plain English */
const INCIDENT_TYPE_MAP: Record<string, string> = {
  '1179': 'Accident — Injuries',
  '1180': 'Accident — Major Injuries',
  '1181': 'Accident — Fatal',
  '1182': 'Accident — No Injuries',
  '1183': 'Accident — Unknown Injuries',
  '20001': 'Accident — Hit & Run, No Injuries',
  '20002': 'Accident — Hit & Run, Injuries',
  '1125': 'Traffic Hazard',
  '1126': 'Disabled Vehicle',
  '1188': 'Traffic Collision, No Details',
  '1134': 'Fire — Vehicle',
  '1141': 'Ambulance Requested',
  '1174': 'Road Rage / Aggressive Driver',
  'SigAlert': 'SigAlert — Major Freeway Closure',
  '1166': 'Defective Traffic Signal',
  '1178': 'Road Debris / Hazard on Roadway',
  '1186': 'Reckless Driver',
  '1187': 'Flooding on Roadway',
  '1144': 'Possible Fatality',
  '1139': 'Animal on Roadway',
  '1194': 'Suspect Evading',
  '1196': 'Pedestrian on Freeway',
  '1197': 'Bicycle on Freeway',
  '2255': 'Roadwork / Construction',
  '1175': 'Building/Structure Fire',
  '1176': 'Brush / Vegetation Fire',
  '1140': 'Overturned Vehicle',
  '1171': 'Oil Spill on Roadway',
};

/** CHP radio/log codes to plain English */
const LOG_CODE_MAP: Record<string, string> = {
  '1039': 'Status update',
  '1039-A': 'Ambulance responding',
  '1097': 'Arrived at scene',
  '1098': 'Finished assignment',
  '1022': 'Cancelled',
  '10-22': 'Cancelled',
  '1023': 'Standby',
  '1029': 'Direct contact made',
  '10-97': 'Arrived at scene',
  '1185': 'Tow truck requested',
  'Coroner-Rq': 'Coroner requested',
  'Med-Rq': 'Medical aid requested',
  'Ambu-Rq': 'Ambulance requested',
};

/**
 * Translate a CHP log type like "1182- Tc, No Injuries" into clean English.
 * Falls back to a cleaned-up version of the raw string.
 */
function translateType(raw: string): string {
  // Strip leading/trailing quotes and whitespace
  const cleaned = raw.replace(/^["'\s]+|["'\s]+$/g, '');

  // Try matching the numeric code prefix
  const codeMatch = cleaned.match(/^(\d+|SigAlert)/i);
  if (codeMatch) {
    const code = codeMatch[1];
    const mapped = INCIDENT_TYPE_MAP[code];
    if (mapped) return mapped;
  }

  // Fallback: remove numeric prefix and dash, title-case the rest
  return cleaned
    .replace(/^\d+\s*-?\s*/, '')
    .replace(/\b(Tc|tc)\b/g, 'Traffic Collision')
    .replace(/\bNb\b/gi, 'Northbound')
    .replace(/\bSb\b/gi, 'Southbound')
    .replace(/\bEb\b/gi, 'Eastbound')
    .replace(/\bWb\b/gi, 'Westbound')
    .replace(/\bJno\b/gi, 'Just North of')
    .replace(/\bJso\b/gi, 'Just South of')
    .replace(/\bJeo\b/gi, 'Just East of')
    .replace(/\bJwo\b/gi, 'Just West of')
    .replace(/\bOfr\b/gi, 'Off-ramp')
    .replace(/\bOnr\b/gi, 'On-ramp')
    .replace(/\bBlk\b/gi, 'Block')
    .replace(/\bVeh\b/gi, 'Vehicle')
    .replace(/\bRt\b/gi, 'Right')
    .replace(/\bLt\b/gi, 'Left')
    .replace(/\bLn\b/gi, 'Lane')
    .replace(/\bShld?r\b/gi, 'Shoulder')
    .replace(/\bFwy\b/gi, 'Freeway')
    .replace(/\bRd\b/gi, 'Road')
    .replace(/\bBlvd\b/gi, 'Boulevard')
    .replace(/\bAve\b/gi, 'Avenue')
    .replace(/\bSt\b/gi, 'Street')
    .replace(/\bDr\b/gi, 'Drive')
    .trim() || 'Unknown Incident';
}

/** Translate CHP log entry abbreviations into readable English */
function translateLogEntry(text: string): string {
  let result = text;

  // Replace known codes
  for (const [code, meaning] of Object.entries(LOG_CODE_MAP)) {
    result = result.replace(new RegExp(`\\b${code.replace(/-/g, '\\-')}\\b`, 'gi'), meaning);
  }

  // Common CHP abbreviations in log text
  result = result
    .replace(/\bVeh\b/gi, 'Vehicle')
    .replace(/\bNb\b/gi, 'Northbound')
    .replace(/\bSb\b/gi, 'Southbound')
    .replace(/\bEb\b/gi, 'Eastbound')
    .replace(/\bWb\b/gi, 'Westbound')
    .replace(/\bJno\b/gi, 'Just north of')
    .replace(/\bJso\b/gi, 'Just south of')
    .replace(/\bJeo\b/gi, 'Just east of')
    .replace(/\bJwo\b/gi, 'Just west of')
    .replace(/\bOfr\b/gi, 'Off-ramp')
    .replace(/\bOnr\b/gi, 'On-ramp')
    .replace(/\bBlk\b/gi, 'Block')
    .replace(/\bLn\b/gi, 'Lane')
    .replace(/\bShld?r\b/gi, 'Shoulder')
    .replace(/\bFwy\b/gi, 'Freeway')
    .replace(/\bXing\b/gi, 'Crossing')
    .replace(/\bEnrt\b/gi, 'Enroute')
    .replace(/\bOcc\b/gi, 'Occupant')
    .replace(/\bPoss\b/gi, 'Possible')
    .replace(/\bInj\b/gi, 'Injury')
    .replace(/\bUnk\b/gi, 'Unknown')
    .replace(/\bRq\b/gi, 'Requested')
    .replace(/\bReq\b/gi, 'Requested')
    .replace(/\bTw\b/gi, 'Tow')
    .replace(/\bThru\b/gi, 'Through')
    .replace(/\bBtwn\b/gi, 'Between')
    .replace(/\bClrd\b/gi, 'Cleared')
    .replace(/\b#(\d)\b/g, 'Lane $1')
    .replace(/\bRt\b/gi, 'Right')
    .replace(/\bLt\b/gi, 'Left')
    .replace(/\bMed\b/gi, 'Median');

  return result;
}

/** Translate CHP location description */
function translateLocation(location: string): string {
  return location
    .replace(/\bNb\b/gi, 'Northbound')
    .replace(/\bSb\b/gi, 'Southbound')
    .replace(/\bEb\b/gi, 'Eastbound')
    .replace(/\bWb\b/gi, 'Westbound')
    .replace(/\bJno\b/gi, 'Just North of')
    .replace(/\bJso\b/gi, 'Just South of')
    .replace(/\bJeo\b/gi, 'Just East of')
    .replace(/\bJwo\b/gi, 'Just West of')
    .replace(/\bOfr\b/gi, 'Off-ramp')
    .replace(/\bOnr\b/gi, 'On-ramp')
    .replace(/\bFwy\b/gi, 'Freeway')
    .replace(/\bBlvd\b/gi, 'Boulevard')
    .replace(/\bAve\b/gi, 'Avenue')
    .replace(/\bRd\b/gi, 'Road')
    .replace(/\bSt\b/gi, 'Street')
    .replace(/\bDr\b/gi, 'Drive')
    .replace(/\bAt\b/gi, 'at');
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

          const rawType = stripQuotes(logObj.LogType);
          const rawLocation = stripQuotes(logObj.Location);
          const rawDesc = stripQuotes(logObj.LocationDesc || logObj.LogType);

          incidents.push({
            id: stripQuotes(logObj.ID) || `INC-${incidents.length}`,
            type: translateType(rawType),
            location: translateLocation(rawLocation),
            description: translateLocation(rawDesc),
            latitude: lat,
            longitude: lon,
            severity: stripQuotes(logObj.Severity) || 'Unknown',
            dispatchCenter: stripQuotes(centerObj.ID) || stripQuotes(dispatchObj.ID) || '',
            logEntries: detailArray.map((d: unknown) => {
              const detail = d as Record<string, unknown>;
              return {
                time: stripQuotes(detail.DetailTime),
                text: translateLogEntry(stripQuotes(detail.IncidentDetail)),
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
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'upstream_error', message: String(error) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
