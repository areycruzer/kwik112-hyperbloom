/**
 * Pulse112 Tactical Emergency Map
 * High-contrast dark tactical situational awareness with live units,
 * glowing incident markers, and first responder pathfinding vectors.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { EmergencyCall } from '@/lib/types';
import { getTimeElapsed } from '@/lib/mock-data';
import { Navigation, Shield } from 'lucide-react';

interface EmergencyMapProps {
  calls: EmergencyCall[];
  selectedCallId: string | null;
  onMarkerClick: (callId: string) => void;
  onDispatchUnit?: (unitId: string, callId: string) => void;
}

interface TacticalUnit {
  id: string;
  callsign: string;
  type: 'police' | 'fire' | 'ems';
  lat: number;
  lng: number;
  status: 'available' | 'en-route' | 'on-scene' | 'busy';
  speed: string;
  assignedCallId?: string;
}

export default function EmergencyMap({
  calls,
  selectedCallId,
  onMarkerClick,
  onDispatchUnit,
}: EmergencyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const incidentMarkersRef = useRef<Map<string, any>>(new Map());
  const unitMarkersRef = useRef<Map<string, any>>(new Map());
  const routePolylineRef = useRef<any>(null);
  const [showUnits, setShowUnits] = useState(true);
  const [activeLayer, setActiveLayer] = useState<'dark' | 'satellite'>('dark');
  const tileLayerRef = useRef<any>(null);

  // Mock First Responder Fleet positioned around city
  const [tacticalUnits, setTacticalUnits] = useState<TacticalUnit[]>([
    { id: 'PD-101', callsign: 'Cruiser 101', type: 'police', lat: 28.7180, lng: 77.1100, status: 'available', speed: '0 km/h' },
    { id: 'FD-204', callsign: 'Engine 204', type: 'fire', lat: 28.6920, lng: 77.0850, status: 'en-route', speed: '48 km/h' },
    { id: 'EMS-302', callsign: 'Medic 302', type: 'ems', lat: 28.7250, lng: 77.1350, status: 'available', speed: '0 km/h' },
    { id: 'PD-108', callsign: 'Intercepter 108', type: 'police', lat: 28.6850, lng: 77.1200, status: 'available', speed: '12 km/h' },
    { id: 'EMS-309', callsign: 'Air Rescue 1', type: 'ems', lat: 28.7400, lng: 77.0900, status: 'available', speed: '0 km/h' },
  ]);

  // Initialize Map with dark tiles
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current || mapRef.current) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !containerRef.current || mapRef.current) return;

      leafletRef.current = L.default;

      try {
        const map = L.default.map(containerRef.current, {
          center: [28.7041, 77.1025],
          zoom: 13,
          zoomControl: false,
          attributionControl: false,
          preferCanvas: true,
        });

        // Add dark tactical basemap
        const darkTiles = L.default.tileLayer(
          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          {
            maxZoom: 19,
            subdomains: 'abcd',
          }
        ).addTo(map);

        tileLayerRef.current = darkTiles;
        mapRef.current = map;

        // Force resize calculation
        setTimeout(() => {
          map.invalidateSize();
        }, 200);

        // Add zoom control at bottom right
        L.default.control.zoom({ position: 'bottomright' }).addTo(map);
      } catch (error) {
        console.error('Error initializing tactical map:', error);
      }
    });

    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer if user toggles
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current || !leafletRef.current) return;

    const L = leafletRef.current;
    mapRef.current.removeLayer(tileLayerRef.current);
    const newTiles = activeLayer === 'dark'
      ? L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' })
      : L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18 });

    newTiles.addTo(mapRef.current);
    tileLayerRef.current = newTiles;
  }, [activeLayer]);

  // Invalidate map size whenever selection changes or view renders
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [selectedCallId]);

  // Render Incident Markers with tactical glowing beacons
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const currentCallIds = new Set<string>();

    calls.forEach((call) => {
      const location = call.caller_location;
      if (!location || !location.latitude || !location.longitude) return;

      currentCallIds.add(call.id);
      const isSelected = selectedCallId === call.id;

      const getPColor = () => {
        switch (call.severity) {
          case 'critical': return '#ef4444';
          case 'high': return '#f97316';
          case 'medium': return '#eab308';
          default: return '#10b981';
        }
      };

      const color = getPColor();
      const priorityLabel = call.priority_code || (call.severity === 'critical' ? 'P1' : call.severity === 'high' ? 'P2' : call.severity === 'medium' ? 'P3' : 'P4');

      const customIcon = L.divIcon({
        className: 'custom-tactical-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
            ${call.severity === 'critical' || isSelected ? `
              <div class="absolute -inset-2 rounded-full animate-ping opacity-60" style="background-color: ${color};"></div>
              <div class="absolute -inset-3 rounded-full opacity-25" style="border: 2px dashed ${color};"></div>
            ` : ''}
            <div class="relative px-2 py-1 rounded-md text-[10px] font-black font-mono shadow-2xl flex items-center gap-1 border border-white/20"
                 style="background: rgba(10, 15, 26, 0.92); color: ${color}; box-shadow: 0 0 16px ${color}66;">
              <span class="w-2 h-2 rounded-full" style="background-color: ${color}; box-shadow: 0 0 8px ${color};"></span>
              <span>${priorityLabel}</span>
            </div>
          </div>
        `,
        iconSize: [40, 24],
        iconAnchor: [20, 12],
      });

      let marker = incidentMarkersRef.current.get(call.id);
      if (!marker) {
        marker = L.marker([location.latitude, location.longitude], { icon: customIcon }).addTo(mapRef.current!);
        marker.on('click', () => onMarkerClick(call.id));
        incidentMarkersRef.current.set(call.id, marker);
      } else {
        marker.setLatLng([location.latitude, location.longitude]);
        marker.setIcon(customIcon);
      }

      const popupHtml = `
        <div class="p-1 text-slate-100 font-sans text-xs space-y-2 min-w-[220px]">
          <div class="flex items-center justify-between border-b border-white/10 pb-1.5">
            <span class="font-bold uppercase tracking-wider text-[11px]" style="color: ${color};">
              ${call.incident_subtype || call.incident_type}
            </span>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 uppercase">${call.severity}</span>
          </div>
          <p class="text-slate-300 text-[11px] leading-relaxed line-clamp-2">${call.chief_complaint || 'Emergency reported'}</p>
          <div class="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
            <span class="truncate">📍 ${location.address || 'Triangulated coordinate'}</span>
          </div>
          <div class="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] font-mono text-slate-400">
            <span>⏱ ${getTimeElapsed(call.created_at)}</span>
            <span class="text-blue-400 font-semibold cursor-pointer">SELECT INCIDENT ›</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'tactical-map-popup' });

      if (isSelected) {
        marker.openPopup();
      }
    });

    incidentMarkersRef.current.forEach((marker, id) => {
      if (!currentCallIds.has(id)) {
        marker.remove();
        incidentMarkersRef.current.delete(id);
      }
    });
  }, [calls, selectedCallId, onMarkerClick]);

  // Render First Responder Fleet Markers
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;

    if (!showUnits) {
      unitMarkersRef.current.forEach((m) => m.remove());
      unitMarkersRef.current.clear();
      return;
    }

    tacticalUnits.forEach((unit) => {
      const getUnitIcon = () => {
        switch (unit.type) {
          case 'police': return '🚓';
          case 'fire': return '🚒';
          case 'ems': return '🚑';
        }
      };

      const unitColor = unit.type === 'police' ? '#38bdf8' : unit.type === 'fire' ? '#f87171' : '#4ade80';

      const unitIcon = L.divIcon({
        className: 'custom-unit-marker',
        html: `
          <div class="relative flex items-center justify-center group cursor-pointer">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg border border-white/30 backdrop-blur-md"
                 style="background: rgba(15, 23, 42, 0.95); box-shadow: 0 0 12px ${unitColor}88;">
              <span>${getUnitIcon()}</span>
            </div>
            <div class="absolute -bottom-4 px-1.5 py-0.2 rounded text-[8px] font-mono font-bold whitespace-nowrap bg-slate-950/90 text-slate-200 border border-white/10">
              ${unit.id}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      let marker = unitMarkersRef.current.get(unit.id);
      if (!marker) {
        marker = L.marker([unit.lat, unit.lng], { icon: unitIcon }).addTo(mapRef.current!);
        unitMarkersRef.current.set(unit.id, marker);
      } else {
        marker.setLatLng([unit.lat, unit.lng]);
        marker.setIcon(unitIcon);
      }

      marker.bindPopup(`
        <div class="p-1 text-slate-100 text-xs space-y-1.5">
          <div class="flex items-center justify-between font-mono font-bold text-sky-400">
            <span>${unit.id} (${unit.callsign})</span>
            <span class="text-[9px] px-1 bg-sky-500/20 text-sky-300 rounded uppercase">${unit.status}</span>
          </div>
          <div class="text-[10px] text-slate-300">
            Speed: <span class="font-mono text-emerald-400">${unit.speed}</span> • Unit Type: <span class="capitalize">${unit.type}</span>
          </div>
        </div>
      `);
    });
  }, [tacticalUnits, showUnits]);

  // Pathfinding vector route to Selected Incident
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;

    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (!selectedCallId) return;

    const selectedCall = calls.find((c) => c.id === selectedCallId);
    if (!selectedCall || !selectedCall.caller_location) return;

    const targetLat = selectedCall.caller_location.latitude;
    const targetLng = selectedCall.caller_location.longitude;

    if (!targetLat || !targetLng) return;

    const closestUnit = tacticalUnits[0];
    if (!closestUnit) return;

    const waypoints: [number, number][] = [
      [closestUnit.lat, closestUnit.lng],
      [(closestUnit.lat + targetLat) / 2 + 0.003, (closestUnit.lng + targetLng) / 2 - 0.002],
      [targetLat, targetLng],
    ];

    const polyline = L.polyline(waypoints, {
      color: '#38bdf8',
      weight: 4,
      opacity: 0.85,
      dashArray: '8, 8',
      className: 'animate-pulse',
    }).addTo(mapRef.current);

    routePolylineRef.current = polyline;
    mapRef.current.setView([targetLat, targetLng], 14, { animate: true });
  }, [selectedCallId, calls, tacticalUnits]);

  return (
    <div className="relative w-full h-full min-h-[450px] bg-[#05080f] overflow-hidden flex-1">
      {/* Map Element */}
      <div
        ref={containerRef}
        className="w-full h-full min-h-[450px] absolute inset-0 z-0"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Tactical HUD Map Overlays (Top Left) */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-white/10 text-xs shadow-2xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="font-mono font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            SITUATIONAL AWARENESS RADAR
          </span>
          <span className="text-[10px] text-slate-400 ml-1 font-mono">
            ({calls.length} INCIDENTS • {tacticalUnits.length} UNITS)
          </span>
        </div>

        {/* Layer & Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950/85 backdrop-blur-md border border-white/10 text-[11px] shadow-xl">
          <button
            onClick={() => setActiveLayer(activeLayer === 'dark' ? 'satellite' : 'dark')}
            className={`px-2.5 py-1 rounded font-mono font-medium transition-all ${
              activeLayer === 'dark' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tactical HUD
          </button>
          <button
            onClick={() => setActiveLayer(activeLayer === 'satellite' ? 'dark' : 'satellite')}
            className={`px-2.5 py-1 rounded font-mono font-medium transition-all ${
              activeLayer === 'satellite' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Satellite
          </button>
          <div className="h-3.5 w-px bg-white/10 mx-0.5"></div>
          <button
            onClick={() => setShowUnits(!showUnits)}
            className={`px-2.5 py-1 rounded font-mono font-medium transition-all flex items-center gap-1 ${
              showUnits ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-500 line-through'
            }`}
          >
            <Shield className="w-3 h-3" />
            Units ({tacticalUnits.length})
          </button>
        </div>
      </div>

      {/* Pathfinding Route Info Badge */}
      {selectedCallId && (
        <div className="absolute top-4 right-4 z-[400] px-3.5 py-2.5 rounded-lg bg-slate-950/90 backdrop-blur-md border border-sky-500/30 text-xs shadow-2xl space-y-1">
          <div className="flex items-center gap-2 text-sky-400 font-mono font-bold text-[11px]">
            <Navigation className="w-3.5 h-3.5 animate-spin" />
            <span>PATHFINDING VECTOR ACTIVE</span>
          </div>
          <div className="text-[11px] text-slate-300 flex items-center justify-between gap-4 font-mono">
            <span>Primary: <b className="text-white">Cruiser 101</b></span>
            <span>ETA: <b className="text-emerald-400">3.4 min</b></span>
            <span>Dist: <b className="text-sky-300">1.8 km</b></span>
          </div>
        </div>
      )}

      {/* Bottom Left Legend */}
      <div className="absolute bottom-4 left-4 z-[400] px-3 py-2 rounded-lg bg-slate-950/85 backdrop-blur-md border border-white/10 text-[10px] font-mono shadow-xl flex items-center gap-3 text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]"></span>
          <span>P1 Critical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_#f97316]"></span>
          <span>P2 High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_6px_#eab308]"></span>
          <span>P3 Standard</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
          <span>P4 Low/Non-Emerg</span>
        </div>
      </div>
    </div>
  );
}
