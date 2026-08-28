/**
 * Pulse112 Tactical Emergency Call Simulator & Voice AI Command
 * Real-time Hume EVI voice engine, emotion telemetry, and simulated live emergency scenarios.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Activity,
  Sparkles,
  Volume2,
  Globe,
  Radio,
  Clock,
  Shield,
  Flame,
  AlertTriangle,
  X,
  Send,
  RotateCw,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { EmergencyCall } from '@/lib/types';

interface StartEmergencyCallProps {
  onCallCreated?: (callId: string) => void;
}

interface Scenario {
  id: string;
  name: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  caller: string;
  phone: string;
  address: string;
  coordinates: { lat: number; lng: number };
  transcript: Array<{ speaker: 'caller' | 'ai' | 'dispatcher'; text: string; time: string; emotions?: Record<string, number> }>;
}

const PRESET_SCENARIOS: Scenario[] = [
  {
    id: 'sc-1',
    name: 'Cardiac Arrest / Medical Emergency',
    category: 'Medical',
    severity: 'critical',
    caller: 'Rajesh Sharma',
    phone: '+91 98102 34512',
    address: 'Flat 402, Royal Palms, Connaught Place, New Delhi',
    coordinates: { lat: 28.6304, lng: 77.2177 },
    transcript: [
      { speaker: 'caller', text: '112, please help! My father just collapsed on the living room floor, he is clutching his chest and not breathing normally!', time: '00:03', emotions: { Panic: 0.94, Distress: 0.89, Fear: 0.91 } },
      { speaker: 'ai', text: 'I am dispatching Advanced Life Support paramedics right now to your location at Flat 402, Royal Palms. Is he conscious? Can you feel any pulse?', time: '00:09', emotions: { Calmness: 0.85, Empathy: 0.92 } },
      { speaker: 'caller', text: 'No pulse! He is unresponsive! What do I do?!', time: '00:15', emotions: { Panic: 0.98, Distress: 0.96 } },
      { speaker: 'ai', text: 'Place both hands in the center of his chest. Push hard and fast at 100 to 120 beats per minute. I will count with you: 1, 2, 3, 4...', time: '00:22', emotions: { Calmness: 0.95, Directive: 0.9 } },
    ],
  },
  {
    id: 'sc-2',
    name: 'Structure Fire in Commercial Plaza',
    category: 'Fire / Rescue',
    severity: 'critical',
    caller: 'Sunita Verma',
    phone: '+91 98711 88291',
    address: 'Block B, Nehru Place Commercial Complex, New Delhi',
    coordinates: { lat: 28.5492, lng: 77.2530 },
    transcript: [
      { speaker: 'caller', text: 'There is heavy black smoke pouring out of the 3rd floor electronics shop! People are trapped on the stairway!', time: '00:04', emotions: { Fear: 0.92, Urgency: 0.95 } },
      { speaker: 'ai', text: 'Fire Station 4 and Rescue Squad 12 have been dispatched. Are alarms sounding? Evacuate away from the smoke if possible.', time: '00:10', emotions: { Calmness: 0.88 } },
      { speaker: 'caller', text: 'We are on the fire exit now, approximately 15 people coming down with me!', time: '00:18', emotions: { Relief: 0.45, Fear: 0.78 } },
    ],
  },
  {
    id: 'sc-3',
    name: 'Multi-Vehicle Highway Collision',
    category: 'Traffic / Rescue',
    severity: 'high',
    caller: 'Amit Patel',
    phone: '+91 99201 44589',
    address: 'DND Flyway, Exit 3 Northbound, New Delhi',
    coordinates: { lat: 28.5729, lng: 77.2795 },
    transcript: [
      { speaker: 'caller', text: 'Major accident on DND Flyway! An SUV flipped over and two sedans collided. Fuel is leaking on the road.', time: '00:05', emotions: { Agitation: 0.81, Urgency: 0.9 } },
      { speaker: 'ai', text: 'Highway Patrol and Hazmat Fire tender are en route. Stay back from any fuel spill and turn off your hazard lights once safe.', time: '00:12', emotions: { Calmness: 0.9 } },
    ],
  },
  {
    id: 'sc-4',
    name: 'Non-Emergency Water Pipe Rupture (AI Autonomous Handoff)',
    category: 'Public Utility',
    severity: 'low',
    caller: 'Vikas Mehra',
    phone: '+91 98450 11982',
    address: 'Sector 62 Road, Near Metro Station, Noida',
    coordinates: { lat: 28.6270, lng: 77.3620 },
    transcript: [
      { speaker: 'caller', text: 'Hi, there is water gushing onto the sidewalk from a broken municipal main. Nobody is hurt, just flooding the pavement.', time: '00:04', emotions: { Neutral: 0.78, Calmness: 0.85 } },
      { speaker: 'ai', text: 'Acknowledged. This has been classified as a Non-Emergency Utility event. I have created municipal ticket #UTIL-9921 and notified Jal Board.', time: '00:11', emotions: { Efficiency: 0.95 } },
    ],
  },
];

export default function StartEmergencyCall({ onCallCreated }: StartEmergencyCallProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(PRESET_SCENARIOS[0]);
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<Array<{ speaker: string; text: string; time: string }>>([]);
  const [emotions, setEmotions] = useState<Record<string, number>>({
    Panic: 0.88,
    Distress: 0.79,
    Fear: 0.65,
    Agitation: 0.42,
    Calmness: 0.15,
  });
  const [audioWaves, setAudioWaves] = useState<number[]>([30, 60, 45, 80, 95, 70, 40, 65, 85, 50, 75, 90]);
  const [isTranslating, setIsTranslating] = useState(false);

  // Timer for active call
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callActive) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callActive]);

  // Audio waveform animation
  useEffect(() => {
    if (!callActive) return;
    const waveInterval = setInterval(() => {
      setAudioWaves((prev) =>
        prev.map(() => Math.floor(Math.random() * 80) + 15)
      );
    }, 150);
    return () => clearInterval(waveInterval);
  }, [callActive]);

  // Step through transcript simulation
  useEffect(() => {
    if (!callActive) return;
    const script = selectedScenario.transcript;

    if (currentStepIndex < script.length) {
      const stepTimer = setTimeout(() => {
        const currentLine = script[currentStepIndex];
        setLiveTranscript((prev) => [...prev, { speaker: currentLine.speaker, text: currentLine.text, time: currentLine.time }]);
        if (currentLine.emotions) {
          setEmotions((prev) => ({ ...prev, ...currentLine.emotions }));
        }
        setCurrentStepIndex((prev) => prev + 1);
      }, 3500);

      return () => clearTimeout(stepTimer);
    }
  }, [callActive, currentStepIndex, selectedScenario]);

  const handleStartCall = () => {
    setCallActive(true);
    setCallDuration(0);
    setCurrentStepIndex(0);
    setLiveTranscript([]);
  };

  const handleEndCall = () => {
    setCallActive(false);

    // Persist new call to local storage & notify dashboard
    const newEmergencyCall: EmergencyCall = {
      id: `call-${Date.now()}`,
      caller_number: selectedScenario.phone,
      caller_location: {
        address: selectedScenario.address,
        latitude: selectedScenario.coordinates.lat,
        longitude: selectedScenario.coordinates.lng,
        accuracy_radius: 15,
        source: 'gps',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      call_status: 'ended',
      status: selectedScenario.severity === 'low' ? 'resolved' : 'active',
      severity: selectedScenario.severity,
      incident_type: selectedScenario.category,
      incident_subtype: selectedScenario.name,
      chief_complaint: selectedScenario.transcript[0]?.text || selectedScenario.name,
      persons_involved: 1,
      language: 'English',
      priority_code: selectedScenario.severity === 'critical' ? 'P1' : selectedScenario.severity === 'high' ? 'P2' : selectedScenario.severity === 'medium' ? 'P3' : 'P4',
      ai_triage: {
        severity: selectedScenario.severity,
        confidence: 0.96,
        summary: `AI Automated Triage: ${selectedScenario.name}. Chief Complaint: ${selectedScenario.transcript[0]?.text}`,
        incident_type: selectedScenario.category,
        priority_code: selectedScenario.severity === 'critical' ? 'P1' : 'P2',
        persons_involved: 1,
        flags: ['Immediate Dispatch Recommended', 'Live Hume Emotion Tracked'],
        emotion_analysis: {
          top_emotions: Object.entries(emotions).map(([emotion, intensity]) => ({ emotion, intensity })),
          distress_level: emotions.Panic || 0.8,
        },
      },
    };

    try {
      const stored = localStorage.getItem('kwik_emergency_calls');
      const existing = stored ? JSON.parse(stored) : [];
      localStorage.setItem('kwik_emergency_calls', JSON.stringify([newEmergencyCall, ...existing]));
      window.dispatchEvent(
        new CustomEvent('kwik-call-updated', {
          detail: { call: newEmergencyCall, isUpdate: false },
        })
      );
    } catch (e) {
      console.error('Error saving simulated call:', e);
    }

    if (onCallCreated) {
      onCallCreated(newEmergencyCall.id);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="h-10 bg-red-600 hover:bg-red-500 text-white font-bold text-[12px] px-3 rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center gap-2 whitespace-nowrap transition-all hover:scale-[1.02]"
      >
        <Phone className="w-4 h-4 animate-bounce" />
        <span className="hidden min-[1540px]:inline">Start 112 voice call</span>
        <span className="min-[1540px]:hidden">112 Call</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-[2500] bg-slate-950/90 backdrop-blur-2xl text-slate-100 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-4xl bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950/80 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="font-bold text-white tracking-wide text-base">
                    Hume EVI Live Emergency Voice Station
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Real-time conversational triage & emotion telemetry engine
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (callActive) handleEndCall();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
              {/* Left Column: Preset Scenarios */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold">
                    Select Emergency Scenario
                  </span>
                  <Badge className="bg-blue-500/20 text-blue-300 font-mono text-[9px]">
                    4 PRESETS
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {PRESET_SCENARIOS.map((sc) => (
                    <div
                      key={sc.id}
                      onClick={() => {
                        if (!callActive) setSelectedScenario(sc);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedScenario.id === sc.id
                          ? 'bg-slate-800/90 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                          : 'bg-slate-950/40 border-white/5 hover:border-white/15'
                      } ${callActive ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-white">{sc.name}</span>
                        <Badge
                          className={`text-[9px] font-mono uppercase ${
                            sc.severity === 'critical'
                              ? 'bg-red-500/20 text-red-300'
                              : sc.severity === 'high'
                              ? 'bg-orange-500/20 text-orange-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {sc.severity}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{sc.address}</p>
                    </div>
                  ))}
                </div>

                {/* Caller Information Preview */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 text-xs space-y-2 font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Caller Name:</span>
                    <span className="text-white font-bold">{selectedScenario.caller}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Number:</span>
                    <span className="text-white">{selectedScenario.phone}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Carrier GPS:</span>
                    <span className="text-emerald-400">Locked (±15m)</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Active Call Live HUD */}
              <div className="lg:col-span-7 flex flex-col gap-4 bg-slate-950/80 p-5 rounded-2xl border border-white/10">
                {/* Call Header Status */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        callActive ? 'bg-red-500 animate-ping' : 'bg-slate-600'
                      }`}
                    ></span>
                    <span className="font-mono font-bold text-sm uppercase">
                      {callActive ? `LIVE CALL | ${formatTimer(callDuration)}` : 'READY TO CONNECT'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsTranslating(!isTranslating)}
                      className={`px-2 py-1 rounded text-[10px] font-mono border transition-all flex items-center gap-1 ${
                        isTranslating
                          ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
                          : 'bg-slate-900 border-white/10 text-slate-400'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      Live Translate (Hindi to English)
                    </button>
                  </div>
                </div>

                {/* Audio Waveform Visualization */}
                <div className="h-16 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-center gap-1 px-4">
                  {audioWaves.map((height, idx) => (
                    <div
                      key={idx}
                      className="w-1.5 rounded-full bg-gradient-to-t from-blue-600 via-sky-400 to-indigo-300 transition-all duration-150"
                      style={{ height: callActive ? `${height}%` : '6px' }}
                    ></div>
                  ))}
                </div>

                {/* Hume Emotion Telemetry Gauges */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Hume Emotion Telemetry (EVI 2.0)
                    </span>
                    <span className="text-emerald-400">Streaming (40Hz)</span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(emotions).map(([emotion, val]) => (
                      <div
                        key={emotion}
                        className="p-2 rounded-lg bg-slate-900 border border-white/5 text-center space-y-1"
                      >
                        <span className="text-[10px] font-mono text-slate-400 block truncate">{emotion}</span>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.round(val * 100)}%`,
                              backgroundColor:
                                emotion === 'Panic' || emotion === 'Distress'
                                  ? '#ef4444'
                                  : emotion === 'Fear'
                                  ? '#f97316'
                                  : '#38bdf8',
                            }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-white">
                          {Math.round(val * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Transcript Stream */}
                <div className="flex-1 min-h-[160px] max-h-[180px] rounded-xl bg-slate-900/70 border border-white/10 p-3 overflow-y-auto space-y-2 text-xs">
                  {liveTranscript.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 font-mono text-[11px]">
                      Press 'Start Live 112 Call' to initiate voice stream...
                    </div>
                  ) : (
                    liveTranscript.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-2 ${
                          msg.speaker === 'caller' ? 'text-amber-300' : 'text-sky-300'
                        }`}
                      >
                        <span className="font-bold font-mono uppercase text-[10px] shrink-0">
                          [{msg.speaker} {msg.time}]:
                        </span>
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Control Actions */}
                <div className="flex gap-3 pt-2">
                  {!callActive ? (
                    <Button
                      onClick={handleStartCall}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold font-mono text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      CONNECT SIMULATED VOICE SESSION
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEndCall}
                      className="flex-1 bg-slate-800 hover:bg-red-600 text-white font-bold font-mono text-xs py-3 rounded-xl border border-red-500/30 transition-all"
                    >
                      <PhoneOff className="w-4 h-4 mr-2" />
                      END CALL & HANDOFF TO CAD
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
