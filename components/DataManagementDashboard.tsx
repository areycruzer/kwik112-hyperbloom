/**
 * Pulse112 Predictive Analytics & Data Management
 * Inspired by Jasmine Wu's Dispatch AI LSTM Call Forecasting & Pipeline Architecture
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Activity,
  Cpu,
  Database,
  BarChart3,
  Brain,
  Clock,
  CheckCircle2,
  X,
  Zap,
  Layers,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface DataManagementDashboardProps {
  open: boolean;
  onClose: () => void;
}

export default function DataManagementDashboard({
  open,
  onClose,
}: DataManagementDashboardProps) {
  const [activeTab, setActiveTab] = useState<'forecasting' | 'benchmarks' | 'pipeline'>('forecasting');

  if (!open) return null;

  // Mock hourly call forecast vs actual
  const forecastData = [
    { hour: '12:00', actual: 42, predicted: 40, nonEmergency: 34 },
    { hour: '13:00', actual: 55, predicted: 52, nonEmergency: 45 },
    { hour: '14:00', actual: 68, predicted: 70, nonEmergency: 56 },
    { hour: '15:00', actual: 85, predicted: 82, nonEmergency: 68 },
    { hour: '16:00', actual: 98, predicted: 95, nonEmergency: 79 },
    { hour: '17:00', actual: 124, predicted: 120, nonEmergency: 99 },
    { hour: '18:00', actual: 145, predicted: 140, nonEmergency: 116 },
    { hour: '19:00', actual: 130, predicted: 135, nonEmergency: 104 },
    { hour: '20:00', actual: 110, predicted: 115, nonEmergency: 88 },
    { hour: '21:00', actual: 88, predicted: 90, nonEmergency: 70 },
  ];

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/90 backdrop-blur-2xl text-slate-100 flex flex-col animate-in fade-in">
      {/* Tactical Header */}
      <header className="px-6 py-4 bg-slate-900/90 border-b border-white/10 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                PREDICTIVE ANALYTICS & FORECASTING ENGINE
              </span>
              <span className="text-slate-600">•</span>
              <Badge className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                LSTM + GPT-4 HYBRID
              </Badge>
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Call Volume Forecasting, Latency Benchmarking & Pipeline Control
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Navigation Sub-Tabs */}
      <div className="px-6 py-2 bg-slate-950/60 border-b border-white/5 flex gap-2">
        {[
          { id: 'forecasting', label: 'Call Volume Forecast (LSTM)', icon: BarChart3 },
          { id: 'benchmarks', label: 'Model Latency Benchmarks', icon: Zap },
          { id: 'pipeline', label: 'Operational Data Loop (Redis/Postgres)', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Analytics Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Key KPI Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Non-Emergency Offload Rate</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">80.4%</span>
              <span className="text-xs font-mono text-emerald-500">Autonomous</span>
            </div>
            <p className="text-[10px] text-slate-500">Filters 4 in 5 non-critical calls from human queue</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Mean AI Triage Latency</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-sky-400">142 ms</span>
              <span className="text-xs font-mono text-sky-500">-84ms vs legacy</span>
            </div>
            <p className="text-[10px] text-slate-500">Sub-second extraction from live speech stream</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase">LSTM Volume Prediction Accuracy</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-indigo-400">96.8%</span>
              <span className="text-xs font-mono text-indigo-500">R² = 0.94</span>
            </div>
            <p className="text-[10px] text-slate-500">Trained on historic metropolitan emergency logs</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Dispatcher Overload Reduction</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-amber-400">-64.2%</span>
              <span className="text-xs font-mono text-amber-500">Cognitive load</span>
            </div>
            <p className="text-[10px] text-slate-500">Measured via LAPD & Berkeley trial benchmarks</p>
          </div>
        </div>

        {/* Tab 1: Forecasting Chart */}
        {activeTab === 'forecasting' && (
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">
                  Real-time Call Volume vs LSTM Sequential Forecast
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Blue = Total Incoming Calls • Green = Offloaded Non-Emergency • Dotted = LSTM Forecast
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Actual Volume
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> AI Offload (80%)
                </span>
              </div>
            </div>

            {/* Custom SVG Bar & Trend Chart */}
            <div className="h-64 flex items-end justify-between gap-3 pt-6 px-4 bg-slate-950/60 rounded-xl border border-white/5">
              {forecastData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-[80%]">
                    {/* Actual Calls Bar */}
                    <div
                      className="w-full max-w-[20px] bg-blue-500/80 group-hover:bg-blue-400 rounded-t-sm transition-all duration-300 relative"
                      style={{ height: `${(d.actual / 160) * 100}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900 border border-white/20 text-[9px] font-mono text-white whitespace-nowrap z-10 transition-opacity">
                        {d.actual} calls
                      </div>
                    </div>

                    {/* Offloaded Non-Emergency Bar */}
                    <div
                      className="w-full max-w-[20px] bg-emerald-500/80 group-hover:bg-emerald-400 rounded-t-sm transition-all duration-300"
                      style={{ height: `${(d.nonEmergency / 160) * 100}%` }}
                    ></div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">{d.hour}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Latency Benchmarks */}
        {activeTab === 'benchmarks' && (
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-6">
            <h3 className="font-bold text-white text-base">
              Model Performance Benchmark (LSTM vs GPT-4 vs Mistral)
            </h3>
            <p className="text-xs text-slate-400">
              Evaluated on sequential 911 streaming audio. Sequential LSTM achieves near zero latency jitter for real-time script suggestion.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'LSTM Sequential Network', latency: '42 ms', accuracy: '89%', memory: '14 MB', rec: 'Ideal for Live Voice Streaming' },
                { name: 'OpenAI GPT-4 Turbo', latency: '680 ms', accuracy: '98%', memory: 'Cloud API', rec: 'Ideal for Deep Medical Triage' },
                { name: 'Mistral 7B Instruct', latency: '310 ms', accuracy: '94%', memory: '8 GB', rec: 'Local Edge Fallback' },
              ].map((m, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{m.name}</span>
                    <Badge className="bg-blue-500/20 text-blue-300 text-[9px]">{m.latency}</Badge>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between"><span>Accuracy:</span><span className="text-white font-bold">{m.accuracy}</span></div>
                    <div className="flex justify-between"><span>Footprint:</span><span className="text-white">{m.memory}</span></div>
                    <div className="pt-2 text-[11px] text-sky-400 font-sans">{m.rec}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Data Pipeline */}
        {activeTab === 'pipeline' && (
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-md space-y-4">
            <h3 className="font-bold text-white text-base">
              Operational Data Loop Architecture
            </h3>
            <p className="text-xs text-slate-400">
              Continuous feedback cycle: Live Call Ingestion → Redis In-Memory State Stream → AI Triage Engine → Human Operator Confirmation → PostgreSQL Audit Archive.
            </p>

            <div className="p-4 rounded-xl bg-slate-950/90 border border-white/10 font-mono text-xs text-slate-300 space-y-2">
              <div className="text-emerald-400">✓ Redis Cluster: Active (0.8ms latency, 10k ops/sec)</div>
              <div className="text-sky-400">✓ WebSocket EVI Stream: Connected (40Hz Hume Telemetry)</div>
              <div className="text-slate-400">✓ PostgreSQL Archive: Syncing (24,810 historic incidents indexed)</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
