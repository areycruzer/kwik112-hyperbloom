'use client';

import { Symbol } from '@/components/ui/symbol';
import { Chip, type ChipTone } from '@/components/ui/panel';
import { cn } from '@/lib/utils';
import { haversineKm, type TacticalUnit } from '@/lib/units';
import type { EmergencyCall } from '@/lib/types';

/**
 * UnitRoster — the responder fleet as a floating-module table (Task 11).
 *
 * Each row carries the unit's `buildSymbol` circle, its id label above a bold
 * callsign, the service, a status pill, the current assignment, and the
 * distance to the selected incident. Distance is a haversine reading; with no
 * incident selected it shows an em-dash rather than a fabricated number.
 *
 * Selecting a row highlights that unit on the map (an accent ring). Rows are
 * real `<button>`s so the whole roster is operable from the keyboard.
 */

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

/** The incident location a distance is measured to, or null when unmeasurable. */
function incidentPoint(call: EmergencyCall | null): { lat: number; lng: number } | null {
  const loc = call?.caller_location;
  if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
    return null;
  }
  return { lat: loc.latitude, lng: loc.longitude };
}

function distanceLabel(unit: TacticalUnit, point: { lat: number; lng: number } | null): string {
  if (!point) return '—';
  const km = haversineKm(unit.lat, unit.lng, point.lat, point.lng);
  return `${km.toFixed(1)} km`;
}

export function UnitRoster({
  units,
  selectedCall,
  selectedUnitId,
  onSelectUnit,
}: UnitRosterProps) {
  const point = incidentPoint(selectedCall);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-rule">
            <th className="label px-2 py-1.5 font-medium">Unit</th>
            <th className="label px-2 py-1.5 font-medium">Status</th>
            <th className="label px-2 py-1.5 font-medium">Assignment</th>
            <th className="label px-2 py-1.5 text-right font-medium">Distance</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => {
            const status = STATUS_META[unit.status];
            const selected = unit.id === selectedUnitId;
            return (
              <tr
                key={unit.id}
                className={cn(
                  'border-b border-rule last:border-b-0',
                  selected && 'bg-accent/10',
                )}
              >
                <td className="px-2 py-2 align-middle">
                  <button
                    type="button"
                    onClick={() => onSelectUnit(unit.id)}
                    aria-pressed={selected}
                    aria-label={`Select ${unit.callsign} (${unit.id}) on the map`}
                    className="flex items-center gap-2 rounded-[4px] text-left"
                  >
                    <Symbol
                      spec={{ kind: 'unit', glyph: unit.type, service: unit.type, size: 18 }}
                      className="shrink-0"
                    />
                    <span className="leading-tight">
                      <span className="label block">{unit.id}</span>
                      <span
                        className={cn(
                          'block text-sm font-semibold',
                          selected ? 'text-accent' : 'text-ink',
                        )}
                      >
                        {unit.callsign}
                      </span>
                      <span className="block text-2xs capitalize text-ink-3">
                        {unit.type} · <span className="tnum">{unit.speed}</span>
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-2 py-2 align-middle">
                  <Chip tone={status.tone} dot>
                    {status.label}
                  </Chip>
                </td>
                <td className="px-2 py-2 align-middle text-sm text-ink-2">
                  {unit.assignedCallId ? (
                    <span className="tnum">{unit.assignedCallId}</span>
                  ) : (
                    <span className="text-ink-4">Unassigned</span>
                  )}
                </td>
                <td className="px-2 py-2 text-right align-middle">
                  <span className="tnum text-sm text-ink">{distanceLabel(unit, point)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
