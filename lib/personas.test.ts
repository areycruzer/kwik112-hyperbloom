import test from 'node:test';
import assert from 'node:assert/strict';

import * as personas from './personas.ts';
import { localTriage } from './triage-local.ts';

const { JUDGE_CALLER_PRESETS, judgeCallerPreset } = personas;

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

test('every recorded caller has concise visible context and speech audio metadata', () => {
  assert.deepEqual(
    JUDGE_CALLER_PRESETS.map(({ name, description, speechLanguage }) => ({
      name,
      description,
      speechLanguage,
    })),
    [
      {
        name: 'Ramesh',
        description: 'Road accident near Moolchand Metro',
        speechLanguage: 'hi-IN',
      },
      {
        name: 'John',
        description: 'Tourist with heatstroke at India Gate',
        speechLanguage: 'en-IN',
      },
      {
        name: 'Sharma ji',
        description: 'Unresponsive patient at a metro entrance',
        speechLanguage: 'hi-IN',
      },
    ],
  );
});

test('the legacy guided-demo launch selects Sharma ji without adding another option', () => {
  const selectPreset = (
    personas as typeof personas & {
      selectJudgeCallerPreset: (id?: string) => (typeof JUDGE_CALLER_PRESETS)[number];
    }
  ).selectJudgeCallerPreset;

  assert.equal(typeof selectPreset, 'function');
  assert.equal(selectPreset('hinglish-five-minute').id, 'sharma-ji');
  assert.equal(selectPreset('john').id, 'john');
  assert.equal(selectPreset('unknown').id, 'ramesh');
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

test('every full caller transcript retains its scenario, severity floor, and useful location', () => {
  const severityRank = { low: 0, medium: 1, high: 2, critical: 3 } as const;
  const expectations = {
    ramesh: { type: 'accident', severity: 'high', location: /Moolchand Metro|Gate 2/i },
    john: { type: 'medical_emergency', severity: 'high', location: /India Gate/i },
    'sharma-ji': { type: 'medical_emergency', severity: 'critical', location: /नमूना मेट्रो गेट 1/ },
  } as const;

  for (const preset of JUDGE_CALLER_PRESETS) {
    const callerTranscript = preset.lines
      .filter((line) => line.role === 'user')
      .map((line) => line.text)
      .join(' ');
    const result = localTriage(callerTranscript).extraction;
    const expected = expectations[preset.id];

    assert.equal(result.incident_type, expected.type, preset.name);
    assert.ok(severityRank[result.severity] >= severityRank[expected.severity], preset.name);
    assert.match(result.location.address ?? '', expected.location, preset.name);
  }
});
