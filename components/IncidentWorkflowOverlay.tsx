/**
 * Incident Workflow & Action Approval Command Center
 * Inspired by Jasmine Wu's Dispatch AI Handoff & Incident Management
 */

'use client';

import { useMemo, useState } from 'react';
import { EmergencyCall } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  MapPin,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Radio,
  Activity,
  X,
  Navigation,
  Sparkles,
  Truck,
  Shield,
  Flame,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Volume2,
  FileText,
  ChevronRight,
  Send,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const MiniLocationMap = dynamic(() => import('@/components/MiniLocationMap'), {
  ssr: false,
});

interface IncidentWorkflowOverlayProps {
  open: boolean;
  onClose: () => void;
  call: EmergencyCall | null;
  calls: EmergencyCall[];
}

interface ActionRecommendation {
  id: string;
  category: 'dispatch' | 'medical' | 'notification' | 'citizen';
  title: string;
  description: string;
  rationale: string;
  confidence: number;
  approved: boolean;
  approvalRequired: boolean;
  unitType?: string;
  priority: 'high' | 'standard' | 'optional';
}

export default function IncidentWorkflowOverlay({
  open,
  onClose,
  call,
  calls,
}: IncidentWorkflowOverlayProps) {
  const [recommendations, setRecommendations] = useState<ActionRecommendation[]>([
    {
      id: 'rec-1',
      category: 'dispatch',
      title: 'Deploy Priority 1 Fire & EMS Units',
      description: 'Dispatch Engine 204 & Medic 302 with high-priority siren authorization.',
      rationale: 'Active fire report includes trapped occupants and heavy smoke, so fire rescue and EMS should move together.',
      confidence: 96,
      approved: true,
      approvalRequired: true,
      unitType: 'Fire Engine + Paramedic',
      priority: 'high',
    },
    {
      id: 'rec-2',
      category: 'medical',
      title: 'Send AI-Guided CPR & First Aid Link via SMS',
      description: 'Transmit automated interactive bystander resuscitation web app with live audio pacing.',
      rationale: 'Caller-side instructions reduce the gap before responders arrive and preserve operator attention.',
      confidence: 92,
      approved: true,
      approvalRequired: true,
      priority: 'high',
    },
    {
      id: 'rec-3',
      category: 'notification',
      title: 'Alert Regional Trauma Center (District General)',
      description: 'Pre-notify trauma resuscitation team of inbound victim with severe distress telemetry.',
      rationale: 'Hospital pre-alert is useful when injury severity is high, but the operator should confirm patient count first.',
      confidence: 88,
      approved: false,
      approvalRequired: true,
      priority: 'standard',
    },
    {
      id: 'rec-4',
      category: 'dispatch',
      title: 'Request Traffic Incident Management Perimeter',
      description: 'Route Cruiser 101 to block oncoming intersection and clear emergency vehicle corridor.',
      rationale: 'Traffic control can speed access and protect responders, but should match the verified incident location.',
      confidence: 84,
      approved: false,
      approvalRequired: true,
      unitType: 'Police Patrol',
      priority: 'optional',
    },
  ]);

  const [activeStage, setActiveStage] = useState<'triage' | 'approval' | 'en-route' | 'on-scene'>('approval');
  const [operatorNotes, setOperatorNotes] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const toggleRecommendation = (id: string) => {
    setRecommendations((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, approved: !rec.approved } : rec))
    );
  };

  const handleAuthorizeSelected = () => {
    setConfirmed(true);
    setActiveStage('en-route');
  };

  if (!open || !call) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/90 backdrop-blur-2xl text-slate-100 flex flex-col animate-in fade-in duration-200">
      {/* Tactical Header */}
      <header className="px-6 py-3.5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400">MISSION DISPATCH COMMAND</span>
              <span className="text-slate-600">|</span>
              <Badge className="bg-red-500/20 border border-red-500/40 text-red-300 font-mono text-[10px]">
                INCIDENT #{call.id}
              </Badge>
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              {call.incident_subtype || call.incident_type} - Action Verification & Handoff
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-white/10 text-xs font-mono">
            <span className="text-slate-400">AI Confidence:</span>
            <span className="text-emerald-400 font-bold">{call.ai_triage?.confidence ? `${Math.round(call.ai_triage.confidence * 100)}%` : '94%'}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Priority:</span>
            <span className="text-red-400 font-bold uppercase">{call.severity || 'P1 CRITICAL'}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Command Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
        {/* Left Column (4 cols): Incident Overview & Geolocation */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Status Timeline Card */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-3">
            <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider flex items-center justify-between">
              <span>Operational Stage</span>
              <span className="text-blue-400">NIMS / ICS Compliant</span>
            </h3>
            
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { stage: 'triage', label: '1. Triage', active: true },
                { stage: 'approval', label: '2. Approval', active: activeStage === 'approval' || confirmed },
                { stage: 'en-route', label: '3. En Route', active: confirmed || activeStage === 'en-route' },
                { stage: 'on-scene', label: '4. On Scene', active: false },
              ].map((s) => (
                <div
                  key={s.stage}
                  className={`p-2 rounded-lg text-center font-mono text-[10px] border transition-all ${
                    s.active
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 font-bold shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                      : 'bg-slate-950/40 border-white/5 text-slate-500'
                  }`}
                >
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* Incident Telemetry Card */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-3">
            <h3 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider">
              Caller & Telemetry Feed
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Caller ID:</span>
                <span className="font-mono text-slate-200">{call.caller_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Reported Address:</span>
                <span className="text-slate-200 font-medium text-right max-w-[200px] truncate">
                  {call.caller_location?.address || 'Sector 14, Ring Road'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Chief Complaint:</span>
                <span className="text-amber-300 font-medium">{call.chief_complaint || 'Chest pain with respiratory distress'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Language Detected:</span>
                <span className="font-mono text-sky-400">English (Auto-Translated)</span>
              </div>
            </div>
          </div>

          {/* Mini Tactical Map */}
          <div className="h-48 rounded-xl overflow-hidden border border-white/10 shadow-xl relative">
            {call.caller_location?.latitude && call.caller_location?.longitude ? (
              <MiniLocationMap
                latitude={call.caller_location.latitude}
                longitude={call.caller_location.longitude}
                address={call.caller_location.address}
              />
            ) : (
              <div className="h-full w-full bg-slate-950 flex items-center justify-center text-xs font-mono text-slate-500">
                Awaiting GPS Triangulation...
              </div>
            )}
          </div>
        </div>

        {/* Center/Right Column (8 cols): AI Action Recommendation Cards & Decision Controls */}
        <div className="lg:col-span-8 flex flex-col gap-4 overflow-y-auto">
          {/* AI Recommendation Panel Header */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm tracking-wide">
                  AI Tactical Recommendations ({recommendations.filter((r) => r.approved).length}/{recommendations.length} Selected)
                </h3>
                <p className="text-xs text-slate-400">
                  Human approval required. Select actions, review AI rationale, then authorize the handoff.
                </p>
              </div>
            </div>

            <Button
              onClick={handleAuthorizeSelected}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-xs px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Authorize selected actions
            </Button>
          </div>

          {/* Recommendation Cards List */}
          <div className="space-y-3 flex-1">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                onClick={() => toggleRecommendation(rec.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                  rec.approved
                    ? 'bg-slate-900/90 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                    : 'bg-slate-950/40 border-white/10 hover:border-white/20 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center border text-xs font-bold transition-all mt-0.5 ${
                        rec.approved
                          ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                          : 'border-white/20 bg-slate-950/60 text-transparent'
                      }`}
                    >
                      OK
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">{rec.title}</span>
                        {rec.unitType && (
                          <Badge className="bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono text-[9px]">
                            {rec.unitType}
                          </Badge>
                        )}
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          {rec.confidence}% Match
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{rec.description}</p>
                      <p className="text-[11px] text-sky-300 leading-relaxed">
                        AI rationale: {rec.rationale}
                      </p>
                      {rec.approvalRequired && (
                        <p className="text-[10px] font-mono uppercase text-amber-300">
                          Human approval required
                        </p>
                      )}
                    </div>
                  </div>

                  <Badge
                    className={`font-mono text-[10px] uppercase shrink-0 ${
                      rec.priority === 'high'
                        ? 'bg-red-500/20 border-red-500/30 text-red-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {rec.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Operator Audit & Continuous Feedback Loop */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-slate-400 font-bold">
                Human-in-the-Loop Operator Feedback
              </span>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Model adaptation:</span>
                <button
                  onClick={() => setFeedbackSent(true)}
                  className={`p-1 rounded hover:bg-white/10 transition-colors ${feedbackSent ? 'text-emerald-400' : ''}`}
                  title="Accurate AI recommendations"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFeedbackSent(true)}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors"
                  title="Needs correction"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <label className="sr-only" htmlFor="operator-override-note">Override note</label>
              <input
                id="operator-override-note"
                type="text"
                placeholder="Override note: add operator decision, correction, or manual dispatch reason..."
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-950/80 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <Button
                onClick={() => {
                  setOperatorNotes('');
                  setFeedbackSent(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs px-3"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Log Audit
              </Button>
            </div>
            {feedbackSent && (
              <p className="text-[10px] font-mono text-emerald-400 animate-in fade-in">
                Feedback logged to active incident audit trail.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
