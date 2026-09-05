'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Headphones, Mic, Play, RotateCcw, ShieldCheck } from 'lucide-react';

import type { EmergencyCall } from '@/lib/types';
import { readTimeline, type TimelineState } from '@/lib/timeline';
import { DEMO_STEPS, demoAuditRows, deriveDemoStep } from '@/lib/demo';
import { Chip } from '@/components/ui/panel';
import { cn } from '@/lib/utils';

type CheckState = 'checking' | 'ready' | 'warning';

export function FiveMinuteDemo({
  call,
  active,
  intakeStarted,
  onActivate,
  onLaunchVoice,
  onOpenWorkflow,
  onReset,
}: {
  call: EmergencyCall | null;
  active: boolean;
  intakeStarted: boolean;
  onActivate: () => void;
  onLaunchVoice: () => void;
  onOpenWorkflow: () => void;
  onReset: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [hume, setHume] = useState<CheckState>('checking');
  const [mic, setMic] = useState<CheckState>('checking');
  const [speakerTested, setSpeakerTested] = useState(false);
  const [timeline, setTimeline] = useState<TimelineState>({ callId: '', records: [] });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void fetch('/api/hume/token', { cache: 'no-store' })
      .then((response) => {
        if (!cancelled) setHume(response.ok ? 'ready' : 'warning');
      })
      .catch(() => {
        if (!cancelled) setHume('warning');
      });
    const permissions = navigator.permissions;
    if (!permissions?.query) {
      setMic('warning');
      return () => { cancelled = true; };
    }
    void permissions.query({ name: 'microphone' as PermissionName })
      .then((result) => !cancelled && setMic(result.state === 'denied' ? 'warning' : 'ready'))
      .catch(() => !cancelled && setMic('warning'));
    return () => { cancelled = true; };
  }, [active]);

  useEffect(() => {
    if (!active || !call) {
      setTimeline({ callId: call?.id ?? '', records: [] });
      return;
    }
    const sync = () => setTimeline(readTimeline(call.id));
    sync();
    const timer = window.setInterval(sync, 750);
    return () => window.clearInterval(timer);
  }, [active, call]);

  const step = deriveDemoStep({ call, records: timeline.records, intakeStarted });
  const stepIndex = DEMO_STEPS.findIndex((item) => item.id === step);
  const auditRows = useMemo(
    () => (call ? demoAuditRows(call, timeline.records) : []),
    [call, timeline.records],
  );

  const testSpeaker = () => {
    window.speechSynthesis?.cancel();
    const utterance = new SpeechSynthesisUtterance('Pulse one one two audio ready. Awaaz clear hai.');
    utterance.lang = 'hi-IN';
    window.speechSynthesis?.speak(utterance);
    setSpeakerTested(true);
  };

  if (!active) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="fixed bottom-16 left-4 z-[900] flex items-center gap-2 rounded-md border border-accent bg-deep px-4 py-3 text-xs font-bold uppercase tracking-wide text-accent-bright shadow-2xl hover:bg-panel-raised sm:bottom-4"
      >
        <Play className="h-4 w-4" aria-hidden />
        Run 5-minute demo
      </button>
    );
  }

  return (
    <aside className="fixed bottom-16 left-4 z-[900] w-[min(430px,calc(100vw-2rem))] overflow-hidden rounded-md border border-accent/60 bg-deep/95 text-ink shadow-2xl backdrop-blur sm:bottom-4">
      <div className="flex items-center justify-between border-b border-rule px-3 py-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />
          <span className="text-sm font-bold">5-minute demo</span>
          <Chip tone="accent">Judge mode</Chip>
        </div>
        <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand demo guide' : 'Collapse demo guide'} className="text-ink-3 hover:text-ink">
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-3 p-3">
          <ol className="grid grid-cols-6 gap-1" aria-label="Demo progress">
            {DEMO_STEPS.map((item, index) => (
              <li key={item.id} className="min-w-0 text-center">
                <div className={cn('mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold', index < stepIndex ? 'border-safe bg-safe/15 text-safe' : index === stepIndex ? 'border-accent bg-accent/20 text-accent-bright' : 'border-rule text-ink-4')}>
                  {index < stepIndex ? <Check className="h-3 w-3" /> : index + 1}
                </div>
                <span className={cn('block truncate text-[9px]', index === stepIndex ? 'text-accent-bright' : 'text-ink-4')}>{item.label}</span>
              </li>
            ))}
          </ol>

          {step === 'preflight' && (
            <div className="space-y-2">
              <p className="text-xs leading-relaxed text-ink-2">Scenario: caller’s father is unresponsive and not breathing at Sample Metro Gate 1.</p>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                <CheckBadge label="Hume" state={hume} />
                <CheckBadge label="Mic" state={mic} />
                <CheckBadge label="Speaker" state={speakerTested ? 'ready' : 'warning'} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={testSpeaker} className="flex items-center justify-center gap-1.5 rounded-[4px] border border-rule-strong px-2 py-2 text-xs text-ink-2 hover:border-accent hover:text-ink"><Headphones className="h-3.5 w-3.5" /> Test speaker</button>
                <button type="button" onClick={onLaunchVoice} className="flex items-center justify-center gap-1.5 rounded-[4px] bg-accent px-2 py-2 text-xs font-bold text-deep hover:bg-accent-bright"><Mic className="h-3.5 w-3.5" /> Start intake</button>
              </div>
              {hume === 'warning' && <p className="text-[10px] text-mild">Hume unavailable — choose the clearly labeled synthetic fallback in the voice station.</p>}
            </div>
          )}

          {step === 'live_call' && <p className="text-xs text-ink-2">Complete the live call, or play the synthetic Hinglish fallback. Ending playback publishes the same real incident workflow.</p>}
          {step === 'ai_triage' && (
            <button type="button" onClick={onOpenWorkflow} className="w-full rounded-[4px] bg-accent px-3 py-2 text-xs font-bold text-deep">Review AI triage &amp; record intake decision</button>
          )}
          {step === 'human_approval' && (
            <button type="button" onClick={onOpenWorkflow} className="w-full rounded-[4px] bg-accent px-3 py-2 text-xs font-bold text-deep">Continue human approval &amp; dispatch</button>
          )}
          {step === 'dispatch' && (
            <button type="button" onClick={onOpenWorkflow} className="w-full rounded-[4px] border border-accent px-3 py-2 text-xs font-bold text-accent-bright">Open timeline to complete audit</button>
          )}
          {step === 'audit' && (
            <div className="space-y-1.5 rounded-[4px] border border-safe/40 bg-safe/5 p-2">
              <p className="text-xs font-bold text-safe">Audit proof complete</p>
              {auditRows.map((row) => <div key={row.label} className="flex gap-2 text-[10px]"><span className="w-24 shrink-0 uppercase tracking-wide text-ink-4">{row.label}</span><span className="text-ink-2">{row.value}</span></div>)}
            </div>
          )}

          <button type="button" onClick={onReset} className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-4 hover:text-ink"><RotateCcw className="h-3 w-3" /> Reset demo guide</button>
        </div>
      )}
    </aside>
  );
}

function CheckBadge({ label, state }: { label: string; state: CheckState }) {
  return <div className={cn('rounded-[4px] border px-2 py-1.5 text-center', state === 'ready' ? 'border-safe/40 text-safe' : state === 'checking' ? 'border-rule text-ink-4' : 'border-mild/40 text-mild')}>{label} · {state}</div>;
}
