import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateMetrics, compareCase } from './score.ts';
import type { EvaluationCase, EvaluationPrediction } from './types.ts';

const expectedCase: EvaluationCase = {
  id: 'held-en-cardiac-01',
  split: 'held_out',
  language: 'en',
  tags: ['critical'],
  transcript: 'My father has no pulse at Gate 2 of New Delhi Railway Station.',
  expected: {
    incident_type: 'medical_emergency',
    severity: 'critical',
    location_required: true,
    expected_location_terms: ['gate 2', 'new delhi railway station'],
  },
};

const prediction = (severity: EvaluationPrediction['severity']): EvaluationPrediction => ({
  incident_type: 'medical_emergency',
  severity,
  location_text: 'Gate 2, New Delhi Railway Station',
  method: 'keyword',
  latency_ms: 4,
  fell_back: false,
});

test('compareCase identifies critical false negative and under-triage', () => {
  const result = compareCase(expectedCase, prediction('high'));
  assert.equal(result.critical_false_negative, true);
  assert.equal(result.under_triage, true);
  assert.equal(result.over_triage, false);
});

test('aggregateMetrics returns null for a slice with no critical cases', () => {
  const result = compareCase(
    { ...expectedCase, expected: { ...expectedCase.expected, severity: 'low' }, tags: [] },
    prediction('low'),
  );
  assert.equal(aggregateMetrics([result]).critical_recall, null);
});

test('location matching is case-insensitive and requires every expected term', () => {
  assert.equal(compareCase(expectedCase, prediction('critical')).location_match, true);
  const missingGate = { ...prediction('critical'), location_text: 'New Delhi Railway Station' };
  assert.equal(compareCase(expectedCase, missingGate).location_match, false);
});
