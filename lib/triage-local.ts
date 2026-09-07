import type { AIExtraction, SafetyAudit, Severity } from './types.ts';

export interface TriageResult {
  extraction: AIExtraction;
  labels: string[];
  flags: string[];
  method: string;
  safetyAudit?: SafetyAudit;
}

const ESCALATIONS = [
  { re: /\b(heart attack|cardiac arrest|chest pain|no pulse|pulse nahi)\b|नब्ज नहीं|सांस नहीं/i,
    score: 95, specificity: 2, label: 'MEDICAL_EMERGENCY', threat: 'Possible cardiac arrest',
    type: 'medical_emergency', subtype: 'cardiac event' },
  { re: /\b(unconscious|unresponsive|passed out|collapsed|behosh)\b|बेहोश/i,
    score: 88, specificity: 1, label: 'MEDICAL_EMERGENCY', threat: 'Unresponsive casualty',
    type: 'medical_emergency', subtype: 'unresponsive patient' },
  { re: /\b(not breathing|drowning|choking|overdose|saans nahi)\b|सांस नहीं/i,
    score: 93, specificity: 1, label: 'MEDICAL_EMERGENCY', threat: 'Airway/breathing compromise',
    type: 'medical_emergency', subtype: 'respiratory emergency' },
  { re: /\bheat\s*stroke\b/i,
    score: 72, specificity: 2, label: 'MEDICAL_EMERGENCY', threat: 'Reported heatstroke',
    type: 'medical_emergency', subtype: 'heat-related illness' },
  { re: /\b(bleeding out|severe bleeding|gunshot|stab(bed|bing)?|stab wound)\b/i,
    score: 92, specificity: 2, label: 'TRAUMA_EMERGENCY', threat: 'Severe bleeding',
    type: 'medical_emergency', subtype: 'major trauma' },
  { re: /\b(fire|burning|on fire|smoke|trapped|aag|dhua|dhuaan)\b|आग|धुआं|धुआँ|जल\s+रह(?:ा|ी|े)/i,
    score: 90, specificity: 2, label: 'FIRE_EMERGENCY', threat: 'Active fire',
    type: 'fire', subtype: 'structure fire' },
  { re: /\b(accident|crash|collision|hit by|ran over|flipped over|takkar|durghatna)\b|दुर्घटना|टक्कर/i,
    score: 78, specificity: 2, label: 'TRAFFIC_INCIDENT', threat: 'Roadway casualty',
    type: 'accident', subtype: 'vehicle collision' },
  { re: /\b(robbery|armed|weapon|knife|attack(ed|ing)?|assault|chaku|loot|hamla)\b|चाकू|लूट|हमला/i,
    score: 82, specificity: 2, label: 'VIOLENT_CRIME', threat: 'Possible armed suspect',
    type: 'crime', subtype: 'violent crime' },
] as const;

const CATEGORIES = [
  { re: /\b(water main|pipe|pipeline|gushing|flooding|sewage|drain)\b/i,
    score: 22, label: 'UTILITY_NON_EMERGENCY',
    type: 'public_safety' as const, subtype: 'water/utility disruption' },
  { re: /\b(street ?light|pothole|garbage|litter|stray (dog|cattle)|tree fell)\b/i,
    score: 20, label: 'CIVIC_MAINTENANCE',
    type: 'public_safety' as const, subtype: 'civic maintenance request' },
  { re: /\b(power ?cut|outage|transformer|electric(ity)? line|live wire)\b/i,
    score: 45, label: 'ELECTRICAL_HAZARD',
    type: 'public_safety' as const, subtype: 'electrical hazard' },
  { re: /\b(noise|loud music|party|disturbance)\b/i,
    score: 18, label: 'NOISE_COMPLAINT',
    type: 'public_safety' as const, subtype: 'noise complaint' },
  { re: /\b(gas leak|lpg|smell of gas)\b/i,
    score: 75, label: 'HAZMAT',
    type: 'public_safety' as const, subtype: 'gas leak' },
];

export function severityFromScore(score: number): Severity {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function priorityFromSeverity(severity: Severity): 'P1' | 'P2' | 'P3' | 'P4' {
  if (severity === 'critical') return 'P1';
  if (severity === 'high') return 'P2';
  if (severity === 'medium') return 'P3';
  return 'P4';
}

function cleanSpokenLocation(value: string): string | undefined {
  const cleaned = value
    .replace(/^(?:caller\s+is|i\s+am|i'm|main|mai|mein|hum|ham)\s+/iu, '')
    .replace(/[।.!?].*$/u, '')
    .replace(/\b(par hain|par hai|mein hain|mein hai|hai|hain|here)\b.*$/iu, '')
    .replace(/\b(with|and|aur|or)\b.*$/iu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length >= 3 ? cleaned.slice(0, 240) : undefined;
}

function extractSpokenLocation(transcript: string): string | undefined {
  const patterns = [
    /\baddress\s+([^,.!?\n]+?)(?=\s+(?:hai|hain|is)\b|[,\.!?\n]|$)/iu,
    /\b(?:main|hum|ham)\s+([^.!?\n]+?)\s+ke\s+(?:saamne|samne|bahar|baahar|peeche)\s+(?:hoon|hun|hain|hai)\b/iu,
    /(?:मैं|हम)\s+([^।.!?\n]+?)\s+के\s+(?:सामने|बाहर|पीछे)\s+(?:हूँ|हूं|हैं|है)/u,
    /\b(?:accident|crash|fire|aag|incident)\s+([^,.!?\n]+?)\s+(?:ke|k)\s+(?:paas|pass)\b/iu,
    /(?:^|[,;]\s*)([^,.!?\n]+?)\s+(?:ke|k)\s+(?:paas|pass)\b/iu,
    /\b(?:opposite|opp\.?)\s+([^.!?\n]+?)(?:[.!?\n]|$)/iu,
    /\boutside\s+([^.!?\n]+?)(?:[.!?\n]|$)/iu,
    /(?:^|[.!?]\s*)((?:gate|pillar|sector|gali)\s+[^.!?\n]+?)(?=\s+(?:par|mein|me|(?:ke|k)\s+(?:paas|pass))\b|[.!?\n]|$)/iu,
    /\bat\s+([^.!?\n]+?)(?:[.!?\n]|$)/iu,
    /\bnear\s+([^.!?\n]+?)(?:[.!?\n]|$)/iu,
    /\b(?:hum|ham)\s+([^.!?\n]+?)\s+par\s+(?:hain|hai)\b/iu,
    /(?:^|[.!?]\s*|\]\s*(?:uh[,\s]*)?)([^,.!?\n]+?)\s+(?:par|mein)\s+(?=\S)/iu,
    /(?:^|[.!?]\s*)([^,.!?\n]+?)\s+ki\s+(?=(?:street\s*light|shop|building|park|lab)\b)/iu,
    /(?:जगह|स्थान)\s+([^।.!?\n]+?)(?:[।.!?\n]|$)/u,
    /हम\s+([^।.!?\n]+?)\s+पर\s+हैं/u,
    /(?:^|।\s*)([^।,.!?\n]+?)\s+की\s+(?=(?:दुकान|इमारत|बिल्डिंग|पार्क)(?:\s|$))/u,
    /(?:^|।\s*)([^।,.!?\n]+?)\s+(?:पर|में)\s+(?=\S)/u,
  ];

  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    const location = match?.[1] ? cleanSpokenLocation(match[1]) : undefined;
    if (location) return location;
  }
  return undefined;
}

const SPOKEN_COUNTS: Record<string, number> = {
  one: 1, ek: 1, two: 2, do: 2, three: 3, teen: 3, four: 4, char: 4,
  chaar: 4, five: 5, paanch: 5, panch: 5, six: 6, chhe: 6, seven: 7,
  saat: 7, eight: 8, aath: 8, nine: 9, nau: 9, ten: 10, das: 10,
};

function extractPersonsInvolved(transcript: string): number {
  const match = transcript.match(
    /\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|ek|do|teen|char|chaar|paanch|panch|chhe|saat|aath|nau|das)\s+(?:log|people|persons?|patients?|victims?|aadmi|mahila|bachche|injured|hurt|wounded|ghayal|zakhmi|trapped)\b/iu,
  );
  if (!match?.[1]) return 1;
  const numeric = Number(match[1]);
  if (Number.isInteger(numeric)) return Math.min(Math.max(numeric, 1), 999);
  return SPOKEN_COUNTS[match[1].toLowerCase()] ?? 1;
}

function injuryStatus(transcript: string): boolean | null {
  const withoutNegatedInjuries = transcript
    .replace(
      /\b(?:nobody|no\s+one)\s+(?:(?:is|was|were|got|gets|has\s+been|had\s+been)\s+)?(?:injured|hurt|wounded|bleeding)\b/giu,
      ' ',
    )
    .replace(/\bno\s+(?:injured|hurt|wounded|bleeding)\b/giu, ' ')
    .replace(
      /\b(?:koi|koee)\s+(?:\w+\s+){0,2}(?:injured|hurt|wounded|bleeding|ghayal|zakhmi)\s+(?:nahi|nahin)\b/giu,
      ' ',
    )
    .replace(/\b(?:not|nahi|nahin)\s+(?:injured|hurt|wounded|bleeding|ghayal|zakhmi)\b/giu, ' ')
    .replace(/\b(?:injured|hurt|wounded|bleeding|ghayal|zakhmi)\s+(?:nahi|nahin|not)\b/giu, ' ');
  if (/\b(injured|hurt|wounded|bleeding|ghayal|zakhmi)\b/iu.test(withoutNegatedInjuries)) return true;
  return withoutNegatedInjuries === transcript ? null : false;
}

export function keywordTriage(transcript: string): TriageResult {
  const labels: string[] = [];
  const flags: string[] = [];
  let score = 35;
  let type: AIExtraction['incident_type'] = 'other';
  let subtype = 'unclassified emergency';
  const threats: string[] = [];

  for (const rule of CATEGORIES) {
    if (!rule.re.test(transcript)) continue;
    if (!labels.includes(rule.label)) labels.push(rule.label);
    if (subtype === 'unclassified emergency' || rule.score > score) {
      score = rule.score;
      type = rule.type;
      subtype = rule.subtype;
    }
  }

  let bestSpecificity = 0;
  let bestTypeScore = 0;
  for (const rule of ESCALATIONS) {
    const match = transcript.match(rule.re);
    if (!match) continue;
    if (rule.score > score) score = rule.score;
    const wins = rule.specificity > bestSpecificity ||
      (rule.specificity === bestSpecificity && rule.score > bestTypeScore);
    if (wins) {
      bestSpecificity = rule.specificity;
      bestTypeScore = rule.score;
      type = rule.type;
      subtype = rule.subtype;
    }
    if (!labels.includes(rule.label)) labels.push(rule.label);
    if (!threats.includes(rule.threat)) threats.push(rule.threat);
    const callerPhrase = match[0].trim();
    if (callerPhrase && !threats.some((threat) => threat.toLowerCase() === callerPhrase.toLowerCase())) {
      threats.push(callerPhrase);
    }
  }

  if (/\b(nobody|no one|no-one) is (hurt|injured)\b|\bno injuries\b/i.test(transcript)) {
    score = Math.min(score, 35);
  }
  if (labels.length === 0) labels.push('UNCLASSIFIED');
  const severity = severityFromScore(score);
  if (severity === 'critical') flags.push('LIFE_THREATENING');
  const firstLine = transcript.split(/[.!?\n]/).map((line) => line.trim()).find(Boolean) ?? '';
  const spokenLocation = extractSpokenLocation(transcript);
  const reportedInjuryStatus = injuryStatus(transcript);

  const result: TriageResult = {
    method: 'keyword',
    labels,
    flags,
    extraction: {
      incident_type: type,
      incident_subtype: subtype,
      severity,
      location: spokenLocation
        ? { address: spokenLocation, confidence: 0.55, source: 'caller' }
        : { confidence: 0 },
      persons_involved: {
        count: extractPersonsInvolved(transcript),
        injuries: reportedInjuryStatus ?? score >= 80,
        descriptions: [],
      },
      immediate_threats: threats,
      time_sensitive_factors: [],
      vehicles_involved: [],
      weapons_mentioned: [],
      caller_condition: score >= 80 ? 'panicked' : score >= 55 ? 'distressed' : 'unclear',
      summary: firstLine ? firstLine.slice(0, 220) : 'Emergency call received; details pending.',
      confidence_score: 0.45,
      missing_critical_info: ['Exact address', 'Number of people affected', 'Current hazards'],
      recommended_questions: [
        'What is the exact address or nearest landmark?',
        'Is anyone injured or trapped?',
        'Are you currently in a safe place?',
      ],
    },
  };
  return result;
}

export function applyEscalations(result: TriageResult, transcript: string): TriageResult {
  let score = scoreOf(result);
  for (const rule of ESCALATIONS) {
    if (!rule.re.test(transcript)) continue;
    if (rule.score > score) score = rule.score;
    if (!result.labels.includes(rule.label)) result.labels.push(rule.label);
    if (!result.extraction.immediate_threats.includes(rule.threat)) {
      result.extraction.immediate_threats.push(rule.threat);
    }
  }
  result.extraction.severity = severityFromScore(score);
  if (result.extraction.severity === 'critical' && !result.flags.includes('LIFE_THREATENING')) {
    result.flags.push('LIFE_THREATENING');
  }
  (result as TriageResult & { severityScore: number }).severityScore = score;
  return result;
}

export function scoreOf(result: TriageResult): number {
  const explicit = (result as TriageResult & { severityScore?: number }).severityScore;
  if (typeof explicit === 'number') return explicit;
  const severity = result.extraction.severity;
  return severity === 'critical' ? 85 : severity === 'high' ? 68 : severity === 'medium' ? 48 : 25;
}

export function localTriage(transcript: string): TriageResult {
  const clean = transcript.trim();
  return applyEscalations(keywordTriage(clean), clean);
}
