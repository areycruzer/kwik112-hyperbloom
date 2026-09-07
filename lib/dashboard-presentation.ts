import type { EmergencyCall } from './types.ts';
import type { TacticalUnit } from './units.ts';
import type { KwikLiveCallPayload } from './live-call.ts';

export interface LiveCallPresentation {
  turns: readonly { speaker: 'Caller' | 'Dispatcher'; text: string }[];
  language: string;
  prosody: string;
  grade: string;
}

export function nextLiveCallPayload(
  current: KwikLiveCallPayload | null,
  incoming: KwikLiveCallPayload,
): KwikLiveCallPayload | null {
  if (!current) return incoming.state === 'end' ? null : incoming;

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
  return incoming.state === 'end' ? null : incoming;
}

export function presentLiveCall(
  payload: KwikLiveCallPayload,
  turnLimit = 3,
): LiveCallPresentation {
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

export function unitRosterAccessibleLabel(
  unit: Pick<TacticalUnit, 'id' | 'callsign' | 'type' | 'speed' | 'status'>,
  distance: string,
): string {
  return `${unit.callsign}, ${unit.type.toUpperCase()} unit ${unit.id}, ${UNIT_STATUS_LABEL[unit.status]}, ${distance} away, speed ${unit.speed}`;
}
