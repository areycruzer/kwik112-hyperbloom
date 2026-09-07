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

test('presets preserve the approved caller-to-scenario mapping', () => {
  const ramesh = judgeCallerPreset('ramesh');
  const john = judgeCallerPreset('john');
  const sharma = judgeCallerPreset('sharma-ji');
  const rameshText = ramesh.lines.map((line) => line.text).join(' ');
  const johnText = john.lines.map((line) => line.text).join(' ');
  const sharmaText = sharma.lines.map((line) => line.text).join(' ');

  assert.equal(ramesh.incidentType, 'accident');
  assert.match(rameshText, /roadside|road.*accident|accident.*road/i);
  assert.match(rameshText, /ke paas|k paas|ke pass/i);

  assert.equal(john.incidentType, 'medical_emergency');
  assert.match(johnText, /tourist/i);
  assert.match(johnText, /heat ?stroke/i);
  assert.doesNotMatch(johnText, /[^\x00-\x7F]/);

  assert.equal(sharma.incidentType, 'medical_emergency');
  assert.match(sharmaText, /नब्ज|सांस|बेहोश/);
  assert.match(sharmaText, /नमूना मेट्रो गेट 1/);
  assert.doesNotMatch(sharmaText, /[A-Za-z]/);
});
