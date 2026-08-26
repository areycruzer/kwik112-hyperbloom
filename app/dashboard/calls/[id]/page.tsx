/**
 * Pulse112 Tactical Incident Telemetry & Deep Inspector
 */

'use client';

import { use, useState, useEffect } from 'react';
import { EmergencyCall } from '@/lib/types';
import { mockCalls, getTimeElapsed } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Phone,
  Radio,
  MapPin,
  Clock,
  Activity,
  AlertTriangle,
  Flame,
  Shield,
  Sparkles,
  CheckCircle2,
  Navigation,
  Globe,
  Mic,
  FileText,
} from 'lucide-react';

const MiniLocationMap = dynamic(() => import('@/components/MiniLocationMap'), {
  ssr: false,
});

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CallDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const callId = resolvedParams.id;

  const [call, setCall] = useState<EmergencyCall | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('kwik_emergency_calls');
      const all = stored ? JSON.parse(stored) : [];
      const found = [...all, ...mockCalls].find((c) => c.id === callId);
      if (found) setCall(found);
    } catch (e) {
      console.error(e);
      const found = mockCalls.find((c) => c.id === callId);
      if (found) setCall(found);
    }
  }, [callId]);

  if (!call) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#060a12] text-slate-300 font-mono text-xs">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p>Retrieving Incident #{callId} Telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col font-sans select-none">
      {/* Tactical Top Bar */}
      <header className="bg-slate-950/90 border-b border-white/10 px-6 py-3 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-900 border-white/10 hover:bg-slate-800 text-slate-300 font-mono text-xs gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Command Radar
            </Button>
          </Link>

          <div className="h-5 w-px bg-white/10"></div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase text-slate-400">INCIDENT DOSSIER</span>
              <span className="text-slate-600">•</span>
              <Badge className="bg-red-500/20 text-red-300 font-mono text-[9px]">
                {call.priority_code || (call.severity === 'critical' ? 'P1 CRITICAL' : 'P2 HIGH')}
              </Badge>
            </div>
            <h1 className="text-base font-bold text-white tracking-wide">
              {call.incident_subtype || call.incident_type} (#{call.id})
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1 rounded bg-slate-900 border border-white/5 text-slate-400">
            Reported: <span className="text-white font-bold">{getTimeElapsed(call.created_at)}</span>
          </div>
        </div>
      </header>

      {/* Main Dossier Content */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        {/* Left Column (7 cols): Telemetry & Transcript */}
        <div className="lg:col-span-7 space-y-6">
          {/* Caller & Location Card */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider">
              Caller & GPS Triangulation
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                <span className="text-slate-500 text-[10px]">CALLER PHONE</span>
                <span className="text-white font-bold block">{call.caller_number}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
                <span className="text-slate-500 text-[10px]">LANGUAGE / LOCALE</span>
                <span className="text-sky-400 font-bold block">{call.language || 'English (Auto-Triage)'}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 text-xs">
              <span className="text-slate-500 text-[10px] font-mono block mb-1">TRIANGULATED ADDRESS</span>
              <p className="text-slate-200 font-medium">{call.caller_location?.address || 'Sector 14, Ring Road, New Delhi'}</p>
            </div>
          </div>

          {/* AI Triage & Chief Complaint */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                AI Triage Diagnostic Summary
              </h2>
              <Badge className="bg-emerald-500/20 text-emerald-300 font-mono text-[9px]">96% CONFIDENCE</Badge>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-4 rounded-xl border border-white/5 font-sans">
              {call.ai_triage?.summary || call.chief_complaint || 'Emergency response required. AI extraction identified acute situation needing priority dispatch.'}
            </p>
          </div>
        </div>

        {/* Right Column (5 cols): Map & Hume Emotion Telemetry */}
        <div className="lg:col-span-5 space-y-6">
          {/* Mini Map */}
          <div className="h-64 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {call.caller_location?.latitude && call.caller_location?.longitude ? (
              <MiniLocationMap
                latitude={call.caller_location.latitude}
                longitude={call.caller_location.longitude}
                address={call.caller_location.address}
              />
            ) : (
              <div className="h-full w-full bg-slate-950 flex items-center justify-center font-mono text-xs text-slate-500">
                Awaiting GPS Fix...
              </div>
            )}
          </div>

          {/* Hume EVI Emotion Radar */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-300">Hume Voice Emotion Breakdown</span>
              <span className="text-emerald-400 text-[10px]">EVI 2.0 Telemetry</span>
            </div>

            <div className="space-y-2.5">
              {[
                { label: 'Panic', val: 94, color: '#ef4444' },
                { label: 'Distress', val: 88, color: '#f97316' },
                { label: 'Urgency', val: 82, color: '#eab308' },
                { label: 'Calmness', val: 12, color: '#38bdf8' },
              ].map((e) => (
                <div key={e.label} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>{e.label}</span>
                    <span className="text-white font-bold">{e.val}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${e.val}%`, backgroundColor: e.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
