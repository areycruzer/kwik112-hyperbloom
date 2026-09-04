# Pulse112 - Auditable AI Decision Copilot for Emergency Dispatch

> Pulse112 turns a fragmented multilingual emergency report into an immediately actionable incident card, then safely improves it with AI while a human dispatcher remains in control.

- **Problem:** Dispatchers act on incomplete multilingual reports under time pressure.
- **User:** 112 call-takers and dispatchers.
- **Working loop:** Voice/transcript -> instant local grade -> AI refinement -> human decision -> audit trail.
- **Why AI:** Multilingual extraction, ambiguity detection, summarization, and follow-up questions.
- **Evidence:** Versioned synthetic held-out benchmark, latency measurements, language slices, and failure tests.
- **Safety:** No autonomous dispatch, no AI downgrade below local rules, low-confidence warnings, and explicit provenance.

**Scope:** This is a synthetic-data decision-support prototype. It is not affiliated with or deployed by India's ERSS, and it does not autonomously dispatch responders.

## Run the demo

```bash
npm install
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard), choose **Start emergency call**, select a **Scripted caller**, then choose **Run scripted call**. This path needs no microphone or provider credential.

The application uses these optional environment variables. Set only the providers you intend to use; never commit a `.env` file or a key value.

| Variable | Purpose |
| --- | --- |
| `GLM_API_KEY` | Enables GLM structured triage. |
| `GLM_BASE_URL` | Optional GLM-compatible endpoint override. |
| `GLM_MODEL` | Optional GLM model override. |
| `OPENAI_API_KEY` | Enables OpenAI structured triage when GLM is not configured. |
| `OPENAI_MODEL` | Optional OpenAI model override. |
| `LLM_TIMEOUT_MS` | Model request timeout; local fallback applies on failure. |
| `HUME_API_KEY` | Server-side Hume credential. |
| `HUME_SECRET_KEY` | Server-side Hume credential. |
| `NEXT_PUBLIC_HUME_CONFIG_ID` | Optional Hume EVI configuration identifier. |
| `DEEPGRAM_API_KEY` | Optional Deepgram transcription credential. |
| `LOG_LEVEL` | Server log verbosity. |

## Architecture and safety boundary

```text
Voice / scripted transcript
  -> deterministic local triage (instant)
  -> incident card published to dispatcher
  -> asynchronous LLM structured extraction
  -> schema validation + no-downgrade safety floor
  -> operator confirms / amends / overrides
  -> audit timeline + derived operational alerts
```

Hume prosody is optional supplementary context, not a dispatch decision. It requires configured credentials and microphone access for a live voice session; scripted calls label their prosody as simulated. Browser-local state supports the demo only and is not production persistence. Browser/IP location is an approximation, not carrier location.

## Evidence

All benchmark cases are versioned synthetic data. Run the test suite and evaluations with:

```bash
npm test
npm run evaluate:local
npm run evaluate:held-out
```

### Local held-out benchmark

Command: `npm run evaluate:local`
Benchmark: `1.0.0`; split: `held_out`; cases: `30`; provider: none

| Metric | Measured result |
| --- | ---: |
| Incident type accuracy | 46.7% |
| Severity accuracy | 50.0% |
| Critical recall | 66.7% (6/9) |
| Under-triage | 36.7% (11/30) |
| Over-triage | 13.3% (4/30) |
| Location accuracy | 0.0% (0/25 location cases) |
| Latency p50 | 0.012 ms |
| Latency p95 | 0.690 ms |
| Fallback count | 0 |

| Language | Cases | Type accuracy | Severity accuracy | Critical recall |
| --- | ---: | ---: | ---: | ---: |
| English | 14 | 57.1% | 50.0% | 100.0% |
| Hindi | 6 | 0.0% | 33.3% | 0.0% |
| Hinglish | 10 | 60.0% | 60.0% | 66.7% |

These results are evidence for the deterministic local baseline, including its present weaknesses in Hindi and location extraction; they are not a claim of production performance.

### Hybrid held-out attempt

Command: `npm run evaluate:held-out`
Benchmark: `1.0.0`; split: `held_out`; cases: `30`; provider: none

| Metric | Measured result |
| --- | ---: |
| Incident type accuracy | 46.7% |
| Severity accuracy | 50.0% |
| Critical recall | 66.7% (6/9) |
| Under-triage | 36.7% (11/30) |
| Over-triage | 13.3% (4/30) |
| Location accuracy | 0.0% (0/25 location cases) |
| Latency p50 | 0.042 ms |
| Latency p95 | 0.909 ms |
| Fallback count | 30 |

The hybrid runner completed, but no GLM or OpenAI API key was configured, so all 30 cases used keyword fallback; this is not a model-backed result.

## Failure demonstrations

Run the regression suite with `npm test`. It includes these named demonstrations:

- `hybrid failure falls back to local triage without aborting`
- `hybrid timeout falls back to the local prediction without aborting`
- `model cannot downgrade a locally critical cardiac arrest`
- `prompt injection text cannot suppress an active fire rule`
- `missing location produces an exact-address follow-up without inventing an address`

The local rules run immediately. A model timeout, malformed response, or unavailable provider falls back to that local grade; model output may escalate but cannot downgrade the local safety floor. The dispatcher remains responsible for confirmation, amendment, override, and any external dispatch.

## Prototype status

| Capability | Status |
|---|---|
| Hybrid local + model triage | Implemented; model requires configured API key |
| No-downgrade safety floor | Implemented and regression-tested |
| Human decision timeline | Implemented; browser-local persistence |
| Hume voice/prosody intake | Implemented; credentials and microphone required |
| Scripted calls and benchmark | Synthetic demo/evaluation data |
| Browser/IP location | Approximation; not carrier location |
| Production authentication/database | Not implemented |
| Government ERSS integration | Not implemented |
| Production deployment validation | Not completed |

## License and acknowledgements

MIT licensed. This prototype uses or can be configured with [Next.js](https://nextjs.org/), [Hume](https://www.hume.ai/), [OpenAI](https://openai.com/), [GLM](https://www.bigmodel.cn/), [Deepgram](https://deepgram.com/), and [Leaflet](https://leafletjs.com/).
