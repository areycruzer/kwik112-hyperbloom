import type { IncidentType } from './types.ts';

export interface CallerPresetLine {
  role: 'user' | 'assistant';
  text: string;
  emotions?: Record<string, number>;
}
export interface JudgeCallerPreset {
  id: 'ramesh' | 'john' | 'sharma-ji';
  name: 'Ramesh' | 'John' | 'Sharma ji';
  phone: string;
  incidentType: IncidentType;
  lines: readonly CallerPresetLine[];
}

export const JUDGE_CALLER_PRESETS: readonly JudgeCallerPreset[] = [
  {
    id: 'ramesh',
    name: 'Ramesh',
    phone: '+91 00000 00112',
    incidentType: 'medical_emergency',
    lines: [
      {
        role: 'user',
        text: 'Mere papa respond nahi kar rahe, saans bhi nahi aa rahi. Please jaldi help bhejiye.',
        emotions: { Panic: 0.96, Distress: 0.94, Fear: 0.91 },
      },
      {
        role: 'assistant',
        text: 'Aapki exact location ya nearest landmark kya hai?',
      },
      {
        role: 'user',
        text: 'Hum Sample Metro Gate 1 ke public entrance par hain.',
        emotions: { Distress: 0.9, Anxiety: 0.84, Fear: 0.76 },
      },
      {
        role: 'assistant',
        text: 'Kya woh bilkul unresponsive hain aur normal breathing nahi hai?',
      },
      {
        role: 'user',
        text: 'Haan, bilkul unresponsive hain. Pulse bhi feel nahi ho rahi.',
        emotions: { Panic: 0.93, Distress: 0.96, Desperation: 0.88 },
      },
      {
        role: 'assistant',
        text: 'Phone speaker par rakhiye aur mere agle nirdesh dhyan se suniye.',
      },
    ],
  },
  {
    id: 'john',
    name: 'John',
    phone: '+91 00000 00212',
    incidentType: 'fire',
    lines: [
      {
        role: 'user',
        text: 'There is heavy black smoke from a third-floor electronics shop at Nehru Place.',
        emotions: { Fear: 0.92, Anxiety: 0.78, Distress: 0.66 },
      },
      {
        role: 'assistant',
        text: 'Which Nehru Place building or nearest entrance are you at?',
      },
      {
        role: 'user',
        text: 'I am outside the main market entrance. The shop is on fire and people may be trapped upstairs.',
        emotions: { Fear: 0.9, Panic: 0.82, Distress: 0.8 },
      },
      {
        role: 'assistant',
        text: 'Are you outside the building and away from the smoke now?',
      },
      {
        role: 'user',
        text: 'Yes, I am outside. Several people are leaving by the fire exit.',
        emotions: { Fear: 0.7, Distress: 0.54, Anxiety: 0.48 },
      },
    ],
  },
  {
    id: 'sharma-ji',
    name: 'Sharma ji',
    phone: '+91 00000 00312',
    incidentType: 'accident',
    lines: [
      {
        role: 'user',
        text: 'Pitampura metro crossing ke paas bada accident hua hai. Ek SUV palat gayi hai.',
        emotions: { Distress: 0.82, Fear: 0.76, Anxiety: 0.7 },
      },
      {
        role: 'assistant',
        text: 'Pitampura metro ka kaunsa gate ya nearest landmark hai?',
      },
      {
        role: 'user',
        text: 'Gate 2 ke saamne ring road par hoon. Do log injured hain aur ek passenger andar phansa hai.',
        emotions: { Distress: 0.88, Fear: 0.84, Panic: 0.74 },
      },
      {
        role: 'assistant',
        text: 'Kya fuel leak, aag, ya moving traffic se turant khatra hai?',
      },
      {
        role: 'user',
        text: 'Fuel road par leak ho raha hai. Main gaadiyon se door khada hoon.',
        emotions: { Distress: 0.78, Fear: 0.8, Anxiety: 0.72 },
      },
    ],
  },
] as const;

export function judgeCallerPreset(id: JudgeCallerPreset['id']): JudgeCallerPreset {
  return JUDGE_CALLER_PRESETS.find((preset) => preset.id === id)!;
}
