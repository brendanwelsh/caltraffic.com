import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EnrichedCamera } from '@/hooks/use-enriched-cameras';

interface MapViewInnerProps {
  cameras: EnrichedCamera[];
  onCameraClick?: (camera: EnrichedCamera) => void;
}

// California center
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

export function MapViewInner({ cameras, onCameraClick }: MapViewInnerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
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

    markersRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update markers when cameras change
  useEffect(() => {
    if (!mapInstance.current || !markersRef.current) return;

    markersRef.current.clearLayers();

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
          // Delay to let popup open first
          setTimeout(() => onCameraClick(camera), 100);
        }
      });

      markersRef.current!.addLayer(marker);
    });
  }, [cameras, onCameraClick]);

  return (
    <div
      ref={mapRef}
      className="h-[70vh] w-full rounded-lg border border-border"
      style={{ zIndex: 0 }}
    />
  );
}
