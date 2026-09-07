'use client';

import { Symbol } from '@/components/ui/symbol';
import { Chip, type ChipTone } from '@/components/ui/panel';
import { cn } from '@/lib/utils';
import { haversineKm, type TacticalUnit } from '@/lib/units';
import type { EmergencyCall } from '@/lib/types';
import { unitRosterAccessibleLabel } from '@/lib/dashboard-presentation';

interface UnitRosterProps {
  units: TacticalUnit[];
  selectedCall: EmergencyCall | null;
  selectedUnitId: string | null;
  onSelectUnit: (unitId: string) => void;
}

const STATUS_META: Record<TacticalUnit['status'], { tone: ChipTone; label: string }> = {
  available: { tone: 'safe', label: 'Ready' },
  'en-route': { tone: 'accent', label: 'En route' },
  'on-scene': { tone: 'mild', label: 'On scene' },
  busy: { tone: 'mild', label: 'Busy' },
};

function incidentPoint(call: EmergencyCall | null): { lat: number; lng: number } | null {
  const location = call?.caller_location;
  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    return null;
  }
  return { lat: location.latitude, lng: location.longitude };
}

function distanceLabel(unit: TacticalUnit, point: { lat: number; lng: number } | null): string {
  if (!point) return '—';
  return `${haversineKm(unit.lat, unit.lng, point.lat, point.lng).toFixed(1)} km`;
}

export function UnitRoster({
  units,
  selectedCall,
  selectedUnitId,
  onSelectUnit,
}: UnitRosterProps) {
  const point = incidentPoint(selectedCall);

  return (
    <ul className="flex flex-col gap-1.5">
      {units.map((unit) => {
        const status = STATUS_META[unit.status];
        const selected = unit.id === selectedUnitId;
        const distance = distanceLabel(unit, point);
        return (
          <li key={unit.id}>
            <button
              type="button"
              onClick={() => onSelectUnit(unit.id)}
              aria-pressed={selected}
              aria-label={unitRosterAccessibleLabel(unit, distance)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-[6px] border px-2.5 py-2 text-left transition-colors',
                selected
                  ? 'border-accent bg-accent/10'
                  : 'border-rule bg-panel hover:border-rule-strong',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Symbol
                  spec={{ kind: 'unit', glyph: unit.type, service: unit.type, size: 18 }}
                  className="shrink-0"
                />
                <span className="min-w-0 leading-tight">
                  <span className={cn('block truncate text-sm font-semibold', selected ? 'text-accent' : 'text-ink')}>
                    {unit.callsign}
                  </span>
                  <span className="mt-0.5 block truncate text-2xs text-ink-4">
                    <span className="uppercase">{unit.type}</span> · {unit.id} · {unit.speed}
                    {unit.assignedCallId ? ` · Assigned ${unit.assignedCallId}` : ''}
                  </span>
                </span>
              </span>

              <span className="flex shrink-0 flex-col items-end gap-1">
                <Chip tone={status.tone} dot>{status.label}</Chip>
                <span className="tnum text-2xs text-ink-3">{distance}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
