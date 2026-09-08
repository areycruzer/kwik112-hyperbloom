import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommendUnits } from './unit-recommendation.ts';

test('each incident type gets the services that actually respond to it', () => {
  assert.deepEqual(recommendUnits('fire', 'high'), [
    'Fire Engine',
    'Rescue Ladder',
    'ALS Ambulance',
  ]);
  assert.ok(recommendUnits('crime', 'high').includes('Police Patrol'));
  assert.ok(recommendUnits('accident', 'high').includes('ALS Ambulance'));
});

test('a critical grade puts advanced life support in front, whatever the type', () => {
  // The one thing that cannot wait for a second opinion is a dying patient, so
  // ALS leads even on a crime or a utility call.
  for (const type of ['fire', 'crime', 'public_safety', 'accident', 'medical_emergency']) {
    assert.equal(
      recommendUnits(type, 'critical')[0],
      'Advanced Life Support Ambulance',
      `${type} at critical must lead with ALS`,
    );
  }
  assert.notEqual(recommendUnits('crime', 'low')[0], 'Advanced Life Support Ambulance');
});

test('an unmapped incident type still yields a response, never an empty list', () => {
  // This is the console's fallback proposal. Returning [] would put it back to
  // printing "No units recommended yet" on exactly the calls nobody has
  // classified - the ones most in need of a starting point.
  const unknown = recommendUnits('something nobody mapped', 'high');
  assert.ok(unknown.length > 0);
  assert.deepEqual(unknown, ['Nearest Available Unit', 'Field Supervisor']);
});
