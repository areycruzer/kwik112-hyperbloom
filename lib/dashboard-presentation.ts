import type { EmergencyCall } from './types.ts';
import type { TacticalUnit } from './units.ts';

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
