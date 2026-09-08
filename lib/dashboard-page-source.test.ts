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
