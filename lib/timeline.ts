/**
 * @module timeline
 * @description The three human-in-the-loop decision points an operator passes
 *              through on every incident. Each point records what the AI
 *              proposed and what the operator actually did, so the audit trail
 *              reflects decisions rather than assumptions.
 *
 *              Self-contained so it can be unit tested without a resolver.
 */

export type DecisionPoint = 'INTAKE' | 'DISPATCH' | 'RESOLUTION';

export const DECISION_POINTS: readonly DecisionPoint[] = ['INTAKE', 'DISPATCH', 'RESOLUTION'];

/**
 * An override REQUIRES a justification note; confirm/amend may omit it. Modeled
 * as a discriminated union so the compiler forbids an override without a note at
 * every typed call site. The runtime guard in `recordDecision` covers the rest
 * (data parsed from localStorage, untyped callers).
 */
export type DecisionRecord =
  | { point: DecisionPoint; action: 'confirmed' | 'amended'; at: string; note?: string }
  | { point: DecisionPoint; action: 'overridden'; at: string; note: string };

export interface TimelineState {
  callId: string;
  records: DecisionRecord[];
}

export function emptyTimeline(callId: string): TimelineState {
  return { callId, records: [] };
}

/** @description Add or replace the record for one decision point. */
export function recordDecision(state: TimelineState, record: DecisionRecord): TimelineState {
  // Enforce the "note required on override" invariant before any state is
  // built, so a rejected record leaves the timeline untouched. The compiler
  // cannot vouch for records parsed from localStorage or untyped callers.
  if (record.action === 'overridden' && (record.note ?? '').trim() === '') {
    throw new Error('An overridden decision requires a justification note.');
  }
  const records = state.records.filter((r) => r.point !== record.point);
  records.push(record);
  // Keep records in canonical point order so the UI can render them directly.
  records.sort((a, b) => DECISION_POINTS.indexOf(a.point) - DECISION_POINTS.indexOf(b.point));
  return { callId: state.callId, records };
}

/** @description The next point awaiting an operator decision, or null when done. */
export function currentPoint(state: TimelineState): DecisionPoint | null {
  const decided = new Set(state.records.map((r) => r.point));
  return DECISION_POINTS.find((p) => !decided.has(p)) ?? null;
}

export function isComplete(state: TimelineState): boolean {
  return currentPoint(state) === null;
}

const TIMELINE_STORAGE_KEY = 'dispatch_timeline';

type TimelineMap = Record<string, DecisionRecord[]>;

function readAll(): TimelineMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TIMELINE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    // Only a plain object is a valid store. An array (or any other non-object)
    // is corrupt: reject it so a later writeTimeline replaces it rather than
    // assigning a string key onto it, which JSON.stringify would silently drop.
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as TimelineMap)
      : {};
  } catch {
    return {};
  }
}

export function readTimeline(callId: string): TimelineState {
  const all = readAll();
  return { callId, records: Array.isArray(all[callId]) ? all[callId] : [] };
}

export function writeTimeline(state: TimelineState): void {
  if (typeof window === 'undefined') return;
  const all = readAll();
  all[state.callId] = state.records;
  try {
    window.localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable; the in-memory state still drives this session */
  }
}
