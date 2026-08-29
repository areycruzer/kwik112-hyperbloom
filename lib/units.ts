/**
 * @module units
 * @description The responder fleet, lifted verbatim out of `EmergencyMap` so
 *              the situational map and the unit-roster module read the same
 *              source of truth and can never disagree about where a unit is or
 *              what it is doing. Add units here, not in a component.
 *
 *              Self-contained: it imports nothing from the rest of the project,
 *              so a plain `node --test` (or any component) can consume it
 *              without dragging in Leaflet or the design layer.
 */

export interface TacticalUnit {
  id: string;
  callsign: string;
  type: 'police' | 'fire' | 'ems';
  lat: number;
  lng: number;
  status: 'available' | 'en-route' | 'on-scene' | 'busy';
  speed: string;
  assignedCallId?: string;
}

/**
 * Mock First Responder Fleet positioned around the city. Moved verbatim from
 * `EmergencyMap`'s former component state — same ids, callsigns, coordinates and
 * statuses — so the roster and the map markers stay in lockstep.
 */
export const TACTICAL_UNITS: TacticalUnit[] = [
  { id: 'PD-101', callsign: 'Cruiser 101', type: 'police', lat: 28.7180, lng: 77.1100, status: 'available', speed: '0 km/h' },
  { id: 'FD-204', callsign: 'Engine 204', type: 'fire', lat: 28.6920, lng: 77.0850, status: 'en-route', speed: '48 km/h' },
  { id: 'EMS-302', callsign: 'Medic 302', type: 'ems', lat: 28.7250, lng: 77.1350, status: 'available', speed: '0 km/h' },
  { id: 'PD-108', callsign: 'Interceptor 108', type: 'police', lat: 28.6850, lng: 77.1200, status: 'available', speed: '12 km/h' },
  { id: 'EMS-309', callsign: 'Air Rescue 1', type: 'ems', lat: 28.7400, lng: 77.0900, status: 'available', speed: '0 km/h' },
];

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * @description Great-circle distance between two lat/lng points, in kilometres,
 *              via the haversine formula. Used to read a unit's distance to the
 *              currently selected incident; the caller shows an em-dash when no
 *              incident is selected rather than passing a fabricated coordinate.
 */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
