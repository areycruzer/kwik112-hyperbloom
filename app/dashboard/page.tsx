/**
 * Pulse112 Tactical Emergency Command Center
 * Inspired by Jasmine Wu's Berkeley AI Hackathon winning Dispatch AI platform.
 * Supports: Tactical Radar Map View, Multi-Stage Kanban Pipeline, and Split Mode.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CallStatus, EmergencyCall } from '@/lib/types';
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
  HelpCircle,
  Languages,
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
  const [language, setLanguage] = useState('English');
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

  const handleUpdateCallStatus = (callId: string, newStatus: CallStatus) => {
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
  const selectedPriority = selectedCall?.priority_code || (selectedCall?.severity === 'critical' ? 'P1' : selectedCall?.severity === 'high' ? 'P2' : 'P3');
  const selectedLocationConfidence = selectedCall?.caller_location?.confidence
    ? `${Math.round(selectedCall.caller_location.confidence * 100)}%`
    : selectedCall?.location_confidence
    ? `${Math.round(selectedCall.location_confidence * 100)}%`
    : 'Pending verification';
  const selectedLanguage = selectedCall?.language || 'English / Hindi-ready';
  const selectedMissingQuestions = selectedCall?.immediate_threats?.length
    ? ['Confirm exact floor/landmark', 'Confirm victim count', 'Confirm responder access route']
    : ['Confirm caller safety', 'Confirm precise location', 'Confirm immediate hazards'];
  const selectedRecommendedUnits = selectedCall?.recommended_units?.length
    ? selectedCall.recommended_units
    : selectedCall?.incident_type === 'fire'
    ? ['Fire engine', 'Rescue ladder', 'EMS ambulance']
    : selectedCall?.incident_type === 'medical_emergency'
    ? ['ALS ambulance', 'Nearest patrol assist']
    : selectedCall?.incident_type === 'crime'
    ? ['Police patrol', 'Supervisor escalation']
    : ['Nearest available unit', 'Field supervisor'];

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
    <div className="dashboard-shell h-screen w-full bg-[#060a12] text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* Top Tactical HUD Header */}
      <header className="min-h-16 bg-slate-950/95 border-b border-white/10 px-4 xl:px-5 flex items-center justify-between gap-4 shadow-2xl z-30 shrink-0">
        {/* Left: Branding & Station Info */}
        <div className="flex min-w-0 items-center gap-3 xl:gap-4">
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <Radio className="w-[18px] h-[18px] animate-pulse" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="font-black tracking-[0.14em] text-[15px] text-white">PULSE 112</span>
                <span className="hidden min-[1760px]:inline-flex px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/30">
                  India 112 Control
                </span>
              </div>
              <p className="hidden min-[1760px]:block mt-1 text-[11px] leading-none text-slate-400">Operator-first dispatch workflow - Delhi Command Desk</p>
            </div>
          </div>

          {/* View Mode Switcher (Kanban vs Map vs Split) */}
          <div className="flex h-11 items-center gap-1 p-1 rounded-lg bg-slate-900 border border-white/10 text-[12px] ml-1 xl:ml-2">
            <button
              onClick={() => setViewMode('map')}
              className={`h-9 px-2.5 xl:px-3 rounded-md flex items-center gap-2 whitespace-nowrap transition-all ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Tactical Radar</span>
              <span className="lg:hidden">Map</span>
            </button>

            <button
              onClick={() => setViewMode('kanban')}
              className={`h-9 px-2.5 xl:px-3 rounded-md flex items-center gap-2 whitespace-nowrap transition-all ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Kanban Board</span>
              <span className="xl:hidden">Board</span>
            </button>

            <button
              onClick={() => setViewMode('split')}
              className={`h-9 px-2.5 xl:px-3 rounded-md flex items-center gap-2 whitespace-nowrap transition-all ${
                viewMode === 'split'
                  ? 'bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Split CAD</span>
              <span className="xl:hidden">Split</span>
            </button>
          </div>
        </div>

        {/* Center/Right: Action Buttons & Clocks */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden lg:flex h-10 items-center gap-2 px-3 rounded-lg bg-slate-900 border border-white/10 text-[12px] text-slate-300">
            <Languages className="w-4 h-4 text-sky-400" />
            <span className="hidden min-[1450px]:inline text-slate-400">Language</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none"
              aria-label="Language"
            >
              <option className="bg-slate-950" value="English">English</option>
              <option className="bg-slate-950" value="Hindi">Hindi</option>
              <option className="bg-slate-950" value="Regional">Regional</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="hidden min-[1760px]:flex h-10 bg-slate-900/80 border-white/10 hover:bg-slate-800 text-slate-200 text-[12px] gap-2"
            aria-label="Help"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Help</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="hidden min-[1760px]:flex h-10 bg-slate-900/80 border-white/10 hover:bg-slate-800 text-slate-200 text-[12px] gap-2"
            aria-label="Contact"
          >
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span>Contact</span>
          </Button>

          <div className="hidden xl:flex h-10 items-center gap-2.5 px-3 rounded-lg bg-slate-900 border border-white/5 font-mono text-[12px] text-slate-300">
            <span className="font-bold text-white">{currentTime.local}</span>
            <span className="hidden min-[1680px]:inline text-slate-600">|</span>
            <span className="hidden min-[1680px]:inline text-slate-400 text-[11px]">{currentTime.utc}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
          </div>

          <Button
            onClick={() => setDataDashboardOpen(true)}
            variant="outline"
            size="sm"
            className="h-10 bg-slate-900/80 border-white/10 hover:bg-slate-800 text-slate-200 text-[12px] gap-2 px-3"
          >
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden min-[1680px]:inline">LSTM Forecast</span>
          </Button>

          <Button
            onClick={() => setCallHistoryOpen(true)}
            variant="outline"
            size="sm"
            className="h-10 bg-slate-900/80 border-white/10 hover:bg-slate-800 text-slate-200 text-[12px] gap-2 px-3"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden min-[1450px]:inline">Audit Logs</span>
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

      <div className="min-h-12 bg-slate-900/85 border-b border-white/10 px-4 xl:px-5 flex items-center gap-5 shrink-0">
        <div className="hidden lg:flex shrink-0 items-center gap-5 pr-5 border-r border-white/10 font-mono">
          <div className="leading-tight">
            <span className="text-slate-500 text-[10px] block uppercase tracking-wide">Active queue</span>
            <span className="text-emerald-400 text-[12px] font-bold">{activeCount} incidents</span>
          </div>
          <div className="leading-tight">
            <span className="text-slate-500 text-[10px] block uppercase tracking-wide">Critical P1</span>
            <span className="text-red-400 text-[12px] font-bold">{criticalCount} extreme</span>
          </div>
          <div className="hidden min-[1450px]:block leading-tight">
            <span className="text-slate-500 text-[10px] block uppercase tracking-wide">AI offload rate</span>
            <span className="text-sky-400 text-[12px] font-bold">80.4% non-emergency</span>
          </div>
        </div>

        <nav className="flex min-w-0 flex-1 items-center justify-center gap-1 text-[12px] text-slate-300" aria-label="Government application sections">
          {[
            { label: 'Live Calls', icon: Phone },
            { label: 'Map', icon: MapIcon },
            { label: 'Units', icon: Shield },
            { label: 'Dispatch Queue', icon: Columns3 },
            { label: 'Analytics', icon: TrendingUp },
            { label: 'Audit Logs', icon: History },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="h-9 px-2.5 rounded-md flex items-center gap-2 whitespace-nowrap hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden min-[1760px]:flex shrink-0 items-center gap-3 text-[11px] font-mono text-slate-400">
          <span>Accessibility: WCAG 2.1 AA baseline</span>
          <span className="px-2 py-1 rounded-md border border-white/10 bg-slate-950 text-slate-200">High contrast</span>
        </div>
      </div>

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
        <div className="flex-1 min-h-0 flex flex-row w-full overflow-hidden">
          {/* LEFT PANEL: Live Incident Queue */}
          <div className="w-[320px] xl:w-[360px] shrink-0 h-full bg-slate-950/90 border-r border-white/10 flex flex-col overflow-hidden">
            <div className="p-3.5 border-b border-white/10 space-y-2.5 bg-slate-900/40 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter calls or complaints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-950/80 border border-white/10 text-[12px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-[11px] font-mono">
                {[
                  { id: 'all', label: 'All', count: calls.length },
                  { id: 'critical', label: 'P1', count: criticalCount },
                  { id: 'high', label: 'P2', count: highCount },
                  { id: 'other', label: 'P3/P4', count: calls.length - criticalCount - highCount },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterPriority(tab.id as any)}
                    className={`h-8 rounded-md text-center transition-all ${
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

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
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
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                        : 'bg-slate-900/40 border-white/5 hover:border-white/20 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${pBadgeColor}`}>
                          {call.priority_code || (isP1 ? 'P1' : isP2 ? 'P2' : 'P3')}
                        </span>
                        <span className="font-semibold text-[13px] text-white truncate max-w-[170px]">
                          {call.incident_subtype || call.incident_type}
                        </span>
                      </div>

                      <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                        {getTimeElapsed(call.created_at)}
                      </span>
                    </div>

                    <p className="text-[12px] text-slate-300 line-clamp-2 leading-5 mb-2.5">
                      {call.chief_complaint || 'Emergency call in progress'}
                    </p>

                    <div className="flex items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
                      <span className="truncate max-w-[200px] flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {call.caller_location?.address || 'GPS Locked'}
                      </span>
                      <span className="text-blue-400 font-bold flex items-center gap-0.5">
                        VIEW <ChevronRight className="w-3 h-3" />
                      </span>
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

          {/* RIGHT PANEL: Incident Command Panel */}
          <div className="w-[340px] xl:w-[390px] shrink-0 h-full bg-slate-950/90 flex flex-col overflow-y-auto">
            {selectedCall ? (
              <div className="p-4 space-y-4.5">
                {/* Active Incident Header */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-red-500/20 text-red-300 font-mono text-[10px] uppercase border border-red-500/30">
                      {selectedPriority} - {selectedCall.severity} incident
                    </Badge>
                    <span className="font-mono text-[11px] text-slate-400">ID: {selectedCall.id}</span>
                  </div>
                  <h3 className="font-semibold text-white text-[15px] leading-5">
                    {selectedCall.incident_subtype || selectedCall.incident_type}
                  </h3>
                  <div className="text-[12px] text-slate-300 flex items-center justify-between gap-3 border-t border-white/5 pt-2.5">
                    <span>Caller: {selectedCall.caller_number}</span>
                    <span className="text-emerald-400">Operator review</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100 text-[14px]">Incident Command Panel</span>
                    <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px]">
                      Human-in-loop
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-[12px] leading-[1.4]">
                    <div className="rounded-lg bg-slate-950/70 border border-white/5 p-2.5">
                      <span className="block text-slate-500 font-mono uppercase">Verified location</span>
                      <span className="block text-white font-semibold truncate">{selectedCall.caller_location?.address || 'Location pending'}</span>
                      <span className="block text-sky-400 font-mono mt-1">Confidence: {selectedLocationConfidence}</span>
                    </div>
                    <div className="rounded-lg bg-slate-950/70 border border-white/5 p-2.5">
                      <span className="block text-slate-500 font-mono uppercase">Language</span>
                      <span className="block text-white font-semibold">{selectedLanguage}</span>
                      <span className="block text-sky-400 font-mono mt-1">Translation ready</span>
                    </div>
                    <div className="rounded-lg bg-slate-950/70 border border-white/5 p-2.5">
                      <span className="block text-slate-500 font-mono uppercase">Nearest unit ETA</span>
                      <span className="block text-white font-semibold">3.4 min</span>
                      <span className="block text-sky-400 font-mono mt-1">Cruiser 101 primary</span>
                    </div>
                    <div className="rounded-lg bg-slate-950/70 border border-white/5 p-2.5">
                      <span className="block text-slate-500 font-mono uppercase">Override reason</span>
                      <span className="block text-white font-semibold">Required on manual change</span>
                      <span className="block text-amber-300 font-mono mt-1">Audit enforced</span>
                    </div>
                  </div>
                </div>

                {/* Hume Emotion Telemetry */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-slate-200 flex items-center gap-2">
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
                        <div className="flex justify-between text-[11px] font-mono text-slate-400">
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
                <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2.5 text-[12px]">
                  <span className="font-semibold text-slate-200 text-[13px] block">AI Triage Assessment</span>
                  <p className="text-slate-300 leading-5 bg-slate-950/60 p-3 rounded-lg border border-white/5">
                    {selectedCall.ai_triage?.summary || selectedCall.chief_complaint || 'Patient experiencing acute distress. High priority medical dispatch required.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-3 text-xs">
                  <div>
                    <span className="font-bold font-mono text-slate-300 block mb-2">Missing critical questions</span>
                    <div className="space-y-1.5">
                      {selectedMissingQuestions.map((question) => (
                        <div key={question} className="flex items-center gap-2 rounded-lg bg-slate-950/60 border border-white/5 px-2.5 py-1.5 text-slate-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{question}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold font-mono text-slate-300 block mb-2">Recommended units</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRecommendedUnits.map((unit) => (
                        <Badge key={unit} className="bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono text-[10px]">
                          {unit}
                        </Badge>
                      ))}
                    </div>
                  </div>
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
        <div className="flex-1 min-h-0 flex flex-row w-full overflow-hidden">
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
