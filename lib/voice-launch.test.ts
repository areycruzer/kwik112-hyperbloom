import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldAutoLaunchVoiceStation, VOICE_STATION_HREF } from './voice-launch.ts';

test('landing voice-station URL carries an explicit launch intent', () => {
  const url = new URL(VOICE_STATION_HREF, 'https://example.test');

  assert.equal(shouldAutoLaunchVoiceStation(url.search, url.hash), true);
});

test('voice station opens from either the launch query or canonical hash', () => {
  assert.equal(shouldAutoLaunchVoiceStation('?startCall=1', ''), true);
  assert.equal(shouldAutoLaunchVoiceStation('', '#voice-station'), true);
  assert.equal(shouldAutoLaunchVoiceStation('?startCall=0', '#monitoring'), false);
  assert.equal(shouldAutoLaunchVoiceStation('?unrelated=1', ''), false);
});
