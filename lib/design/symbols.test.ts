import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSymbol,
  severityColor,
  distressColor,
  glyphForIncidentType,
} from './symbols.ts';

test('severity maps to the documented signal colours', () => {
  assert.equal(severityColor('critical'), '#F40000'); // CRITICAL
  assert.equal(severityColor('high'), '#FABC1F');     // MILD (P2)
  assert.equal(severityColor('medium'), '#47FF85');   // SAFE (P3)
  assert.equal(severityColor('low'), '#47FF85');      // SAFE (P4)
  assert.equal(severityColor(undefined), '#9F9F9F');  // ungraded → neutral ink
});

test('incident type maps onto a known glyph, unknown falls through', () => {
  assert.equal(glyphForIncidentType('fire'), 'fire');
  assert.equal(glyphForIncidentType('medical_emergency'), 'medical');
  assert.equal(glyphForIncidentType('accident'), 'traffic');
  assert.equal(glyphForIncidentType('crime'), 'crime');
  assert.equal(glyphForIncidentType('public_safety'), 'utility');
  assert.equal(glyphForIncidentType('something we never saw'), 'unknown');
  assert.equal(glyphForIncidentType(undefined), 'unknown');
});

test('distress colour ramps calm to peak', () => {
  assert.equal(distressColor(0), '#47FF85');
  assert.equal(distressColor(100), '#F40000');
  // Midpoint sits between the two endpoints, not equal to either.
  const mid = distressColor(50);
  assert.notEqual(mid, '#47FF85');
  assert.notEqual(mid, '#F40000');
  assert.match(mid, /^#[0-9A-F]{6}$/i);
});

test('an incident renders a filled triangle in its severity colour', () => {
  const svg = buildSymbol({ kind: 'incident', glyph: 'fire', severity: 'critical' });
  assert.match(svg, /<svg/);
  assert.match(svg, /data-kind="incident"/);
  assert.match(svg, /#F40000/);
  // Incident frame is an upward-pointing filled triangle.
  assert.match(svg, /<polygon/);
});

test('a unit renders a filled circle in its service colour', () => {
  const svg = buildSymbol({ kind: 'unit', glyph: 'police', service: 'police' });
  assert.match(svg, /data-kind="unit"/);
  assert.match(svg, /#69D2FF/);
  // Unit frame is a filled circle.
  assert.match(svg, /<circle/);
});

test('the distress ring appears only when prosody exists', () => {
  const withProsody = buildSymbol({
    kind: 'incident', glyph: 'medical', severity: 'high', distress: 70,
  });
  assert.match(withProsody, /data-distress="70"/);

  const noProsody = buildSymbol({
    kind: 'incident', glyph: 'medical', severity: 'high', distress: null,
  });
  assert.doesNotMatch(noProsody, /data-distress/);

  // Zero distress is a measurement and must still draw, so absence is
  // visually distinct from calm.
  const calm = buildSymbol({
    kind: 'incident', glyph: 'medical', severity: 'high', distress: 0,
  });
  assert.match(calm, /data-distress="0"/);
});

test('labels are escaped so a symbol can never inject markup', () => {
  const svg = buildSymbol({
    kind: 'incident',
    glyph: 'fire',
    severity: 'critical',
    label: '<img src=x onerror="alert(1)">',
  });
  assert.doesNotMatch(svg, /<img/);
  assert.match(svg, /&lt;img/);
});
