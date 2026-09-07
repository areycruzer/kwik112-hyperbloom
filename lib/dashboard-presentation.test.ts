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

test('a late end event cannot clear a newer live call', () => {
  const current = {
    version: 1,
    state: 'start',
    callId: 'new-call',
    at: '2026-09-07T10:00:02.000Z',
    transcript: [],
    detectedLanguage: null,
    prosodySource: 'absent',
    grade: null,
  } satisfies KwikLiveCallPayload;
  const staleEnd = {
    ...current,
    state: 'end',
    callId: 'old-call',
  } satisfies KwikLiveCallPayload;
  const matchingEnd = { ...staleEnd, callId: 'new-call' } satisfies KwikLiveCallPayload;

  assert.equal(nextLiveCallPayload(current, staleEnd), current);
  assert.equal(nextLiveCallPayload(current, matchingEnd), null);
});
