# Phase 56: Reporting Hub - Context

**Gathered:** 2026-07-26
**Revised:** 2026-07-26 (user scope correction - see D-27; directory name retains the pre-split slug)
**Status:** Ready for planning

<domain>
## Phase Boundary

Collapse the duplicated financial-reporting surfaces (`/financials/*`, `/analytics/financial`,
`/reports/*`) into one `/reports` hub with real sub-routes, redirect every legacy financial URL
308 via `next.config.ts`, and prove the premium-export tier gate survives the consolidation.
Requirements: RPTHUB-01, RPTHUB-02, RPTHUB-03, RPTHUB-04.

`/analytics` is **not** part of this phase's URL space, and `/documents` has moved out of this
phase entirely (D-27). Reports = financial statements + exports. Analytics = operational insight.
Two distinct product surfaces, two nav sections, two URL trees.

**In scope:** the `/reports` hub IA (Statements / Analytics / Exports), absorbing `/financials/*`
plus the single page `/analytics/financial` into hub sub-routes, the 7-entry `next.config.ts`
redirect map, deletion of the superseded route files, E2E coverage on hub routes before any
removal, and verification that `PREMIUM_REPORT_TYPES` gating still holds.

**Out of scope (do not build):**
- **Absorbing the rest of `/analytics/*`.** `/analytics` (index), `/analytics/leases`,
  `/analytics/maintenance`, `/analytics/occupancy`, `/analytics/overview` and
  `/analytics/property-performance` KEEP their URLs, keep their nav section, and are not touched,
  not redirected and not E2E-covered here. (Reverses the earlier D-05 expansion - see D-05 REVISED.)
- **The `/documents` landing (DOCS-01).** Moved to its own phase (D-27). Nothing about
  `/documents`, the vault, the lease-template builder or the printable templates is built here.
- **A longest-prefix-wins nav active-state resolver.** No longer needed and explicitly not in
  scope - see D-07 REVISED.
- New report types or new analytics visualizations - this phase MOVES and CONSOLIDATES existing
  surfaces, it does not add reporting capability.
- De-duplicating `PREMIUM_REPORT_TYPES` across the two edge functions (deferred, see below).
- Any change to `proxy.ts` - RPTHUB-02 explicitly routes redirects through `next.config.ts` only.
- Re-deriving revenue figures. Phase 55 already fixed the vocabulary; the hub consumes it.
</domain>

<decisions>
## Implementation Decisions

### Hub structure (RPTHUB-01)
- **D-01:** The hub uses **real sub-routes**, not tabs or a single scrolling page:
  `/reports/income-statement`, `/reports/cash-flow`, etc. Chosen because it gives every legacy URL
  a 1:1 redirect target, keeps deep links and E2E simple, and matches the sub-routes `/reports`
  already has.
- **D-02:** The hub index groups reports as **Statements / Analytics / Exports**. Statements =
  income-statement, balance-sheet, cash-flow, tax-documents, expenses. Analytics = the absorbed
  analytics views. Exports = generate + year-end. *(Grouping stands unchanged. The Analytics group
  now holds exactly ONE entry - the merged `/reports/analytics` - because D-05 was reverted. Tile
  inventory: see D-28.)*
- **D-03:** The existing `/reports/generate`, `/reports/year-end` and `/reports/analytics` are
  **re-slotted into the new grouping** rather than left in place. This means these three already-
  correct URLs ALSO need redirect entries - the redirect map is not limited to the legacy
  `/financials` and `/analytics` trees. *(Superseded on the redirect point by D-19 REVISED: flat
  slugs make those three identity no-ops, so they get NO redirect entries. The re-slotting into the
  grouping still stands - it is a hub-index concern, not a URL concern.)*
- **D-04:** The `/reports` index is **navigation only** - a directory of available reports, no KPI
  tiles, no data fetching. Rationale: nothing to keep honest, no risk of restating a dashboard
  figure differently.

### The /analytics section (scope REVERTED to RPTHUB-01 as written)

The three decisions below were rewritten on 2026-07-26 on the user's explicit direction, after the
original artifacts were written. The user's rationale, verbatim: *"take the split seriously because
analytics and the other scope is supposed to be separate for better navigation and ultimately a
better user experience"*, followed by the selection *"Revert D-05 - /analytics stays where it is"*.
Reports and Analytics are two genuinely distinct product surfaces - financial statements and
exports on one side, operational insight on the other - and collapsing them into one URL tree
degraded navigation rather than simplifying it.

- **D-05 REVISED (supersedes the original D-05 "absorb all of `/analytics/*`"):** Only
  **`/analytics/financial`** folds into the hub - exactly the one page RPTHUB-01 names, no more.
  The other six analytics routes (`/analytics` index, `/analytics/leases`,
  `/analytics/maintenance`, `/analytics/occupancy`, `/analytics/overview`,
  `/analytics/property-performance`) **keep their URLs and remain their own section**. They are not
  moved, not redirected, not deleted and not re-covered by this phase's E2E. The original D-05
  expansion (~6 extra redirects, ~6 extra E2E routes) is **withdrawn** - planners must NOT budget
  for it.
- **D-06:** `/analytics/financial` **merges into the existing `/reports/analytics`** page rather
  than becoming a sibling sub-route. Read both `page.tsx` files first - they may already overlap
  heavily, which determines how much merging is real work vs deletion. *(Unchanged - D-26 already
  corrected the cost assumption.)*
- **D-07 REVISED (supersedes the original D-07 "two entries, both pointing into the hub"):** The
  navigation carries **two REAL sections, not two doors into one hub**:
  `Reports -> /reports` and `Analytics -> /analytics`. Each section owns its own URL tree.
  **Consequence - the nav active-state problem DISSOLVES.** The double-active bug the UI-SPEC
  found (`src/components/shell/main-nav.tsx`, `isActive` at :188 / `startsWith` at :190 marking
  both entries active on `/reports/analytics/*`) existed *only* because the original D-07 pointed
  both hrefs into `/reports`. With `/reports` and `/analytics` there is **no prefix overlap**, so
  the existing `startsWith` resolver is already correct. **The longest-prefix-wins resolver work
  and its 6 pinned cases are DELETED from this phase** - from the UI-SPEC's active-state rule and
  from RESEARCH N1. Do not carry it forward as a "latent bug fix"; it is out of scope now.
- **D-08 REVISED (supersedes the original D-08 "the `/analytics` index is absorbed"):** The
  `/analytics` index page **SURVIVES** at `/analytics`. Its financial entry becomes a **cross-link
  pointing at the hub** (`/reports/analytics`), so owners who learned the old location still find
  the financial view after it moves. That cross-link is the only edit `/analytics/page.tsx`
  receives in this phase.

### Legacy route removal (RPTHUB-02, RPTHUB-04)
- **D-09:** Old route files are **deleted**; redirects live **only** in `next.config.ts`
  `redirects()`. Config redirects are evaluated before filesystem routing, so a leftover
  `page.tsx` would be dead code. One redirect map, one source of truth. Follow the existing
  `permanent: true` entries in `next.config.ts` as the pattern.
- **D-10:** Redirect targets are **1:1 to the exact equivalent**, never group-level:
  `/financials/cash-flow -> /reports/cash-flow`, `/analytics/financial -> /reports/analytics`.
  Bookmarks and search results land on what they asked for. *(Decision unchanged; the original
  second example `/analytics/occupancy -> /reports/analytics/occupancy` was replaced because that
  route no longer moves - D-05 REVISED.)*
- **D-11:** Sequencing is enforced **inside this phase** by wave ordering:
  **build the hub -> E2E-cover the hub routes -> only then add redirects and delete legacy files.**
  There must never be a commit where a legacy route is gone and its hub replacement is unproven.
  This is how RPTHUB-04 is satisfied.

### Tier gating (RPTHUB-03)
- **D-12:** Verify the gate holds **in both** `supabase/functions/export-report/index.ts` (the
  `PREMIUM_REPORT_TYPES` set at :24, checked at :72) and
  `supabase/functions/generate-pdf/index.ts` (the mirror at :31, checked at :322), with a test.
  The duplication is **left in place** - consolidating shared Deno code across two deployed edge
  functions is its own change, not "verify intact". Recorded as a deferred idea.
- **D-13:** No route rewrite may bypass the gate. The hub's export CTAs must reach the same edge
  functions with the same `reportType` values - confirm the values still match after re-slotting.

### MOVED OUT OF PHASE 56 -> Phase 65 "Documents Landing" (DOCS-01)

> **These four decisions (D-14, D-15, D-16, D-17) NO LONGER BELONG TO PHASE 56.** They were split
> out on 2026-07-26 (see D-27) and are the property of Phase 65. They are preserved here
> **verbatim** so Phase 65's context can inherit them without loss; nothing in this block is
> planned, built, tested or shipped by Phase 56. Phase 56 planners: skip to "Carried forward from
> Phase 55". Everything about the `/documents` landing - the three-band ladder, the six tiles, the
> nested recent-documents panel, the vault-canonical decision and the reversed `permanentRedirect`
> - travels with them.

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

### Post-research decisions (locked 2026-07-26, after 56-RESEARCH.md)

Research surfaced facts that changed or added decisions. These are as binding as D-01..D-18.

- **D-19 REVISED (CORRECTS D-03; supersedes the 13-entry map): the redirect map is exactly 7
  entries.** The 13-entry version assumed the withdrawn D-05 (all of `/analytics/*` absorbed). With
  D-05 REVISED, only the six `/financials/*` routes and the single `/analytics/financial` route
  move. **Emit exactly these 7, all `permanent: true` (308):**

  | source | destination |
  |---|---|
  | `/financials` | `/reports` |
  | `/financials/balance-sheet` | `/reports/balance-sheet` |
  | `/financials/cash-flow` | `/reports/cash-flow` |
  | `/financials/expenses` | `/reports/expenses` |
  | `/financials/income-statement` | `/reports/income-statement` |
  | `/financials/tax-documents` | `/reports/tax-documents` |
  | `/analytics/financial` | `/reports/analytics` |

  **The identity-no-op guard from the original D-19 STILL APPLIES.** Because the UI-SPEC chose FLAT
  slugs, `/reports`, `/reports/analytics`, `/reports/generate` and `/reports/year-end` keep their
  exact current paths. D-03 anticipated redirects for the re-slotted `/reports/*` routes; with flat
  slugs those become **identity no-ops**, and emitting them produces `ERR_TOO_MANY_REDIRECTS` on
  routes that work today. **Assert those 4 identity paths do NOT redirect.**

  **Additionally, the six non-financial `/analytics/*` routes must ALSO not be emitted** -
  `/analytics`, `/analytics/leases`, `/analytics/maintenance`, `/analytics/occupancy`,
  `/analytics/overview`, `/analytics/property-performance` are not moving at all (D-05 REVISED).
  A redirect on any of them breaks a live, correct route. Assert their absence the same way.

  Redirect ordering remains a non-issue: literal `source` values compile to both-ends-anchored
  regexes (verified from `.next/routes-manifest.json`), so `/analytics` cannot shadow
  `/analytics/financial` - and with only `/analytics/financial` emitted, the question is moot.

- **D-20: Accounts Receivable is PORTED into the hub, not dropped.** It is the one figure that
  disappears when `/financials` is deleted (profit margin survives via
  `financial-overview-stats.tsx:141`). v10.0 is a claims-integrity milestone and Phase 55 spent its
  entire budget on not losing or fabricating numbers - silently dropping one contradicts that. Carry
  it onto a hub route as a single card.

- **D-21: the `ExportButtons` divergent paywall path IS fixed in this phase.** It POSTs to
  `export-report` with no `type` param, so the function defaults `reportType` to `"financial"` - a
  `PREMIUM_REPORT_TYPES` member - and it surfaces the 402 as `FINANCIAL_EXPORT_FAILED` rather than
  `PaywallError`. The D-06 merge would import a second, divergent paywall pattern into the hub.
  Small and contained; two ways to surface the same 402 on one surface is precisely the
  inconsistency this consolidation exists to end.

- **D-22: the merged analytics page gets ONE period control governing the whole page.** The two
  source pages share zero state, so the merge inherits two independent controls. A `Select` that
  silently governs only half the charts is the unacceptable outcome; a single control is the only
  honest reading. (User delegated this to Claude's discretion; recorded here as locked.)

- **D-23: the Analytics hub tile is NOT badged `Growth`.** The page is viewable on any tier and only
  one export inside it is gated, so badging the whole tile would overstate the gate. This keeps the
  UI-SPEC's approved tier-gate table unchanged - the contradicting evidence was considered and the
  table stands.

- **D-24 AMENDED (reduced href set): `app-shell.tsx` carries a SECOND complete route table.** The
  Cmd+K `commandGroups` route table is absent from the UI-SPEC and must be updated alongside the
  nav, or the palette keeps deep-linking to deleted routes. The file's own comment records that a
  prior review already caught this class of miss once. **With D-05 REVISED, exactly 6 hrefs change**
  (verified against `src/components/shell/app-shell.tsx`): the **five** `/financials*` palette rows
  at `:145` (`/financials`), `:148` (income-statement), `:151` (cash-flow), `:154` (balance-sheet),
  `:159` (tax-documents), plus `:115` (`/analytics/financial`). **Note the palette has no
  `/financials/expenses` row** - the route exists but was never added to the command palette, which
  is why this is 6 and not 7. The five surviving analytics hrefs (`/analytics/overview` `:110`,
  `/analytics/property-performance` `:120`, `/analytics/leases` `:125`,
  `/analytics/maintenance` `:130`, `/analytics/occupancy` `:135`) **stay exactly as they are** - editing
  them would point the palette away from live routes. The earlier "13 legacy hrefs" figure is
  withdrawn along with D-05.

- **D-25 (RPTHUB-04 is not satisfiable the obvious way): CI runs only
  `--project=smoke --project=public --project=owner-axe`** (`ci-cd.yml:162`). The `owner` Playwright
  project NEVER executes, so a spec added under `tests/e2e/tests/owner/` gates nothing - which is
  already true of `owner-financials.e2e.spec.ts` and `reports-gate.spec.ts`. Hub-route coverage MUST
  land in **`owner-axe`**; redirect coverage in **`public`** (needs no auth - config redirects
  resolve at Next.js step 2, before Proxy at step 3, which is also why RPTHUB-02's "no proxy
  involvement" holds structurally).

- **D-26 (CORRECTS the D-06 cost assumption): the two analytics pages do NOT overlap.** Zero shared
  data sources, zero shared components (11 vs 5 children;
  `analyticsQueries.financialPageData()` vs three `use-reports` hooks). Budget the merge as a
  standalone plan, not a cheap dedup.

### Scope corrections (locked 2026-07-26, user directive - binding, post-artifact)

These were issued by the user AFTER 56-CONTEXT/RESEARCH/UI-SPEC/VALIDATION were written and
override anything already committed in them.

- **D-27: THE PHASE IS SPLIT IN TWO.**
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
  ROADMAP.md, REQUIREMENTS.md and the remaining 56-* artifacts must be reconciled to this split.

- **D-28: the hub index carries 8 tiles, not 13.** Direct consequence of D-05 REVISED:
  **Statements (5)** = balance-sheet, cash-flow, expenses, income-statement, tax-documents;
  **Analytics (1)** = one entry pointing at `/reports/analytics`; **Exports (2)** = generate,
  year-end. Plus wherever the D-20 Accounts Receivable card lands. Any artifact still saying 13
  tiles is stale.

### Claude's Discretion
- The exact sub-route slugs under `/reports` (e.g. `/reports/exports/year-end` vs
  `/reports/year-end`) - pick whatever keeps the redirect map smallest while reading coherently.
- Whether `/reports/analytics` needs its own index or routes straight to a default view.
- Layout/composition of the hub index cards (defer to the UI phase if one runs).
- Placement/wording of the `/analytics` index cross-link to `/reports/analytics` (D-08 REVISED).
- *(Documents-landing discretion items - tile layout balance, server-rendered vs client-fetched
  recent list - moved to Phase 65 with D-14..D-17.)*
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` §"Phase 56: Reporting Hub" - **reconciled to D-27 (no longer stale).** The
  section is retitled "Reporting Hub", lists only RPTHUB-01..04, and its success criteria now read:
  SC-1 the hub is the single navigation entry for reporting; SC-2 `/analytics` remains its own
  section with the six surviving pages untouched and its index cross-linking to the hub; **SC-3 all
  seven moved URLs 308-redirect, and routes that are not moving emit no redirect**; SC-4 tier-gating
  verified with E2E before legacy removal. A dated Revision note records what the pre-split
  definition said and why it changed.
- `.planning/ROADMAP.md` §"Phase 65: Documents Landing" - owns DOCS-01 and the entire `/documents`
  landing. See also ROADMAP.md:24 and :26 for the integer-only, append-only numbering rule that put
  the split at 65 rather than a decimal.
- `.planning/REQUIREMENTS.md` - RPTHUB-01..04 exact wording; its requirement→phase mapping table
  points DOCS-01 at Phase 65.
- **SC-1 note:** ROADMAP SC-1 and RPTHUB-01 both say "a single navigation entry". With `/analytics`
  staying separate (D-05 REVISED), **Reports IS a single entry for reporting** - there is no
  tension to reconcile and no reconciliation paragraph is needed. Any artifact carrying one should
  drop it.

### Redirect mechanics (RPTHUB-02)
- `next.config.ts` - the existing `redirects()` block (~line 85) with `permanent: true` entries is
  the pattern to follow. Note the surrounding comment about keeping the FULL map so a Supabase blip
  cannot break redirects.
- `src/lib/seo/blog-redirects.ts` - the established precedent for a large maintained redirect map.

### Tier gating (RPTHUB-03)
- `supabase/functions/export-report/index.ts` - `PREMIUM_REPORT_TYPES` set at :24, gate at :72.
- `supabase/functions/generate-pdf/index.ts` - the mirror set at :31, gate at :322. The comment at
  :26 explicitly labels it a mirror; confirm the two sets have not already drifted.

### Surfaces being consolidated
- `src/app/(owner)/financials/` - 6 pages: index, balance-sheet, cash-flow, expenses,
  income-statement, tax-documents. **All 6 move.**
- `src/app/(owner)/analytics/` - 7 pages. **Only `financial/` moves.** The other 6 (index, leases,
  maintenance, occupancy, overview, property-performance) stay put; `index` gets a one-line
  cross-link edit only (D-08 REVISED). Do not delete or redirect them.
- `src/app/(owner)/reports/` - 4 pages: index, analytics, generate, year-end. Paths unchanged
  (identity no-ops, D-19 REVISED).
- `src/components/shell/main-nav.tsx` - two independent sections (`Reports -> /reports`,
  `Analytics -> /analytics`); the existing `startsWith` `isActive` at :188-191 is **already
  correct** and must not be replaced (D-07 REVISED).
- *(Phase 65 only, NOT this phase: `src/app/(owner)/documents/page.tsx` and the vault /
  lease-template / templates surfaces.)*

### Revenue vocabulary (inherited)
- `.planning/phases/55-rent-ledger/55-CONTEXT.md` D-07/D-08 - Scheduled vs Collected, never summed.
- `.planning/phases/55-rent-ledger/VERIFICATION.md` - notes the open question about the
  collection-rate denominator basis, which the hub may surface.
</canonical_refs>

<code_context>
## Existing Code Insights

### Full legacy URL inventory (7 route files move -> 7 redirect entries)
```
MOVES (7 redirects)              STAYS - do NOT redirect (10)
/financials                      /reports            /analytics
/financials/balance-sheet        /reports/analytics  /analytics/leases
/financials/cash-flow            /reports/generate   /analytics/maintenance
/financials/expenses             /reports/year-end   /analytics/occupancy
/financials/income-statement                         /analytics/overview
/financials/tax-documents                            /analytics/property-performance
/analytics/financial
```
The four `/reports/*` paths are identity no-ops (D-19 REVISED, correcting D-03's re-slotting
assumption). The six non-financial `/analytics/*` paths are not moving at all (D-05 REVISED).
Emitting a redirect for any of the 10 breaks a working route.

### Reusable assets
- `next.config.ts` `redirects()` already exists with `permanent: true` entries - extend, do not
  invent a new mechanism.
- `/reports/analytics/page.tsx` already exists - `/analytics/financial` merges INTO it (D-06).
- Existing E2E patterns in `tests/e2e/tests/owner/` for owner-route smoke coverage (but land the
  new specs in `owner-axe` / `public` per D-25).
- `main-nav.tsx`'s existing `startsWith` active-state resolver - reuse as-is, no rewrite (D-07
  REVISED).
- *(Phase 65: the vault's document query/mapper for the landing's recent list - D-14.)*

### Integration points
- `src/components/shell/main-nav.tsx` - two independent sections, `Reports -> /reports` and
  `Analytics -> /analytics` (D-07 REVISED). Only the financial hrefs inside the Analytics section
  change.
- `app-shell.tsx` `commandGroups` - 6 hrefs change (5 `/financials*` + `/analytics/financial`); the
  five surviving `/analytics/*` rows stay (D-24 AMENDED).
- `src/app/(owner)/analytics/page.tsx` - the surviving index; financial entry becomes a cross-link
  to `/reports/analytics` (D-08 REVISED).
- `next.config.ts` redirect map (7 entries).
- Both export edge functions (verification only).

### Landmines
- **Over-redirecting.** The single most expensive mistake available here is emitting redirects for
  the four `/reports/*` identity paths (`ERR_TOO_MANY_REDIRECTS`) or for the six surviving
  `/analytics/*` routes (breaks live pages). Both classes must be asserted absent (D-19 REVISED).
- Config `redirects()` shadow filesystem routes - deleting the old `page.tsx` is required for
  clarity, not optional (D-09). Applies to the 7 moving routes ONLY.
- `PREMIUM_REPORT_TYPES` exists twice and can drift silently (D-12).
- Phase 55's Scheduled/Collected vocabulary must not regress into a bare "Revenue" label (D-18).
- Stale artifacts: RESEARCH N1 and the UI-SPEC's "longest-prefix-wins, exactly one winner"
  active-state rule (56-UI-SPEC.md:227) both describe work that D-07 REVISED **deletes**. Do not
  implement from them.
</code_context>

<specifics>
## Specific Ideas
- The hub is a CONSOLIDATION, not a feature: no new report types, no new charts. Success is that
  the duplicated financial surfaces become one with nothing lost and no URL 404ing.
- **Reports and Analytics are two products, not one.** Financial statements and exports belong to
  Reports; operational insight belongs to Analytics. The separation is the point (D-05/D-07/D-08
  REVISED) - a consolidation that flattened both into one tree made navigation worse, not better.
- The redirect map is the contract with search engines and bookmarks - 1:1 exactness matters more
  than map size, and *not* redirecting a live route matters more than either.
- E2E before removal is a hard ordering constraint, not a preference (D-11).
</specifics>

<deferred>
## Deferred Ideas
- **Consolidate `PREMIUM_REPORT_TYPES` into a shared `supabase/functions/_shared/` module** so the
  two edge functions cannot drift. Requires redeploying both functions; out of scope for "verify
  intact" (D-12).
- Adding new report types or analytics visualizations to the hub.
- Revisiting the collection-rate denominator basis raised in Phase 55's verification.
- **The `/documents` landing (DOCS-01)** - not deferred, *relocated*: it is Phase 65's entire
  scope (D-27), with D-14..D-17 preserved above for that phase to inherit.
- Absorbing the six operational `/analytics/*` routes into the hub - **withdrawn, not deferred**
  (D-05 REVISED). The separation is the intended end state, not a postponed step.

### Reviewed Todos (not folded)
None - `todo.match-phase 56` returned zero matches.
</deferred>

---

*Phase: 56-reporting-hub-documents-landing (directory slug predates the D-27 split; Phase 56 is now
"Reporting Hub" only, Phase 65 is "Documents Landing")*
*Context gathered: 2026-07-26*
*Revised: 2026-07-26 - user scope correction: D-05/D-07/D-08/D-19/D-24 revised, D-27/D-28 added,
D-14..D-17 moved to Phase 65*
