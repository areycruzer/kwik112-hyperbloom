import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, Headphones, Mic, Timer } from "lucide-react";
import { VOICE_STATION_HREF } from "@/lib/voice-launch";

export const metadata: Metadata = {
  title: "For judges — evaluate Kwik 112 in 120 seconds",
  description:
    "Three one-click paths to evaluate Kwik 112: place a call, open the console, reproduce the benchmark. No login, no credentials, no setup.",
};

const paths = [
  {
    icon: Mic,
    time: "~60 seconds",
    title: "1. Place a 112 call",
    copy: "Opens the voice station. Play a scripted caller (Ramesh — Hinglish accident, John — English heatstroke, or Sharma ji — Hindi cardiac arrest) or start a live call and speak any language. Watch the transcript, emotion telemetry, and instant rules grade appear as the caller speaks.",
    cta: "Place a test call",
    href: VOICE_STATION_HREF,
  },
  {
    icon: ClipboardCheck,
    time: "~2 minutes",
    title: "2. Dispatch like an operator",
    copy: "Open the console. Pick an incident, read the safety audit ('Why this priority?'), run the three human checkpoints (INTAKE → DISPATCH → RESOLUTION), try to override without a written note — it will refuse. Multi-caller fusion flags duplicate calls for human approval.",
    cta: "Open the console",
    href: "/dashboard",
  },
  {
    icon: Timer,
    time: "~3 minutes",
    title: "3. Reproduce the benchmark",
    copy: "Every published number regenerates from the versioned corpus with one command. The held-out results page renders the committed machine-readable output — nothing on it is hand-written.",
    cta: "See the held-out results",
    href: "/benchmark",
  },
];

const realOrMock: [string, string, string][] = [
  ["Live Hume EVI voice sessions", "Real", "Browser WebRTC to Hume EVI 4-mini with your configured call-taker persona; per-utterance prosody scores labelled MEASURED"],
  ["Scripted callers", "Simulated", "Demo personas with synthetic emotion frames, labelled SIMULATED in the UI — never dressed up as measurements"],
  ["Triage engine", "Real", "Deterministic multilingual rules run locally in milliseconds; committed test suite covers the no-downgrade floor and injection cases"],
  ["Model refinement", "Real, optional", "LLM enrichment that may only escalate severity; falls back silently to the local grade on any failure"],
  ["Incidents, units, ETAs", "Synthetic", "A simulated Delhi fleet; ETAs use a simulated road-adjusted travel model and say so in the interface"],
  ["Audit trail", "Session-local", "Human decisions persist in this browser's local storage for the session; it is a demonstration of the audit design, not a production record store"],
];

export default function ForJudgesPage() {
  return (
    <main className="min-h-screen bg-[#f4f5f2] text-[#151817]">
      <section className="bg-[#171717] py-14 text-white">
        <div className="mx-auto max-w-[980px] px-5 md:px-8">
          <p className="text-xs font-semibold uppercase text-[#78dcff]">Reviewer guide</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Evaluate Kwik 112 in 120 seconds</h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-[#e5e9e6]">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#47ff85]" aria-hidden /> No login</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#47ff85]" aria-hidden /> No credentials</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#47ff85]" aria-hidden /> No setup</span>
          </p>
        </div>
      </section>

      <section className="border-b border-[#ccd1cc] bg-white py-12">
        <div className="mx-auto max-w-[980px] px-5 md:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {paths.map(({ icon: Icon, time, title, copy, cta, href }) => (
              <div key={title} className="flex flex-col rounded border border-[#cfd4cf] bg-[#fafbfa] p-6">
                <Icon className="h-6 w-6 text-[#087b91]" aria-hidden />
                <p className="mt-4 font-mono text-xs font-bold text-[#c71920]">{time}</p>
                <h2 className="mt-1 text-lg font-bold">{title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-[#555e59]">{copy}</p>
                <Link href={href} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-[6px] bg-[#087b91] px-4 text-sm font-bold text-white hover:bg-[#06626f]">{cta} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </div>
            ))}
          </div>

          <h2 className="mt-14 text-lg font-bold">What is real, simulated, or synthetic — in one table</h2>
          <p className="mt-2 text-sm text-[#555e59]">Every capability of this build, labelled. The same provenance labels appear inside the product interface.</p>
          <div className="mt-5 overflow-x-auto border border-[#cfd4cf]">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="bg-[#202422] text-white">
                <tr><th className="w-2/5 p-4 text-xs uppercase">Capability</th><th className="w-28 p-4 text-xs uppercase">Status</th><th className="p-4 text-xs uppercase">Detail</th></tr>
              </thead>
              <tbody>
                {realOrMock.map(([capability, status, detail]) => (
                  <tr key={capability} className="border-t border-[#cfd4cf]">
                    <th className="p-4 text-sm font-bold">{capability}</th>
                    <td className="p-4"><span className="rounded border border-[#087b91]/40 bg-[#e8f1f3] px-2 py-0.5 text-xs font-bold text-[#087b91]">{status}</span></td>
                    <td className="p-4 text-sm text-[#555e59]">{detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-14 text-lg font-bold">Boundaries</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#555e59]">
            <li>Kwik 112 is an independent demonstration. It is not an official 112, ERSS, Government of India, or C-DAC service, and it contacts no emergency infrastructure.</li>
            <li>All incident data is synthetic. No real personal data is collected, stored, or transmitted. The AI never dispatches; a human makes every dispatch decision, and overrides require a written note.</li>
            <li>The benchmark is a 30-case versioned synthetic corpus with a held-out split — a safety-oriented engineering measurement, not clinical evidence.</li>
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-[#cfd4cf] bg-white px-4 text-sm font-semibold hover:bg-[#eef0ed]">Back to overview</Link>
            <Link href="/transcript" className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-[#cfd4cf] bg-white px-4 text-sm font-semibold hover:bg-[#eef0ed]"><Headphones className="h-4 w-4" aria-hidden /> Video transcript</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
