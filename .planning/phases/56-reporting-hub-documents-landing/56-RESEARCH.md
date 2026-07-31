# Phase 56: Reporting Hub - Research

**Researched:** 2026-07-26
**Rescoped:** 2026-07-26 (see Post-Research Rescope below)
**Rescoped again:** 2026-07-30 (FULL SEPARATION — see the block immediately below, which supersedes the 2026-07-26 rescope wherever the two conflict)
**Domain:** Next.js 16 App Router information architecture — route consolidation, `next.config.ts` redirects, E2E sequencing, tier-gate preservation
**Confidence:** HIGH on codebase facts (nearly every claim verified against this repo's own source, build artifacts, or official Next.js 16.2.12 docs). **The SCOPE this document was written against is stale — see below.**

---

## ⚠ SECOND RESCOPE (2026-07-30) — FULL SEPARATION — READ BEFORE ANYTHING ELSE

**This document was written PRE-FULL-SEPARATION.** Its *codebase facts* remain accurate and are the
reason it is retained substantially intact. Its *scope premise* — that `/analytics/financial` folds
into the hub and merges into `/reports/analytics` — was **rejected by the user on 2026-07-30**, after
being presented as the recommended option. See `56-DISCUSSION-LOG.md` Session 2, "Analytics
boundary" Q1.

**The locked position:** `/reports` holds financial statements + exports with **ZERO charts**.
**`/analytics/financial` stays live and is NOT redirected.** `/reports/analytics` is **DELETED** and
308s **INTO `/analytics/overview`**. Reports and Analytics are two peer top-level nav entries.
Canonical decisions: `56-CONTEXT.md` **D-29 through D-34**.

### Which conclusions in this document the scope change affects

| # | Conclusion in this document | Status after 2026-07-30 | Sections |
|---|---|---|---|
| S2-1 | Only `/analytics/financial` folds into the hub | **INVALID.** *Nothing* folds in. `/analytics/financial` stays live and joins the do-not-redirect guard set. | Post-Research Rescope, User Constraints, Redirect Map, Non-Route Map, E2E, Merge Cost Analysis |
| S2-2 | `/reports/analytics` is the merge target and renders the merged financial view | **INVALID.** It is deleted and redirected out. | Merge Cost Analysis (D-06), Architecture, Pitfall 5 |
| S2-3 | The 7-entry redirect map: six `/financials/*` + `/analytics/financial → /reports/analytics` | **REVISED — still 7, but the 7th INVERTS** to `/reports/analytics → /analytics/overview`. Target the concrete route: `analytics/page.tsx` is `redirect("/analytics/overview")`, so `/analytics` would chain. | §"The 7-entry map", Code Examples, Pitfalls 3-4 |
| S2-4 | Guard A = 4 identity paths (`/reports`, `/reports/analytics`, `/reports/generate`, `/reports/year-end`) | **REVISED — 3.** `/reports/analytics` leaves the guard set; it is now map entry 7. | §"The two non-emitting guards", Validation Architecture |
| S2-5 | Guard B = 6 unmoved `/analytics/*` routes | **REVISED — 7.** `/analytics/financial` **joins** the guard set. This is now the single highest-risk stale-artifact hazard in the phase: a leftover `/analytics/financial → /reports/analytics` entry would 308 a live page into a URL that will not exist. Assert the source array by **equality**, not subset. | §"The two non-emitting guards", Pitfall 3b |
| S2-6 | D-24: 6 Cmd+K hrefs change (five `/financials*` + `/analytics/financial`) | **REVISED — 5.** `app-shell.tsx:115` (`/analytics/financial`) no longer changes; the route stays live. All six `/analytics/*` palette rows stay. | Non-Route Map N2, Pitfall 1 |
| S2-7 | The nav `Analytics` entry loses its `Financial` child | **INVALID.** `main-nav.tsx:60` is **not edited**. Removing it would orphan a live route. | Non-Route Map, Architecture |
| S2-8 | Finding X1 — "there is no rendered `/analytics` index" | **STILL TRUE, and now decisive.** It is why D-08's cross-link ruling was struck: there is no index to edit and nothing in the hub to link to. `analytics/page.tsx` is four lines of `redirect()`. | Finding X1 |
| S2-9 | Hub renders 8 tiles (Statements 5 + Analytics 1 + Exports 2) | **REVISED — 7 tiles in 2 groups.** No Analytics group. | Architecture, Validation |
| S2-10 | The `/reports` index is navigation-only, zero data (D-04) | **SUPERSEDED by D-30.** The index carries a Scheduled / Collected / Outstanding summary strip. User selection, 2026-07-30, "Hub information architecture" Q2. | Architecture, Validation Architecture |
| S2-11 | Merge Cost Analysis (D-06 / D-26): the two analytics pages share nothing, so budget the merge as a standalone plan | **MOOT as a cost estimate** — there is no merge. **The underlying fact is retained and now argues the other way:** two surfaces sharing zero data sources and zero components were never one surface, so deleting the weaker one is cheaper and more honest than merging it. | Merge Cost Analysis |
| S2-12 | D-21: fix `ExportButtons`' divergent paywall path in this phase | **MOOT for Phase 56.** Its justification was "the D-06 merge would import a second paywall pattern into the hub." No merge. Verified: `ExportButtons` has one call site, `src/app/(owner)/analytics/financial/page.tsx:103` — outside this phase. Finding preserved as a deferred item + `56-CONTEXT.md` OQ-3. | Tier Gate Ground Truth |
| S2-13 | D-22 (one period control on the merged page), D-23 (Analytics tile not badged) | **MOOT.** No merged page, no Analytics tile. | Tier Gate, Validation |
| S2-14 | *(not researched)* zero-charts under `/reports/**` | **NEW (D-34).** The current `/reports/page.tsx` dynamic-imports four recharts-bearing sections (`financial-`, `property-`, `tenant-`, `maintenance-report-section`), imported by that file and nothing else. They are **deleted, not relocated to `/reports/generate`** — that is still inside `/reports`. `year-end-report-section.tsx` is chart-free and stays. | new |
| S2-15 | *(not researched)* the permanently-zero analytics cards | **NEW (D-33).** `report-analytics-keys.ts:74-103` parses **snake_case** keys; the live `get_billing_insights` RPC returns only **camelCase** (`churnRate`, `lateFeeTotal`, `mrr`, `tenantCount`, `totalRevenue`, `unpaidCount`, `unpaidTotal`). **Zero key overlap → every figure renders 0 in production** under confident labels. The data is TenantFlow subscription billing, not rental revenue, and "card vs ACH" is unclaimable in a landlord-only product that facilitates no rent payments. `analytics-stats-row.tsx` and `analytics-payment-methods-chart.tsx` are **DELETED**. | new |

**Still valid and unchanged by this rescope:** every redirect *mechanic* (execution order,
both-ends-anchored source regexes, `has`/`missing` not needed, ordering non-issue), the entire E2E
Reality Check (D-25 — CI runs only `smoke`/`public`/`owner-axe`; the `owner` project never
executes; `owner-axe` uses a filename allowlist), the Tier Gate Ground Truth (the two
`PREMIUM_REPORT_TYPES` sets are identical; the gate is structurally immune to this phase; Finding
G3), Finding M2, the Phase 65 documents-landing research block, the Architecture Patterns, the
Don't-Hand-Roll list, and the Security Domain section.

**Everything in the 2026-07-26 rescope below remains historically accurate as a record of that
correction — but where it conflicts with this block, this block wins.**

---

## Post-Research Rescope (2026-07-26) — superseded on the analytics question by the block above

This document was written against the pre-correction scope. The user issued **two binding
corrections after it was committed**. They supersede the original text everywhere the two conflict;
every affected section below carries an explicit `REVISED` / `NO LONGER APPLICABLE` marker so the
correction reads as deliberate rather than as drift.

> *"take the split seriously because analytics and the other scope is supposed to be separate for
> better navigation and ultimately a better user experience"*

**Correction 1 — D-05 is REVERTED. `/analytics` is NOT absorbed.**
Only `/analytics/financial` folds into the hub, exactly as RPTHUB-01 always said. The six other
analytics routes — `/analytics` (index), `/analytics/leases`, `/analytics/maintenance`,
`/analytics/occupancy`, `/analytics/overview`, `/analytics/property-performance` — **keep their
URLs and remain their own product section.** Reports = financial statements + exports.
Analytics = operational insight. Two genuinely distinct surfaces; that separation is the point.

**Correction 2 — the phase SPLITS. Hub first, documents landing second.**
- **Phase 56** = Reporting Hub. Requirements **RPTHUB-01, RPTHUB-02, RPTHUB-03, RPTHUB-04**.
- **Phase 65** = Documents Landing. Requirement **DOCS-01** and every decision that serves it
  (D-14, D-15, D-16, D-17). The two share no code, no routes and no tests.

### What the corrections change in this document

| # | Was | Now | Sections touched |
|---|-----|-----|------------------|
| 1 | D-05: all of `/analytics/*` absorbs | **REVERTED** — only `/analytics/financial` moves | user_constraints, Redirect Map, Non-Route Map, E2E, Security |
| 2 | D-07: nav = two doors into `/reports` | **REVISED** — nav = two REAL sections, `Reports → /reports` and `Analytics → /analytics` | user_constraints, Pattern 2 (deleted) |
| 3 | Nav double-active bug + longest-prefix-wins resolver + 6 pinned cases | **DISSOLVED — DELETED.** The bug existed only because D-07 pointed both hrefs into `/reports`. `/reports` and `/analytics` have no prefix overlap, so the existing `startsWith` resolver at `main-nav.tsx:188-191` is already correct. Not carried forward as a latent fix — out of scope. | Pattern 2, Non-Route Map N1, Validation Architecture |
| 4 | D-08: `/analytics` index absorbed, nothing survives | **REVISED** — the `/analytics` index survives; its Financial entry becomes a cross-link to `/reports/analytics` | user_constraints, Finding X1 |
| 5 | D-19: 13 redirect entries | **REVISED — 7 entries.** Identity-no-op guard still applies (4 paths); the 6 unmoved `/analytics/*` routes must also NOT be emitted | Redirect Map, Code Examples, Pitfalls 3-4 |
| 6 | D-24: 13 Cmd+K hrefs change | **REVISED — 6 hrefs change** (five `/financials*` + one `/analytics/financial`) | Non-Route Map N2, Pitfall 1 |
| 7 | ROADMAP SC-1 "single navigation entry" vs D-07 two entries | **DISSOLVED.** With Analytics staying separate, Reports IS a single entry for reporting. Reconciliation paragraph deleted. | Open Question 5 |
| 8 | Hub renders 13 tiles | **REVISED — 8 tiles**: Statements (5) + Analytics (1) + Exports (2), plus wherever the D-20 Accounts Receivable card lands | Redirect Map, Architecture, Validation |
| 9 | DOCS-01 in scope | **MOVED to Phase 65.** Its research is retained below under a `PHASE 65` banner — do not delete it, do not plan it here | Documents Landing §, Validation Architecture |

**Unchanged and still binding:** D-01, D-02, D-04, D-06, D-09, D-10, D-11, D-12, D-13, D-18, D-20,
D-21, D-22, D-23, D-25, D-26. **D-03 remains superseded by D-19** (as revised — the re-slot entries
are identity no-ops and are not emitted). Nothing else in this document is re-opened.

> **Numbering — settled.** `.planning/ROADMAP.md:24` records *"Phase Numbering: Integer phases only
> (project convention — never decimals)"*, echoed by `.planning/PROJECT.md:150`. The split therefore
> takes the **next free integer, Phase 65**, and executes immediately after Phase 56; phases 57-64
> were already planned and are never renumbered. ROADMAP.md carries the append-only rule and orders
> its phase list by *execution* order, so 65 appears between 56 and 57.

---

## Summary

This phase is a pure information-architecture consolidation. There is no new capability, no
database work, and no new dependency. The technical risk is concentrated in four places, and
research resolved all four with direct evidence rather than inference.

**The redirect mechanism is simpler and safer than CONTEXT.md assumed.** Verified from this
project's own `.next/routes-manifest.json`: a literal `source` compiles to a both-ends-anchored
regex (`^(?!/_next)/signup(?:/)?$`). `/analytics` therefore cannot shadow `/analytics/financial`,
so **entry ordering is a non-issue** for the 1:1 map D-10 mandates. Ordering only becomes hazardous
if someone writes a `:path*` wildcard — verified that `/analytics/:path*` matches both `/analytics`
and `/analytics/financial`. Official Next.js 16.2.12 docs confirm config `redirects` execute at
step 2 and Proxy at step 3, so RPTHUB-02's "no proxy.ts involvement" holds structurally, not by
convention. Combined with the UI-SPEC's flat-slug decision **and the D-05 revert**, the map is
**7 entries** — the `/reports/*` re-slot entries D-03 anticipated collapse to identity no-ops that
must NOT be emitted (a self-redirect is an infinite loop), and the six surviving `/analytics/*`
routes must not be emitted either because they are not moving at all.

**Three findings materially change planning, and none are in CONTEXT.md or the UI-SPEC.**
(1) `src/components/shell/app-shell.tsx` contains a **second, complete route table** — the Cmd+K
command palette — duplicating the legacy hrefs (**six of them change under the corrected scope**:
five `/financials*` entries plus `/analytics/financial`). The file carries its own comment recording
that a prior review caught exactly this class of miss ("removing the sidebar entry alone left the
same workflow discoverable via Cmd+K"). (2) **CI's `e2e-smoke` runs only `--project=smoke
--project=public --project=owner-axe`** — the `owner` project is never executed, so
`tests/e2e/tests/owner/*.spec.ts` gates nothing. RPTHUB-04 is not satisfiable by adding a spec to
that directory. (3) `ExportButtons` on the D-06 merge source POSTs to `export-report` with **no
`type` param**, and the edge function defaults `reportType` to `"financial"` — which **is** in
`PREMIUM_REPORT_TYPES`. That CTA is gated, the UI-SPEC's gate table does not list it, and it
surfaces the 402 through `FINANCIAL_EXPORT_FAILED` rather than `PaywallError` — a second paywall
pattern the merge imports into the hub (D-21 fixes it).

**A fourth finding is created by the D-05 revert — Finding X1.** `src/app/(owner)/analytics/page.tsx`
is a **4-line `redirect("/analytics/overview")`**, not a rendered index [VERIFIED: file read]. The
revised D-08 says "the `/analytics` index page SURVIVES; its financial entry becomes a cross-link
pointing at the hub" — but there is no rendered index to host that cross-link. Its only real homes
are the nav's `Analytics` children (`main-nav.tsx:60`) and `/analytics/overview`, the de-facto
index. Placement is UI composition, resolved at plan time; the fact that the index does not render
is what the planner must not discover late.

**The D-06 merge is expensive, not cheap.** D-06 hypothesized the two pages "may already overlap
heavily." They do not. `/analytics/financial` renders 11 child components off
`analyticsQueries.financialPageData()`; `/reports/analytics` renders 5 off three unrelated
`use-reports` hooks. They share no data source and no component. Treat the merge as its own plan.
The D-05 revert makes this merge **the entire `/analytics` footprint of the phase** — it is now the
single most expensive piece of work in Phase 56, not one item among seven analytics moves.

**Primary recommendation:** Extract a pure `src/lib/seo/reporting-redirects.ts` module (exact
`blog-redirects.ts` precedent) so the 7-entry map is unit-testable without importing
`next.config.ts`; put the redirect assertions in `tests/e2e/tests/public/` where CI actually runs
them; and add the hub-render spec to the `owner-axe` `testMatch` allowlist following the Phase 52
`notifications.spec.ts` precedent already recorded in `playwright.config.ts`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Hub structure (RPTHUB-01)**
- **D-01:** The hub uses **real sub-routes**, not tabs or a single scrolling page:
  `/reports/income-statement`, `/reports/cash-flow`, etc. Chosen because it gives every legacy URL
  a 1:1 redirect target, keeps deep links and E2E simple, and matches the sub-routes `/reports`
  already has.
- **D-02:** The hub index groups reports as **Statements / Analytics / Exports**. Statements =
  income-statement, balance-sheet, cash-flow, tax-documents, expenses. Analytics = **exactly one
  entry, the merged `/reports/analytics`** — *not* "the absorbed analytics views", which described
  the withdrawn D-05 expansion. Exports = generate + year-end. Tile inventory: 5 + 1 + 2 = **8**.
- **D-03:** The existing `/reports/generate`, `/reports/year-end` and `/reports/analytics` are
  **re-slotted into the new grouping** rather than left in place. This means these three already-
  correct URLs ALSO need redirect entries - the redirect map is not limited to the legacy
  `/financials` and `/analytics` trees.
- **D-04:** The `/reports` index is **navigation only** - a directory of available reports, no KPI
  tiles, no data fetching. Rationale: nothing to keep honest, no risk of restating a dashboard
  figure differently.

**The /analytics section**
- **~~D-05~~ — REVERTED 2026-07-26 by user correction. Supersedes the original D-05 entirely.**
  ~~All of `/analytics/*` absorbs into the hub.~~ **Only `/analytics/financial` moves.** The six
  other analytics routes (`/analytics`, `/analytics/leases`, `/analytics/maintenance`,
  `/analytics/occupancy`, `/analytics/overview`, `/analytics/property-performance`) keep their URLs
  and remain their own section. Reports = financial statements + exports; Analytics = operational
  insight. The scope expansion the original D-05 authorised (~6 extra redirect entries, ~6 extra
  E2E routes) is **withdrawn** — the planner must NOT budget for it.
- **D-06 (UNCHANGED):** `/analytics/financial` **merges into the existing `/reports/analytics`**
  page rather than becoming a sibling sub-route. Read both `page.tsx` files first - they may already
  overlap heavily, which determines how much merging is real work vs deletion.
  *(Answered: they do not overlap — D-26 / §Merge Cost Analysis.)*
- **D-07 — REVISED 2026-07-26. Supersedes "both entries point into the hub".**
  The navigation keeps **two entries, and they are two REAL sections**, not two doors into one hub:
  `Reports -> /reports` and `Analytics -> /analytics`.
  **Critical consequence:** the two hrefs have **no prefix overlap**, so the double-active nav bug
  the UI-SPEC found (`main-nav.tsx` `isActive` :188 / `startsWith` :190 lighting up both entries on
  `/reports/analytics/*`) **cannot occur**. The existing `startsWith` resolver is already correct.
  The longest-prefix-wins resolver work and its 6 pinned test cases are **deleted from this phase**
  and are NOT to be carried forward as a latent bug fix — they are out of scope.
- **D-08 — REVISED 2026-07-26. Supersedes "there is no surviving separate index".**
  The `/analytics` index **survives**. Its Financial entry becomes a **cross-link pointing at the
  hub** (`/reports/analytics`) so owners who learned the old location still find it. See **Finding
  X1**: `/analytics/page.tsx` is a 4-line `redirect("/analytics/overview")`, so the cross-link's
  real homes are the nav's `Analytics` children and `/analytics/overview`.

**Legacy route removal (RPTHUB-02, RPTHUB-04)**
- **D-09:** Old route files are **deleted**; redirects live **only** in `next.config.ts`
  `redirects()`. Config redirects are evaluated before filesystem routing, so a leftover
  `page.tsx` would be dead code. One redirect map, one source of truth. Follow the existing
  `permanent: true` entries in `next.config.ts` as the pattern.
- **D-10:** Redirect targets are **1:1 to the exact equivalent**, never group-level:
  `/financials/cash-flow -> /reports/cash-flow`, `/analytics/financial -> /reports/analytics`.
  Bookmarks and search results land on what they asked for. *(Decision unchanged. The original
  second example was `/analytics/occupancy -> /reports/analytics/occupancy`; it was replaced because
  D-05 REVISED means that route no longer moves at all.)*
- **D-11:** Sequencing is enforced **inside this phase** by wave ordering:
  **build the hub -> E2E-cover the hub routes -> only then add redirects and delete legacy files.**
  There must never be a commit where a legacy route is gone and its hub replacement is unproven.
  This is how RPTHUB-04 is satisfied.

**Tier gating (RPTHUB-03)**
- **D-12:** Verify the gate holds **in both** `supabase/functions/export-report/index.ts` (the
  `PREMIUM_REPORT_TYPES` set at :24, checked at :72) and
  `supabase/functions/generate-pdf/index.ts` (the mirror at :31, checked at :322), with a test.
  The duplication is **left in place** - consolidating shared Deno code across two deployed edge
  functions is its own change, not "verify intact". Recorded as a deferred idea.
- **D-13:** No route rewrite may bypass the gate. The hub's export CTAs must reach the same edge
  functions with the same `reportType` values - confirm the values still match after re-slotting.

**/documents landing (DOCS-01) — MOVED TO PHASE 65 (2026-07-26 split)**

> D-14 through D-17 leave Phase 56 with DOCS-01. They are retained verbatim below as the research
> record that Phase 65 inherits. **Do not plan or execute them in Phase 56.**

- **D-14:** The landing shows **entry points plus a recent-documents list**. Entry points are the
  vault, the lease template builder, and the four printable templates. **Concern recorded (user
  chose this knowingly):** the recent list overlaps what `/documents/vault` already renders - the
  two must not disagree. Prefer reusing the vault's existing query/mapper over a second source.
- **D-15:** `/documents/vault` **stays the canonical vault URL**. The landing links to it. Sidebar
  and marketing surfaces already point there, so nothing outside this phase changes and no vault
  redirect is needed.
- **D-16:** The four printable templates get **four separate cards**, one each. Combined with the
  vault and lease-template entries this makes six tiles plus the recent list - **the UI phase
  should resolve the layout balance**, not the planner.
- **D-17:** `src/app/(owner)/documents/page.tsx` currently calls `permanentRedirect("/documents/vault")`
  and its comment asserts *"the redirect is permanent - there's no plan to bring back a /documents
  index."* DOCS-01 reverses that. **Replace it and record why** - the new page carries a short
  comment noting DOCS-01 superseded the earlier decision, so the reversal reads as deliberate.

**Carried forward from Phase 55 (do not re-decide)**
- **D-18:** Revenue vocabulary is **Scheduled** (lease-derived, `get_revenue_trends_optimized.revenue`)
  vs **Collected** (ledger receipts). Nothing sums them. Any revenue figure the hub renders inherits
  this vocabulary exactly - the hub must not reintroduce a bare "Revenue" label or a third
  definition. See `.planning/phases/55-rent-ledger/55-CONTEXT.md` D-07/D-08.

### Claude's Discretion
- The exact sub-route slugs under `/reports` (e.g. `/reports/exports/year-end` vs
  `/reports/year-end`) - pick whatever keeps the redirect map smallest while reading coherently.
- Whether `/reports/analytics` needs its own index or routes straight to a default view.
- Layout/composition of the hub index cards and the documents landing tiles (defer to the UI phase
  if one runs).
- Whether the recent-documents list is server-rendered or client-fetched.

> **All four discretion items were resolved by the APPROVED 56-UI-SPEC.md** and are now locked:
> flat slugs (no `exports/` nesting); `/reports/analytics` IS the merged financial view (no index);
> ~~three-band documents ladder; recent list is a client-fetched `'use client'` island~~ **(the last
> two are Phase 65's, per the 2026-07-26 split)**. Do not re-open.

### Deferred Ideas (OUT OF SCOPE)
- **Consolidate `PREMIUM_REPORT_TYPES` into a shared `supabase/functions/_shared/` module** so the
  two edge functions cannot drift. Requires redeploying both functions; out of scope for "verify
  intact" (D-12).
- Adding new report types or analytics visualizations to the hub.
- Revisiting the collection-rate denominator basis raised in Phase 55's verification.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RPTHUB-01 | One unified reporting hub at `/reports` absorbs `/financials/*` and `/analytics/financial` (single navigation entry for reporting; statements + analytics + exports in one surface) | §Route Inventory (7 pages + 7 layouts move, client/server split); §Merge Cost Analysis (D-06 overlap is ZERO); §Non-Route Reference Map (nav + Cmd+K + breadcrumbs) |
| RPTHUB-02 | Every legacy financial/reporting URL permanently redirects (308, `next.config.ts` `redirects()`) to its hub equivalent — no 404s, no proxy.ts involvement | §Redirect Mechanics (execution order VERIFIED, `permanent:true`→308 VERIFIED from build artifact, exact-match semantics VERIFIED, ordering is a non-issue); §The 7-Entry Map |
| RPTHUB-03 | Tier-gating on premium report exports (`export-report` `PREMIUM_REPORT_TYPES`) verified intact after consolidation — no route rewrite bypasses the gate | §Tier Gate Ground Truth (sets verified identical; gate keys on `reportType` not path → structurally immune to a path move); §Finding G3 (`ExportButtons` is a gated CTA the UI-SPEC missed) |
| RPTHUB-04 | E2E coverage exists for hub routes before legacy routes are removed | §E2E Reality Check (CI runs 3 projects only; `owner` project gates nothing); §Wave Sequencing for D-11 |
| ~~DOCS-01~~ | **MOVED TO PHASE 65** (2026-07-26 split). `/documents` renders a real landing page instead of a bare redirect. Research retained under §Documents Landing — **PHASE 65**. | Not a Phase 56 requirement. No Phase 56 plan, task, wave or test may claim it. |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

Directives the planner must verify compliance against. All are load-bearing for this phase.

| # | Directive | Where it bites in Phase 56 |
|---|-----------|---------------------------|
| ZT-1 | No `any` types — use `unknown` with type guards | New redirect-map module, hub entry data array |
| ZT-2 | **No barrel files / re-exports** — never create `index.ts` that re-exports | Tempting for the 8-entry hub data array — put it in a named module (`reports-hub-entries.ts`), not an `index.ts` |
| ZT-4 | No commented-out code — delete it | Deleting 7 routes: delete, do not comment |
| ZT-5 | No inline styles | New tiles |
| ZT-7 | No emojis in code — Lucide Icons | UI-SPEC's lucide icons for the 8 hub tiles |
| ZT-9 | **No string literal query keys** — always `queryOptions()` factories from `src/hooks/api/query-keys/` | *(Phase 65: recent-documents list MUST use `documentSearchQueries.list()`.)* No new query key in Phase 56 |
| ZT-10 | No `@radix-ui/react-icons` — `lucide-react` sole icon library | — |
| ARCH | **Server Components by default**; `'use client'` only for hooks/event handlers/browser APIs | `/reports/page.tsx` is a Server Component (UI-SPEC). *(`/documents/page.tsx` is Phase 65.)* |
| ARCH | Max 300 lines per component, 50 lines per function | Merged `/reports/analytics` page — current source is 250 lines, target adds more |
| ARCH | Mutations invalidate related query keys + `ownerDashboardKeys.all` | No new mutations in this phase |
| TEST | Vitest 4 + jsdom, **80% coverage threshold enforced via lefthook pre-commit** | Every new component needs a test or coverage drops |
| TEST | `vi.hoisted()` for any mock variable referenced in `vi.mock()` | Applied only to the deleted nav-resolver test (`usePathname` mock). **No longer bites** — the existing `main-nav.test.tsx` already mocks `usePathname` correctly and needs no new resolver cases (D-07 revision) |
| TEST | `.rejects.toMatchObject({ message: expect.stringContaining(...) })` — never `.rejects.toThrow('string')` (chai 6 bug) | Any error-path test |
| TEST | Skipped tests: investigate and fix; never leave `.skip` permanently | `reports-gate.spec.ts` currently `test.skip`s on 200 — see Open Question 2 |
| GIT | **NEVER push directly to main.** Feature branch → push → `gh pr create` | — |
| GIT | Never use `--no-verify` | — |
| A11Y | Icon-only buttons need `aria-label`; `text-muted-foreground` not `text-muted`; `bg-background` not `bg-white` | New tiles |
| A11Y | Breadcrumb `<nav>` requires `aria-label="Breadcrumb"` | Already present at `app-shell-header.tsx:54` |
| DB | **All `amount` columns store dollars as `numeric(10,2)`** | Merged analytics page must not reintroduce a `* 100` (the v8.0 MONEY-01/02 100× class bug) |
| WORKFLOW | Perfect-PR merge gate: two consecutive zero-finding review cycles | — |
| CFG | Path aliases `#` must exist in BOTH `tsconfig.json#paths` AND `package.json#imports` | New modules use existing aliases only — no new alias needed |

**No CLAUDE.md directive conflicts with any locked decision.** One directive *reinforces* a
UI-SPEC requirement: ZT-9 makes the "reuse `documentSearchQueries.list`" instruction mandatory,
not merely preferred.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Legacy URL → hub URL translation | **Build config** (`next.config.ts` `redirects()`) | — | Executes at step 2, before Proxy (step 3) and before filesystem (step 5). No runtime code, no DB, no auth dependency. RPTHUB-02 mandates this tier explicitly. |
| Auth gating of hub routes | **Frontend server** (`src/proxy.ts`) | — | Unchanged. Proxy already gates `/reports` via `PRIVATE_ROUTE_PREFIXES`. Phase adds no proxy logic. |
| Hub index rendering | **Frontend server** (RSC) | — | Static markup, zero data (D-04). Server Component with no client boundary. |
| Hub sub-route rendering | **Browser / client** | Frontend server (layout metadata) | **All 7 moved pages are `"use client"`**; their `metadata` lives in sibling `layout.tsx` Server Components. |
| ~~Documents landing shell~~ | — | — | **PHASE 65.** |
| ~~Recent-documents data~~ | — | — | **PHASE 65.** |
| Premium export entitlement | **Edge Function** (Deno) | Database (`users.subscription_*`) | `checkTierEntitlement` in `_shared/tier-gate.ts` reads `users.subscription_status/_plan`. Server-side 402 is the sole gate (D-13). |
| Premium affordance labelling | **Browser / client** (static constant) | — | Static `PREMIUM_REPORT_SLUGS`; the hub index cannot fetch tier (D-04). Label only, never an enforcement point. |
| Nav active-state resolution | **Browser / client** | — | `usePathname()` in `main-nav.tsx`; pure function over the nav item set. |
| Breadcrumb hierarchy | **Browser / client** | — | `generateBreadcrumbs(pathname)`, pure, driven by `LABEL_MAP`. |
| Command palette navigation | **Browser / client** | — | `app-shell.tsx` `commandGroups` — a second route table that must move in lockstep with the nav. |

**Tier-assignment check:** no capability in this phase belongs to a tier other than the one
assigned. The one tier-boundary risk is the premium affordance: putting entitlement *enforcement*
in the client tier would violate D-13. The UI-SPEC already forbids it (static label only, server
402 is sole gate) — the planner must not soften that into a client-side `disabled` prop.

---

## Standard Stack

No new libraries. Every mechanism this phase needs is already vendored and in production use.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.x (docs read at 16.2.12) | `redirects()` in `next.config.ts`, App Router route tree, RSC | Already the framework; `redirects()` already in use with 5 live entries [VERIFIED: `next.config.ts:85-159`, `.next/routes-manifest.json`] |
| `@playwright/test` | in-repo | Redirect + hub-route E2E | `tests/e2e/tests/public/routing-aliases.spec.ts` is the exact existing redirect-assertion precedent [VERIFIED: file read] |
| `vitest` | 4.x | Redirect-map + nav-resolver + gate-drift unit tests | `bun run test:unit` → `vitest --run --project unit` [VERIFIED: `package.json` scripts] |
| `@tanstack/react-query` | in-repo | Recent-documents list via `documentSearchQueries.list` | ZT-9 mandates the `queryOptions()` factory [VERIFIED: `document-search-keys.ts`] |
| `lucide-react` | in-repo | All 20 icons named by the UI-SPEC | Sole icon library (ZT-10) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn primitives in `src/components/ui/` | vendored | `Card`, `Item`, `Badge`, `Button`, `Empty`, `Skeleton`, `Separator`, `Breadcrumb` | All present — UI-SPEC verified. Zero registry fetches. |
| `@testing-library/react` + `userEvent` | in-repo | Nav resolver 6-case pinning | `main-nav.test.tsx` already uses this exact setup [VERIFIED: file read] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `next.config.ts` `redirects()` | `proxy.ts` `NextResponse.redirect` | **Forbidden by RPTHUB-02.** Also strictly worse: runs at step 3 (after config redirects), costs a middleware invocation per request, and cannot be statically inspected in `routes-manifest.json`. |
| `next.config.ts` `redirects()` | Leaving `page.tsx` files that call `permanentRedirect()` | **Forbidden by D-09.** Config redirects short-circuit at step 2, before the filesystem (step 5) — the page would be unreachable dead code. Verified by docs: "Redirects are checked before the filesystem which includes pages and `/public` files." |
| Inline 7-entry array in `next.config.ts` | Extracted `src/lib/seo/reporting-redirects.ts` module | **Use the extracted module.** `next.config.ts` imports `./src/env` (build-time env validation) and performs an async network fetch — it is not importable from a Vitest unit test. The precedent already exists: `blog-redirects.ts` is a pure, separately-unit-tested module spread into `redirects()`. |
| A wildcard `source: "/financials/:path*"` | 6 explicit 1:1 entries | **Forbidden by D-10** and independently hazardous: verified that `:path*` matches the bare prefix too, reintroducing the ordering-shadow problem that exact sources structurally eliminate. A `/analytics/:path*` wildcard is worse still under the corrected scope — it would swallow all six surviving analytics routes. |

**Installation:** none. **Zero new npm dependencies** (v10.0 positioning invariant; UI-SPEC
"Registry Safety").

**Version verification:** Next.js docs fetched live report `version: 16.2.12`,
`lastUpdated: 2026-07-22` (redirects page) and `2026-05-13` (proxy page). [VERIFIED: nextjs.org]

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.**

No `npm install`, no `bun add`, no registry fetch, no shadcn block fetch. The slopcheck gate is
not triggered because there is no package to check. If any plan in this phase proposes a new
dependency, that is a scope error (CONTEXT.md "Out of scope"; UI-SPEC "Zero new npm runtime
dependencies").

---

## Redirect Mechanics (RPTHUB-02) — Open Question 1

### Execution order — RPTHUB-02's "no proxy.ts involvement" is structural, not conventional

Official Next.js 16.2.12 documentation, `proxy.js` API reference, §"Execution order"
[CITED: nextjs.org/docs/app/api-reference/file-conventions/proxy]:

```
1. headers          from next.config.js
2. redirects        from next.config.js   ← this phase
3. Proxy            (rewrites, redirects, etc.)   ← src/proxy.ts, untouched
4. beforeFiles      rewrites
5. Filesystem routes (public/, _next/static/, pages/, app/)
6. afterFiles       rewrites
7. Dynamic Routes
8. fallback         rewrites
```

And from the `redirects` reference [CITED: nextjs.org/docs/app/api-reference/config/next-config-js/redirects]:
> "Redirects are checked before the filesystem which includes pages and `/public` files."

**Consequences the planner can rely on:**

1. **A request to a legacy URL never reaches `src/proxy.ts`.** RPTHUB-02 is satisfied by the
   mechanism itself. No proxy edit, no proxy exclusion, no `PUBLIC_ROUTES` entry needed.
2. **Redirects fire for unauthenticated users too.** An anon GET `/financials/cash-flow` returns
   308 → `/reports/cash-flow` at step 2, *then* a second request hits proxy and 307s to `/login`.
   This is the behaviour that makes a **`public`-project E2E spec able to assert every redirect
   with no credentials** — see Open Question 3.
3. **Deleting the old `page.tsx` is mandatory (D-09), and leaving it is invisible.** Step 2
   short-circuits before step 5, so a surviving legacy page would never render and would never
   fail a test — it would rot silently.
4. Route group `(owner)` never appears in a URL. All `source`/`destination` values are the public
   paths (`/financials/...`, `/reports/...`).

### Source matching — VERIFIED from this repo's own build artifact

`.next/routes-manifest.json` (product of a real `next build` of this project):

| `source` | compiled `regex` | `statusCode` |
|---|---|---|
| `/:path+/` (auto-injected by Next) | `^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))/$` | 308 |
| `/signup` | `^(?!/_next)/signup(?:/)?$` | **308** |
| `/terms-of-service` | `^(?!/_next)/terms-of-service(?:/)?$` | 308 |
| `/.well-known/change-password` | `^(?!/_next)/\.well-known/change-password(?:/)?$` | 307 (`permanent:false`) |

[VERIFIED: `.next/routes-manifest.json`]

Four load-bearing facts fall out:

- **`permanent: true` emits 308.** Confirmed empirically, not just from docs. Google treats 308 as
  301 for ranking transfer (the pattern the existing `/support`→`/help` comment already relies on).
- **A literal `source` is an EXACT match** — anchored at both ends (`^...$`). `/analytics` compiles
  to `^(?!/_next)/analytics(?:/)?$` and therefore **cannot** match `/analytics/financial`.
- **Trailing slashes are handled for free** (`(?:/)?`), and Next additionally injects a `/:path+/`
  → `/:path+` 308 as the *first* redirect. A request to `/financials/cash-flow/` takes two hops:
  308→`/financials/cash-flow`, then 308→`/reports/cash-flow`. **E2E must assert on the
  slash-less form** or `location` will be the intermediate value.
- **`/_next` is auto-excluded**, so RSC/asset requests are never caught.

Cross-checked against Next's bundled matcher:

```
$ node -e "const {pathToRegexp}=require('next/dist/compiled/path-to-regexp'); ..."
/analytics             => /^\/analytics[\/#\?]?$/i        MATCHES: /analytics
/financials            => /^\/financials[\/#\?]?$/i       MATCHES: /financials
/analytics/:path*      => /^\/analytics(?:\/(...))?[...]$/i
                                                          MATCHES: /analytics
                                                          MATCHES: /analytics/financial
```
[VERIFIED: executed against `node_modules/next/dist/compiled/path-to-regexp`]

### Ordering: a non-issue for this map, a real hazard only under wildcards

CONTEXT.md flags "ORDERING semantics when one path is a prefix of another (e.g. `/analytics` vs
`/analytics/financial`) — a wrong order silently shadows entries."

**Finding: with the D-10 1:1 exact map, no two `source` patterns can match the same pathname, so
array order is semantically irrelevant.** The shadowing hazard exists *only* if a `:path*`,
`:path+`, or `(.*)` pattern is introduced — verified above that `/analytics/:path*` matches both
`/analytics` and `/analytics/financial`.

**Prescription:** never introduce a wildcard in this map, and encode the invariant as a test rather
than a comment (see Validation Architecture, VU-2). Order the array for human readability
(grouped by legacy tree, longest-path-first within each group) purely as a review aid.

### `has` / `missing` conditions — not needed

`has`/`missing` gate a redirect on a header, cookie, query, or host. Every entry here is an
unconditional 1:1 URL move for all users, all tiers, all auth states. Adding a condition would
break the SEO contract (a crawler without the cookie would see a different response).
**Do not use `has`/`missing`.** Query strings pass through automatically
[CITED: redirects docs — "any query values provided in the request will be passed through"], so
`/analytics/occupancy?year=2025` correctly lands on `/reports/analytics/occupancy?year=2025`.

`basePath` and `locale` are not configured in this project — no interaction.

### The 7-entry map — REVISED 2026-07-26 (supersedes the 13-entry map)

Two independent reductions land on the same table:

1. **The UI-SPEC's flat-slug decision** (`/reports/generate` and `/reports/year-end` keep their exact
   current paths) turns D-03's re-slot entries into **identity no-ops**. `source === destination` is
   an infinite redirect loop and **must not be emitted**. *(This is D-19's original reasoning and it
   still stands. 2026-07-30: `/reports/analytics` is no longer part of this set — it is deleted and
   becomes map entry 7.)*
2. **The D-05 revert** removes the non-financial `/analytics/*` entries. Those routes are not
   moving, so emitting a redirect for any of them would 308 a working URL into a `/reports/*` path
   that will never exist — silently deleting a surviving product section from the URL space.
   *(2026-07-30: full separation extends this to **all seven** `/analytics/*` routes, including
   `/analytics/financial`.)*

| # | `source` | `destination` | Note |
|---|----------|---------------|------|
| 1 | `/financials` | `/reports` | Section root → hub index. Drops the accounts-receivable figure — see Finding M2; D-20 ports it. |
| 2 | `/financials/balance-sheet` | `/reports/balance-sheet` | |
| 3 | `/financials/cash-flow` | `/reports/cash-flow` | |
| 4 | `/financials/expenses` | `/reports/expenses` | |
| 5 | `/financials/income-statement` | `/reports/income-statement` | |
| 6 | `/financials/tax-documents` | `/reports/tax-documents` | Gated CTA (`generate-pdf`, `financial`) |
| 7 | ~~`/analytics/financial`~~ → **`/reports/analytics`** | ~~`/reports/analytics`~~ → **`/analytics/overview`** | **INVERTED 2026-07-30 (S2-3).** See below. |

All seven are `permanent: true` → **308**.

> **⚠ ENTRY 7 INVERTED (2026-07-30, full separation — D-32).** The row above is struck through
> because the direction reversed, not because the count changed.
>
> | | Was (2026-07-26) | Is (2026-07-30) |
> |---|---|---|
> | source | `/analytics/financial` | **`/reports/analytics`** |
> | destination | `/reports/analytics` | **`/analytics/overview`** |
> | direction | into the hub | **out of the hub** |
>
> **`/analytics/financial` stays live and is NOT redirected** — under full separation it is a
> destination, not a legacy URL. **`/reports/analytics` is deleted** and points out.
>
> **Why the target is `/analytics/overview` and not `/analytics`:** `src/app/(owner)/analytics/page.tsx`
> is `redirect("/analytics/overview")`, so targeting `/analytics` yields a 308 → 307 chain on every
> legacy hit. Target the concrete route.
>
> **This is the only redirect in the phase pointing away from `/reports`.** The map module's own
> comment must say so, or someone will "correct" it later on the assumption that all arrows point
> at the hub.

### The two non-emitting guards — both are `ERR_TOO_MANY_REDIRECTS`/route-loss hazards

**Guard A — identity no-ops. REVISED 2026-07-30: 3 paths, down from 4. NOT emitted; would loop.**
`/reports`, `/reports/generate`, `/reports/year-end`.
These keep their current paths (flat slugs), so a D-03-literal re-slot entry would be
`source === destination` — `ERR_TOO_MANY_REDIRECTS` on routes that work today.
**`/reports/analytics` LEFT this guard set** — it is now map entry 7 and must 308.

**Guard B — REVISED TWICE. 2026-07-26: the six unmoved `/analytics/*` routes. 2026-07-30: SEVEN,
because `/analytics/financial` joins them. NOT emitted; they are not moving at all.**
`/analytics`, **`/analytics/financial`**, `/analytics/leases`, `/analytics/maintenance`,
`/analytics/occupancy`, `/analytics/overview`, `/analytics/property-performance`.
These are not identity no-ops — they are simply **out of the map**. Emitting any of them would 308 a
live, unchanged product section into a `/reports/*` URL that will not exist.

Both guards are testable and both must be tested — see §Validation Architecture. **Guard B is by
far the more dangerous, and `/analytics/financial` is its single highest-risk member:** a stale
`/analytics/financial → /reports/analytics` entry left over from the 2026-07-26 map does not loop,
is a literal (not a wildcard), and passes both the identity guard and the literal-source guard — it
just silently 308s a live page into a URL that will not exist, **and then entry 7 would bounce it
back out**, producing a chain that ends nowhere useful. The unit-level source-array **equality**
assertion (not a subset check) is the only structural defence.

Total assertions: **7 positive + 3 Guard A + 7 Guard B = 17.**

> **`/analytics` specifically:** the pre-correction map sent it to `/reports/analytics/overview`
> because `analytics/page.tsx` is a 4-line `redirect("/analytics/overview")`. That entry is
> **deleted**. The in-page `redirect()` stays exactly as it is — it is a filesystem-step redirect
> inside a surviving tree, not a config redirect, and this phase does not touch it. It is also the
> reason map entry 7 targets `/analytics/overview` rather than `/analytics`.

**No redirect for `/documents`** — that whole surface is **Phase 65**; Phase 56 emits nothing for
it, and D-15 keeps `/documents/vault` canonical with no redirect either.

The roadmap's "~15 routes", CONTEXT's "~21 redirect entries" and the pre-correction "13" all
resolve to **7**. Record the reconciliation so the verifier does not read 7 as a shortfall.

---

## Non-Route Reference Map (Open Question 2)

Exhaustive grep of `src/`, `tests/`, `scripts/`, `public/` for `/financials`, `/analytics`,
`/reports`, `/documents` string literals, excluding the route trees themselves.

> **REVISED 2026-07-26.** This inventory was built when all of `/analytics/*` was moving and DOCS-01
> was in phase. It is reduced below to **what actually changes now**: the `/financials*` hrefs and
> the single `/analytics/financial` href. Rows that mattered only because of the reverted D-05 or
> the split-out DOCS-01 are kept and marked **NO LONGER APPLICABLE** rather than deleted, so the
> reduction is auditable.
>
> **Re-verified against the working tree this session** — the full `/financials` and
> `/analytics/financial` greps below are executed results, not carried forward.

### MUST change — will point at a redirect or break a test

| # | File | What | Severity |
|---|------|------|----------|
| N1 | `src/components/shell/main-nav.tsx` | `analyticsItems` (:53-86) **3 sections → 2**: the `Financials` section (:75-85, root `/financials` + 4 children) is **removed** and its items re-home under `Reports`; the `Analytics` section's `Financial` child (**:60**, `/analytics/financial`) is the D-08 cross-link — retarget to `/reports/analytics` or drop it. **Six legacy hrefs total.** The `Analytics` root (`/analytics`) and its `Overview` / `Property Performance` children **stay exactly as they are**. | **BLOCKING** |
| N1a | *(same file)* `isActive` (:188-191) | **NO LONGER APPLICABLE — DELETED.** The longest-prefix-wins resolver existed only because the original D-07 pointed both nav hrefs into `/reports`. With `Reports → /reports` and `Analytics → /analytics` there is **no prefix overlap**, so the existing `startsWith` is already correct. Do not touch this function, and do not add the 6 pinned active-state cases. | ~~BLOCKING~~ **out of scope** |
| N2 | **`src/components/shell/app-shell.tsx`** | **Cmd+K `commandGroups` (:93-175) — a SECOND complete route table.** **Six hrefs change:** the five `/financials*` entries (:145, :148, :151, :154, :159) and the one `/analytics/financial` entry (:115). The palette has **no** `/financials/expenses` entry — that is why 6 sources in the redirect map map to 5 palette rows. The five surviving `/analytics/*` palette entries (`overview`, `property-performance`, `leases`, `maintenance`, `occupancy`) **stay**. | **BLOCKING — not in UI-SPEC** |
| N3 | `src/lib/breadcrumbs.ts` | `LABEL_MAP`: **remove `financials` (:25)**; add `expenses` (new `/reports/expenses` segment). **`analytics` (:12) MUST STAY** — the tree survives. The `vault` / `templates` / `rental-application` / `property-inspection` / `maintenance-request` / `tenant-notice` additions are **PHASE 65**. **`year-end` IS required** (restored): `/reports/year-end` is an in-scope hub route in the Exports group, and without a `LABEL_MAP` entry it breadcrumbs as "Year-end" rather than "Year-End" — UI-SPEC §Copywriting pins the capitalised form. The route not *moving* does not put it out of scope; it is part of the hub this phase ships. | BLOCKING |
| N4 | `src/lib/__tests__/breadcrumbs.test.ts` | **Only the 4 `/financials/*` assertion blocks (:63-92) change.** The `/analytics` (:41) and `/analytics/property-performance` (:52-58, :157) assertions are **NO LONGER APPLICABLE as changes — they must keep passing untouched** and are now a useful regression pin that the analytics tree really did survive. | BLOCKING |
| N5 | `src/components/shell/__tests__/main-nav.test.tsx` | `:135`, `:162`, `:318` use a `/financials/i` accessible-name matcher against the section being removed. `:76` (`Documents` href) and `:205` (`/documents/lease-template`) are **PHASE 65**. **Does NOT gain the 6 pinned active-state cases** (see N1a). | BLOCKING |
| N6 | `src/lib/routes/private-routes.ts` | **REVISED — remove EXACTLY ONE line: `"/financials"` (:12).** `"/analytics"` (:8) **MUST STAY** — the tree survives and is auth-gated. Removing it would un-gate six live owner routes in **both** `proxy.ts` (:5) and `robots.ts`. This is the single highest-consequence line in the corrected diff; see §Security Domain. | **BLOCKING (security)** |
| N7 | `tests/e2e/tests/constants/routes.ts` | **1 of 7** `ANALYTICS_*` keys changes: `ANALYTICS_FINANCIAL` (:56) → the `/reports/analytics` target. The other six (`ANALYTICS`, `_OVERVIEW`, `_LEASES`, `_MAINTENANCE`, `_OCCUPANCY`, `_PROPERTY_PERFORMANCE`) **stay**. All 4 `FINANCIALS_*` keys (:63-66) change; add `REPORTS_*` equivalents (note the constants file has no `FINANCIALS_EXPENSES` key today). | BLOCKING |
| N8 | `tests/e2e/tests/owner/owner-financials.e2e.spec.ts` | Iterates `ROUTES.FINANCIALS_*` (4 pages × 3 tests). Retarget to `/reports/*`. Note: **this spec does not run in CI** — see Open Question 3 / D-25. | BLOCKING |
| N9 | `src/app/(owner)/analytics/financial/page.tsx` | `detailsHref="/financials/income-statement"` (:152), `detailsHref="/financials/expenses"` (:171). Retarget during the D-06 merge. | BLOCKING |
| N10 | `src/app/(owner)/analytics/financial/_components/breakdown-list.test.tsx` | `:27, :32` pin `/financials/income-statement`. Moves with the merge. | BLOCKING |

**Complete `/analytics/financial` reference set (executed grep, excluding its own tree):** exactly
three — `app-shell.tsx:115`, `main-nav.tsx:60`, `tests/e2e/tests/constants/routes.ts:56`. There is
no fourth caller anywhere in `src/` or `tests/`.

### SHOULD change — cosmetic / dead reference, no functional break

| # | File | What |
|---|------|------|
| N11 | `src/lib/__tests__/auth-redirect.test.ts` | Uses `"/financials"` as a sample post-login redirect target (:33, :62, :83). Test still passes (it is opaque string plumbing) but names a dead route. Swap to `/reports`. |
| ~~N12~~ | `src/hooks/api/use-owner-dashboard-financial.ts:95` | **NO LONGER APPLICABLE.** The comment references `/analytics/overview`, which **is not moving**. Leave it exactly as it is. |

### VERIFIED SAFE — no change needed

| Surface | Evidence |
|---------|----------|
| `src/app/sitemap.ts` | grep for `financials\|analytics\|reports\|documents` → **zero matches**. Owner routes are never in the sitemap (they are auth-gated). |
| `public/llms.txt` / llms route | zero matches. |
| Marketing pages, footer, pricing, blog | zero matches outside `src/app/(owner)/` and `src/components/shell/`. |
| `src/app/robots.test.ts` | Iterates `PRIVATE_ROUTE_PREFIXES` from the source module rather than duplicating it — the drift guard **auto-follows N6** with no edit. [VERIFIED: `robots.test.ts:7,31`] |
| `src/components/maintenance/maintenance-view.client.tsx:119` | `router.push("/reports/analytics")` — target path is unchanged by this phase. |
| **The six surviving `/analytics/*` routes and every file under them** | **NEW under the D-05 revert.** `/analytics/{leases,maintenance,occupancy,overview,property-performance}` and `/analytics/page.tsx` keep their URLs, their `layout.tsx` metadata, their components and their tests. Nothing in that subtree is edited, moved or deleted by Phase 56. |
| External importers of the deleted trees | grep for `#app/(owner)/analytics` / `#app/(owner)/financials` from outside those directories → **zero**. The trees are self-contained. |

### Structural facts about the move — REVISED for the reduced scope

- **7 `page.tsx` + 7 `layout.tsx` move or are deleted** (was 17 + 14):
  `financials/` index + `{balance-sheet, cash-flow, expenses, income-statement, tax-documents}`
  = 6 pages + 6 layouts, plus `analytics/financial/` = 1 page + 1 layout.
  ~30 supporting components travel with them. [VERIFIED: `find` over both trees this session]
- **All 7 moving pages are `"use client"`.** [VERIFIED: `head -1` on each]. Each `layout.tsx` exists
  solely to `export const metadata = ownerPageMetadata(...)` because a client component cannot
  export `metadata`. The four Server-Component pages the original inventory counted
  (`/analytics/page.tsx` and `/analytics/{leases,maintenance,occupancy}/page.tsx`) are all in the
  **surviving** tree and are not touched.
- **`financials/page.tsx` + `financials/layout.tsx` are DELETED, not moved.** `/reports` already has
  a `layout.tsx`, and the hub index REPLACES `/reports/page.tsx`. The one figure that dies with the
  `/financials` index is accounts receivable — D-20 ports it (Finding M2).
- **`/reports/analytics`, `/reports/generate`, `/reports/year-end` have NO `layout.tsx`** — they
  inherit `/reports/layout.tsx`'s "Reports" metadata. **REVISED count: 5 layouts arrive with the
  statements pages** (they already exist under `financials/` and must travel), plus optionally one
  for `/reports/analytics` (bringing `analytics/financial/layout.tsx` across fixes that page's
  generic "Reports" tab title). **Not 10 new layout files** — that number assumed the six analytics
  sub-routes were moving too.
- **`refreshable-analytics.tsx` and `refresh-button.tsx` live at `src/app/(owner)/analytics/` root**
  and are imported **only** by `analytics/financial/page.tsx` [VERIFIED: executed grep — the sole
  importers are that page and `refreshable-analytics.tsx` importing `refresh-button.tsx`]. They
  must relocate with the merge or the merged page loses its refresh affordance — **and, now that
  `/analytics` survives, moving them out of the analytics root takes nothing away from the
  surviving tree.** That is a fact the planner would otherwise have to re-derive.

### Finding X1 (NEW, created by the D-05 revert) — there is no rendered `/analytics` index

The revised D-08 says the `/analytics` index survives and "its financial entry becomes a cross-link
pointing at the hub." The index does not render anything to hang that on:

```tsx
// src/app/(owner)/analytics/page.tsx — the entire file
import { redirect } from "next/navigation";

export default function AnalyticsIndexPage() {
	redirect("/analytics/overview");
}
```
[VERIFIED: file read this session]

So the D-08 cross-link has exactly two real homes, and the planner must choose deliberately:

1. **`main-nav.tsx:60`** — the `Financial` child under the `Analytics` section. Retargeting it to
   `/reports/analytics` keeps the familiar label pointing at the moved page. This one is
   effectively mandatory: leaving it at `/analytics/financial` means every nav click takes a 308.
2. **`/analytics/overview`** — the de-facto index that `/analytics` redirects to. A card or link
   here is what actually serves "owners who learned the old location still find it," since that is
   the page they land on.

**What the planner must NOT do:** convert `/analytics/page.tsx` into a rendered index just to host
the cross-link. That is new IA the corrections did not ask for, and it would change the observable
behaviour of a route this phase is supposed to leave alone. Placement is UI composition, resolved
at plan time; the constraint is that option 1 is not optional and `/analytics/page.tsx` stays a
4-line redirect.

---

## E2E Reality Check (RPTHUB-04) — Open Question 3

### The finding that changes the plan

`.github/workflows/ci-cd.yml` `e2e-smoke` runs exactly:

```
bunx playwright test --config tests/e2e/playwright.config.ts \
  --project=smoke --project=public --project=owner-axe
```
[VERIFIED: `.github/workflows/ci-cd.yml:162`]

Mapped against `playwright.config.ts` project definitions [VERIFIED: file read]:

| Project | In CI | `testMatch` | Auth |
|---------|:---:|-------------|------|
| `smoke` | **yes** | `**/smoke/**/*.spec.ts` | none |
| `public` | **yes** | `**/public/**/*.spec.ts`, `**/*public*.spec.ts` | none (explicit empty storageState) |
| `owner-axe` | **yes** | **explicit 3-file allowlist**: `dashboard-a11y`, `dashboard-smoke`, `notifications` | in-test `loginAsOwner` |
| `owner` | **NO** | `**/owner/**/*.spec.ts` | `setup-owner` storageState |
| `chromium` / `firefox` / `mobile-chrome` / `setup-owner` | **NO** | — | storageState |

**Therefore: a new spec dropped into `tests/e2e/tests/owner/` gates nothing.**
`owner-financials.e2e.spec.ts` and `reports-gate.spec.ts` have never run in CI. RPTHUB-04's "E2E
coverage exists" is only substantive if the coverage lands somewhere CI executes.

The config file records the precedent explicitly, in a comment on the `owner-axe` `testMatch`:

> "Phase 52 notification-stack smoke — self-authenticates via `loginAsOwner` (no storageState), so
> it gates the PR under CI's `--project=owner-axe` e2e-smoke run rather than only matching the
> non-CI `chromium` project."

### What RPTHUB-04 concretely requires

Two specs, in two different CI-reachable homes, for two different reasons.

**Spec A — `tests/e2e/tests/public/reporting-redirects.spec.ts` (project `public`, no auth).**
Works unauthenticated because config redirects execute at step 2, before proxy auth at step 3.
Follows `routing-aliases.spec.ts` verbatim: `page.request.get(src, { maxRedirects: 0 })`, assert
`[301,308]).toContain(status())` and `headers().location` equals the destination exactly.
**REVISED count: 7 positive assertions + 10 negative ones** — 4 identity paths (Guard A) and
**6 unmoved `/analytics/*` routes (Guard B)** must each prove they do **not** 301/308.

**Spec B — hub-route render coverage (project `owner-axe`).** Must self-authenticate via
`loginAsOwner` (no storageState) and be **added to the `owner-axe` `testMatch` array** —
adding the file alone is insufficient. **REVISED count: 9 hub routes** — `/reports` (index) +
`/reports/{balance-sheet, cash-flow, expenses, income-statement, tax-documents}` +
`/reports/analytics` + `/reports/generate` + `/reports/year-end`. (8 tiles + the index itself.)
Asserts each renders: not redirected to `/login`, no "Something went wrong" error boundary,
expected `<h1>`. **Not 13** — the six analytics routes are not hub routes any more.

### Wave sequencing that satisfies D-11 without a broken commit

D-11 says "build the hub → E2E-cover the hub routes → only then add redirects and delete legacy
files." Spec A cannot pass before the redirect map exists (it asserts redirects), so it belongs
with the map. Spec B is the one that must land first. The correct decomposition:

| Wave | Lands | Invariant held at end of wave |
|------|-------|-------------------------------|
| **W0** | Test scaffolding: `reporting-redirects.ts` module skeleton + its unit test, `owner-axe` `testMatch` extension, `ROUTES` additions | Suite green; no behaviour change |
| **W1** | Hub routes built at `/reports/*` (copies, not moves); nav + Cmd+K + breadcrumbs retargeted | **Both** old and new URLs render. Nothing 404s. Nav points at the new hub; the `Analytics` section still points at `/analytics`. |
| **W2** | **Spec B** — hub-route render coverage (9 routes), green in CI | Hub proven *before* anything is deleted. RPTHUB-04 satisfied here. |
| **W3** | D-06 merge into `/reports/analytics` (vocabulary guard, `analytics-stats-row` card removal, `refreshable-analytics` relocation, D-21 paywall fix, D-22 single period control) | Merged page proven by W2's spec + the ported pinning test |
| **W4** | Redirect map (7 entries) + **Spec A** + delete 7 pages / 7 layouts + the **one-line** `private-routes.ts` cleanup + test retargets (N4, N5, N7, N8, N11) | Legacy URLs 308; hub was already proven in W2; `/analytics` untouched throughout |

**REVISED:** the `/documents` landing has left W1 and Spec B — it is **Phase 65**, which runs its
own W0-W4. Nothing in Phase 56's wave plan may reference it.

**The load-bearing property:** W1 duplicates rather than moves, so at no commit boundary does a
legacy route disappear before its replacement is proven. W4 is the only wave that deletes, and it
runs after W2's proof. A plan that merges W1 and W4 violates D-11 even if the final state is
identical.

### CI budget constraints the planner must respect

`playwright.config.ts`: `maxFailures: 1`, `retries: 2` in CI, `workers: 2`, `timeout: 30_000` per
test; the `e2e-smoke` job has `timeout-minutes: 15` and CI runs a full `next build` before serving.
Spec A is request-only (cheap — 17 HTTP round-trips: 7 positive + 10 guard, no rendering). Spec B
does **9** authenticated page loads and is the expensive one; keep it to one `describe` with a
shared login and assert on `h1` presence rather than deep content, or it will eat the budget. The
corrected scope makes both specs cheaper than the pre-correction plan, not more expensive.

---

## Tier Gate Ground Truth (RPTHUB-03) — Open Question 4

### The two sets are identical — no drift

```ts
// supabase/functions/export-report/index.ts:24     (checked :72)
// supabase/functions/generate-pdf/index.ts:31      (checked :322)
const PREMIUM_REPORT_TYPES: ReadonlySet<string> = new Set([
  "year-end", "1099", "financial", "income-statement", "cash-flow",
]);
```
Both files read; the 5 members and their order are byte-identical. D-12's "confirm the two sets
have not already drifted" → **they have not.** [VERIFIED: both source files read this session]

`generate-pdf`'s comment at :26 documents *why* the mirror exists: "generate-pdf's Mode 1
(structured report data via `{reportType, year}`) bypasses export-report entirely, so the same gate
has to live here. Modes 2 (raw HTML) and 3 (lease preview) are not gated."

### Why the gate is structurally immune to this phase

**The gate keys on `reportType` — a query param / request-body value — never on the URL path.**

- `export-report`: `const reportType = url.searchParams.get("type") ?? "financial"`
- `generate-pdf`: `body.reportType`

This phase changes **only** Next.js page paths. It touches neither
`src/hooks/api/query-keys/report-keys.ts` (which builds
`.../functions/v1/export-report?type=${reportType}&...` at :198 and POSTs to
`.../generate-pdf` at :239) nor `src/components/shared/export-buttons.tsx`. Moving
`/financials/tax-documents` → `/reports/tax-documents` cannot change the `type=` value the page
sends.

Additionally, **`next.config.ts` declares no `rewrites()` at all** — `redirects()` is the only
routing hook [VERIFIED: grep]. D-13's "no route rewrite may bypass the gate" is vacuously true and
grep-provable.

### Proving it locally without `E2E_OWNER_*` — three layers, honestly scoped

`reports-gate.spec.ts` cannot be the answer: it lives in the non-CI `owner` project **and**
`test.skip`s when the response is 200 (paid tier). It is a weak gate today.

| Layer | What it proves | Runs where | Needs secrets |
|-------|---------------|-----------|:---:|
| **Unit (drift guard)** | The two `PREMIUM_REPORT_TYPES` sets are set-equal, and the frontend `PREMIUM_REPORT_SLUGS` badge constant is a faithful projection | Vitest `unit` project, lefthook pre-commit | **no** |
| **Unit (call-site pinning)** | `report-keys.ts` still sends `type=year-end` / `reportType:"financial"` etc. — i.e. the values did not change during the move | Vitest `unit` | **no** |
| **E2E (402 path)** | An actual free-tier 402 with `upgrade_url` | `owner` project — **not in CI** | yes |

**Implementation note for the drift guard:** read the two Deno files from disk with `node:fs` and
regex-extract the set literal. They cannot be `import`ed (Deno-only `.ts` specifiers, `npm:`/URL
imports, `Deno.serve`). Precedent for a source-reading, bidirectional drift guard exists in
`src/app/robots.test.ts`, which imports the source-of-truth arrays rather than duplicating them
precisely so that additions *and* removals both fail.

**Honest limitation, state it in VERIFICATION.md:** the live 402 response cannot be exercised
without `E2E_OWNER_*` and a free-tier fixture. RPTHUB-03 says "verified intact **after
consolidation**" — the drift guard plus the call-site pinning fully cover the delta this phase
introduces. The pre-existing untestability of the 402 path is not a regression this phase creates.

### Finding G3 — a gated CTA the UI-SPEC's table does not list

`src/components/shared/export-buttons.tsx` POSTs to `export-report` with body
`{format, filename, payload, sheetName, title}` and **no `type` query param** (:59-71).
`export-report` reads `url.searchParams.get("type") ?? "financial"` → **`reportType` defaults to
`"financial"`**, which **is** a `PREMIUM_REPORT_TYPES` member. **The gate fires.**

`ExportButtons` has exactly one usage in the codebase:
`src/app/(owner)/analytics/financial/page.tsx:103` — the **D-06 merge source**. So the merged
`/reports/analytics` page inherits a genuinely tier-gated export CTA.

Two consequences:

1. **The UI-SPEC's tier-gate table is incomplete.** It marks the `Analytics → Financial →
   /reports/analytics` hub tile "—" (no Growth badge) on the stated rule "only surfaces whose CTA
   provably reaches a gated `reportType`." By that rule's own logic this tile qualifies. See Open
   Question 1 below — this is a factual correction for the planner to route, not a design
   re-decision for research to make.
2. **It is a second, divergent paywall path.** `ExportButtons` handles the 402 via
   `createApiErrorFromResponse(response, ApiErrorCode.FINANCIAL_EXPORT_FAILED)` (:74-80) — **not**
   `PaywallError`. A free-tier owner gets a generic "export failed" error instead of the
   "Upgrade required" → "See plans" toast rail that `report-keys.ts:148` provides. The UI-SPEC
   states "The hub must not introduce a second paywall pattern" — the merge *imports* one that
   already exists. Flag in VERIFICATION.md; fixing it is arguably out of scope ("this phase moves
   and consolidates, it does not repair capability"), but shipping it unnoted would misrepresent
   RPTHUB-03 as fully green.

### Corroborated UI-SPEC gate findings

| Surface | Edge call | `reportType` | Gated | Evidence |
|---------|-----------|--------------|:---:|---------|
| `/reports/year-end` — Download PDF | `generate-pdf` | `year-end` | yes | UI-SPEC; consistent with `report-keys.ts:239` |
| `/reports/tax-documents` — Download PDF | `generate-pdf` | `financial` | yes | UI-SPEC |
| **`/reports/analytics` — ExportButtons** | **`export-report`** | **`"financial"` (default)** | **yes** | **This research — `export-buttons.tsx:59-71` + `export-report/index.ts` default** |
| `/reports/generate` — PDF/Excel | none (client `jspdf`/`sheetjs`) | n/a | no | UI-SPEC |
| `/reports/{income-statement,cash-flow}` — Export button | none (**no `onClick` at all**) | n/a | no | UI-SPEC checker correction — dead button, moves as-is |
| `downloadYearEndCsv` / `download1099Csv` (`report-keys.ts:268,276`) | `export-report` | gated | yes | **wired to no UI** — unexercised gate path. Note, do not fix. |

---

## Merge Cost Analysis (D-06) — Open Question 6

D-06 asked the planner to read both pages because "they may already overlap heavily, which
determines how much merging is real work vs deletion."

**Verdict: they do not overlap. Zero shared data sources, zero shared components. The merge is
real work and deserves its own plan.** *(Locked as D-26.)*

> **Rescope note (2026-07-26):** D-06 is **unchanged** by the D-05 revert — `/analytics/financial`
> was always the one page RPTHUB-01 named, and it still merges into `/reports/analytics`. What
> changed is its weight: with the other six analytics routes staying put, this merge is now the
> **entire** `/analytics` footprint of Phase 56 and the single largest piece of work in it. The
> "Wrapper" row below reads "lives in the deleted tree" — under the corrected scope
> `refreshable-analytics.tsx` / `refresh-button.tsx` live in a **surviving** tree but are imported
> only by this page [VERIFIED], so relocating them still costs the surviving section nothing.

| | `/analytics/financial` (source) | `/reports/analytics` (target) |
|---|---|---|
| Lines | ~250 | ~115 |
| Data hooks | `analyticsQueries.financialPageData()`, `analyticsQueries.ownerPaymentSummary()` | `useMonthlyRevenue(n)`, `usePaymentAnalytics()`, `useOccupancyMetrics()` (`#hooks/api/use-reports`) |
| Child components | 11: `FinancialOverviewStats`, `OwnerPaymentSummary`, `RevenueExpenseChart`, `BreakdownList`×2, `NetOperatingIncomeChart`, `LeaseTable`, `BillingTimelineChart`, `InvoiceSummaryList`, `ExportButtons`, `FinancialAnalyticsSkeleton` | 5: `AnalyticsStatsRow`, `AnalyticsRevenueChart`, `AnalyticsPaymentMethodsChart`, `AnalyticsOccupancyChart`, `AnalyticsPropertyTable` |
| Wrapper | `RefreshableAnalytics cooldownSeconds={30}` (lives in the deleted tree) | none |
| Period control | none (fixed) | `Select` 6 / 12 / 24 months |
| Motion | `BlurFade` on ~9 blocks | none |
| Error state | inline card + `window.location.reload()` | none |
| D-18 compliance | **compliant** — Scheduled / Collected with tooltips + pinning test | **non-compliant** — "Total Revenue" card, `name="Revenue"` series |

**Semantic (not code) overlap:** revenue-over-time (`RevenueExpenseChart` vs
`AnalyticsRevenueChart`); payments (`OwnerPaymentSummary` vs `AnalyticsPaymentMethodsChart` +
payment-success stat). Occupancy exists only in the target; NOI / lease profitability / billing
timeline / invoice summary only in the source.

**What the merge actually costs:** relocate 13 files under `analytics/financial/` plus
`refreshable-analytics.tsx` and `refresh-button.tsx`; reconcile two independent period controls
(a fixed-window source against a 6/12/24 `Select`); decide the fate of the target's occupancy and
payment-method charts; retarget two `detailsHref` values (N9) and their pinning test (N10);
execute the Inherited Vocabulary Guard; and keep the result under the 300-line component ceiling
(the source alone is 250). **Budget this as a standalone plan, not a task inside the hub-build
plan.**

### Finding M2 — the `/financials` index diff the UI-SPEC required

UI-SPEC: *"Planner must diff `financials-summary-stats.tsx` against `financial-overview-stats.tsx`
and confirm no unique figure is dropped."* Done:

| `financials-summary-stats.tsx` (`/financials` index) | `financial-overview-stats.tsx` (merged page) | Survives? |
|---|---|---|
| **Total Revenue** (`get_financial_overview.total_revenue`) | Scheduled + Collected (two labelled figures) | superseded (a D-18 win — see below) |
| Total Expenses | *(expenses appear via the Net Income derivation)* | yes, indirectly |
| Net Income | Net Income (`:123`) | **yes** |
| profit margin % | `metrics.profitMargin` rendered in the Net Income card's `StatTrend`, labelled "profit margin" (`:133,137,141`) | **yes** |
| **Outstanding / accounts receivable** | **absent** | **NO** |

**Exactly one figure is dropped by deleting the `/financials` index: accounts receivable.**
[VERIFIED: full `receivable|Outstanding|margin` sweep of `financial-overview-stats.tsx` — profit
margin survives at `:141`, accounts receivable appears nowhere.] D-04 forbids putting it on the hub
index. **Resolved by D-20: it is PORTED into the hub, not dropped** — the natural home is
`/reports/analytics`, which already renders data. The hub tile count (8) is unaffected; the A/R
card is a figure on a route, not a tile.

**Bonus D-18 win:** `financials-summary-stats.tsx` renders a `<StatLabel>Total Revenue</StatLabel>`
sourced from `get_financial_overview.total_revenue` — a **fourth** independent revenue derivation
(alongside Scheduled, Collected, and `paymentAnalytics.totalRevenue`). Deleting the `/financials`
index removes it for free. Record it as a D-18 improvement, not an accident.

---

## Documents Landing (DOCS-01) — **PHASE 65, NOT PHASE 56**

> **MOVED 2026-07-26 by the phase split.** Everything in this section belongs to **Phase 65 —
> Documents Landing**: the three-band ladder, the six tiles, the nested recent-documents panel, the
> `/documents/vault`-canonical decision (D-15), and the reversed `permanentRedirect` (D-17).
> Phase 56 and Phase 65 share **no code, no routes and no tests**.
>
> The research below is **retained verbatim and still valid** — it is Phase 65's inheritance, and
> it is left here rather than deleted so the split does not throw away verified work. Phase 56's
> planner must treat this entire section as out of scope: no wave, no task, no test, no redirect
> entry, and no nav/Cmd+K change in Phase 56 may reference it.
>
> **Phase 56 emits nothing for `/documents`.** `main-nav.tsx` `coreItems` keeps
> `Documents → /documents/vault`; the Cmd+K `Navigation` and `Templates` groups keep their
> `/documents/*` hrefs; `documentItems` keeps the Templates section; `LABEL_MAP` gets no
> `vault`/`templates`/template-slug entries. All of that is 65's diff.

### The "same cache entry" guarantee — VERIFIED

The UI-SPEC's structural anti-drift claim checks out against the live call site.
`src/components/documents/documents-vault.client.tsx:230-238`:

```ts
useQuery(documentSearchQueries.list({
  ...(queryParam    ? { query: queryParam }        : {}),
  ...(entityType    ? { entityType }               : {}),
  ...(categories.length > 0 ? { categories }       : {}),
  ...(fromParam     ? { from: fromParam }          : {}),
  ...(toParam       ? { to: toParam }              : {}),
  page: pageParam,
}))
```

In the vault's default unfiltered state every spread is empty and `pageParam === 0`, so the
argument reduces to **exactly `{ page: 0 }`** — literally the call the UI-SPEC prescribes for the
landing's recent list. Same factory → same key → same `search_documents` RPC → same `mapDocumentRow`
→ same cache entry. [VERIFIED: file read]

Practical consequence the planner should know: the landing's list is served from cache with **zero
extra network requests** whenever the owner has recently visited the vault, and vice versa. It also
means the landing inherits the vault's `LIST_STALE_TIME_MS = 45min` / `LIST_GC_TIME_MS = 55min`
[VERIFIED: `document-search-keys.ts:27-28`] — a document uploaded elsewhere may not appear for up
to 45 minutes unless the mutation invalidates `documentSearchQueries.all()`. Not a defect
introduced by this phase (the vault already behaves this way), but it should not surprise the
verifier.

Error handling: `handlePostgrestError` is already imported by the factory
(`document-search-keys.ts:17`), satisfying the UI-SPEC's "never a raw PostgREST string."

### The `permanentRedirect` reversal (D-17)

Current `src/app/(owner)/documents/page.tsx` is 11 lines: a `permanentRedirect("/documents/vault")`
plus a comment asserting *"the redirect is permanent — there's no plan to bring back a /documents
index."* Replace the file and carry a short comment recording that **DOCS-01 superseded** that
decision, so the reversal reads as deliberate rather than as someone forgetting.

Note this is an **in-page** `permanentRedirect` (step 5, filesystem), not a config redirect — so
deleting it is sufficient; no redirect-map entry needs removing.

---

## Architecture Patterns

### System Architecture Diagram

```
                        ┌──────────────────────────────────────────┐
  Browser request  ───▶ │ 1. headers()          next.config.ts      │
  (legacy or hub URL)   └──────────────────────────────────────────┘
                                       │
                        ┌──────────────▼───────────────────────────┐
                        │ 2. redirects()        next.config.ts     │
                        │    ← src/lib/seo/reporting-redirects.ts  │◀── 7-entry pure module
                        │      (spread, exactly like blog-redirects)│    (unit-tested)
                        └──────────────┬───────────────────────────┘
                          match?       │
                    ┌── YES ───────────┴──── NO ──────────────┐
                    ▼                                          ▼
         308 Location: /reports/…              ┌──────────────────────────────┐
         (proxy NEVER runs — RPTHUB-02)        │ 3. Proxy  src/proxy.ts       │
                    │                          │    PRIVATE_ROUTE_PREFIXES     │
                    │ browser re-requests       │    auth + subscription gate  │
                    └──────────────────────────▶│    (UNCHANGED this phase)    │
                                               └──────────────┬───────────────┘
                                            authed + active/trialing
                                                              ▼
                                       ┌─────────────────────────────────────┐
                                       │ 5. Filesystem — app/(owner)/…       │
                                       └──────────────┬──────────────────────┘
                        ┌─────────────────────────────┼──────────────────────────┐
                        ▼                             ▼                          ▼
            ┌───────────────────────┐   ┌──────────────────────────┐  ┌────────────────────┐
            │ /reports  (RSC)       │   │ /reports/<sub>           │  │ /analytics/*       │
            │ 8 static tiles        │   │ layout.tsx = metadata    │  │ UNTOUCHED — its    │
            │  5 Statements         │   │ page.tsx  = "use client" │  │ own section (6     │
            │  1 Analytics          │   │                          │  │ routes keep their  │
            │  2 Exports            │   │                          │  │ URLs). D-05        │
            │ + D-20 A/R card       │   │                          │  │ REVERTED.          │
            │ NO data, NO hooks     │   │                          │  │ Cross-links to     │
            │ (D-04, grep-checkable)│   │                          │  │ /reports/analytics │
            └───────────┬───────────┘   └────────────┬─────────────┘  └────────────────────┘
                        │ <Link> only                │ TanStack Query
                        │                            ▼
                        │                 ┌────────────────────┐   /documents landing is
                        │                 │ Supabase PostgREST │   PHASE 65 — not on this
                        │                 │  + RPCs (RLS)      │   diagram any more
                        │                 └────────────────────┘
                        │
                        │  export CTA (year-end / tax-documents / analytics)
                        └────────────────────────┐
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │ Edge Fn: export-report       │
                                  │          generate-pdf        │
                                  │  PREMIUM_REPORT_TYPES gate   │
                                  │  keyed on reportType, NOT    │
                                  │  on URL path → immune to     │
                                  │  this phase's path moves     │
                                  └──────────────┬───────────────┘
                                                 │ free tier
                                                 ▼
                                    402 { upgrade_url } → PaywallError
                                    → sonner "Upgrade required"
                                    ⚠ ExportButtons path diverges:
                                      FINANCIAL_EXPORT_FAILED (Finding G3)
```

### Recommended Project Structure

```
src/
├── lib/seo/
│   ├── blog-redirects.ts              # existing precedent — do not touch
│   └── reporting-redirects.ts         # NEW: 7-entry pure map + type
├── lib/__tests__/  (or src/lib/seo/__tests__/)
│   └── reporting-redirects.test.ts    # NEW: shape + no-wildcard + no-identity + no-unmoved-analytics
├── app/(owner)/reports/
│   ├── layout.tsx                     # existing
│   ├── page.tsx                       # REWRITE → Server Component, 8 tiles, no data
│   ├── reports-hub-entries.ts         # NEW: data array (NOT an index.ts — ZT-2)
│   ├── report-hub-tile.tsx            # NEW: uniform tile (adapted QuickLinkCard, no value/trend)
│   ├── income-statement/{layout,page}.tsx      # moved from financials/
│   ├── cash-flow/ balance-sheet/ expenses/ tax-documents/   # moved from financials/
│   ├── analytics/
│   │   ├── page.tsx                   # MERGED (D-06): financial source into this target
│   │   ├── layout.tsx                 # from analytics/financial/layout.tsx (fixes generic title)
│   │   ├── _components/               # moved from analytics/financial/_components/
│   │   └── refreshable-analytics.tsx  # relocated from analytics/ root (+ refresh-button.tsx)
│   ├── generate/                      # unchanged path; absorbs the old /reports index content
│   └── year-end/                      # unchanged path
├── app/(owner)/analytics/             # SURVIVES UNTOUCHED (D-05 reverted) — 6 routes:
│   ├── page.tsx  layout.tsx           #   index (4-line redirect to /overview) — do not edit
│   └── {overview,property-performance,occupancy,leases,maintenance}/{layout,page}.tsx
└── components/shell/
    ├── main-nav.tsx                   # nav items only — isActive/startsWith UNCHANGED
    └── app-shell.tsx                  # Cmd+K commandGroups, 6 hrefs (N2)

# NOT in Phase 56 — app/(owner)/documents/* is PHASE 65

tests/e2e/tests/
├── public/reporting-redirects.spec.ts # NEW — project `public`, runs in CI (7 + 10 guard)
└── a self-auth spec added to the owner-axe testMatch  # 9 hub routes
```

### Pattern 1: Extracted, unit-testable redirect map

**What:** Keep the map in a pure module; `next.config.ts` spreads it.
**When to use:** Any redirect set large enough to warrant a test — i.e. this one.
**Why:** `next.config.ts` imports `./src/env` (throws on missing env) and performs an async
`fetch`. It is not importable from Vitest. The project already solved this once.

```ts
// src/lib/seo/reporting-redirects.ts
// Source: mirrors the established pattern in src/lib/seo/blog-redirects.ts

export interface ReportingRedirect {
	readonly source: string;
	readonly destination: string;
}

// Phase 56 (RPTHUB-02). /financials/* and /analytics/financial collapse into /reports/*.
// SEVEN entries. The rest of /analytics/* is NOT here on purpose: those six routes keep
// their URLs and remain their own section (D-05 reverted 2026-07-26). Adding one back
// would 308 a live section into a /reports/* URL that does not exist.
// EVERY entry is a literal 1:1 source (D-10). Next compiles a literal source to a
// both-ends-anchored regex (^(?!/_next)/financials(?:/)?$), so no entry can shadow
// another and array order is irrelevant. Introducing a `:path*` wildcard would break
// that invariant — reporting-redirects.test.ts fails the build-adjacent test if one
// is ever added.
export const REPORTING_REDIRECTS: readonly ReportingRedirect[] = [
	{ source: "/financials", destination: "/reports" },
	{ source: "/financials/balance-sheet", destination: "/reports/balance-sheet" },
	{ source: "/financials/cash-flow", destination: "/reports/cash-flow" },
	{ source: "/financials/expenses", destination: "/reports/expenses" },
	{ source: "/financials/income-statement", destination: "/reports/income-statement" },
	{ source: "/financials/tax-documents", destination: "/reports/tax-documents" },
	{ source: "/analytics/financial", destination: "/reports/analytics" },
];
```

```ts
// next.config.ts — inside async redirects(), appended to the existing array
...REPORTING_REDIRECTS.map((r) => ({
	source: r.source,
	destination: r.destination,
	permanent: true, // 308 — verified in .next/routes-manifest.json
})),
```

### ~~Pattern 2: Longest-prefix-wins nav resolver~~ — **DELETED 2026-07-26. The problem dissolved.**

**Superseded by the D-07 revision.** This pattern existed for exactly one reason: the original D-07
pointed **both** nav hrefs into the same tree (`Reports → /reports` and `Analytics →
/reports/analytics`), so `main-nav.tsx`'s `isActive` (:188) / `startsWith` (:190) lit up **both**
entries — and emitted two `aria-current="page"` — on every `/reports/analytics/*` path.

The corrected D-07 makes the two entries `Reports → /reports` and `Analytics → /analytics`.
**Neither href is a prefix of the other, so no pathname can ever match both.** The existing resolver
is already correct for the corrected nav:

```ts
// main-nav.tsx:188-191 — UNCHANGED BY THIS PHASE. Do not edit.
const isActive = (href: string) => {
	if (href === "/dashboard") return pathname === "/dashboard";
	return pathname.startsWith(href);
};
```

**Explicitly out of scope:** the resolver rewrite, the segment-boundary (`href + "/"`) hardening,
the `/reports` vs `/reports-archive` latent-bug fix, and the **6 pinned active-state test cases**.
Do not carry any of them forward as a "while we're here" fix — the corrected phase has no nav
active-state work at all. A diff that touches `isActive` is out of scope for Phase 56.

### Anti-Patterns to Avoid

- **Wildcard redirect sources.** `/financials/:path*` violates D-10 *and* reintroduces prefix
  shadowing (verified: it matches the bare `/financials` too). Use 7 literals.
- **Emitting an identity redirect.** `/reports/generate` → `/reports/generate` is an infinite
  loop. The UI-SPEC's flat slugs make four of D-03's anticipated entries identities — drop them.
- **Emitting a redirect for an unmoved `/analytics/*` route.** *(NEW — the D-05 revert.)* Any of
  `/analytics`, `/analytics/{leases,maintenance,occupancy,overview,property-performance}` in the
  map 308s a live, unchanged section into a `/reports/*` URL that will not exist. It does not loop,
  so it will not trip the identity guard — it just deletes six routes from the URL space silently.
- **Rewriting the nav `isActive` resolver.** *(NEW — the D-07 revision.)* There is no prefix overlap
  between `/reports` and `/analytics`; the existing `startsWith` is correct. Out of scope.
- **Redirecting in `proxy.ts`.** Forbidden by RPTHUB-02; also strictly worse (runs later, costs an
  invocation, invisible in `routes-manifest.json`).
- **Keeping a legacy `page.tsx` "just in case."** Step 2 short-circuits before step 5 — the file
  is unreachable and will never fail a test. D-09.
- **Fetching subscription tier on `/reports`.** Violates D-04 and turns a static RSC into a client
  page. The badge is a static constant.
- **Client-side `disabled` on a gated CTA.** Violates D-13; the 402 is the sole gate.
- ~~**A second document query on the landing.**~~ **PHASE 65.**
- **Moving pages without their `layout.tsx`.** All 7 moving pages are `"use client"` and cannot
  export `metadata`; the sibling layout is the only thing carrying the page title.
- **Updating `main-nav.tsx` but not `app-shell.tsx`.** The project has already been burned by
  exactly this — see the comment at `app-shell.tsx` recording the prior review catch.
- **Touching anything under `src/app/(owner)/analytics/` other than `financial/`.** *(NEW.)* The
  six surviving routes, their layouts, their components and their tests are all out of scope.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Legacy URL → hub URL | A `proxy.ts` branch, a client-side `useEffect` redirect, or `permanentRedirect()` pages | `next.config.ts` `redirects()` + extracted map module | RPTHUB-02 mandates it; runs at step 2 before everything; emits a real 308 crawlers honour; statically inspectable |
| Trailing-slash normalization | A custom `/foo/` → `/foo` entry | Next's auto-injected `/:path+/` redirect | Already first in `routes-manifest.json` |
| Query-string preservation across a redirect | Manual `?` re-appending in `destination` | Nothing — it is automatic | Documented: "any query values provided in the request will be passed through" |
| ~~Recent-documents fetch~~ | — | — | **PHASE 65** (`documentSearchQueries.list({ page: 0 })`, ZT-9 + D-14) |
| ~~Signed-URL download from the recent list~~ | — | — | **PHASE 65** |
| Tier enforcement in the hub | A client tier check, a route guard, a proxy rule | The existing edge-function 402 | D-13; `checkTierEntitlement` already writes `gate_events` for conversion analytics |
| Paywall UX | A new modal/banner | Existing `PaywallError` → sonner "Upgrade required" → `/billing/plans?source=reports_gate` | `report-keys.ts:148`; a second pattern is a UI-SPEC violation (and one already leaks in — Finding G3) |
| Breadcrumb hierarchy for new routes | A per-page breadcrumb prop | `generateBreadcrumbs(pathname)` + `LABEL_MAP` additions | Already derives from pathname; only the map needs entries |
| Redirect-map regression protection | A hand-maintained duplicate list in the test | Import `REPORTING_REDIRECTS` into the test and assert invariants over it | `robots.test.ts` precedent — importing the source catches additions **and** removals; duplicating catches only one direction |

**Key insight:** every mechanism this phase needs already exists in this repo with a working
precedent — `blog-redirects.ts` for the map, `routing-aliases.spec.ts` for redirect E2E,
`robots.test.ts` for the bidirectional drift guard, `notifications.spec.ts` for getting a spec into
CI. The failure mode for this phase is not "couldn't build it"; it is "missed a reference" (N2),
"wrote a test that never runs" (the `owner` project), or — new since the correction — **"moved
something that was supposed to stay"** (the six `/analytics/*` routes, `PRIVATE_ROUTE_PREFIXES`
`/analytics`, N12).

---

## Runtime State Inventory

This is a refactor/rename-class phase (route paths move, files are deleted), so the inventory is
required. Answered explicitly per category.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| **Stored data** | **None.** No table, column, RPC, or stored value contains `/financials` or `/analytics` as a path string. Verified: no migration in `supabase/migrations/` references these route paths; the phase adds no migration (CONTEXT: "no DB migrations"). | none |
| **Live service config** | **None.** These are auth-gated owner routes: absent from `sitemap.ts` (grep: 0 matches), absent from `llms.txt` (0 matches), absent from marketing surfaces. No Vercel rewrite/redirect rules exist outside `next.config.ts` (`vercel.json` carries CSP only). No n8n/Datadog/Cloudflare object references these paths. | none |
| **OS-registered state** | **None.** No cron job, scheduled task, pm2 process, or systemd unit references a reporting route. | none |
| **Secrets / env vars** | **None.** No env var names a route path. `E2E_OWNER_EMAIL`/`E2E_OWNER_PASSWORD` gate the E2E job but are route-agnostic. | none |
| **Build artifacts** | **`.next/` is stale.** `routes-manifest.json` currently encodes the pre-phase redirect set. Also `playwright/.auth/owner.json` storageState is regenerated by `setup-owner`. Neither is committed. | none — `playwright.config.ts` already does `rm -rf .next` before both dev and CI server start |
| **Bookmarks / external inbound links** *(the real "runtime state" here)* | Owner browser bookmarks and in-app deep links to the **7** legacy URLs. Not enumerable. Bookmarks to the six surviving `/analytics/*` routes need nothing at all — those URLs still work. | **This is exactly what the 308 map exists to serve** — the reason D-10 demands 1:1 exactness rather than a group-level redirect |

**Net: this phase has no runtime-state migration.** The entire "old value still cached somewhere"
surface is browser bookmarks, and the redirect map is the mitigation. That is a genuinely low-risk
profile relative to a typical rename phase — worth stating so the planner does not invent
migration tasks.

---

## Common Pitfalls

### Pitfall 1: The second route table (Cmd+K) ships stale
**What goes wrong:** `main-nav.tsx` is updated, tests pass, review passes — and Cmd+K still lists
"Financial Analytics → /analytics/financial" plus the five `/financials*` entries (**6 hrefs**).
They 308 rather than 404, so nothing visibly breaks, which is precisely why it survives review.
**Why it happens:** `app-shell.tsx` `commandGroups` (:93-175) is a hand-maintained duplicate of the
nav with no shared source and no test.
**How to avoid:** Treat N1 and N2 as one atomic task. `app-shell.tsx` carries a comment recording
that a previous review caught this exact class of miss for the Lease Template entry — cite it in
the task so the reviewer knows to look.
**Warning signs:** a diff that touches `main-nav.tsx` without touching `app-shell.tsx`.

### Pitfall 2: RPTHUB-04 "satisfied" by a spec CI never runs
**What goes wrong:** A thorough hub spec lands in `tests/e2e/tests/owner/`, passes locally, and
gates nothing. Legacy routes are then deleted behind a green PR that never executed the proof.
**Why it happens:** CI runs `--project=smoke --project=public --project=owner-axe`; the `owner`
project is not in the list, and `owner-axe` uses an explicit 3-file allowlist rather than a glob.
**How to avoid:** Redirect assertions → `tests/e2e/tests/public/`. Authenticated hub-render
coverage → self-authenticate via `loginAsOwner` **and add the filename to the `owner-axe`
`testMatch` array**. Verify by running the exact CI command locally.
**Warning signs:** a new `owner/*.spec.ts` with no `playwright.config.ts` diff beside it.

### Pitfall 3: An identity redirect creates an infinite loop
**What goes wrong:** D-03 says the three existing `/reports/*` URLs "ALSO need redirect entries."
Taken literally against the UI-SPEC's flat slugs, that produces `/reports/generate` →
`/reports/generate` — `ERR_TOO_MANY_REDIRECTS` on a route that worked before the phase.
**Why it happens:** D-03 was written before the slug decision; the two documents are consistent
only once you notice the re-slot is a no-op.
**How to avoid:** Emit 7 entries. Assert `source !== destination` for every entry in the
unit test, and assert the four identity paths do not 301/308 in the E2E spec.
**Warning signs:** a map with more than 7 entries.

### Pitfall 3b (NEW — the D-05 revert): a stale entry silently deletes a surviving section
**What goes wrong:** The pre-correction map's entries 7 and 9-13 (`/analytics` and the five
non-financial analytics views) survive a copy-paste into `reporting-redirects.ts`. Every one of
them 308s a **working, unchanged** route to a `/reports/analytics/*` URL that will never exist.
The owner clicks Analytics → Occupancy and gets a 404 through a redirect.
**Why it happens:** it is the single most natural stale-artifact failure after a scope revert, and
it is invisible to the guards that were designed for the other hazard: it is not an identity
(so `source !== destination` passes) and it is not a wildcard (so the literal guard passes).
**How to avoid:** pin the **exact 7-source array** in the unit test (an equality assertion, not a
subset check, so an *addition* fails too — the `robots.test.ts` bidirectional pattern), and assert
in the E2E `public` spec that all six unmoved `/analytics/*` routes do **not** 301/308.
**Warning signs:** the string `"/analytics/"` appearing anywhere in `reporting-redirects.ts` other
than the single `/analytics/financial` entry.

### Pitfall 4: A wildcard "simplification" reintroduces shadowing
**What goes wrong:** `/financials/:path*` looks like it collapses 6 entries into 1. It also matches
bare `/financials`, and if placed above `/financials/income-statement` it swallows it — silently,
with no build error. Worse under the corrected scope: `/analytics/:path*` would swallow all six
surviving routes along with `/analytics/financial`.
**Why it happens:** Literal sources are exact-match; wildcard sources are prefix-match. The two
look identical in the config.
**How to avoid:** Ban wildcards by test (`expect(source).not.toMatch(/[:*+?()]/)`).
**Warning signs:** a `:` or `*` in any Phase 56 `source`.

### Pitfall 5: The D-06 merge silently regresses LEDGER-07
**What goes wrong:** The compliant source merges into the non-compliant target and the
"Total Revenue" card survives beside "Scheduled"/"Collected" — three differently-derived revenue
figures on one page.
**Why it happens:** The merge direction runs compliant → non-compliant, so "keep what's there" is
the wrong default.
**How to avoid:** Remove the `analytics-stats-row.tsx:48` card outright (it reads
`paymentAnalytics.totalRevenue`, a third derivation — relabelling it to either locked name would
misstate its provenance). Rename `analytics-revenue-chart.tsx:103` `name="Revenue"` →
`"Scheduled"`, and `revenue-expense-chart.tsx:28` `label: "Revenue"` → `"Scheduled"`. Port
`financial-overview-stats.test.tsx` verbatim so the pin travels with the component.
**Warning signs:** the string `Revenue` surviving as a standalone label anywhere under
`src/app/(owner)/reports/analytics/`.

### Pitfall 6: New hub sub-routes lose their page titles
**What goes wrong:** The **5** new statement sub-routes render with the browser tab title "Reports"
because their `layout.tsx` was not moved and they inherit `/reports/layout.tsx`.
**Why it happens:** All 7 moving pages are `"use client"`, so `metadata` lives exclusively in the
sibling layout — and the three pre-existing `/reports/*` sub-routes have no layout at all, which
makes "no layout" look normal.
**How to avoid:** Move all 5 statement layouts (they already exist under `financials/`), and bring
`analytics/financial/layout.tsx` across as `/reports/analytics/layout.tsx`.
**Warning signs:** a moved `page.tsx` with no `layout.tsx` beside it.

### Pitfall 7: Deleting `/financials` silently drops accounts receivable
**What goes wrong:** Accounts receivable exists only on the `/financials` index and has no home on
the merged analytics page. D-04 forbids the hub index carrying data.
**Why it happens:** The phase boundary says "nothing is lost," but the diff was never done.
**How to avoid:** Finding M2 above is the diff (profit margin **does** survive; only A/R is at
risk). D-20 ports it — it is a locked decision, not a judgement call.
**Warning signs:** VERIFICATION.md claiming "nothing lost" without naming accounts receivable.

### Pitfall 8: The 402 arrives as a generic error on the merged page
**What goes wrong:** `ExportButtons` on the merged `/reports/analytics` throws
`FINANCIAL_EXPORT_FAILED` on a 402 instead of `PaywallError` → the owner sees "export failed"
rather than "Upgrade required / See plans." RPTHUB-03 is then reported green while the gate's UX is
broken on the hub.
**Why it happens:** `ExportButtons` predates the `PaywallError` rail and sends no `type` param, so
it is easy to assume it is ungated. It is not — the edge function defaults to `"financial"`.
**How to avoid:** D-21 locks the fix in this phase (catch the 402 in `export-buttons.tsx` and throw
`PaywallError`). Note the outcome in VERIFICATION.md either way.
**Warning signs:** RPTHUB-03 marked complete with no mention of `ExportButtons`.

### Pitfall 9 (NEW — the D-05 revert): over-removing `/analytics` from `PRIVATE_ROUTE_PREFIXES`
**What goes wrong:** The pre-correction plan removed **two** lines from
`src/lib/routes/private-routes.ts` — `/analytics` and `/financials`. Under the corrected scope only
`/financials` goes. Removing `/analytics` un-gates six live owner routes in **both** consumers at
once: `proxy.ts` stops requiring auth for them, and `robots.ts` stops disallowing them to crawlers.
**Why it happens:** the array is alphabetical and the two entries look interchangeable; the diff
reads as symmetric cleanup.
**How to avoid:** delete exactly one line (`"/financials"`, :12). Add a positive assertion that
`/analytics`, `/reports` and `/documents` all remain in `PRIVATE_ROUTE_PREFIXES` — `robots.test.ts`
iterates the array from source, so it auto-follows a **wrong** removal and will not catch it.
**Warning signs:** a `private-routes.ts` diff with more than one deleted line.

---

## Code Examples

### Redirect E2E assertion (project `public`, runs in CI)

```ts
// tests/e2e/tests/public/reporting-redirects.spec.ts
// Source pattern: tests/e2e/tests/public/routing-aliases.spec.ts (verbatim structure)
import { expect, test } from "@playwright/test";
import { REPORTING_REDIRECTS } from "../../../../src/lib/seo/reporting-redirects";

// No auth: next.config redirects execute at step 2, BEFORE proxy auth at step 3
// (Next.js "Execution order"), so an anonymous request sees the 308 directly.
// maxRedirects:0 inspects the redirect response itself rather than following it.
test.describe("RPTHUB-02 — legacy reporting URLs 308 to the hub", () => {
	// 7 positive assertions.
	for (const { source, destination } of REPORTING_REDIRECTS) {
		test(`${source} -> ${destination}`, async ({ page }) => {
			const res = await page.request.get(source, { maxRedirects: 0 });
			expect([301, 308]).toContain(res.status());
			expect(res.headers().location).toBe(destination);
		});
	}

	// Guard A — the four re-slotted-but-unmoved paths must NOT redirect (identity = loop).
	for (const live of ["/reports", "/reports/analytics", "/reports/generate", "/reports/year-end"]) {
		test(`${live} does not redirect`, async ({ page }) => {
			const res = await page.request.get(live, { maxRedirects: 0 });
			expect([301, 308]).not.toContain(res.status());
		});
	}

	// Guard B — D-05 was REVERTED: these six keep their URLs and are not in the map at all.
	// A stale entry here does not loop; it silently 308s a live section into a dead URL.
	for (const kept of [
		"/analytics",
		"/analytics/leases",
		"/analytics/maintenance",
		"/analytics/occupancy",
		"/analytics/overview",
		"/analytics/property-performance",
	]) {
		test(`${kept} is NOT redirected by Phase 56`, async ({ page }) => {
			const res = await page.request.get(kept, { maxRedirects: 0 });
			expect([301, 308]).not.toContain(res.status());
		});
	}
});
```

> Note: hub routes are auth-gated, so the Guard A assertions will see proxy's 307→`/login`.
> Asserting "not 301/308" is the correct, auth-independent invariant — a 307 to `/login` proves
> the request reached proxy, which itself proves no config redirect matched.
>
> **Guard B works for the same reason**, and it keeps working even though `/analytics` itself is a
> filesystem-step `redirect("/analytics/overview")`: that is a **307**, and proxy's `/login` gate
> (also 307) fires first anyway. Both possible responses are outside `[301, 308]`, so the assertion
> is unambiguous — the only way a Guard B path can return 301/308 is if someone put it in the
> redirect map.

### Redirect-map invariants (Vitest `unit`)

```ts
// src/lib/seo/__tests__/reporting-redirects.test.ts
import { describe, expect, it } from "vitest";
import { REPORTING_REDIRECTS } from "../reporting-redirects";

describe("REPORTING_REDIRECTS", () => {
	it("uses only literal sources — a wildcard would reintroduce prefix shadowing", () => {
		// Verified: Next compiles a literal source to ^(?!/_next)/foo(?:/)?$ (exact),
		// but `/foo/:path*` also matches bare `/foo`, so a wildcard placed above a
		// sibling silently swallows it. Literals make array order irrelevant.
		for (const { source } of REPORTING_REDIRECTS) {
			expect(source, `${source} must be a literal path`).not.toMatch(/[:*+?()]/);
		}
	});

	it("never emits an identity redirect (infinite loop)", () => {
		for (const { source, destination } of REPORTING_REDIRECTS) {
			expect(source).not.toBe(destination);
		}
	});

	it("has no duplicate sources", () => {
		const sources = REPORTING_REDIRECTS.map((r) => r.source);
		expect(new Set(sources).size).toBe(sources.length);
	});

	it("targets only the /reports hub", () => {
		for (const { destination } of REPORTING_REDIRECTS) {
			expect(destination === "/reports" || destination.startsWith("/reports/")).toBe(true);
		}
	});

	// Equality, not subset: an ADDED entry fails too (robots.test.ts bidirectional pattern).
	// This is the guard that catches a stale pre-D-05-revert /analytics/* entry.
	it("covers every deleted legacy route exactly once — and nothing else", () => {
		expect(REPORTING_REDIRECTS.map((r) => r.source).sort()).toEqual([
			"/analytics/financial",
			"/financials",
			"/financials/balance-sheet",
			"/financials/cash-flow",
			"/financials/expenses",
			"/financials/income-statement",
			"/financials/tax-documents",
		]);
	});

	// D-05 REVERTED 2026-07-26: /analytics keeps its own section. /analytics/financial is
	// the ONLY analytics route that moves; the other six must never appear as a source.
	it("does not redirect any surviving /analytics route", () => {
		const analyticsSources = REPORTING_REDIRECTS
			.map((r) => r.source)
			.filter((s) => s === "/analytics" || s.startsWith("/analytics/"));
		expect(analyticsSources).toEqual(["/analytics/financial"]);
	});
});
```

### Tier-gate drift guard (Vitest `unit`, no secrets)

```ts
// Deno edge functions cannot be imported by Vitest (Deno.serve, npm:/URL specifiers),
// so read the source and extract the literal. Bidirectional like robots.test.ts:
// both an addition and a removal in either file fail this test.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function premiumTypes(relPath: string): string[] {
	const src = readFileSync(resolve(process.cwd(), relPath), "utf8");
	const block = /PREMIUM_REPORT_TYPES:\s*ReadonlySet<string>\s*=\s*new Set\(\[([\s\S]*?)\]\)/
		.exec(src);
	expect(block, `PREMIUM_REPORT_TYPES not found in ${relPath}`).not.toBeNull();
	return [...block![1]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]!).sort();
}

describe("RPTHUB-03 — premium report gate", () => {
	it("export-report and generate-pdf gate the identical report-type set (D-12)", () => {
		expect(premiumTypes("supabase/functions/export-report/index.ts"))
			.toEqual(premiumTypes("supabase/functions/generate-pdf/index.ts"));
	});

	it("gates the five known premium types", () => {
		expect(premiumTypes("supabase/functions/export-report/index.ts"))
			.toEqual(["1099", "cash-flow", "financial", "income-statement", "year-end"]);
	});
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` at repo root | `proxy.ts` (same level as `app/`) | Next.js **16.0.0** — "Middleware is deprecated and renamed to Proxy. Proxy defaults to the Node.js runtime" | Already migrated (`src/proxy.ts`). Docs/answers referencing `middleware.ts` are stale; the execution-order guarantee is unchanged. |
| Middleware on the Edge runtime | Proxy defaults to **Node.js** runtime; `runtime` config option throws if set | Next.js 16.0.0 | Not touched by this phase, but relevant if anyone proposes moving redirects into proxy — it is now a Node invocation per request, making the config path even more clearly correct. |
| 301/302 for permanent/temporary | **308/307** — method-preserving | Next.js 9.5.0 (`redirects` added) | `permanent: true` → 308. Google treats 308 as 301 for ranking. The existing `routing-aliases.spec.ts` asserts `[301, 308]` to avoid lock-in — keep that tolerance. |
| n/a | `unstable_doesProxyMatch` + `isRewrite`/`getRewrittenUrl` from `next/experimental/testing/server` | Next.js 15.1 | Available for proxy unit tests. **Not needed here** — this phase does not touch proxy, and config redirects are better asserted end-to-end. Noted so the planner does not reach for it. |

**Deprecated / outdated:**
- Anything describing `middleware.ts` — renamed in v16. This project is already on `proxy.ts`.
- Pages-Router guidance that "redirects are not applied to client-side routing" — that caveat is
  scoped to the Pages Router in the current docs. This project is App Router; nonetheless the plan
  updates every internal `<Link href>` (N1, N2, N9) so no client transition depends on a redirect.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| ~~A1~~ | ~~Vercel adds no redirect/rewrite layer ahead of Next's.~~ **RESOLVED — VERIFIED.** `vercel.json` keys are exactly `$schema, framework, buildCommand, installCommand, outputDirectory, headers, trailingSlash, cleanUrls, git`. No `redirects`, no `rewrites`, no `routes`. `trailingSlash: false` agrees with the Next default, and `cleanUrls: true` only affects `.html` extensions (none exist in an App Router build). | Redirect Mechanics | — no longer an assumption |
| A2 | The seeded E2E owner is on a paid tier, so `reports-gate.spec.ts` would `test.skip` even if CI ran the `owner` project. Inferred from the spec's skip branch plus the project memory note that synthetic owners are pinned `active`. | Tier Gate | Low. Only affects how the 402 limitation is described in VERIFICATION.md, not any code decision. |
| ~~A3~~ | ~~`financial-overview-stats.tsx` has no accounts-receivable or profit-margin figure.~~ **RESOLVED — PARTLY FALSE, corrected in Finding M2.** A full `receivable\|Outstanding\|margin` sweep shows **profit margin DOES survive** (`metrics.profitMargin`, `:133,137,141`). Only accounts receivable is dropped. The "two figures" count was wrong; it is **one**. | Finding M2 | — corrected; this is why the assumption was logged |
| A4 | Adding a filename to the `owner-axe` `testMatch` array is sufficient to make CI run it (no additional workflow change). Inferred from the Phase 52 `notifications.spec.ts` precedent — the config comment states this is exactly what was done. | E2E Reality Check | Low. Directly falsifiable by running the CI command locally. |
| A5 | Playwright's `page.request.get("/relative")` resolves against `use.baseURL`. Standard Playwright behaviour and the pattern `routing-aliases.spec.ts` already uses successfully. | Code Examples | Very low. |

**Two of the five assumptions (A1, A3) were resolved before submission; A3 was found to be partly
false and the affected finding was corrected. The three that remain are all low-risk and each names
a one-command falsification.**

**Rescope check (2026-07-26):** none of A1-A5 depends on the scope of the move — they concern
Vercel config, the E2E owner's tier, `owner-axe` `testMatch` mechanics, and Playwright's relative
`request.get`. All five survive the corrections unchanged. Every count that *did* change (7 pages,
7 layouts, 7 redirects, 6 Cmd+K hrefs, 3 `/analytics/financial` referrers, 9 hub routes) was
**re-executed against the working tree during the rescope**, not carried forward from the original
pass — so the reduced inventory rests on evidence at the same confidence as the original.

**Nothing in this research asserts a compliance, retention, security, or performance requirement
from training knowledge.** The two claims that would normally be highest-risk — redirect status
code and middleware ordering — were both verified against primary sources (this repo's own build
artifact, and the live Next.js 16.2.12 docs).

---

## Open Questions

> **Status (2026-07-26):** Q1-Q4 were **answered** by the post-research decisions locked in
> `56-CONTEXT.md` — Q1 by **D-23** (not badged), Q2 by **D-21** (fixed in this phase), Q3 by
> **D-20** (ported into the hub), Q4 by **D-22** (one period control). They are retained below as
> the evidence trail behind those decisions, not as live questions. **Q5 is DISSOLVED** by the
> D-05 revert.

1. **Does the `Analytics → /reports/analytics` hub tile get a `Growth` badge?** — **ANSWERED: no (D-23).**
   - *What we know:* The UI-SPEC's stated rule is "only surfaces whose CTA provably reaches a gated
     `reportType`" get the badge, and its table marks this tile "—". But `ExportButtons` on the
     D-06 merge source POSTs to `export-report` with no `type` param, and the edge function
     defaults `reportType` to `"financial"` — a `PREMIUM_REPORT_TYPES` member. The CTA **is**
     gated. [VERIFIED: `export-buttons.tsx:59-71`, `export-report/index.ts`]
   - *What's unclear:* Whether the UI-SPEC's table omission was an oversight (rule says badge it)
     or a deliberate call that the badge would over-claim, since the merged page is mostly free
     content with one gated export.
   - *Recommendation:* **Route to the user, do not silently decide.** The UI-SPEC is an approved
     contract and this is new evidence against one of its table rows, not a re-litigation of a
     design decision. Recommended answer: **badge it** — the spec's own rule is evidence-based and
     this is evidence. Also decide item 2 below in the same breath, since they concern the same
     CTA.

2. **Is the `ExportButtons` divergent paywall path fixed or explicitly deferred?** — **ANSWERED: fixed (D-21).**
   - *What we know:* It surfaces a 402 as `FINANCIAL_EXPORT_FAILED` ("export failed") rather than
     `PaywallError` → "Upgrade required / See plans". The UI-SPEC says "the hub must not introduce
     a second paywall pattern"; the merge imports a pre-existing one.
   - *What's unclear:* Whether "this phase moves and consolidates, it does not repair capability"
     (the UI-SPEC's own stance on the dead Export buttons) extends to this.
   - *Recommendation:* The fix is small and contained (catch 402 in `export-buttons.tsx` and throw
     `PaywallError`), and shipping RPTHUB-03 as green with a broken gate UX on the hub is a claims-
     integrity problem in a claims-integrity milestone. Recommend **fix**, but flag it as a
     deliberate scope addition for user sign-off. If deferred, it **must** appear in
     VERIFICATION.md, not just in a deferred-ideas list.

3. **Where does accounts receivable go?** — **ANSWERED: ported into the hub (D-20).**
   - *What we know:* It exists only on `financials-summary-stats.tsx` (the `/financials` index
     being deleted). `financial-overview-stats.tsx` has no equivalent. D-04 bars the hub index from
     carrying data. Profit margin, by contrast, **does** survive on the merged page (`:141`) — only
     this one figure is at risk. [VERIFIED]
   - *What's unclear:* Whether losing it is acceptable.
   - *Recommendation:* Planner records an explicit decision. Cheapest compliant option: add it to
     `/reports/analytics` (which already renders data and is where the UI-SPEC says the
     `/financials` summary figures' "surviving home" is). Do **not** let it pass unrecorded — the
     phase boundary promises "nothing lost."

4. **Does the merged `/reports/analytics` keep one period control or two?** — **ANSWERED: one (D-22).**
   - *What we know:* The source has a fixed window plus a 30s-cooldown `RefreshableAnalytics`; the
     target has a 6/12/24-month `Select` feeding `useMonthlyRevenue(n)`. The source's
     `financialPageData()` takes no period argument.
   - *What's unclear:* Whether the merged page shows a `Select` that governs only half the charts —
     a subtle honesty problem (the control appears to scope the page but does not).
   - *Recommendation:* Claude's discretion under "layout/composition," but the honest options are
     (a) keep the `Select` and scope its label to the charts it actually drives, or (b) drop it.
     Silently keeping a page-level control that governs half the page is the one unacceptable
     outcome. Resolve at plan time and record.

5. ~~**Roadmap SC-1 vs D-07: "a single navigation entry" vs two.**~~ — **DISSOLVED 2026-07-26.
   There is no longer a conflict to reconcile, and the reconciliation paragraph is deleted.**
   - With Analytics staying its own section, **Reports IS a single navigation entry** — for
     reporting. SC-1 and RPTHUB-01 are satisfied literally, not by argument: `/financials/*` and
     `/analytics/financial` collapse into one `Reports` entry, and the `Financials` section is gone.
   - The second nav entry (`Analytics → /analytics`) is not a second door into the hub; it is a
     different product surface that SC-1 never spoke about. Do **not** re-introduce the old
     "the URL space consolidates while the sidebar keeps two doors" reconciliation — it described a
     structure that no longer exists and would read as hedging against a requirement this phase now
     meets outright.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `bun` | all scripts | ✓ | 1.3.x (CI pins 1.3.14) | — |
| Node | typecheck / vitest | ✓ | 24.x | — |
| `next` + `path-to-regexp` | redirect compilation; verified empirically this session | ✓ | 16.2.x | — |
| `vitest` | unit tests, drift guard | ✓ | 4.x, `--project unit` | — |
| `@playwright/test` + chromium | E2E | ✓ (CI installs via `bunx playwright install --with-deps chromium`) | in-repo | — |
| `.next/routes-manifest.json` | empirical redirect verification | ✓ (stale build present, used as evidence) | — | regenerate with `next build` |
| `vercel.json` | confirming no platform-level redirect layer | ✓ | — | — (no `redirects`/`rewrites`/`routes` key — verified) |
| **`E2E_OWNER_EMAIL` / `E2E_OWNER_PASSWORD`** | live 402 tier-gate assertion; any authenticated E2E | **✗ locally** (CI-only GitHub secrets) | — | **Unit drift guard + call-site pinning** cover the delta this phase introduces (see Tier Gate §) |
| **`.env.local` app vars** | `bun run dev`, local authenticated E2E | **✗** (known missing; project memory: "never touch `.env.local`") | — | Run redirect E2E against `next build && next start` via the Playwright `webServer`, which sets its own env and does `rm -f .env.local` |
| Supabase CLI `functions deploy` | — | ✗ (known 401) | — | **Not needed — this phase deploys no edge function.** Both gate files are read-only verification targets. |
| Supabase MCP `apply_migration` | — | n/a | — | **Not needed — no migrations in this phase.** |

**Missing dependencies with no fallback:** none that block this phase.

**Missing dependencies with fallback:**
- `E2E_OWNER_*` → the tier-gate 402 cannot be asserted locally. Mitigated by the unit-level drift
  guard and call-site pinning, which is where this phase's actual risk lives (the sets and the
  `type=` values, both of which are static and locally readable).
- `.env.local` → local `bun run dev` fails env validation. The Playwright `webServer` block is
  self-contained (`rm -f .env.local` + inline `SKIP_ENV_VALIDATION=true` + placeholder vars), so
  E2E authoring is unaffected.

---

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` — this section is REQUIRED.

### Test Framework

| Property | Value |
|----------|-------|
| Unit framework | Vitest 4 + jsdom, projects `unit` / `component` / `integration` |
| Unit config file | `vitest.config.ts` (workers derived from `cpus().length - 1`, capped 8) |
| Coverage gate | **80%**, enforced by lefthook **pre-commit** (not CI) |
| E2E framework | Playwright, `tests/e2e/playwright.config.ts` |
| Quick run command | `bun run test:unit` → `vitest --run --project unit` |
| Single file | `bun run test:unit -- --run src/lib/seo/__tests__/reporting-redirects.test.ts` |
| Full local gate | `bun run validate:quick` → `typecheck && lint && test:unit` |
| Typecheck scope | `tsc --noEmit` × 3 (root, `tests/integration`, `tests/e2e`) — **E2E specs are typechecked in CI** |
| E2E full suite | `bunx playwright test --config tests/e2e/playwright.config.ts` |
| **E2E as CI runs it** | `bunx playwright test --config tests/e2e/playwright.config.ts --project=smoke --project=public --project=owner-axe` |

> **Critical:** `bun run test:unit -- <file>` alone fails — the script already injects `--run`, and
> a second `--run` is a CAC duplicate-flag error. Use `-- --run <file>` exactly as shown.

### Phase Requirements → Test Map

> **REVISED 2026-07-26** for the corrected scope. Dropped: the longest-prefix nav rows (problem
> dissolved) and all DOCS-01 rows (Phase 65). Redirect rows now cover 7 entries plus **two**
> non-emitting guards. The authoritative copy of this table is `56-VALIDATION.md`.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RPTHUB-01 | `/reports` index renders **8 tiles** in 3 labelled sections (5 Statements / 1 Analytics / 2 Exports) | component | `bun run test:unit -- --run src/app/(owner)/reports/__tests__/reports-hub.test.tsx` | ❌ Wave 0 |
| RPTHUB-01 | Hub index is a Server Component with **zero** data deps (D-04) | unit (source grep) | `bun run test:unit -- --run src/app/(owner)/reports/__tests__/reports-hub-purity.test.ts` | ❌ Wave 0 |
| RPTHUB-01 | Nav has 2 entries — `Reports → /reports`, `Analytics → /analytics` — and **no `Financials` section** | component | `bun run test:unit -- --run src/components/shell/__tests__/main-nav.test.tsx` | ✅ extend |
| ~~RPTHUB-01~~ | ~~Longest-prefix-wins: one active entry + one `aria-current` across 6 pinned paths~~ | — | **DELETED** — `/reports` and `/analytics` do not overlap; the existing `startsWith` is correct (D-07 revision) | n/a |
| RPTHUB-01 | Cmd+K `commandGroups` contains no `/financials` href and no `/analytics/financial` href — **and still contains the five surviving `/analytics/*` hrefs** | component | `bun run test:unit -- --run src/components/shell/__tests__/app-shell-nav.test.tsx` | ❌ Wave 0 |
| RPTHUB-01 | Breadcrumbs resolve the new `/reports/*` segments; `financials` label gone; **`analytics` label retained** | unit | `bun run test:unit -- --run src/lib/__tests__/breadcrumbs.test.ts` | ✅ retarget |
| RPTHUB-02 | Map invariants: literals only, no identity, no dupes, `/reports`-only targets, **exact 7-source equality** | unit | `bun run test:unit -- --run src/lib/seo/__tests__/reporting-redirects.test.ts` | ❌ Wave 0 |
| RPTHUB-02 | **Guard B (unit):** `/analytics/financial` is the only `/analytics*` source in the map | unit | same file | ❌ Wave 0 |
| RPTHUB-02 | Each of **7** legacy URLs returns 301/308 with exact `location` | **E2E (`public`)** | `bunx playwright test --config tests/e2e/playwright.config.ts --project=public -g "RPTHUB-02"` | ❌ Wave 0 |
| RPTHUB-02 | **Guard A:** the 4 identity paths do **not** redirect (loop guard) | **E2E (`public`)** | same | ❌ Wave 0 |
| RPTHUB-02 | **Guard B (E2E):** the 6 unmoved `/analytics/*` routes do **not** redirect | **E2E (`public`)** | same | ❌ Wave 0 |
| RPTHUB-02 | No proxy involvement: `proxy.ts` unchanged, `next.config.ts` has no `rewrites()`; `PRIVATE_ROUTE_PREFIXES` still contains `/analytics`, `/reports`, `/documents` | unit (source grep) | `bun run test:unit -- --run src/lib/seo/__tests__/reporting-redirects.test.ts` | ❌ Wave 0 |
| RPTHUB-03 | Both `PREMIUM_REPORT_TYPES` sets are set-equal (D-12) | unit (fs read) | `bun run test:unit -- --run supabase/functions/__tests__/premium-report-gate.test.ts` | ❌ Wave 0 |
| RPTHUB-03 | Frontend `PREMIUM_REPORT_SLUGS` is a faithful projection of the gated set | unit | same file | ❌ Wave 0 |
| RPTHUB-03 | Call sites still send the same `type=` / `reportType` values after the move (D-13) | unit | same file | ❌ Wave 0 |
| RPTHUB-03 | `ExportButtons` surfaces a 402 as `PaywallError`, not `FINANCIAL_EXPORT_FAILED` (D-21) | component | `bun run test:unit -- --run src/components/shared/__tests__/export-buttons.test.tsx` | ❌ Wave 0 |
| RPTHUB-03 | Live free-tier 402 + `upgrade_url` | E2E (`owner`) | `--project=owner -g "Reports paywall"` | ✅ `reports-gate.spec.ts` — **manual-only: not in CI, requires `E2E_OWNER_*` + a free-tier fixture** |
| RPTHUB-04 | All **9** hub routes render authenticated (no `/login`, no error boundary, expected `h1`) | **E2E (`owner-axe`)** | `bunx playwright test --config tests/e2e/playwright.config.ts --project=owner-axe -g "hub routes"` | ❌ Wave 0 |
| ~~DOCS-01~~ | ~~4 rows~~ | — | **MOVED TO PHASE 65** (2026-07-26 split) | n/a |
| D-18 | No standalone "Revenue" label under `src/app/(owner)/reports/analytics/`; `Scheduled`/`Collected` present | component + source grep | `bun run test:unit -- --run src/app/(owner)/reports/analytics/_components/__tests__/financial-overview-stats.test.tsx` | ✅ port verbatim |
| D-18 | `analytics-stats-row` no longer renders a "Total Revenue" card | component | `bun run test:unit -- --run src/app/(owner)/reports/analytics/__tests__/analytics-stats-row.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `bun run validate:quick` (`typecheck && lint && test:unit`). Lefthook
  pre-commit independently runs gitleaks, lockfile-verify, lint, typecheck, unit-tests **with the
  80% coverage gate** — never bypass with `--no-verify`.
- **Per wave merge:** `bun run validate:quick` **plus** the exact CI E2E command
  `bunx playwright test --config tests/e2e/playwright.config.ts --project=smoke --project=public --project=owner-axe`.
  Running the real CI project selection is what catches "wrote a test CI never runs."
- **Phase gate:** full unit suite green + full CI E2E selection green + `bun run typecheck`
  (all three tsconfigs — E2E specs are typechecked, so a stale `ROUTES.FINANCIALS_*` reference is a
  hard failure) before `/gsd:verify-work`.
- **Wave-boundary invariant (D-11):** at the end of **W2**, the hub-route E2E spec must be green in
  CI *before* W4 deletes anything. This is a sequencing assertion the verifier should check against
  the commit graph, not just the final state.

### Wave 0 Gaps

- [ ] `src/lib/seo/reporting-redirects.ts` — the map module itself (must exist before its test)
- [ ] `src/lib/seo/__tests__/reporting-redirects.test.ts` — RPTHUB-02 invariants **+ Guard B unit assertion**
- [ ] `supabase/functions/__tests__/premium-report-gate.test.ts` — covers RPTHUB-03 (D-12/D-13)
- [ ] `tests/e2e/tests/public/reporting-redirects.spec.ts` — RPTHUB-02 end-to-end, **project `public`** — 7 positive + Guard A (4) + Guard B (6)
- [ ] Hub-route render spec — covers RPTHUB-04 (**9 routes**), self-authenticating, **must be added to the `owner-axe` `testMatch` array in `playwright.config.ts`** (adding the file alone does not make CI run it)
- [ ] `tests/e2e/tests/constants/routes.ts` — add `REPORTS_*` keys before specs reference them
- [ ] `src/app/(owner)/reports/__tests__/reports-hub.test.tsx` + `reports-hub-purity.test.ts`
- [ ] `src/components/shell/__tests__/app-shell-nav.test.tsx` — first test for the Cmd+K route table (none exists today)
- [ ] `src/components/shared/__tests__/export-buttons.test.tsx` — D-21 `PaywallError` on 402
- [ ] `src/app/(owner)/reports/analytics/__tests__/analytics-stats-row.test.tsx`
- [ ] ~~`src/app/(owner)/documents/__tests__/recent-documents-panel.test.tsx`~~ — **PHASE 65**
- [ ] ~~6 pinned nav active-state cases~~ — **DELETED** (D-07 revision; no prefix overlap to resolve)
- [ ] **No framework install needed** — Vitest and Playwright are both configured and in use.

---

## Security Domain

`security_enforcement` is not disabled in `.planning/config.json`, so this section is included.
This phase moves URLs; it introduces no new data path, no new input, and no new credential.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|:---:|-----------------|
| V2 Authentication | no (unchanged) | Supabase Auth via `@supabase/ssr` `getAll`/`setAll`; `getUser()` for decisions. Untouched. |
| V3 Session Management | no (unchanged) | `updateSession` in `src/lib/supabase/middleware.ts`. Untouched. |
| V4 Access Control | **yes** | Two layers, both unchanged in mechanism: proxy `PRIVATE_ROUTE_PREFIXES` (route gate) and RLS (data gate). **The one real task is N6, and it is now a ONE-LINE change: remove `"/financials"` only.** **REVISED — `"/analytics"` MUST STAY**: under the reverted D-05 that tree is alive, and removing its prefix un-gates six live owner routes in both `proxy.ts` and `robots.ts` simultaneously. `/reports` and `/documents` must remain too. Deleting the wrong line is the highest-consequence mistake available in this phase. |
| V5 Input Validation | marginal | Redirect `source`/`destination` are build-time literals, not user input. No new form, no new query param. |
| V6 Cryptography | no | None in scope. |
| V7 Error Handling & Logging | marginal | *(The recent-documents `handlePostgrestError` path moved to **Phase 65** with DOCS-01.)* Phase 56 adds no new error surface; the D-21 `PaywallError` fix replaces one existing error mapping with the canonical one. |
| V13 API / Web Service | **yes** | Edge-function tier gate (RPTHUB-03) is an authorization control. Verified: keyed on `reportType`, not path — structurally unaffected by this phase. |

### Known Threat Patterns for `next.config.ts` redirects + App Router

| Pattern | STRIDE | Standard Mitigation | Status in this phase |
|---------|--------|---------------------|----------------------|
| **Open redirect** (attacker-controlled `destination`) | Tampering / Spoofing | Only literal, in-app, `/`-prefixed destinations; no user input reaches a `destination` | **Safe by construction.** All 7 destinations are compile-time literals starting `/reports`. The unit test asserts `destination.startsWith("/reports")`, which doubles as an open-redirect guard. |
| **Redirect loop** (identity or cyclic entries) | DoS | Assert `source !== destination`; assert no destination is also a source | **Live risk** — D-03 read literally produces four identity entries. Guarded by the unit test + the E2E Guard A assertions. |
| **Route removed from the URL space by a stale redirect** *(NEW — D-05 revert)* | Denial of Service / availability | Pin the map's source list by equality, and E2E-assert the six surviving `/analytics/*` routes do not 301/308 | **Live risk (Guard B / Pitfall 3b).** A carried-over `/analytics/occupancy → /reports/analytics/occupancy` entry does not loop and is not a wildcard, so the other two guards pass it. Only the equality pin and Guard B catch it. |
| **Auth-gate bypass via routing** | Elevation of Privilege | Redirects run *before* proxy but only ever move a request to another gated in-app path; the destination is re-gated on the follow-up request | **Safe.** A 308 to `/reports/*` is followed by a fresh request that proxy gates normally. Verified via the documented execution order. |
| **Access-control gap from an over-eager cleanup** | Elevation of Privilege | Only remove `PRIVATE_ROUTE_PREFIXES` entries whose route tree is actually deleted | **Live risk (N6) — and MORE dangerous after the correction.** Exactly one line goes (`/financials`). `"/analytics"` **must stay**: its tree survives. `robots.test.ts` auto-follows the array, so it will not catch a *wrong* removal — only a missing robots entry. Add an explicit assertion that **`/analytics`**, `/reports` and `/documents` remain in `PRIVATE_ROUTE_PREFIXES`. |
| **Tier-gate bypass via a rewrite** | Elevation of Privilege | No `rewrites()` anywhere; gate keyed on request payload not path | **Safe and grep-provable.** `next.config.ts` declares no `rewrites()`. |
| ~~**Information disclosure via the recent-documents list**~~ | — | — | **PHASE 65.** No document data path is touched by Phase 56. |
| **Crawler exposure of hub URLs** | Information Disclosure | `robots.ts` disallows every `PRIVATE_ROUTE_PREFIXES` entry | **Safe.** `/analytics`, `/reports` and `/documents` already present and must all stay (see above). |

**No new attack surface is introduced by this phase.** The security-relevant work is entirely
subtractive and entirely in `private-routes.ts`: **remove exactly one entry (`/financials`)** and
pin the survivors — `/analytics` above all — with a positive test.

---

## Sources

### Primary (HIGH confidence)
- **This repository's own build artifact** — `.next/routes-manifest.json`: compiled redirect
  regexes and `statusCode` values. Definitive for `permanent: true` → 308 and exact-match `source`
  semantics.
- **`next/dist/compiled/path-to-regexp`** — executed directly to confirm literal-vs-wildcard
  matching behaviour.
- **nextjs.org/docs/app/api-reference/file-conventions/proxy** (v16.2.12, updated 2026-05-13) —
  §"Execution order" (redirects = step 2, Proxy = step 3), §Matcher path semantics, §Migration to
  Proxy (v16 rename), §Version history.
- **nextjs.org/docs/app/api-reference/config/next-config-js/redirects** (v16.2.12, updated
  2026-07-22) — 307/308 rationale, "checked before the filesystem", path matching, `has`/`missing`,
  query pass-through, `basePath`/`locale`.
- **Source files read this session:** `next.config.ts`, `src/lib/seo/blog-redirects.ts`,
  `src/proxy.ts` (matcher + `PRIVATE_ROUTE_PREFIXES` consumption), `src/lib/routes/private-routes.ts`,
  `src/lib/breadcrumbs.ts`, `src/app/robots.ts`, `src/app/robots.test.ts`,
  `src/components/shell/main-nav.tsx`, `src/components/shell/app-shell.tsx`,
  `src/components/shell/__tests__/main-nav.test.tsx`, `src/app/(owner)/analytics/financial/page.tsx`,
  `src/app/(owner)/reports/analytics/page.tsx`, `src/app/(owner)/reports/analytics/analytics-stats-row.tsx`,
  `src/app/(owner)/reports/page.tsx`, `src/app/(owner)/financials/page.tsx`,
  `src/app/(owner)/financials/financials-summary-stats.tsx`,
  `src/app/(owner)/financials/financials-quick-links.tsx`,
  `src/app/(owner)/analytics/financial/_components/financial-overview-stats.tsx`,
  `src/app/(owner)/documents/page.tsx`, `src/app/(owner)/documents/vault/page.tsx`,
  `src/components/documents/documents-vault.client.tsx`,
  `src/hooks/api/query-keys/document-search-keys.ts`, `src/hooks/api/query-keys/report-keys.ts`,
  `src/components/shared/export-buttons.tsx`, `supabase/functions/export-report/index.ts`,
  `supabase/functions/generate-pdf/index.ts`, `supabase/functions/_shared/tier-gate.ts`,
  `tests/e2e/playwright.config.ts`, `tests/e2e/tests/constants/routes.ts`,
  `tests/e2e/tests/public/routing-aliases.spec.ts`, `tests/e2e/tests/owner/reports-gate.spec.ts`,
  `tests/e2e/tests/owner/owner-financials.e2e.spec.ts`,
  `tests/e2e/tests/owner/owner-navigation.e2e.spec.ts`, `.github/workflows/ci-cd.yml`,
  `vitest.config.ts`, `package.json`, `CLAUDE.md`, `.planning/config.json`.
- **Exhaustive greps** for `/financials`, `/analytics`, `/reports`, `/documents` string literals
  across `src/`, `tests/`, `scripts/`, `public/` — the basis for the Non-Route Reference Map and
  for every "VERIFIED SAFE / zero matches" claim.
- **Rescope re-verification (2026-07-26), executed against the working tree:** `find` over
  `app/(owner)/{financials,analytics,reports}` (the 7-page / 7-layout count); `head -1` on all 7
  moving pages (`"use client"` × 7); the complete `/financials*` grep excluding its own tree (the
  reduced N-map); the complete `/analytics/financial` grep excluding its own tree (exactly 3
  referrers); `refreshable-analytics`/`refresh-button` importer grep (sole importer is
  `analytics/financial/page.tsx`); `src/lib/routes/private-routes.ts` read (the one-line N6);
  `src/lib/breadcrumbs.ts` `LABEL_MAP` grep (`analytics:12` stays, `financials:25` goes);
  `src/app/(owner)/analytics/page.tsx` read (Finding X1); `main-nav.tsx` `coreItems`/
  `analyticsItems`/`isActive` read; `app-shell.tsx` `commandGroups` read (6 changing hrefs).

### Secondary (MEDIUM confidence)
- Phase 55 CONTEXT (D-07/D-08 Scheduled vs Collected) as cited by 56-CONTEXT.md D-18 — inherited,
  not independently re-verified this session.
- 56-UI-SPEC.md — treated as an approved contract; its codebase claims that this research
  independently re-touched (single cache entry, `main-nav.tsx:188/190`, `analytics-stats-row.tsx:48`,
  the two `PREMIUM_REPORT_TYPES` line numbers) all checked out. Its tier-gate table is the one
  place where new evidence contradicts it (Finding G3).

### Tertiary (LOW confidence)
- None. No claim in this document rests on an unverified web search. Zero WebSearch calls were
  needed — the two external questions (redirect status code, execution order) were answerable from
  official docs plus this repo's own compiled output.

---

## Metadata

**Confidence breakdown:**
- **Redirect mechanics: HIGH** — verified from the project's own `routes-manifest.json`, Next's
  bundled `path-to-regexp` executed directly, and two official v16.2.12 doc pages. The three
  sub-claims that drive the plan (308, exact-match, ordering-irrelevant) are each independently
  corroborated.
- **Non-route reference map: HIGH** — exhaustive grep across four directory trees; every "no
  matches" claim is a real executed search, not an assumption. The Cmd+K table (N2) was found this
  way. **Re-executed at rescope**, so the reduced N-map (N1/N1a/N2/N3/N4/N6/N7/N12) is evidence,
  not subtraction on paper.
- **Reduced scope (D-05 revert, phase split): HIGH** — every changed count was re-derived from the
  working tree during the rescope. Finding X1 (`/analytics/page.tsx` is a 4-line redirect) was
  found this way and is the one place the corrected D-08 needs a plan-time placement call.
- **E2E / CI reality: HIGH** — the CI command and the Playwright project definitions were read
  directly and cross-referenced; the `owner`-project-not-in-CI conclusion follows deductively from
  two files.
- **Tier gate: HIGH** — both edge functions read in full; sets compared member-by-member; the
  `ExportButtons` default-`"financial"` finding traced through three files
  (component → fetch call → edge-function default).
- **Merge cost (D-06): HIGH** — both pages read in full; component and hook inventories are
  enumerated, not estimated.
- **Finding M2 (dropped figure): HIGH** — initially MEDIUM under Assumption A3, then verified by a
  full `receivable|Outstanding|margin` sweep, which **corrected** the finding from "two figures
  dropped" to one (profit margin survives at `:141`).
- **Documents landing: HIGH** — the single-cache-entry claim was verified against the actual vault
  call site, not accepted from the UI-SPEC. *(Now **Phase 65's** inheritance, not Phase 56's.)*
- **Pitfalls: HIGH** — every pitfall is derived from a specific verified fact in this document, not
  from generic domain knowledge.

**Research date:** 2026-07-26
**Rescoped:** 2026-07-26 — D-05 reverted, D-07/D-08/D-19/D-24 revised, DOCS-01 split to Phase 65,
nav-resolver work deleted, SC-1 tension dissolved. See §Post-Research Rescope.
**Valid until:** 2026-08-25 (30 days). Stable domain: the mechanisms are Next.js config redirects
and this repo's own structure. Re-verify sooner only if Next.js majors or `playwright.config.ts`
project definitions change.
