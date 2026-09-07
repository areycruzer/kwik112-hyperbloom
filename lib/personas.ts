import type { IncidentType } from './types.ts';

export interface CallerPresetLine {
  role: 'user' | 'assistant';
  text: string;
  emotions?: Record<string, number>;
}
export interface JudgeCallerPreset {
  id: 'ramesh' | 'john' | 'sharma-ji';
  name: 'Ramesh' | 'John' | 'Sharma ji';
  description: string;
  speechLanguage: 'hi-IN' | 'en-IN';
  phone: string;
  incidentType: IncidentType;
  lines: readonly CallerPresetLine[];
}

export const JUDGE_CALLER_PRESETS: readonly JudgeCallerPreset[] = [
  {
    id: 'ramesh',
    name: 'Ramesh',
    description: 'Road accident near Moolchand Metro',
    speechLanguage: 'hi-IN',
    phone: '+91 00000 00112',
    incidentType: 'accident',
    lines: [
      {
        role: 'user',
        text: 'Moolchand Metro ke paas Ring Road par roadside accident hua hai. Ek bike ko car ne takkar maari.',
        emotions: { Distress: 0.86, Fear: 0.78, Anxiety: 0.72 },
      },
      {
        role: 'assistant',
        text: 'Moolchand Metro ka kaunsa gate ya nearest pillar hai?',
      },
      {
        role: 'user',
        text: 'Main Gate 2 ke opposite service road par hoon. Do log injured hain.',
        emotions: { Distress: 0.9, Anxiety: 0.82, Fear: 0.8 },
      },
      {
        role: 'assistant',
        text: 'Kya traffic, fuel leak, ya kisi gaadi se abhi turant khatra hai?',
      },
      {
        role: 'user',
        text: 'Traffic chal raha hai lekin hum divider ke paas safe distance par hain.',
        emotions: { Distress: 0.78, Fear: 0.74, Anxiety: 0.7 },
      },
      {
        role: 'assistant',
        text: 'Wahin rahiye jahan traffic se door hain aur injured logon ko move mat kijiye jab tak turant khatra na ho.',
      },
    ],
  },
  {
    id: 'john',
    name: 'John',
    description: 'Tourist with heatstroke at India Gate',
    speechLanguage: 'en-IN',
    phone: '+91 00000 00212',
    incidentType: 'medical_emergency',
    lines: [
      {
        role: 'user',
        text: 'I am a tourist at India Gate. My friend has heatstroke and is confused, vomiting, and can barely stand.',
        emotions: { Fear: 0.86, Anxiety: 0.82, Distress: 0.78 },
      },
      {
        role: 'assistant',
        text: 'What exact gate or nearby landmark can you see?',
      },
      {
        role: 'user',
        text: 'We are opposite India Gate near the National War Memorial entrance. He is awake but getting weaker.',
        emotions: { Fear: 0.88, Anxiety: 0.84, Distress: 0.82 },
      },
      {
        role: 'assistant',
        text: 'Is he still responding to you?',
      },
      {
        role: 'user',
        text: 'Yes, we are in shade now. He is responding slowly and feels very hot.',
        emotions: { Fear: 0.8, Distress: 0.76, Anxiety: 0.78 },
      },
    ],
  },
  {
    id: 'sharma-ji',
    name: 'Sharma ji',
    description: 'Unresponsive patient at a metro entrance',
    speechLanguage: 'hi-IN',
    phone: '+91 00000 00312',
    incidentType: 'medical_emergency',
    lines: [
      {
        role: 'user',
        text: 'मेरी पत्नी कोई जवाब नहीं दे रही हैं और उनकी सांस भी नहीं आ रही है। कृपया जल्दी सहायता भेजिए।',
        emotions: { Panic: 0.96, Distress: 0.94, Fear: 0.91 },
      },
      {
        role: 'assistant',
        text: 'आपकी सही जगह या सबसे पास का पहचान चिन्ह क्या है?',
      },
      {
        role: 'user',
        text: 'हम नमूना मेट्रो गेट 1 के सार्वजनिक प्रवेश द्वार पर हैं।',
        emotions: { Distress: 0.9, Anxiety: 0.84, Fear: 0.76 },
      },
      {
        role: 'assistant',
        text: 'क्या वह सामान्य रूप से सांस ले रही हैं?',
      },
      {
        role: 'user',
        text: 'हां, वह बिल्कुल बेहोश हैं और उनकी नब्ज भी महसूस नहीं हो रही है।',
        emotions: { Panic: 0.93, Distress: 0.96, Desperation: 0.88 },
      },
      {
        role: 'assistant',
        text: 'मदद की व्यवस्था की जा रही है। मेरे साथ बने रहिए।',
      },
    ],
  },
] as const;

export function judgeCallerPreset(id: JudgeCallerPreset['id']): JudgeCallerPreset {
  return JUDGE_CALLER_PRESETS.find((preset) => preset.id === id)!;
}

export function selectJudgeCallerPreset(id?: string): JudgeCallerPreset {
  const compatibleId = id === 'hinglish-five-minute' ? 'sharma-ji' : id;
  return JUDGE_CALLER_PRESETS.find((preset) => preset.id === compatibleId) ?? JUDGE_CALLER_PRESETS[0];
}
