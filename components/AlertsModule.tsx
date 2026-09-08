/**
 * AlertsModule — operational alerts derived from live call state (Task 14).
 *
 * Alerts are never seeded: this maps the board's `EmergencyCall[]` onto the
 * `AlertInput[]` shape and defers every rule to `deriveAlerts`. Open alerts are
 * listed severity-first; acknowledged alerts collapse into a separate section
 * rather than vanishing, so an operator can still see what was cleared. The
 * count of unacknowledged alerts is what feeds the rail's Alerts badge, so
 * acknowledging one here decrements that badge (via `onAckChange`) and — because
 * `acknowledge` persists to localStorage — survives a reload.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';

import type { EmergencyCall } from '@/lib/types';
import {
  acknowledge,
  deriveAlerts,
  readAcknowledged,
  type Alert,
  type AlertInput,
} from '@/lib/alerts';
import { Chip, type ChipTone } from '@/components/ui/panel';
import { cn } from '@/lib/utils';

/** Alert severity → the design system's chip scale. */
function severityTone(severity: Alert['severity']): ChipTone {
  if (severity === 'critical') return 'critical';
  if (severity === 'high') return 'mild';
  if (severity === 'medium') return 'safe';
  return 'neutral';
}

const SEVERITY_RANK: Record<Alert['severity'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export default function AlertsModule({
  calls,
  onSelectCall,
  onAckChange,
}: {
  calls: EmergencyCall[];
  onSelectCall?: (id: string) => void;
  onAckChange?: () => void;
}) {
  // Acknowledged keys. Empty on the server and on first client render (localStorage
  // is browser-only); the effect reconciles after mount, so there is no hydration
  // mismatch and the persisted acknowledgements are restored on reload.
  const [acks, setAcks] = useState<Set<string>>(new Set());
  useEffect(() => {
    setAcks(readAcknowledged());
  }, []);

  const alerts = useMemo(() => {
    const now = Date.now();
    // `deriveAlerts` normalises severity and status itself, so the board's
    // values pass through as-is.
    const input: AlertInput[] = calls.map((c) => ({
      id: c.id,
      severity: c.severity,
      status: c.status,
      created_at: c.created_at,
      ai_confidence: c.ai_confidence,
      caller_location: c.caller_location,
      model_escalated: c.model_escalated,
    }));
    return deriveAlerts(input, now).sort(
      (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
    );
  }, [calls]);

  // An alert carries only a callId, so the row needs the call to name it.
  const callsById = useMemo(() => {
    const map = new Map<string, EmergencyCall>();
    for (const call of calls) map.set(call.id, call);
    return map;
  }, [calls]);

  const open = alerts.filter((a) => !acks.has(a.key));
  const acknowledged = alerts.filter((a) => acks.has(a.key));

  const handleAck = useCallback(
    (key: string) => {
      acknowledge(key);
      setAcks((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      onAckChange?.();
    },
    [onAckChange],
  );

  return (
    <div className="h-full overflow-y-auto bg-ground p-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        {/* Header */}
        <div className="flex items-baseline justify-between gap-3">
          <div>
            {/* The subtitle used to describe the implementation — "computed
                from live call state, never seeded" — which is a fact about the
                code, not about the incidents an operator has to clear. */}
            <h1 className="text-lg font-semibold text-ink">Operational alerts</h1>
            <p className="mt-0.5 text-sm text-ink-3">
              Incidents needing attention now. Each clears as it is located, assigned or resolved.
            </p>
          </div>
          <span className="tnum shrink-0 text-lg font-semibold text-mild">{open.length}</span>
        </div>

        {/* Open alerts, severity-first */}
        <section className="rounded-md border border-rule-strong bg-panel">
          <div className="flex items-center justify-between gap-2 border-b border-rule px-3 py-2">
            <span className="label">Open</span>
            <span className="tnum text-2xs text-ink-4">{open.length}</span>
          </div>
          <div className="p-2">
            {open.length === 0 ? (
              <p className="p-3 text-sm text-ink-3">No open alerts.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {open.map((alert) => (
                  <AlertRow
                    key={alert.key}
                    alert={alert}
                    incident={callsById.get(alert.callId)}
                    onSelectCall={onSelectCall}
                    onAck={() => handleAck(alert.key)}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Acknowledged alerts — collapsed into their own section, not removed,
            so an operator can still see what was cleared. Hidden entirely while
            empty: a bordered panel whose only content is "nothing acknowledged
            yet" is furniture. */}
        {acknowledged.length > 0 && (
        <section className="rounded-md border border-rule-strong bg-panel">
          <div className="flex items-center justify-between gap-2 border-b border-rule px-3 py-2">
            <span className="label">Acknowledged</span>
            <span className="tnum text-2xs text-ink-4">{acknowledged.length}</span>
          </div>
          <div className="p-2">
            {(
              <ul className="flex flex-col gap-2">
                {acknowledged.map((alert) => (
                  <AlertRow
                    key={alert.key}
                    alert={alert}
                    incident={callsById.get(alert.callId)}
                    onSelectCall={onSelectCall}
                    acknowledged
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
        )}
      </div>
    </div>
  );
}

function AlertRow({
  alert,
  incident,
  onSelectCall,
  onAck,
  acknowledged,
}: {
  alert: Alert;
  /** The call this alert is about, so the row can name it. */
  incident?: EmergencyCall;
  onSelectCall?: (id: string) => void;
  onAck?: () => void;
  acknowledged?: boolean;
}) {
  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-[6px] border border-rule bg-ground p-2.5',
        acknowledged && 'opacity-70',
      )}
    >
      <Chip tone={severityTone(alert.severity)}>{alert.severity}</Chip>

      {/* The incident, then what is wrong with it. This row used to lead with
          the rule's own enum (P1_UNASSIGNED) over a sentence that restated both
          the enum and the severity already shown in the chip — so three
          simultaneous critical alerts rendered as three identical rows, and an
          operator could not tell which incident any of them was about. */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium capitalize text-ink">
          {incident?.incident_subtype || incident?.incident_type || `Incident ${alert.callId}`}
        </p>
        <p className="mt-0.5 text-sm text-ink-2">
          {alert.message}
          {incident?.caller_location?.address && (
            <span className="text-ink-4"> · {incident.caller_location.address}</span>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {onSelectCall && (
          <button
            type="button"
            onClick={() => onSelectCall(alert.callId)}
            className="inline-flex items-center gap-1 rounded-[4px] border border-rule px-2 py-1 text-2xs font-medium uppercase tracking-wide text-ink-2 transition-colors hover:border-rule-strong hover:text-ink"
          >
            Incident
            <ChevronRight className="h-3 w-3" aria-hidden />
          </button>
        )}
        {!acknowledged && onAck && (
          <button
            type="button"
            onClick={onAck}
            className="rounded-[4px] bg-accent px-2.5 py-1 text-2xs font-semibold uppercase tracking-wide text-deep transition-colors hover:bg-accent-dim"
          >
            Ack
          </button>
        )}
      </div>
    </li>
  );
}
