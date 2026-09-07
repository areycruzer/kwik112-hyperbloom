# Kwik 112 submission abstract

Every Indian already knows how to use it: dial 112. Kwik 112 is the multilingual AI call-taker in that call and the auditable dispatch console behind it — the AI may only escalate severity, and a human makes every dispatch decision.

The caller needs no app or screen. A live or scripted Hindi, Hinglish, or English call becomes a streaming transcript with language and prosody provenance. Browser-safe deterministic rules issue an immediate grade; optional structured model refinement can clarify the incident or escalate severity but cannot downgrade the rules floor. The dispatcher then records INTAKE, DISPATCH, and RESOLUTION decisions, with override notes, unit reservations, pre-arrival guidance, and an audit receipt.

On corpus v1.0.0's 30 held-out synthetic calls, local rules retained 9/9 critical cases (100% critical recall; Wilson 95% lower bound 0.70), with 60% incident-type accuracy, 60% severity accuracy, 23.3% under-triage, 16.7% over-triage, 100% location accuracy on 25 location cases, and 100% threat accuracy on 3 threat cases. Local latency was approximately 0.048ms p50 and 3.79ms p95. These measurements describe this small synthetic corpus, not clinical or production performance.

Kwik 112 is an independent browser-based demonstration with browser-local state. It uses no real caller data, has no live 112, ERSS, government, or C-DAC integration, and never autonomously dispatches responders. Hume voice is optional; the committed benchmark is model-free. Codex assisted implementation and review, while the OpenAI SDK supports the optional structured refinement path.
