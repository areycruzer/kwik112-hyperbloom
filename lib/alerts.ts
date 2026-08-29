/**
 * @module alerts
 * @description Derives operational alerts from live call state. Alerts are
 *              computed, never seeded, so what an operator sees always reflects
 *              the board rather than a fixture.
 *
 *              Self-contained: it declares the shape it needs rather than
 *              importing EmergencyCall, which keeps it unit-testable and
 *              decoupled from the wider type surface.
 */

export interface AlertInput {
  id: string;
  severity?: string;
  status?: string;
  created_at: string;
  ai_confidence?: number;
  caller_location?: { latitude?: number; longitude?: number };
  /** Set when model refinement graded the call above the local rules. */
  model_escalated?: boolean;
}

export type AlertCode =
  | 'LOCATION_UNRESOLVED'
  | 'P1_UNASSIGNED'
  | 'MODEL_ESCALATED'
  | 'LOW_CONFIDENCE'
  | 'STALE_INCIDENT';

export interface Alert {
  key: string;
  callId: string;
  code: AlertCode;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

const CLOSED_STATUSES = new Set(['resolved', 'completed', 'closed']);
const ASSIGNED_STATUSES = new Set(['dispatched', 'en-route', 'on_scene', 'mitigating']);

const P1_GRACE_SECONDS = 90;
const STALE_SECONDS = 30 * 60;
const LOW_CONFIDENCE = 0.5;

/** @description Compute every open alert for the given calls. */
export function deriveAlerts(calls: AlertInput[], nowMs: number): Alert[] {
  const alerts: Alert[] = [];

  for (const call of calls) {
    const status = (call.status ?? '').toLowerCase();
    // A closed incident cannot need operator attention.
    if (CLOSED_STATUSES.has(status)) continue;

    const ageSeconds = (nowMs - Date.parse(call.created_at)) / 1000;
    const push = (code: AlertCode, severity: Alert['severity'], message: string) =>
      alerts.push({ key: `${call.id}:${code}`, callId: call.id, code, severity, message });

    const loc = call.caller_location;
    if (typeof loc?.latitude !== 'number' || typeof loc?.longitude !== 'number') {
      push('LOCATION_UNRESOLVED', 'high', 'No coordinates resolved — responders cannot be routed.');
    }

    if (
      call.severity === 'critical' &&
      !ASSIGNED_STATUSES.has(status) &&
      ageSeconds > P1_GRACE_SECONDS
    ) {
      push(
        'P1_UNASSIGNED',
        'critical',
        `Critical incident unassigned for ${Math.floor(ageSeconds)}s.`,
      );
    }

    if (call.model_escalated) {
      push('MODEL_ESCALATED', 'medium', 'Model refinement raised severity above the local grade.');
    }

    if (typeof call.ai_confidence === 'number' && call.ai_confidence < LOW_CONFIDENCE) {
      push(
        'LOW_CONFIDENCE',
        'medium',
        `Triage confidence ${Math.round(call.ai_confidence * 100)}% — verify before dispatch.`,
      );
    }

    if (ageSeconds > STALE_SECONDS) {
      push('STALE_INCIDENT', 'low', `Open for ${Math.floor(ageSeconds / 60)} minutes.`);
    }
  }

  return alerts;
}

const ACK_STORAGE_KEY = 'dispatch_alert_acks';

/** @description Read acknowledged alert keys. Browser only; returns empty on the server. */
export function readAcknowledged(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(ACK_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

/** @description Mark one alert acknowledged. */
export function acknowledge(key: string): void {
  if (typeof window === 'undefined') return;
  const acks = readAcknowledged();
  acks.add(key);
  try {
    window.localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify([...acks]));
  } catch {
    /* storage unavailable; acknowledgement is best-effort */
  }
}
