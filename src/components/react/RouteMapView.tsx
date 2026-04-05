import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteCamera } from '@/hooks/use-route-planner';

interface RouteMapViewProps {
  routeCoords: [number, number][] | null; // null = still loading
  routeLineLoading: boolean;
  cameras: RouteCamera[];
  origin?: { lat: number; lon: number } | null;
  destination?: { lat: number; lon: number } | null;
  onCameraClick?: (camera: RouteCamera) => void;
  focusedCameraId?: string | null;
  userLocation?: { lat: number; lon: number } | null;
  pemsStations?: { latitude: number; longitude: number; speed: number | null; name: string; freewayId: string; freewayDir: string; flow: number }[];
}

export function RouteMapView({ routeCoords, routeLineLoading, cameras, origin, destination, onCameraClick, focusedCameraId, userLocation, pemsStations }: RouteMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const cameraLayerRef = useRef<L.LayerGroup | null>(null);
  const speedLayerRef = useRef<L.LayerGroup | null>(null);
  const cameraMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [37.5, -119.5],
      zoom: 6,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);
    cameraLayerRef.current = L.layerGroup().addTo(map);
    speedLayerRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Fit map to cameras + origin/destination
  useEffect(() => {
    if (!mapInstance.current) return;

    const points: [number, number][] = [];
    if (origin) points.push([origin.lat, origin.lon]);
    if (destination) points.push([destination.lat, destination.lon]);
    cameras.forEach((c) => {
      if (c.latitude !== 0 && c.longitude !== 0) points.push([c.latitude, c.longitude]);
    });

    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      if (bounds.isValid()) {
        mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    }
  }, [cameras, origin, destination]);

  // Draw route polyline (arrives from OSRM in background)
  useEffect(() => {
    if (!mapInstance.current || !routeLayerRef.current) return;

    routeLayerRef.current.clearLayers();

    if (routeCoords && routeCoords.length >= 2) {
      const latLngs: [number, number][] = routeCoords.map(([lon, lat]) => [lat, lon]);

      L.polyline(latLngs, {
        color: '#3b82f6',
        weight: pemsStations && pemsStations.length > 0 ? 2 : 4,
        opacity: pemsStations && pemsStations.length > 0 ? 0.3 : 0.8,
      }).addTo(routeLayerRef.current);

      // Direction arrows along route every ~50 points
      const step = Math.max(1, Math.floor(latLngs.length / 20));
      for (let i = step; i < latLngs.length - 1; i += step) {
        const from = latLngs[i - 1];
        const to = latLngs[i];
        const angle = Math.atan2(to[1] - from[1], to[0] - from[0]) * (180 / Math.PI);
        const arrowIcon = L.divIcon({
          className: 'route-arrow',
          html: `<div style="
            width:12px;height:12px;display:flex;align-items:center;justify-content:center;
            transform:rotate(${90 - angle}deg);color:#3b82f6;font-size:14px;font-weight:bold;
            text-shadow:0 0 3px rgba(0,0,0,0.5);
          ">&#9650;</div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        L.marker(to, { icon: arrowIcon, interactive: false }).addTo(routeLayerRef.current);
      }
    }

    // Start/end markers
    if (origin) {
      const startIcon = L.divIcon({
        className: 'route-start',
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:bold;">A</div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([origin.lat, origin.lon], { icon: startIcon }).addTo(routeLayerRef.current);
    }
    if (destination) {
      const endIcon = L.divIcon({
        className: 'route-end',
        html: '<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:bold;">B</div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([destination.lat, destination.lon], { icon: endIcon }).addTo(routeLayerRef.current);
    }
  }, [routeCoords, origin, destination, pemsStations]);

  // PeMS speed overlay
  useEffect(() => {
    if (!mapInstance.current || !speedLayerRef.current) return;
    speedLayerRef.current.clearLayers();

    if (!routeCoords || routeCoords.length < 2 || !pemsStations || pemsStations.length === 0) return;

    const latLngs: [number, number][] = routeCoords.map(([lon, lat]) => [lat, lon]);

    // Helper: find nearest PeMS station to a point
    function nearestStation(lat: number, lon: number) {
      let best = null;
      let bestDist = Infinity;
      for (const s of pemsStations!) {
        const dlat = s.latitude - lat;
        const dlon = s.longitude - lon;
        const dist = dlat * dlat + dlon * dlon;
        if (dist < bestDist) {
          bestDist = dist;
          best = s;
        }
      }
      // Only match within ~2km (roughly 0.02 degrees)
      return bestDist < 0.0004 ? best : null;
    }

    function speedColor(speed: number | null): string {
      if (speed === null) return '#6b7280'; // gray
      if (speed >= 50) return '#22c55e'; // green
      if (speed >= 25) return '#eab308'; // yellow
      return '#ef4444'; // red
    }

    // Build colored segments (group every 5 points)
    const step = 5;
    for (let i = 0; i < latLngs.length - 1; i += step) {
      const end = Math.min(i + step + 1, latLngs.length);
      const segPoints = latLngs.slice(i, end);
      if (segPoints.length < 2) continue;

      // Use midpoint to find nearest station
      const midIdx = Math.floor(segPoints.length / 2);
      const mid = segPoints[midIdx];
      const station = nearestStation(mid[0], mid[1]);
      const color = speedColor(station?.speed ?? null);

      L.polyline(segPoints, {
        color,
        weight: 6,
        opacity: 0.85,
      }).addTo(speedLayerRef.current!);
    }
  }, [routeCoords, pemsStations]);

  // Camera markers
  useEffect(() => {
    if (!mapInstance.current || !cameraLayerRef.current) return;

    cameraLayerRef.current.clearLayers();
    cameraMarkersRef.current.clear();

    // Scale marker size based on zoom level
    const map = mapInstance.current;
    const getMarkerSize = () => {
      const zoom = map.getZoom();
      if (zoom >= 12) return 24;
      if (zoom >= 10) return 20;
      if (zoom >= 8) return 16;
      return 12;
    };

    const buildMarkers = () => {
      cameraLayerRef.current!.clearLayers();
      cameraMarkersRef.current.clear();
      const size = getMarkerSize();
      const fontSize = Math.max(8, size * 0.45);

      cameras.forEach((camera, i) => {
        if (camera.latitude === 0 && camera.longitude === 0) return;

        const hasIssues = camera.nearbyIncidents.length > 0 || camera.chainControls.length > 0;
        const color = hasIssues ? '#ef4444' : camera.hasVideo ? '#22c55e' : '#6b7280';

        const icon = L.divIcon({
          className: 'route-camera-marker',
          html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;background:${color};
            border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            font-size:${fontSize}px;color:white;font-weight:bold;
          ">${i + 1}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

      const marker = L.marker([camera.latitude, camera.longitude], { icon });

      marker.bindTooltip(`${camera.route} ${camera.direction} — ${camera.location || camera.city}`, {
        direction: 'top',
        offset: [0, -12],
      });

      marker.bindPopup(`
        <div style="min-width:180px;font-family:system-ui,sans-serif;">
          <img src="${camera.imageUrl}" style="width:100%;border-radius:4px;margin-bottom:6px;" loading="lazy" />
          <strong>${camera.route} ${camera.direction}</strong><br/>
          <span style="color:#888;font-size:12px;">${camera.location || camera.city}</span>
        </div>
      `, { maxWidth: 250 });

        if (onCameraClick) {
          marker.on('click', () => setTimeout(() => onCameraClick(camera), 100));
        }

        cameraLayerRef.current!.addLayer(marker);
        cameraMarkersRef.current.set(camera.id, marker);
      });
    };

    buildMarkers();

    // Rebuild markers on zoom to scale sizes
    const onZoom = () => buildMarkers();
    map.on('zoomend', onZoom);

    return () => { map.off('zoomend', onZoom); };
  }, [cameras, onCameraClick]);

  // Pan to focused camera and open its popup
  useEffect(() => {
    if (!mapInstance.current || !focusedCameraId) return;

    const marker = cameraMarkersRef.current.get(focusedCameraId);
    if (!marker) return;

    const latLng = marker.getLatLng();
    // Pan without changing zoom level — prevents zoom bounce
    mapInstance.current.panTo(latLng, { animate: true, duration: 0.5 });
    marker.openPopup();
  }, [focusedCameraId]);

  // User location blue pulsing dot
  useEffect(() => {
    if (!mapInstance.current) return;

    if (userMarkerRef.current) {
      mapInstance.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `<div style="
          width:18px;height:18px;border-radius:50%;background:#3b82f6;
          border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3), 0 0 8px rgba(59,130,246,0.4);
          animation: pulse-blue 2s ease-in-out infinite;
        "></div>
        <style>
          @keyframes pulse-blue {
            0%, 100% { box-shadow: 0 0 0 4px rgba(59,130,246,0.3), 0 0 8px rgba(59,130,246,0.4); }
            50% { box-shadow: 0 0 0 8px rgba(59,130,246,0.15), 0 0 16px rgba(59,130,246,0.2); }
          }
        </style>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lon], { icon: userIcon, zIndexOffset: 1000 })
        .bindTooltip('Your location', { direction: 'top', offset: [0, -12] })
        .addTo(mapInstance.current);
    }
  }, [userLocation]);

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="h-full w-full rounded-lg border border-border"
        style={{ zIndex: 0, minHeight: '400px' }}
      />
      {/* Route line loading indicator */}
      {routeLineLoading && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] rounded-full bg-card/90 backdrop-blur-sm border border-border px-3 py-1 flex items-center gap-2">
          <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-[10px] text-muted-foreground">Route line loading...</span>
        </div>
      )}
      {/* Map legend */}
      <div className="absolute bottom-2 right-2 z-[1000] rounded-lg bg-card/95 backdrop-blur-sm border border-border px-3 py-2 text-[10px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-green-500 border border-white inline-block"></span>
          <span>Camera (live)</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-gray-500 border border-white inline-block"></span>
          <span>Camera (still)</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-red-500 border border-white inline-block"></span>
          <span>Camera (incident)</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-4 h-4 rounded-full bg-green-500 border-2 border-white text-[8px] text-white font-bold flex items-center justify-center">A</span>
          <span>Start</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-red-500 border-2 border-white text-[8px] text-white font-bold flex items-center justify-center">B</span>
          <span>End</span>
        </div>
        {pemsStations && pemsStations.length > 0 && (
          <>
            <div className="border-t border-border my-1.5 pt-1.5">
              <div className="text-[9px] font-semibold text-muted-foreground mb-1">Traffic Speed</div>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-4 h-1 rounded bg-green-500 inline-block"></span>
              <span>&gt;50 mph</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-4 h-1 rounded bg-yellow-500 inline-block"></span>
              <span>25-50 mph</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 rounded bg-red-500 inline-block"></span>
              <span>&lt;25 mph</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
