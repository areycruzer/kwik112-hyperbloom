import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyTimeline,
  recordDecision,
  currentPoint,
  isComplete,
  DECISION_POINTS,
} from './timeline.ts';

test('a fresh timeline starts at INTAKE and is incomplete', () => {
  const t = emptyTimeline('c1');
  assert.equal(currentPoint(t), 'INTAKE');
  assert.equal(isComplete(t), false);
  assert.deepEqual([...DECISION_POINTS], ['INTAKE', 'DISPATCH', 'RESOLUTION']);
});

test('recording advances to the next point', () => {
  let t = emptyTimeline('c1');
  t = recordDecision(t, { point: 'INTAKE', action: 'confirmed', at: '2026-08-29T12:00:00Z' });
  assert.equal(currentPoint(t), 'DISPATCH');
});

test('completing every point marks the timeline complete', () => {
  let t = emptyTimeline('c1');
  for (const point of DECISION_POINTS) {
    t = recordDecision(t, { point, action: 'confirmed', at: '2026-08-29T12:00:00Z' });
  }
  assert.equal(isComplete(t), true);
  assert.equal(currentPoint(t), null);
});

test('recording the same point twice replaces rather than duplicates', () => {
  let t = emptyTimeline('c1');
  t = recordDecision(t, { point: 'INTAKE', action: 'confirmed', at: '2026-08-29T12:00:00Z' });
  t = recordDecision(t, {
    point: 'INTAKE', action: 'overridden', at: '2026-08-29T12:05:00Z', note: 'wrong address',
  });
  assert.equal(t.records.length, 1);
  assert.equal(t.records[0].action, 'overridden');
  assert.equal(t.records[0].note, 'wrong address');
});

test('recordDecision does not mutate its input', () => {
  const t = emptyTimeline('c1');
  const next = recordDecision(t, { point: 'INTAKE', action: 'confirmed', at: 'x' });
  assert.equal(t.records.length, 0);
  assert.equal(next.records.length, 1);
});
