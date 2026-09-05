import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compactIncidentSummary,
  dashboardHeaderMetrics,
  dashboardRegionVisibility,
  defaultMobileIncidentOpen,
  defaultUnitPanelOpen,
  mobileNavigationInset,
  unitRosterAccessibleLabel,
} from './dashboard-presentation.ts';
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
