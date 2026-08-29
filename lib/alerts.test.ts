import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveAlerts, type AlertInput } from './alerts.ts';

const NOW = Date.parse('2026-08-29T12:00:00.000Z');
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

function call(over: Partial<AlertInput> = {}): AlertInput {
  return {
    id: 'c1',
    severity: 'medium',
    status: 'active',
    created_at: ago(10),
    ai_confidence: 0.9,
    caller_location: { latitude: 28.6, longitude: 77.2 },
    ...over,
  };
}

test('a call with no coordinates raises LOCATION_UNRESOLVED', () => {
  const alerts = deriveAlerts([call({ caller_location: {} })], NOW);
  assert.equal(alerts.filter((a) => a.code === 'LOCATION_UNRESOLVED').length, 1);
});

test('a placed call raises no location alert', () => {
  const alerts = deriveAlerts([call()], NOW);
  assert.equal(alerts.filter((a) => a.code === 'LOCATION_UNRESOLVED').length, 0);
});

test('a critical call unassigned beyond 90s raises P1_UNASSIGNED', () => {
  const late = deriveAlerts([call({ severity: 'critical', created_at: ago(120) })], NOW);
  assert.equal(late.filter((a) => a.code === 'P1_UNASSIGNED').length, 1);

  const fresh = deriveAlerts([call({ severity: 'critical', created_at: ago(30) })], NOW);
  assert.equal(fresh.filter((a) => a.code === 'P1_UNASSIGNED').length, 0);
});

test('a dispatched critical call does not raise P1_UNASSIGNED', () => {
  const alerts = deriveAlerts(
    [call({ severity: 'critical', status: 'dispatched', created_at: ago(600) })],
    NOW,
  );
  assert.equal(alerts.filter((a) => a.code === 'P1_UNASSIGNED').length, 0);
});

test('low model confidence raises LOW_CONFIDENCE', () => {
  const alerts = deriveAlerts([call({ ai_confidence: 0.3 })], NOW);
  assert.equal(alerts.filter((a) => a.code === 'LOW_CONFIDENCE').length, 1);
});

test('an escalation flag raises MODEL_ESCALATED', () => {
  const alerts = deriveAlerts([call({ model_escalated: true })], NOW);
  assert.equal(alerts.filter((a) => a.code === 'MODEL_ESCALATED').length, 1);
});

test('an unresolved call older than 30 minutes goes stale', () => {
  const alerts = deriveAlerts([call({ created_at: ago(2000) })], NOW);
  assert.equal(alerts.filter((a) => a.code === 'STALE_INCIDENT').length, 1);
});

test('a resolved call raises nothing', () => {
  const alerts = deriveAlerts(
    [call({ status: 'resolved', created_at: ago(9999), caller_location: {}, ai_confidence: 0.1 })],
    NOW,
  );
  assert.deepEqual(alerts, []);
});

test('keys are stable and unique per call and code', () => {
  const alerts = deriveAlerts([call({ id: 'x1', caller_location: {}, ai_confidence: 0.2 })], NOW);
  const keys = alerts.map((a) => a.key);
  assert.deepEqual([...new Set(keys)], keys);
  assert.ok(keys.every((k) => k.startsWith('x1:')));
});
