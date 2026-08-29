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
            <h1 className="text-lg font-semibold text-ink">Operational alerts</h1>
            <p className="mt-0.5 text-sm text-ink-3">
              Computed from live call state, never seeded. Clears as incidents are located,
              assigned, and resolved.
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
                    onSelectCall={onSelectCall}
                    onAck={() => handleAck(alert.key)}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Acknowledged alerts — collapsed into their own section, not removed */}
        <section className="rounded-md border border-rule-strong bg-panel">
          <div className="flex items-center justify-between gap-2 border-b border-rule px-3 py-2">
            <span className="label">Acknowledged</span>
            <span className="tnum text-2xs text-ink-4">{acknowledged.length}</span>
          </div>
          <div className="p-2">
            {acknowledged.length === 0 ? (
              <p className="p-3 text-sm text-ink-3">Nothing acknowledged yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {acknowledged.map((alert) => (
                  <AlertRow key={alert.key} alert={alert} onSelectCall={onSelectCall} acknowledged />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function AlertRow({
  alert,
  onSelectCall,
  onAck,
  acknowledged,
}: {
  alert: Alert;
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

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xs font-semibold uppercase tracking-wide text-ink-3">
            {alert.code}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-ink-2">{alert.message}</p>
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
