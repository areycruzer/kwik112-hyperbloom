import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, AudioLines, Check, ExternalLink, Github, Headphones, ShieldCheck } from "lucide-react";
import { VOICE_STATION_HREF } from "@/lib/voice-launch";
import styles from "./landing.module.css";

export const metadata = {
  title: "KWIK 112 | AI-assisted emergency dispatch simulation",
  description: "Train on multilingual emergency calls with instant triage, live situational awareness, and human-controlled dispatch.",
  alternates: { canonical: "/" },
};

const flow = [
  ["01", "Receive", "A caller speaks naturally in Hindi, Hinglish, or English."],
  ["02", "Understand", "Transcript, location, injuries, and voice cues reach the desk."],
  ["03", "Grade", "Deterministic rules assign an immediate safety-first priority."],
  ["04", "Refine", "Model review may escalate severity, but never downgrade it."],
  ["05", "Dispatch", "A human selects the response and sends units en route."],
  ["06", "Audit", "Evidence, overrides, units, and decisions remain traceable."],
];

const callers = [
  { number: "01", name: "Ramesh", language: "Hinglish", incident: "Motorcycle collision", detail: "A panicked bystander near Moolchand Metro reports two injured riders." },
  { number: "02", name: "Sharma ji", language: "Hindi / Hinglish", incident: "Cardiac arrest", detail: "A distressed family caller reports no breathing and no pulse in Shalimar Bagh." },
  { number: "03", name: "John", language: "English", incident: "Commercial fire", detail: "A market caller reports smoke, trapped people, and collapse risk in Chandni Chowk." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "KWIK 112",
  applicationCategory: "Emergency dispatch decision-support software",
  operatingSystem: "Web",
  isAccessibleForFree: true,
  description: "An independent multilingual AI voice call-taker simulation and auditable decision console for human emergency dispatchers.",
};

export default function Home() {
  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="KWIK 112 home">
          <AudioLines aria-hidden />
          <strong>KWIK 112</strong>
          <span>Synthetic PSAP simulation</span>
        </Link>
        <nav className={styles.nav} aria-label="Primary navigation">
          <a href="#workflow">Workflow</a>
          <a href="#evidence">Evidence</a>
          <Link href="/for-judges">For judges</Link>
        </nav>
        <Link href={VOICE_STATION_HREF} className={styles.headerCta}>Start live demo call <ArrowRight aria-hidden /></Link>
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <Image src="/screenshots/dashboard-command-center.png" alt="KWIK 112 dispatcher console showing a cardiac arrest incident on the Delhi situational map" fill priority sizes="100vw" className={styles.heroImage} />
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <p className={styles.liveLabel}><span /> Live emergency simulation</p>
          <h1 id="hero-title">KWIK 112</h1>
          <p className={styles.heroStatement}>Train under pressure.<br />Dispatch with clarity.</p>
          <p className={styles.heroCopy}>Multilingual voice intake, safety-first triage, and one human-controlled command view.</p>
          <div className={styles.heroActions}>
            <Link id="place-a-call" href={VOICE_STATION_HREF} className={styles.primaryButton}><Headphones aria-hidden /> Start live demo call <ArrowRight aria-hidden /></Link>
            <Link href="/dashboard" className={styles.secondaryButton}>Open dispatch console <ArrowRight aria-hidden /></Link>
          </div>
        </div>
        <a href="#evidence" className={styles.scrollCue} aria-label="Scroll to evidence"><ArrowDown aria-hidden /></a>
      </section>

      <section id="evidence" className={styles.evidence} aria-labelledby="evidence-title">
        <div className={styles.sectionInner}>
          <div className={styles.evidenceIntro}>
            <p className={styles.kicker}>Measured, not implied</p>
            <h2 id="evidence-title">Safety starts before dispatch.</h2>
          </div>
          <dl className={styles.metrics}>
            <div><dt>Critical recall</dt><dd>100%</dd><p>9 of 9 held-out cases</p></div>
            <div><dt>Threat detection</dt><dd>100%</dd><p>3 of 3 held-out cases</p></div>
            <div><dt>Local triage latency</dt><dd>0.048<span> ms</span></dd><p>Median on the benchmark</p></div>
          </dl>
        </div>
      </section>

      <section id="workflow" className={styles.workflow} aria-labelledby="workflow-title">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeading}>
            <div><p className={styles.kicker}>From call to closure</p><h2 id="workflow-title">One operational thread. Six decisions.</h2></div>
            <p>Every stage adds context without taking control away from the dispatcher.</p>
          </div>
          <ol className={styles.flow}>
            {flow.map(([number, title, copy]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></li>)}
          </ol>
        </div>
      </section>

      <section className={styles.callers} aria-labelledby="callers-title">
        <div className={styles.sectionInner}>
          <div className={styles.callersGrid}>
            <div className={styles.callersIntro}>
              <p className={styles.kicker}>Three scripted calls</p>
              <h2 id="callers-title">Hear the pressure. Watch the incident form.</h2>
              <p>Each performance carries a distinct language, emergency, and emotional state through the same live incident pipeline.</p>
              <Link href={VOICE_STATION_HREF} className={styles.textLink}>Open voice station <ArrowRight aria-hidden /></Link>
            </div>
            <div className={styles.callerList}>
              {callers.map((caller) => (
                <Link key={caller.name} href={VOICE_STATION_HREF} className={styles.callerRow}>
                  <span className={styles.callerNumber}>{caller.number}</span>
                  <span className={styles.callerIdentity}><strong>{caller.name}</strong><small>{caller.language}</small></span>
                  <span className={styles.callerIncident}><strong>{caller.incident}</strong><small>{caller.detail}</small></span>
                  <ArrowRight aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.finalSection} aria-labelledby="final-title">
        <div className={styles.sectionInner}>
          <div className={styles.proofGrid}>
            <div className={styles.proofLead}><p className={styles.kicker}>Built for scrutiny</p><h2 id="final-title">Conservative by code. Accountable by design.</h2></div>
            <div className={styles.safetyCopy}><ShieldCheck aria-hidden /><p>Deterministic triage sets a safety floor. Model refinement can escalate a case, never lower its priority. A human makes every dispatch decision.</p></div>
            <ul className={styles.proofList}>
              <li><Check aria-hidden /><span><strong>30</strong> held-out synthetic calls</span></li>
              <li><Check aria-hidden /><span><strong>0</strong> autonomous dispatch decisions</span></li>
              <li><Check aria-hidden /><span><strong>1</strong> auditable incident timeline</span></li>
            </ul>
          </div>
          <div className={styles.finalCta}>
            <div><p className={styles.kicker}>The fastest way to understand it</p><h2>Place the call. See the response.</h2></div>
            <div className={styles.finalActions}>
              <Link href={VOICE_STATION_HREF} className={styles.primaryButton}><Headphones aria-hidden /> Start live demo call <ArrowRight aria-hidden /></Link>
              <Link href="/benchmark" className={styles.darkLink}>View benchmark <ArrowRight aria-hidden /></Link>
            </div>
          </div>
          <p className={styles.disclaimer}>Independent simulation. Not an official 112, ERSS, government, or C-DAC service. It does not connect to emergency infrastructure. <a href="https://pubmed.ncbi.nlm.nih.gov/35475939/" target="_blank" rel="noreferrer">Safety context <ExternalLink aria-hidden /></a></p>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p><strong>KWIK 112</strong><span>Independent AI-assisted emergency dispatch simulation.</span></p>
          <nav aria-label="Footer navigation">
            <Link href="/for-judges">For judges</Link>
            <Link href="/transcript">Transcript</Link>
            <a href="https://github.com/areycruzer/kwik-112" target="_blank" rel="noreferrer"><Github aria-hidden /> GitHub</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
