/**
 * Pulse112 Tactical Emergency Command Center
 * Inspired by Jasmine Wu's Berkeley AI Hackathon winning Dispatch AI platform.
 * Supports: Tactical Radar Map View, Multi-Stage Kanban Pipeline, and Split Mode.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { EmergencyCall } from '@/lib/types';
import { mockCalls, getTimeElapsed } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';
import {
  Phone,
  Radio,
  MapPin,
  Clock,
  Activity,
  AlertTriangle,
  Flame,
  Shield,
  ShieldAlert,
  Sparkles,
  Layers,
  Search,
  CheckCircle2,
  Navigation,
  TrendingUp,
  History,
  Database,
  Volume2,
  Globe,
  Sliders,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  Map as MapIcon,
  Columns3,
} from 'lucide-react';
import StartEmergencyCall from '@/components/StartEmergencyCall';
import IncidentWorkflowOverlay from '@/components/IncidentWorkflowOverlay';
import DataManagementDashboard from '@/components/DataManagementDashboard';
import CallHistoryOverlay from '@/components/CallHistoryOverlay';
import IncidentKanbanBoard from '@/components/IncidentKanbanBoard';

// Dynamic import for Leaflet tactical map with SSR disabled
const EmergencyMap = dynamic(() => import('@/components/EmergencyMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full min-h-[450px] flex items-center justify-center bg-[#05080f]">
      <div className="text-center font-mono">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
        <p className="text-slate-400 text-xs">Initializing Situational Radar...</p>
      </div>
    </div>
  ),
});

export default function DashboardPage() {
  const [calls, setCalls] = useState<EmergencyCall[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'kanban' | 'split'>('map');
  const [filterPriority, setFilterPriority] = useState<'all' | 'critical' | 'high' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [dataDashboardOpen, setDataDashboardOpen] = useState(false);
  const [callHistoryOpen, setCallHistoryOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState({ local: '', utc: '' });

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime({
        local: now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        utc: now.toISOString().substring(11, 19) + ' UTC',
      });
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load and sync calls from localStorage & mock data
  const loadCalls = useCallback(() => {
    try {
      const stored = localStorage.getItem('kwik_emergency_calls');
      const newCalls = stored ? JSON.parse(stored) : [];
      const merged = [...newCalls, ...mockCalls];
      setCalls(merged);

      if (!selectedCallId && merged.length > 0) {
        setSelectedCallId(merged[0].id);
      }
    } catch (e) {
      console.error('Error loading calls:', e);
      setCalls(mockCalls);
    }
  }, [selectedCallId]);

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

  const handleUpdateCallStatus = (callId: string, newStatus: string) => {
    setCalls((prev) => {
      const updated = prev.map((c) => (c.id === callId ? { ...c, status: newStatus } : c));
      try {
        localStorage.setItem('kwik_emergency_calls', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleSelectCallAndNavigateToMap = (callId: string) => {
    setSelectedCallId(callId);
    setViewMode('map');
  };

  const selectedCall = calls.find((c) => c.id === selectedCallId) || calls[0];

  const criticalCount = calls.filter((c) => c.severity === 'critical').length;
  const highCount = calls.filter((c) => c.severity === 'high').length;
  const activeCount = calls.filter((c) => c.status === 'active' || c.call_status === 'in-progress').length;

  const filteredCalls = calls.filter((c) => {
    const matchesSearch =
      (c.chief_complaint || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.incident_subtype || c.incident_type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.caller_location?.address || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority =
      filterPriority === 'all'
        ? true
        : filterPriority === 'critical'
        ? c.severity === 'critical'
        : filterPriority === 'high'
        ? c.severity === 'high'
        : c.severity === 'medium' || c.severity === 'low';

    return matchesSearch && matchesPriority;
  });

  return (
    <div className="h-screen w-full bg-[#060a12] text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Top Tactical HUD Header */}
      <header className="h-14 bg-slate-950/95 border-b border-white/10 px-6 flex items-center justify-between shadow-2xl z-30 shrink-0">
        {/* Left: Branding & Station Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-widest text-sm text-white font-mono">PULSE 112</span>
                <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-mono text-[9px] font-bold border border-blue-500/30">
                  DISPATCH CAD 2.0
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400">STATION #04 • DELHI METRO HQ</p>
            </div>
          </div>

          {/* View Mode Switcher (Kanban vs Map vs Split) */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono ml-3">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Tactical Radar</span>
            </button>

            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>

            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                viewMode === 'split'
                  ? 'bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Split CAD</span>
            </button>
          </div>

          <div className="hidden xl:flex items-center gap-5 text-xs font-mono ml-2 pl-3 border-l border-white/10">
            <div>
              <span className="text-slate-500 text-[10px] block">ACTIVE QUEUE</span>
              <span className="text-emerald-400 font-bold">{activeCount} Incidents</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">CRITICAL P1</span>
              <span className="text-red-400 font-bold">{criticalCount} Extreme</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">AI OFFLOAD RATE</span>
              <span className="text-sky-400 font-bold">80.4% Non-Emerg</span>
            </div>
          </div>
        </div>

        {/* Center/Right: Action Buttons & Clocks */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/5 font-mono text-xs text-slate-300">
            <span className="text-slate-400 font-bold text-white">{currentTime.local}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-[11px]">{currentTime.utc}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
          </div>

          <Button
            onClick={() => setDataDashboardOpen(true)}
            variant="outline"
            size="sm"
            className="bg-slate-900/80 border-white/10 hover:bg-slate-800 text-slate-200 font-mono text-xs gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden lg:inline">LSTM Forecast</span>
          </Button>

          <Button
            onClick={() => setCallHistoryOpen(true)}
            variant="outline"
            size="sm"
            className="bg-slate-900/80 border-white/10 hover:bg-slate-800 text-slate-200 font-mono text-xs gap-1.5"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline">Audit Logs</span>
          </Button>

          {/* Live Voice Simulator */}
          <StartEmergencyCall
            onCallCreated={(id) => {
              setSelectedCallId(id);
              setViewMode('map');
            }}
          />
        </div>
      </header>

      {/* VIEW MODE 1: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <IncidentKanbanBoard
          calls={calls}
          onSelectCallAndNavigateToMap={handleSelectCallAndNavigateToMap}
          onUpdateCallStatus={handleUpdateCallStatus}
          onOpenWorkflow={(call) => {
            setSelectedCallId(call.id);
            setWorkflowOpen(true);
          }}
        />
      )}

      {/* VIEW MODE 2: TACTICAL RADAR MAP (3-PANEL FIXED ROW) */}
      {viewMode === 'map' && (
        <div className="flex-1 flex flex-row h-[calc(100vh-3.5rem)] w-full overflow-hidden">
          {/* LEFT PANEL: Live Incident Queue */}
          <div className="w-[320px] xl:w-[350px] shrink-0 h-full bg-slate-950/90 border-r border-white/10 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/10 space-y-2 bg-slate-900/40 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter calls or complaints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-4 gap-1 text-[11px] font-mono">
                {[
                  { id: 'all', label: 'All', count: calls.length },
                  { id: 'critical', label: 'P1', count: criticalCount },
                  { id: 'high', label: 'P2', count: highCount },
                  { id: 'other', label: 'P3/P4', count: calls.length - criticalCount - highCount },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterPriority(tab.id as any)}
                    className={`py-1 rounded text-center transition-all ${
                      filterPriority === tab.id
                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredCalls.map((call) => {
                const isSelected = selectedCall?.id === call.id;
                const isP1 = call.severity === 'critical';
                const isP2 = call.severity === 'high';

                const pBadgeColor = isP1
                  ? 'bg-red-500/15 border-red-500/40 text-red-300'
                  : isP2
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                  : 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300';

                return (
                  <div
                    key={call.id}
                    onClick={() => setSelectedCallId(call.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                        : 'bg-slate-900/40 border-white/5 hover:border-white/20 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${pBadgeColor}`}>
                          {call.priority_code || (isP1 ? 'P1' : isP2 ? 'P2' : 'P3')}
                        </span>
                        <span className="font-bold text-xs text-white truncate max-w-[150px]">
                          {call.incident_subtype || call.incident_type}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400">
                        {getTimeElapsed(call.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed mb-2">
                      {call.chief_complaint || 'Emergency call in progress'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="truncate max-w-[170px]">📍 {call.caller_location?.address || 'GPS Locked'}</span>
                      <span className="text-blue-400 font-bold">VIEW ›</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CENTER PANEL: Tactical Situational Map */}
          <div className="flex-1 h-full relative border-r border-white/10 flex flex-col min-w-0 overflow-hidden bg-[#05080f]">
            <EmergencyMap
              calls={calls}
              selectedCallId={selectedCall?.id || null}
              onMarkerClick={(id) => setSelectedCallId(id)}
              onDispatchUnit={(unitId, callId) => setWorkflowOpen(true)}
            />
          </div>

          {/* RIGHT PANEL: Incident Telemetry & AI Action Command */}
          <div className="w-[340px] xl:w-[380px] shrink-0 h-full bg-slate-950/90 flex flex-col overflow-y-auto">
            {selectedCall ? (
              <div className="p-4 space-y-4">
                {/* Active Incident Header */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-red-500/20 text-red-300 font-mono text-[9px] uppercase border border-red-500/30">
                      {selectedCall.severity} INCIDENT
                    </Badge>
                    <span className="font-mono text-xs text-slate-400">ID: {selectedCall.id}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm">
                    {selectedCall.incident_subtype || selectedCall.incident_type}
                  </h3>
                  <div className="text-xs text-slate-300 font-mono flex items-center justify-between border-t border-white/5 pt-2">
                    <span>Caller: {selectedCall.caller_number}</span>
                    <span className="text-emerald-400">Live Stream</span>
                  </div>
                </div>

                {/* Hume Emotion Telemetry */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Hume Emotion Telemetry
                    </span>
                    <span className="text-emerald-400 text-[10px]">EVI 2.0 (40Hz)</span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { label: 'Panic / Terror', val: 92, color: '#ef4444' },
                      { label: 'Distress / Pain', val: 86, color: '#f97316' },
                      { label: 'Urgency', val: 78, color: '#eab308' },
                      { label: 'Agitation', val: 45, color: '#38bdf8' },
                    ].map((emo) => (
                      <div key={emo.label} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>{emo.label}</span>
                          <span className="text-white font-bold">{emo.val}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${emo.val}%`, backgroundColor: emo.color }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Triage */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-2 text-xs">
                  <span className="font-bold font-mono text-slate-300 block">AI Triage Assessment</span>
                  <p className="text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                    {selectedCall.ai_triage?.summary || selectedCall.chief_complaint || 'Patient experiencing acute distress. High priority medical dispatch required.'}
                  </p>
                </div>

                {/* Action Recommendations */}
                <div className="p-3.5 rounded-xl bg-gradient-to-b from-blue-950/40 to-slate-900/90 border border-blue-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs font-mono text-sky-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      AI Action Recommendations
                    </span>
                    <Badge className="bg-sky-500/20 text-sky-300 text-[9px]">4 ACTIONS</Badge>
                  </div>

                  <Button
                    onClick={() => setWorkflowOpen(true)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs py-2.5 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>REVIEW & DISPATCH UNITS</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-6 text-center text-slate-500 font-mono text-xs">
                Select an incident to view details...
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: SPLIT CAD (KANBAN ON LEFT, MAP ON RIGHT) */}
      {viewMode === 'split' && (
        <div className="flex-1 flex flex-row h-[calc(100vh-3.5rem)] w-full overflow-hidden">
          {/* Half Kanban */}
          <div className="w-1/2 h-full border-r border-white/10 flex flex-col overflow-hidden">
            <IncidentKanbanBoard
              calls={calls}
              onSelectCallAndNavigateToMap={handleSelectCallAndNavigateToMap}
              onUpdateCallStatus={handleUpdateCallStatus}
              onOpenWorkflow={(call) => {
                setSelectedCallId(call.id);
                setWorkflowOpen(true);
              }}
            />
          </div>

          {/* Half Map */}
          <div className="w-1/2 h-full relative flex flex-col overflow-hidden bg-[#05080f]">
            <EmergencyMap
              calls={calls}
              selectedCallId={selectedCall?.id || null}
              onMarkerClick={(id) => setSelectedCallId(id)}
              onDispatchUnit={(unitId, callId) => setWorkflowOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Incident Workflow Overlay */}
      <IncidentWorkflowOverlay
        open={workflowOpen}
        onClose={() => setWorkflowOpen(false)}
        call={selectedCall}
        calls={calls}
      />

      {/* Predictive Analytics & Data Management Modal */}
      <DataManagementDashboard
        open={dataDashboardOpen}
        onClose={() => setDataDashboardOpen(false)}
      />

      {/* Historical Calls & Audit Log Modal */}
      <CallHistoryOverlay
        open={callHistoryOpen}
        onClose={() => setCallHistoryOpen(false)}
        calls={calls}
        onSelectCall={(id) => handleSelectCallAndNavigateToMap(id)}
      />
    </div>
  );
}
