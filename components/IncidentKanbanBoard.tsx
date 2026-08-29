/**
 * Pulse112 Mission Kanban Pipeline
 *
 * A five-stage incident pipeline rebuilt on the Dispatch AI design system:
 * flat `--panel` surfaces, 1px rules, signal-coloured accents, and no glow or
 * blur. Each card carries the incident's `buildSymbol` triangle, its real
 * per-card AI confidence, its real measured distress (an em-dash when prosody
 * was never captured), and the full unclamped `ai_summary`.
 *
 * Two hard-won behaviours are preserved verbatim:
 *   - `stageOf` maps a call to EXACTLY ONE stage, so no incident can render in
 *     two columns at once.
 *   - The `advanceStage` button stays: drag alone is not keyboard reachable and
 *     the board must be operable without a mouse.
 */

'use client';

import { useState } from 'react';
import { CallStatus, EmergencyCall } from '@/lib/types';
import { Chip, type ChipTone } from '@/components/ui/panel';
import { Symbol } from '@/components/ui/symbol';
import { DistressMeter } from '@/components/DistressMeter';
import { glyphForIncidentType, type IncidentGlyph } from '@/lib/design/symbols';
import { getTimeElapsed } from '@/lib/mock-data';
import { MapPin, Navigation, Shield, MoveRight, Filter, Layers } from 'lucide-react';

interface IncidentKanbanBoardProps {
  calls: EmergencyCall[];
  onSelectCallAndNavigateToMap: (callId: string) => void;
  onUpdateCallStatus: (callId: string, newStatus: CallStatus) => void;
  onOpenWorkflow: (call: EmergencyCall) => void;
}

interface ColumnDef {
  id: string;
  title: string;
  subtitle: string;
  /** Token background class for the 3px stage accent strip and the count pill. */
  accentBg: string;
  countTone: ChipTone;
}

const KANBAN_COLUMNS: ColumnDef[] = [
  {
    id: 'triage',
    title: '1 · Incoming / AI triage',
    subtitle: 'Live speech stream & geolocation lock',
    accentBg: 'bg-critical',
    countTone: 'critical',
  },
  {
    id: 'approval',
    title: '2 · Recommendation & handoff',
    subtitle: 'Awaiting operator authorization',
    accentBg: 'bg-mild',
    countTone: 'mild',
  },
  {
    id: 'dispatched',
    title: '3 · Units dispatched / en route',
    subtitle: 'Active pathfinding & fleet GPS',
    accentBg: 'bg-accent',
    countTone: 'accent',
  },
  {
    id: 'on_scene',
    title: '4 · On scene / mitigation',
    subtitle: 'Responders deployed at coordinates',
    accentBg: 'bg-accent-dim',
    countTone: 'accent',
  },
  {
    id: 'resolved',
    title: '5 · Resolved / closed',
    subtitle: 'Handoff completed & audit logged',
    accentBg: 'bg-safe',
    countTone: 'safe',
  },
];

const STAGE_ORDER = ['triage', 'approval', 'dispatched', 'on_scene', 'resolved'];

/** @description The call status each pipeline stage corresponds to. */
const STATUS_FOR_STAGE: Record<string, CallStatus> = {
  triage: 'pending',
  approval: 'active',
  dispatched: 'dispatched',
  on_scene: 'on_scene',
  resolved: 'resolved',
};

const PRIORITY_FILTERS = ['all', 'critical', 'high', 'medium', 'low'] as const;

/** Severity → the design system's three-tone chip scale. */
function severityTone(severity?: string): ChipTone {
  if (severity === 'critical') return 'critical';
  if (severity === 'high') return 'mild';
  if (severity === 'medium' || severity === 'low') return 'safe';
  return 'neutral';
}

/** The priority code a call carries, or one derived from its severity. */
function priorityCode(call: EmergencyCall): string {
  return (
    call.priority_code ||
    (call.severity === 'critical' ? 'P1' : call.severity === 'high' ? 'P2' : 'P3')
  );
}

/**
 * The measured distress reading, or null when prosody was never captured. Zero
 * is a real measurement; absence is a coverage gap — `DistressMeter` renders the
 * gap as an em-dash rather than inventing a value.
 */
function distressOf(call: EmergencyCall): number | null {
  const level = call.ai_triage?.emotion_analysis?.distress_level;
  return typeof level === 'number' ? level : null;
}

/** Real per-card confidence, as a whole-percent string, or null when ungraded. */
function confidenceOf(call: EmergencyCall): string | null {
  const value = call.ai_confidence ?? call.ai_triage?.confidence;
  return typeof value === 'number' ? `${Math.round(value * 100)}%` : null;
}

export default function IncidentKanbanBoard({
  calls,
  onSelectCallAndNavigateToMap,
  onUpdateCallStatus,
  onOpenWorkflow,
}: IncidentKanbanBoardProps) {
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [draggedCallId, setDraggedCallId] = useState<string | null>(null);

  /**
   * @description Map a call to exactly one pipeline stage. Returning a single
   *              stage per call is what stops an incident rendering in two
   *              columns at once, which the previous per-column predicates could
   *              do for any call whose `status` and `call_status` disagreed.
   */
  const stageOf = (call: EmergencyCall): string => {
    switch ((call.status || 'pending').toLowerCase()) {
      case 'resolved':
      case 'completed':
      case 'closed':
        return 'resolved';
      case 'on_scene':
      case 'mitigating':
        return 'on_scene';
      case 'dispatched':
      case 'en-route':
        return 'dispatched';
      case 'active':
      case 'awaiting_approval':
      case 'pending_approval':
        return 'approval';
      default:
        return 'triage';
    }
  };

  const getCallsForColumn = (column: ColumnDef) =>
    calls.filter((call) => {
      if (filterPriority !== 'all' && call.severity !== filterPriority) return false;
      return stageOf(call) === column.id;
    });

  const handleDragStart = (e: React.DragEvent, callId: string) => {
    e.dataTransfer.setData('text/plain', callId);
    setDraggedCallId(callId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const callId = e.dataTransfer.getData('text/plain') || draggedCallId;
    if (callId) {
      onUpdateCallStatus(callId, STATUS_FOR_STAGE[targetColumnId] ?? 'pending');
    }
    setDraggedCallId(null);
  };

  /**
   * @description Keyboard- and click-reachable equivalent of dragging a card to
   *              the next column. Drag-and-drop alone leaves the pipeline
   *              unusable for anyone not using a mouse.
   */
  const advanceStage = (call: EmergencyCall) => {
    const current = STAGE_ORDER.indexOf(stageOf(call));
    const next = STAGE_ORDER[Math.min(current + 1, STAGE_ORDER.length - 1)];
    if (next && next !== STAGE_ORDER[current]) {
      onUpdateCallStatus(call.id, STATUS_FOR_STAGE[next]);
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-ground text-ink">
      {/* Sub-header & priority filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule bg-panel px-6 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-rule-strong bg-panel-raised text-accent">
            <Layers className="h-4 w-4" aria-hidden />
          </span>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-ink">
              Mission Kanban Pipeline
            </h2>
            <span className="text-2xs text-ink-4">
              Drag cards or advance them to move a stage
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="label flex items-center gap-1">
            <Filter className="h-3 w-3" aria-hidden /> Priority
          </span>
          {PRIORITY_FILTERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilterPriority(p)}
              aria-pressed={filterPriority === p}
              className={
                'rounded-full px-2.5 py-0.5 text-2xs font-medium uppercase tracking-wide transition-colors ' +
                (filterPriority === p
                  ? 'bg-accent/15 text-accent'
                  : 'bg-panel-raised text-ink-3 hover:text-ink')
              }
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Five-column board */}
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-x-auto overflow-y-hidden p-4 md:grid-cols-3 lg:grid-cols-5">
        {KANBAN_COLUMNS.map((column) => {
          const colCalls = getCallsForColumn(column);

          return (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className="flex h-full flex-col overflow-hidden rounded-md border border-rule-strong bg-panel"
            >
              {/* Column header */}
              <div className="border-b border-rule">
                <div className={'h-[3px] w-full ' + column.accentBg} aria-hidden />
                <div className="space-y-1 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink">{column.title}</span>
                    <Chip tone={column.countTone}>{colCalls.length}</Chip>
                  </div>
                  <p className="text-2xs text-ink-4">{column.subtitle}</p>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2.5 overflow-y-auto p-2">
                {colCalls.length === 0 ? (
                  <div className="flex h-28 items-center justify-center rounded-[6px] border border-dashed border-rule p-3 text-center text-2xs text-ink-4">
                    No incidents in this stage
                  </div>
                ) : (
                  colCalls.map((call) => {
                    const glyph: IncidentGlyph = glyphForIncidentType(call.incident_type);
                    const subtype =
                      call.incident_subtype || call.incident_type || 'Unclassified incident';
                    const address = call.caller_location?.address;
                    const confidence = confidenceOf(call);

                    return (
                      <div
                        key={call.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, call.id)}
                        className="group flex cursor-grab flex-col gap-2 rounded-[6px] border border-rule bg-panel-raised p-3 transition-colors hover:border-accent active:cursor-grabbing"
                      >
                        {/* Header: priority, symbol, subtype, elapsed */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Chip tone={severityTone(call.severity)}>{priorityCode(call)}</Chip>
                            <Symbol
                              spec={{
                                kind: 'incident',
                                glyph,
                                severity: call.severity,
                                distress: distressOf(call),
                                size: 20,
                              }}
                              className="shrink-0"
                            />
                            <span className="truncate text-sm font-semibold capitalize text-ink">
                              {subtype}
                            </span>
                          </div>
                          <span className="tnum shrink-0 text-2xs text-ink-3">
                            {getTimeElapsed(call.created_at)}
                          </span>
                        </div>

                        {/* Full AI summary — deliberately unclamped for trained dispatchers. */}
                        <p className="text-sm leading-relaxed text-ink-2">
                          {call.ai_summary ||
                            call.chief_complaint ||
                            'Emergency call in progress; details pending.'}
                        </p>

                        {address && (
                          <div className="flex items-start gap-1.5 text-xs text-ink-3">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                            <span className="break-words">{address}</span>
                          </div>
                        )}

                        {/* Measured distress + real confidence */}
                        <div className="flex items-center justify-between gap-2 border-t border-rule pt-2">
                          <DistressMeter level={distressOf(call)} compact />
                          <span className="tnum text-2xs uppercase tracking-wide text-ink-4">
                            {confidence ? `Conf ${confidence}` : 'Conf —'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 border-t border-rule pt-2">
                          <button
                            type="button"
                            onClick={() => onSelectCallAndNavigateToMap(call.id)}
                            className="flex flex-1 items-center justify-center gap-1 rounded-[4px] border border-rule-strong bg-panel px-2 py-1.5 text-2xs font-medium uppercase tracking-wide text-ink-2 transition-colors hover:border-accent hover:text-accent"
                          >
                            <Navigation className="h-3 w-3" aria-hidden />
                            <span>Open in map</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenWorkflow(call)}
                            className="flex items-center justify-center rounded-[4px] border border-rule-strong bg-panel px-2 py-1.5 text-mild transition-colors hover:border-accent hover:text-accent"
                            title="Review the AI decision timeline"
                            aria-label={`Review the decision timeline for ${subtype}`}
                          >
                            <Shield className="h-3 w-3" aria-hidden />
                          </button>

                          {stageOf(call) !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => advanceStage(call)}
                              className="flex items-center justify-center rounded-[4px] border border-rule-strong bg-panel px-2 py-1.5 text-ink-2 transition-colors hover:border-safe hover:text-safe"
                              title="Advance to the next pipeline stage"
                              aria-label={`Advance ${subtype} to the next stage`}
                            >
                              <MoveRight className="h-3 w-3" aria-hidden />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
