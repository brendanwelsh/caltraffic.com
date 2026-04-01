import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';
import type { CMS, Incident, ChainControl, LaneClosure } from '@/lib/schemas';

interface MapViewProps {
  cameras: EnrichedCamera[];
  cmsSigns?: CMS[];
  incidents?: Incident[];
  chainControls?: ChainControl[];
  closures?: LaneClosure[];
  onCameraClick?: (camera: EnrichedCamera) => void;
}

const CA_CENTER: [number, number] = [37.5, -119.5];
const CA_ZOOM = 6;

function createCameraIcon(camera: EnrichedCamera): L.DivIcon {
  const hasIncident = camera.nearbyIncidents.length > 0;
  const color = hasIncident ? '#ef4444' : camera.hasVideo ? '#22c55e' : '#6b7280';
  const borderColor = hasIncident ? '#ef4444' : 'transparent';

  return L.divIcon({
    className: 'custom-camera-marker',
    html: `<div style="
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid ${borderColor};
      box-shadow: 0 0 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function createCMSIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-cms-marker',
    html: `<div style="
      width: 16px;
      height: 12px;
      border-radius: 2px;
      background: #0a0a0a;
      border: 1.5px solid #f59e0b;
      box-shadow: 0 0 6px rgba(245,158,11,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 8px;
        height: 1.5px;
        background: #fbbf24;
      "></div>
    </div>`,
    iconSize: [16, 12],
    iconAnchor: [8, 6],
  });
}

function createIncidentIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-incident-marker',
    html: `<div style="
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 14px solid #ef4444;
      filter: drop-shadow(0 0 4px rgba(239,68,68,0.5));
      position: relative;
    ">
      <div style="
        position: absolute;
        top: 5px;
        left: -1px;
        width: 2px;
        height: 5px;
        background: white;
        border-radius: 1px;
      "></div>
      <div style="
        position: absolute;
        top: 12px;
        left: -1px;
        width: 2px;
        height: 2px;
        background: white;
        border-radius: 50%;
      "></div>
    </div>`,
    iconSize: [16, 14],
    iconAnchor: [8, 14],
  });
}

function createChainControlIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-chain-marker',
    html: `<div style="
      width: 14px; height: 14px; border-radius: 3px;
      background: #1e40af; border: 1.5px solid #3b82f6;
      box-shadow: 0 0 6px rgba(59,130,246,0.5);
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; color: white; font-weight: bold;
    ">C</div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function createClosureIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-closure-marker',
    html: `<div style="
      width: 14px; height: 14px; border-radius: 3px;
      background: #c2410c; border: 1.5px solid #f97316;
      box-shadow: 0 0 6px rgba(249,115,22,0.5);
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; color: white; font-weight: bold;
    ">X</div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function MapViewInner({ cameras, cmsSigns = [], incidents = [], chainControls = [], closures = [], onCameraClick }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const cameraLayerRef = useRef<L.LayerGroup | null>(null);
  const cmsLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);
  const chainControlLayerRef = useRef<L.LayerGroup | null>(null);
  const closureLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: CA_CENTER,
      zoom: CA_ZOOM,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    cameraLayerRef.current = L.layerGroup().addTo(map);
    cmsLayerRef.current = L.layerGroup().addTo(map);
    incidentLayerRef.current = L.layerGroup().addTo(map);
    chainControlLayerRef.current = L.layerGroup().addTo(map);
    closureLayerRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    // Fix gray tiles — aggressive invalidation on resize and visibility
    const invalidate = () => map.invalidateSize();
    setTimeout(invalidate, 100);
    setTimeout(invalidate, 500);
    setTimeout(invalidate, 1500);
    window.addEventListener('resize', invalidate);

    // Also watch for container becoming visible (tab switches, etc)
    const observer = new ResizeObserver(invalidate);
    observer.observe(mapRef.current);

    return () => {
      window.removeEventListener('resize', invalidate);
      observer.disconnect();
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Auto-fit map bounds to cameras
  useEffect(() => {
    if (!mapInstance.current || cameras.length === 0) return;

    const validCameras = cameras.filter((c) => c.latitude !== 0 && c.longitude !== 0);
    if (validCameras.length === 0) return;

    const bounds = L.latLngBounds(validCameras.map((c) => [c.latitude, c.longitude]));
    if (bounds.isValid()) {
      mapInstance.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
    }
  }, [cameras]);

  // Camera markers
  useEffect(() => {
    if (!mapInstance.current || !cameraLayerRef.current) return;

    cameraLayerRef.current.clearLayers();

    cameras.forEach((camera) => {
      if (camera.latitude === 0 && camera.longitude === 0) return;

      const marker = L.marker([camera.latitude, camera.longitude], {
        icon: createCameraIcon(camera),
        title: `${camera.route} ${camera.direction} - ${camera.location}`,
      });

      const popupContent = `
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
          <img src="${camera.imageUrl}" alt="${camera.location}" style="width: 100%; border-radius: 4px; margin-bottom: 8px;" loading="lazy" />
          <strong>${camera.route} ${camera.direction}</strong><br/>
          <span style="color: #888; font-size: 12px;">${camera.location || camera.city}</span><br/>
          <span style="color: ${camera.hasVideo ? '#22c55e' : '#6b7280'}; font-size: 11px;">
            ${camera.hasVideo ? '● Live' : '○ Photo'}
          </span>
          ${camera.nearbyIncidents.length > 0 ? `<br/><span style="color: #ef4444; font-size: 11px;">⚠ ${camera.nearbyIncidents.length} incident(s) nearby</span>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 250 });

      marker.on('click', () => {
        if (onCameraClick) {
          setTimeout(() => onCameraClick(camera), 100);
        }
      });

      cameraLayerRef.current!.addLayer(marker);
    });
  }, [cameras, onCameraClick]);

  // CMS sign markers
  useEffect(() => {
    if (!mapInstance.current || !cmsLayerRef.current) return;

    cmsLayerRef.current.clearLayers();

    cmsSigns.forEach((cms) => {
      if (cms.latitude === 0 && cms.longitude === 0) return;

      const allBlank = cms.phase1Lines.every((l) => !l.trim()) &&
        (!cms.phase2Lines || cms.phase2Lines.every((l) => !l.trim()));
      if (allBlank) return;

      const messageLines = [
        ...cms.phase1Lines.filter((l) => l.trim()),
        ...(cms.phase2Lines ?? []).filter((l) => l.trim()),
      ];

      const marker = L.marker([cms.latitude, cms.longitude], {
        icon: createCMSIcon(),
        title: `Sign: ${cms.location}`,
      });

      const popupContent = `
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
          <div style="background: #0a0a0a; border-radius: 4px; padding: 12px; margin-bottom: 8px; text-align: center;">
            ${messageLines.map((line) => `<div style="color: #fbbf24; font-family: monospace; font-weight: bold; font-size: 13px; letter-spacing: 1px;">${line}</div>`).join('')}
          </div>
          <strong>${cms.route} ${cms.direction}</strong><br/>
          <span style="color: #888; font-size: 12px;">${cms.location.replace(/_/g, ' ')}</span>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280 });

      cmsLayerRef.current!.addLayer(marker);
    });
  }, [cmsSigns]);

  // Incident markers
  useEffect(() => {
    if (!mapInstance.current || !incidentLayerRef.current) return;

    incidentLayerRef.current.clearLayers();

    incidents.forEach((incident) => {
      if (incident.latitude === 0 && incident.longitude === 0) return;

      const marker = L.marker([incident.latitude, incident.longitude], {
        icon: createIncidentIcon(),
        title: `${incident.type}: ${incident.location}`,
      });

      const logHtml = incident.logEntries.slice(0, 3).map((e) =>
        `<div style="font-size: 10px; color: #999; margin-top: 2px;"><b>${e.time}</b> — ${e.text}</div>`
      ).join('');

      const popupContent = `
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="color: #ef4444; font-weight: bold; font-size: 12px; text-transform: uppercase;">${incident.type}</span>
          </div>
          <p style="font-size: 13px; font-weight: 500; margin: 0 0 4px;">${incident.description}</p>
          <span style="color: #888; font-size: 12px;">${incident.location}</span>
          ${logHtml ? `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #333;">${logHtml}</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280 });

      incidentLayerRef.current!.addLayer(marker);
    });
  }, [incidents]);

  // Chain control markers
  useEffect(() => {
    if (!mapInstance.current || !chainControlLayerRef.current) return;
    chainControlLayerRef.current.clearLayers();

    chainControls.forEach((cc) => {
      if (cc.latitude === 0 && cc.longitude === 0) return;
      const marker = L.marker([cc.latitude, cc.longitude], {
        icon: createChainControlIcon(),
        title: `Chain Control: ${cc.location}`,
      });
      marker.bindPopup(`
        <div style="min-width: 180px; font-family: system-ui, sans-serif;">
          <div style="color: #3b82f6; font-weight: bold; font-size: 13px;">${cc.level} Chain Control</div>
          <div style="font-size: 12px; margin-top: 4px;">${cc.location}</div>
          <div style="color: #888; font-size: 11px; margin-top: 2px;">${cc.status}</div>
        </div>
      `, { maxWidth: 250 });
      chainControlLayerRef.current!.addLayer(marker);
    });
  }, [chainControls]);

  // Closure markers
  useEffect(() => {
    if (!mapInstance.current || !closureLayerRef.current) return;
    closureLayerRef.current.clearLayers();

    closures.forEach((cl) => {
      if (cl.latitude === 0 && cl.longitude === 0) return;
      const marker = L.marker([cl.latitude, cl.longitude], {
        icon: createClosureIcon(),
        title: `Closure: ${cl.location}`,
      });
      marker.bindPopup(`
        <div style="min-width: 180px; font-family: system-ui, sans-serif;">
          <div style="color: #f97316; font-weight: bold; font-size: 13px;">Lane Closure</div>
          <div style="font-size: 12px; margin-top: 4px;">${cl.location}</div>
          <div style="color: #888; font-size: 11px; margin-top: 2px;">${cl.closureType} — ${cl.lanesAffected}</div>
          <div style="color: #888; font-size: 11px;">${cl.startTime} to ${cl.endTime}</div>
        </div>
      `, { maxWidth: 280 });
      closureLayerRef.current!.addLayer(marker);
    });
  }, [closures]);

  return (
    <div
      ref={mapRef}
      className="h-[70vh] w-full rounded-lg border border-border"
      style={{ zIndex: 0 }}
    />
  );
}
