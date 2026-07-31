# Phase 56 - Discussion Log

> **Two sessions are recorded below, in chronological order.** Session 2 (2026-07-30) SUPERSEDES
> Session 1 (2026-07-26) on the analytics-boundary question and on the `/reports` index composition.
> Session 1 is preserved in full so the audit trail shows what was chosen, what was later rejected,
> and why the position moved. The reconciled decisions live in `56-CONTEXT.md`, not here.
>
> | | Session 1 (2026-07-26) | Session 2 (2026-07-30) |
> |---|---|---|
> | Analytics boundary | Absorb all, then corrected post-session to "only `/analytics/financial` moves" | **Full separation - nothing moves** |
> | `/reports` index | Navigation only | **Summary strip + statement list** |
> | Nav entries | Two | Two (unchanged) |
> | `/documents` | In scope, then split out to Phase 65 post-session | Discussed again; **still Phase 65** - Session 2's `/documents` answers are Phase 65 input, not Phase 56 scope |

---

## SESSION 1 - 2026-07-26

**Date:** 2026-07-26
**Mode:** default (interactive, no flags)
**Areas selected:** all four offered

Human reference only. Downstream agents read `56-CONTEXT.md`, not this file.

---

## Area 1 - Hub shape & sub-routes

| Question | Options presented | Selected |
|---|---|---|
| How should the hub be structured? | Real sub-routes (rec) / Tabs on one page / Sections on one scrolling page | **Real sub-routes** |
| How should the hub index group reports? | Statements-Analytics-Exports (rec) / Flat list / Statements vs everything else | **Statements / Analytics / Exports** |
| What happens to existing `/reports/{generate,year-end,analytics}`? | Keep in place (rec) / Re-slot into new structure / You decide | **Re-slot** (non-recommended) |
| Should the index show data or just navigate? | Navigation only (rec) / Light summary + nav / You decide | **Navigation only** |

**Note:** choosing re-slot means three already-correct `/reports/*` URLs also need redirects,
expanding the map beyond the legacy trees. Captured as D-03.

---

## Area 2 - Fate of the /analytics section

| Question | Options presented | Selected |
|---|---|---|
| Only `/analytics/financial`, or the whole section? | Only financial (rec) / Absorb all / Only financial + rename | **Absorb all** (non-recommended, scope expansion) |
| How does `/analytics/financial` land? | Merge into existing `/reports/analytics` (rec) / New sibling sub-route / You decide | **Merge into existing** |
| How many top-level nav entries? | Two: Reports + Analytics (rec) / One: Reports only / You decide | **Two** |
| What about the `/analytics` index financial entry? | Cross-link to hub (rec) / Remove entirely / You decide | **You decide** |

### Conflict raised and resolved

"Absorb all of /analytics" and "keep two nav entries" contradicted each other - if the whole
section folds into the hub there is no `/analytics` left to hold a nav entry, and no index page for
the fourth question to apply to. Surfaced rather than guessed.

| Reconciliation options | Selected |
|---|---|
| Both - URLs absorb, nav keeps two entries pointing into the hub (rec) / Absorb everything with one nav entry / Revert to roadmap-literal | **Both** |

Result: every `/analytics/*` URL 308s into `/reports/analytics/*`, while the nav shows
`Reports -> /reports` and `Analytics -> /reports/analytics`. The scope expansion (~6 extra
redirects and E2E routes beyond RPTHUB-01) was accepted knowingly. Captured as D-05 through D-08.

---

## Area 3 - Legacy route removal mechanics

| Question | Options presented | Selected |
|---|---|---|
| What happens to old `page.tsx` files? | Delete, redirects only in next.config (rec) / Keep as permanentRedirect stubs / Delete most | **Delete** |
| How to sequence E2E-before-removal? | Ordered plans in-phase (rec) / Ship hub now, remove later / You decide | **Ordered plans in-phase** |
| Where do the ~21 legacy URLs point? | 1:1 exact (rec) / Group-level / Exact where possible | **1:1 exact** |
| How far on the duplicated `PREMIUM_REPORT_TYPES`? | Verify both, leave duplication (rec) / Consolidate into `_shared/` / You decide | **Verify both, leave duplication** |

Consolidating the duplicated set was recorded as a deferred idea rather than dropped.

---

## Area 4 - /documents landing composition

| Question | Options presented | Selected |
|---|---|---|
| What does the landing show? | Three entry points (rec) / Entry points + recent documents / Entry points + storage usage | **Entry points + recent documents** (non-recommended) |
| Does `/documents/vault` stay canonical? | Yes (rec) / No, vault moves to `/documents` / You decide | **Yes** |
| How are the four printable templates surfaced? | One card listing all four (rec) / Four separate cards / You decide | **Four separate cards** (non-recommended) |
| How to handle the contradicting code comment? | Replace and record why (rec) / Replace silently / You decide | **Replace and record why** |

**Concern raised, user proceeded:** the recent-documents list overlaps what `/documents/vault`
already renders, and four separate template cards plus vault plus lease-template makes the landing
six tiles plus a list. Both noted in D-14 and D-16 with guidance (reuse the vault's query; defer
layout balance to the UI phase) rather than re-litigated.

---

## Scope creep redirected

- De-duplicating `PREMIUM_REPORT_TYPES` across the two edge functions -> deferred idea.
- New report types / new analytics visualizations -> explicitly out of scope in `<domain>`.

## Claude's discretion recorded

Exact sub-route slugs, whether `/reports/analytics` needs its own index, hub/landing card layout,
and whether the recent-documents list is server- or client-rendered.

## Prior context applied (not re-asked)

Phase 55's Scheduled vs Collected revenue vocabulary (D-07/D-08) carries forward unchanged as D-18.


---

## SESSION 2 - 2026-07-30 (LATER SESSION - SUPERSEDES SESSION 1 WHERE THEY CONFLICT)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.
>
> **Why this session exists.** Session 1's post-session correction landed on *partial* separation:
> `/analytics` kept six routes but `/analytics/financial` still folded into the hub. This session
> re-put that question to the user. **The Session 1 position appears below as the RECOMMENDED
> option in "Analytics boundary" Q1, labelled "Financial-only absorb" - and the user rejected it**
> in favour of Full separation. That rejection is the reason `56-CONTEXT.md` carries a
> `<scope_correction>` block and why the redirect map's 7th entry inverts.
>
> **Scope note on the `/documents` answers below.** DOCS-01 was split out to **Phase 65** by
> Session 1's post-session correction (D-27), and that split is NOT reopened by this session. The
> `/documents landing composition` answers recorded here are **Phase 65 input**, preserved so that
> phase inherits them - they are not Phase 56 scope.

**Date:** 2026-07-30
**Phase:** 56-Reporting Hub & Documents Landing
**Areas discussed:** Analytics boundary, Hub information architecture, Redirect granularity, /documents landing composition

---

## Analytics boundary

### Q1 — RPTHUB-01 absorbs `/analytics/financial`, but the user previously asked for analytics and reporting to stay separate. Which reading holds?

| Option | Description | Selected |
|--------|-------------|----------|
| Financial-only absorb | Only `/analytics/financial` moves into `/reports`; operational analytics stay. Satisfies RPTHUB-01 literally AND keeps a split. | |
| Full separation | `/reports` holds statements + exports only; ALL analytics including financial stays at `/analytics`. Contradicts RPTHUB-01 as written. | ✓ |
| Total absorb | All of `/analytics/*` folds into `/reports`. | |

**User's choice:** Full separation
**Notes:** Chosen over the recommended option. Consequence flagged immediately: RPTHUB-01 and RPTHUB-02 must be amended — the requirement text otherwise contradicts the decision. Captured as a prominent `<scope_correction>` block in CONTEXT.md rather than buried in decisions, so a future reader cannot silently re-merge the surfaces by following the stale requirement text.

### Q2 — What happens to the existing `/reports/analytics` charts?

| Option | Description | Selected |
|--------|-------------|----------|
| Move to `/analytics`, delete from hub | Charts relocate; `/reports/analytics` 308s there. Zero charts left in hub. | ✓ |
| Delete as duplicates | Remove outright if `/analytics` already renders equivalents. | |
| You decide | Let the researcher diff and pick per chart. | |

**User's choice:** Move to `/analytics`, delete from hub
**Notes:** Researcher still needs to diff the moved charts against `/analytics/financial` to merge rather than duplicate — captured as discretion in CONTEXT.md.

### Q3 — Where do Phase 55's Scheduled vs Collected surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Both, with the same labels | Hub statements as line items, `/analytics/financial` as trend charts, single RPC source. | ✓ |
| Hub only | Analytics keeps existing lease-derived revenue, gains no ledger figures. | |
| Analytics only | Charts carry the comparison; hub statements stay statement-shaped. | |

**User's choice:** Both, with the same labels
**Notes:** Directly inherits Phase 55 D-07/D-08. The load-bearing constraint is one RPC source and one label vocabulary, so a number never means two things across two surfaces.

### Q4 — Does `/analytics` keep its own top-level nav entry?

| Option | Description | Selected |
|--------|-------------|----------|
| Two peer nav entries | Reports and Analytics as siblings. | ✓ |
| Analytics nested under Reports | One visible entry, Analytics as child link. | |
| More questions first | — | |

**User's choice:** Two peer nav entries
**Notes:** This is where the separation becomes visible to users. RPTHUB-01's "single navigation entry" is reinterpreted to mean the reporting hub itself, not a merged Reports+Analytics entry.

---

## Hub information architecture

### Q1 — How should the 7 hub destinations be organised?

| Option | Description | Selected |
|--------|-------------|----------|
| Nested routes + hub index | Each statement keeps its own URL; `/reports` is a landing page. | ✓ |
| Tabs on one route | Single route, tab-selected statement. | |
| Single scrolling page | All statements stacked. | |

**User's choice:** Nested routes + hub index
**Notes:** Preserves deep-linking, gives redirects clean 1:1 targets, keeps heavy financial pages on separate loading boundaries.

### Q2 — What does the `/reports` index show above the statement list?

| Option | Description | Selected |
|--------|-------------|----------|
| Summary strip + statement list | Scheduled / Collected / outstanding strip, then entry points. | ✓ |
| Statement list only | Pure navigation index. | |
| You decide | Defer to UI phase. | |

**User's choice:** Summary strip + statement list
**Notes:** Gives the hub a reason to exist as a page. Also the natural home for the roadmap's "real ledger actuals, not a re-fabricated collection_rate".

### Q3 — Reuse or rebuild the `/financials` component set?

| Option | Description | Selected |
|--------|-------------|----------|
| Move and rename | Relocate into `/reports`, `financials-*` → `reports-*`. | ✓ |
| Reuse in place, import across | Leave under `/financials`, import from `/reports`. | |
| Rebuild fresh | New components for the hub. | |

**User's choice:** Move and rename
**Notes:** Avoids leaving a directory whose routes are all redirects, and avoids discarding working loading/error boundaries.

### Q4 — What should RPTHUB-04's E2E coverage include?

| Option | Description | Selected |
|--------|-------------|----------|
| Hub routes + tier-gate + redirects | All three verified. | ✓ |
| Hub routes only | Smoke-test rendering. | |
| You decide | Planner scopes it. | |

**User's choice:** Hub routes + tier-gate + redirects
**Notes:** Surfaced during scouting that `PREMIUM_REPORT_TYPES` is duplicated across `export-report` and `generate-pdf`; both copies need verifying, which routes-only coverage would have missed entirely.

---

## Redirect granularity

### Q1 — What happens to `/analytics/financial`, which full separation does not absorb?

| Option | Description | Selected |
|--------|-------------|----------|
| No redirect — it stays live | It is a destination, not a legacy URL. | ✓ |
| Redirect it to `/reports` anyway | Honour RPTHUB-02's original list literally. | |
| You decide | Planner enumerates per URL. | |

**User's choice:** No redirect — it stays live
**Notes:** Makes `/reports/analytics` the only redirect pointing *away* from the hub. Called out explicitly in CONTEXT.md so it is not "corrected" later by someone assuming all arrows point at `/reports`.

### Q2 — Where does the `/financials` index redirect to?

| Option | Description | Selected |
|--------|-------------|----------|
| 308 to `/reports` | Index to index. | |
| 308 to `/reports/income-statement` | Skip to the most-used statement. | |
| You decide | Check traffic first. | ✓ |

**User's choice:** You decide
**Notes:** Recorded as Claude's discretion with a stated default of index → index, deviating only if traffic shows one statement dominates that entry point.

### Q3 — Should redirect-and-delete land together or be staged?

| Option | Description | Selected |
|--------|-------------|----------|
| Same phase, E2E-gated order | Build → E2E → redirect → delete, within Phase 56. | ✓ |
| Stage across phases | Redirect now, delete later after a soak. | |
| Redirect only, never delete | Leave legacy files permanently. | |

**User's choice:** Same phase, E2E-gated order
**Notes:** RPTHUB-04's ordering becomes a plan-sequencing constraint. No window exists in which two copies of a statement can drift apart.

---

## /documents landing composition

### Q1 — How should the three entry points be presented?

| Option | Description | Selected |
|--------|-------------|----------|
| Three cards, vault primary | Vault visually dominant; builder and templates secondary. | ✓ |
| Vault preview + two links | Recent documents inline. | |
| Equal three-column grid | All three weighted equally. | |

**User's choice:** Three cards, vault primary
**Notes:** Vault is where real documents live and where every existing link already points.

### Q2 — What happens to links currently pointing at `/documents/vault`?

| Option | Description | Selected |
|--------|-------------|----------|
| Repoint nav to `/documents`, leave deep links | Nav to landing; direct vault links untouched. | ✓ |
| Repoint everything | All references to the landing, including marketing. | |
| Leave all links on `/documents/vault` | Landing exists but nothing routes to it. | |

**User's choice:** Repoint nav to `/documents`, leave deep links
**Notes:** Vault stays a real route and is NOT redirected. Also flagged: the existing comment in `documents/page.tsx` asserting "there's no plan to bring back a /documents index" becomes false and must be deleted.

### Q3 — Should the cards show live state, e.g. a vault document count?

| Option | Description | Selected |
|--------|-------------|----------|
| No live data — static cards | Pure navigation, renders instantly. | ✓ |
| Vault document count only | One cheap count. | |
| You decide | UI phase weighs it. | |

**User's choice:** No live data — static cards
**Notes:** Consistent with the project's standing rule not to surface a number unless unambiguously sourced. Avoids a loading state and an error boundary on a navigation page.

---

## Claude's Discretion

- `/financials` index redirect target — default index → index (`/financials` → `/reports`) unless traffic data indicates otherwise.
- Whether `/reports/generate` and `/reports/year-end` keep current URLs or get renamed for consistency.
- Card copy, iconography, and ordering on the `/documents` landing (UI phase).
- Whether relocated charts merge into `/analytics/financial` or land as a sibling route — depends on the researcher's diff.

## Deferred Ideas

- Collapse the duplicated `PREMIUM_REPORT_TYPES` sets in `export-report` and `generate-pdf` into one shared module. This phase verifies both; de-duplicating carries its own edge-function deploy risk.
- A broader nav-naming pass covering `/reports/generate` and `/reports/year-end`.
- Visual-regression coverage for the new hub — the repo's live visual spec never runs in CI and has no baselines; making it real needs the `chromium` project added to CI plus Linux baselines.


---

## Reconciliation record (2026-07-30)

How the two sessions were merged into one canonical line:

| Question | Session 1 | Session 2 | Canonical |
|---|---|---|---|
| Does `/analytics/financial` move into the hub? | Yes (after correction: it is the ONLY one that moves) | **No - full separation** | Session 2. `56-CONTEXT.md` D-29. |
| What happens to `/reports/analytics`? | It is the merge target and stays | **Deleted; 308s into `/analytics/overview`** | Session 2. D-29 / D-32. |
| Charts under `/reports/**`? | One chart page survives | **Zero** | Session 2. D-34. |
| Does the `/reports` index fetch data? | No - navigation only (D-04) | **Yes - summary strip** | Session 2. D-30 supersedes D-04. |
| Nav entries | Two peers | Two peers | Both agree. D-07 REVISED stands. |
| Component strategy for `/financials/*` | not asked | Move and rename | Session 2, recorded as discretion. |
| E2E scope | Ordered plans in-phase, 1:1 redirects | Hub routes + tier-gate + redirects | Both agree; Session 2 is more explicit. D-11 / D-12 / D-25. |
| `/documents` landing | In scope | Discussed | **Neither - Phase 65** (D-27, unchanged by both sessions' post-session corrections). |
| `PREMIUM_REPORT_TYPES` de-dup | Deferred | Deferred | Both agree. D-12. |

**Decision provenance note.** The 2026-07-30 zero-cards deletion (`analytics-stats-row.tsx`,
`analytics-payment-methods-chart.tsx`) is NOT from either session's Q&A - it came from a
production-database verification performed during reconciliation (snake_case parse vs camelCase
`get_billing_insights` payload, zero key overlap). It is recorded as `56-CONTEXT.md` D-33 with its
full evidence chain.
