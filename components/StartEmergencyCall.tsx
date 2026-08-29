/**
 * Pulse112 Live 112 Voice Station
 * Opens a real Hume EVI voice session, streams the caller's speech and prosody
 * in real time, then hands the finished conversation to /api/calls/create for
 * triage. A scripted mode runs the same backend pipeline without a microphone.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VoiceProvider, useVoice } from '@humeai/voice-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Radio,
  Sparkles,
  X,
  Loader2,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { EmergencyCall } from '@/lib/types';

interface StartEmergencyCallProps {
  onCallCreated?: (callId: string) => void;
}

interface TranscriptLine {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  emotions?: Record<string, number>;
}

/** Scripted callers, used when no microphone is available. */
const SCRIPTS: Array<{ id: string; name: string; phone: string; lines: string[] }> = [
  {
    id: 'cardiac',
    name: 'Cardiac arrest — Connaught Place',
    phone: '+91 98102 34512',
    lines: [
      'Please help, my father just collapsed on the living room floor in Connaught Place, New Delhi.',
      'He is clutching his chest and he is not breathing normally.',
      'I cannot feel a pulse. He is completely unresponsive. Tell me what to do.',
    ],
  },
  {
    id: 'fire',
    name: 'Structure fire — Nehru Place',
    phone: '+91 98711 88291',
    lines: [
      'There is heavy black smoke pouring out of the third floor electronics shop at Nehru Place.',
      'People are trapped on the stairway and the fire is spreading.',
      'About fifteen of us are coming down the fire exit now.',
    ],
  },
  {
    id: 'collision',
    name: 'Highway collision — Pitampura',
    phone: '+91 99201 44589',
    lines: [
      'Major accident near Pitampura metro crossing. An SUV flipped over and two cars collided.',
      'Fuel is leaking across the road and one passenger is unconscious inside.',
    ],
  },
  {
    id: 'utility',
    name: 'Water main rupture — Noida (non-emergency)',
    phone: '+91 98450 11982',
    lines: [
      'Hi, there is water gushing onto the sidewalk from a broken municipal main in Sector 62, Noida.',
      'Nobody is hurt at all, it is just flooding the pavement.',
    ],
  },
];

const EMOTION_COLORS: Record<string, string> = {
  panic: '#ef4444',
  fear: '#f97316',
  distress: '#ef4444',
  horror: '#dc2626',
  anxiety: '#f59e0b',
  anger: '#e11d48',
  pain: '#fb7185',
  sadness: '#a855f7',
  calmness: '#38bdf8',
  determination: '#22d3ee',
};

function emotionColor(name: string) {
  return EMOTION_COLORS[name.toLowerCase()] ?? '#38bdf8';
}

/**
 * @description Name the engine that actually graded the call. The operator must
 *              be able to tell a model verdict from a local rule verdict, so
 *              this reads the method the server reported rather than assuming.
 */
function describeTriageMethod(method: string): string {
  if (!method) return 'unknown';
  if (method === 'keyword') return 'keyword rules';
  const [provider, model] = method.split(':');
  if (provider === 'glm') return model || 'GLM';
  if (provider === 'openai') return model || 'OpenAI';
  return method;
}

/**
 * @description Turn a raw socket or getUserMedia failure into something an
 *              operator can act on. A blocked microphone is by far the most
 *              common cause and has a concrete remedy.
 */
function explainVoiceError(reason?: string): string {
  const raw = reason?.trim();
  if (!raw) return 'The voice session could not start. Run a scripted call instead, or try again.';
  if (/permission|denied|notallowed|microphone|audio/i.test(raw)) {
    return 'Microphone access was blocked. Allow the mic for this site in your browser, then try again — or run a scripted call, which needs no microphone.';
  }
  if (/token|auth|401|403/i.test(raw)) {
    return 'Hume rejected the session credentials. Check HUME_API_KEY and HUME_SECRET_KEY on the server.';
  }
  return raw;
}

/** @description Persist a triaged call and tell the dashboard about it. */
function publishCall(call: EmergencyCall) {
  try {
    const stored = localStorage.getItem('kwik_emergency_calls');
    const existing: EmergencyCall[] = stored ? JSON.parse(stored) : [];
    const deduped = existing.filter((c) => c.id !== call.id);
    localStorage.setItem('kwik_emergency_calls', JSON.stringify([call, ...deduped]));
  } catch (error) {
    logger.error('Could not persist call', { error });
  }
  window.dispatchEvent(
    new CustomEvent('kwik-call-updated', { detail: { call, isUpdate: false } })
  );
}

function CallStation({
  onClose,
  onCallCreated,
}: {
  onClose: () => void;
  onCallCreated?: (callId: string) => void;
}) {
  const { connect, disconnect, status, messages, chatMetadata, isMuted, mute, unmute, micFft } =
    useVoice();

  const [phase, setPhase] = useState<'idle' | 'connecting' | 'live' | 'triaging' | 'done' | 'error'>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [phone, setPhone] = useState('+91 98102 34512');
  const [result, setResult] = useState<EmergencyCall | null>(null);
  const [triageMethod, setTriageMethod] = useState<string>('');
  const [scriptId, setScriptId] = useState(SCRIPTS[0].id);
  const [scriptedLines, setScriptedLines] = useState<TranscriptLine[]>([]);
  const startedAt = useRef<number>(0);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  /** Derive the transcript and prosody frames from the live EVI socket. */
  const { lines, frames } = useMemo(() => {
    const out: TranscriptLine[] = [];
    const emotionFrames: Record<string, number>[] = [];

    for (const message of messages) {
      if (message.type === 'user_message') {
        // Interim transcripts get refined; only keep finalized ones.
        if ((message as any).interim) continue;
        const scores = (message as any).models?.prosody?.scores as
          | Record<string, number>
          | undefined;
        if (scores) emotionFrames.push(scores);
        out.push({
          role: 'user',
          text: message.message?.content ?? '',
          timestamp: new Date().toISOString(),
          emotions: scores,
        });
      } else if (message.type === 'assistant_message') {
        out.push({
          role: 'assistant',
          text: message.message?.content ?? '',
          timestamp: new Date().toISOString(),
        });
      }
    }
    return { lines: out.filter((l) => l.text.trim()), frames: emotionFrames };
  }, [messages]);

  // The HUD shows whichever transcript this session produced.
  const displayLines = lines.length ? lines : scriptedLines;

  /** Top five emotions from the most recent measured utterance. */
  const liveEmotions = useMemo(() => {
    const latest = frames[frames.length - 1];
    if (!latest) return [];
    return Object.entries(latest)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emotion, intensity]) => ({ emotion, intensity }));
  }, [frames]);

  useEffect(() => {
    if (phase !== 'live') return;
    const timer = setInterval(() => setDuration(Math.floor((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
  }, [displayLines.length]);

  useEffect(() => {
    if (status.value === 'error') {
      setErrorText(explainVoiceError(status.reason));
      setPhase('error');
    }
  }, [status]);

  const startLiveCall = useCallback(async () => {
    setErrorText(null);
    setPhase('connecting');
    try {
      const res = await fetch('/api/hume/token', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.accessToken) {
        throw new Error(data.error || 'Could not get a Hume access token.');
      }
      await connect({
        auth: { type: 'accessToken', value: data.accessToken },
        configId: data.configId ?? undefined,
      });
      startedAt.current = Date.now();
      setDuration(0);
      setPhase('live');
      logger.info('EVI session connected');
    } catch (error) {
      setErrorText(
        explainVoiceError(error instanceof Error ? error.message : undefined)
      );
      setPhase('error');
    }
  }, [connect]);

  /** Send a transcript to the real triage pipeline and publish the result. */
  const triageAndPublish = useCallback(
    async (payloadLines: TranscriptLine[], emotionFrames: Record<string, number>[], seconds: number) => {
      setPhase('triaging');
      try {
        const res = await fetch('/api/calls/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: phone,
            transcript: payloadLines,
            emotions: emotionFrames,
            chatGroupId: chatMetadata?.chatGroupId,
            conversationId: chatMetadata?.chatId,
            callDurationSeconds: seconds,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.call) throw new Error(data.error || 'Triage failed.');

        publishCall(data.call);
        setResult(data.call);
        setTriageMethod(data.triage_method ?? '');
        setPhase('done');
        onCallCreated?.(data.call.id);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : 'Triage failed.');
        setPhase('error');
      }
    },
    [phone, chatMetadata, onCallCreated]
  );

  const endLiveCall = useCallback(async () => {
    const seconds = Math.floor((Date.now() - startedAt.current) / 1000);
    await disconnect();
    if (lines.length === 0) {
      setErrorText('The call ended before anything was said, so there is nothing to triage.');
      setPhase('error');
      return;
    }
    await triageAndPublish(lines, frames, seconds);
  }, [disconnect, lines, frames, triageAndPublish]);

  /** Run a scripted caller through the same backend triage as a live call. */
  const runScript = useCallback(async () => {
    const script = SCRIPTS.find((s) => s.id === scriptId);
    if (!script) return;
    setPhone(script.phone);
    const scripted: TranscriptLine[] = script.lines.map((text) => ({
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    }));
    setScriptedLines(scripted);
    await triageAndPublish(scripted, [], script.lines.length * 6);
  }, [scriptId, triageAndPublish]);

  const reset = () => {
    setPhase('idle');
    setResult(null);
    setErrorText(null);
    setDuration(0);
    setScriptedLines([]);
  };

  const mmss = `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`;
  const micLevel = micFft.length ? Math.min(1, micFft.reduce((a, b) => a + b, 0) / micFft.length / 40) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live 112 voice station"
      className="fixed inset-0 z-[2500] bg-slate-950/90 backdrop-blur-2xl text-slate-100 flex items-center justify-center p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="w-full max-w-4xl bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 bg-slate-950/80 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
              <Radio className={`w-5 h-5 ${phase === 'live' ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h2 className="font-bold text-white tracking-wide text-base">Hume EVI Live Voice Station</h2>
              <p className="text-xs text-slate-400 font-mono">
                Real-time conversational triage and emotion telemetry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close voice station"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
          {/* Controls */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="caller-number" className="text-xs font-mono uppercase text-slate-400 font-bold">
                Caller number
              </label>
              <input
                id="caller-number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={phase === 'live' || phase === 'triaging'}
                className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-white/10 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            {phase === 'idle' || phase === 'error' ? (
              <>
                <Button
                  onClick={startLiveCall}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold font-mono text-xs py-3 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.35)]"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  START LIVE MIC CALL
                </Button>

                <div className="pt-2 border-t border-white/10 space-y-2">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold block">
                    Or run a scripted caller
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    No microphone needed. The script goes through the same triage pipeline as a live call.
                  </p>
                  <select
                    value={scriptId}
                    onChange={(e) => setScriptId(e.target.value)}
                    aria-label="Scripted caller"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {SCRIPTS.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-950">
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={runScript}
                    variant="outline"
                    className="w-full bg-slate-900 border-white/10 hover:bg-slate-800 text-slate-200 font-mono text-xs py-2.5 rounded-xl"
                  >
                    <Play className="w-3.5 h-3.5 mr-2" />
                    RUN SCRIPTED CALL
                  </Button>
                </div>
              </>
            ) : null}

            {phase === 'connecting' && (
              <div className="flex items-center gap-2 text-xs font-mono text-sky-300 py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                Opening EVI socket and requesting the microphone…
              </div>
            )}

            {phase === 'live' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={endLiveCall}
                    className="flex-1 bg-slate-800 hover:bg-red-600 text-white font-bold font-mono text-xs py-3 rounded-xl border border-red-500/30"
                  >
                    <PhoneOff className="w-4 h-4 mr-2" />
                    END CALL &amp; TRIAGE
                  </Button>
                  <Button
                    onClick={() => (isMuted ? unmute() : mute())}
                    variant="outline"
                    aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                    className="bg-slate-900 border-white/10 hover:bg-slate-800 px-3 py-3 rounded-xl"
                  >
                    {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                  </Button>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-100"
                    style={{ width: `${Math.round(micLevel * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {phase === 'triaging' && (
              <div className="flex items-center gap-2 text-xs font-mono text-sky-300 py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                Running triage over the transcript…
              </div>
            )}

            {errorText && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-200 leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p>{errorText}</p>
                  <button onClick={reset} className="underline font-mono text-[10px]">
                    Try again
                  </button>
                </div>
              </div>
            )}

            {result && (
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 font-mono text-[11px]">TRIAGE COMPLETE</span>
                  <Badge className="bg-slate-800 text-slate-300 font-mono text-[9px]">
                    {describeTriageMethod(triageMethod)}
                  </Badge>
                </div>
                <div className="font-mono text-[11px] space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Priority</span>
                    <span className="text-white font-bold">
                      {result.priority_code} · {result.severity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Score</span>
                    <span className="text-white">{result.severity_score}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Incident</span>
                    <span className="text-white text-right">{result.incident_subtype}</span>
                  </div>
                </div>
                <p className="text-slate-300 leading-relaxed border-t border-white/10 pt-2">{result.ai_summary}</p>
                <Button
                  onClick={onClose}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs py-2 rounded-lg"
                >
                  VIEW ON DISPATCH BOARD
                </Button>
              </div>
            )}
          </div>

          {/* Live HUD */}
          <div className="lg:col-span-7 flex flex-col gap-4 bg-slate-950/80 p-5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${phase === 'live' ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`}
                />
                <span className="font-mono font-bold text-sm uppercase">
                  {phase === 'live' ? `LIVE CALL · ${mmss}` : phase === 'done' ? 'CALL ENDED' : 'READY'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {chatMetadata?.chatGroupId ? `group ${chatMetadata.chatGroupId.slice(0, 8)}` : 'no session'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Hume prosody
                </span>
                <span className={liveEmotions.length ? 'text-emerald-400' : 'text-slate-600'}>
                  {liveEmotions.length ? `${frames.length} measured utterances` : 'awaiting speech'}
                </span>
              </div>

              {liveEmotions.length ? (
                <div className="grid grid-cols-5 gap-2">
                  {liveEmotions.map(({ emotion, intensity }) => (
                    <div key={emotion} className="p-2 rounded-lg bg-slate-900 border border-white/5 text-center space-y-1">
                      <span className="text-[9px] font-mono text-slate-400 block truncate" title={emotion}>
                        {emotion}
                      </span>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.round(intensity * 100)}%`, backgroundColor: emotionColor(emotion) }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-white">
                        {Math.round(intensity * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[58px] rounded-lg bg-slate-900/60 border border-white/5 flex items-center justify-center text-[10px] font-mono text-slate-600">
                  Emotion telemetry appears once the caller speaks
                </div>
              )}
            </div>

            <div
              ref={transcriptRef}
              className="flex-1 min-h-[200px] max-h-[280px] rounded-xl bg-slate-900/70 border border-white/10 p-3 overflow-y-auto space-y-2 text-xs"
            >
              {displayLines.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 font-mono text-[11px] text-center px-4">
                  {phase === 'live'
                    ? 'Connected. Speak into the microphone — the transcript appears here.'
                    : 'Start a live call or run a scripted caller to see the transcript.'}
                </div>
              ) : (
                displayLines.map((line, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${line.role === 'user' ? 'text-amber-300' : 'text-sky-300'}`}
                  >
                    <span className="font-bold font-mono uppercase text-[10px] shrink-0">
                      [{line.role === 'user' ? 'caller' : 'ai'}]
                    </span>
                    <p className="leading-relaxed">{line.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StartEmergencyCall({ onCallCreated }: StartEmergencyCallProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs px-3.5 py-2 rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center gap-2 transition-all hover:scale-105"
      >
        <Phone className="w-4 h-4" />
        <span>START 112 VOICE CALL</span>
      </Button>

      {isOpen && (
        <VoiceProvider>
          <CallStation onClose={() => setIsOpen(false)} onCallCreated={onCallCreated} />
        </VoiceProvider>
      )}
    </>
  );
}
