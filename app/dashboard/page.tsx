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
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  MapPin,
  Radio,
  Search,
  Shield,
  X,
} from 'lucide-react';

import { CallStatus, EmergencyCall } from '@/lib/types';
import { mockCalls, getTimeElapsed } from '@/lib/mock-data';
import { glyphForIncidentType, type IncidentGlyph } from '@/lib/design/symbols';
import { deriveAlerts, readAcknowledged, type AlertInput } from '@/lib/alerts';
import {
  severityTone,
  priorityCode,
  distressOf,
  triageSource,
  recommendedUnits,
  confidencePercent,
  spokenLanguage,
} from '@/lib/incident';
import { cn } from '@/lib/utils';
import {
  compactIncidentSummary,
  dashboardHeaderMetrics,
  dashboardRegionVisibility,
  defaultMobileIncidentOpen,
  defaultUnitPanelOpen,
  mobileNavigationInset,
} from '@/lib/dashboard-presentation';

import { Symbol } from '@/components/ui/symbol';
import { Chip, DataRow } from '@/components/ui/panel';
import { DistressMeter } from '@/components/DistressMeter';
import { ModuleRail, type ModuleId } from '@/components/ModuleRail';
import { UnitRoster } from '@/components/UnitRoster';
import { TACTICAL_UNITS } from '@/lib/units';
import { useReservedFleet } from '@/lib/useReservedFleet';
import { ResponseAssurancePanel } from '@/components/ResponseAssurancePanel';
import { IncidentFusionPanel } from '@/components/IncidentFusionPanel';
import {
  findFusionSuggestions,
  fusionDecisionFor,
  isSeparateDispatchTransitionBlocked,
  linkedPrimaryFor,
  type FusionDecision,
  type FusionDecisionAction,
  type FusionSuggestion,
} from '@/lib/incident-fusion';
import { useFusionDecisions } from '@/lib/useFusionDecisions';

import StartEmergencyCall from '@/components/StartEmergencyCall';
import IncidentTimeline from '@/components/IncidentTimeline';
import AlertsModule from '@/components/AlertsModule';
import HistoryModule from '@/components/HistoryModule';
import ForecastModule from '@/components/ForecastModule';
import IncidentKanbanBoard from '@/components/IncidentKanbanBoard';
import { FiveMinuteDemo } from '@/components/FiveMinuteDemo';

// Leaflet needs the DOM; render the map client-side only.
const EmergencyMap = dynamic(() => import('@/components/EmergencyMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-deep">
      <p className="label">Initializing situational map…</p>
    </div>
  ),
});

type SeverityFilter = 'all' | 'critical' | 'high' | 'other';
type PanelView = 'queue' | 'detail';
type MainView = 'map' | 'board';

/**
 * A call still awaiting a model grade shows a REFINING chip. The server marks
 * exactly this state with `refinable: true` on the local-rules grade and clears
 * it (`false`) once refinement lands, so read that flag directly. The old
 * both-confidences-null test never fired: keyword triage always sets a 0.45
 * confidence, so the chip was dead code.
 */
function awaitingRefinement(call: EmergencyCall): boolean {
  return call.refinable === true;
}

export default function DashboardPage() {
  const [calls, setCalls] = useState<EmergencyCall[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const [activeModule, setActiveModule] = useState<ModuleId>('monitoring');
  const [panelView, setPanelView] = useState<PanelView>('queue');
  const [mainView, setMainView] = useState<MainView>('map');
  const [unitPanelOpen, setUnitPanelOpen] = useState(false);
  const [mobileIncidentOpen, setMobileIncidentOpen] = useState(false);
  const [mobileNavInset, setMobileNavInset] = useState(0);
  const [regionVisibility, setRegionVisibility] = useState({
    showModuleRail: true,
    showIncidentSidebar: true,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [demoIntakeStarted, setDemoIntakeStarted] = useState(false);
  const [demoLaunchSignal, setDemoLaunchSignal] = useState(0);
  const [demoCallId, setDemoCallId] = useState<string | null>(null);
  // Bumped when an alert is acknowledged so the alert memo (and therefore the
  // rail badge) recomputes against the freshly-persisted acknowledgement set.
  const [ackVersion, setAckVersion] = useState(0);

  const [clock, setClock] = useState('');
  const { decisions: fusionDecisions, decide: decideFusion } = useFusionDecisions();

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

  useEffect(() => {
    const syncLayout = () => {
      setRegionVisibility(dashboardRegionVisibility(window.innerWidth));
      setMobileNavInset(mobileNavigationInset(window.innerWidth));
    };
    setUnitPanelOpen(defaultUnitPanelOpen(window.innerWidth));
    setMobileIncidentOpen(defaultMobileIncidentOpen(window.innerWidth));
    syncLayout();
    window.addEventListener('resize', syncLayout);
    return () => window.removeEventListener('resize', syncLayout);
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
    if (isSeparateDispatchTransitionBlocked(callId, newStatus, fusionDecisions)) {
      setSelectedCallId(callId);
      setPanelView('detail');
      setMainView('map');
      return;
    }
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
  }, [fusionDecisions]);

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
  const fusionSuggestions = useMemo(() => findFusionSuggestions(calls), [calls]);
  const fusionByCall = useMemo(() => {
    const index = new Map<string, FusionSuggestion>();
    for (const suggestion of fusionSuggestions) {
      index.set(suggestion.primary_call_id, suggestion);
      for (const id of suggestion.related_call_ids) index.set(id, suggestion);
    }
    return index;
  }, [fusionSuggestions]);
  const selectedFusion = selectedCall ? fusionByCall.get(selectedCall.id) : undefined;
  const selectedFusionDecision = selectedCall
    ? fusionDecisionFor(selectedCall.id, fusionDecisions, selectedFusion?.key)
    : undefined;
  const selectedLinkedPrimary = selectedCall
    ? linkedPrimaryFor(selectedCall.id, fusionDecisions)
    : null;
  const operationalUnits = useReservedFleet(TACTICAL_UNITS, selectedCall?.id ?? '');

  // Primary figures appear once, in the command bar.
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
      model_escalated: c.model_escalated,
    }));
    const acknowledged = readAcknowledged();
    return deriveAlerts(input, now).filter((a) => !acknowledged.has(a.key));
    // `calls` identity only changes when the fingerprint changes, so this is stable
    // between polls that see no real change. `ackVersion` forces a recompute the
    // moment an alert is acknowledged, so the rail badge decrements immediately.
  }, [calls, ackVersion]);

  const headerMetrics = dashboardHeaderMetrics(calls, alerts.length);

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

  // Every rail module now renders in the main region (no full-screen overlays).
  // Selecting one is a pure activeModule switch, consistent across Monitoring,
  // Alerts, History and Forecast.
  const handleModuleSelect = useCallback((id: ModuleId) => {
    setActiveModule(id);
    setPanelView('queue');
    setMobileIncidentOpen(false);
  }, []);

  // Alerts / History link to an incident: jump to it on the map with its detail
  // open, back in the monitoring module.
  const handleModuleSelectCall = useCallback((id: string) => {
    setSelectedCallId(id);
    setActiveModule('monitoring');
    setMainView('map');
    setPanelView('detail');
  }, []);

  // Acknowledging an alert must recompute the derived alert set so the rail
  // badge decrements immediately.
  const handleAlertAck = useCallback(() => setAckVersion((v) => v + 1), []);

  // In Board view the incident queue panel is redundant — the kanban already
  // shows every incident, grouped by stage — so it is collapsed to give the five
  // columns the full width. The icon rail stays. Only the Monitoring module owns
  // the main area's map/board switch, so this only applies there.
  const boardActive = activeModule === 'monitoring' && mainView === 'board';

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
              <div className="hidden text-2xs text-ink-3 lg:block">Delhi Command Desk · National 112 Control</div>
            </div>
          </div>

          {/* Environment telemetry — real board figures only. */}
          <div className="hidden items-center gap-4 border-l border-rule pl-4 lg:flex">
            {headerMetrics.map((metric) => (
              <div key={metric.label} className="leading-tight">
                <div className="label">{metric.label}</div>
                <div
                  className={cn(
                    'tnum text-sm',
                    metric.tone === 'critical'
                      ? 'text-critical-bright'
                      : metric.tone === 'warning'
                        ? 'text-mild'
                        : 'text-ink-2',
                  )}
                >
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeModule === 'monitoring' && mainView === 'map' && (
            <button
              type="button"
              aria-expanded={unitPanelOpen}
              aria-controls="response-units-panel"
              onClick={() => setUnitPanelOpen((open) => !open)}
              className={cn(
                'hidden items-center gap-1.5 rounded-[4px] border px-2.5 py-1.5 text-xs font-medium transition-colors sm:inline-flex',
                unitPanelOpen
                  ? 'border-accent bg-accent/10 text-accent-bright'
                  : 'border-rule bg-panel text-ink-2 hover:border-rule-strong hover:text-ink',
              )}
            >
              <Shield className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden lg:inline">Response </span>units
            </button>
          )}

          {/* Main-area view switch keeps the map and the incident board reachable.
              Only meaningful for the Monitoring module, which owns the main area. */}
          <div
            className={cn(
              'items-center gap-1 rounded-[4px] border border-rule bg-panel p-0.5',
              activeModule === 'monitoring' ? 'hidden md:flex' : 'hidden',
            )}
          >
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
            <span className="hidden xl:inline-flex"><Chip tone="accent">112 Pulse</Chip></span>
            <StartEmergencyCall
              launchSignal={demoLaunchSignal}
              initialScriptId="hinglish-five-minute"
              onCallCreated={(id) => {
                setSelectedCallId(id);
                if (demoActive) setDemoCallId(id);
                setMainView('map');
                setPanelView('detail');
              }}
            />
          </div>
        </div>
      </header>

      {/* ---- BODY: RAIL · INCIDENT PANEL · MAIN ---------------------------- */}
      <div className="relative flex min-h-0 flex-1 pb-14 sm:pb-0">
        {regionVisibility.showModuleRail && (
          <ModuleRail active={activeModule} onSelect={handleModuleSelect} alertCount={alerts.length} />
        )}

        {/* Incident panel — hidden in Board view so the kanban gets full width. */}
        {!boardActive && (regionVisibility.showIncidentSidebar || mobileIncidentOpen) && (
        <aside
          style={{ bottom: mobileNavInset }}
          className="absolute inset-x-0 top-0 z-[650] flex w-full shrink-0 flex-col border-r border-rule-strong bg-ground sm:static sm:w-[320px]"
        >
          {/* Incident panel header */}
          <div className="flex shrink-0 items-center justify-between border-b border-rule-strong px-3 py-2.5">
            <span className="text-sm font-medium text-ink">Emergencies</span>
            <button
              type="button"
              onClick={() => setMobileIncidentOpen(false)}
              className="rounded-[4px] border border-rule px-2 py-1 text-2xs font-medium uppercase tracking-wide text-ink-2 sm:hidden"
            >
              View map
            </button>
          </div>

          {panelView === 'detail' && selectedCall ? (
            <IncidentDetail
              call={selectedCall}
              fusion={selectedFusion}
              fusionDecision={selectedFusionDecision}
              linkedPrimaryCallId={selectedLinkedPrimary}
              onFusionDecision={(action) => selectedFusion && decideFusion(selectedFusion, action)}
              onBack={() => setPanelView('queue')}
              onOpenTimeline={() => {
                setSelectedCallId(selectedCall.id);
                setWorkflowOpen(true);
              }}
            />
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
                          fusion={fusionByCall.get(call.id)}
                          fusionDecision={fusionDecisionFor(
                            call.id,
                            fusionDecisions,
                            fusionByCall.get(call.id)?.key,
                          )}
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
        )}

        {/* Main area: the active rail module. Monitoring is the map / incident
            board; Alerts, History and Forecast each render here in the main
            region (never as full-screen overlays). */}
        <main className="relative min-w-0 flex-1 bg-deep">
          {activeModule === 'alerts' ? (
            <AlertsModule
              calls={calls}
              onSelectCall={handleModuleSelectCall}
              onAckChange={handleAlertAck}
            />
          ) : activeModule === 'history' ? (
            <HistoryModule calls={calls} onSelectCall={handleModuleSelectCall} />
          ) : activeModule === 'forecast' ? (
            <ForecastModule calls={calls} />
          ) : mainView === 'map' ? (
            <div className="relative flex h-full min-h-0 overflow-hidden">
              <div className="relative min-w-0 flex-1">
                <EmergencyMap
                  calls={calls}
                  units={operationalUnits}
                  selectedCallId={selectedCall?.id || null}
                  onMarkerClick={handleMarkerClick}
                  onDispatchUnit={handleDispatchUnit}
                  selectedUnitId={selectedUnitId}
                  layoutRevision={unitPanelOpen}
                />
                {!unitPanelOpen && (
                  <div className="absolute bottom-4 right-4 z-[550] flex flex-col items-end gap-2 sm:hidden">
                    <button
                      type="button"
                      onClick={() => setMobileIncidentOpen(true)}
                      className="rounded-[4px] border border-rule-strong bg-deep/95 px-3 py-2 text-xs font-medium text-ink"
                    >
                      Incidents
                    </button>
                    <button
                      type="button"
                      aria-expanded={unitPanelOpen}
                      aria-controls="response-units-panel"
                      onClick={() => setUnitPanelOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-[4px] border border-accent bg-deep/95 px-3 py-2 text-xs font-medium text-accent-bright"
                    >
                      <Shield className="h-3.5 w-3.5" aria-hidden />
                      Response units
                    </button>
                  </div>
                )}
              </div>

              {unitPanelOpen && (
                <aside
                  id="response-units-panel"
                  aria-label="Response units"
                  className="absolute inset-y-0 right-0 z-[600] flex w-[280px] shrink-0 flex-col border-l border-rule-strong bg-ground shadow-2xl xl:static xl:z-auto xl:shadow-none"
                >
                  <div className="flex shrink-0 items-start justify-between gap-3 border-b border-rule-strong px-3 py-2.5">
                    <div>
                      <h2 className="text-sm font-semibold text-ink">Response units</h2>
                      <p className="mt-0.5 text-2xs text-ink-4">
                        {selectedCall?.caller_location?.address
                          ? `Distance to ${selectedCall.caller_location.address}`
                          : 'Select an incident to compare distance'}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Close response units"
                      onClick={() => setUnitPanelOpen(false)}
                      className="rounded-[4px] p-1 text-ink-3 transition-colors hover:bg-panel hover:text-ink"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-2">
                    <UnitRoster
                      units={operationalUnits}
                      selectedCall={selectedCall ?? null}
                      selectedUnitId={selectedUnitId}
                      onSelectUnit={handleSelectUnit}
                    />
                  </div>
                </aside>
              )}
            </div>
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
      <FiveMinuteDemo
        call={demoActive ? (calls.find((call) => call.id === demoCallId) ?? null) : null}
        active={demoActive}
        intakeStarted={demoIntakeStarted}
        onActivate={() => {
          setDemoActive(true);
          setDemoIntakeStarted(false);
          setDemoCallId(null);
        }}
        onLaunchVoice={() => {
          setDemoIntakeStarted(true);
          setDemoLaunchSignal((value) => value + 1);
        }}
        onOpenWorkflow={() => selectedCall && setWorkflowOpen(true)}
        onReset={() => {
          setDemoActive(false);
          setDemoIntakeStarted(false);
          setDemoCallId(null);
        }}
      />
      <IncidentTimeline
        open={workflowOpen}
        onClose={() => setWorkflowOpen(false)}
        call={selectedCall ?? null}
        linkedPrimaryCallId={selectedLinkedPrimary}
      />
    </div>
  );
}

/* ---- INCIDENT QUEUE ROW (Task 8) ------------------------------------------ */

function IncidentRow({
  call,
  fusion,
  fusionDecision,
  selected,
  onSelect,
}: {
  call: EmergencyCall;
  fusion?: FusionSuggestion;
  fusionDecision?: FusionDecision;
  selected: boolean;
  onSelect: () => void;
}) {
  const glyph: IncidentGlyph = glyphForIncidentType(call.incident_type);
  const subtype = call.incident_subtype || call.incident_type || 'Unclassified incident';
  const address = call.caller_location?.address;

  return (
    <div
      className={cn(
        'flex flex-col rounded-[6px] border bg-panel transition-colors',
        selected ? 'border-accent' : 'border-rule hover:border-rule-strong',
      )}
    >
      {/* Selecting the body opens the incident in the in-panel detail view. */}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex w-full flex-col gap-2 p-3 text-left"
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
        <p className="line-clamp-2 text-sm leading-relaxed text-ink-2">
          {compactIncidentSummary(
            call.ai_summary || call.chief_complaint || 'Emergency call in progress; details pending.',
          )}
        </p>

        {address && (
          <div className="flex items-start gap-1.5 text-xs text-ink-3">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            {/* Address wraps rather than truncating. */}
            <span className="break-words">{address}</span>
          </div>
        )}
      </button>

      <div className="flex items-center justify-between gap-2 border-t border-rule px-3 py-2">
        <DistressMeter level={distressOf(call)} compact />
        <div className="flex items-center gap-1.5">
          {awaitingRefinement(call) && <Chip tone="mild">Refining</Chip>}
          {(fusion || fusionDecision) && (
            <Chip tone={fusionDecision?.action === 'linked' ? 'safe' : 'accent'}>
              {fusionDecision?.action === 'linked'
                ? 'Calls linked'
                : `${(fusion?.related_call_ids.length ?? fusionDecision?.related_call_ids.length ?? 0) + 1}-caller match`}
            </Chip>
          )}
          <span className="text-2xs uppercase tracking-wide text-ink-4">{triageSource(call)}</span>
          {/* Genuine detail affordance — navigates to the full incident dossier. */}
          <Link
            href={`/dashboard/calls/${call.id}`}
            aria-label={`Open full detail for ${subtype}`}
            className="inline-flex items-center gap-0.5 rounded-[4px] px-1.5 py-1 text-2xs font-medium uppercase tracking-wide text-accent hover:text-accent-bright"
          >
            View
            <ChevronRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---- INCIDENT DETAIL PANEL (Task 10) -------------------------------------- */

function IncidentDetail({
  call,
  fusion,
  fusionDecision,
  linkedPrimaryCallId,
  onFusionDecision,
  onBack,
  onOpenTimeline,
}: {
  call: EmergencyCall;
  fusion?: FusionSuggestion;
  fusionDecision?: FusionDecision;
  linkedPrimaryCallId?: string | null;
  onFusionDecision: (action: FusionDecisionAction) => void;
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
  const dispatchPlan = call.dispatch_plan;
  const operatorQuestions = call.operator_questions ?? [];
  const safetyAudit = call.safety_audit;
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
        <IncidentFusionPanel
          callId={call.id}
          suggestion={fusion}
          decision={fusionDecision}
          onDecision={onFusionDecision}
        />
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

        <SectionHeading>What happened</SectionHeading>

        <Field label={confidenceGrade ? `AI summary · ${confidenceGrade} confidence` : 'AI summary'}>
          <p className="text-sm leading-relaxed text-ink-2">
            {call.ai_summary ||
              call.ai_triage?.summary ||
              call.chief_complaint ||
              'No AI triage summary is available for this incident yet.'}
          </p>
        </Field>

        {threats.length > 0 && (
          <Field label="Immediate threats">
            <div className="flex flex-wrap gap-1.5">
              {threats.map((threat) => (
                <Chip key={threat} tone="critical">{threat}</Chip>
              ))}
            </div>
          </Field>
        )}

        <div className="rounded-[6px] border border-rule bg-panel p-3">
          <DistressMeter level={distressOf(call)} />
          {distressOf(call) == null && (
            <p className="mt-1.5 text-2xs text-ink-4">No voice stress reading is available for this call.</p>
          )}
        </div>

        <SectionHeading>Where and caller</SectionHeading>

        {/* Caller identity and spoken language */}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Caller">
            <span className="tnum text-sm text-ink">{call.caller_number || '—'}</span>
          </Field>
          <Field label="Spoken language">
            <span className="text-sm text-ink">{spokenLanguage(call) ?? '—'}</span>
          </Field>
        </div>

        <Field label="Triage source">
          <span className="text-sm text-ink">{triageSource(call)}</span>
        </Field>

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

        {/* Safety audit */}
        {safetyAudit && (
          <details className="rounded-[6px] border border-rule bg-panel">
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-ink-2 hover:text-ink">
              Why this priority?
            </summary>
            <div className="border-t border-rule p-2">
              <div className="grid grid-cols-3 gap-2">
                <DataRow label="Local" value={`${safetyAudit.local_severity} / ${safetyAudit.local_score}`} mono />
                <DataRow label="Model" value={`${safetyAudit.model_severity} / ${safetyAudit.model_score}`} mono />
                <DataRow label="Final" value={`${safetyAudit.final_severity} / ${safetyAudit.final_score}`} mono />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Chip tone={safetyAudit.downgrade_blocked ? 'critical' : 'safe'}>
                  {safetyAudit.downgrade_blocked ? 'Downgrade blocked' : 'No unsafe downgrade'}
                </Chip>
                <span className="text-xs text-ink-3">{safetyAudit.reason}</span>
              </div>
            </div>
          </details>
        )}

        <SectionHeading>Recommended response</SectionHeading>

        {/* Dispatch recommendation */}
        <Field label="Dispatch recommendation">
          {dispatchPlan ? (
            <div className="rounded-[6px] border border-rule bg-panel p-2">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <Chip tone={severityTone(call.severity)}>{dispatchPlan.priority_code}</Chip>
                <Chip tone={dispatchPlan.eta_risk === 'high' ? 'critical' : dispatchPlan.eta_risk === 'medium' ? 'mild' : 'safe'}>
                  ETA risk {dispatchPlan.eta_risk}
                </Chip>
                <Chip tone={dispatchPlan.operator_confirmation_required ? 'mild' : 'safe'}>
                  {dispatchPlan.operator_confirmation_required ? 'Confirm before dispatch' : 'Auto-ready'}
                </Chip>
              </div>
              <div className="flex flex-col gap-1.5">
                {dispatchPlan.units.map((unit) => (
                  <div key={`${unit.service}-${unit.unit}`} className="rounded-[4px] border border-rule bg-ground px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">{unit.unit}</span>
                      <span className="label">{unit.service}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-3">{unit.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : units.length > 0 ? (
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

        {/* Response assurance: grounds generic service advice in the live fleet. */}
        <Field label="Response assurance">
          <ResponseAssurancePanel call={call} linkedPrimaryCallId={linkedPrimaryCallId} />
        </Field>

        <SectionHeading>Operator actions</SectionHeading>

        {/* Missing info assistant */}
        <Field label="Operator next questions">
          {operatorQuestions.length > 0 ? (
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-ink-2">
              {operatorQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
          ) : (
            <span className="text-sm text-ink-3">No blocking questions identified.</span>
          )}
        </Field>

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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-rule pb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
      {children}
    </h3>
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
