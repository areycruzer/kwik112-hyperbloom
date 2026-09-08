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
 * Mock First Responder Fleet.
 *
 * The console serves incidents in nine cities, so the fleet is in nine cities.
 * It used to be Delhi-only while the demo data spanned the country, which meant
 * a Kolkata building collapse was assured against a Delhi appliance and the
 * console reported a 3,039-minute ETA — fifty hours — with a straight face.
 * Response assurance exists to catch a late response; measuring one against a
 * fleet 1,300 km away is not a check, it is noise. See the coverage test in
 * lib/units.test.ts, which fails if an incident city loses its units.
 *
 * Naming follows the real services, in the words they use themselves:
 *   - PCR Van            → Police Control Room response vehicle.
 *   - Fire / Rescue Tender, Hydraulic Platform → the fire service's pumping,
 *     technical-rescue and aerial appliances.
 *   - Ambulance / ALS    → the state ambulance service. Delhi runs CATS; most
 *     states run the 108 service.
 *
 * Every city outside Delhi carries one rescue-capable tender rather than
 * separate fire and rescue appliances: a rescue tender does both, and a
 * `rescue` request with no capable unit anywhere reports as uncovered.
 */
export const TACTICAL_UNITS: TacticalUnit[] = [
  // ---- Delhi (Rohini and surrounds) --------------------------------------
  { id: 'PCR-11', callsign: 'PCR Van 11', agency: 'Delhi Police', type: 'police', capabilities: ['police'], lat: 28.7180, lng: 77.1100, status: 'available', speed: '0 km/h' },
  // Rolling at 48 km/h but uncommitted — returning to station. It is 'available',
  // not 'en-route': see the status invariant below.
  { id: 'DFS-204', callsign: 'Fire Tender 204', agency: 'Delhi Fire Service', type: 'fire', capabilities: ['fire'], lat: 28.6920, lng: 77.0850, status: 'available', speed: '48 km/h' },
  { id: 'DFS-211', callsign: 'Fire Tender 211', agency: 'Delhi Fire Service', type: 'fire', capabilities: ['fire'], lat: 28.7162, lng: 77.1125, status: 'available', speed: '0 km/h' },
  { id: 'DFS-206', callsign: 'Hydraulic Platform 206', agency: 'Delhi Fire Service', type: 'fire', capabilities: ['fire', 'rescue'], lat: 28.7241, lng: 77.1262, status: 'available', speed: '0 km/h' },
  { id: 'CATS-302', callsign: 'Ambulance 302', agency: 'CATS Delhi', type: 'ems', capabilities: ['ems', 'als'], lat: 28.7250, lng: 77.1350, status: 'available', speed: '0 km/h' },
  { id: 'PCR-24', callsign: 'PCR Van 24', agency: 'Delhi Police', type: 'police', capabilities: ['police'], lat: 28.6850, lng: 77.1200, status: 'available', speed: '12 km/h' },
  { id: 'CATS-309', callsign: 'ALS Ambulance 309', agency: 'CATS Delhi', type: 'ems', capabilities: ['ems', 'als'], lat: 28.7400, lng: 77.0900, status: 'available', speed: '0 km/h' },

  // ---- Mumbai -------------------------------------------------------------
  { id: 'MUM-PCR-51', callsign: 'PCR Van 51', agency: 'Mumbai Police', type: 'police', capabilities: ['police'], lat: 18.9380, lng: 72.8280, status: 'available', speed: '0 km/h' },
  { id: 'MUM-FIRE-52', callsign: 'Rescue Tender 52', agency: 'Mumbai Fire Brigade', type: 'fire', capabilities: ['fire', 'rescue'], lat: 18.9560, lng: 72.8410, status: 'available', speed: '0 km/h' },
  { id: 'MUM-EMS-53', callsign: 'Ambulance 53', agency: '108 Ambulance · Maharashtra', type: 'ems', capabilities: ['ems', 'als'], lat: 18.9420, lng: 72.8250, status: 'available', speed: '0 km/h' },

  // ---- Bengaluru ----------------------------------------------------------
  { id: 'BLR-PCR-61', callsign: 'PCR Van 61', agency: 'Bengaluru City Police', type: 'police', capabilities: ['police'], lat: 12.9250, lng: 77.6150, status: 'available', speed: '0 km/h' },
  { id: 'BLR-FIRE-62', callsign: 'Rescue Tender 62', agency: 'Karnataka Fire & Emergency Services', type: 'fire', capabilities: ['fire', 'rescue'], lat: 12.9100, lng: 77.6320, status: 'available', speed: '0 km/h' },
  { id: 'BLR-EMS-63', callsign: 'Ambulance 63', agency: '108 Ambulance · Karnataka', type: 'ems', capabilities: ['ems', 'als'], lat: 12.9210, lng: 77.6100, status: 'available', speed: '0 km/h' },

  // ---- Kolkata ------------------------------------------------------------
  { id: 'KOL-PCR-71', callsign: 'PCR Van 71', agency: 'Kolkata Police', type: 'police', capabilities: ['police'], lat: 22.5800, lng: 88.3560, status: 'available', speed: '0 km/h' },
  { id: 'KOL-FIRE-72', callsign: 'Rescue Tender 72', agency: 'West Bengal Fire Service', type: 'fire', capabilities: ['fire', 'rescue'], lat: 22.5660, lng: 88.3720, status: 'available', speed: '0 km/h' },
  { id: 'KOL-EMS-73', callsign: 'Ambulance 73', agency: 'West Bengal EMS', type: 'ems', capabilities: ['ems', 'als'], lat: 22.5760, lng: 88.3500, status: 'available', speed: '0 km/h' },

  // ---- Chennai ------------------------------------------------------------
  { id: 'MAA-PCR-81', callsign: 'PCR Van 81', agency: 'Chennai City Police', type: 'police', capabilities: ['police'], lat: 13.0570, lng: 80.2750, status: 'available', speed: '0 km/h' },
  { id: 'MAA-FIRE-82', callsign: 'Rescue Tender 82', agency: 'Tamil Nadu Fire & Rescue Services', type: 'fire', capabilities: ['fire', 'rescue'], lat: 13.0430, lng: 80.2900, status: 'available', speed: '0 km/h' },
  { id: 'MAA-EMS-83', callsign: 'Ambulance 83', agency: '108 Ambulance · Tamil Nadu', type: 'ems', capabilities: ['ems', 'als'], lat: 13.0540, lng: 80.2690, status: 'available', speed: '0 km/h' },

  // ---- Hyderabad ----------------------------------------------------------
  { id: 'HYD-PCR-91', callsign: 'PCR Van 91', agency: 'Hyderabad City Police', type: 'police', capabilities: ['police'], lat: 17.4550, lng: 78.3610, status: 'available', speed: '0 km/h' },
  { id: 'HYD-FIRE-92', callsign: 'Rescue Tender 92', agency: 'Telangana Fire Services', type: 'fire', capabilities: ['fire', 'rescue'], lat: 17.4400, lng: 78.3760, status: 'available', speed: '0 km/h' },
  { id: 'HYD-EMS-93', callsign: 'Ambulance 93', agency: '108 Ambulance · Telangana', type: 'ems', capabilities: ['ems', 'als'], lat: 17.4510, lng: 78.3550, status: 'available', speed: '0 km/h' },

  // ---- Pune ---------------------------------------------------------------
  { id: 'PNQ-PCR-101', callsign: 'PCR Van 101', agency: 'Pune City Police', type: 'police', capabilities: ['police'], lat: 18.5280, lng: 73.8490, status: 'available', speed: '0 km/h' },
  { id: 'PNQ-FIRE-102', callsign: 'Rescue Tender 102', agency: 'Maharashtra Fire Services', type: 'fire', capabilities: ['fire', 'rescue'], lat: 18.5130, lng: 73.8640, status: 'available', speed: '0 km/h' },
  { id: 'PNQ-EMS-103', callsign: 'Ambulance 103', agency: '108 Ambulance · Maharashtra', type: 'ems', capabilities: ['ems', 'als'], lat: 18.5240, lng: 73.8430, status: 'available', speed: '0 km/h' },

  // ---- Ahmedabad ----------------------------------------------------------
  { id: 'AMD-PCR-111', callsign: 'PCR Van 111', agency: 'Ahmedabad City Police', type: 'police', capabilities: ['police'], lat: 23.0330, lng: 72.5620, status: 'available', speed: '0 km/h' },
  { id: 'AMD-FIRE-112', callsign: 'Rescue Tender 112', agency: 'Gujarat Fire Services', type: 'fire', capabilities: ['fire', 'rescue'], lat: 23.0190, lng: 72.5770, status: 'available', speed: '0 km/h' },
  { id: 'AMD-EMS-113', callsign: 'Ambulance 113', agency: '108 Ambulance · Gujarat', type: 'ems', capabilities: ['ems', 'als'], lat: 23.0290, lng: 72.5560, status: 'available', speed: '0 km/h' },

  // ---- Jaipur -------------------------------------------------------------
  { id: 'JAI-PCR-121', callsign: 'PCR Van 121', agency: 'Rajasthan Police', type: 'police', capabilities: ['police'], lat: 26.9310, lng: 75.8190, status: 'available', speed: '0 km/h' },
  { id: 'JAI-FIRE-122', callsign: 'Rescue Tender 122', agency: 'Rajasthan Fire Services', type: 'fire', capabilities: ['fire', 'rescue'], lat: 26.9170, lng: 75.8340, status: 'available', speed: '0 km/h' },
  { id: 'JAI-EMS-123', callsign: 'Ambulance 123', agency: '108 Ambulance · Rajasthan', type: 'ems', capabilities: ['ems', 'als'], lat: 26.9270, lng: 75.8130, status: 'available', speed: '0 km/h' },
];

/* ---- STATUS INVARIANT -----------------------------------------------------
 * A unit is 'en-route', 'on-scene' or 'busy' only when it is committed to a
 * call — i.e. only when it carries an `assignedCallId`. `applyUnitReservations`
 * maintains that when a dispatcher assigns one; the seed data above has to
 * respect it too.
 *
 * DFS-204 used to be seeded 'en-route' with nothing to be en route TO, and
 * three separate parts of the console believed it: the roster showed EN ROUTE
 * beside a button offering to dispatch it, the map drew it dimmed as though
 * committed, and — worst — `assessDispatch` filters candidates on
 * `status === 'available'`, so a working fire tender was silently excluded
 * from fire coverage. `no seeded unit is committed without a call` pins it.
 * ------------------------------------------------------------------------- */

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

/* ---- ROUTE FALLBACK -------------------------------------------------------
 * The situational map draws a responder vector from a unit to the selected
 * incident. assessDispatch can only nominate a unit when the call carries a
 * service-level dispatch plan, and most demo/stored calls carry none - so
 * without a fallback the vector silently never drew for them, which read as
 * "the distance feature is broken". These helpers pick the unit a dispatcher
 * would eyeball: the nearest available appliance of the right service.
 * ------------------------------------------------------------------------- */

/**
 * @description The service that would lead the response to an incident type,
 *              or null when the type says nothing (route from the nearest unit
 *              of any service instead). Deliberately duplicates the keyword
 *              logic of `glyphForIncidentType` rather than importing it: this
 *              module stays import-free so `node --test` can load it bare.
 */
export function serviceForIncidentType(incidentType?: string): TacticalUnit['type'] | null {
  if (!incidentType) return null;
  const t = incidentType.toLowerCase();
  if (t.includes('fire')) return 'fire';
  if (t.includes('medical') || t.includes('cardiac') || t.includes('health')) return 'ems';
  // A collision's first need is the casualty, so the ambulance leads.
  if (t.includes('accident') || t.includes('traffic') || t.includes('collision')) return 'ems';
  if (t.includes('crime') || t.includes('violen') || t.includes('robbery')) return 'police';
  // Flood and waterlogging rescue is fire-service work in Indian cities.
  if (t.includes('flood') || t.includes('water') || t.includes('drown')) return 'fire';
  if (t.includes('public_safety') || t.includes('utility') || t.includes('civic')) return 'fire';
  return null;
}

/**
 * @description The nearest unit worth drawing a vector from: available (or
 *              already assigned to this call), preferring the requested
 *              service and falling back to any service rather than to nothing.
 *              Returns null only when no unit qualifies at all.
 */
export function nearestAvailableUnit(
  units: readonly TacticalUnit[],
  lat: number,
  lng: number,
  service?: TacticalUnit['type'] | null,
  forCallId?: string,
): TacticalUnit | null {
  const usable = units.filter(
    (unit) =>
      (unit.status === 'available' || (forCallId && unit.assignedCallId === forCallId)) &&
      (!unit.assignedCallId || unit.assignedCallId === forCallId),
  );
  const pool = service ? usable.filter((unit) => unit.type === service) : usable;
  const candidates = pool.length > 0 ? pool : usable;
  let best: TacticalUnit | null = null;
  let bestKm = Infinity;
  for (const unit of candidates) {
    const km = haversineKm(unit.lat, unit.lng, lat, lng);
    if (km < bestKm) {
      bestKm = km;
      best = unit;
    }
  }
  return best;
}
