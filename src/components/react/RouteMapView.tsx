import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteCamera } from '@/hooks/use-route-planner';

interface RouteMapViewProps {
  routeCoords: [number, number][];
  cameras: RouteCamera[];
  onCameraClick?: (camera: RouteCamera) => void;
}

export function RouteMapView({ routeCoords, cameras, onCameraClick }: RouteMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

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

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Draw route polyline
  useEffect(() => {
    if (!mapInstance.current || routeCoords.length < 2) return;

    const latLngs: [number, number][] = routeCoords.map(([lon, lat]) => [lat, lon]);

    const polyline = L.polyline(latLngs, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.8,
    }).addTo(mapInstance.current);

    mapInstance.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    const startIcon = L.divIcon({
      className: 'route-start',
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    const endIcon = L.divIcon({
      className: 'route-end',
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const startMarker = L.marker(latLngs[0], { icon: startIcon }).addTo(mapInstance.current);
    const endMarker = L.marker(latLngs[latLngs.length - 1], { icon: endIcon }).addTo(mapInstance.current);

    return () => {
      polyline.remove();
      startMarker.remove();
      endMarker.remove();
    };
  }, [routeCoords]);

  // Camera markers along route
  useEffect(() => {
    if (!mapInstance.current) return;

    const markers: L.Marker[] = [];

    cameras.forEach((camera, i) => {
      if (camera.latitude === 0 && camera.longitude === 0) return;

      const hasIssues = camera.nearbyIncidents.length > 0 || camera.chainControls.length > 0;
      const color = hasIssues ? '#ef4444' : camera.hasVideo ? '#22c55e' : '#6b7280';

      const icon = L.divIcon({
        className: 'route-camera-marker',
        html: `<div style="
          width:20px;height:20px;border-radius:50%;background:${color};
          border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-size:9px;color:white;font-weight:bold;
        ">${i + 1}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([camera.latitude, camera.longitude], { icon });

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

      marker.addTo(mapInstance.current!);
      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [cameras, onCameraClick]);

  return (
    <div
      ref={mapRef}
      className="h-[50vh] w-full rounded-lg border border-border"
      style={{ zIndex: 0 }}
    />
  );
}
