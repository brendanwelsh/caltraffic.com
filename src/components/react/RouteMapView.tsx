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
}

export function RouteMapView({ routeCoords, routeLineLoading, cameras, origin, destination, onCameraClick, focusedCameraId }: RouteMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const cameraLayerRef = useRef<L.LayerGroup | null>(null);
  const cameraMarkersRef = useRef<Map<string, L.Marker>>(new Map());

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
        weight: 4,
        opacity: 0.8,
      }).addTo(routeLayerRef.current);
    }

    // Start/end markers
    if (origin) {
      const startIcon = L.divIcon({
        className: 'route-start',
        html: '<div style="width:20px;height:20px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:bold;">A</div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([origin.lat, origin.lon], { icon: startIcon }).addTo(routeLayerRef.current);
    }
    if (destination) {
      const endIcon = L.divIcon({
        className: 'route-end',
        html: '<div style="width:20px;height:20px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:bold;">B</div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([destination.lat, destination.lon], { icon: endIcon }).addTo(routeLayerRef.current);
    }
  }, [routeCoords, origin, destination]);

  // Camera markers
  useEffect(() => {
    if (!mapInstance.current || !cameraLayerRef.current) return;

    cameraLayerRef.current.clearLayers();
    cameraMarkersRef.current.clear();

    cameras.forEach((camera, i) => {
      if (camera.latitude === 0 && camera.longitude === 0) return;

      const hasIssues = camera.nearbyIncidents.length > 0 || camera.chainControls.length > 0;
      const color = hasIssues ? '#ef4444' : camera.hasVideo ? '#22c55e' : '#6b7280';

      const icon = L.divIcon({
        className: 'route-camera-marker',
        html: `<div style="
          width:24px;height:24px;border-radius:50%;background:${color};
          border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-size:11px;color:white;font-weight:bold;
        ">${i + 1}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
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
    </div>
  );
}
