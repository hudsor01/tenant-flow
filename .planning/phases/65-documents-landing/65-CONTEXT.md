# Phase 65: Documents Landing - Context

**Gathered:** 2026-08-02
**Status:** Ready for planning

<domain>
## Phase Boundary

`/documents` stops being a bare `permanentRedirect("/documents/vault")` and becomes a real
landing page: a navigation surface with entry points to the document vault, the lease
template builder, and the four printable templates, plus a preview of recently added
documents.

**Requirement:** DOCS-01 (the only one).

**Not in this phase:** anything under `/reports` or `/analytics` (Phase 56, shipped), any
change to the vault's own search/filter/bulk-download behaviour, any new upload path, and
any change to the five detail surfaces where documents are actually uploaded.

**This phase inherits an unusually complete contract.** The full design was authored before
the Phase 56/65 split and preserved verbatim rather than deleted. Downstream agents must
read it — see Canonical References — and must NOT re-derive it.
</domain>

<decisions>
## Implementation Decisions

### Inherited and still binding (D-14..D-17, authored pre-split, verified against code 2026-08-02)

- **D-01:** The three-band descending-weight ladder stands: Band 1 Vault (full width,
  contains the nested recent list, carries the page's ONLY primary Button), Band 2 Lease
  Template Builder, Band 3 four printables in a responsive grid. Six tiles plus a list.
- **D-02:** The recent list is a `'use client'` island calling
  `documentSearchQueries.list({ page: 0 })` and slicing to 5 client-side — the SAME factory,
  key, RPC and mapper the vault uses. Building a second query, a second mapper, or a direct
  `.from('documents')` select is a blocking violation.
- **D-03:** Recent rows are NON-interactive previews — no `<a>`, no `<button>`, no hover
  affordance. One door: the panel's `View all documents` link.
- **D-04:** The page is a Server Component; only the recent panel is a client island.
- **D-05:** `/documents/vault` stays canonical. No redirect is added for it; marketing
  surfaces are untouched.
- **D-06:** The `permanentRedirect` is reversed, and `page.tsx` carries a short comment
  recording that DOCS-01 superseded the earlier "no plan to bring back a /documents index"
  decision, so the reversal reads as deliberate.
- **D-07:** Tile icons and copy per the inherited icon table (FolderArchive, FileCheck,
  ClipboardList, ClipboardCheck, Wrench, FileWarning). Breadcrumb LABEL_MAP gains `vault`,
  `templates`, `rental-application`, `property-inspection`, `maintenance-request`,
  `tenant-notice`.

### Navigation — the inherited flat ruling STANDS (D-08 was amended, then REVERTED)

- **D-08:** **`Documents` is a FLAT nav entry pointing at `/documents`** — no children.
  This is the inherited ruling, restored.

  **History, recorded so it is not re-litigated.** During discussion I amended this to a
  parent+children shape mirroring `Reports`, on the rationale that it would keep the vault
  at one click while still making the landing navigable. **The second half of that rationale
  is false, and research caught it.** `renderNavItem`'s `hasChildren` branch
  (`main-nav.tsx:211-230`) renders the parent as a `<button onClick={toggleExpanded}>` with
  **no `<Link>` at all**; `item.href` is consumed only by `isActive(item.href)` at `:208`,
  which that branch never reads. A parent's href is decorative.

  So mirroring `Reports` would have made `/documents` **unreachable from the sidebar** —
  defeating DOCS-01's "entry point" requirement outright. Flat items render as `<Link>`
  (`main-nav.tsx` non-children branch), so flat is the only shape in the current component
  that satisfies the requirement without changing shared nav behaviour.

  **Accepted cost:** the vault becomes two clicks — sidebar → landing → "Open the vault".
  The inherited contract knew this and accepted it; Band 1 is a full-width panel whose
  primary Button is the vault, so the second click is the page's single loudest affordance.

- **D-09:** The one-item `Templates` nav section is **deleted**. Unchanged by the revert —
  Band 2 surfaces the lease builder, and the precedent sits four lines above it at
  `main-nav.tsx:88-91` ("Generate Lease" removed from this same section for duplicating a
  CTA surfaced elsewhere). With D-08 flat, `Lease Template` has no parent to become a child
  of; it is simply removed and reached from the landing.

- **D-10:** Both `Documents` entries change: `main-nav.tsx:48` AND the Cmd+K palette at
  `app-shell.tsx:101`. Missing the second leaves the command palette on the old target.
  Research additionally found a **Cmd+K `Templates` group at `app-shell.tsx:162-176`** that
  D-09 did not account for — it must be handled consistently with the sidebar section being
  deleted. See 65-RESEARCH.md L-04.

- **D-08b (NEW, out of scope — recorded for follow-up):** The same mechanism means the
  **`/reports` hub index shipped by Phase 56 is unreachable from the sidebar.** Clicking
  "Reports" expands seven children, none of which is `/reports`. It remains reachable by
  breadcrumb from any child (`app-shell-header.tsx:59-65` renders ancestor crumbs as
  `<Link>`) and by the Cmd+K entry at `app-shell.tsx:137`. Not a Phase 65 concern and not
  fixed here; the fix is a shared `renderNavItem` change affecting Reports and Analytics,
  which needs its own phase. Recorded in `<deferred>`.

### Recent-list freshness — NEW, resolves a pre-existing defect this phase would expose

- **D-11:** **Add `queryClient.invalidateQueries({ queryKey: documentSearchQueries.all() })`
  to `invalidateListAndDashboard`** in `src/components/documents/documents-section.tsx:137-142`
  (plus the import). One line and one import.

  **Why, and why not the alternative.** *(Corrected 2026-08-02 by 65-RESEARCH.md — my
  original wording here was wrong twice.)* It is NOT true that "nothing invalidates
  `documentSearchQueries`": `categories-settings.tsx:69` does, via
  `documentQueries.all()` = `["documents"]`, which prefix-matches
  `["documents","search",…]` — its comment at `:62-68` says so explicitly. The accurate
  claim is narrower: **no UPLOAD or DELETE mutation invalidates it.**
  `invalidateListAndDashboard` invalidates the ENTITY-scoped
  `documentQueries.list({entityType, entityId})` — key `["documents","list",…]` — which
  cannot prefix-match the search key. So after an upload the search entry stays
  fresh-by-staleTime for 45 minutes.

  Giving the landing its own shorter `staleTime` was considered and REJECTED. Per-observer
  `staleTime` is real (verified against query-core 5.100.10 source: no read of
  `query.options.staleTime` exists; `isStaleByTime` takes it as a parameter at `query.ts:316`
  and every one of the six reads is observer-scoped) — but it only shortens the window and
  never marks the entry stale after an upload, so it fixes none of the failure paths. At
  `staleTime: 0` it also collides with the global `refetchOnWindowFocus: true`
  (`query-provider.tsx:70`), firing a full RPC plus ~50 signed-URL mints on every window
  focus. Invalidation works because `isInvalidated` short-circuits staleTime unconditionally
  (`query.ts:326-328`).

  **It costs nothing.** `refetchType` defaults to `'active'`; `DocumentsSection` mounts only
  on the five detail routes, where neither the vault nor the landing is mounted — so the
  entries are merely marked stale, zero network. The refetch happens later on navigation,
  which would have been a mount-fetch anyway. It fires once per batch inside the existing
  callback, preserving the deliberate no-`onSuccess` design at `:144-147`.

  **House precedent — read the mechanism, it differs from ours.**
  `src/components/settings/categories-settings.tsx:62-69` establishes that document
  mutations should reach the vault-search prefix, and its comment names that prefix. But it
  invalidates the BROAD `documentQueries.all()` (`["documents"]`), not
  `documentSearchQueries.all()` (`["documents","search"]`). A planner grepping for a line
  matching the one being added will not find one.

  **Use the narrow key deliberately.** `invalidateListAndDashboard` already invalidates the
  entity-scoped list, so the broad key would duplicate that and additionally invalidate
  every OTHER entity's list — which an upload to property A does not affect. The narrow
  `documentSearchQueries.all()` closes exactly the gap and nothing more.

  **Do NOT change `LIST_STALE_TIME_MS`.** The 45/55-minute pair is load-bearing, not
  arbitrary: commit `757c271d3` records *"45 min (well under the 1h signed-URL TTL) and
  gcTime is 55 min so cached entries can't serve expired URLs."* Lowering is safe; raising
  past ~55 min is a correctness bug.

  **Scope note:** `documents-section.tsx` is outside this phase's stated surface and the bug
  predates it — the vault has it today. It is included because Phase 65 is what puts the word
  "Recently" on a known-stale read, on a Claims Integrity milestone.

### Recent-list empty copy — AMENDS one locked string

- **D-12:** The locked empty **title** ships unchanged: **`No documents yet`**.
  The locked empty **body** at `56-UI-SPEC.md:501` is **REPLACED** with:

  > **Documents you upload appear here, newest first.**

  **Why.** The locked body reads *"Upload documents from any property, lease, tenant, or
  maintenance record and the newest will appear here."* That enumeration is already wrong:
  there are FIVE entity types (`documents-section.tsx:62-68` —
  `property, lease, tenant, maintenance_request, inspection`), it names four, drops
  `inspection`, and renames "maintenance request" to "maintenance record". The sibling vault
  sentence names all five and is pinned by a drift-guard test
  (`documents-vault.test.tsx:209-219`) whose comment exists for exactly this failure. Shipping
  the locked string would either propagate a wrong enumeration or require a second parity
  test the phase's validation budget does not include.

  Dropping the enumeration removes the drift surface entirely, is true for a zero-property
  owner and a fifty-property owner alike, and matches the repo's own nested-preview
  convention — `notification-popover-list.tsx:86-93` renders title-only while the full
  `notifications-inbox.client.tsx:97-108` carries the guidance. "Newest first" is factually
  accurate: `search_documents` orders `d.created_at desc` with no query
  (`20260426043911_v25_phase_63_search_documents_filter_extension.sql:108-110`).

  Everything else in the empty-state contract stands: `<Empty className="py-6">`,
  `EmptyTitle` + `EmptyDescription`, no `EmptyMedia`, no CTA.

### Claude's Discretion

- Exact band spacing/tile markup within the inherited spec's rungs.
- Whether the recent panel's `View all documents` link is a `Link` or a `Button variant="link"`.
- Test file organisation and naming.
- Whether the nav children render collapsed or expanded by default — follow whatever
  `Reports` does.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.** The design for this
phase was authored before the Phase 56/65 split and preserved verbatim. Do not re-derive it.

### The inherited contract (READ FIRST)
- `.planning/phases/56-reporting-hub-documents-landing/56-UI-SPEC.md` §"MOVED TO PHASE 65 —
  Documents Landing" (line 575 onward) — the complete design: three-band ladder, six tiles,
  recent-panel anatomy and states, icon table, page-level contract, discretion rulings.
  **Amended by D-08 (nav shape) and D-12 (empty body copy) above.**
- `.planning/phases/56-reporting-hub-documents-landing/56-UI-SPEC.md` — rows tagged `[65]`
  in the cross-cutting Copywriting / Typography / Spacing / Color / Interaction tables
  (notably `:500-501` for the empty-state copy). These are this phase's token discipline.
- `.planning/phases/56-reporting-hub-documents-landing/56-RESEARCH.md` §"Documents Landing
  (DOCS-01) — PHASE 65, NOT PHASE 56" (line 943 onward) — the verified same-cache-entry
  analysis and the `permanentRedirect` reversal note.

### Requirement and roadmap
- `.planning/REQUIREMENTS.md:66` — DOCS-01 text.
- `.planning/ROADMAP.md:158-168` — Phase 65 goal and the three success criteria.

### Code this phase touches or depends on
- `src/app/(owner)/documents/page.tsx` — the 11-line `permanentRedirect` being reversed.
- `src/hooks/api/query-keys/document-search-keys.ts` — the shared factory; `:26-27` the
  45/55-minute constants (do not change), `:89` `all()`, `:102-110` the list key shape.
- `src/components/documents/documents-vault.client.tsx:230-238` — the vault's call that
  normalizes to the same key; `:510-535` its own empty state.
- `src/components/documents/documents-section.tsx:137-142` — `invalidateListAndDashboard`,
  the D-11 edit site; `:62-68` the five entity labels.
- `src/components/settings/categories-settings.tsx:62-69` — the house precedent for
  invalidating the search prefix.
- `src/components/shell/main-nav.tsx:48` and `:73-81` — the `Documents` entry and the
  `Reports` parent+children shape D-08 mirrors; `:88-104` the `Templates` section being
  deleted and the precedent comment.
- `src/components/shell/app-shell.tsx:101` — the Cmd+K `Documents` entry.
- `src/components/notifications/notification-popover-list.tsx:86-93` — the nested-preview
  copy convention D-12 follows.
- `src/lib/breadcrumbs.ts` — LABEL_MAP additions.

### Project rules
- `CLAUDE.md` — zero-tolerance rules, query-key factory rule (#9), `Empty` compound for
  empty states, lucide-only icons, no barrel files.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`documentSearchQueries.list({ page: 0 })`** — the entire recent-list data path already
  exists. No new query, key, mapper or RPC. `handlePostgrestError` is already wired into the
  factory, satisfying the "never a raw PostgREST string" rule.
- **`Empty` compound** (`#components/ui/empty`) — used for all three recent-list states.
- **Nav `children` support** — `main-nav.tsx` already renders parent+children (Reports,
  Analytics). D-08 needs no new nav capability.
- **Tile/card patterns** — the Phase 56 hub tile (`report-hub-tile.tsx`) is the closest
  shipped analogue for Band 2/3 tiles: whole-card `<Link>`, `aria-hidden` medallion icon.

### Established Patterns
- **Server Component by default**, one client island — the same shape Phase 56's `/reports`
  index uses (`page.tsx` RSC + `ReportsSummaryStrip` island).
- **Shared cache entry guarantees agreement, not correctness.** The vault and landing reading
  one entry means they cannot disagree with each other — it does not mean either is fresh.
  D-11 addresses correctness; the sharing guarantee is untouched and orthogonal.
- **Drift-guard tests for duplicated user-facing copy** (`documents-vault.test.tsx:209-219`,
  `banlist-parity.test.ts`). D-12 avoids needing a new one by removing the enumeration.

### Integration Points
- `main-nav.tsx` + `app-shell.tsx` — the two `Documents` entries.
- `breadcrumbs.ts` LABEL_MAP.
- `documents-section.tsx` — the single-line invalidation (D-11), the only touch outside
  `/documents`.
- All six tile destinations already exist and were verified present on 2026-08-02.
</code_context>

<specifics>
## Specific Ideas

- The nav should look like Reports does. That was the explicit steer: the sidebar stays
  internally consistent with the pattern Phase 56 just shipped rather than inventing a second
  shape for a landing-plus-children surface.
- Two decisions were reached by canonical research rather than preference, and both
  overturned the framing they started from. Recorded so planning does not re-open them:
  the staleTime option was correct-but-useless (D-11), and the empty-state question was
  already answered by the spec, whose answer contained a factual defect (D-12).
</specifics>

<deferred>
## Deferred Ideas

- **Navigable nav parents.** `renderNavItem`'s `hasChildren` branch renders a toggle with no
  `<Link>`, so every parent href is decorative. Harmless for `Analytics` (its index is a
  `redirect()`), but it means Phase 56's `/reports` hub index cannot be reached from the
  sidebar — only via breadcrumb or Cmd+K. Fixing it means a link + separate chevron toggle in
  the shared component, changing behaviour for Reports and Analytics. Own phase.

- **A `/documents` upload path.** Neither the vault nor the landing can upload today;
  `DocumentsSection` mounts only on the five detail routes. Adding upload to the landing is a
  new capability and its own phase. NOTE for whoever does it: that mutation must also
  invalidate `documentSearchQueries.all()` or the landing will fail to show its own upload.
- **The vault's own empty-state dead end.** Its guidance ("Open a property, lease, tenant,
  maintenance request, or inspection…") names five records a brand-new owner does not have,
  and links to none of them — unlike every other first-run empty state in the app, which
  links to the unblocking action. Real, pre-existing, and outside DOCS-01.
- **The signed-URL persistence hazard.** The search entry persists to IndexedDB for 24h while
  embedded `signed_url` values expire at 1h, so restored rows can render once with dead URLs
  before the refetch resolves. Predates this phase and is unaffected by D-11.
- **The false `revenue-expense-chart.tsx` precedent citation** in `56-UI-SPEC.md` — it is
  cited as precedent for "no `EmptyMedia`" but that file renders `EmptyMedia` at `:57-59`.
  The prescribed shape is still fine (`chart-area-interactive.tsx:207-213` matches it); only
  the citation is wrong. Not worth amending a shipped phase's spec for.
</deferred>
