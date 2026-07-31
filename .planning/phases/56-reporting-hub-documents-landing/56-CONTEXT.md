# Phase 56: Reporting Hub - Context

**Gathered:** 2026-07-26
**Revised:** 2026-07-26 (user scope correction - see D-27; directory name retains the pre-split slug)
**Reconciled:** 2026-07-30 (FULL SEPARATION - see `<scope_correction>`; supersedes the 2026-07-26
partial-separation position)
**Status:** Ready for planning

<scope_correction>
## FULL SEPARATION supersedes partial separation - READ BEFORE PLANNING

**What changed.** On 2026-07-26 this phase settled on *partial* separation: `/analytics` kept its
six operational routes, but the one page `/analytics/financial` still folded into the hub and merged
into `/reports/analytics`, so `/reports` kept a chart page. **That position was put to the user again
on 2026-07-30 as the RECOMMENDED option and the user REJECTED it.**

The 2026-07-30 discussion offered three readings of RPTHUB-01 (see 56-DISCUSSION-LOG.md, Session 2,
"Analytics boundary" Q1):

| Option | This was... | Chosen |
|---|---|:---:|
| **Financial-only absorb** - only `/analytics/financial` moves; operational analytics stay | **exactly the 2026-07-26 position**, offered as the recommendation | |
| **Full separation** - `/reports` holds statements + exports only; ALL analytics including financial stays at `/analytics` | contradicts RPTHUB-01 as written | **YES** |
| Total absorb - all of `/analytics/*` folds into `/reports` | the original pre-correction scope | |

**The locked position is FULL SEPARATION:**

1. **`/reports` holds financial statements + exports ONLY. ZERO charts anywhere under
   `/reports/**`.** No `recharts` import, no `ChartContainer`, no `ResponsiveContainer` may survive
   under `src/app/(owner)/reports/**` after this phase.
2. **`/analytics/financial` STAYS LIVE at its current route.** It is NOT moved, NOT merged, NOT
   redirected, NOT deleted. Under full separation it is a destination, not a legacy URL.
3. **`/reports/analytics` is DELETED** and 308-redirects **INTO `/analytics/overview`** - the one
   redirect in this phase that points *away* from the hub.
4. **Reports and Analytics are two peer top-level nav entries.**

**Conceptual line - use as the tiebreaker whenever it is unclear which surface a view belongs to:**
**Reports** answers *"what do I owe / what did I collect"*. **Analytics** answers *"how is the
portfolio trending"*.

**What this changes mechanically.** The redirect map's 7th entry **INVERTS**: the old
`/analytics/financial -> /reports/analytics` becomes `/reports/analytics -> /analytics/overview`.
Count stays 7; direction and guard sets do not. See D-32 for the restated map.

**Rationale (user, verbatim from the 2026-07-26 session and re-affirmed by the 2026-07-30 choice):**
*"take the split seriously because analytics and the other scope is supposed to be separate for
better navigation and ultimately a better user experience"*. The 2026-07-26 revision honoured the
letter of that and left one chart page inside `/reports`; the 2026-07-30 choice removes the
exception. **Do not silently re-merge the surfaces by following stale requirement text** -
RPTHUB-01/RPTHUB-02 have been amended in `.planning/REQUIREMENTS.md` to match, and ROADMAP.md
Phase 56 carries a dated revision note.

**Unaffected by this correction:** the Phase 56 / Phase 65 split (D-27). DOCS-01 and the entire
`/documents` landing remain Phase 65's property. Phase 56 carries RPTHUB-01..04 only. Do not
re-add any `/documents` scope here.
</scope_correction>

<domain>
## Phase Boundary

Collapse the duplicated financial-statement surfaces (`/financials/*` and the chart-bearing
`/reports/*` index) into one `/reports` hub that holds **statements and exports only**, redirect
every legacy financial URL 308 via `next.config.ts`, retire the hub's chart page into `/analytics`,
and prove the premium-export tier gate survives the consolidation.
Requirements: RPTHUB-01, RPTHUB-02, RPTHUB-03, RPTHUB-04.

`/analytics` is **not** part of this phase's URL space beyond receiving one inbound redirect, and
`/documents` has moved out of this phase entirely (D-27). **Reports = financial statements +
exports, zero charts. Analytics = every chart, operational and financial.** Two distinct product
surfaces, two peer nav entries, two URL trees.

**In scope:** the `/reports` hub IA (Statements / Exports), absorbing all six `/financials/*` routes
into hub sub-routes, deleting `/reports/analytics` and the chart sections on the current `/reports`
index, the 7-entry `next.config.ts` redirect map (six inbound + one outbound), deletion of the
superseded route files and of the permanently-zero analytics cards (D-33), E2E coverage on hub
routes before any removal, and verification that `PREMIUM_REPORT_TYPES` gating still holds.

**Out of scope (do not build):**
- **Absorbing any part of `/analytics/*`.** All seven analytics routes - `/analytics` (index),
  `/analytics/financial`, `/analytics/leases`, `/analytics/maintenance`, `/analytics/occupancy`,
  `/analytics/overview`, `/analytics/property-performance` - KEEP their URLs, keep their nav
  section, and are not moved, not redirected and not deleted. (D-29.)
- **Any chart under `/reports/**`.** Not relocated within the hub, not rebuilt, not "kept for now".
  (D-34.)
- **The `/documents` landing (DOCS-01).** Moved to its own phase (D-27). Nothing about
  `/documents`, the vault, the lease-template builder or the printable templates is built here.
- **A longest-prefix-wins nav active-state resolver.** No longer needed and explicitly not in
  scope - see D-07 REVISED.
- New report types or new analytics visualizations - this phase MOVES, CONSOLIDATES and DELETES
  existing surfaces, it does not add reporting capability.
- De-duplicating `PREMIUM_REPORT_TYPES` across the two edge functions (deferred, see below).
- Any change to `proxy.ts` - RPTHUB-02 explicitly routes redirects through `next.config.ts` only.
- Re-deriving revenue figures. Phase 55 already fixed the vocabulary; the hub consumes it.
- **Editing `/analytics/financial`.** It stays exactly as it is. Its `ExportButtons` paywall
  divergence is a real defect but it is on a route this phase does not touch - see D-21 MOOT.
</domain>

<decisions>
## Implementation Decisions

> **Reading guide.** Decision IDs are preserved so downstream references still resolve. A decision
> that no longer holds is marked **SUPERSEDED by D-nn** or **MOOT** with the reason stated -
> never silently rewritten. D-29..D-34 are the 2026-07-30 full-separation decisions.

### The load-bearing decision (2026-07-30)

- **D-29: FULL SEPARATION. Supersedes D-05 REVISED, D-06 and D-08 REVISED.**
  `/reports` holds financial **statements + exports only**. **ALL** analytics - operational *and*
  financial - lives at `/analytics`.
  - **`/analytics/financial` stays live at its current URL.** Not moved, not merged, not redirected,
    not deleted, not edited by this phase.
  - **`/reports/analytics` is deleted** and 308-redirects into `/analytics/overview` (D-32).
  - **Two peer top-level nav entries**, `Reports -> /reports` and `Analytics -> /analytics`.
  - Tiebreaker: Reports = *"what do I owe / what did I collect"*; Analytics = *"how is the portfolio
    trending"*.

  **Which earlier decisions this kills, and why:**

  | Was | Now |
  |---|---|
  | **D-05 REVISED** - only `/analytics/financial` folds into the hub | **SUPERSEDED.** *Nothing* folds into the hub. |
  | **D-06** - `/analytics/financial` merges into the existing `/reports/analytics` page | **SUPERSEDED.** There is no merge and no merge target: `/reports/analytics` is deleted. |
  | **D-08 REVISED** - the `/analytics` index survives and its financial entry becomes a cross-link to `/reports/analytics` | **SUPERSEDED, and it was factually wrong.** `src/app/(owner)/analytics/page.tsx` is four lines - `redirect("/analytics/overview")`. **There is no rendered `/analytics` index and no "financial entry" to cross-link** (56-RESEARCH.md Finding X1 already recorded this). Under D-29 that file is untouched. |

- **D-34: ZERO-CHARTS INVARIANT under `/reports/**`.** After this phase, no `recharts` import, no
  `ChartContainer` and no `ResponsiveContainer` may appear anywhere under
  `src/app/(owner)/reports/**`. Grep-checkable, and it must be asserted as a test.
  **Verified current violations that this phase must clear:**
  - `src/app/(owner)/reports/analytics/analytics-revenue-chart.tsx`
  - `src/app/(owner)/reports/analytics/analytics-occupancy-chart.tsx`
  - `src/app/(owner)/reports/analytics/analytics-payment-methods-chart.tsx`
  - `src/app/(owner)/reports/page.tsx` dynamic-imports four chart-bearing sections from
    `#components/reports/sections/` - `financial-report-section` (recharts `AreaChart`),
    `property-report-section` (`BarChart`), `tenant-report-section` (`LineChart`),
    `maintenance-report-section` (`BarChart` + `LineChart`). **Verified: those four are imported by
    `src/app/(owner)/reports/page.tsx` and by nothing else**, so replacing the index orphans them
    cleanly. `year-end-report-section.tsx` is chart-free and stays (used by
    `/reports/year-end/page.tsx`).

  **This corrects line A's UI-SPEC discretion ruling** that the current `/reports` index content
  "relocates to `/reports/generate`". Relocating chart sections to another route *inside* `/reports`
  violates D-34. The date-range selector may move to `/reports/generate`; the four chart sections
  may not.

### Hub structure (RPTHUB-01)
- **D-01:** The hub uses **real sub-routes**, not tabs or a single scrolling page:
  `/reports/income-statement`, `/reports/cash-flow`, etc. Chosen because it gives every legacy URL
  a 1:1 redirect target, keeps deep links and E2E simple, and matches the sub-routes `/reports`
  already has. **STANDS.**
- **D-02 SUPERSEDED by D-31 on the grouping.** The Statements / Analytics / Exports grouping assumed
  an Analytics group existed inside the hub. Under D-29 it has zero members. The grouping becomes
  **Statements / Exports**.
- **D-03:** The existing `/reports/generate` and `/reports/year-end` are **re-slotted into the new
  grouping** rather than left in place. *(Superseded on the redirect point by D-32: flat slugs make
  those two identity no-ops, so they get NO redirect entries. The re-slotting into the grouping
  still stands - it is a hub-index concern, not a URL concern. The third re-slot target,
  `/reports/analytics`, is deleted by D-29 and is no longer part of this decision.)*
- **D-04 SUPERSEDED by D-30.** "`/reports` index is navigation only - no KPI tiles, no data
  fetching."
- **D-30 (supersedes D-04): the `/reports` index carries a summary strip ABOVE the statement
  list.** Recorded 2026-07-30 from the user's selection in 56-DISCUSSION-LOG.md Session 2, "Hub
  information architecture" Q2 - *"Summary strip + statement list"*, chosen over "Statement list
  only (pure navigation index)". A Scheduled / Collected / Outstanding strip for the current period
  sits above the statement entry points. **Rationale, in the user's framing:** the hub index should
  *earn* being a page rather than being a menu, and it is the natural home for the roadmap's "real
  ledger actuals, not a re-fabricated `collection_rate`".

  **Why D-04 could not simply be preserved.** D-04's own consequence chain broke under D-29: D-20
  ports Accounts Receivable *because* it is the one figure lost when `/financials` is deleted, and
  the only reason it was pinned to `/reports/analytics` rather than the index was that D-04 forbade
  data on the index. D-29 deletes `/reports/analytics`. Keeping D-04 would leave the ported figure
  with nowhere to land. D-04 is therefore affected by the analytics question, not independent of it.

  **Binding constraints on the strip** (all three inherited from Phase 55, none re-litigated here):
  1. All three figures come from **one** payload. Outstanding is `scheduled - collected` **from that
     same payload** - never sourced from `get_financial_overview.accounts_receivable`, which is a
     different, lease-derived notion of outstanding. Two derivations wearing one label is exactly
     the D-18 failure.
  2. Scheduled and Collected are **never summed** (D-18). Subtraction within one period is the
     defined complement of the collection rate and is permitted.
  3. Values are dollars. Any `* 100`, `/ 100` or `formatCents` on them is a bug (this caused a real
     100x overstatement in v8.0).
- **D-31 (supersedes D-02's grouping and D-28's count): the hub index carries 7 tiles in 2 groups.**
  **Statements (5)** = balance-sheet, cash-flow, expenses, income-statement, tax-documents;
  **Exports (2)** = generate, year-end. **There is no Analytics group and no Analytics tile** - a
  tile pointing at `/reports/analytics` would point at a redirect, and a tile pointing at
  `/analytics/*` would rebuild inside the hub the cross-section overlap this phase exists to remove.
  Any artifact still saying 13 tiles or 8 tiles is stale.

### The /analytics section (D-29)
- **D-07 REVISED - STANDS, and is strengthened.** The navigation carries **two REAL peer sections,
  not two doors into one hub**: `Reports -> /reports` and `Analytics -> /analytics`. Each section
  owns its own URL tree.
  **Consequence - the nav active-state problem DISSOLVES.** The double-active bug the UI-SPEC found
  (`src/components/shell/main-nav.tsx`, `isActive` declared at :188 / `startsWith` at :190) existed
  *only* because the original D-07 pointed both hrefs into `/reports`. With `/reports` and
  `/analytics` there is **no prefix overlap**, so the existing `startsWith` resolver is already
  correct. **The longest-prefix-wins resolver work and its 6 pinned cases remain DELETED from this
  phase** - from the UI-SPEC's active-state rule and from RESEARCH N1. Do not carry it forward as a
  "latent bug fix"; it is out of scope.
  **Correction under D-29:** line A's revision removed the `Financial` child from the Analytics nav
  entry. **That removal is reverted.** `main-nav.tsx:60` (`{ label: "Financial", href:
  "/analytics/financial" }`) **stays exactly as it is** - the route stays live, so removing its nav
  entry would orphan a working page. The `Analytics` nav section is untouched by this phase.
- **D-08 REVISED - SUPERSEDED by D-29** (see the table above; there is no rendered `/analytics`
  index to edit).

### Legacy route removal (RPTHUB-02, RPTHUB-04)
- **D-09:** Old route files are **deleted**; redirects live **only** in `next.config.ts`
  `redirects()`. Config redirects are evaluated before filesystem routing, so a leftover
  `page.tsx` would be dead code. One redirect map, one source of truth. Follow the existing
  `permanent: true` entries in `next.config.ts` as the pattern. **STANDS** - and under D-29 it now
  applies to `src/app/(owner)/reports/analytics/` as well as `src/app/(owner)/financials/`.
- **D-10:** Redirect targets are **1:1 to the exact equivalent**, never group-level:
  `/financials/cash-flow -> /reports/cash-flow`. Bookmarks and search results land on what they
  asked for. **STANDS.** *(The example `/analytics/financial -> /reports/analytics` is withdrawn -
  that route no longer moves. The inverted 7th entry `/reports/analytics -> /analytics/overview`
  targets the concrete route rather than `/analytics` precisely to honour this decision without a
  redirect chain - see D-32.)*
- **D-11:** Sequencing is enforced **inside this phase** by wave ordering:
  **build the hub -> E2E-cover the hub routes -> only then add redirects and delete legacy files.**
  There must never be a commit where a legacy route is gone and its hub replacement is unproven.
  This is how RPTHUB-04 is satisfied. **STANDS.**

### Tier gating (RPTHUB-03)
- **D-12:** Verify the gate holds **in both** `supabase/functions/export-report/index.ts` (the
  `PREMIUM_REPORT_TYPES` set at :24, checked at :72) and
  `supabase/functions/generate-pdf/index.ts` (the mirror at :31, checked at :322), with a test.
  The duplication is **left in place** - consolidating shared Deno code across two deployed edge
  functions is its own change, not "verify intact". Recorded as a deferred idea. **STANDS.**
- **D-13:** No route rewrite may bypass the gate. The hub's export CTAs must reach the same edge
  functions with the same `reportType` values - confirm the values still match after re-slotting.
  **STANDS.**

### MOVED OUT OF PHASE 56 -> Phase 65 "Documents Landing" (DOCS-01)

> **These four decisions (D-14, D-15, D-16, D-17) NO LONGER BELONG TO PHASE 56.** They were split
> out on 2026-07-26 (see D-27) and are the property of Phase 65. They are preserved here
> **verbatim** so Phase 65's context can inherit them without loss; nothing in this block is
> planned, built, tested or shipped by Phase 56. Phase 56 planners: skip to "Carried forward from
> Phase 55". Everything about the `/documents` landing - the three-band ladder, the six tiles, the
> nested recent-documents panel, the vault-canonical decision and the reversed `permanentRedirect`
> - travels with them. **The 2026-07-30 full-separation correction does not touch this block.**

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

> *(End of the Phase 65 block. Resume Phase 56 scope below.)*

### Carried forward from Phase 55 (do not re-decide)
- **D-18:** Revenue vocabulary is **Scheduled** (lease-derived, `get_revenue_trends_optimized.revenue`)
  vs **Collected** (ledger receipts). Nothing sums them. Any revenue figure the hub renders inherits
  this vocabulary exactly - the hub must not reintroduce a bare "Revenue" label or a third
  definition. See `.planning/phases/55-rent-ledger/55-CONTEXT.md` D-07/D-08.
  **STANDS, and gains force under D-30** - the hub index now renders revenue figures, so D-18
  governs the summary strip directly rather than only a downstream chart page.

### Post-research decisions (locked 2026-07-26, reconciled 2026-07-30)

- **D-19 REVISED - SUPERSEDED by D-32.** The 7-entry map it defined was built on
  `/analytics/financial -> /reports/analytics`. That entry inverts.

- **D-32 (supersedes D-19 REVISED): the redirect map is exactly 7 entries - six INTO the hub and
  one OUT of it.** Emit exactly these 7, all `permanent: true` (308):

  | # | source | destination | direction |
  |---|---|---|---|
  | 1 | `/financials` | `/reports` | into hub |
  | 2 | `/financials/balance-sheet` | `/reports/balance-sheet` | into hub |
  | 3 | `/financials/cash-flow` | `/reports/cash-flow` | into hub |
  | 4 | `/financials/expenses` | `/reports/expenses` | into hub |
  | 5 | `/financials/income-statement` | `/reports/income-statement` | into hub |
  | 6 | `/financials/tax-documents` | `/reports/tax-documents` | into hub |
  | 7 | `/reports/analytics` | `/analytics/overview` | **OUT of hub** |

  **Entry 7 is the only redirect in this phase that points away from `/reports`. Call it out in the
  map's own comment so it is not "corrected" later by someone assuming all arrows point at
  `/reports`.**

  **Why the target is `/analytics/overview` and not `/analytics`.** Verified:
  `src/app/(owner)/analytics/page.tsx` is `redirect("/analytics/overview")`. Targeting `/analytics`
  would produce a 308 -> 307 chain on every legacy hit. Target the concrete route.

  **Guard A - identity no-ops, must NOT be emitted (3 paths, down from 4).** Because the UI-SPEC
  chose FLAT slugs, `/reports`, `/reports/generate` and `/reports/year-end` keep their exact current
  paths; emitting them produces `ERR_TOO_MANY_REDIRECTS` on routes that work today.
  **`/reports/analytics` LEAVES this guard set** - it is now map entry 7.

  **Guard B - not moving, must NOT be emitted (7 paths, up from 6).** `/analytics`,
  **`/analytics/financial`**, `/analytics/leases`, `/analytics/maintenance`, `/analytics/occupancy`,
  `/analytics/overview`, `/analytics/property-performance`. A redirect on any of them breaks a live,
  correct route. **`/analytics/financial` JOINS this guard set** - it is the single highest-risk
  entry in the whole map, because a stale pre-correction `/analytics/financial -> /reports/analytics`
  entry would 308 a live page into a URL that will no longer exist, *and* the D-32 entry-7 redirect
  would then chain it back out. Assert the source array by **equality**, not subset.

  Total assertions: **7 positive + 3 Guard A + 7 Guard B = 17.**

  Redirect ordering remains a non-issue: literal `source` values compile to both-ends-anchored
  regexes (verified from `.next/routes-manifest.json`), so `/analytics` cannot shadow
  `/analytics/financial`.

- **D-20: Accounts Receivable is PORTED, not dropped. STANDS on the principle; its landing surface
  is now an OPEN QUESTION.** It is the one figure that disappears when `/financials` is deleted
  (`financials-summary-stats.tsx:117-132` renders it; profit margin survives via
  `financial-overview-stats.tsx:141`). v10.0 is a claims-integrity milestone - silently dropping one
  figure contradicts that. **What changed:** line A pinned it to `/reports/analytics`, which D-29
  deletes. **It cannot be folded into D-30's Outstanding tile** - A/R is `get_financial_overview`
  lease-derived, Outstanding is `scheduled - collected` from the collection-rate payload, and
  conflating them is the D-18 failure. See Open Questions.

- **D-21 MOOT for Phase 56 - the finding survives, the phase assignment does not.** D-21 required
  fixing `ExportButtons`' divergent paywall path (POSTs to `export-report` with no `type` param, so
  the function defaults `reportType` to `"financial"` - a `PREMIUM_REPORT_TYPES` member - and it
  surfaces the 402 as `FINANCIAL_EXPORT_FAILED` rather than `PaywallError`). **Its entire
  justification was "the D-06 merge would import a second, divergent paywall pattern into the hub."
  D-29 removes the merge.** Verified: `ExportButtons` has exactly one call site,
  `src/app/(owner)/analytics/financial/page.tsx:103` - a route this phase does not touch. Fixing it
  here would mean editing a file outside the phase boundary. **The defect is real and is recorded in
  Deferred Ideas and Open Questions; it is not silently dropped.**

- **D-22 MOOT.** "The merged analytics page gets ONE period control governing the whole page."
  There is no merged page (D-29). Recorded rather than deleted so the reasoning is not re-derived:
  the two source pages shared zero state, so a merge would have inherited two independent controls.

- **D-23 MOOT.** "The Analytics hub tile is NOT badged `Growth`." There is no Analytics hub tile
  (D-31). The underlying rule survives inside the Tier Gate Contract: badge only entries whose CTA
  provably reaches a gated `reportType`.

- **D-24 AMENDED AGAIN (reduced from 6 hrefs to 5): `app-shell.tsx` carries a SECOND complete route
  table.** The Cmd+K `commandGroups` route table is absent from the UI-SPEC and must be updated
  alongside the nav, or the palette keeps deep-linking to deleted routes. The file's own comment
  records that a prior review already caught this class of miss once. **With D-29, exactly 5 hrefs
  change** (verified against `src/components/shell/app-shell.tsx`): the **five** `/financials*`
  palette rows at `:145` (`/financials`), `:148` (income-statement), `:151` (cash-flow), `:154`
  (balance-sheet), `:159` (tax-documents).
  **`:115` (`/analytics/financial`) NO LONGER CHANGES** - the route stays live, so repointing it
  would break a working deep link. That is the delta from the previous "6 hrefs".
  **All six `/analytics/*` palette rows stay exactly as they are:** `/analytics/overview` `:110`,
  `/analytics/financial` `:115`, `/analytics/property-performance` `:120`, `/analytics/leases`
  `:125`, `/analytics/maintenance` `:130`, `/analytics/occupancy` `:135`.
  **Note the palette has no `/financials/expenses` row, no `/reports/analytics` row and no
  `/reports/year-end` row** - only `/reports` `:138` and `/reports/generate` `:139`, both of which
  keep their paths. This is why the count is 5.

- **D-25 (RPTHUB-04 is not satisfiable the obvious way): CI runs only
  `--project=smoke --project=public --project=owner-axe`** (`ci-cd.yml:162`). The `owner` Playwright
  project NEVER executes, so a spec added under `tests/e2e/tests/owner/` gates nothing - which is
  already true of `owner-financials.e2e.spec.ts` and `reports-gate.spec.ts`. Hub-route coverage MUST
  land in **`owner-axe`**; redirect coverage in **`public`** (needs no auth - config redirects
  resolve at Next.js step 2, before Proxy at step 3, which is also why RPTHUB-02's "no proxy
  involvement" holds structurally). **STANDS UNCHANGED** - this is the single most likely way to
  ship a green PR with zero real coverage.

- **D-26 REFRAMED (the cost argument is moot; the underlying fact is now supporting evidence).**
  The finding was: `/reports/analytics` and `/analytics/financial` have **zero shared data sources
  and zero shared components** (11 vs 5 children; `analyticsQueries.financialPageData()` vs three
  `use-reports` hooks), so the D-06 merge was a standalone plan, not a cheap dedup. **There is no
  merge to cost under D-29.** The fact is retained because it now argues the *other* way: two
  surfaces that share nothing were never one surface pretending to be two, and deleting the weaker
  one (D-33) rather than merging it is the cheaper and more honest move.

- **D-33 (NEW, 2026-07-30): the permanently-zero analytics cards are DELETED, not carried into
  `/analytics`.** `src/app/(owner)/reports/analytics/analytics-stats-row.tsx` and
  `src/app/(owner)/reports/analytics/analytics-payment-methods-chart.tsx` are deleted as part of
  this phase.

  **Evidence - this is a VERIFIED LIVE PRODUCTION DEFECT, confirmed against the production
  database:**
  1. `src/hooks/api/query-keys/report-analytics-keys.ts:74-103` parses **snake_case** keys off the
     `get_billing_insights` payload: `total_payments`, `successful_payments`, `failed_payments`,
     `total_revenue`, `average_payment`, `payments_by_method`, `payments_by_status`.
  2. The live `get_billing_insights` RPC returns ONLY these **camelCase** keys, verified by querying
     prod: `churnRate`, `lateFeeTotal`, `mrr`, `tenantCount`, `totalRevenue`, `unpaidCount`,
     `unpaidTotal`.
  3. **Zero key overlap.** Every `insights?.<snake_case>` lookup is `undefined`, every `?? 0` fires,
     and **every figure renders permanently 0 in production** - presented with confident labels:
     *"Total Revenue / All payments / Successful collections"* and *"Payment Success - 0 of 0
     payments"* and *"ACH Adoption / Lower fees"*.
  4. **The underlying data is the wrong data anyway.** `get_billing_insights` returns the owner's
     **TenantFlow subscription billing** (`mrr`, `churnRate`, `unpaidTotal`), not rental revenue.
  5. **"Payment Methods: card vs ACH" is a claim this product cannot make.** TenantFlow is
     landlord-only and **facilitates no rent payments** - a core product boundary. There is no
     payment-method data to chart, and there never will be under the current product definition.

  **Therefore:** delete both files. Do not relocate them to `/analytics`, do not relabel them, do
  not "fix the key casing" - fixing the casing would surface subscription-billing figures under
  rental-revenue labels, which is a worse claims violation than rendering zero.

  **Two consequences the planner must handle, not skip:**
  - `analytics-stats-row.tsx` contains **four** cards, and the third - **Occupancy Rate** - is NOT
    part of the defect: it is sourced from `occupancyMetrics` (`get_occupancy_trends_optimized`,
    real data), and it duplicates what `/analytics/occupancy` already renders. Deleting the file
    deletes that card too. Confirm `/analytics/occupancy` covers it before deleting; if it does not,
    that is a figure lost, and D-20's "nothing is silently dropped" rule applies.
  - `src/lib/reports/report-data.ts:381` also consumes
    `reportAnalyticsQueries.paymentAnalytics(start, end)` (via `safeFetch` with a
    `PAYMENTS_FALLBACK`) to build the **executive-monthly export**. That export therefore renders
    the same permanently-zero figures into a generated PDF/Excel. **This is a second instance of the
    same defect on a different surface.** See Open Questions - it is not resolved here.

  **This subsumes the old D-18 vocabulary-guard item** that required removing
  `analytics-stats-row.tsx`'s "Total Revenue" card: the whole file goes, so the card cannot survive.

### Scope corrections (locked 2026-07-26, user directive - binding, post-artifact)

- **D-27: THE PHASE IS SPLIT IN TWO. STANDS UNCHANGED - re-affirmed 2026-07-30.**
  - **Phase 56 = Reporting Hub.** Requirements **RPTHUB-01, RPTHUB-02, RPTHUB-03, RPTHUB-04**.
  - **Phase 65 = Documents Landing.** Requirement **DOCS-01**. Directory
    `.planning/phases/65-documents-landing/`.

    **Numbering rationale (corrected):** an earlier draft of this decision proposed `56.1` and
    justified it as "the GSD decimal phase-insert convention." That was **wrong** - this repo
    forbids decimals outright. `.planning/ROADMAP.md:24` states *"Phase Numbering: Integer phases
    only (project convention - never decimals)"*, and `.planning/PROJECT.md:150` independently
    records *"Use integer phase numbers; insert NEW phases as integers, not decimals."* Phases
    57-64 were already planned and are never renumbered, so the split takes the **next free
    integer, 65**, while **executing immediately after Phase 56**. ROADMAP.md records this as an
    append-only numbering rule and orders both the phase list and Phase Details by *execution*
    order, so Phase 65 appears between 56 and 57.

  DOCS-01 and **everything** about the `/documents` landing leaves Phase 56: the three-band ladder,
  the six tiles, the nested recent-documents panel, the vault-canonical decision, the reversed
  `permanentRedirect`. D-14/D-15/D-16/D-17 are quarantined above in a marked block for Phase 65
  to inherit verbatim. **The two phases share no code, no routes and no tests**, which is the whole
  justification for the split - shipping them together only coupled two unrelated reviews.

- **D-28 SUPERSEDED by D-31.** "The hub index carries 8 tiles." It carries 7 - the Analytics group
  and its single tile are gone with D-29.

### Claude's Discretion
- The exact sub-route slugs under `/reports` (e.g. `/reports/exports/year-end` vs
  `/reports/year-end`) - pick whatever keeps the redirect map smallest while reading coherently.
  The UI-SPEC has resolved this to **flat slugs**; a planner deviating must restate D-32's guard
  sets.
- Whether `/reports/generate` and `/reports/year-end` keep their current URLs or get renamed for
  consistency with the statement routes - preserve deep links either way.
- Whether the `/financials` component set (`financials-header`, `-highlights`, `-summary-stats`,
  `-quick-links`, `-loading`, `-error`) is **moved and renamed** into the `/reports` tree or
  reused in place. Recommended: move and rename - they already encode working loading/error
  boundaries, and leaving them behind creates a directory whose routes are all redirects.
- Where the `/reports` index's existing date-range selector lands (`/reports/generate` is the
  natural home). **The four chart sections do not land anywhere inside `/reports` - D-34.**
- *(Documents-landing discretion items - tile layout balance, server-rendered vs client-fetched
  recent list - moved to Phase 65 with D-14..D-17.)*
</decisions>

<open_questions>
## Open Questions - NOT resolved here, do not resolve silently

These are consequences of the 2026-07-30 correction that no recorded user decision covers. A
planner may propose an answer; none may be treated as already decided.

- **OQ-1: Where does the D-20 Accounts Receivable figure land?** Its previous home
  (`/reports/analytics`) is deleted by D-29, and it **must not** be folded into D-30's Outstanding
  tile (different derivation - `get_financial_overview` lease-derived A/R vs
  `scheduled - collected`; conflating them is the D-18 failure). Candidates: a fourth tile on the
  `/reports` summary strip carrying its own derivation-accurate label; a line item on
  `/reports/balance-sheet` (where receivables belong in accounting terms); or `/reports/income-statement`.
  Requires a diff of `financials-summary-stats.tsx` against `financial-overview-stats.tsx` to
  confirm no *other* unique figure is also being dropped.

- **OQ-2: What happens to the three surviving `/reports/analytics` children?**
  D-33 deletes `analytics-stats-row.tsx` and `analytics-payment-methods-chart.tsx`. That leaves
  `analytics-revenue-chart.tsx`, `analytics-occupancy-chart.tsx` and `analytics-property-table.tsx`
  orphaned when the page is deleted. The 2026-07-30 discussion (Session 2, Analytics boundary Q2)
  chose *"Move to `/analytics`, delete from hub"* with the explicit note that **the researcher must
  diff the moved charts against what `/analytics/*` already renders and merge rather than
  duplicate**. That diff has not been done. Known facts to seed it:
  - `analytics-occupancy-chart.tsx` vs the existing `/analytics/occupancy` route - likely duplicate.
  - `analytics-revenue-chart.tsx` (`useMonthlyRevenue`) vs `/analytics/financial`'s
    `revenue-expense-chart.tsx` - likely overlapping, different data source.
  - `analytics-property-table.tsx` is **provably dead code today**: it renders only when
    `occupancyMetrics.byProperty.length > 0`, and the mapper at
    `report-analytics-keys.ts` hard-codes `byProperty: []` with the comment *"the RPC has NO
    top-level totals and NO per-property breakdown, so byProperty stays []"*. It has never
    rendered. `/analytics/property-performance` already ships `top-properties-table.tsx` and
    `active-units-table.tsx`.

- **OQ-3: `ExportButtons`' divergent paywall path (the old D-21).** Real defect, on
  `/analytics/financial` - a route this phase does not touch. Fix it as a deliberate drive-by, or
  defer it to its own change? Recommendation: **defer**, because "this phase moves and consolidates,
  it does not repair capability" is already the phase's own stated boundary. Recorded so the choice
  is made rather than forgotten.

- **OQ-4: the executive-monthly export consumes the same broken `paymentAnalytics` query.**
  `src/lib/reports/report-data.ts:381`. D-33 deletes the two UI surfaces but not this one. Does
  Phase 56 also strip the zero figures from the generated export, or is that a separate claims-
  integrity fix? The figures are equally false in both places.

- **OQ-5: the Occupancy Rate card inside the deleted `analytics-stats-row.tsx`.** It is real data
  (see D-33). Confirm `/analytics/occupancy` renders an equivalent before deleting, or the
  "nothing is silently dropped" rule is violated.
</open_questions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` §"Phase 56: Reporting Hub" - **reconciled to D-27 and D-29.** The section
  is titled "Reporting Hub", lists only RPTHUB-01..04, and its success criteria read: SC-1 the hub
  is the single navigation entry for reporting and holds **zero charts**; SC-2 `/analytics` remains
  its own peer section with **all seven** pages untouched, including `/analytics/financial`; SC-3
  all seven redirects resolve (six into the hub, one out of it) and routes that are not moving emit
  no redirect; SC-4 tier-gating verified with E2E before legacy removal. Dated Revision notes record
  both the 2026-07-26 split and the 2026-07-30 full-separation correction.
- `.planning/ROADMAP.md` §"Phase 65: Documents Landing" - owns DOCS-01 and the entire `/documents`
  landing. See also ROADMAP.md:24 and :26 for the integer-only, append-only numbering rule that put
  the split at 65 rather than a decimal.
- `.planning/REQUIREMENTS.md` - RPTHUB-01..04 exact wording, **amended 2026-07-30 for full
  separation**; its requirement->phase mapping table points DOCS-01 at Phase 65.
- **SC-1 note:** ROADMAP SC-1 and RPTHUB-01 both say "a single navigation entry". With `/analytics`
  staying separate, **Reports IS a single entry for reporting** - "single navigation entry" applies
  to the reporting hub itself, not to a merged Reports+Analytics super-entry. No reconciliation
  paragraph is needed; any artifact carrying one should drop it.

### Redirect mechanics (RPTHUB-02)
- `next.config.ts` - the existing `redirects()` block (~line 85) with `permanent: true` entries is
  the pattern to follow. Note the surrounding comment about keeping the FULL map so a Supabase blip
  cannot break redirects.
- `src/lib/seo/blog-redirects.ts` - the established precedent for a large maintained redirect map
  (`DELETED_BLOG_REDIRECTS` + `filterActiveRedirects`).
- `src/app/(owner)/analytics/page.tsx` - four lines, `redirect("/analytics/overview")`. This is why
  D-32 entry 7 targets `/analytics/overview` and not `/analytics`.

### Tier gating (RPTHUB-03)
- `supabase/functions/export-report/index.ts` - `PREMIUM_REPORT_TYPES` set at :24, gate at :72.
- `supabase/functions/generate-pdf/index.ts` - the mirror set at :31, gate at :322. The comment at
  :26 explicitly labels it a mirror; confirm the two sets have not already drifted.

### Surfaces being consolidated
- `src/app/(owner)/financials/` - 6 pages: index, balance-sheet, cash-flow, expenses,
  income-statement, tax-documents. **All 6 move.** Plus 6 shared components
  (`financials-header/-highlights/-summary-stats/-quick-links/-loading/-error`).
- `src/app/(owner)/reports/` - 4 pages: index, analytics, generate, year-end. **`analytics/` is
  DELETED** (D-29) and its 5 children disposed of per D-33 / OQ-2. The index is rebuilt (D-30) and
  loses its four chart sections (D-34). `generate` and `year-end` keep their paths (identity
  no-ops, D-32 Guard A).
- `src/app/(owner)/analytics/` - 3 real analytics pages + 4 redirect shims (D-40). **NONE move.** index, financial, leases, maintenance,
  occupancy, overview, property-performance all stay, unedited by this phase. Do not delete, do not
  redirect, do not repoint their nav or palette entries.
- `src/components/shell/main-nav.tsx` - the `Financials` section (`:76-83`) is removed and its
  children move under `Reports` (`:70-73`); the `Analytics` section (`:55-65`) including its
  `Financial` child (`:60`) is **untouched**. The existing `startsWith` `isActive` at :188-191 is
  **already correct** and must not be replaced (D-07 REVISED).
- `src/components/shell/app-shell.tsx` `commandGroups` - 5 hrefs change (D-24 amended).
- *(Phase 65 only, NOT this phase: `src/app/(owner)/documents/page.tsx` and the vault /
  lease-template / templates surfaces.)*

### Revenue vocabulary (inherited)
- `.planning/phases/55-rent-ledger/55-CONTEXT.md` D-00 (money boundary: `leases.rent_amount` is
  **integer dollars**, ledger amounts are `numeric(10,2)` dollars, any `* 100` is a bug) and
  D-07/D-08 (Scheduled vs Collected, never summed).
- `.planning/phases/55-rent-ledger/VERIFICATION.md` - notes the open question about the
  collection-rate denominator basis, which the D-30 summary strip may surface.
- `src/components/ledger/ledger-balance-strip.tsx` - the shipped house metric-value treatment the
  D-30 summary strip reuses.
</canonical_refs>

<code_context>
## Existing Code Insights

### Full route inventory (verified 2026-07-30 by directory listing)

```
MOVES / DELETED (7 redirect entries)      STAYS - do NOT redirect (10 paths)
--- six INTO the hub ---                  Guard A: identity no-ops (3)
/financials                               /reports
/financials/balance-sheet                 /reports/generate
/financials/cash-flow                     /reports/year-end
/financials/expenses
/financials/income-statement              Guard B: not moving at all (7)
/financials/tax-documents                 /analytics
--- one OUT of the hub ---                /analytics/financial   <- NOW A GUARD, not a source
/reports/analytics -> /analytics/overview /analytics/leases
                                          /analytics/maintenance
                                          /analytics/occupancy
                                          /analytics/overview
                                          /analytics/property-performance
```

Emitting a redirect for any of the 10 guarded paths breaks a working route.
`/analytics/financial` moved from the *source* column to the *guard* column on 2026-07-30 - that
inversion is the single highest-risk stale-artifact hazard in this phase.

### Reusable assets
- `next.config.ts` `redirects()` already exists with `permanent: true` entries - extend, do not
  invent a new mechanism.
- The `financials-*` component set - a complete, working financial-landing surface with loading and
  error boundaries already encoded. Move and rename rather than rebuild.
- `src/components/ledger/ledger-balance-strip.tsx` - the shipped metric-tile shape for D-30's
  summary strip.
- Existing E2E patterns in `tests/e2e/tests/owner/` for owner-route smoke coverage (but land the
  new specs in `owner-axe` / `public` per D-25).
- `main-nav.tsx`'s existing `startsWith` active-state resolver - reuse as-is, no rewrite (D-07
  REVISED).
- *(Phase 65: the vault's document query/mapper for the landing's recent list - D-14.)*

### Integration points
- `src/components/shell/main-nav.tsx` - remove the `Financials` section, move its children under
  `Reports`, leave `Analytics` entirely alone (D-07 REVISED + D-29).
- `app-shell.tsx` `commandGroups` - 5 hrefs change (the `/financials*` rows only); all six
  `/analytics/*` rows stay (D-24 amended).
- `next.config.ts` redirect map (7 entries, one inverted).
- Phase 55's ledger RPCs - single source for the D-30 summary strip's Scheduled / Collected /
  Outstanding.
- Both export edge functions (verification only).
- `src/lib/breadcrumbs.ts` `LABEL_MAP` - add `expenses`, `year-end`; remove the now-dead
  `financials`. **Retain `analytics` and `financial`** - those segments stay live.

### Landmines
- **Over-redirecting - and now, mis-directing.** The most expensive mistakes available here are
  (a) emitting redirects for the three `/reports/*` identity paths (`ERR_TOO_MANY_REDIRECTS`),
  (b) emitting a redirect for any of the seven `/analytics/*` routes (breaks live pages), and
  (c) **shipping the stale `/analytics/financial -> /reports/analytics` entry**, which would 308 a
  live page into a URL that no longer exists. All three classes must be asserted absent (D-32), with
  the source array checked by **equality**, not subset.
- **Relocating a chart inside `/reports`** instead of deleting it - violates D-34. The four
  chart-bearing report sections on the current `/reports` index go away; only the date-range
  selector may move to `/reports/generate`.
- **"Fixing" the `get_billing_insights` key casing** instead of deleting the cards (D-33). That
  would surface subscription-billing figures under rental-revenue labels - a worse claims violation
  than rendering zero.
- Config `redirects()` shadow filesystem routes - deleting the old `page.tsx` is required for
  clarity, not optional (D-09). Applies to the 6 `/financials/*` routes and `/reports/analytics`.
- `PREMIUM_REPORT_TYPES` exists twice and can drift silently (D-12).
- Phase 55's Scheduled/Collected vocabulary must not regress into a bare "Revenue" label (D-18) -
  now directly governing the D-30 summary strip on the hub index.
- **Stale artifacts.** 56-RESEARCH.md and 56-VALIDATION.md were written pre-full-separation; both
  carry a dated correction block at the top listing exactly which conclusions the 2026-07-30 change
  invalidates. RESEARCH N1 and the UI-SPEC's original "longest-prefix-wins" active-state rule
  describe work that D-07 REVISED **deletes**. Do not implement from them.
</code_context>

<specifics>
## Specific Ideas
- The hub is a CONSOLIDATION, not a feature: no new report types, no new charts. Success is that
  the duplicated financial surfaces become one with nothing lost and no URL 404ing.
- **Reports and Analytics are two products, not one.** Statements and exports belong to Reports;
  every chart belongs to Analytics. The separation is the point (D-29) - a consolidation that
  flattened them into one tree, or that left one chart page behind as an exception, made navigation
  worse rather than better.
- The hub index should **earn being a page**. The summary strip is what makes it more than a menu
  (D-30).
- The redirect map is the contract with search engines and bookmarks - 1:1 exactness matters more
  than map size, and *not* redirecting a live route matters more than either. One entry points the
  other way; that is deliberate, not a bug to be "corrected".
- **A confidently-labelled zero is a claims violation, not a cosmetic one.** D-33 deletes surfaces
  that have been telling every owner in production that they collected $0 across 0 payments. In a
  claims-integrity milestone, that is the defect, not the styling.
- E2E before removal is a hard ordering constraint, not a preference (D-11).
</specifics>

<deferred>
## Deferred Ideas
- **Consolidate `PREMIUM_REPORT_TYPES` into a shared `supabase/functions/_shared/` module** so the
  two edge functions cannot drift. Requires redeploying both functions; out of scope for "verify
  intact" (D-12).
- **Fix `ExportButtons`' divergent paywall path** (the old D-21): it POSTs to `export-report` with
  no `type` param so the function defaults `reportType` to `"financial"` - a `PREMIUM_REPORT_TYPES`
  member - and surfaces the 402 as `FINANCIAL_EXPORT_FAILED` rather than `PaywallError`. Single call
  site: `src/app/(owner)/analytics/financial/page.tsx:103`. Outside this phase's route boundary
  under D-29. See OQ-3.
- **Strip the permanently-zero `paymentAnalytics` figures from the executive-monthly export**
  (`src/lib/reports/report-data.ts:381`) - same defect as D-33 on a different surface. See OQ-4.
- Adding new report types or analytics visualizations to the hub.
- Revisiting the collection-rate denominator basis raised in Phase 55's verification.
- Renaming `/reports/generate` and `/reports/year-end` for naming consistency with the statement
  routes - a broader nav-naming pass is its own concern.
- **Visual-regression coverage for the new hub** - the repo's live visual spec never runs in CI and
  has no baselines; making it real needs the `chromium` Playwright project added to CI plus Linux
  baselines. Noted because a consolidation is exactly when you would want it.
- **The `/documents` landing (DOCS-01)** - not deferred, *relocated*: it is Phase 65's entire
  scope (D-27), with D-14..D-17 preserved above for that phase to inherit.
- Absorbing any `/analytics/*` route into the hub - **withdrawn, not deferred** (D-29). The
  separation is the intended end state, not a postponed step.

### Reviewed Todos (not folded)
None - `todo.match-phase 56` returned zero matches.
</deferred>

---

*Phase: 56-reporting-hub-documents-landing (directory slug predates the D-27 split; Phase 56 is now
"Reporting Hub" only, Phase 65 is "Documents Landing")*
*Context gathered: 2026-07-26*
*Revised: 2026-07-26 - user scope correction: D-05/D-07/D-08/D-19/D-24 revised, D-27/D-28 added,
D-14..D-17 moved to Phase 65*

---

<open_question_resolutions>
## Open Questions RESOLVED (2026-07-30, evidence-verified)

OQ-1..OQ-5 from the reconciliation are now closed. Two of them turned out to rest on
false premises, and closing them surfaced a NEW production defect. Decisions D-35..D-40.

### D-35 (closes OQ-1) — DELETE the "Outstanding / accounts receivable" tile. Do NOT port it.

OQ-1 asked where Accounts Receivable should live once `/reports/analytics` is deleted.
**The premise was wrong twice over, and correcting it inverts the answer.**

1. **A/R never rendered on `/reports/analytics`.** That page renders a stats row (Total
   Revenue, Payment Success, Occupancy Rate, ACH Adoption) plus four charts. No receivable.
   D-20's "A/R is pinned to /reports/analytics" described an intended port that was never
   built. Deleting the route costs A/R nothing.

2. **The A/R figure that DOES ship is fabricated.** VERIFIED at
   `src/hooks/api/query-keys/financial-keys.ts:153`:

       accounts_receivable: monthlyRevenue,
       accounts_payable: 0,

   `financials-summary-stats.tsx:115-133` renders that value as
   `StatLabel "Outstanding"` / `StatDescription "accounts receivable"`. **It prints monthly
   revenue under the label "accounts receivable"** — opposite accounting concepts (money
   earned vs money owed to the owner). `accounts_payable` is a hardcoded 0.

   It also claims the exact word **"Outstanding"** that D-30 assigns to the summary strip's
   `scheduled - collected`. Porting it would ship TWO different "Outstanding" figures
   meaning different things on the same hub — precisely what D-04/D-30's single-source rule
   forbids.

**Decision:** when `financials-summary-stats.tsx` moves and becomes the `/reports` index
strip (D-07), DROP the `accountsReceivable` prop and its `Stat`. Also drop the
`accounts_receivable: monthlyRevenue` assignment at `financial-keys.ts:153`.

**D-20 is AMENDED, not preserved.** Its premise ("A/R is the one figure that would be lost")
does not survive verification: the figure is not A/R. Removing it is the claims-integrity
action; keeping it is the violation. A real A/R, if wanted later, should be derived from the
Phase 55 ledger (unpaid charge balances) — that is a NEW capability and belongs in its own
phase, not a port.

### D-36 (closes OQ-2) — ALL SIX files under `/reports/analytics/` are DELETED. Nothing moves.

D-02's "move the charts to /analytics" is superseded. Per-file verification:

| File | Disposition | Why |
|---|---|---|
| `page.tsx` | DELETE | route removal (D-29); covered by `/analytics/overview` + `/analytics/financial` |
| `analytics-stats-row.tsx` | DELETE | cards 1/2/4 read the broken `paymentAnalytics` (D-33); Occupancy Rate is already rendered by `analytics/overview/analytics-stat-cards.tsx:48` |
| `analytics-payment-methods-chart.tsx` | DELETE | broken source AND claims card-vs-ACH in a product that facilitates no rent payments (D-33) |
| `analytics-property-table.tsx` | DELETE | **provably dead** — its mapper hard-codes `byProperty: []`; covered by `analytics/property-performance/top-properties-table.tsx` |
| `analytics-occupancy-chart.tsx` | DELETE | same always-empty guard; has only ever rendered its empty state |
| `analytics-revenue-chart.tsx` | DELETE | triplicated by live `/analytics` charts |

Nothing is relocated to `/analytics`. This SIMPLIFIES the phase: the migration is a pure
deletion plus one redirect, with no component move to review.

### D-37 (closes OQ-4) — fix the executive-monthly export IN this phase, by deletion.

VERIFIED: `src/lib/reports/report-data.ts:379-383` calls
`safeFetch(qc, reportAnalyticsQueries.paymentAnalytics(start, end), PAYMENTS_FALLBACK)` —
the same broken mapper. `executiveKeyMetricsRows` (`report-data.ts:412-416`) then emits:

    { label: "Total Payments",      value: fmtNumber(payments.totalPayments) }
    { label: "Successful Payments", value: fmtNumber(payments.successfulPayments) }

Both permanently 0. Correction to the earlier framing: the broken export rows are payment
**counts**, not revenue dollars. The chain is client-side (`/reports/generate` ->
`buildReportData`), NOT an edge function. `executive-monthly` is **NOT** in
`PREMIUM_REPORT_TYPES` (`year-end`, `1099`, `financial`, `income-statement`, `cash-flow`),
so this is not exclusively a paying-customer defect — it reaches everyone who exports.

**Decision: remove those two rows and the `paymentAnalytics` fetch from the
executive-monthly path, inside Phase 56.** Frontend only — no migration, no RPC change.

Rationale: the phase already deletes two of the three consumers of this mapper. Shipping as
otherwise scoped would leave the export as the SOLE surviving consumer of code this phase
has just declared dead — a known-false claim in a customer-facing document, orphaned behind
a route nobody else touches. Deleting the last consumer is the same operation the phase is
already performing, not scope expansion.

### D-38 (closes OQ-3) — the `ExportButtons` paywall divergence is DEFERRED.

D-21's justification was that the D-06 merge would import a divergent paywall into the hub.
Under full separation that merge does not happen, and `ExportButtons`' only call site is
`analytics/financial/page.tsx:103` — OUTSIDE this phase's boundary. **D-21 is moot, not
preserved.** Recorded as a deferred item so it is not lost.

### D-39 (closes OQ-5) — deleting `analytics-stats-row.tsx` loses nothing.

The Occupancy Rate card inside it reads real data (`occupancyMetrics`), so wholesale
deletion looked risky. VERIFIED SAFE: `analytics/overview/analytics-stat-cards.tsx:48`
already renders an equivalent "Occupancy Rate" card from the same metric. No relocation
needed.

### D-40 (new finding) — `/analytics` is 3 real pages + 4 redirect shims. Correct the count.

Audited every route under `src/app/(owner)/analytics/`:

| Route | Reality |
|---|---|
| `/analytics` | REDIRECT -> `/analytics/overview` (5 lines) |
| `/analytics/overview` | **REAL** (235 lines) |
| `/analytics/financial` | **REAL** (252 lines + 9 components + 5 charts) |
| `/analytics/property-performance` | **REAL** (215 lines + 6 components) |
| `/analytics/leases` | REDIRECT -> `/leases?tab=insights` |
| `/analytics/maintenance` | REDIRECT -> `/maintenance?tab=insights` |
| `/analytics/occupancy` | REDIRECT -> `/properties?tab=insights` |

**Only 3 of 7 are real pages.** Any success criterion or doc claiming "3 real analytics pages + 4 redirect shims (D-40)" is provably false and must be reworded to: *"`/analytics` keeps its URL space —
3 pages (overview, financial, property-performance) plus 4 legacy redirect shims."*
Applies to ROADMAP SC-2 and every "3 real analytics pages + 4 redirect shims (D-40)" phrasing in this CONTEXT and the UI-SPEC.

**Guard B stays at 7 paths** — it is the correct tripwire for a stale `next.config.ts` 308,
but it proves "no config redirect matched", NOT "these are 7 live pages". Document that
distinction so the assertion is not misread as page-existence coverage.

**Does this invalidate the two-peer-nav decision?** No. The section's real substance
(`/analytics/financial` + `/analytics/property-performance` + `/analytics/overview`) is
genuine and is exactly the "how is the portfolio trending" surface the separation exists to
protect. But the hollowness is real and worth its own cleanup phase.

</open_question_resolutions>

<deferred_additions>
## Added to Deferred (2026-07-30)

- **`ExportButtons` divergent paywall path** (was D-21) — only call site is
  `analytics/financial/page.tsx:103`, outside this phase.
- **A real Accounts Receivable figure**, derived from Phase 55 ledger unpaid balances. New
  capability, not a port. See D-35.
- **`/analytics` redirect-shim cleanup** — 4 of 7 routes are shims to `?tab=insights`
  surfaces. See D-40.
- **`accounts_payable` is hardcoded 0** in `financial-keys.ts:154` — same class of defect as
  D-35, not surfaced in this phase's scope but should not be forgotten.

</deferred_additions>

*Reconciled: 2026-07-30 - FULL SEPARATION supersedes partial separation. D-29..D-34 added;
D-05 REVISED / D-06 / D-08 REVISED / D-19 REVISED / D-04 / D-28 superseded; D-21 / D-22 / D-23 moot;
D-24 reduced 6->5 hrefs; D-02 grouping and D-26 reframed. D-27 and the Phase 65 block unchanged.*

---

<pattern_mapper_conflicts>
## Pattern-Mapper Conflicts RESOLVED (2026-07-30) — D-41..D-44

The pattern mapper found two contradictions and three stale citations in the
decisions above. Verified and resolved here so the planner receives one coherent
position.

### D-41 (resolves CONFLICT-1) — the `/reports` index is a NEW composition. D-07 is NARROWED.

**The contradiction:** D-07 said "move and rename all six `financials-*` components."
D-30/UI-SPEC says the index carries a NEW three-tile ledger strip (Scheduled /
Collected / Outstanding from one `get_collection_rate` payload). Those are two
different components competing for the same slot. Verified importer counts:

| Component | Imported by |
|---|---|
| `financials-header` | `financials/page.tsx` ONLY |
| `financials-highlights` | `financials/page.tsx` ONLY |
| `financials-quick-links` | `financials/page.tsx` ONLY |
| `financials-summary-stats` | `financials/page.tsx` **AND `financials/expenses/_components/expense-stats.tsx`** |

So moving all six blindly after deleting `financials/page.tsx` would ship dead files.

**Resolution — per-component disposition, not a blanket move:**

- `financials-header` -> **MOVE + RENAME** to `reports-header.tsx`. Still the page header.
- `financials-quick-links` -> **MOVE + RENAME** to `reports-statement-list.tsx`. This becomes
  the D-06 statement list. Apply the four UI-SPEC deltas the pattern mapper tabulated on
  `QuickLinkCard` (drop `value`/`trend` props, drop the `bg-primary/10` medallion, drop
  `font-medium`, replace raw `text-emerald-600`/`text-red-600` with token classes).
- `financials-loading` / `financials-error` -> **MOVE + RENAME**. Still the route boundaries.
- `financials-summary-stats` -> **DO NOT MOVE. STAYS PUT.** It has a second live consumer
  (`expenses/_components/expense-stats.tsx`) that is NOT in this phase's scope. Moving it
  would break that import for no benefit. Apply ONLY the D-35 edit in place: drop the
  `accountsReceivable` prop and its `Stat`, fix the orphaned `Clock` import, and change
  `lg:grid-cols-4` -> 3 columns.
- `financials-highlights` -> **PLANNER'S CALL.** Evaluate whether the `/reports` index wants
  it alongside the new strip, or whether the strip supersedes it. If superseded, DELETE
  rather than move — do not ship a dead file.

**The new summary strip is NEW CODE, not a move.** Analog is
`src/components/ledger/ledger-balance-strip.tsx` + `collection-rate-kpi.tsx` +
`useCollectionRate()` — a complete shipped three-part reference. Per the pattern mapper the
phase writes **zero new query keys**; the `get_collection_rate` `queryOptions()` factory and
its typed mapper already exist.

### D-42 (resolves CONFLICT-2) — update BOTH `/reports/analytics` references.

Two live references to the route D-29 deletes:

1. `src/app/(owner)/reports/page.tsx:165` — a `<Link href="/reports/analytics">`. Dies with
   the index rewrite; no separate action needed, but the planner must not leave it behind.
2. `src/components/maintenance/maintenance-view.client.tsx:119` —
   `router.push("/reports/analytics")`. **Outside the phase's obvious surface.** The 308 would
   catch it, so it is not broken, but a client-side push through a redirect is sloppy and the
   indirection will outlive anyone's memory of why. **Repoint it directly to
   `/analytics/overview`.**

RESEARCH.md's claim that this call site is "VERIFIED SAFE" is **stale** — it was written
under partial separation, where `/reports/analytics` survived.

### D-43 — corrected citations (the decisions stand; the line numbers were wrong)

- **D-37**: the two broken export rows are at `report-data.ts:268-272`, NOT `:412-416`.
  `:412-416` is the call site. Both locations still need editing; the row deletion is at
  `:268-272`.
- **D-32 / Guard counts**: RESEARCH.md's E2E section still says 4 Guard A / 6 Guard B / 9 hub
  routes. Under D-32 it is **3 Guard A / 7 Guard B / 8 hub routes**. RESEARCH is stale here;
  D-32 governs.
- **`PREMIUM_REPORT_TYPES`**: re-verified byte-identical across `export-report/index.ts` and
  `generate-pdf/index.ts` — no drift. RPTHUB-03 still requires verifying both, but there is
  no divergence to repair.

### D-44 — deletions cascade into `noUnusedLocals`. Treat as part of each deletion task.

The repo compiles with `noUnusedLocals` + `noUnusedParameters`, so every deletion leaves a
compile error if its orphans are not cleaned in the same change:

- **D-35** orphans the `Clock` import in `financials-summary-stats.tsx` and requires the
  `lg:grid-cols-4` -> 3-column change.
- **D-37** orphans `PAYMENTS_FALLBACK`, the `ReportPaymentAnalytics` type import, and the
  `payments` function parameter — AND shifts a positional `Promise.all` tuple index, which is
  a silent-wrong-data risk if missed rather than a compile error.

Each deletion task must include its orphan cleanup in the same task, not a follow-up.

</pattern_mapper_conflicts>

*Open questions resolved: 2026-07-30 - D-35..D-40 added; D-20 amended, D-21 moot, D-02 superseded by D-36.*
*Pattern-mapper conflicts resolved: 2026-07-30 - D-41..D-44; D-07 narrowed to a per-component disposition.*
