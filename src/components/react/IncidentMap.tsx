import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Incident } from '@/lib/schemas';

interface IncidentMapProps {
  incidents: Incident[];
}

export function IncidentMap({ incidents }: IncidentMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
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

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update markers when incidents change
  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    for (const inc of incidents) {
      if (inc.latitude === 0 && inc.longitude === 0) continue;

      const marker = L.circleMarker([inc.latitude, inc.longitude], {
        radius: 6,
        fillColor: '#ef4444',
        color: '#991b1b',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.8,
      });

      marker.bindPopup(
        `<div style="min-width:180px">
          <strong>${inc.type}</strong><br/>
          <span style="color:#666">${inc.location}</span>
          ${inc.description ? `<br/><span style="font-size:0.85em">${inc.description}</span>` : ''}
        </div>`,
      );

      marker.addTo(layer);
    }
  }, [incidents]);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl border border-border overflow-hidden"
      style={{ height: '400px' }}
    />
  );
}
