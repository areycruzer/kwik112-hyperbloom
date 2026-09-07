/**
 * @module units
 * @description The responder fleet, lifted verbatim out of `EmergencyMap` so
 *              the situational map and the unit-roster module read the same
 *              source of truth and can never disagree about where a unit is or
 *              what it is doing. Add units here, not in a component.
 *
 *              The fleet is Delhi's, not a US city's. Kwik 112 sits on India's
 *              ERSS/Dial 112 stack, so the roster carries the appliances a Delhi
 *              control room actually dispatches — Delhi Police PCR vans, Delhi
 *              Fire Service tenders and a hydraulic platform, CATS ambulances —
 *              rather than the "Cruiser / Engine / Ladder / Medic" callsigns of
 *              American CAD, which no Indian dispatcher or judge would recognise.
 *
 *              Every unit also names the agency that owns it. The callsign alone
 *              does not carry that: an internal callsign like "Zebra 11" is what
 *              a control room says on the radio, but on screen it reads as a
 *              codeword, not as an Indian police vehicle. "PCR Van 11 · Delhi
 *              Police" needs no decoding.
 *
 *              Self-contained: it imports nothing from the rest of the project,
 *              so a plain `node --test` (or any component) can consume it
 *              without dragging in Leaflet or the design layer.
 */

export interface TacticalUnit {
  id: string;
  callsign: string;
  type: 'police' | 'fire' | 'ems';
  /** The service that owns the unit, spelled out — "Delhi Police", "CATS Delhi". */
  agency: string;
  lat: number;
  lng: number;
  status: 'available' | 'en-route' | 'on-scene' | 'busy';
  speed: string;
  assignedCallId?: string;
  capabilities?: Array<'police' | 'fire' | 'ems' | 'rescue' | 'als'>;
}

/**
 * Mock First Responder Fleet positioned around north-west Delhi (Rohini and
 * its surrounds), matching the incident coordinates the demo data uses.
 *
 * Naming follows the real services, in the words they use themselves:
 *   - PCR Van            → Delhi Police's Police Control Room response vehicle.
 *   - Fire Tender        → Delhi Fire Service's standard pumping appliance.
 *   - Hydraulic Platform → DFS aerial appliance; what reaches a fourth floor.
 *   - Ambulance / ALS    → CATS, the Centralised Accident & Trauma Services,
 *                          Delhi's public ambulance fleet. "ALS" is its
 *                          advanced life-support variant.
 */
export const TACTICAL_UNITS: TacticalUnit[] = [
  { id: 'PCR-11', callsign: 'PCR Van 11', agency: 'Delhi Police', type: 'police', capabilities: ['police'], lat: 28.7180, lng: 77.1100, status: 'available', speed: '0 km/h' },
  { id: 'DFS-204', callsign: 'Fire Tender 204', agency: 'Delhi Fire Service', type: 'fire', capabilities: ['fire'], lat: 28.6920, lng: 77.0850, status: 'en-route', speed: '48 km/h' },
  { id: 'DFS-211', callsign: 'Fire Tender 211', agency: 'Delhi Fire Service', type: 'fire', capabilities: ['fire'], lat: 28.7162, lng: 77.1125, status: 'available', speed: '0 km/h' },
  { id: 'DFS-206', callsign: 'Hydraulic Platform 206', agency: 'Delhi Fire Service', type: 'fire', capabilities: ['fire', 'rescue'], lat: 28.7241, lng: 77.1262, status: 'available', speed: '0 km/h' },
  { id: 'CATS-302', callsign: 'Ambulance 302', agency: 'CATS Delhi', type: 'ems', capabilities: ['ems', 'als'], lat: 28.7250, lng: 77.1350, status: 'available', speed: '0 km/h' },
  { id: 'PCR-24', callsign: 'PCR Van 24', agency: 'Delhi Police', type: 'police', capabilities: ['police'], lat: 28.6850, lng: 77.1200, status: 'available', speed: '12 km/h' },
  { id: 'CATS-309', callsign: 'ALS Ambulance 309', agency: 'CATS Delhi', type: 'ems', capabilities: ['ems', 'als'], lat: 28.7400, lng: 77.0900, status: 'available', speed: '0 km/h' },
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

/* ---- ETA ------------------------------------------------------------------
 * A dispatcher picks a unit on projected arrival time, not on raw distance: the
 * nearest appliance is not the fastest one when it is parked and another is
 * already rolling. So the roster shows both, and this is where the arrival
 * figure is derived.
 * ------------------------------------------------------------------------- */

/**
 * Running-speed assumption, km/h, for a unit that is currently stationary — at
 * a station or standing by. These are blue-light averages through Delhi traffic,
 * not free-flow limits: a tender is heavy and slow to clear junctions, a PCR van
 * filters through them fastest. They are an assumption, and the UI labels the
 * number an ETA (an estimate) rather than a promise.
 */
const DISPATCH_SPEED_KMH: Record<TacticalUnit['type'], number> = {
  police: 34,
  fire: 26,
  ems: 30,
};

/** @description Read the leading number out of a `"48 km/h"` speed string. */
export function speedKmh(speed: string | undefined): number {
  const match = /-?\d+(\.\d+)?/.exec(speed ?? '');
  const value = match ? Number(match[0]) : 0;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * @description Minutes until this unit reaches a point `distanceKm` away.
 *
 *              The projection runs at whichever is faster: the unit's measured
 *              speed, or its service's dispatch assumption. Measured speed alone
 *              is wrong in both directions — a parked unit reads 0 km/h and would
 *              never arrive, and a unit crawling through a jam at 12 km/h would
 *              be projected slower than an identical unit sitting at the station,
 *              when in fact it is closer and will run under blue light the moment
 *              it is assigned. Taking the faster of the two says: this unit
 *              responds at its service's normal speed, unless it is already
 *              beating it.
 *
 *              Rounded up — a dispatcher under-promising by a minute is safe,
 *              over-promising is not — and floored at 1, since a unit that is
 *              not already on scene cannot arrive in zero minutes.
 */
export function etaMinutes(unit: Pick<TacticalUnit, 'type' | 'speed'>, distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  const kmh = Math.max(speedKmh(unit.speed), DISPATCH_SPEED_KMH[unit.type]);
  return Math.max(1, Math.ceil((distanceKm / kmh) * 60));
}

/**
 * @description The ETA as shown to the operator, or an em-dash when there is no
 *              incident selected to measure to. Absence is a real state and is
 *              never dressed up as a zero.
 */
export function etaLabel(
  unit: Pick<TacticalUnit, 'type' | 'speed'>,
  distanceKm: number | null,
): string {
  if (distanceKm === null || !Number.isFinite(distanceKm)) return '—';
  const minutes = etaMinutes(unit, distanceKm);
  return minutes === 0 ? 'On scene' : `${minutes} min`;
}
