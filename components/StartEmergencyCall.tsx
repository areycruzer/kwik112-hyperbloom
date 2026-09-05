/**
 * 112 PULSE — Live Voice Station
 *
 * Opens a real Hume EVI voice session, streams the caller's speech and prosody
 * in real time, then grades the finished conversation. A scripted mode runs the
 * same backend pipeline without a microphone.
 *
 * On call end the flow is optimistic: `POST /api/calls/create` grades with local
 * rules and returns in milliseconds, so a graded incident hits the board at
 * once; `POST /api/calls/refine` then upgrades it in place with the model. The
 * refinement is pure enrichment — if it is slow or fails, the local grade stands
 * and the operator is never interrupted by an error.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VoiceProvider, useVoice } from '@humeai/voice-react';
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
import { Chip, Meter } from '@/components/ui/panel';
import { distressColor } from '@/lib/design/symbols';
import { useDialogFocus } from '@/lib/useDialogFocus';
import { cn } from '@/lib/utils';
import { HINGLISH_DEMO_LINES } from '@/lib/demo';

interface StartEmergencyCallProps {
  onCallCreated?: (callId: string) => void;
  launchSignal?: number;
  initialScriptId?: string;
}

interface TranscriptLine {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  emotions?: Record<string, number>;
}

/**
 * Scripted callers, used when no microphone is available. Each line carries a
 * plausible Hume-style prosody frame (emotion → 0–1 intensity) so the emotion
 * panel animates the way a live call does. These curves are DEMO DATA: they are
 * labelled SIMULATED wherever they surface and the created call is flagged
 * `prosody_source: 'simulated'`, never passed off as a live measurement.
 */
interface ScriptLine {
  role?: 'user' | 'assistant';
  text: string;
  emotions?: Record<string, number>;
}

const SCRIPTS: Array<{ id: string; name: string; phone: string; lines: ScriptLine[] }> = [
  {
    id: 'hinglish-five-minute',
    name: '5-minute demo — Hinglish cardiac arrest',
    phone: '+91 00000 00112',
    lines: HINGLISH_DEMO_LINES.map((line) => ({ ...line })),
  },
  {
    id: 'cardiac',
    name: 'Cardiac arrest — Connaught Place',
    phone: '+91 98102 34512',
    lines: [
      {
        text: 'Please help, my father just collapsed on the living room floor in Connaught Place, New Delhi.',
        emotions: { Panic: 0.94, Distress: 0.89, Fear: 0.91, Anxiety: 0.62 },
      },
      {
        text: 'He is clutching his chest and he is not breathing normally.',
        emotions: { Panic: 0.96, Distress: 0.92, Fear: 0.88, Horror: 0.55 },
      },
      {
        text: 'I cannot feel a pulse. He is completely unresponsive. Tell me what to do.',
        emotions: { Panic: 0.98, Distress: 0.96, Desperation: 0.9, Fear: 0.85 },
      },
    ],
  },
  {
    id: 'fire',
    name: 'Structure fire — Nehru Place',
    phone: '+91 98711 88291',
    lines: [
      {
        text: 'There is heavy black smoke pouring out of the third floor electronics shop at Nehru Place.',
        emotions: { Fear: 0.92, Anxiety: 0.78, Distress: 0.66 },
      },
      {
        text: 'People are trapped on the stairway and the fire is spreading.',
        emotions: { Fear: 0.9, Panic: 0.72, Distress: 0.74 },
      },
      {
        text: 'About fifteen of us are coming down the fire exit now.',
        emotions: { Fear: 0.58, Distress: 0.4, Calmness: 0.35 },
      },
    ],
  },
  {
    id: 'collision',
    name: 'Highway collision — Pitampura',
    phone: '+91 99201 44589',
    lines: [
      {
        text: 'Major accident near Pitampura metro crossing. An SUV flipped over and two cars collided.',
        emotions: { Distress: 0.78, Fear: 0.7, Anxiety: 0.68 },
      },
      {
        text: 'Fuel is leaking across the road and one passenger is unconscious inside.',
        emotions: { Fear: 0.82, Distress: 0.8, Panic: 0.6 },
      },
    ],
  },
  {
    id: 'utility',
    name: 'Water main rupture — Noida (non-emergency)',
    phone: '+91 98450 11982',
    lines: [
      {
        text: 'Hi, there is water gushing onto the sidewalk from a broken municipal main in Sector 62, Noida.',
        emotions: { Calmness: 0.85, Neutral: 0.78, Boredom: 0.2 },
      },
      {
        text: 'Nobody is hurt at all, it is just flooding the pavement.',
        emotions: { Calmness: 0.88, Neutral: 0.8 },
      },
    ],
  },
  {
    id: 'calm-cardiac',
    name: 'Safety demo - calm cardiac arrest',
    phone: '+91 00000 00000',
    lines: [
      { role: 'user', text: 'I am speaking calmly. My father has no pulse and is not breathing.',
        emotions: { Calmness: 0.86, Neutral: 0.71 } },
      { role: 'assistant', text: 'Tell me your exact address or nearest landmark.' },
      { role: 'user', text: 'We are at the public entrance of Sample Metro Gate 1.',
        emotions: { Calmness: 0.78, Anxiety: 0.18 } },
    ],
  },
  {
    id: 'missing-location',
    name: 'Failure demo - location unknown',
    phone: '+91 00000 00000',
    lines: [
      { role: 'user', text: 'There has been a serious crash. One person is unconscious. I do not know this road.',
        emotions: { Distress: 0.72, Fear: 0.61 } },
      { role: 'assistant', text: 'Look for a road sign, shop name, milestone, or nearby landmark.' },
    ],
  },
];

/**
 * @description Name the engine that actually graded the call. The operator must
 *              be able to tell a model verdict from a local-rule verdict, so this
 *              reads the method the server reported rather than assuming. The
 *              keyword path reads as `local rules`; a model path reads as its id.
 */
function describeTriageMethod(method: string): string {
  if (!method) return 'unknown';
  if (method === 'keyword') return 'local rules';
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

/**
 * @description Persist a triaged call and tell the dashboard about it.
 *
 * A create (`isUpdate: false`) writes the call wholesale. A model refinement
 * (`isUpdate: true`) arrives 10–25s later and MUST NOT clobber operator-owned
 * lifecycle state: by then the operator may have dragged the incident to a later
 * pipeline stage (persisting a new `status`), and the original `created_at`
 * anchors incident age and the two age-based alert rules. So an update merges —
 * operator-owned fields are taken from the stored record and only triage-derived
 * fields come from the refined call. The `kwik-call-updated` event carries the
 * real `isUpdate` flag so the dashboard does not steal the operator's selection.
 */
function publishCall(
  call: EmergencyCall,
  { isUpdate }: { isUpdate: boolean } = { isUpdate: false },
) {
  let record = call;
  try {
    const stored = localStorage.getItem('kwik_emergency_calls');
    const existing: EmergencyCall[] = stored ? JSON.parse(stored) : [];
    const prior = existing.find((c) => c.id === call.id);

    if (isUpdate && prior) {
      // Overwrite only triage-derived fields; preserve everything the operator
      // or the board owns — pipeline status, the original age anchor, and any
      // dispatch bookkeeping.
      record = {
        ...call,
        status: prior.status,
        created_at: prior.created_at,
        dispatched_units: prior.dispatched_units ?? call.dispatched_units,
        dispatch_time: prior.dispatch_time ?? call.dispatch_time,
        dispatcher_id: prior.dispatcher_id ?? call.dispatcher_id,
        resolved_at: prior.resolved_at ?? call.resolved_at,
      };
    }

    const deduped = existing.filter((c) => c.id !== call.id);
    localStorage.setItem('kwik_emergency_calls', JSON.stringify([record, ...deduped]));
  } catch (error) {
    logger.error('Could not persist call', { error });
  }
  window.dispatchEvent(
    new CustomEvent('kwik-call-updated', { detail: { call: record, isUpdate } }),
  );
}

function CallStation({
  onClose,
  onCallCreated,
  initialScriptId,
}: {
  onClose: () => void;
  onCallCreated?: (callId: string) => void;
  initialScriptId?: string;
}) {
  const { connect, disconnect, status, messages, chatMetadata, isMuted, mute, unmute, micFft } =
    useVoice();

  const [phase, setPhase] = useState<
    'idle' | 'connecting' | 'live' | 'scripted' | 'triaging' | 'done' | 'error'
  >('idle');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [phone, setPhone] = useState('+91 98102 34512');
  const [result, setResult] = useState<EmergencyCall | null>(null);
  const [triageMethod, setTriageMethod] = useState<string>('');
  const [refining, setRefining] = useState(false);
  const [changed, setChanged] = useState<string[]>([]);
  const [scriptId, setScriptId] = useState(initialScriptId ?? SCRIPTS[0].id);
  const [scriptedLines, setScriptedLines] = useState<TranscriptLine[]>([]);
  // Prosody frames revealed by the scripted timer, so the emotion panel animates
  // during a demo the way it does off the live socket.
  const [scriptedFrames, setScriptedFrames] = useState<Record<string, number>[]>([]);
  // Which kind of session produced the readings on screen. Drives the MEASURED
  // vs SIMULATED labelling of the emotion panel — the two must never be confused.
  const [sessionKind, setSessionKind] = useState<'live' | 'scripted' | null>(null);
  const startedAt = useRef<number>(0);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  // Outstanding scripted-playback timers, cleared on unmount / close / restart so
  // a demo left mid-playback cannot fire into an unmounted component.
  const scriptTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearScriptTimers = useCallback(() => {
    scriptTimersRef.current.forEach((t) => clearTimeout(t));
    scriptTimersRef.current = [];
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  // Belt-and-braces: clear any pending scripted timers when the station unmounts
  // (the dialog is unmounted on close, so this covers close too).
  useEffect(() => clearScriptTimers, [clearScriptTimers]);

  /** Derive the transcript, prosody frames, and detected language from the live
   *  EVI socket. Hume tags each finalized user message with the language it heard
   *  ("Detected language of the message text"); the call's language is the value
   *  seen most often across those messages. */
  const { lines, frames, detectedLanguage } = useMemo(() => {
    const out: TranscriptLine[] = [];
    const emotionFrames: Record<string, number>[] = [];
    const languageCounts: Record<string, number> = {};

    for (const message of messages) {
      if (message.type === 'user_message') {
        // Interim transcripts get refined; only keep finalized ones.
        if ((message as any).interim) continue;
        const scores = (message as any).models?.prosody?.scores as
          | Record<string, number>
          | undefined;
        if (scores) emotionFrames.push(scores);
        const lang = (message as any).language;
        if (typeof lang === 'string' && lang.trim()) {
          const key = lang.trim();
          languageCounts[key] = (languageCounts[key] ?? 0) + 1;
        }
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

    // The most frequently detected non-empty language across the call. Undefined
    // when EVI reported none — never invented.
    let language: string | undefined;
    let bestCount = 0;
    for (const [lang, count] of Object.entries(languageCounts)) {
      if (count > bestCount) {
        bestCount = count;
        language = lang;
      }
    }

    return {
      lines: out.filter((l) => l.text.trim()),
      frames: emotionFrames,
      detectedLanguage: language,
    };
  }, [messages]);

  // The HUD shows whichever transcript this session produced.
  const displayLines = lines.length ? lines : scriptedLines;

  // Live socket frames win; otherwise fall back to the scripted demo frames.
  const activeFrames = frames.length ? frames : scriptedFrames;

  /** Top five emotions from the most recent utterance (live or scripted). */
  const liveEmotions = useMemo(() => {
    const latest = activeFrames[activeFrames.length - 1];
    if (!latest) return [];
    return Object.entries(latest)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([emotion, intensity]) => ({ emotion, intensity }));
  }, [activeFrames]);

  useEffect(() => {
    if (phase !== 'live' && phase !== 'scripted') return;
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

  // Initial focus into the dialog, a Tab trap, Escape-to-close, and focus
  // restored to the trigger on close — the same behaviour IncidentTimeline uses,
  // from the one shared hook so the two dialogs cannot diverge.
  const { dialogRef, onKeyDown } = useDialogFocus(true, onClose);

  const startLiveCall = useCallback(async () => {
    setErrorText(null);
    clearScriptTimers();
    setScriptedLines([]);
    setScriptedFrames([]);
    setSessionKind('live');
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
  }, [connect, clearScriptTimers]);

  /**
   * Optimistic triage. Local rules grade the call and it appears on the board at
   * once; the model then refines it in place. Refinement failure is silent by
   * design — the local grade is a valid, life-safe grade on its own.
   */
  const triageAndPublish = useCallback(
    async (
      callerNumber: string,
      payloadLines: TranscriptLine[],
      emotionFrames: Record<string, number>[],
      seconds: number,
      prosodySource: 'measured' | 'simulated',
      // The language Hume detected in the caller's speech. Undefined on scripted
      // demos — a scripted call detected nothing, so it carries no language.
      detectedLanguage?: string
    ) => {
      setPhase('triaging');
      setChanged([]);
      setRefining(false);

      // 1. Local grade, returns in milliseconds.
      let created: any;
      try {
        const res = await fetch('/api/calls/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: callerNumber,
            transcript: payloadLines,
            emotions: emotionFrames,
            prosodySource,
            detectedLanguage,
            chatGroupId: chatMetadata?.chatGroupId,
            conversationId: chatMetadata?.chatId,
            callDurationSeconds: seconds,
          }),
        });
        created = await res.json();
        if (!res.ok || !created.call) throw new Error(created.error || 'Triage failed.');
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : 'Triage failed.');
        setPhase('error');
        return;
      }

      publishCall(created.call);
      setResult(created.call);
      setTriageMethod(created.triage_method ?? created.call.triage_method ?? '');
      setPhase('done');
      onCallCreated?.(created.call.id);

      // 2. Enrich in the background. Failure is silent by design.
      if (created.refinable) {
        setRefining(true);
        try {
          const res = await fetch('/api/calls/refine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callId: created.call.id,
              phoneNumber: callerNumber,
              transcript: payloadLines,
              emotions: emotionFrames,
              prosodySource,
              detectedLanguage,
              chatGroupId: chatMetadata?.chatGroupId,
              conversationId: chatMetadata?.chatId,
              callDurationSeconds: seconds,
            }),
          });
          const refined = await res.json();
          if (res.ok && refined?.call) {
            publishCall(refined.call, { isUpdate: true }); // republish; merge over the stored record
            setResult(refined.call);
            setTriageMethod(refined.triage_method ?? refined.call.triage_method ?? '');
            setChanged(Array.isArray(refined.changed) ? refined.changed : []);
          }
        } catch {
          // Local grade stands. No modal, no error state.
        } finally {
          setRefining(false);
        }
      }
    },
    [chatMetadata, onCallCreated]
  );

  const endLiveCall = useCallback(async () => {
    const seconds = Math.floor((Date.now() - startedAt.current) / 1000);
    await disconnect();
    if (lines.length === 0) {
      setErrorText('The call ended before anything was said, so there is nothing to triage.');
      setPhase('error');
      return;
    }
    await triageAndPublish(phone, lines, frames, seconds, 'measured', detectedLanguage);
  }, [disconnect, lines, frames, detectedLanguage, phone, triageAndPublish]);

  /**
   * Run a scripted caller through the same backend triage as a live call, but
   * reveal the transcript and its prosody one line at a time on a timer so the
   * emotion panel ANIMATES during playback instead of everything landing at once.
   * The frames are clearly labelled SIMULATED and the created call is flagged
   * `prosody_source: 'simulated'` — never dressed up as a live measurement.
   */
  const SCRIPT_STEP_MS = 2500;
  const runScript = useCallback(() => {
    const script = SCRIPTS.find((s) => s.id === scriptId);
    if (!script) return;

    clearScriptTimers();
    setPhone(script.phone);
    setErrorText(null);
    setResult(null);
    setChanged([]);
    setScriptedLines([]);
    setScriptedFrames([]);
    setSessionKind('scripted');
    startedAt.current = Date.now();
    setDuration(0);
    setPhase('scripted');

    const built: TranscriptLine[] = script.lines.map((line) => ({
      role: line.role ?? 'user',
      text: line.text,
      timestamp: new Date().toISOString(),
      emotions: line.emotions,
    }));
    // Accumulated as the timer fires, so the payload handed to triage matches
    // exactly what the panel showed.
    const collectedFrames: Record<string, number>[] = [];

    built.forEach((line, index) => {
      const timer = setTimeout(() => {
        setScriptedLines((prev) => [...prev, line]);
        if (
          script.id === 'hinglish-five-minute' &&
          typeof window !== 'undefined' &&
          'speechSynthesis' in window
        ) {
          const utterance = new SpeechSynthesisUtterance(line.text);
          utterance.lang = 'hi-IN';
          utterance.rate = line.role === 'assistant' ? 0.92 : 1.02;
          utterance.pitch = line.role === 'assistant' ? 0.92 : 1.08;
          window.speechSynthesis.speak(utterance);
        }
        if (line.emotions) {
          collectedFrames.push(line.emotions);
          setScriptedFrames((prev) => [...prev, line.emotions as Record<string, number>]);
        }
      }, index * SCRIPT_STEP_MS);
      scriptTimersRef.current.push(timer);
    });

    // Once the last line has played, grade the call through the same pipeline a
    // live call uses.
    const finishTimer = setTimeout(() => {
      const seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      void triageAndPublish(script.phone, built, collectedFrames, seconds, 'simulated');
    }, built.length * SCRIPT_STEP_MS);
    scriptTimersRef.current.push(finishTimer);
  }, [scriptId, triageAndPublish, clearScriptTimers]);

  const reset = () => {
    clearScriptTimers();
    setPhase('idle');
    setResult(null);
    setErrorText(null);
    setDuration(0);
    setScriptedLines([]);
    setScriptedFrames([]);
    setSessionKind(null);
    setChanged([]);
    setRefining(false);
  };

  const mmss = `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`;
  const micLevel = micFft.length ? Math.min(1, micFft.reduce((a, b) => a + b, 0) / micFft.length / 40) : 0;
  const didChange = (field: string) => changed.includes(field);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="112 Pulse voice station"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[2500] flex items-center justify-center bg-deep/80 p-4 text-ink outline-none"
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-md border border-rule-strong bg-panel">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-rule-strong bg-deep px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-critical/30 bg-critical/15 p-2 text-critical">
              <Radio className={cn('h-5 w-5', phase === 'live' && 'animate-pulse')} />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-md font-bold tracking-wide text-ink">112 PULSE</h2>
                <Chip tone="critical" dot>
                  Voice station
                </Chip>
              </div>
              <p className="text-xs text-ink-3">Real-time conversational triage and emotion telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close voice station"
            className="rounded-md p-1.5 text-ink-3 hover:bg-panel-raised hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-12">
          {/* Controls */}
          <div className="space-y-4 lg:col-span-5">
            <div className="space-y-1.5">
              <label htmlFor="caller-number" className="label">
                Caller number
              </label>
              <input
                id="caller-number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={phase === 'live' || phase === 'scripted' || phase === 'triaging'}
                className="w-full rounded-md border border-rule-strong bg-deep px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-50"
              />
            </div>

            {phase === 'idle' || phase === 'error' ? (
              <>
                <button
                  onClick={startLiveCall}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-critical px-3 py-3 text-xs font-bold uppercase tracking-wide text-ink hover:bg-critical-bright"
                >
                  <Phone className="h-4 w-4" />
                  Start live mic call
                </button>

                <div className="space-y-2 border-t border-rule pt-3">
                  <span className="label block">Or run the audible fallback</span>
                  <p className="text-xs leading-relaxed text-ink-4">
                    No microphone needed. Synthetic speech goes through the same triage pipeline as a live call.
                  </p>
                  <select
                    value={scriptId}
                    onChange={(e) => setScriptId(e.target.value)}
                    aria-label="Scripted caller"
                    className="w-full rounded-md border border-rule-strong bg-deep px-3 py-2 text-sm text-ink-2 focus:border-accent focus:outline-none"
                  >
                    {SCRIPTS.map((s) => (
                      <option key={s.id} value={s.id} className="bg-deep">
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={runScript}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-rule-strong bg-panel-raised px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-ink-2 hover:text-ink"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Play synthetic fallback
                  </button>
                </div>
              </>
            ) : null}

            {phase === 'connecting' && (
              <div className="flex items-center gap-2 py-3 text-xs text-accent">
                <Loader2 className="h-4 w-4 animate-spin" />
                Opening EVI socket and requesting the microphone…
              </div>
            )}

            {phase === 'live' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={endLiveCall}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md border border-critical/30 bg-panel-raised px-3 py-3 text-xs font-bold uppercase tracking-wide text-ink hover:bg-critical"
                  >
                    <PhoneOff className="h-4 w-4" />
                    End call &amp; triage
                  </button>
                  <button
                    onClick={() => (isMuted ? unmute() : mute())}
                    aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                    className="rounded-md border border-rule-strong bg-panel-raised px-3 py-3 hover:bg-panel"
                  >
                    {isMuted ? <MicOff className="h-4 w-4 text-critical" /> : <Mic className="h-4 w-4 text-safe" />}
                  </button>
                </div>
                <Meter value={micLevel * 100} max={100} color="var(--safe)" />
              </div>
            )}

            {phase === 'scripted' && (
              <div className="flex items-center gap-2 rounded-md border border-mild/30 bg-mild/15 px-3 py-3 text-xs font-medium text-mild">
                <Loader2 className="h-4 w-4 animate-spin" />
                Playing simulated caller — emotion values are demo data, not measured.
              </div>
            )}

            {phase === 'triaging' && (
              <div className="flex items-center gap-2 py-3 text-xs text-accent">
                <Loader2 className="h-4 w-4 animate-spin" />
                Grading the transcript…
              </div>
            )}

            {errorText && (
              <div className="flex items-start gap-2 rounded-md border border-critical/30 bg-critical/15 p-3 text-xs leading-relaxed text-critical-soft">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  <p>{errorText}</p>
                  <button onClick={reset} className="text-2xs underline">
                    Try again
                  </button>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-2 rounded-md border border-rule-strong bg-deep p-3.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-safe">Triage complete</span>
                  <div className="flex items-center gap-1.5">
                    {refining && (
                      <Chip tone="accent" dot>
                        Refining
                      </Chip>
                    )}
                    <Chip tone="neutral">{describeTriageMethod(triageMethod)}</Chip>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-ink-2">
                  <div className={cn('flex justify-between py-0.5', didChange('severity') && 'refine-flash')}>
                    <span className="text-ink-4">Priority</span>
                    <span className="font-bold text-ink">
                      {result.priority_code} · {result.severity}
                    </span>
                  </div>
                  <div className={cn('flex justify-between py-0.5', didChange('severity_score') && 'refine-flash')}>
                    <span className="text-ink-4">Score</span>
                    <span className="tnum text-ink">{result.severity_score}/100</span>
                  </div>
                  <div className={cn('flex justify-between py-0.5', didChange('incident_subtype') && 'refine-flash')}>
                    <span className="text-ink-4">Incident</span>
                    <span className="text-right text-ink">{result.incident_subtype}</span>
                  </div>
                  <div className={cn('flex justify-between gap-3 py-0.5', didChange('caller_location.address') && 'refine-flash')}>
                    <span className="text-ink-4">Location</span>
                    <span className="text-right text-ink">{result.caller_location?.address}</span>
                  </div>
                </div>
                <p
                  className={cn(
                    'border-t border-rule pt-2 leading-relaxed text-ink-2',
                    didChange('ai_summary') && 'refine-flash'
                  )}
                >
                  {result.ai_summary}
                </p>
                <button
                  onClick={onClose}
                  className="w-full rounded-md bg-accent px-3 py-2 text-xs font-medium uppercase tracking-wide text-deep hover:bg-accent-bright"
                >
                  View on dispatch board
                </button>
              </div>
            )}
          </div>

          {/* Live HUD */}
          <div className="flex flex-col gap-4 rounded-md border border-rule-strong bg-deep p-5 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'h-3 w-3 rounded-full',
                    phase === 'live'
                      ? 'animate-ping bg-critical'
                      : phase === 'scripted'
                      ? 'animate-ping bg-mild'
                      : 'bg-ink-4',
                  )}
                />
                <span className="text-sm font-bold uppercase tracking-wide text-ink">
                  {phase === 'live'
                    ? `Live call · ${mmss}`
                    : phase === 'scripted'
                    ? `Simulated call · ${mmss}`
                    : phase === 'done'
                    ? 'Call ended'
                    : 'Ready'}
                </span>
              </div>
              <span className="text-2xs text-ink-4">
                {chatMetadata?.chatGroupId ? `group ${chatMetadata.chatGroupId.slice(0, 8)}` : 'no session'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-ink-3">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  Emotion telemetry
                </span>
                {/* MEASURED vs SIMULATED — two visually distinct states so a
                    scripted curve is never mistaken for a real Hume reading. */}
                {sessionKind === 'scripted' ? (
                  <Chip tone="mild" dot>
                    Simulated · demo values
                  </Chip>
                ) : sessionKind === 'live' ? (
                  <Chip tone="safe" dot>
                    Measured · live Hume EVI
                  </Chip>
                ) : (
                  <span className="text-ink-4">no source yet</span>
                )}
              </div>

              {liveEmotions.length ? (
                <div className="grid grid-cols-5 gap-2">
                  {liveEmotions.map(({ emotion, intensity }) => (
                    <div
                      key={emotion}
                      className="space-y-1 rounded-md border border-rule bg-panel p-2 text-center"
                    >
                      <span className="block truncate text-2xs text-ink-3" title={emotion}>
                        {emotion}
                      </span>
                      <Meter value={intensity * 100} max={100} color={distressColor(intensity * 100)} />
                      <span className="tnum text-2xs font-bold text-ink">{Math.round(intensity * 100)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[58px] items-center justify-center rounded-md border border-rule bg-panel text-2xs text-ink-4">
                  Emotion telemetry appears once the caller speaks
                </div>
              )}
            </div>

            <div
              ref={transcriptRef}
              className="max-h-[280px] min-h-[200px] flex-1 space-y-2 overflow-y-auto rounded-md border border-rule bg-panel p-3 text-sm"
            >
              {displayLines.length === 0 ? (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-ink-4">
                  {phase === 'live'
                    ? 'Connected. Speak into the microphone — the transcript appears here.'
                    : 'Start a live call or run a scripted caller to see the transcript.'}
                </div>
              ) : (
                displayLines.map((line, i) => (
                  <div
                    key={i}
                    className={cn('flex gap-2', line.role === 'user' ? 'text-mild' : 'text-accent')}
                  >
                    <span className="shrink-0 text-2xs font-bold uppercase">
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

export default function StartEmergencyCall({
  onCallCreated,
  launchSignal = 0,
  initialScriptId,
}: StartEmergencyCallProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (launchSignal > 0) setIsOpen(true);
  }, [launchSignal]);

  return (
    <>
      <button
        type="button"
        aria-label="Start 112 voice call"
        onClick={() => setIsOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-md bg-critical px-2.5 py-2 text-xs font-bold uppercase tracking-wide text-ink transition-transform hover:scale-105 hover:bg-critical-bright lg:gap-2 lg:px-3.5"
      >
        <Phone className="h-4 w-4 shrink-0" aria-hidden />
        <span className="lg:hidden">112 call</span>
        <span className="hidden lg:inline">Start 112 voice call</span>
      </button>

      {isOpen && (
        <VoiceProvider>
          <CallStation
            onClose={() => setIsOpen(false)}
            onCallCreated={onCallCreated}
            initialScriptId={initialScriptId}
          />
        </VoiceProvider>
      )}
    </>
  );
}
