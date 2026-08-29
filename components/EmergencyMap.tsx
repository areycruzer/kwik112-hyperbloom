/**
 * Situational map — satellite basemap with triangle/circle symbology.
 *
 * The basemap is Esri World_Imagery (bright satellite), the far more legible
 * reference-product choice over the near-featureless dark canvas. Incidents are
 * filled triangles (severity colour) and units are filled circles (service
 * colour), both built by `buildSymbol` and mounted through Leaflet `divIcon`.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { EmergencyCall } from '@/lib/types';
import { getTimeElapsed } from '@/lib/mock-data';
import { escapeHtml } from '@/lib/utils';
import { buildSymbol, glyphForIncidentType } from '@/lib/design/symbols';
import { priorityCode, distressOf } from '@/lib/incident';
import { TACTICAL_UNITS, type TacticalUnit } from '@/lib/units';
import { Navigation, Shield } from 'lucide-react';

interface EmergencyMapProps {
  calls: EmergencyCall[];
  selectedCallId: string | null;
  onMarkerClick: (callId: string) => void;
  onDispatchUnit?: (unitId: string, callId: string) => void;
  /** Roster-selected unit: drawn with a 1px accent ring, like a selected incident. */
  selectedUnitId?: string | null;
}

// Esri World_Imagery: bright satellite imagery, keyless, attribution required.
const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION =
  'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

/** Read a design token from :root so Leaflet-set colours match the JSX layer. */
function cssToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export default function EmergencyMap({
  calls,
  selectedCallId,
  onMarkerClick,
  selectedUnitId = null,
}: EmergencyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const incidentMarkersRef = useRef<Map<string, any>>(new Map());
  const unitMarkersRef = useRef<Map<string, any>>(new Map());
  const routePolylineRef = useRef<any>(null);
  const [showUnits, setShowUnits] = useState(true);
  // Leaflet loads asynchronously. Effects that draw onto the map key off this so
  // they re-run once it exists, rather than relying on a poll to retry them.
  // Without this reactive gate the marker effects run before the map exists,
  // bail out, and never re-run — every marker silently vanishes.
  const [mapReady, setMapReady] = useState(false);

  // First Responder Fleet — the shared roster, so the map markers and the
  // roster module can never disagree. Lifted to lib/units.ts (Task 11).
  const tacticalUnits: TacticalUnit[] = TACTICAL_UNITS;

  // Initialize the map with the satellite basemap.
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
          preferCanvas: true,
        });

        // Bright satellite imagery. The attribution control is left on: Esri's
        // terms require it, and a prior version stripping it was a regression.
        L.default
          .tileLayer(SATELLITE_TILE_URL, { maxZoom: 18, attribution: SATELLITE_ATTRIBUTION })
          .addTo(map);

        mapRef.current = map;
        setMapReady(true);

        // Force resize calculation once the container has laid out.
        setTimeout(() => {
          map.invalidateSize();
        }, 200);

        L.default.control.zoom({ position: 'bottomright' }).addTo(map);
      } catch (error) {
        console.error('Error initializing situational map:', error);
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
      incidentMarkersRef.current.clear();
      unitMarkersRef.current.clear();
      routePolylineRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Invalidate map size whenever the selection changes or the view re-renders.
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }
  }, [selectedCallId]);

  // Render incident markers as filled triangles built by `buildSymbol`.
  //
  // Depends only on `calls`, `selectedCallId`, `onMarkerClick`, and `mapReady`.
  // The parent memoises `onMarkerClick` and only changes the `calls` identity
  // when the data actually changed, so this must not gain unstable deps or it
  // would rebuild every marker (and re-open the popup) on each poll tick.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const currentCallIds = new Set<string>();

    calls.forEach((call) => {
      const location = call.caller_location;
      if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return;

      currentCallIds.add(call.id);
      const isSelected = selectedCallId === call.id;
      const label = call.incident_subtype || call.incident_type || 'Incident';

      // buildSymbol escapes its own interpolated values (label, glyph, kind)
      // internally, so its SVG string is safe to embed directly. Incidents are
      // filled triangles; the name label and any distress ring come from spec.
      const svg = buildSymbol({
        kind: 'incident',
        glyph: glyphForIncidentType(call.incident_type),
        severity: call.severity,
        distress: distressOf(call),
        label,
        selected: isSelected,
        size: 34,
      });

      const icon = L.divIcon({
        className: 'pulse-map-marker',
        html: svg,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      let marker = incidentMarkersRef.current.get(call.id);
      if (!marker) {
        marker = L.marker([location.latitude, location.longitude], { icon }).addTo(mapRef.current!);
        marker.on('click', () => onMarkerClick(call.id));
        incidentMarkersRef.current.set(call.id, marker);
      } else {
        marker.setLatLng([location.latitude, location.longitude]);
        marker.setIcon(icon);
      }

      // Every interpolated value below is caller-derived — incident text on this
      // platform is LLM-transcribed caller speech, and a hostile
      // `caller_location.address` has executed in a real browser before — so each
      // one must pass through escapeHtml. See lib/utils#escapeHtml.
      const summary = call.ai_summary || call.chief_complaint || 'Emergency reported';
      const popupHtml = `
        <div class="min-w-[200px] space-y-1.5">
          <div class="flex items-center justify-between gap-2 border-b border-rule pb-1.5">
            <span class="text-sm font-semibold capitalize text-ink">${escapeHtml(call.incident_subtype || call.incident_type)}</span>
            <span class="label">${escapeHtml(priorityCode(call))}</span>
          </div>
          <p class="text-sm leading-relaxed text-ink-2">${escapeHtml(summary)}</p>
          <div class="text-xs text-ink-3">
            <span class="break-words">${escapeHtml(location.address || 'Triangulated coordinate')}</span>
          </div>
          <div class="flex items-center justify-between gap-2 border-t border-rule pt-1.5 text-2xs text-ink-4">
            <span class="tnum">${escapeHtml(getTimeElapsed(call.created_at))}</span>
            <span class="uppercase tracking-wide">${escapeHtml(call.severity || 'ungraded')}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { className: 'pulse-map-popup' });

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
  }, [calls, selectedCallId, onMarkerClick, mapReady]);

  // Render the first-responder fleet as filled circles built by `buildSymbol`.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;

    if (!showUnits) {
      unitMarkersRef.current.forEach((m) => m.remove());
      unitMarkersRef.current.clear();
      return;
    }

    tacticalUnits.forEach((unit) => {
      const svg = buildSymbol({
        kind: 'unit',
        glyph: unit.type,
        service: unit.type,
        label: unit.id,
        selected: unit.id === selectedUnitId,
        size: 30,
      });

      const icon = L.divIcon({
        className: 'pulse-map-marker',
        html: svg,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      let marker = unitMarkersRef.current.get(unit.id);
      if (!marker) {
        marker = L.marker([unit.lat, unit.lng], { icon }).addTo(mapRef.current!);
        unitMarkersRef.current.set(unit.id, marker);
      } else {
        marker.setLatLng([unit.lat, unit.lng]);
        marker.setIcon(icon);
      }

      // Unit fields are internal mock data, but escaping stays uniform so no
      // string built here is ever a markup sink.
      marker.bindPopup(
        `
        <div class="min-w-[180px] space-y-1">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-semibold text-ink">${escapeHtml(unit.id)} · ${escapeHtml(unit.callsign)}</span>
            <span class="label">${escapeHtml(unit.status)}</span>
          </div>
          <div class="text-xs text-ink-3">
            <span class="capitalize">${escapeHtml(unit.type)}</span> · Speed <span class="tnum text-ink-2">${escapeHtml(unit.speed)}</span>
          </div>
        </div>
      `,
        { className: 'pulse-map-popup' },
      );
    });
  }, [tacticalUnits, showUnits, mapReady, selectedUnitId]);

  // Responder vector to the selected incident. Colour is pulled from the design
  // token so nothing hardcodes a hex here.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
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
      color: cssToken('--accent', '#69D2FF'),
      weight: 3,
      opacity: 0.85,
      dashArray: '6, 8',
    }).addTo(mapRef.current);

    routePolylineRef.current = polyline;
    mapRef.current.setView([targetLat, targetLng], 14, { animate: true });
  }, [selectedCallId, calls, tacticalUnits, mapReady]);

  const toggleUnits = useCallback(() => setShowUnits((v) => !v), []);

  return (
    <div className="relative h-full min-h-[450px] w-full flex-1 overflow-hidden bg-deep">
      {/* Map surface. The inline background beats Leaflet's own
          `.leaflet-container { background:#ddd }` rule, so no light-grey flash
          shows through while tiles load. */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 h-full min-h-[450px] w-full"
        style={{ width: '100%', height: '100%', backgroundColor: 'var(--deep)' }}
      />

      {/* Situational HUD (top-left). */}
      <div className="pointer-events-auto absolute left-4 top-4 z-[400] flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-[6px] border border-rule-strong bg-deep/85 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-safe" aria-hidden />
          <span className="label text-ink-2">Situational map</span>
          <span className="tnum text-2xs text-ink-4">
            {calls.length} incidents · {tacticalUnits.length} units
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-[6px] border border-rule-strong bg-deep/85 p-1">
          <button
            type="button"
            onClick={toggleUnits}
            aria-pressed={showUnits}
            className={
              showUnits
                ? 'inline-flex items-center gap-1.5 rounded-[4px] border border-accent bg-panel px-2.5 py-1 text-2xs font-medium uppercase tracking-wide text-ink'
                : 'inline-flex items-center gap-1.5 rounded-[4px] border border-transparent px-2.5 py-1 text-2xs font-medium uppercase tracking-wide text-ink-3 hover:text-ink-2'
            }
          >
            <Shield className="h-3 w-3" aria-hidden />
            Units ({tacticalUnits.length})
          </button>
        </div>
      </div>

      {/* Responder-vector badge (top-right). */}
      {selectedCallId && (
        <div className="absolute right-4 top-4 z-[400] flex items-center gap-2 rounded-[6px] border border-rule-strong bg-deep/85 px-3 py-2">
          <Navigation className="h-3.5 w-3.5 text-accent" aria-hidden />
          <span className="label text-ink-2">Responder vector active</span>
        </div>
      )}

      {/* Legend (bottom-left). */}
      <div className="absolute bottom-4 left-4 z-[400] flex items-center gap-3 rounded-[6px] border border-rule-strong bg-deep/85 px-3 py-2 text-2xs text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-critical" aria-hidden />
          P1 Critical
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-mild" aria-hidden />
          P2 High
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-safe" aria-hidden />
          P3 / P4
        </span>
      </div>
    </div>
  );
}
