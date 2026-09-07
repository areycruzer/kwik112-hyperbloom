import test from 'node:test';
import assert from 'node:assert/strict';

import { JUDGE_CALLER_PRESETS, judgeCallerPreset } from './personas.ts';

test('exposes exactly the three approved judge caller presets', () => {
  assert.deepEqual(
    JUDGE_CALLER_PRESETS.map((preset) => preset.name),
    ['Ramesh', 'John', 'Sharma ji'],
  );
  assert.equal(new Set(JUDGE_CALLER_PRESETS.map((preset) => preset.id)).size, 3);
});

test('judge caller presets are directly playable by the scripted voice station', () => {
  for (const preset of JUDGE_CALLER_PRESETS) {
    assert.match(preset.phone, /^\+91 00000 00\d{3}$/);
    assert.ok(preset.lines.length >= 3);
    assert.equal(preset.lines[0]?.role, 'user');
    assert.ok(preset.lines.some((line) => line.role === 'assistant'));
    assert.ok(
      preset.lines
        .filter((line) => line.role === 'user')
        .every((line) => line.emotions && Object.keys(line.emotions).length > 0),
    );
  }
});

test('presets preserve the approved cardiac, fire, and collision scenarios', () => {
  const ramesh = judgeCallerPreset('ramesh');
  const john = judgeCallerPreset('john');
  const sharma = judgeCallerPreset('sharma-ji');

  assert.match(ramesh.lines.map((line) => line.text).join(' '), /papa.*respond nahi.*saans.*Sample Metro Gate 1/i);
  assert.match(john.lines.map((line) => line.text).join(' '), /fire|smoke/i);
  assert.match(john.lines.map((line) => line.text).join(' '), /Nehru Place/i);
  assert.match(sharma.lines.map((line) => line.text).join(' '), /accident|takkar/i);
  assert.match(sharma.lines.map((line) => line.text).join(' '), /Pitampura/i);
});
