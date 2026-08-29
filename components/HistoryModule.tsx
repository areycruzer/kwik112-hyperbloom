/**
 * HistoryModule — the call history & audit log (Task 15).
 *
 * Renders in the main region (not a full-screen overlay). A full-width,
 * tabular-nums table with NO truncation of the summary or address: this project
 * deliberately favours density because dispatchers are trained on dense screens,
 * and clamping the summary was one of the original defects. Sortable by age and
 * severity; filterable by severity and free text. Each row is keyboard-reachable
 * (`role="button"` + `tabIndex`).
 */

'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';

import type { EmergencyCall, Severity } from '@/lib/types';
import { getTimeElapsed } from '@/lib/mock-data';
import { Chip, type ChipTone } from '@/components/ui/panel';
import { cn } from '@/lib/utils';

type SeverityFilter = 'all' | Severity;
type SortField = 'age' | 'severity';
type SortDir = 'asc' | 'desc';

const SEVERITY_FILTERS: SeverityFilter[] = ['all', 'critical', 'high', 'medium', 'low'];

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function severityTone(severity?: string): ChipTone {
  if (severity === 'critical') return 'critical';
  if (severity === 'high') return 'mild';
  if (severity === 'medium' || severity === 'low') return 'safe';
  return 'neutral';
}

function priorityCode(call: EmergencyCall): string {
  return (
    call.priority_code ||
    (call.severity === 'critical' ? 'P1' : call.severity === 'high' ? 'P2' : 'P3')
  );
}

/** Milliseconds since a call was created; Infinity when the timestamp is unusable. */
function ageMs(call: EmergencyCall): number {
  const t = Date.parse(call.created_at);
  return Number.isNaN(t) ? Infinity : Date.now() - t;
}

export default function HistoryModule({
  calls,
  onSelectCall,
}: {
  calls: EmergencyCall[];
  onSelectCall?: (id: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<SeverityFilter>('all');
  const [sortField, setSortField] = useState<SortField>('age');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = calls.filter((call) => {
      const matchesSeverity = filterSeverity === 'all' || call.severity === filterSeverity;
      if (!matchesSeverity) return false;
      if (!q) return true;
      const haystack = [
        call.incident_subtype,
        call.incident_type,
        call.ai_summary,
        call.chief_complaint,
        call.caller_location?.address,
        call.caller_number,
        call.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp: number;
      if (sortField === 'age') {
        // Ascending age = youngest first (smallest elapsed time).
        cmp = ageMs(a) - ageMs(b);
      } else {
        const ra = a.severity ? SEVERITY_RANK[a.severity] : 99;
        const rb = b.severity ? SEVERITY_RANK[b.severity] : 99;
        cmp = ra - rb;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [calls, searchQuery, filterSeverity, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortIndicator = (field: SortField) =>
    sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const onRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      onSelectCall?.(id);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-ground p-4">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-ink">Call history</h1>
            <p className="mt-0.5 text-sm text-ink-3">Audit archive of every logged incident.</p>
          </div>
          <span className="tnum shrink-0 text-lg font-semibold text-ink-2">{rows.length}</span>
        </div>

        {/* Filter toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
              aria-hidden
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search summary, type, address, caller…"
              aria-label="Search call history"
              className="w-full rounded-[4px] border border-rule bg-panel py-1.5 pl-8 pr-2.5 text-sm text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 rounded-[4px] border border-rule bg-panel p-0.5">
            {SEVERITY_FILTERS.map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setFilterSeverity(sev)}
                className={cn(
                  'rounded-[4px] px-2.5 py-1 text-2xs font-medium uppercase tracking-wide transition-colors',
                  filterSeverity === sev
                    ? 'bg-panel-raised text-ink'
                    : 'text-ink-3 hover:text-ink-2',
                )}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Full-width table */}
        <div className="overflow-x-auto rounded-md border border-rule-strong bg-panel">
          <table className="w-full border-collapse text-left text-sm tnum">
            <thead>
              <tr className="border-b border-rule-strong">
                <Th>Priority</Th>
                <Th>Type</Th>
                <Th>Summary</Th>
                <Th>Location</Th>
                <Th>Caller</Th>
                <Th>Status</Th>
                <Th sortable onClick={() => toggleSort('severity')}>
                  Severity{sortIndicator('severity')}
                </Th>
                <Th sortable onClick={() => toggleSort('age')}>
                  Age{sortIndicator('age')}
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-sm text-ink-3">
                    No incidents match the current filter.
                  </td>
                </tr>
              ) : (
                rows.map((call) => (
                  <tr
                    key={call.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open incident ${call.incident_subtype || call.incident_type || call.id}`}
                    onClick={() => onSelectCall?.(call.id)}
                    onKeyDown={(e) => onRowKeyDown(e, call.id)}
                    className="cursor-pointer border-b border-rule align-top transition-colors last:border-b-0 hover:bg-panel-raised focus-visible:bg-panel-raised"
                  >
                    <Td>
                      <Chip tone={severityTone(call.severity)}>{priorityCode(call)}</Chip>
                    </Td>
                    <Td className="font-medium capitalize text-ink">
                      {call.incident_subtype || call.incident_type || 'Unclassified'}
                    </Td>
                    {/* Summary — deliberately NOT truncated. */}
                    <Td className="max-w-[420px] whitespace-normal break-words text-ink-2">
                      {call.ai_summary || call.chief_complaint || 'Emergency reported'}
                    </Td>
                    {/* Address — deliberately NOT truncated. */}
                    <Td className="max-w-[280px] whitespace-normal break-words text-ink-3">
                      {call.caller_location?.address || 'Location pending'}
                    </Td>
                    <Td className="text-ink-3">{call.caller_number || '—'}</Td>
                    <Td>
                      <span className="text-2xs uppercase tracking-wide text-ink-3">
                        {call.status || 'active'}
                      </span>
                    </Td>
                    <Td className="text-2xs uppercase tracking-wide text-ink-3">
                      {call.severity || '—'}
                    </Td>
                    <Td className="whitespace-nowrap text-ink-3">{getTimeElapsed(call.created_at)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  sortable,
  onClick,
}: {
  children: React.ReactNode;
  sortable?: boolean;
  onClick?: () => void;
}) {
  return (
    <th className="px-3 py-2.5">
      {sortable ? (
        <button
          type="button"
          onClick={onClick}
          className="label transition-colors hover:text-ink-2"
        >
          {children}
        </button>
      ) : (
        <span className="label">{children}</span>
      )}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-3 py-2.5', className)}>{children}</td>;
}
