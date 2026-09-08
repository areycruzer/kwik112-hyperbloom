import type { EmergencyCall } from './types.ts';
import type { TacticalUnit } from './units.ts';
import type { KwikLiveCallPayload } from './live-call.ts';

export interface LiveCallPresentation {
  turns: readonly { speaker: 'Caller' | 'Dispatcher'; text: string }[];
  language: string;
  prosody: string;
  grade: string;
  /** Top measured emotion on the caller's latest utterance, e.g. "Distress 86%". */
  emotion: string | null;
}

export function nextLiveCallPayload(
  current: KwikLiveCallPayload | null,
  incoming: KwikLiveCallPayload,
): KwikLiveCallPayload | null {
  if (!current) return incoming;
  if (current.state === 'end' && incoming.callId === current.callId) return current;

  const currentAt = Date.parse(current.at);
  const incomingAt = Date.parse(incoming.at);
  const currentIsValid = Number.isFinite(currentAt);
  const incomingIsValid = Number.isFinite(incomingAt);

  if (!incomingIsValid) return current;

  if (incoming.callId !== current.callId) {
    if (incoming.state !== 'start') return current;
    if (currentIsValid && incomingAt <= currentAt) return current;
    return incoming;
  }

  if (currentIsValid && incomingAt < currentAt) return current;
  return incoming;
}

export function presentLiveCall(
  payload: KwikLiveCallPayload,
  turnLimit = 3,
): LiveCallPresentation {
  // Latest caller turn that carried prosody scores — the dispatcher's live
  // emotional read of the person on the line.
  let emotion: string | null = null;
  for (let i = payload.transcript.length - 1; i >= 0; i--) {
    const turn = payload.transcript[i];
    if (turn.role !== 'user' || !turn.emotions) continue;
    const [top] = Object.entries(turn.emotions).sort((a, b) => b[1] - a[1]);
    if (top) emotion = `${top[0]} ${Math.round(top[1] * 100)}%`;
    break;
  }

  return {
    turns: payload.transcript.slice(-turnLimit).map((turn) => ({
      speaker: turn.role === 'user' ? 'Caller' : 'Dispatcher',
      text: turn.text,
    })),
    language: payload.detectedLanguage?.toUpperCase() ?? 'Detecting',
    prosody: `${payload.prosodySource.charAt(0).toUpperCase()}${payload.prosodySource.slice(1)}`,
    grade: payload.grade
      ? `Current grade: ${payload.grade.severity.toUpperCase()} (rules)`
      : 'Waiting for caller',
    emotion,
  };
}

export interface DashboardHeaderMetric {
  label: 'Incidents' | 'Critical' | 'Open alerts';
  value: number;
  tone: 'default' | 'critical' | 'warning';
}

export function dashboardHeaderMetrics(
  calls: readonly EmergencyCall[],
  openAlerts: number,
): DashboardHeaderMetric[] {
  return [
    { label: 'Incidents', value: calls.length, tone: 'default' },
    {
      label: 'Critical',
      value: calls.filter((call) => call.severity === 'critical').length,
      tone: 'critical',
    },
    { label: 'Open alerts', value: openAlerts, tone: 'warning' },
  ];
}

export function compactIncidentSummary(summary: string, maxLength = 140): string {
  const normalized = summary.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  const candidate = normalized.slice(0, Math.max(1, maxLength - 1));
  const lastSpace = candidate.lastIndexOf(' ');
  const clipped = lastSpace >= Math.floor(maxLength * 0.6) ? candidate.slice(0, lastSpace) : candidate;
  return `${clipped.trimEnd()}…`;
}

export function defaultUnitPanelOpen(viewportWidth: number): boolean {
  return viewportWidth >= 1280;
}

export function dashboardRegionVisibility(viewportWidth: number): {
  showModuleRail: boolean;
  showIncidentSidebar: boolean;
} {
  const hasRoomForChrome = viewportWidth >= 640;
  return {
    showModuleRail: true,
    showIncidentSidebar: hasRoomForChrome,
  };
}

export function defaultMobileIncidentOpen(viewportWidth: number): boolean {
  return viewportWidth < 640;
}

export function mobileNavigationInset(viewportWidth: number): number {
  return viewportWidth < 640 ? 56 : 0;
}

const UNIT_STATUS_LABEL: Record<TacticalUnit['status'], string> = {
  available: 'Ready',
  'en-route': 'En route',
  'on-scene': 'On scene',
  busy: 'Busy',
};

/**
 * The roster row read aloud. It carries the same three operational figures the
 * row shows — distance, current speed and projected ETA — because choosing a
 * unit on distance alone picks the wrong one whenever a further unit is already
 * rolling, and a screen-reader operator makes the same call as a sighted one.
 */
export function unitRosterAccessibleLabel(
  unit: Pick<TacticalUnit, 'id' | 'callsign' | 'agency' | 'speed' | 'status'>,
  distance: string,
  eta?: string,
): string {
  // The owning agency, not the internal service token: "Delhi Fire Service"
  // is what the row shows and what an operator would say out loud.
  const base = `${unit.callsign}, ${unit.agency} unit ${unit.id}, ${UNIT_STATUS_LABEL[unit.status]}, ${distance} away, speed ${unit.speed}`;
  return eta ? `${base}, ETA ${eta}` : base;
}

/* ---- INCIDENT QUEUE ORDER -------------------------------------------------
 * The queue is the dispatcher's work list and it was rendering in whatever
 * order the calls happened to arrive in the array, so a P1 cardiac arrest sat
 * below two P2s. On the console's highest-traffic surface that is not an
 * ordering choice, it is an absence of one.
 * ------------------------------------------------------------------------- */

const QUEUE_SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Statuses that mean the incident is finished and no longer competing for attention. */
const QUEUE_CLOSED_STATUSES = new Set(['resolved', 'completed', 'closed']);

function queueClosedRank(call: EmergencyCall): number {
  return QUEUE_CLOSED_STATUSES.has((call.status ?? '').toLowerCase()) ? 1 : 0;
}

function queueSeverityRank(call: EmergencyCall): number {
  // An ungraded call ranks below every graded one but above a closed one: it
  // still needs a human, it just has not been told how badly yet.
  return QUEUE_SEVERITY_RANK[(call.severity ?? '').toLowerCase()] ?? 4;
}

function queueAge(call: EmergencyCall): number {
  const at = Date.parse(call.created_at ?? '');
  // An unparseable timestamp sorts as the OLDEST of its grade, never the
  // newest. We cannot establish how long this caller has been waiting, and the
  // safe reading of "unknown" on a dispatch queue is "possibly the longest" —
  // the same choice lib/alerts makes when it treats an unknown age as past
  // every grace period. Sorting it last would let a malformed record sink out
  // of sight, which is the one outcome that must not happen here.
  return Number.isNaN(at) ? -Infinity : at;
}

/**
 * @description Order two incidents the way a dispatcher works them: open before
 *              closed, then by priority, then oldest first within a priority.
 *
 *              Oldest-first inside a grade is deliberate. Two P1s are equally
 *              urgent by grade, so the tie-break that matters is which caller
 *              has been waiting longer — that is the one at risk of breaching
 *              its response target, and it is the one the alerts panel is
 *              already shouting about.
 */
export function compareIncidentsForQueue(a: EmergencyCall, b: EmergencyCall): number {
  const byOpen = queueClosedRank(a) - queueClosedRank(b);
  if (byOpen !== 0) return byOpen;

  const bySeverity = queueSeverityRank(a) - queueSeverityRank(b);
  if (bySeverity !== 0) return bySeverity;

  const byAge = queueAge(a) - queueAge(b);
  if (byAge !== 0) return byAge;

  // Stable, deterministic last resort so the list never reshuffles on a re-render.
  return (a.id ?? '').localeCompare(b.id ?? '');
}

/** @description A new array of incidents in queue order; the input is untouched. */
export function sortIncidentQueue(calls: readonly EmergencyCall[]): EmergencyCall[] {
  return [...calls].sort(compareIncidentsForQueue);
}
