# Phase 56: Reporting Hub & Documents Landing - Context

**Gathered:** 2026-07-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Collapse the three overlapping financial-reporting surfaces (`/financials/*`, `/analytics/*`,
`/reports/*`) into one `/reports` hub with real sub-routes, redirect every legacy URL 308 via
`next.config.ts`, prove the premium-export tier gate survives the consolidation, and replace the
`/documents` bare redirect with a real landing page. Requirements: RPTHUB-01..04, DOCS-01.

**In scope:** the `/reports` hub IA (Statements / Analytics / Exports), absorbing `/financials/*`
AND all of `/analytics/*` into hub sub-routes, the ~21-entry `next.config.ts` redirect map,
deletion of the superseded route files, E2E coverage on hub routes before any removal,
verification that `PREMIUM_REPORT_TYPES` gating still holds, and the `/documents` landing.

**Out of scope (do not build):**
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
  analytics views. Exports = generate + year-end.
- **D-03:** The existing `/reports/generate`, `/reports/year-end` and `/reports/analytics` are
  **re-slotted into the new grouping** rather than left in place. This means these three already-
  correct URLs ALSO need redirect entries - the redirect map is not limited to the legacy
  `/financials` and `/analytics` trees.
- **D-04:** The `/reports` index is **navigation only** - a directory of available reports, no KPI
  tiles, no data fetching. Rationale: nothing to keep honest, no risk of restating a dashboard
  figure differently.

### The /analytics section (deliberate scope expansion beyond RPTHUB-01)
- **D-05:** **All** of `/analytics/*` absorbs into the hub, not just `/analytics/financial` which is
  the only page RPTHUB-01 names. Every analytics URL 308s to `/reports/analytics/<view>`. The user
  chose this expansion knowingly; it adds ~6 redirect entries and ~6 E2E routes beyond the
  roadmap's budget. **Planner: account for this in wave sizing.**
- **D-06:** `/analytics/financial` **merges into the existing `/reports/analytics`** page rather
  than becoming a sibling sub-route. Read both `page.tsx` files first - they may already overlap
  heavily, which determines how much merging is real work vs deletion.
- **D-07:** The navigation keeps **two entries**, both pointing into the hub:
  `Reports -> /reports` and `Analytics -> /reports/analytics`. So the URL space consolidates while
  the familiar Analytics label survives and operational charts stay one click away.
- **D-08:** The `/analytics` index page is absorbed along with the rest - there is no surviving
  separate index to edit or cross-link.

### Legacy route removal (RPTHUB-02, RPTHUB-04)
- **D-09:** Old route files are **deleted**; redirects live **only** in `next.config.ts`
  `redirects()`. Config redirects are evaluated before filesystem routing, so a leftover
  `page.tsx` would be dead code. One redirect map, one source of truth. Follow the existing
  `permanent: true` entries in `next.config.ts` as the pattern.
- **D-10:** Redirect targets are **1:1 to the exact equivalent**, never group-level:
  `/financials/cash-flow -> /reports/cash-flow`, `/analytics/occupancy ->
  /reports/analytics/occupancy`. Bookmarks and search results land on what they asked for.
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

### /documents landing (DOCS-01)
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

### Carried forward from Phase 55 (do not re-decide)
- **D-18:** Revenue vocabulary is **Scheduled** (lease-derived, `get_revenue_trends_optimized.revenue`)
  vs **Collected** (ledger receipts). Nothing sums them. Any revenue figure the hub renders inherits
  this vocabulary exactly - the hub must not reintroduce a bare "Revenue" label or a third
  definition. See `.planning/phases/55-rent-ledger/55-CONTEXT.md` D-07/D-08.

### Post-research decisions (locked 2026-07-26, after 56-RESEARCH.md)

Research surfaced facts that changed or added decisions. These are as binding as D-01..D-18.

- **D-19 (CORRECTS D-03): the redirect map is 13 entries, not ~21.** Because the UI-SPEC chose FLAT
  slugs, `/reports`, `/reports/analytics`, `/reports/generate` and `/reports/year-end` keep their
  exact current paths. D-03 anticipated redirects for the re-slotted `/reports/*` routes; with flat
  slugs those become **identity no-ops**, and emitting them produces `ERR_TOO_MANY_REDIRECTS` on
  routes that work today. **Emit exactly 13 entries and assert the 4 identity paths do NOT redirect.**
  Redirect ordering is a non-issue: literal `source` values compile to both-ends-anchored regexes
  (verified from `.next/routes-manifest.json`), so `/analytics` cannot shadow `/analytics/financial`.

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

- **D-24: `app-shell.tsx` carries a SECOND complete route table.** The Cmd+K command palette holds 13
  legacy hrefs and is absent from the UI-SPEC. It must be updated alongside the nav, or the palette
  keeps deep-linking to deleted routes. The file's own comment records that a prior review already
  caught this class of miss once.

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

### Claude's Discretion
- The exact sub-route slugs under `/reports` (e.g. `/reports/exports/year-end` vs
  `/reports/year-end`) - pick whatever keeps the redirect map smallest while reading coherently.
- Whether `/reports/analytics` needs its own index or routes straight to a default view.
- Layout/composition of the hub index cards and the documents landing tiles (defer to the UI phase
  if one runs).
- Whether the recent-documents list is server-rendered or client-fetched.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` §"Phase 56: Reporting Hub & Documents Landing" - goal + 4 success criteria.
- `.planning/REQUIREMENTS.md` lines 59-66 - RPTHUB-01..04 and DOCS-01 exact wording.

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
  income-statement, tax-documents.
- `src/app/(owner)/analytics/` - 7 pages: index, financial, leases, maintenance, occupancy,
  overview, property-performance.
- `src/app/(owner)/reports/` - 4 pages: index, analytics, generate, year-end.
- `src/app/(owner)/documents/page.tsx` - the `permanentRedirect` being reversed by DOCS-01.
- `src/app/(owner)/documents/vault/`, `documents/lease-template/`, `documents/templates/*` - the
  four printable templates the landing must surface.

### Revenue vocabulary (inherited)
- `.planning/phases/55-rent-ledger/55-CONTEXT.md` D-07/D-08 - Scheduled vs Collected, never summed.
- `.planning/phases/55-rent-ledger/VERIFICATION.md` - notes the open question about the
  collection-rate denominator basis, which the hub may surface.
</canonical_refs>

<code_context>
## Existing Code Insights

### Full legacy URL inventory (17 route files -> ~21 redirect entries with re-slotting)
```
/analytics                      /financials                    /reports
/analytics/financial            /financials/balance-sheet      /reports/analytics
/analytics/leases               /financials/cash-flow          /reports/generate
/analytics/maintenance          /financials/expenses           /reports/year-end
/analytics/occupancy            /financials/income-statement
/analytics/overview             /financials/tax-documents
/analytics/property-performance
```
`/reports/*` entries appear because D-03 re-slots them.

### Reusable assets
- `next.config.ts` `redirects()` already exists with `permanent: true` entries - extend, do not
  invent a new mechanism.
- `/reports/analytics/page.tsx` already exists - `/analytics/financial` merges INTO it (D-06).
- Existing E2E patterns in `tests/e2e/tests/owner/` for owner-route smoke coverage.
- The vault's existing document query/mapper - reuse for the landing's recent list (D-14).

### Integration points
- Navigation config (two entries, both into the hub - D-07). Locate the nav source; a first grep of
  `src/components/layout` and `src/config` did not surface the route literals, so the planner must
  find where nav entries are actually defined.
- `next.config.ts` redirect map.
- Both export edge functions (verification only).

### Landmines
- Config `redirects()` shadow filesystem routes - deleting the old `page.tsx` is required for
  clarity, not optional (D-09).
- `PREMIUM_REPORT_TYPES` exists twice and can drift silently (D-12).
- Phase 55's Scheduled/Collected vocabulary must not regress into a bare "Revenue" label (D-18).
</code_context>

<specifics>
## Specific Ideas
- The hub is a CONSOLIDATION, not a feature: no new report types, no new charts. Success is that
  three surfaces become one with nothing lost and no URL 404ing.
- The redirect map is the contract with search engines and bookmarks - 1:1 exactness matters more
  than map size.
- E2E before removal is a hard ordering constraint, not a preference (D-11).
</specifics>

<deferred>
## Deferred Ideas
- **Consolidate `PREMIUM_REPORT_TYPES` into a shared `supabase/functions/_shared/` module** so the
  two edge functions cannot drift. Requires redeploying both functions; out of scope for "verify
  intact" (D-12).
- Adding new report types or analytics visualizations to the hub.
- Revisiting the collection-rate denominator basis raised in Phase 55's verification.

### Reviewed Todos (not folded)
None - `todo.match-phase 56` returned zero matches.
</deferred>

---

*Phase: 56-reporting-hub-documents-landing*
*Context gathered: 2026-07-26*
