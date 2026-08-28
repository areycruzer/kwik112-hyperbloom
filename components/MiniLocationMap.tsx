/**
 * Tactical Mini Location Map
 */

'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

interface MiniLocationMapProps {
  latitude: number;
  longitude: number;
  accuracyRadius?: number;
  address?: string;
}

export default function MiniLocationMap({
  latitude,
  longitude,
  accuracyRadius = 50,
  address,
}: MiniLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current || mapRef.current) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !containerRef.current || mapRef.current) return;

      try {
        const map = L.default.map(containerRef.current, {
          center: [latitude, longitude],
          zoom: 15,
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
        });

        // Dark tactical basemap
        L.default.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(map);

        // Add Glowing Incident Beacon
        const customIcon = L.default.divIcon({
          className: 'custom-mini-beacon',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute -inset-2 rounded-full animate-ping bg-red-500/40"></div>
              <div class="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-[0_0_12px_#ef4444]"></div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        L.default.marker([latitude, longitude], { icon: customIcon }).addTo(map);

        // Add Accuracy Radius Circle
        L.default.circle([latitude, longitude], {
          radius: accuracyRadius,
          color: '#ef4444',
          fillColor: '#ef4444',
          fillOpacity: 0.12,
          weight: 1.5,
          dashArray: '4, 4',
        }).addTo(map);

        mapRef.current = map;
      } catch (error) {
        console.error('Error initializing mini map:', error);
      }
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, accuracyRadius]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-white/10 bg-[#05080f]">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 right-2 z-[400] px-2 py-1 rounded bg-slate-950/90 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-1">
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="truncate">{address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`} (+/-{accuracyRadius}m)</span>
      </div>
    </div>
  );
}
