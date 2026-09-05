import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyUnitReservations,
  readUnitReservations,
  releaseUnits,
  reserveUnits,
} from './dispatch-reservations.ts';
import type { TacticalUnit } from './units.ts';

const STORAGE_KEY = 'dispatch_unit_reservations';

type MutableGlobal = { window?: unknown };

function installFakeWindow(store: Record<string, string> = {}): void {
  (globalThis as unknown as MutableGlobal).window = {
    localStorage: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
    },
  };
}

function removeFakeWindow(): void {
  delete (globalThis as unknown as MutableGlobal).window;
}

const fleet: TacticalUnit[] = [
  { id: 'EMS-1', callsign: 'Medic 1', type: 'ems', capabilities: ['ems', 'als'], lat: 28.7, lng: 77.1, status: 'available', speed: '0 km/h' },
  { id: 'EMS-2', callsign: 'Medic 2', type: 'ems', capabilities: ['ems', 'als'], lat: 28.8, lng: 77.2, status: 'available', speed: '0 km/h' },
];

test('confirmed units become unavailable to other incidents but remain visible to their own call', async () => {
  installFakeWindow();
  try {
    assert.deepEqual(await reserveUnits('call-a', ['EMS-1']), { ok: true, conflicts: [] });
    assert.deepEqual(readUnitReservations(), { 'EMS-1': 'call-a' });

    const forOtherCall = applyUnitReservations(fleet, 'call-b');
    assert.equal(forOtherCall[0]?.assignedCallId, 'call-a');
    assert.equal(forOtherCall[0]?.status, 'busy');

    const forOwningCall = applyUnitReservations(fleet, 'call-a');
    assert.equal(forOwningCall[0]?.assignedCallId, 'call-a');
    assert.equal(forOwningCall[0]?.status, 'en-route');
  } finally {
    removeFakeWindow();
  }
});

test('reservation rejects a unit already committed to a different incident', async () => {
  installFakeWindow({ [STORAGE_KEY]: JSON.stringify({ 'EMS-1': 'call-a' }) });
  try {
    assert.deepEqual(await reserveUnits('call-b', ['EMS-1', 'EMS-2']), {
      ok: false,
      conflicts: ['EMS-1'],
    });
    assert.deepEqual(readUnitReservations(), { 'EMS-1': 'call-a' });
  } finally {
    removeFakeWindow();
  }
});

test('resolution releases only units owned by that incident', async () => {
  installFakeWindow({
    [STORAGE_KEY]: JSON.stringify({ 'EMS-1': 'call-a', 'EMS-2': 'call-b' }),
  });
  try {
    await releaseUnits('call-a');
    assert.deepEqual(readUnitReservations(), { 'EMS-2': 'call-b' });
  } finally {
    removeFakeWindow();
  }
});
