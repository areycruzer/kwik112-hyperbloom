# Dispatch AI — UI revamp and 112 Pulse feature layer

Date: 2026-08-29
Status: approved for planning

## 1. Goal

Replace the current dispatch console's visual system and information architecture,
and change one behaviour: triage must stop blocking on the model.

The existing UI reads as a game HUD — neon glow, stacked backdrop blur, ad-hoc
type sizes from `text-[9px]` to `text-lg`, six competing accent hues, and
aggressive truncation of the exact content an operator needs. It is also
structurally flat: one screen with modals bolted on.

## 2. Product framing

**Dispatch AI** is the core CAD platform: incident monitoring, dispatch,
pathfinding, call history, forecasting, alerting.

**112 Pulse** is a feature layer on top of it: emotion-aware voice intake for
India's 112 service. It opens a Hume EVI session, reads caller distress from
prosody, and feeds that signal into triage and into the operator's view.

This framing is load-bearing for the design. "Pulse" is the caller's emotional
vital sign, so distress is presented as a first-class signal across the platform
rather than a panel. Branding: `DISPATCH AI` is the product; `112 PULSE` badges
the intake module specifically.

### 2.1 Honesty consequence

Only calls captured through 112 Pulse carry prosody. Mock and legacy calls show
`—` for distress. That contrast is the demonstration of what the feature adds and
must not be smoothed over by inventing values, which is what the current build
does (a hardcoded 92/86/78/45 on every incident regardless of source).

## 3. Design system

Derived from NATO Joint Military Symbology and STANAG 2019 colour conventions,
which is what the reference project used and what suits government dispatch.

### 3.1 Colour

Surfaces:

| Token | Value | Use |
|---|---|---|
| `--ground` | `#0E1116` | Page background |
| `--panel` | `#161A21` | Panel background |
| `--panel-raised` | `#1C222B` | Nested/selected panel |
| `--rule` | `#2A3038` | Hairline divider |
| `--rule-strong` | `#3A424E` | Panel border, focus ring base |
| `--ink` | `#E4E8ED` | Primary text |
| `--ink-2` | `#9AA5B1` | Secondary text |
| `--ink-3` | `#6B7684` | Labels, metadata |

Affiliation (STANAG 2019):

| Token | Value | Meaning |
|---|---|---|
| `--aff-friendly` | `#4A90B8` | Own responder units |
| `--aff-hostile` | `#C4342B` | Threat / active emergency |
| `--aff-neutral` | `#5E9C6B` | Resolved / no threat |
| `--aff-unknown` | `#D0A81E` | Pending classification |

Severity signal:

| Token | Value | Priority |
|---|---|---|
| `--sev-p1` | `#C4342B` | Critical |
| `--sev-p2` | `#D08C1E` | High |
| `--sev-p3` | `#C9B458` | Medium |
| `--sev-p4` | `#6B8E6B` | Low |

Interactive accent: `--accent` `#3E7C8C`.

Distress ramp (112 Pulse): interpolate `#4A90B8` (calm) → `#D0A81E` → `#C4342B`
(peak distress) across 0–100.

### 3.2 Typography

- UI: IBM Plex Sans. Data, labels, identifiers: IBM Plex Mono. Both via Google
  Fonts, with explicit fallback stacks.
- Six-step scale only: 10, 11, 12, 14, 16, 20, 28px. No arbitrary sizes.
- `font-variant-numeric: tabular-nums` on every figure that appears in a column
  or updates in place (counts, scores, timers, coordinates).
- Uppercase mono labels carry `0.08em` letter-spacing.

### 3.3 Surface rules

- Border radius: 2px maximum. Panels are square.
- Dividers and borders: 1px, `--rule`.
- **No `box-shadow` glow.** Every `shadow-[0_0_Npx_rgba(...)]` is removed.
- **No `backdrop-filter`.** Every `backdrop-blur-*` is removed.
- Spacing on a strict 4px grid.
- Focus: 2px `--accent` outline, 2px offset. Visible on every interactive element.

## 4. Symbology

A pure function `buildSymbol(spec): string` in `lib/design/symbols.ts` returns an
escaped inline SVG string. The same function feeds React components and Leaflet
`divIcon`, so an incident renders identically in the queue, on the map, and on a
Kanban card.

Simplified MIL-STD-2525:

- **Frame shape encodes entity kind.** Incident: diamond (2525 threat frame).
  Unit: rectangle (2525 friendly frame).
- **Frame stroke encodes state.** Incident: severity colour. Unit: affiliation
  colour by service (police/fire/EMS).
- **Fill** is the same hue at 18% alpha.
- **Inner glyph encodes type.** Incidents: fire, medical, crime, traffic,
  utility, unknown. Units: police, fire, ems.
- **Distress ring.** When a call carries 112 Pulse prosody, an arc is drawn
  around the incident frame, swept 0–100% of the circumference and coloured from
  the distress ramp. Absent entirely when there is no prosody — not drawn at zero,
  so absence is visually distinct from calm.

All text interpolated into the SVG string is escaped via the existing
`escapeHtml`. This is the sink that previously executed injected markup.

## 5. Information architecture

### 5.1 Module rail

A fixed left rail replaces the buttons crowded into today's header. Modules:
Monitoring, Alerts, History, Forecast. Each is an icon plus a mono label, with
the active one marked by a 2px left border in `--accent`. Alerts shows an
unacknowledged count.

**112 Pulse is not a rail module.** It is an action — opening a live call — so it
sits in the command bar as the primary control, badged `112 PULSE`, and opens the
voice station over whichever module is active. The rail holds places you go; the
command bar holds things you do.

### 5.2 Three-tier layout

Applies to the Monitoring module, following the reference's top-down reading
order: high-level status, then detail, then operational control.

```
COMMAND BAR   DISPATCH AI · station · clock · 112 Pulse health
TIER 1 STATUS queue depth · P1 count · unassigned · oldest incident · triage source
TIER 2 OPS    [ incident queue ] [ situation map ] [ incident detail ]
TIER 3 UNITS  responder roster — callsign, service, status, assignment, distance
```

Tier 3 is new. Responder units currently exist only inside `EmergencyMap` as
component state; the roster surfaces them as the platform's resource-control
layer.

Existing view modes (Radar / Kanban / Split) are retained and rearrange Tier 2:

- **Radar** — queue, map, detail as drawn above.
- **Kanban** — the five-stage board occupies the full width of Tier 2; queue and
  detail collapse, since the board already carries both.
- **Split** — board and map share Tier 2 half and half; detail collapses.

Tiers 1 and 3 and the module rail are constant across all three.

## 6. Modules

### 6.1 Monitoring

The three-tier layout above. Incident queue rows carry: severity chip, symbol,
incident type, full AI summary, address, age, distress bar (or `—`), and triage
source.

### 6.2 Alerts

Alerts are **derived from call state by a pure function**, never seeded. Rules in
`lib/alerts.ts`:

| Code | Condition | Severity |
|---|---|---|
| `LOCATION_UNRESOLVED` | No latitude/longitude on the call | high |
| `P1_UNASSIGNED` | `severity === 'critical'` and status not dispatched/on_scene/resolved and age > 90s | critical |
| `MODEL_ESCALATED` | Refinement raised severity above the local grade | medium |
| `LOW_CONFIDENCE` | `ai_confidence < 0.5` | medium |
| `STALE_INCIDENT` | Not resolved and age > 30 min | low |

Acknowledgement is stored in `localStorage` under
`dispatch_alert_acks` keyed `${callId}:${code}`, and acknowledged alerts move to
a collapsed section rather than disappearing.

### 6.3 History

The existing call log, rebuilt on the new primitives: full-width table, tabular
numerals, no truncation of summary or address, sortable by age and severity,
filterable by severity and free text.

### 6.4 Forecast

The existing analytics modal, subject to the honesty pass in §9. Becomes a
module rather than a full-screen modal.

### 6.5 Incident timeline

Replaces `IncidentWorkflowOverlay`, which currently hardcodes four fire/EMS
recommendations regardless of which incident is open and never resets its state
between incidents.

Three decision points, per the reference:

1. **INTAKE** — AI classification (type, severity, location). Operator confirms
   or amends.
2. **DISPATCH** — AI proposed units. Operator authorises, edits, or overrides
   with a reason.
3. **RESOLUTION** — AI drafted closure summary. Operator signs off.

Each point records: what the AI proposed, what the operator did, a timestamp, and
an override reason where the operator diverged. All content derives from the open
call (`ai_summary`, `recommended_units`, `severity`, `immediate_threats`). State
persists per call in `localStorage` under `dispatch_timeline`.

## 7. Instant triage

### 7.1 Rationale

The reference benchmarked Mistral, GPT-4 and a custom model, found the large
models marginally more accurate but 230% slower, and shipped the faster one:
*"It is better to correct wrong information than to falsely expect perfect
answers in a life-or-death situation."*

Our GLM path takes 10–15s on the free tier and has been measured timing out. The
operator currently watches a spinner for that entire period.

### 7.2 Design

Split the single blocking request into two:

- `POST /api/calls/create` runs **local rules only** and returns immediately
  (measured in milliseconds). Response carries `triage_method: 'keyword'` and
  `refinable: true`.
- `POST /api/calls/refine` accepts `{ callId, transcript, emotions }`, runs the
  model, and returns the enriched call plus `changed: string[]` naming the fields
  the model altered.

Client sequence: publish the local call so it appears on the board at once →
immediately request refinement → merge the result and republish with
`isUpdate: true`.

### 7.3 States and failure

- While refinement is in flight the incident carries a `REFINING` chip.
- On success, changed fields flash once (500ms) and the source badge flips from
  `local rules` to the model id. Under `prefers-reduced-motion: reduce` the flash
  is replaced by a persistent left border on the changed row, so the information
  survives without the animation.
- On failure or timeout the local grade stands, the badge stays `local rules`,
  and **no error modal is shown**. Refinement is enrichment; its failure must not
  interrupt the operator.
- The model may only raise severity, never lower it. This constraint already
  exists in `lib/triage.ts` and is preserved.

## 8. Density

Acting on the reference's finding that *"over-optimized UX can be a disease"*,
and that dispatchers are trained on dense multi-screen workflows:

- Incident rows show the **full** AI summary. `line-clamp-2` is removed from
  summaries.
- Transcripts render in full, scrollable, never truncated.
- Addresses wrap rather than `truncate`.
- `truncate` survives only where a value is genuinely an identifier that cannot
  wrap (e.g. a chat group id in a status line).
- `select-none` is scoped to chrome. It currently sits on the dashboard root and
  prevents an operator copying an address or phone number.

## 9. Honesty rules

Carried forward from the audit and extended to the new surfaces.

- No fabricated telemetry. The forecast module's "Redis Cluster: Active (0.8ms
  latency, 10k ops/sec)", "PostgreSQL Archive: Syncing (24,810 historic incidents
  indexed)", "R² = 0.94" and "Measured via LAPD & Berkeley trial benchmarks" are
  either computed from `calls` or explicitly labelled `SAMPLE DATA`.
- Named third-party attributions are removed unless true.
- Distress renders `—` where there is no prosody.
- The triage source badge always names the engine that actually graded the call.
- Location confidence reflects what the coordinate represents; a district
  centroid is capped at 75% with its accuracy radius shown.
- Where the chart legend promises a series, that series is plotted. The forecast
  chart currently promises "Dotted = LSTM Forecast" and never draws it.

## 10. File plan

New:

- `lib/design/symbols.ts` — `buildSymbol`, escaped SVG strings
- `lib/alerts.ts` — derivation rules, acknowledgement storage
- `lib/timeline.ts` — decision-point state and persistence
- `components/ui/panel.tsx` — `Panel`, `PanelHeader`, `DataRow`, `Chip`
- `components/ui/symbol.tsx` — React wrapper over `buildSymbol`
- `components/DistressMeter.tsx` — shared distress rendering, handles the absent case
- `components/ModuleRail.tsx`
- `components/UnitRoster.tsx`
- `components/AlertsModule.tsx`
- `components/IncidentTimeline.tsx`
- `app/api/calls/refine/route.ts`

Rewritten:

- `app/globals.css` — token layer, font imports, surface rules
- `app/layout.tsx` — fonts, metadata, branding
- `app/dashboard/page.tsx` — module rail, three-tier layout
- `app/dashboard/calls/[id]/page.tsx`
- `app/api/calls/create/route.ts` — local-only path
- `components/EmergencyMap.tsx` — symbology, distress rings
- `components/IncidentKanbanBoard.tsx`
- `components/StartEmergencyCall.tsx` — 112 Pulse branding, optimistic flow
- `components/CallHistoryOverlay.tsx` → history module
- `components/DataManagementDashboard.tsx` → forecast module
- `components/MiniLocationMap.tsx`

Deleted (dead or replaced):

- `components/IncidentWorkflowOverlay.tsx` — replaced by `IncidentTimeline`
- `components/DemoCallSimulator.tsx` — unreferenced, 347 lines
- `lib/hume-websocket.ts` — unreferenced, 327 lines, and its browser
  `WebSocket(url, {headers})` call could never have worked
- `test-hume-config.js` — duplicates `chat-summary`, holds rotated keys
- `hume-evi-next-js-starter/` — a second vendored Next.js app, excluded from
  `tsconfig`, imported by nothing, and the source of the build's duplicate
  lockfile warning

## 11. Out of scope

Explicitly not in this change:

- Drag-to-reorder panels. High effort, high jank risk, low payoff.
- Toggleable module visibility. Considered and dropped.
- Authentication. Still absent; tracked separately as a deployment blocker.
- Hume webhook signature verification. Tracked separately.
- Replacing `localStorage` with a database.

## 12. Verification

The change is done when, against a production build driven in a browser:

1. `grep -r` over `app/` and `components/` returns no `shadow-[0_0_`, no
   `backdrop-blur`, and no arbitrary `text-[Npx]` outside the six-step scale.
2. A scripted call shows a graded result in under one second, then upgrades in
   place with the badge changing from `local rules` to the model id.
3. Killing network access to the model leaves the local grade standing with no
   error modal.
4. An incident's full AI summary is readable in the queue without truncation.
5. Alerts appear for a call with unresolved location and clear on acknowledgement.
6. The incident timeline shows the open incident's own units and summary, and
   resets when a different incident is opened.
7. Distress shows a value for a 112 Pulse call and `—` for a mock call.
8. `tsc --noEmit` and `next build` are clean.
9. The XSS payload that previously executed still renders inert after the
   symbology rewrite.
