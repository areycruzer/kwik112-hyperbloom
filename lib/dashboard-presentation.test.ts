import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compactIncidentSummary,
  dashboardHeaderMetrics,
  dashboardRegionVisibility,
  defaultMobileIncidentOpen,
  defaultUnitPanelOpen,
  mobileNavigationInset,
  nextLiveCallPayload,
  presentLiveCall,
  unitRosterAccessibleLabel,
} from './dashboard-presentation.ts';
import type { KwikLiveCallPayload } from './live-call.ts';
import type { EmergencyCall } from './types.ts';

const calls = [
  { severity: 'critical' },
  { severity: 'high' },
  { severity: 'critical' },
] as EmergencyCall[];

test('dashboard header exposes each operational count once', () => {
  assert.deepEqual(dashboardHeaderMetrics(calls, 4), [
    { label: 'Incidents', value: 3, tone: 'default' },
    { label: 'Critical', value: 2, tone: 'critical' },
    { label: 'Open alerts', value: 4, tone: 'warning' },
  ]);
});

test('queue summary stays compact while preserving the full first words', () => {
  const summary = 'A very long emergency summary '.repeat(10).trim();
  const compact = compactIncidentSummary(summary, 80);

  assert.ok(compact.length <= 80);
  assert.match(compact, /^A very long emergency summary/);
  assert.match(compact, /…$/);
  assert.equal(compact.includes('  '), false);
});

test('short queue summaries remain unchanged', () => {
  assert.equal(compactIncidentSummary('  Fire near Demo Chowk.  '), 'Fire near Demo Chowk.');
});

test('unit panel starts closed on tablet and open on wide desktop', () => {
  assert.equal(defaultUnitPanelOpen(768), false);
  assert.equal(defaultUnitPanelOpen(1279), false);
  assert.equal(defaultUnitPanelOpen(1280), true);
  assert.equal(defaultUnitPanelOpen(1536), true);
});

test('phone layout reserves the full content width for the map', () => {
  assert.deepEqual(dashboardRegionVisibility(390), {
    showModuleRail: true,
    showIncidentSidebar: false,
  });
  assert.deepEqual(dashboardRegionVisibility(768), {
    showModuleRail: true,
    showIncidentSidebar: true,
  });
  assert.equal(defaultMobileIncidentOpen(390), true);
  assert.equal(defaultMobileIncidentOpen(768), false);
  assert.equal(mobileNavigationInset(390), 56);
  assert.equal(mobileNavigationInset(768), 0);
});

test('unit roster accessible label includes operational context', () => {
  assert.equal(
    unitRosterAccessibleLabel(
      { id: 'EMS-302', callsign: 'Medic 302', type: 'ems', speed: '42 km/h', status: 'available' },
      '1.7 km',
    ),
    'Medic 302, EMS unit EMS-302, Ready, 1.7 km away, speed 42 km/h',
  );
});

test('live call presentation exposes recent turns and deterministic provenance', () => {
  const payload: KwikLiveCallPayload = {
    version: 1,
    state: 'update',
    callId: 'live-112',
    at: '2026-09-07T10:00:03.000Z',
    transcript: [
      { role: 'user', text: 'First caller detail', timestamp: '2026-09-07T10:00:00.000Z' },
      { role: 'assistant', text: 'What is your location?', timestamp: '2026-09-07T10:00:01.000Z' },
      { role: 'user', text: 'Sample Metro Gate 1', timestamp: '2026-09-07T10:00:02.000Z' },
    ],
    detectedLanguage: 'hi',
    prosodySource: 'measured',
    grade: {
      incidentType: 'medical_emergency',
      incidentSubtype: 'cardiac event',
      severity: 'critical',
      severityScore: 100,
      priorityCode: 'P1',
      location: { address: 'Sample Metro Gate 1' },
      summary: 'Caller reports no pulse.',
      method: 'keyword',
    },
  };

  assert.deepEqual(presentLiveCall(payload, 2), {
    turns: [
      { speaker: 'Dispatcher', text: 'What is your location?' },
      { speaker: 'Caller', text: 'Sample Metro Gate 1' },
    ],
    language: 'HI',
    prosody: 'Measured',
    grade: 'Current grade: CRITICAL (rules)',
  });
});

test('live call presentation identifies a caller that has not produced a grade', () => {
  const payload: KwikLiveCallPayload = {
    version: 1,
    state: 'start',
    callId: 'live-112',
    at: '2026-09-07T10:00:00.000Z',
    transcript: [],
    detectedLanguage: null,
    prosodySource: 'absent',
    grade: null,
  };

  assert.deepEqual(presentLiveCall(payload), {
    turns: [],
    language: 'Detecting',
    prosody: 'Absent',
    grade: 'Waiting for caller',
  });
});

function livePayload(
  state: KwikLiveCallPayload['state'],
  callId: string,
  at: string,
): KwikLiveCallPayload {
  const base = {
    version: 1,
    state,
    callId,
    at,
    transcript: [],
    detectedLanguage: null,
    prosodySource: 'absent',
    grade: null,
  } as const;
  return base as KwikLiveCallPayload;
}

test('valid events progress one live call and a matching same-time end clears it', () => {
  const start = livePayload('start', 'call-a', '2026-09-07T10:00:00.000Z');
  const update = livePayload('update', 'call-a', '2026-09-07T10:00:01.000Z');
  const end = livePayload('end', 'call-a', '2026-09-07T10:00:01.000Z');

  assert.equal(nextLiveCallPayload(null, start), start);
  assert.equal(nextLiveCallPayload(start, update), update);
  assert.equal(nextLiveCallPayload(update, end), null);
});

test('stale starts and updates cannot roll back the current call', () => {
  const current = livePayload('update', 'call-a', '2026-09-07T10:00:02.000Z');
  const staleStart = livePayload('start', 'call-a', '2026-09-07T10:00:00.000Z');
  const staleUpdate = livePayload('update', 'call-a', '2026-09-07T10:00:01.000Z');

  assert.equal(nextLiveCallPayload(current, staleStart), current);
  assert.equal(nextLiveCallPayload(current, staleUpdate), current);
});

test('an older same-call end cannot clear the active call', () => {
  const current = livePayload('update', 'call-a', '2026-09-07T10:00:02.000Z');
  const staleEnd = livePayload('end', 'call-a', '2026-09-07T10:00:01.000Z');

  assert.equal(nextLiveCallPayload(current, staleEnd), current);
});

test('interleaved sessions only switch on a newer start event', () => {
  const current = livePayload('update', 'call-a', '2026-09-07T10:00:02.000Z');
  const otherUpdate = livePayload('update', 'call-b', '2026-09-07T10:00:03.000Z');
  const otherEnd = livePayload('end', 'call-b', '2026-09-07T10:00:04.000Z');
  const staleOtherStart = livePayload('start', 'call-b', '2026-09-07T10:00:01.000Z');
  const newerOtherStart = livePayload('start', 'call-b', '2026-09-07T10:00:05.000Z');

  assert.equal(nextLiveCallPayload(current, otherUpdate), current);
  assert.equal(nextLiveCallPayload(current, otherEnd), current);
  assert.equal(nextLiveCallPayload(current, staleOtherStart), current);
  assert.equal(nextLiveCallPayload(current, newerOtherStart), newerOtherStart);
});

test('invalid timestamps cannot displace a valid current session', () => {
  const current = livePayload('update', 'call-a', '2026-09-07T10:00:02.000Z');

  for (const state of ['start', 'update', 'end'] as const) {
    const incoming = livePayload(state, state === 'start' ? 'call-b' : 'call-a', 'not-a-date');
    assert.equal(nextLiveCallPayload(current, incoming), current);
  }
});

test('a valid event recovers deterministically from an invalid current timestamp', () => {
  const current = livePayload('update', 'call-a', 'not-a-date');
  const sameCallUpdate = livePayload('update', 'call-a', '2026-09-07T10:00:03.000Z');
  const newerStart = livePayload('start', 'call-b', '2026-09-07T10:00:04.000Z');
  const unknownUpdate = livePayload('update', 'call-b', 'also-not-a-date');

  assert.equal(nextLiveCallPayload(current, sameCallUpdate), sameCallUpdate);
  assert.equal(nextLiveCallPayload(current, newerStart), newerStart);
  assert.equal(nextLiveCallPayload(current, unknownUpdate), current);
});
