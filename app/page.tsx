import Image from "next/image";
import Link from "next/link";
import { ArrowRight, AudioLines, CheckCircle2, ExternalLink, FileCheck2, Gauge, Github, Headphones, ShieldCheck, UserCheck } from "lucide-react";

const identity = "Kwik 112 puts an AI voice call-taker inside India's 112 emergency calls and gives the human dispatcher an instant, auditable decision console.";

const flow = [
  ["01", "Call", "A caller speaks naturally in Hindi, Hinglish, or English."],
  ["02", "Understand", "Live transcript and language cues reach the dispatch desk."],
  ["03", "Grade", "Deterministic rules assign an immediate safety-first priority."],
  ["04", "Refine", "Model review may escalate severity, but can never downgrade it."],
  ["05", "Dispatch", "A human reviews the evidence and makes every dispatch decision."],
  ["06", "Audit", "Sources, overrides, units, and decisions remain in one timeline."],
];

const rubric = [
  ["Working Build", "Place a scripted or live voice call and watch an incident enter the console.", "/dashboard#voice-station"],
  ["End-to-End Thinking", "Follow intake, rules grade, refinement, human dispatch, and resolution.", "/dashboard"],
  ["Innovation", "Inspect measured or simulated prosody alongside multilingual voice intake.", "/dashboard#voice-station"],
  ["Impact", "See conservative pre-arrival guidance and a safety-first severity floor.", "/dashboard"],
  ["Technical Depth", "Reproduce the held-out triage benchmark and fusion gate locally.", "https://github.com/JAYATIAHUJA/pulse112-tactical-cad/tree/main/evaluation/results"],
  ["Presentation", "Use the guided walkthrough built into the operational console.", "/dashboard"],
];

const metrics = [
  ["Critical recall", "100%", "9/9 cases · Wilson 95% lower bound 0.70"],
  ["Type accuracy", "60%", "18/30 held-out calls"],
  ["Severity accuracy", "60%", "18/30 held-out calls"],
  ["Under-triage", "23.3%", "7/30 held-out calls"],
  ["Over-triage", "16.7%", "5/30 held-out calls"],
  ["Threat detection", "100%", "3/3 cases"],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Kwik 112",
  applicationCategory: "Emergency dispatch decision-support software",
  operatingSystem: "Web",
  isAccessibleForFree: true,
  description: "An independent multilingual AI voice call-taker emulator and auditable decision console for human emergency dispatchers.",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f5f2] text-[#151817]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="absolute inset-x-0 top-0 z-20 border-b border-white/20">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-3 font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-white/30 bg-black/30"><AudioLines className="h-4 w-4 text-[#61d6ff]" aria-hidden /></span>
            Kwik 112
          </Link>
          <Link href="/dashboard" className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-white/35 bg-black/40 px-3 text-sm font-semibold text-white hover:bg-black/60">Open console <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
      </header>

      <section className="relative flex min-h-[min(760px,92vh)] items-end overflow-hidden bg-[#171717]">
        <Image src="/screenshots/EmergencyCall.png" alt="Kwik 112 voice call station and emergency dispatch console" fill priority sizes="100vw" className="object-cover object-[62%_center] opacity-45" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-5 pb-16 pt-32 md:px-8 md:pb-20">
          <div className="max-w-[760px]">
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase text-[#78dcff]"><span className="h-2 w-2 rounded-full bg-[#ff4e4e]" />Voice-first emergency intake</p>
            <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">Kwik 112</h1>
            <p className="mt-5 max-w-[720px] text-lg leading-8 text-white sm:text-xl">{identity}</p>
            <p className="mt-4 max-w-[650px] text-sm leading-6 text-white/75 sm:text-base">The caller needs no app or screen. The AI listens on the call; a human remains in command of dispatch.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link id="place-a-call" href="/dashboard#voice-station" className="inline-flex h-11 items-center gap-2 rounded-[6px] bg-[#f40000] px-5 text-sm font-bold text-white hover:bg-[#d90000]"><Headphones className="h-4 w-4" aria-hidden /> Place a test call</Link>
              <Link href="/dashboard" className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-white/40 bg-black/35 px-5 text-sm font-semibold text-white hover:bg-black/55">View dispatch console <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#ccd1cc] bg-white py-16 md:py-20">
        <div className="mx-auto max-w-[1280px] px-5 md:px-8">
          <p className="text-xs font-semibold uppercase text-[#c71920]">Operational flow</p><h2 className="mt-2 text-2xl font-bold md:text-3xl">How a 112 call flows</h2>
          <ol className="mt-10 grid border-l border-t border-[#cfd4cf] sm:grid-cols-2 lg:grid-cols-3">
            {flow.map(([number, title, copy]) => <li key={number} className="min-h-44 border-b border-r border-[#cfd4cf] p-6"><span className="font-mono text-xs font-bold text-[#c71920]">{number}</span><h3 className="mt-6 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#555e59]">{copy}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="border-b border-[#363c39] bg-[#202422] py-16 text-white md:py-20">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-5 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div><p className="text-xs font-semibold uppercase text-[#69d2ff]">Held-out evidence</p><h2 className="mt-2 text-2xl font-bold md:text-3xl">Critical recall: 100%</h2><p className="mt-4 max-w-[480px] text-sm leading-6 text-[#c3cbc7]">Nine of nine critical cases were retained as critical. Results come from corpus v1.0.0, held-out split, using <code className="text-white">npm run evaluate:local</code>.</p><div className="mt-7 flex items-center gap-3 border-l-2 border-[#fabc1f] pl-4 text-sm text-[#e5e9e6]"><Gauge className="h-5 w-5 shrink-0 text-[#fabc1f]" aria-hidden />Local latency: p50 ~0.046ms · p95 ~3.80ms</div></div>
          <dl className="grid border-l border-t border-[#4a514d] sm:grid-cols-2">{metrics.map(([label, value, note]) => <div key={label} className="border-b border-r border-[#4a514d] p-5"><dt className="text-xs font-semibold uppercase text-[#a9b4ae]">{label}</dt><dd className="mt-3 text-2xl font-bold">{value}</dd><dd className="mt-1 text-xs text-[#a9b4ae]">{note}</dd></div>)}</dl>
        </div>
      </section>

      <section className="border-b border-[#ccd1cc] bg-[#e8f1f3] py-16 md:py-20">
        <div className="mx-auto max-w-[980px] px-5 md:px-8"><ShieldCheck className="h-7 w-7 text-[#087b91]" aria-hidden /><h2 className="mt-4 text-2xl font-bold">Safety performance needs context</h2><p className="mt-5 text-base leading-7 text-[#3d4946]">Published US field-triage guidance targets under-triage at 5% or less while accepting 25–35% over-triage. A systematic review observed much wider real-world ranges: 1.6–72% under-triage and 9.9–87.4% over-triage. Kwik 112 reports its 30-case held-out result directly; it does not claim clinical equivalence from a small synthetic corpus.</p><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#08677a]"><a href="https://pubmed.ncbi.nlm.nih.gov/35475939/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">2022 field-triage guideline <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a><a href="https://pubmed.ncbi.nlm.nih.gov/35191799/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">Systematic review <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a></div></div>
      </section>

      <section className="border-b border-[#ccd1cc] bg-white py-16 md:py-20">
        <div className="mx-auto max-w-[1280px] px-5 md:px-8"><div className="flex items-end justify-between gap-6"><div><p className="text-xs font-semibold uppercase text-[#c71920]">Rubric to evidence</p><h2 className="mt-2 text-2xl font-bold md:text-3xl">Inspect the claim in the build</h2></div><FileCheck2 className="hidden h-8 w-8 text-[#087b91] sm:block" aria-hidden /></div><div className="mt-8 overflow-x-auto border border-[#cfd4cf]"><table className="w-full min-w-[720px] border-collapse text-left"><thead className="bg-[#202422] text-white"><tr><th className="w-1/4 p-4 text-xs uppercase">Criterion</th><th className="p-4 text-xs uppercase">Evidence</th><th className="w-32 p-4 text-xs uppercase">Proof</th></tr></thead><tbody>{rubric.map(([criterion, evidence, href]) => <tr key={criterion} className="border-t border-[#cfd4cf]"><th className="p-4 text-sm font-bold">{criterion}</th><td className="p-4 text-sm text-[#555e59]">{evidence}</td><td className="p-4"><Link href={href} className="inline-flex items-center gap-1 text-sm font-bold text-[#087b91] hover:underline">Open <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link></td></tr>)}</tbody></table></div></div>
      </section>

      <section className="bg-[#f4f5f2] py-16 md:py-20"><div className="mx-auto max-w-[980px] px-5 md:px-8"><UserCheck className="h-7 w-7 text-[#c71920]" aria-hidden /><h2 className="mt-4 text-2xl font-bold">What Kwik 112 is, and is not</h2><div className="mt-8 grid border-l border-t border-[#c6cbc6] md:grid-cols-2"><div className="border-b border-r border-[#c6cbc6] p-6"><h3 className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-4 w-4 text-[#087b91]" aria-hidden /> It is</h3><p className="mt-3 text-sm leading-6 text-[#555e59]">An independent browser-based build that demonstrates multilingual AI intake, deterministic triage, model refinement, and human dispatch accountability.</p></div><div className="border-b border-r border-[#c6cbc6] p-6"><h3 className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4 text-[#c71920]" aria-hidden /> It is not</h3><p className="mt-3 text-sm leading-6 text-[#555e59]">An official 112, ERSS, government, or C-DAC service. It does not connect to emergency infrastructure or make dispatch decisions without a human.</p></div></div></div></section>

      <footer className="border-t border-[#363c39] bg-[#171a19] text-white"><div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-8"><div><p className="font-bold">Kwik 112</p><p className="mt-1 text-xs text-[#9faaa4]">Independent AI-assisted emergency dispatch demonstration.</p></div><nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-[#d4dad6]"><Link href="/dashboard#voice-station" className="hover:text-white">Place a test call</Link><Link href="/dashboard" className="hover:text-white">Live console</Link><a href="https://github.com/JAYATIAHUJA/pulse112-tactical-cad" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white"><Github className="h-4 w-4" aria-hidden /> GitHub</a><a href="https://github.com/JAYATIAHUJA/pulse112-tactical-cad/tree/main/evaluation/results" target="_blank" rel="noreferrer" className="hover:text-white">Benchmark results</a></nav></div></footer>
    </main>
  );
}
