/**
 * Dispatch AI — Tactical CAD console.
 *
 * Four-column shell: command bar across the top, then an icon module rail, the
 * incident panel (queue + detail), and a full-bleed satellite map. "112 Pulse"
 * badges only the emotion-aware voice-intake action in the command bar.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  MapPin,
  Radio,
  Search,
} from 'lucide-react';

import { CallStatus, EmergencyCall } from '@/lib/types';
import { mockCalls, getTimeElapsed } from '@/lib/mock-data';
import { glyphForIncidentType, type IncidentGlyph } from '@/lib/design/symbols';
import { deriveAlerts, readAcknowledged, type AlertInput } from '@/lib/alerts';
import { cn } from '@/lib/utils';

import { Symbol } from '@/components/ui/symbol';
import { Chip, DataRow, type ChipTone } from '@/components/ui/panel';
import { DistressMeter } from '@/components/DistressMeter';
import { ModuleRail, type ModuleId } from '@/components/ModuleRail';
import { ModuleBoard } from '@/components/ModuleBoard';
import { UnitRoster } from '@/components/UnitRoster';
import { TACTICAL_UNITS } from '@/lib/units';

import StartEmergencyCall from '@/components/StartEmergencyCall';
import IncidentWorkflowOverlay from '@/components/IncidentWorkflowOverlay';
import DataManagementDashboard from '@/components/DataManagementDashboard';
import CallHistoryOverlay from '@/components/CallHistoryOverlay';
import IncidentKanbanBoard from '@/components/IncidentKanbanBoard';

// Leaflet needs the DOM; render the map client-side only.
const EmergencyMap = dynamic(() => import('@/components/EmergencyMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-deep">
      <p className="label">Initializing situational map…</p>
    </div>
  ),
});

const CLOSED_STATUSES = new Set(['resolved', 'completed', 'closed']);

type SeverityFilter = 'all' | 'critical' | 'high' | 'other';
type PanelTab = 'emergencies' | 'alerts';
type PanelView = 'queue' | 'detail';
type MainView = 'map' | 'board';

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
 * is a real measurement; absence is a coverage gap. `DistressMeter` renders the
 * gap as an em-dash, which is exactly the contrast 112 Pulse is meant to show.
 */
function distressOf(call: EmergencyCall): number | null {
  const level = call.ai_triage?.emotion_analysis?.distress_level;
  return typeof level === 'number' ? level : null;
}

/**
 * Where this call's grade came from. Only a call carrying a measured prosody
 * reading is attributed to the live 112 Pulse voice station; a seeded or
 * keyword-graded call is not dressed up as one.
 */
function triageSource(call: EmergencyCall): string {
  if (call.ai_triage?.emotion_analysis?.distress_level != null) return '112 Pulse voice';
  if (call.ai_confidence != null || call.ai_triage?.confidence != null) return 'AI triage';
  return 'Manual intake';
}

/** A call still awaiting a model grade shows a REFINING chip. */
function awaitingRefinement(call: EmergencyCall): boolean {
  return call.ai_confidence == null && call.ai_triage?.confidence == null;
}

/** The recommended responding units drawn from real fields, never invented. */
function recommendedUnits(call: EmergencyCall): string[] {
  if (call.recommended_units?.length) return call.recommended_units;
  const rec = call.ai_recommendation;
  if (rec && typeof rec === 'object') {
    const units = [rec.primary_unit, ...(rec.support_units ?? [])].filter(Boolean) as string[];
    if (units.length) return units;
  }
  return [];
}

function confidencePercent(value?: number): string | null {
  return typeof value === 'number' ? `${Math.round(value * 100)}%` : null;
}

export default function DashboardPage() {
  const [calls, setCalls] = useState<EmergencyCall[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const [activeModule, setActiveModule] = useState<ModuleId>('monitoring');
  const [panelTab, setPanelTab] = useState<PanelTab>('emergencies');
  const [panelView, setPanelView] = useState<PanelView>('queue');
  const [mainView, setMainView] = useState<MainView>('map');

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [dataDashboardOpen, setDataDashboardOpen] = useState(false);
  const [callHistoryOpen, setCallHistoryOpen] = useState(false);

  const [clock, setClock] = useState('');

  // Live clock, tabular so the digits do not jitter.
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString([], {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reading the selection through a ref keeps `loadCalls` stable, so the poll
  // interval below is not torn down and rebuilt on every selection change.
  const selectedCallIdRef = useRef<string | null>(null);
  selectedCallIdRef.current = selectedCallId;

  /** @description Stored calls shadow their mock counterpart instead of joining it. */
  const mergeCalls = (stored: EmergencyCall[]): EmergencyCall[] => {
    const byId = new Map<string, EmergencyCall>();
    for (const call of [...stored, ...mockCalls]) {
      if (call && call.id && !byId.has(call.id)) byId.set(call.id, call);
    }
    return [...byId.values()];
  };

  const readStored = (): EmergencyCall[] => {
    try {
      const raw = localStorage.getItem('kwik_emergency_calls');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error reading stored calls:', e);
      return [];
    }
  };

  /**
   * @description Poll storage, but only push new state when something actually
   *              changed. Handing React a fresh array every five seconds makes
   *              the Leaflet effects tear down and rebuild every marker and
   *              re-centre the map under the operator.
   */
  const callsFingerprint = useRef<string>('');

  const loadCalls = useCallback(() => {
    const merged = mergeCalls(readStored());
    const fingerprint = merged.map((c) => `${c.id}:${c.status}:${c.updated_at}`).join('|');

    if (fingerprint !== callsFingerprint.current) {
      callsFingerprint.current = fingerprint;
      setCalls(merged);
    }

    if (!selectedCallIdRef.current && merged.length > 0) {
      setSelectedCallId(merged[0].id);
    }
  }, []);

  useEffect(() => {
    loadCalls();
    const interval = setInterval(loadCalls, 5000);
    return () => clearInterval(interval);
  }, [loadCalls]);

  useEffect(() => {
    const handleCallUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ call: EmergencyCall; isUpdate: boolean }>).detail;
      loadCalls();
      if (detail && !detail.isUpdate) {
        setSelectedCallId(detail.call.id);
      }
    };
    window.addEventListener('kwik-call-updated', handleCallUpdated);
    return () => window.removeEventListener('kwik-call-updated', handleCallUpdated);
  }, [loadCalls]);

  /**
   * @description Persist only the changed call. Writing the whole merged list
   *              back would push the mock seed into storage, where the next poll
   *              would merge it with `mockCalls` again and double the queue.
   */
  const handleUpdateCallStatus = useCallback((callId: string, newStatus: CallStatus) => {
    setCalls((prev) => {
      const target = prev.find((c) => c.id === callId);
      if (!target) return prev;

      const updated: EmergencyCall = {
        ...target,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      try {
        const stored = readStored().filter((c) => c.id !== callId);
        localStorage.setItem('kwik_emergency_calls', JSON.stringify([updated, ...stored]));
      } catch (e) {
        console.error('Error persisting call status:', e);
      }

      const next = prev.map((c) => (c.id === callId ? updated : c));
      callsFingerprint.current = next
        .map((c) => `${c.id}:${c.status}:${c.updated_at}`)
        .join('|');
      return next;
    });
  }, []);

  const handleSelectCallAndNavigateToMap = useCallback((callId: string) => {
    setSelectedCallId(callId);
    setMainView('map');
  }, []);

  // Stable identities keep the Leaflet marker effect from re-running (and
  // re-opening the popup) on every one-second clock tick.
  const handleMarkerClick = useCallback((id: string) => setSelectedCallId(id), []);
  const handleSelectUnit = useCallback(
    (id: string) => setSelectedUnitId((prev) => (prev === id ? null : id)),
    [],
  );
  const handleDispatchUnit = useCallback(() => setWorkflowOpen(true), []);
  const handleOpenWorkflow = useCallback((call: EmergencyCall) => {
    setSelectedCallId(call.id);
    setWorkflowOpen(true);
  }, []);

  const selectCall = useCallback((callId: string) => {
    setSelectedCallId(callId);
    setPanelView('detail');
  }, []);

  const selectedCall = calls.find((c) => c.id === selectedCallId) || calls[0];

  // Stat-row figures, all computed from the live board.
  const totalCount = calls.length;
  const criticalCount = calls.filter((c) => c.severity === 'critical').length;
  const highCount = calls.filter((c) => c.severity === 'high').length;
  const resolvedCount = calls.filter((c) =>
    CLOSED_STATUSES.has((c.status ?? '').toLowerCase()),
  ).length;

  // Operational alerts are derived from call state, then reduced by whatever the
  // operator has already acknowledged. The count feeds the rail's Alerts badge.
  const alerts = useMemo(() => {
    const now = Date.now();
    const input: AlertInput[] = calls.map((c) => ({
      id: c.id,
      severity: c.severity,
      status: c.status,
      created_at: c.created_at,
      ai_confidence: c.ai_confidence,
      caller_location: c.caller_location,
    }));
    const acknowledged = readAcknowledged();
    return deriveAlerts(input, now).filter((a) => !acknowledged.has(a.key));
    // `calls` identity only changes when the fingerprint changes, so this is stable
    // between polls that see no real change.
  }, [calls]);

  // Floating modules mounted over the map's right side (Task 11 / 11b). The
  // roster is the first module; a compact live summary sits beside it so
  // repositioning is observable. Both read real board data only.
  const modules = useMemo(
    () => ({
      roster: {
        title: 'Unit Roster',
        node: (
          <UnitRoster
            units={TACTICAL_UNITS}
            selectedCall={selectedCall ?? null}
            selectedUnitId={selectedUnitId}
            onSelectUnit={handleSelectUnit}
          />
        ),
      },
      summary: {
        title: 'Board Summary',
        node: (
          <div className="flex flex-col">
            <DataRow label="Total incidents" value={totalCount} mono />
            <DataRow label="Critical" value={criticalCount} mono />
            <DataRow label="High" value={highCount} mono />
            <DataRow label="Resolved" value={resolvedCount} mono />
            <DataRow label="Open alerts" value={alerts.length} mono />
          </div>
        ),
      },
    }),
    [
      selectedCall,
      selectedUnitId,
      handleSelectUnit,
      totalCount,
      criticalCount,
      highCount,
      resolvedCount,
      alerts.length,
    ],
  );

  const filteredCalls = calls.filter((call) => {
    const haystack = [
      call.ai_summary,
      call.chief_complaint,
      call.incident_subtype,
      call.incident_type,
      call.caller_location?.address,
    ]
      .join(' ')
      .toLowerCase();
    const matchesSearch = haystack.includes(searchQuery.toLowerCase());

    const matchesSeverity =
      severityFilter === 'all'
        ? true
        : severityFilter === 'critical'
        ? call.severity === 'critical'
        : severityFilter === 'high'
        ? call.severity === 'high'
        : call.severity === 'medium' || call.severity === 'low';

    return matchesSearch && matchesSeverity;
  });

  const handleModuleSelect = useCallback((id: ModuleId) => {
    setActiveModule(id);
    if (id === 'monitoring') {
      setPanelTab('emergencies');
    } else if (id === 'alerts') {
      setPanelTab('alerts');
      setPanelView('queue');
    } else if (id === 'history') {
      setCallHistoryOpen(true);
    } else if (id === 'forecast') {
      setDataDashboardOpen(true);
    }
  }, []);

  // When a transient overlay module closes, return the rail highlight to the
  // module the panel is actually showing.
  const restoreModule = useCallback(() => {
    setActiveModule((prev) =>
      prev === 'history' || prev === 'forecast'
        ? panelTab === 'alerts'
          ? 'alerts'
          : 'monitoring'
        : prev,
    );
  }, [panelTab]);

  const selectTab = useCallback((tab: PanelTab) => {
    setPanelTab(tab);
    setPanelView('queue');
    setActiveModule(tab === 'alerts' ? 'alerts' : 'monitoring');
  }, []);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-ground text-ink">
      {/* ---- COMMAND BAR ---------------------------------------------------- */}
      <header className="flex h-14 shrink-0 select-none items-center justify-between gap-4 border-b border-rule-strong bg-deep px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-rule-strong bg-panel text-accent">
              <Radio className="h-4 w-4" aria-hidden />
            </span>
            <div className="leading-tight">
              <div className="text-md font-semibold tracking-wide text-ink">DISPATCH AI</div>
              <div className="text-2xs text-ink-3">Delhi Command Desk · National 112 Control</div>
            </div>
          </div>

          {/* Environment telemetry — real board figures only. */}
          <div className="hidden items-center gap-4 border-l border-rule pl-4 lg:flex">
            <div className="leading-tight">
              <div className="label">Incidents</div>
              <div className="tnum text-sm text-ink-2">{totalCount}</div>
            </div>
            <div className="leading-tight">
              <div className="label">Critical</div>
              <div className="tnum text-sm text-critical-bright">{criticalCount}</div>
            </div>
            <div className="leading-tight">
              <div className="label">Open alerts</div>
              <div className="tnum text-sm text-mild">{alerts.length}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Main-area view switch keeps the map and the incident board reachable. */}
          <div className="hidden items-center gap-1 rounded-[4px] border border-rule bg-panel p-0.5 md:flex">
            {(['map', 'board'] as MainView[]).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setMainView(view)}
                className={cn(
                  'rounded-[4px] px-2.5 py-1 text-2xs font-medium uppercase tracking-wide transition-colors',
                  mainView === view
                    ? 'bg-panel-raised text-ink'
                    : 'text-ink-3 hover:text-ink-2',
                )}
              >
                {view === 'map' ? 'Map' : 'Board'}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-2 rounded-[4px] border border-rule bg-panel px-2.5 py-1.5 sm:flex">
            <span className="tnum text-sm text-ink">{clock}</span>
            <span className="inline-flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-accent-bright">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-bright" aria-hidden />
              Live
            </span>
          </div>

          {/* 112 PULSE — the emotion-aware voice-intake action. */}
          <div className="flex items-center gap-2">
            <Chip tone="accent">112 Pulse</Chip>
            <StartEmergencyCall
              onCallCreated={(id) => {
                setSelectedCallId(id);
                setMainView('map');
                setPanelView('detail');
              }}
            />
          </div>
        </div>
      </header>

      {/* ---- BODY: RAIL · INCIDENT PANEL · MAIN ---------------------------- */}
      <div className="flex min-h-0 flex-1">
        <ModuleRail active={activeModule} onSelect={handleModuleSelect} alertCount={alerts.length} />

        {/* Incident panel */}
        <aside className="flex w-[360px] shrink-0 flex-col border-r border-rule-strong bg-ground xl:w-[400px]">
          {/* Tabs */}
          <div className="flex shrink-0 border-b border-rule-strong">
            {(['emergencies', 'alerts'] as PanelTab[]).map((tab) => {
              const isActive = panelTab === tab;
              const label = tab === 'emergencies' ? 'Emergencies' : 'Alerts';
              const count = tab === 'emergencies' ? totalCount : alerts.length;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => selectTab(tab)}
                  className={cn(
                    'flex-1 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-accent text-ink'
                      : 'border-transparent text-ink-3 hover:text-ink-2',
                  )}
                >
                  {label}
                  <span className="tnum ml-1.5 text-ink-4">{count}</span>
                </button>
              );
            })}
          </div>

          {panelView === 'detail' && selectedCall ? (
            <IncidentDetail
              call={selectedCall}
              onBack={() => setPanelView('queue')}
              onOpenTimeline={() => {
                setSelectedCallId(selectedCall.id);
                setWorkflowOpen(true);
              }}
            />
          ) : panelTab === 'alerts' ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {alerts.length === 0 ? (
                <p className="p-3 text-sm text-ink-3">
                  No open alerts. Operational alerts are computed from the live board, so this
                  clears as incidents are located, assigned, and resolved.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {alerts.map((alert) => (
                    <li key={alert.key}>
                      <button
                        type="button"
                        onClick={() => selectCall(alert.callId)}
                        className="flex w-full items-start gap-2 rounded-[6px] border border-rule bg-panel p-2.5 text-left transition-colors hover:border-rule-strong"
                      >
                        <Chip tone={severityTone(alert.severity)}>{alert.severity}</Chip>
                        <span className="text-sm text-ink-2">{alert.message}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              {/* Search + filter */}
              <div className="shrink-0 space-y-2 border-b border-rule-strong p-2.5">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
                    aria-hidden
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search summary, type, address…"
                    aria-label="Search incidents"
                    className="w-full rounded-[4px] border border-rule bg-panel py-1.5 pl-8 pr-2.5 text-sm text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none"
                  />
                </div>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
                  aria-label="Filter by severity"
                  className="w-full rounded-[4px] border border-rule bg-panel px-2.5 py-1.5 text-sm text-ink-2 focus:border-accent focus:outline-none"
                >
                  <option value="all">All severities</option>
                  <option value="critical">Critical (P1)</option>
                  <option value="high">High (P2)</option>
                  <option value="other">Medium / Low</option>
                </select>
              </div>

              {/* Stat row */}
              <div className="grid shrink-0 grid-cols-3 border-b border-rule-strong">
                {[
                  { label: 'Total', value: totalCount, tone: 'text-ink' },
                  { label: 'Critical', value: criticalCount, tone: 'text-critical-bright' },
                  { label: 'Resolved', value: resolvedCount, tone: 'text-safe' },
                ].map((cell) => (
                  <div
                    key={cell.label}
                    className="flex flex-col gap-0.5 border-r border-rule px-3 py-2 last:border-r-0"
                  >
                    <span className="label">{cell.label}</span>
                    <span className={cn('tnum text-lg font-semibold', cell.tone)}>{cell.value}</span>
                  </div>
                ))}
              </div>

              {/* Incident queue */}
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {filteredCalls.length === 0 ? (
                  <p className="p-3 text-sm text-ink-3">No incidents match the current filter.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {filteredCalls.map((call) => (
                      <li key={call.id}>
                        <IncidentRow
                          call={call}
                          selected={selectedCall?.id === call.id}
                          onSelect={() => selectCall(call.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </aside>

        {/* Main area: full-bleed map, or the incident board. */}
        <main className="relative min-w-0 flex-1 bg-deep">
          {mainView === 'map' ? (
            <>
              <EmergencyMap
                calls={calls}
                selectedCallId={selectedCall?.id || null}
                onMarkerClick={handleMarkerClick}
                onDispatchUnit={handleDispatchUnit}
                selectedUnitId={selectedUnitId}
              />
              {/* Floating module board over the map's right side. The wrapper is
                  click-through; only the cards inside capture pointer events. */}
              <div className="pointer-events-none absolute right-4 top-16 bottom-4 z-[500] flex w-[340px] max-w-[calc(100%-2rem)] justify-end">
                <div className="pointer-events-auto w-full overflow-y-auto">
                  <ModuleBoard modules={modules} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col overflow-hidden">
              <IncidentKanbanBoard
                calls={calls}
                onSelectCallAndNavigateToMap={handleSelectCallAndNavigateToMap}
                onUpdateCallStatus={handleUpdateCallStatus}
                onOpenWorkflow={handleOpenWorkflow}
              />
            </div>
          )}
        </main>
      </div>

      {/* ---- OVERLAYS ------------------------------------------------------ */}
      <IncidentWorkflowOverlay
        open={workflowOpen}
        onClose={() => setWorkflowOpen(false)}
        call={selectedCall}
        calls={calls}
      />

      <DataManagementDashboard
        open={dataDashboardOpen}
        onClose={() => {
          setDataDashboardOpen(false);
          restoreModule();
        }}
      />

      <CallHistoryOverlay
        open={callHistoryOpen}
        onClose={() => {
          setCallHistoryOpen(false);
          restoreModule();
        }}
        calls={calls}
        onSelectCall={(id) => {
          handleSelectCallAndNavigateToMap(id);
          selectCall(id);
        }}
      />
    </div>
  );
}

/* ---- INCIDENT QUEUE ROW (Task 8) ------------------------------------------ */

function IncidentRow({
  call,
  selected,
  onSelect,
}: {
  call: EmergencyCall;
  selected: boolean;
  onSelect: () => void;
}) {
  const glyph: IncidentGlyph = glyphForIncidentType(call.incident_type);
  const subtype = call.incident_subtype || call.incident_type || 'Unclassified incident';
  const address = call.caller_location?.address;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex w-full flex-col gap-2 rounded-[6px] border bg-panel p-3 text-left transition-colors',
        selected ? 'border-accent' : 'border-rule hover:border-rule-strong',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Chip tone={severityTone(call.severity)}>{priorityCode(call)}</Chip>
          <Symbol
            spec={{ kind: 'incident', glyph, severity: call.severity, distress: distressOf(call), size: 20 }}
            className="shrink-0"
          />
          <span className="text-sm font-semibold capitalize text-ink">{subtype}</span>
        </div>
        <span className="tnum shrink-0 text-2xs text-ink-3">{getTimeElapsed(call.created_at)}</span>
      </div>

      {/* Full AI summary — deliberately unclamped for trained dispatchers. */}
      <p className="text-sm leading-relaxed text-ink-2">
        {call.ai_summary || call.chief_complaint || 'Emergency call in progress; details pending.'}
      </p>

      {address && (
        <div className="flex items-start gap-1.5 text-xs text-ink-3">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          {/* Address wraps rather than truncating. */}
          <span className="break-words">{address}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-rule pt-2">
        <DistressMeter level={distressOf(call)} compact />
        <div className="flex items-center gap-1.5">
          {awaitingRefinement(call) && <Chip tone="mild">Refining</Chip>}
          <span className="text-2xs uppercase tracking-wide text-ink-4">{triageSource(call)}</span>
        </div>
      </div>
    </button>
  );
}

/* ---- INCIDENT DETAIL PANEL (Task 10) -------------------------------------- */

function IncidentDetail({
  call,
  onBack,
  onOpenTimeline,
}: {
  call: EmergencyCall;
  onBack: () => void;
  onOpenTimeline: () => void;
}) {
  const glyph: IncidentGlyph = glyphForIncidentType(call.incident_type);
  const subtype = call.incident_subtype || call.incident_type || 'Unclassified incident';
  const location = call.caller_location;
  // Confidence is shown from the stored reading; a district-centroid fix keeps
  // its own value (e.g. 75%) and is never rounded up to 100%.
  const confidence =
    confidencePercent(location?.confidence) ?? confidencePercent(call.location_confidence);
  const accuracyRadius =
    typeof location?.accuracy_radius === 'number' ? `±${location.accuracy_radius} m` : null;
  const threats = call.immediate_threats ?? [];
  const units = recommendedUnits(call);
  const confidenceGrade = confidencePercent(call.ai_confidence ?? call.ai_triage?.confidence);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-rule-strong px-2.5 py-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-1 text-2xs font-medium uppercase tracking-wide text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to queue
        </button>
      </div>

      <div className="flex flex-col gap-4 p-3.5">
        {/* Header: symbol, subtype, priority */}
        <div className="flex items-start gap-3">
          <Symbol
            spec={{ kind: 'incident', glyph, severity: call.severity, distress: distressOf(call), size: 28 }}
            className="mt-0.5 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-md font-semibold capitalize text-ink">{subtype}</h2>
            <div className="mt-1 flex items-center gap-2">
              <Chip tone={severityTone(call.severity)} dot>
                {priorityCode(call)}
              </Chip>
              <span className="text-2xs uppercase tracking-wide text-ink-4">
                {call.severity ?? 'ungraded'}
              </span>
            </div>
          </div>
        </div>

        {/* Caller + triage source */}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Caller">
            <span className="tnum text-sm text-ink">{call.caller_number || '—'}</span>
          </Field>
          <Field label="Triage source">
            <span className="text-sm text-ink">{triageSource(call)}</span>
          </Field>
        </div>

        {/* Location with confidence + accuracy radius */}
        <Field label="Location">
          <span className="block break-words text-sm text-ink">
            {location?.address || 'Location pending verification'}
          </span>
          <span className="mt-1 block text-xs text-ink-3">
            Confidence: <span className="text-ink-2">{confidence ?? 'pending'}</span>
            {accuracyRadius && (
              <>
                {' · '}Accuracy: <span className="text-ink-2">{accuracyRadius}</span>
              </>
            )}
          </span>
        </Field>

        {/* Full AI summary */}
        <Field label={confidenceGrade ? `AI summary · ${confidenceGrade} confidence` : 'AI summary'}>
          <p className="text-sm leading-relaxed text-ink-2">
            {call.ai_summary ||
              call.ai_triage?.summary ||
              call.chief_complaint ||
              'No AI triage summary is available for this incident yet.'}
          </p>
        </Field>

        {/* Immediate threats */}
        {threats.length > 0 && (
          <Field label="Immediate threats">
            <div className="flex flex-wrap gap-1.5">
              {threats.map((threat) => (
                <Chip key={threat} tone="critical">
                  {threat}
                </Chip>
              ))}
            </div>
          </Field>
        )}

        {/* Recommended units */}
        <Field label="Recommended units">
          {units.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {units.map((unit) => (
                <Chip key={unit} tone="accent">
                  {unit}
                </Chip>
              ))}
            </div>
          ) : (
            <span className="text-sm text-ink-3">No units recommended yet.</span>
          )}
        </Field>

        {/* Distress meter */}
        <div className="rounded-[6px] border border-rule bg-panel p-3">
          <DistressMeter level={distressOf(call)} />
          {distressOf(call) == null && (
            <p className="mt-1.5 text-2xs text-ink-4">
              No prosody captured. Distress appears for calls taken through the live 112 Pulse voice
              station.
            </p>
          )}
        </div>

        {/* Primary action → incident timeline (Task 13 overlay) */}
        <button
          type="button"
          onClick={onOpenTimeline}
          className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-accent px-3 py-2.5 text-sm font-semibold text-deep transition-colors hover:bg-accent-dim"
        >
          Open incident timeline
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label flex items-center gap-1.5">
        {label.startsWith('Immediate') && <AlertTriangle className="h-3 w-3 text-mild" aria-hidden />}
        {label}
      </span>
      {children}
    </div>
  );
}
