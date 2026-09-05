/**
 * IncidentTimeline — the per-incident human-in-the-loop decision timeline.
 *
 * Replaces the old workflow overlay, which had two real defects that must not
 * survive:
 *   1. It hardcoded four fire/EMS recommendations regardless of the open
 *      incident, so a water-main rupture was told to "Deploy Priority 1 Fire &
 *      EMS Units". Here every proposal is derived from the OPEN call.
 *   2. Its state never reset between incidents, so approvals leaked from A to B.
 *      Here state loads via `readTimeline(call.id)` in an effect keyed on the
 *      call id, so opening a different incident resets the view.
 *
 * The three decision points (INTAKE → DISPATCH → RESOLUTION) come from
 * `lib/timeline.ts`; this component renders them and records operator decisions
 * through `recordDecision`/`writeTimeline`. An override REQUIRES a note — the
 * submit is disabled with a clear message until one is entered, so the operator
 * never reaches the throw `recordDecision` raises for a note-less override.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmergencyCall } from '@/lib/types';
import { Chip, type ChipTone } from '@/components/ui/panel';
import { Symbol } from '@/components/ui/symbol';
import { glyphForIncidentType, type IncidentGlyph } from '@/lib/design/symbols';
import { recommendedUnits } from '@/lib/incident';
import { assessDispatch } from '@/lib/dispatch-assurance';
import { TACTICAL_UNITS } from '@/lib/units';
import { releaseUnits, reserveUnits } from '@/lib/dispatch-reservations';
import { useReservedFleet } from '@/lib/useReservedFleet';
import { useDialogFocus } from '@/lib/useDialogFocus';
import {
  DECISION_POINTS,
  type DecisionPoint,
  type DecisionRecord,
  type DecisionProposalSnapshot,
  type TimelineState,
  readTimeline,
  writeTimeline,
  recordDecision,
  currentPoint,
  isComplete,
  emptyTimeline,
} from '@/lib/timeline';
import { X, Check, Pencil, AlertTriangle, Lock } from 'lucide-react';

interface IncidentTimelineProps {
  open: boolean;
  onClose: () => void;
  call: EmergencyCall | null;
  linkedPrimaryCallId?: string | null;
}

type DecisionAction = 'confirmed' | 'amended' | 'overridden';

type Proposal = DecisionProposalSnapshot;

const POINT_LABELS: Record<DecisionPoint, string> = {
  INTAKE: 'Intake',
  DISPATCH: 'Dispatch',
  RESOLUTION: 'Resolution',
};

const POINT_CAPTIONS: Record<DecisionPoint, string> = {
  INTAKE: 'Classification & severity grade',
  DISPATCH: 'Recommended responding units',
  RESOLUTION: 'Close-out & remaining threats',
};

const ACTION_TONE: Record<DecisionAction, ChipTone> = {
  confirmed: 'safe',
  amended: 'mild',
  overridden: 'critical',
};

const ACTION_LABEL: Record<DecisionAction, string> = {
  confirmed: 'Confirmed',
  amended: 'Amended',
  overridden: 'Overridden',
};

/**
 * Build each decision point's proposal from the OPEN call. Nothing here is
 * hardcoded to a service: a utility incident yields its own summary, units, and
 * threats, never fire/EMS boilerplate.
 */
function proposalFor(
  point: DecisionPoint,
  call: EmergencyCall,
  fleet = TACTICAL_UNITS,
  linkedPrimaryCallId?: string | null,
): Proposal {
  const summary =
    call.ai_summary || call.chief_complaint || 'No AI summary captured for this incident.';

  switch (point) {
    case 'INTAKE': {
      const subtype = call.incident_subtype || call.incident_type || 'Unclassified incident';
      const severity = call.severity ? call.severity.toUpperCase() : 'UNGRADED';
      return {
        heading: `Classify as ${subtype} · ${severity}`,
        body: summary,
        items: [],
      };
    }
    case 'DISPATCH': {
      if (linkedPrimaryCallId) {
        return {
          heading: `Use shared response from #${linkedPrimaryCallId}`,
          body: 'Operator-linked duplicate call. Separate unit dispatch is blocked to prevent double allocation.',
          items: [`Primary incident #${linkedPrimaryCallId}`],
        };
      }
      const assurance = assessDispatch(call, fleet);
      const units = assurance.assignments.map(
        (assignment) =>
          `${assignment.callsign} (${assignment.unit_id}) · ETA ${assignment.eta_minutes} min · ${assignment.status === 'on_target' ? 'ON TARGET' : 'AT RISK'}`,
      );
      const fallbackUnits = recommendedUnits(call);

      if (!assurance.dispatch_ready) {
        return {
          heading:
            assurance.status === 'location_required'
              ? 'Verify location before dispatch'
              : assurance.status === 'plan_required'
                ? 'Create a service-level dispatch plan'
                : 'Escalate uncovered services before dispatch',
          body: assurance.reason,
          items: units.length > 0 ? units : fallbackUnits,
        };
      }

      return {
        heading: units.length
          ? assurance.status === 'at_risk'
            ? `Response target at risk · dispatch or escalate now`
            : `Dispatch within configured ${assurance.target_minutes}-minute target`
          : 'No recommended units on file',
        body: units.length
          ? assurance.reason
          : 'No unit recommendation was produced for this incident. Dispatch on operator judgment, then record the decision.',
        items: units.length > 0 ? units : fallbackUnits,
      };
    }
    case 'RESOLUTION': {
      const threats = call.immediate_threats ?? [];
      return {
        heading: threats.length
          ? 'Resolve once these threats are cleared'
          : 'Resolve and close the incident',
        body: summary,
        items: threats,
      };
    }
  }
}

export default function IncidentTimeline({
  open,
  onClose,
  call,
  linkedPrimaryCallId,
}: IncidentTimelineProps) {
  const callId = call?.id ?? null;

  const [timeline, setTimeline] = useState<TimelineState>(() => emptyTimeline(callId ?? ''));
  const [action, setAction] = useState<DecisionAction>('confirmed');
  const [note, setNote] = useState('');
  const [reservationError, setReservationError] = useState('');

  // Initial focus, Tab trap, Escape-to-close, and focus restore — from the one
  // shared hook the voice station also uses, so the two dialogs cannot diverge.
  const { dialogRef, onKeyDown } = useDialogFocus(open, onClose);

  /**
   * Load this incident's timeline whenever the OPEN call changes. Keying on the
   * call id is what resets the view between incidents: opening B after deciding
   * on A shows B's own (empty) timeline, never A's leaked approvals.
   */
  useEffect(() => {
    if (!open || !callId) return;
    setTimeline(readTimeline(callId));
    setAction('confirmed');
    setNote('');
    setReservationError('');
  }, [callId, open]);

  const pending = useMemo(() => currentPoint(timeline), [timeline]);
  const complete = useMemo(() => isComplete(timeline), [timeline]);
  const decidedByPoint = useMemo(() => {
    const map = new Map<DecisionPoint, DecisionRecord>();
    for (const r of timeline.records) map.set(r.point, r);
    return map;
  }, [timeline]);

  const overrideMissingNote = action === 'overridden' && note.trim() === '';
  const operationalFleet = useReservedFleet(TACTICAL_UNITS, call?.id ?? '');
  const dispatchAssurance = useMemo(
    () => (call ? assessDispatch(call, operationalFleet) : null),
    [call, operationalFleet],
  );
  const duplicateDispatchBlocked = pending === 'DISPATCH' && Boolean(linkedPrimaryCallId);
  const dispatchBlocked =
    pending === 'DISPATCH' && dispatchAssurance?.dispatch_ready === false;
  const blockedConfirmation = duplicateDispatchBlocked || (dispatchBlocked && action !== 'overridden');

  const submit = useCallback(async () => {
    if (!pending || !call || blockedConfirmation) return;
    const trimmed = note.trim();
    const proposal = proposalFor(pending, call, operationalFleet, linkedPrimaryCallId);

    if (pending === 'DISPATCH' && action !== 'overridden') {
      const reservation = await reserveUnits(
        call.id,
        dispatchAssurance?.assignments.map((assignment) => assignment.unit_id) ?? [],
      );
      if (!reservation.ok) {
        setReservationError(
          `Unit reservation changed. Recheck: ${reservation.conflicts.join(', ')}.`,
        );
        return;
      }
    }

    if (pending === 'RESOLUTION' && action !== 'overridden') {
      await releaseUnits(call.id);
    }

    let record: DecisionRecord;
    if (action === 'overridden') {
      // Guarded by the disabled submit, but never build the record without a
      // note: `recordDecision` throws otherwise.
      if (trimmed === '') return;
      record = { point: pending, action: 'overridden', at: new Date().toISOString(), note: trimmed, proposal };
    } else {
      record = {
        point: pending,
        action,
        at: new Date().toISOString(),
        ...(trimmed ? { note: trimmed } : {}),
        proposal,
      };
    }
    const next = recordDecision(timeline, record);
    writeTimeline(next);
    setTimeline(next);
    setAction('confirmed');
    setNote('');
    setReservationError('');
  }, [action, blockedConfirmation, call, dispatchAssurance, linkedPrimaryCallId, note, operationalFleet, pending, timeline]);

  if (!open || !call) return null;

  const glyph: IncidentGlyph = glyphForIncidentType(call.incident_type);
  const subtype = call.incident_subtype || call.incident_type || 'Unclassified incident';
  const titleId = 'incident-timeline-title';

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-deep/80 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-rule-strong bg-panel text-ink outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-rule px-4 py-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <Symbol
              spec={{ kind: 'incident', glyph, severity: call.severity, size: 28 }}
              className="mt-0.5 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="label">Decision timeline</span>
                <span className="tnum text-2xs text-ink-4">#{call.id}</span>
              </div>
              <h2 id={titleId} className="truncate text-md font-semibold capitalize text-ink">
                {subtype}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close decision timeline"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-rule-strong bg-panel-raised text-ink-3 transition-colors hover:border-accent hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Progress summary */}
        <div className="flex items-center justify-between gap-2 border-b border-rule px-4 py-2">
          <span className="text-xs text-ink-3">
            {complete
              ? 'All decision points recorded.'
              : `Awaiting: ${POINT_LABELS[pending as DecisionPoint]}`}
          </span>
          <span className="tnum text-2xs uppercase tracking-wide text-ink-4">
            {timeline.records.length} / {DECISION_POINTS.length} decided
          </span>
        </div>

        {/* Decision points */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {DECISION_POINTS.map((point) => {
            const record = decidedByPoint.get(point);
            const proposal = record?.proposal ?? proposalFor(point, call, operationalFleet, linkedPrimaryCallId);
            const isCurrent = point === pending;
            const isDecided = Boolean(record);
            const isUpcoming = !isDecided && !isCurrent;

            return (
              <section
                key={point}
                aria-labelledby={`tl-${point}`}
                className={
                  'rounded-[6px] border p-3 ' +
                  (isCurrent
                    ? 'border-accent bg-panel-raised'
                    : isUpcoming
                    ? 'border-rule bg-panel opacity-60'
                    : 'border-rule bg-panel')
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span id={`tl-${point}`} className="text-sm font-semibold text-ink">
                      {POINT_LABELS[point]}
                    </span>
                    <span className="text-2xs text-ink-4">{POINT_CAPTIONS[point]}</span>
                  </div>
                  {isDecided && record ? (
                    <Chip tone={ACTION_TONE[record.action]} dot>
                      {ACTION_LABEL[record.action]}
                    </Chip>
                  ) : isUpcoming ? (
                    <span className="flex items-center gap-1 text-2xs uppercase tracking-wide text-ink-4">
                      <Lock className="h-3 w-3" aria-hidden /> Locked
                    </span>
                  ) : (
                    <Chip tone="accent">Awaiting decision</Chip>
                  )}
                </div>

                {/* AI proposal — derived from this call */}
                <div className="mt-2 rounded-[4px] border border-rule bg-deep/40 p-2.5">
                  <p className="label mb-1">AI proposal</p>
                  <p className="text-sm font-medium text-ink">{proposal.heading}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{proposal.body}</p>
                  {proposal.items.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {proposal.items.map((item) => (
                        <Chip
                          key={item}
                          tone={point === 'RESOLUTION' ? 'critical' : 'accent'}
                        >
                          {item}
                        </Chip>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recorded decision detail */}
                {isDecided && record?.note && (
                  <p className="mt-2 text-xs text-ink-3">
                    <span className="label">Note</span> {record.note}
                  </p>
                )}

                {/* Operator controls, only for the current point */}
                {isCurrent && (
                  <div className="mt-3 space-y-2 border-t border-rule pt-3">
                    <div className="flex flex-wrap gap-2">
                      {(['confirmed', 'amended', 'overridden'] as DecisionAction[]).map((a) => {
                        const Icon =
                          a === 'confirmed' ? Check : a === 'amended' ? Pencil : AlertTriangle;
                        const selected = action === a;
                        return (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setAction(a)}
                            aria-pressed={selected}
                            className={
                              'flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1.5 text-xs font-medium transition-colors ' +
                              (selected
                                ? 'border-accent bg-accent/15 text-accent'
                                : 'border-rule-strong bg-panel text-ink-2 hover:border-accent hover:text-ink')
                            }
                          >
                            <Icon className="h-3 w-3" aria-hidden />
                            {ACTION_LABEL[a]}
                          </button>
                        );
                      })}
                    </div>

                    <div>
                      <label
                        htmlFor={`tl-note-${point}`}
                        className="label mb-1 block"
                      >
                        {action === 'overridden'
                          ? 'Override justification (required)'
                          : 'Note (optional)'}
                      </label>
                      <textarea
                        id={`tl-note-${point}`}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder={
                          action === 'overridden'
                            ? 'State why the AI proposal is being overridden…'
                            : 'Add an operator note…'
                        }
                        aria-invalid={overrideMissingNote}
                        className="w-full resize-y rounded-[4px] border border-rule-strong bg-deep/40 px-2.5 py-2 text-sm text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none"
                      />
                    </div>

                    {overrideMissingNote && (
                      <p className="flex items-center gap-1.5 text-xs text-critical-bright" role="alert">
                        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                        An override requires a justification note before it can be recorded.
                      </p>
                    )}

                    {blockedConfirmation && (
                      <p className="flex items-center gap-1.5 text-xs text-critical-bright" role="alert">
                        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                        {duplicateDispatchBlocked
                          ? `Separate dispatch is blocked because this call shares response with #${linkedPrimaryCallId}.`
                          : 'Dispatch confirmation is blocked. Resolve the assurance issue, or choose Override and document why.'}
                      </p>
                    )}

                    {reservationError && (
                      <p className="flex items-center gap-1.5 text-xs text-critical-bright" role="alert">
                        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                        {reservationError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={submit}
                      disabled={overrideMissingNote || blockedConfirmation}
                      className={
                        'w-full rounded-[4px] border px-3 py-2 text-sm font-semibold transition-colors ' +
                        (overrideMissingNote || blockedConfirmation
                          ? 'cursor-not-allowed border-rule bg-panel text-ink-4'
                          : 'border-accent bg-accent/15 text-accent hover:bg-accent/25')
                      }
                    >
                      Record {ACTION_LABEL[action].toLowerCase()} decision
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
