import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TACTICAL_UNITS,
  etaLabel,
  etaMinutes,
  haversineKm,
  nearestAvailableUnit,
  serviceForIncidentType,
  speedKmh,
} from './units.ts';

test('the fleet is an Indian one, with no American CAD callsigns left', () => {
  // Kwik 112 runs on India's ERSS stack; "Cruiser / Engine / Ladder / Medic"
  // are US nomenclature and were the single loudest wrong note on the console.
  const callsigns = TACTICAL_UNITS.map((u) => u.callsign).join(' | ');
  for (const foreign of ['Cruiser', 'Engine ', 'Ladder', 'Medic', 'Air Rescue', 'Interceptor']) {
    assert.ok(!callsigns.includes(foreign), `${foreign} is not an Indian appliance name`);
  }

  // Each service is named the way its own Delhi agency names it.
  const byType = (type: string) => TACTICAL_UNITS.filter((u) => u.type === type);
  assert.ok(byType('police').every((u) => /PCR/.test(u.callsign)));
  assert.ok(byType('fire').every((u) => /Tender|Hydraulic Platform/.test(u.callsign)));
  assert.ok(byType('ems').every((u) => /Ambulance/.test(u.callsign)));

  // And every unit names the agency that owns it, spelled out. This is what
  // makes the roster legible as Indian at a glance: a callsign on its own reads
  // as a codeword, "Delhi Fire Service" does not.
  const AGENCY = { police: 'Delhi Police', fire: 'Delhi Fire Service', ems: 'CATS Delhi' };
  for (const unit of TACTICAL_UNITS) {
    assert.equal(unit.agency, AGENCY[unit.type], `${unit.id} must name its agency`);
  }

  // Ids stay unique and service-prefixed, since dispatch reservations key on them.
  assert.equal(new Set(TACTICAL_UNITS.map((u) => u.id)).size, TACTICAL_UNITS.length);
});

test('speedKmh reads the number out of a speed string, and treats absence as zero', () => {
  assert.equal(speedKmh('48 km/h'), 48);
  assert.equal(speedKmh('0 km/h'), 0);
  assert.equal(speedKmh(undefined), 0);
  assert.equal(speedKmh('unknown'), 0);
});

test('a unit already beating its service speed is projected at its own speed', () => {
  // 12 km at a measured 48 km/h — well above the fire dispatch assumption — is
  // 15 minutes.
  assert.equal(etaMinutes({ type: 'fire', speed: '48 km/h' }, 12), 15);
});

test('a stationary unit falls back to its service dispatch speed, not to zero', () => {
  // Dividing by a measured 0 km/h would give Infinity; each service has an
  // assumed running speed instead. A tender is slower than a PCR van, so the
  // same distance must project a longer fire ETA.
  const distance = 10;
  const police = etaMinutes({ type: 'police', speed: '0 km/h' }, distance);
  const fire = etaMinutes({ type: 'fire', speed: '0 km/h' }, distance);
  assert.ok(Number.isFinite(police) && police > 0);
  assert.ok(fire > police, 'a heavy appliance must not be projected faster than a PCR van');
});

test('a unit crawling in traffic is not projected slower than one at the station', () => {
  // The bug this pins: projecting purely on measured speed made a PCR van
  // stuck at 12 km/h look 3x further out than an identical van parked at a
  // station, which is backwards — it is closer, and it runs blue-light once
  // assigned.
  const crawling = etaMinutes({ type: 'police', speed: '12 km/h' }, 3.8);
  const parked = etaMinutes({ type: 'police', speed: '0 km/h' }, 3.8);
  assert.equal(crawling, parked);
  assert.ok(crawling < 10, `expected a single-digit ETA over 3.8 km, got ${crawling}`);
});

test('ETA rounds up and never reads as an instant arrival', () => {
  // 0.05 km at 34 km/h is ~5 seconds; rounding down would print "0 min" and
  // promise the operator an arrival that has not happened.
  assert.equal(etaMinutes({ type: 'police', speed: '0 km/h' }, 0.05), 1);
});

test('with no incident selected the ETA is an em-dash, never a fabricated number', () => {
  assert.equal(etaLabel({ type: 'ems', speed: '0 km/h' }, null), '—');
  assert.equal(etaLabel({ type: 'ems', speed: '30 km/h' }, 15), '30 min');
});

test('haversine measures the distance between two Delhi coordinates', () => {
  const km = haversineKm(28.7041, 77.1025, 28.7241, 77.1262);
  assert.ok(km > 2 && km < 4, `expected a few km across Rohini, got ${km}`);
  assert.equal(haversineKm(28.7041, 77.1025, 28.7041, 77.1025), 0);
});

test('incident types map to the service that would lead the response', () => {
  assert.equal(serviceForIncidentType('fire'), 'fire');
  assert.equal(serviceForIncidentType('medical_emergency'), 'ems');
  assert.equal(serviceForIncidentType('traffic_collision'), 'ems');
  assert.equal(serviceForIncidentType('crime'), 'police');
  assert.equal(serviceForIncidentType('flood_rescue'), 'fire');
  // An unknown type nominates no service, so the caller routes from the
  // nearest unit of any kind rather than guessing a wrong one.
  assert.equal(serviceForIncidentType('something else'), null);
  assert.equal(serviceForIncidentType(undefined), null);
});

test('nearestAvailableUnit prefers the requested service over raw distance', () => {
  // Around the Rohini fixture: the nearest EMS unit is further than several
  // police/fire units, but a cardiac call must still route from an ambulance.
  const cardiac = nearestAvailableUnit(TACTICAL_UNITS, 28.7041, 77.1025, 'ems');
  assert.ok(cardiac, 'a unit must be found');
  assert.equal(cardiac!.type, 'ems');
});

test('nearestAvailableUnit falls back to any service rather than to nothing', () => {
  // Ask for EMS from a fleet that has none: a vector from the nearest police
  // van beats a map with no vector at all - the whole bug this guards was the
  // vector silently not drawing.
  const noEms = TACTICAL_UNITS.filter((u) => u.type !== 'ems');
  const unit = nearestAvailableUnit(noEms, 28.7041, 77.1025, 'ems');
  assert.ok(unit, 'must fall back to some unit');
  assert.notEqual(unit!.type, 'ems');
});

test('nearestAvailableUnit skips units reserved for other calls', () => {
  const fleet = TACTICAL_UNITS.map((u) =>
    u.type === 'ems' ? { ...u, assignedCallId: 'other-call' } : u,
  );
  const unit = nearestAvailableUnit(fleet, 28.7041, 77.1025, 'ems', 'my-call');
  assert.ok(unit);
  // Every EMS unit is spoken for by another call, so the fallback pool wins.
  assert.notEqual(unit!.type, 'ems');

  // But a unit reserved for THIS call is fair game - it is the response.
  const mine = TACTICAL_UNITS.map((u) =>
    u.id === 'CATS-302' ? { ...u, status: 'busy' as const, assignedCallId: 'my-call' } : u,
  );
  const own = nearestAvailableUnit(mine, 28.725, 77.135, 'ems', 'my-call');
  assert.equal(own?.id, 'CATS-302');
});
