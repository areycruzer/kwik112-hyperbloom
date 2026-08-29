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

  // Pin the actual geometry: an apex-up triangle. A diamond (4 points), an
  // inverted triangle, or a degenerate/asymmetric one must all fail here — a
  // bare /<polygon/ match cannot tell those apart.
  const m = svg.match(/<polygon points="([^"]+)"/);
  assert.ok(m, 'incident frame must be a <polygon> with a points attribute');
  const pts = m![1].trim().split(/\s+/).map((p) => p.split(',').map(Number));
  assert.equal(pts.length, 3, 'a triangle has exactly three vertices');
  const [apex, right, left] = pts;
  // Apex points up: its y is strictly above (smaller than) both base vertices.
  assert.ok(apex[1] < right[1] && apex[1] < left[1], 'apex must sit above the base');
  // The base is level.
  assert.equal(right[1], left[1], 'the two base vertices share a y');
  // The base spans symmetrically about the apex's x, and straddles it.
  assert.ok(left[0] < apex[0] && apex[0] < right[0], 'apex x lies between the base vertices');
  assert.equal(apex[0] - left[0], right[0] - apex[0], 'the base is symmetric under the apex');
  // And pin the exact points so the shape cannot silently drift.
  assert.equal(m![1], '12,3 21,20 3,20');
});

test('a measured-calm marker is visually distinct from a never-measured one', () => {
  // Measured and calm (distress 0): a dim background track ring is painted, but
  // no coloured progress arc. The track is what makes "measured" visible.
  const calm = buildSymbol({
    kind: 'incident', glyph: 'medical', severity: 'high', distress: 0,
  });
  assert.match(calm, /stroke="#3B3B3B"/); // the dim track ring
  assert.doesNotMatch(calm, /stroke-dasharray/); // no coloured progress arc at 0

  // Never measured (null): NO ring markup at all. The incident frame is a
  // <polygon>, so a total absence of <circle> proves no ring was drawn — the
  // two markers differ in rendered SVG, not merely in a data attribute.
  const never = buildSymbol({
    kind: 'incident', glyph: 'medical', severity: 'high', distress: null,
  });
  assert.doesNotMatch(never, /<circle/);
  assert.doesNotMatch(never, /stroke="#3B3B3B"/);

  // The two are genuinely different renderings.
  assert.notEqual(calm, never);
});

test('a measured mid-value marker draws both the track and the coloured arc', () => {
  const mid = buildSymbol({
    kind: 'incident', glyph: 'medical', severity: 'high', distress: 70,
  });
  assert.match(mid, /stroke="#3B3B3B"/); // dim background track
  assert.match(mid, /stroke-dasharray/); // coloured progress arc over it
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
