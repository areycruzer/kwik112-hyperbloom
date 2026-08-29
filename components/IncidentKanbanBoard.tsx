/**
 * Pulse112 Mission Kanban Pipeline
 * Multi-stage incident pipeline inspired by Jasmine Wu's Dispatch AI Operational Loop.
 * Enables stage tracking, drag & drop / 1-click stage transition, and deep inspection in Tactical Radar Map.
 */

'use client';

import { useState } from 'react';
import { CallStatus, EmergencyCall } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Clock,
  Radio,
  Phone,
  Shield,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Navigation,
  Flame,
  AlertTriangle,
  MoveRight,
  Eye,
  Plus,
  Filter,
  Layers,
} from 'lucide-react';
import { getTimeElapsed } from '@/lib/mock-data';

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
  color: string;
  badgeBg: string;
  matchStatuses: string[];
}

const KANBAN_COLUMNS: ColumnDef[] = [
  {
    id: 'triage',
    title: '1. INCOMING / AI TRIAGE',
    subtitle: 'Live Speech Stream & Geolocation Lock',
    color: '#ef4444',
    badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
    matchStatuses: ['pending', 'triage', 'incoming'],
  },
  {
    id: 'approval',
    title: '2. AI RECOMMENDATION & HANDOFF',
    subtitle: 'Awaiting Operator Authorization',
    color: '#f97316',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    matchStatuses: ['active', 'awaiting_approval'],
  },
  {
    id: 'dispatched',
    title: '3. UNITS DISPATCHED / EN ROUTE',
    subtitle: 'Active Pathfinding & Live Fleet GPS',
    color: '#38bdf8',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    matchStatuses: ['dispatched', 'in-progress', 'en-route'],
  },
  {
    id: 'on_scene',
    title: '4. ON-SCENE / ACTIVE MITIGATION',
    subtitle: 'First Responders Deployed at Coordinates',
    color: '#eab308',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    matchStatuses: ['on_scene', 'mitigating'],
  },
  {
    id: 'resolved',
    title: '5. RESOLVED / AUTONOMOUS CLOSE',
    subtitle: 'Handoff Completed & Audit Logged',
    color: '#10b981',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    matchStatuses: ['resolved', 'completed', 'ended'],
  },
];

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

  /** @description The call status each pipeline stage corresponds to. */
  const STATUS_FOR_STAGE: Record<string, CallStatus> = {
    triage: 'pending',
    approval: 'active',
    dispatched: 'dispatched',
    on_scene: 'on_scene',
    resolved: 'resolved',
  };

  const STAGE_ORDER = ['triage', 'approval', 'dispatched', 'on_scene', 'resolved'];

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
    <div className="flex-1 flex flex-col h-full bg-[#060a12] text-slate-100 overflow-hidden select-none">
      {/* Kanban Sub-Header & Stage Filter Bar */}
      <div className="px-6 py-3 bg-slate-950/70 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white font-mono tracking-wider flex items-center gap-2">
              MISSION KANBAN PIPELINE
              <span className="text-[10px] font-normal text-slate-400">
                (DRAG CARDS OR CLICK TO INSPECT LIVE MAP)
              </span>
            </h2>
          </div>
        </div>

        {/* Priority Filter Chips */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Priority:
          </span>
          {['all', 'critical', 'high', 'medium', 'low'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase transition-all ${
                filterPriority === p
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold shadow-md'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 5-Column Kanban Board Layout */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto overflow-y-hidden">
        {KANBAN_COLUMNS.map((column) => {
          const colCalls = getCallsForColumn(column);

          return (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className="flex flex-col h-full rounded-xl bg-slate-950/60 border border-white/10 overflow-hidden shadow-2xl transition-all"
            >
              {/* Column Header */}
              <div
                className="p-3 border-b border-white/10 bg-slate-900/80 backdrop-blur-md space-y-1"
                style={{ borderTop: `3px solid ${column.color}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-white truncate max-w-[170px]">
                    {column.title}
                  </span>
                  <Badge className={`font-mono text-[10px] px-1.5 py-0.2 ${column.badgeBg}`}>
                    {colCalls.length}
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400 truncate">{column.subtitle}</p>
              </div>

              {/* Scrollable Column Cards Container */}
              <div className="flex-1 p-2 space-y-2.5 overflow-y-auto">
                {colCalls.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-slate-600 font-mono text-[11px] text-center p-3">
                    Drop incidents here to update stage
                  </div>
                ) : (
                  colCalls.map((call) => {
                    const isP1 = call.severity === 'critical';
                    const isP2 = call.severity === 'high';
                    const confidence = call.ai_confidence ?? call.ai_triage?.confidence ?? null;
                    const ranked = call.ai_triage?.emotion_analysis?.top_emotions;
                    const topEmotion = ranked?.length
                      ? ranked[0]
                      : call.top_emotion
                      ? { emotion: call.top_emotion, intensity: call.emotion_intensity }
                      : null;
                    const pColor = isP1
                      ? 'bg-red-500/15 border-red-500/40 text-red-300'
                      : isP2
                      ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                      : 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300';

                    return (
                      <div
                        key={call.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, call.id)}
                        className={`group p-3 rounded-xl border bg-slate-900/90 hover:bg-slate-800/90 border-white/10 hover:border-blue-500/60 shadow-lg cursor-grab active:cursor-grabbing transition-all space-y-2 relative ${
                          isP1 ? 'hover:shadow-[0_0_15px_rgba(239,68,68,0.25)]' : ''
                        }`}
                      >
                        {/* Card Header: Priority & Time */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border uppercase ${pColor}`}>
                              {call.priority_code || (isP1 ? 'P1' : isP2 ? 'P2' : 'P3')}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 font-bold">
                              #{call.id.slice(-4)}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono text-slate-400">
                            {getTimeElapsed(call.created_at)}
                          </span>
                        </div>

                        {/* Title & Complaint */}
                        <div>
                          <h4 className="font-bold text-xs text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                            {call.incident_subtype || call.incident_type}
                          </h4>
                          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed mt-0.5">
                            {call.ai_summary || call.chief_complaint || 'Emergency reported. Audio stream active.'}
                          </p>
                        </div>

                        {/* Hume Emotion & Geolocation Tags */}
                        <div className="space-y-1 pt-1 border-t border-white/5 text-[10px] font-mono">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="truncate max-w-[140px]">
                              📍 {call.caller_location?.address || 'GPS Fix Locked'}
                            </span>
                            <span className="text-emerald-400 font-bold">
                              {typeof confidence === 'number' ? `${Math.round(confidence * 100)}%` : '—'}
                            </span>
                          </div>

                          {/* Measured prosody, when this call actually has any */}
                          {topEmotion && (
                            <div className="flex items-center gap-1 text-[9px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span className="capitalize">
                                {topEmotion.emotion}
                                {typeof topEmotion.intensity === 'number'
                                  ? ` (${Math.round(topEmotion.intensity * 100)}%)`
                                  : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Interactive Click to View in Map & Action Controls */}
                        <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-white/5">
                          <button
                            onClick={() => onSelectCallAndNavigateToMap(call.id)}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-mono text-[10px] font-bold border border-blue-500/30 transition-all flex items-center justify-center gap-1"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>OPEN IN MAP</span>
                          </button>

                          <button
                            onClick={() => onOpenWorkflow(call)}
                            className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-white/10 hover:border-white/20 transition-all"
                            title="Review AI recommended actions"
                            aria-label={`Review AI recommended actions for ${call.incident_subtype || call.incident_type}`}
                          >
                            <Shield className="w-3 h-3 text-amber-400" />
                          </button>

                          {stageOf(call) !== 'resolved' && (
                            <button
                              onClick={() => advanceStage(call)}
                              className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white font-mono text-[10px] border border-white/10 hover:border-emerald-500 transition-all"
                              title="Advance to the next pipeline stage"
                              aria-label={`Advance ${call.incident_subtype || call.incident_type} to the next stage`}
                            >
                              <MoveRight className="w-3 h-3" />
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
