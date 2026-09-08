import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import path from 'node:path';

test('dashboard keeps the call station without the redundant start-here band', async () => {
  const dashboardSource = await readFile(path.join(process.cwd(), 'app', 'dashboard', 'page.tsx'), 'utf8');

  assert.ok(
    dashboardSource.includes('<StartEmergencyCall'),
    'dashboard must keep the functional emergency call station',
  );
  assert.ok(
    !dashboardSource.includes('Place a 112 call — start here'),
    'dashboard should not render the redundant top start-here band',
  );
});

test('incident detail keeps dispatch focused instead of repeating operator checklists', async () => {
  const dashboardSource = await readFile(path.join(process.cwd(), 'app', 'dashboard', 'page.tsx'), 'utf8');

  assert.ok(
    !dashboardSource.includes('IncidentActionChecklistPanel'),
    'incident detail should not render the separate next-action checklist panel',
  );
  assert.ok(
    !dashboardSource.includes('Operator actions'),
    'incident detail should not render a separate operator-actions section',
  );
  assert.ok(
    !dashboardSource.includes('Operator next questions'),
    'incident detail should not repeat missing-info questions as another section',
  );
  assert.ok(
    dashboardSource.includes('DispatchSuggestedUnitsPanel'),
    'incident detail should use one focused suggested-dispatch panel',
  );
});

test('decision timeline uses compact proposal rows rather than large repeated cards', async () => {
  const timelineSource = await readFile(path.join(process.cwd(), 'components', 'IncidentTimeline.tsx'), 'utf8');

  assert.ok(!timelineSource.includes('AI proposal'), 'timeline should not label each step as a large AI proposal card');
  assert.ok(!timelineSource.includes('Locked'), 'future timeline steps should be compact pending rows, not locked cards');
  assert.ok(
    timelineSource.includes('DecisionStepRow'),
    'timeline should render each decision point through the compact row component',
  );
});

test('voice station cannot stay forever on the opening socket state', async () => {
  const voiceSource = await readFile(path.join(process.cwd(), 'components', 'StartEmergencyCall.tsx'), 'utf8');

  assert.ok(
    voiceSource.includes('VOICE_CONNECT_TIMEOUT_MS'),
    'live voice connection should have an explicit timeout',
  );
  assert.ok(
    voiceSource.includes('The live voice session is taking too long to open'),
    'timeout should give the caller an actionable fallback instead of a permanent spinner',
  );
});
