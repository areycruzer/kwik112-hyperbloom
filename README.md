# Kwik 112

> Every Indian already knows how to use it: dial 112. Kwik 112 is the multilingual AI call-taker in that call and the auditable dispatch console behind it — the AI may only escalate severity, and a human makes every dispatch decision.

| Held-out local benchmark | Result |
| --- | ---: |
| Critical recall | **100% (9/9)**; Wilson 95% lower bound 0.70 |
| Incident type / severity accuracy | **60% / 60%** |
| Under-triage / over-triage | **23.3% / 16.7%** |
| Location / threat accuracy | **100% (25/25) / 100% (3/3)** |
| Local latency | **p50 ~0.046ms / p95 ~3.80ms** |

**Judge this local build in 120 seconds:** [place a test call (local)](http://localhost:3000/dashboard?startCall=1#voice-station) · [open the console (local)](http://localhost:3000/dashboard) · [reproduce the benchmark](#reproduce-the-evidence) · [inspect raw results](evaluation/results/local-held_out-latest.json)

## Working Build

**One scripted caller can traverse voice intake, instant local grading, asynchronous refinement, and the dispatcher board without provider credentials.** Start the app locally, open [the local call station](http://localhost:3000/dashboard?startCall=1#voice-station), choose Ramesh, John, or Sharma ji, and play the scripted caller. A live Hume EVI session is optional.

The station streams transcript turns, detected language, and MEASURED or SIMULATED prosody provenance. The board shows a rules grade while the call is active; call completion creates an incident immediately and then refines it in place when a model is configured.

## End-to-End Thinking

**Every dispatch passes through three named human checkpoints: INTAKE, DISPATCH, and RESOLUTION.** The operator sees transcript source, triage source, prosody provenance, unit reservation, override notes, and the final audit receipt in the [local dispatch console](http://localhost:3000/dashboard).

```text
112 voice or scripted call
  -> live transcript and language
  -> deterministic local grade
  -> optional structured model refinement (escalate only)
  -> human intake and dispatch decision
  -> unit reservation and resolution audit
```

Pre-arrival guidance is selected deterministically from conservative dispatcher-read cards. The caller is never asked to read, tap, install an app, or leave the call. Guidance follows the safety posture of the [2024 AHA/Red Cross first-aid guidelines](https://www.ahajournals.org/doi/epdf/10.1161/CIR.0000000000001281); dispatcher-assisted CPR has been associated with improved survival versus no bystander CPR in a large cohort ([Rea et al., 2001](https://pubmed.ncbi.nlm.nih.gov/11714643/)).

## Innovation

**The deterministic grade is available before any model response, and model output is prevented from lowering that safety floor.** `lib/triage-local.ts` supplies browser-safe multilingual rules; `lib/triage.ts` wraps the caller transcript as untrusted data, validates structured output, rejects invented facts, and applies the no-downgrade rule.

Optional Hume prosody is supplementary context with explicit provenance, not an autonomous severity signal. A randomized trial found that machine-learning support did not significantly improve dispatcher recognition in its primary comparison, while standalone alerts traded higher sensitivity for lower specificity ([Blomberg et al., 2021](https://pubmed.ncbi.nlm.nih.gov/33404620/)). Kwik 112 therefore exposes evidence to the operator rather than replacing the operator.

## Impact

**The held-out corpus retained all 9 of 9 critical cases as critical.** This is a safety-oriented result on 30 versioned synthetic calls, not evidence of clinical or production performance.

Published US field-triage guidance targets under-triage at 5% or less while accepting 25–35% over-triage ([Newgard et al., 2022](https://pubmed.ncbi.nlm.nih.gov/35475939/)). A systematic review found much wider observed ranges and substantial heterogeneity ([Lupton et al., 2022](https://pubmed.ncbi.nlm.nih.gov/35191799/)). These sources provide context; they are not a direct baseline for this synthetic call corpus.

India's official Emergency Response Support System accepts voice and other channels, with call-taking and computer-aided dispatch roles described by the [Ministry of Home Affairs](https://www.mha.gov.in/en/commoncontent/emergency-response-support-system-erss). Kwik 112 is an independent demonstration and has no connection to that infrastructure.

The multilingual context is grounded in India's official [2011 Census language tables](https://www.censusindia.gov.in/nada/index.php/catalog/42458); the benchmark itself measures only the versioned English, Hindi, and Hinglish cases in this repository.

## Technical Depth

**The committed local run covers 30 held-out calls and reports 60% type accuracy, 60% severity accuracy, 23.3% under-triage, and 16.7% over-triage.** Corpus version: `1.0.0`; split: `held_out`; mode: `local`; provider: `none`.

| Metric | Verified result |
| --- | ---: |
| Critical recall | 100% (9/9), Wilson 95% lower bound 0.70 |
| Incident type accuracy | 60% (18/30) |
| Severity accuracy | 60% (18/30) |
| Under-triage | 23.3% (7/30) |
| Over-triage | 16.7% (5/30) |
| Location accuracy | 100% (25/25 location cases) |
| Threat accuracy | 100% (3/3 threat cases) |
| Local latency | p50 ~0.046ms; p95 ~3.80ms |

The fusion benchmark contains 40 cases: 20 true positives, 20 true negatives, 0 false positives, and 0 false negatives. Its AND gate requires matching incident type, no more than 750m, no more than 10 minutes, and at least one specific shared term. The approach is informed by the spatiotemporal clustering literature ([Birant and Kut, 2007](https://dblp.org/rec/journals/dke/BirantK07.html)), but this implementation is a conservative deterministic gate. Possible matches remain human-review candidates; the UI does not claim they are merged.

### Reproduce the evidence

```bash
npm install
npm test
npm run evaluate:local
npm run evaluate:fusion
npm run build
npm run check:raw-html
```

Fresh triage outputs are written to `evaluation/results/local-held_out-latest.json` and `.md`. Each result records the benchmark version, split, mode, provider, source commit, Node.js runtime, case-level predictions, and latency distribution. Held-out labels were not changed during Round 2 location-cue tuning; benchmark contamination remains a known evaluation risk in language-model work ([Golchin and Surdeanu, TACL 2025](https://aclanthology.org/2025.tacl-1.37/)).

### Scope facts

| Boundary | Current state |
| --- | --- |
| Evaluation | Versioned synthetic corpus; no real caller PII |
| Emergency network | No live 112, ERSS, government, or C-DAC integration |
| Dispatch authority | AI assists; a human records every dispatch decision |
| State | Browser-local demo state; no production database or authentication |
| Voice | Hume EVI is optional; scripted browser speech is labeled SIMULATED |
| Model refinement | GLM is preferred when configured; OpenAI is the fallback provider |
| Failure mode | Missing keys, timeout, malformed output, or provider failure preserves the local grade |
| Emotion data | Hume supplies prosody; OpenAI refinement is not represented as producing emotion scores |

Kwik 112 is not affiliated with ERSS, 112, the Government of India, or C-DAC. It is also distinct from the unrelated Devpost project named Pulse112.

### Codex and OpenAI contribution

The repository history shows Codex-assisted Round 2 implementation and review in small, test-backed commits. The code uses the OpenAI SDK as a provider-neutral client for GLM's OpenAI-compatible endpoint and as the fallback client when `OPENAI_API_KEY` is configured. The provider is asked for a JSON-object response, which then passes application-side shape and provenance validation, an untrusted-transcript boundary, and a deterministic no-downgrade floor. The committed benchmark shown above is local rules-only (`provider: none`), so it is not presented as an OpenAI model result.

The operator checkpoints align with the human-oversight principle in [EU AI Act Article 14](https://eur-lex.europa.eu/eli/reg/2024/1689/2026-07-27/eng). Risk documentation follows the general posture of the [NIST Generative AI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence); neither reference is presented as certification or regulatory compliance.

## Presentation

**The video package is scripted to finish within 120 seconds and puts the caller experience in minute one.** See [the recording script and transcript](docs/kwik-112-round2-video.md) and [WebVTT captions](public/kwik-112-round2.vtt). The hosted video URL is intentionally left pending until upload handoff.

### 120-second transcript

Every Indian already knows how to use it: dial 112.
The caller needs no app or screen.

Kwik 112 asks one short question at a time:
location, immediate danger, what happened, and how many people.

Transcript, language, SIMULATED prosody provenance,
and the current rules grade reach the console during the call.

The local grade is immediate. Optional structured refinement
may escalate severity, but cannot downgrade the deterministic floor.

A human confirms intake, reads conservative guidance,
selects units, and makes every dispatch decision.

Transcript source, prosody provenance, triage engine,
override notes, units, and resolution remain auditable.

Held-out local benchmark: critical recall 100%, 9 of 9;
type and severity 60%; under-triage 23.3%; over-triage 16.7%;
p50 about 0.046ms and p95 about 3.80ms.

Synthetic corpus, no live 112 integration. Codex assisted implementation
and review; the OpenAI SDK supports optional structured refinement.
Human dispatch stays in command.

---

**Evidence summary:** 30 held-out synthetic calls · critical recall **100% (9/9)** · type/severity **60% / 60%** · under/over-triage **23.3% / 16.7%** · location/threat **100% / 100%** · p50/p95 **~0.046ms / ~3.80ms**.

MIT licensed.
