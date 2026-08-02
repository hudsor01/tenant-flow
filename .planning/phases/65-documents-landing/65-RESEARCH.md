# Phase 65: Documents Landing — Research

> ## ⛔ L-02 / S-01 RESOLVED 2026-08-02 — `Documents` is FLAT, not parent+children
>
> The researcher correctly found that D-08's rationale was refuted by the code:
> `renderNavItem`'s `hasChildren` branch renders a `<button>` toggle with **no `<Link>`**,
> so a parent's `href` is decorative and mirroring `Reports` would leave `/documents`
> **unreachable from the sidebar** — defeating DOCS-01's entry-point requirement.
>
> **Resolution: Option B — revert to the inherited FLAT ruling.** `Documents → /documents`,
> no children. The `Templates` section is still deleted (D-09). The vault becomes two
> clicks, which the inherited contract knowingly accepted.
>
> **Every reference below to a parent+children shape for `Documents` is SUPERSEDED**,
> including the Test Map's D-08/D-09 row and the §L-02 options table. They are retained so
> the reasoning is auditable, not because they describe what to build. `65-CONTEXT.md` D-08
> is authoritative.
>
> Option C (making parent rows link+toggle) is **deferred** — it would fix `/reports` being
> unreachable too, but changes shared nav behaviour for Reports and Analytics. Own phase.


**Researched:** 2026-08-02
**Domain:** Next.js 16 App Router RSC composition + TanStack Query cache sharing + sidebar/palette navigation surgery
**Confidence:** HIGH (every structural claim re-verified against HEAD; two claims corrected, one design rationale refuted)

> **THIS DOCUMENT STANDS ALONE.** The design for this phase was authored before the Phase 56/65
> split and preserved inside `56-UI-SPEC.md` / `56-RESEARCH.md`. It is reproduced here **in full**
> so that no Phase 56 file needs to be opened, and so that a future edit to a shipped phase's
> documents cannot silently change Phase 65's inheritance.
>
> **Precedence order when sources disagree:** `65-CONTEXT.md` > this document > the Phase 56 files.
> Where CONTEXT amends the inherited text (D-08 nav shape, D-12 empty body copy), the amended
> version is what appears below and the superseded text is shown struck through so the planner is
> never confused by the older wording.

---

<user_constraints>
## User Constraints (from 65-CONTEXT.md)

### Locked Decisions

**Inherited and still binding (authored pre-split, verified against code 2026-08-02)**

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

**Navigation — AMENDS the inherited discretion ruling**

- **D-08:** **`Documents` becomes a nav PARENT with children**, mirroring the shape Phase 56
  shipped for `Reports`:

  ```
  Documents          → /documents            (the new landing)
    Vault            → /documents/vault
    Lease Template   → /documents/lease-template
  ```

  **This supersedes the inherited ruling** ("nav `Documents` target → `/documents`", flat).
  The inherited version satisfied DOCS-01's "entry points must be navigable" but pushed the
  vault to two clicks, and search/filter is the daily task. The parent+children shape keeps
  the vault at one click, makes the landing navigable, and matches the pattern already
  established at `main-nav.tsx:73-81` (`Reports` → `/reports` with children).

- **D-09:** The one-item `Templates` nav section is **deleted**; its `Lease Template` entry
  becomes a child of `Documents`. This part of the inherited ruling stands. Precedent is
  recorded four lines above it at `main-nav.tsx:88-91` — "Generate Lease" was removed from
  this same section for duplicating a CTA surfaced elsewhere.

- **D-10:** Both `Documents` entries change: `main-nav.tsx:48` AND the Cmd+K palette at
  `app-shell.tsx:101`. Missing the second would leave the command palette pointing at the
  old target.

**Recent-list freshness — NEW, resolves a pre-existing defect this phase would expose**

- **D-11:** **Add `queryClient.invalidateQueries({ queryKey: documentSearchQueries.all() })`
  to `invalidateListAndDashboard`** in `src/components/documents/documents-section.tsx:137-142`
  (plus the import). One line and one import.

  **Why, and why not the alternative.** Nothing currently invalidates
  `documentSearchQueries`. `invalidateListAndDashboard` invalidates the ENTITY-scoped
  `documentQueries.list({entityType, entityId})` — key `["documents","list",…]` — which
  cannot prefix-match the search key `["documents","search",…]`. So after an upload the
  search entry stays fresh-by-staleTime for 45 minutes.

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

  **House precedent:** `src/components/settings/categories-settings.tsx:62-69` already does
  this in the same subsystem, with a comment naming the `['documents','search',…]` prefix.

  **Do NOT change `LIST_STALE_TIME_MS`.** The 45/55-minute pair is load-bearing, not
  arbitrary: commit `757c271d3` records *"45 min (well under the 1h signed-URL TTL) and
  gcTime is 55 min so cached entries can't serve expired URLs."* Lowering is safe; raising
  past ~55 min is a correctness bug.

  **Scope note:** `documents-section.tsx` is outside this phase's stated surface and the bug
  predates it — the vault has it today. It is included because Phase 65 is what puts the word
  "Recently" on a known-stale read, on a Claims Integrity milestone.

**Recent-list empty copy — AMENDS one locked string**

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

### Deferred Ideas (OUT OF SCOPE)

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
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description (verbatim, `REQUIREMENTS.md:66`) | Research Support |
|----|-------------|------------------|
| **DOCS-01** | `/documents` renders a real landing page (vault + lease template builder + printable templates entry points) instead of a bare redirect | §Inherited Design Contract (full composition), §Verification Ledger rows V-01..V-06 (all six destinations exist), §Implementation Landmines L-01 (the redirect reversal mechanics), §Code Examples (the RSC + island shape copied from the shipped `/reports` index) |

**ROADMAP.md:162-165 success criteria** (what must be TRUE at verify time):

1. `/documents` renders a real landing page with entry points to the vault, the lease template
   builder and the printable templates — the existing `permanentRedirect('/documents/vault')` is
   deliberately reversed, and the reversal is recorded in-code as superseding the earlier decision.
2. `/documents/vault` stays the canonical vault URL — the landing links to it; no sidebar,
   marketing or deep-link target outside this phase changes.
   → **Read with D-08 in mind:** D-08 *does* change the sidebar. SC-2's "no sidebar … changes"
   clause is scoped to *deep-link targets outside this phase*; the sidebar `Documents` entry is
   explicitly in scope per D-08/D-10. Marketing surfaces genuinely do not change — verified,
   §Verification Ledger V-13.
3. The landing's recent-documents panel reuses the vault's existing query/mapper rather than a
   second data source, so the two surfaces can never disagree.
</phase_requirements>

---

## Summary

This phase converts an 11-line `permanentRedirect` into a real RSC landing page. The design was
fully authored before the Phase 56/65 split and is reproduced verbatim below; my job was to
re-verify it against HEAD (Phase 56 shipped since it was written) and fold in the two
canonical-research decisions from CONTEXT.

**The inherited design survived re-verification almost entirely intact.** All six tile
destinations exist, `/documents/page.tsx` is still the 11-line redirect with the exact comment
the spec quotes, the vault's query call at `documents-vault.client.tsx:230-238` is byte-identical
to what the "same cache entry" proof depends on, the `search_documents` RPC still orders
`created_at desc`, and the shipped `/reports` index gives Phase 65 a directly copyable
RSC-plus-one-island template. Three line-number citations drifted and one precedent citation
describes a different mechanism than the code actually uses — all corrected below.

**One finding is load-bearing and refutes a stated rationale.** D-08 says the parent+children
shape "makes the landing navigable." Against current code it does the opposite: `renderNavItem`'s
`hasChildren` branch renders the parent as a `<button>` toggle with **no `<Link>` at all**
(`main-nav.tsx:211-230`). `item.href` on a parent is decorative — it feeds `isActive()` at `:208`,
whose result the branch never reads. `/reports` is itself not reachable from the sidebar today.
So mirroring `Reports` exactly would leave `/documents` reachable only via Cmd+K and the
breadcrumb, and the D-08 rationale's second clause is false. The *decision* (parent+children
shape) is locked and correct; the *rationale* needs the planner to close the navigability gap
deliberately. Three concrete options are laid out in §Implementation Landmines L-02.

**Primary recommendation:** Build `/documents` as a four-file mirror of the shipped `/reports`
index — RSC `page.tsx`, a route-colocated typed entries module, a presentational tile, and one
`'use client'` recent-documents island — then execute the nav surgery as a separate wave with its
six known test breakages planned as deliberate edits, not surprises.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `/documents` page shell, headings, tiles | Frontend Server (RSC) | — | Static composition; zero data. Mirrors `/reports/page.tsx`, which is an RSC with no hooks. |
| Six tile destinations (link targets) | Frontend Server (RSC) | — | `<Link>` markup only; every destination already exists as its own route. |
| Recent-documents fetch | Browser / Client | API (Supabase RPC) | Must run client-side to share the vault's TanStack Query cache entry. Server-rendering it forfeits SC-3 by creating a second fetch path. |
| Recent-documents ordering + row set | Database (`search_documents` RPC) | — | `order by … d.created_at desc` lives in SQL; the client only slices to 5. No client-side sort. |
| Signed-URL minting for recent rows | API (Supabase Storage) | — | Already inside `documentSearchQueries.list`'s `queryFn`; the landing inherits it and must not add a second path. **Rows are non-interactive (D-03) so the URLs go unused on this surface** — a known, accepted cost of cache sharing. |
| Recent-list freshness after upload | Browser / Client (TanStack Query) | — | D-11 invalidation at the mutation site. Not a server concern. |
| Nav / Cmd+K entries | Browser / Client | — | `main-nav.tsx` and `app-shell.tsx` are both `'use client'`. |
| Breadcrumb labels | Frontend Server + Client | — | `generateBreadcrumbs` is a pure function called from `app-shell.tsx:46` (client). |
| Auth + subscription gate on `/documents` | Frontend Server (proxy) | — | `src/proxy.ts` already gates it — **verified live**, unauthenticated `GET /documents` returns 307 → `/login?redirect=%2Fdocuments`. No proxy change needed. |

---

## Inherited Design Contract

> **MOVED 2026-08-02 → `65-UI-SPEC.md`.**
>
> This section previously carried the full contract body (I-1..I-13). It now lives in
> `.planning/phases/65-documents-landing/65-UI-SPEC.md`, which is the single source of truth
> for the `/documents` landing design and which applies the two `65-CONTEXT.md` amendments
> (A-1 flat navigation, A-2 empty-body copy).
>
> Moved rather than duplicated: two copies of a design contract in one phase directory is a
> drift surface, and this phase already exists because a contract living in another phase's
> file was fragile.
>
> The verification of these claims against HEAD remains below in §"Verification Ledger", and
> the landmines remain in §"Implementation Landmines". Those are this document's job.

## Verification Ledger — inherited claims vs. HEAD (2026-08-02)

Every structural claim in the inheritance, re-checked by **reading the file**, not by grepping for
a token. Scope of every search is stated. `bun run typecheck` is **GREEN at HEAD** (no output;
authoritative over IDE diagnostics per project convention).

### Routes and page shell

| # | Claim | Status | Evidence |
|---|-------|--------|----------|
| V-01 | `/documents/page.tsx` is still the 11-line `permanentRedirect("/documents/vault")` | ✅ CONFIRMED | File is exactly 11 lines. `permanentRedirect("/documents/vault")` at `:10`. |
| V-02 | It carries the comment *"the redirect is permanent — there's no plan to bring back a /documents index"* | ✅ CONFIRMED verbatim | `page.tsx:7-8`. This is the sentence D-06 supersedes in-code. |
| V-03 | `/documents/vault` exists | ✅ CONFIRMED | `src/app/(owner)/documents/vault/page.tsx` — RSC wrapper exporting `Metadata` + `<DocumentsVaultClient />`. |
| V-04 | `/documents/lease-template` exists | ✅ CONFIRMED | `src/app/(owner)/documents/lease-template/page.tsx`. |
| V-05 | All four printable routes exist | ✅ CONFIRMED | `templates/{rental-application,property-inspection,maintenance-request,tenant-notice}/page.tsx` — all four present. |
| V-06 | The reversal is an **in-page** redirect, not a config redirect | ✅ CONFIRMED | `grep -n "documents" next.config.ts src/lib/seo/*.ts` returns only an unrelated comment at `next.config.ts:178` and `/reports/tax-documents` rows in `reporting-redirects.ts`. **No `/documents` entry in any redirect map.** Deleting the page-level call is sufficient. |
| V-07 | `/documents` has no `layout.tsx` | ✅ CONFIRMED | `find src/app/(owner)/documents -type f` lists 25 files; no `layout.tsx` at any level. Metadata must go in `page.tsx`. |

### The "same cache entry" guarantee (SC-3)

| # | Claim | Status | Evidence |
|---|-------|--------|----------|
| V-08 | The vault's `useQuery` call at `documents-vault.client.tsx:230-238` reduces to `{ page: 0 }` in the default unfiltered state | ✅ CONFIRMED, byte-identical to the inherited quote | `:230-239`: every one of the five spreads is `...(x ? {…} : {})` and `page: pageParam`. Unfiltered → `{ page: 0 }`. |
| V-09 | `documentSearchQueries.all()` returns `["documents","search"]` | ✅ CONFIRMED | `document-search-keys.ts:89` — `[...documentQueries.all(), "search"]`; `documentQueries.all()` = `["documents"]` at `document-keys.ts:180`. |
| V-10 | The list key shape is stable and normalizes categories | ✅ CONFIRMED | `document-search-keys.ts:101-110`. Categories sorted-or-null at `:97-100` so set order can't fragment the cache. |
| V-11 | `handlePostgrestError` is already wired into the factory | ✅ CONFIRMED — **line number corrected** | Imported at `document-search-keys.ts:15` (56-RESEARCH said `:17`), invoked at `:132`. It captures to Sentry and rethrows; it shows **no toast** (`postgrest-error-handler.ts:7-10`), so the panel's own inline error copy is the entire user-facing surface. |
| V-12 | `search_documents` orders `d.created_at desc` with no query | ✅ CONFIRMED | `20260426043911_v25_phase_63_search_documents_filter_extension.sql:108-110`. With `v_has_query` false the `ts_rank` term is a constant `0`, so the sort is purely `created_at desc`. **D-12's "newest first" is factually accurate.** |

### Navigation surface

| # | Claim | Status | Evidence |
|---|-------|--------|----------|
| V-13 | `main-nav.tsx:48` is `{ label: "Documents", href: "/documents/vault", icon: FolderArchive }` | ✅ CONFIRMED exactly | And the **complete** repo-wide inventory of `/documents/vault` string references (scope: `src/`, `tests/`, `next.config.ts`) is: `documents/page.tsx:4,10`, `main-nav.tsx:48`, `app-shell.tsx:101`, plus 3 test/comment sites. **Zero marketing references — D-05 / SC-2 confirmed.** |
| V-14 | The `Reports` parent+children shape exists and D-08 can mirror it | ✅ CONFIRMED — **line range corrected** | The full `Reports` entry is `main-nav.tsx:68-85` (CONTEXT cites `:73-81`, which covers only label→5th child). `NavigationItem` already declares `children?: { label, href }[]` at `:28`, so **no type change is needed**. |
| V-15 | `documentItems` / the `Templates` section is a one-item section | ✅ CONFIRMED — **line range corrected** | `DocumentItem` interface `:31-35`; `documentItems` array `:93-99` (CONTEXT says `:88-104`, which spans the comment through part of `SettingsMenu`); rendering block `:301-322`. |
| V-16 | The "Generate Lease removed" precedent comment exists | ✅ CONFIRMED | `main-nav.tsx:88-92` (CONTEXT says `:88-91`; the comment is 5 lines, `:88-92`). |
| V-17 | `DocumentItem` has no consumer outside `main-nav.tsx` | ✅ CONFIRMED | `grep -rn "DocumentItem\|documentItems" src/ tests/` → 3 hits, all in `main-nav.tsx`. Deleting the section must also delete the `DocumentItem` interface and the now-unused `FileCheck` import, or move both into the children shape. |
| V-18 | `app-shell.tsx:101` is the Cmd+K `Documents` entry | ✅ CONFIRMED exactly | `{ label: "Documents", href: "/documents/vault", icon: FolderArchive }` in the `Navigation` group. |
| V-19 | The Cmd+K palette also has its own separate `Templates` group | ⚠️ **NOT MENTIONED IN CONTEXT — see L-04** | `app-shell.tsx:162-176`, one item `Lease Template → /documents/lease-template`, with a comment at `:165-169` recording a prior review that caught sidebar/palette asymmetry. D-09 says "nav section"; D-10 enumerates exactly two changed entries. Neither covers this group. |
| V-20 | Nav active state uses `pathname.startsWith(href)` | ✅ CONFIRMED, with a caveat | `main-nav.tsx:188-191`. **But the `hasChildren` branch never reads `active`** — see L-02. Children use exact `pathname === child.href` at `:240`. |

### Breadcrumbs

| # | Claim | Status | Evidence |
|---|-------|--------|----------|
| V-21 | `LABEL_MAP` lacks `vault` and the four template slugs | ✅ CONFIRMED | `breadcrumbs.ts:4-42`. Has `documents`, `lease-template`, `generate`. Missing all six additions. |
| V-22 | The four hyphenated slugs genuinely need the map | ✅ CONFIRMED | Fallback is `segment.charAt(0).toUpperCase() + segment.slice(1)` (`:65-66`), pinned by `breadcrumbs.test.ts:135-141` producing `"Unknown-route"`. So `rental-application` → `"Rental-application"` today. |
| V-23 | `vault` and `templates` additions are label no-ops | ⚠️ **NEW FINDING** | The fallback already yields `"Vault"` and `"Templates"` correctly. Adding them changes nothing rendered. **`templates` is worse than a no-op** — see L-06. |
| V-24 | Every breadcrumb crumb renders as a live `<Link>` | ✅ CONFIRMED | `app-shell-header.tsx:59-70, 83-96, 110-121`. `generateBreadcrumbs` always sets `href`, so every branch takes the `<Link>` path. **This is the pre-existing navigability path to `/documents`** (the first crumb on `/documents/vault`). |

### D-11 (recent-list freshness)

| # | Claim | Status | Evidence |
|---|-------|--------|----------|
| V-25 | `invalidateListAndDashboard` is at `documents-section.tsx:137-142` | ✅ CONFIRMED exactly | Two `invalidateQueries` calls: entity-scoped list, then `ownerDashboardKeys.all`. `useCallback` deps `[queryClient, entityType, entityId]`. |
| V-26 | The deliberate no-`onSuccess` design is at `:144-147` | ✅ CONFIRMED verbatim | The comment explains a multi-file upload loop would otherwise fire one refetch per file. **D-11's "fires once per batch" is correct.** |
| V-27 | `documentQueries.list(…)` key `["documents","list",…]` cannot prefix-match `["documents","search",…]` | ✅ CONFIRMED | `documentQueries.lists()` = `["documents","list"]` (`document-keys.ts:181`) vs `["documents","search"]` (`document-search-keys.ts:89`). Divergent at index 1. |
| V-28 | "Nothing currently invalidates `documentSearchQueries`" | ⚠️ **CORRECTED — see below** | Strictly false. See the correction block. |
| V-29 | `DocumentsSection` mounts only on the five detail routes | ✅ CONFIRMED — **full-scope search** | `grep -rn "DocumentsSection" src/ tests/` (NOT scoped to `src/app`): exactly 5 mount sites, one per entity type. **Three of the five are under `src/components/`, not `src/app/`** — a `src/app`-only search would have found 2 and been wrong. Full list in L-05. |
| V-30 | `LIST_STALE_TIME_MS` = 45min, `LIST_GC_TIME_MS` = 55min | ✅ CONFIRMED — **line numbers corrected** | `document-search-keys.ts:26` and `:27` (CONTEXT says `:26-27` ✅; 56-RESEARCH says `:27-28` ✗). Applied at `:193-194`. |
| V-31 | `refetchOnWindowFocus: true` is global | ✅ CONFIRMED — **path corrected** | `src/providers/query-provider.tsx:70` (not `src/app/providers/…`). Global `staleTime: 5min` at `:60`, `gcTime: 10min` at `:63`. |
| V-32 | query-core 5.100.10 is installed | ✅ CONFIRMED | `node_modules/@tanstack/query-core/package.json` → `"version": "5.100.10"`; `package.json:110` declares `^5.100.10`. |
| V-33 | Per-observer `staleTime` — no read of `query.options.staleTime` | ✅ CONFIRMED against the installed build | Every read is observer-scoped: `query.js:114` (`observer.options.staleTime`), `queryObserver.js:112, 191, 451, 461` (`this.options.staleTime` / `options.staleTime`). Zero `query.options.staleTime`. |
| V-34 | `isInvalidated` short-circuits `staleTime` unconditionally | ✅ CONFIRMED against the installed build | `query.js:127-138`: `isStaleByTime(staleTime = 0)` → `if (this.state.isInvalidated) return true;` at `:134-136`, **before** the `timeUntilStale` comparison at `:137`. |
| V-35 | `categories-settings.tsx:62-69` is the house precedent | ⚠️ **MECHANISM DIFFERS — see below** | The comment at `:62-68` does name the `['documents','search',…]` prefix, but the actual call at `:69` is `invalidateQueries({ queryKey: documentQueries.all() })` — the broad `["documents"]` prefix, **not** `documentSearchQueries.all()`. |

#### Correction to V-28 — the precise claim

D-11 states *"Nothing currently invalidates `documentSearchQueries`."* Verified scope:
`grep -rn "documentSearchQueries" src/ tests/` → 13 hits, all in `documents-vault.client.tsx`
(the consumer), `document-search-keys.ts` (the factory), and `documents-vault.test.tsx` (spies).
**No mutation anywhere names it.**

However, `categories-settings.tsx:69` invalidates `documentQueries.all()` = `["documents"]`, and
TanStack Query's `invalidateQueries` is a **prefix match** — so a category rename/reassign *does*
invalidate the search entry, indirectly.

**The accurate statement, which the planner should carry forward:**

> No document **upload** or **delete** mutation invalidates the search entry. The only path that
> does is the category-reassign flow in `categories-settings.tsx`, and only by side effect of the
> broad `["documents"]` prefix.

This does not weaken D-11 — it makes the gap sharper. Upload and delete are exactly the two
mutations that change what "Recently added" should show.

#### Consequence for how D-11 is written

Two implementations satisfy the intent:

| Option | Code | Import needed | Covers |
|--------|------|---------------|--------|
| **(a) — what D-11 locks** | `invalidateQueries({ queryKey: documentSearchQueries.all() })` | **Yes** — new import of `documentSearchQueries` | `["documents","search",…]` only |
| (b) — the actual house precedent | `invalidateQueries({ queryKey: documentQueries.all() })` | No — `documentQueries` already imported at `documents-section.tsx:28` | `["documents", …]` — both list and search |

**D-11 explicitly prescribes (a).** Implement (a). The correction here is only to the *citation*:
the planner should not expect `categories-settings.tsx` to contain a line that looks like the one
being added. Note that (a) is **additive** — the existing entity-scoped invalidation at
`documents-section.tsx:138-140` still has to stay, because `["documents","search"]` does not
prefix-match `["documents","list",…]` either.

### D-12 (empty-copy) evidence

| # | Claim | Status | Evidence |
|---|-------|--------|----------|
| V-36 | Five entity types exist, `ENTITY_LABELS` at `documents-section.tsx:62-68` | ✅ CONFIRMED exactly | `property, lease, tenant, maintenance_request → "maintenance request", inspection`. The superseded copy names four and drops `inspection`. |
| V-37 | The vault's sibling sentence names all five and is pinned by a drift guard | ✅ CONFIRMED | Copy at `documents-vault.client.tsx:532`; the guard is `documents-vault.test.tsx:209-219` with five `toHaveTextContent` assertions and the comment *"a future entity addition … silently drifts the user-facing copy away from the dropdown."* |
| V-38 | `notification-popover-list.tsx:86-93` is the title-only nested-preview convention | ✅ CONFIRMED | `<Empty className="gap-2 p-8 md:p-8">` → `EmptyHeader` → `EmptyMedia variant="icon"` + `EmptyTitle`, **no `EmptyDescription`**. Note it *does* use `EmptyMedia`; the convention D-12 cites is the *brevity*, which holds. |
| V-39 | The vault's own empty title differs | ✅ CONFIRMED, no conflict | Vault: `"No documents uploaded yet."`; landing: `"No documents yet"`. Different strings on different surfaces; the drift guard at `:209` matches `/no documents uploaded yet/i` and will not be tripped by the landing's copy. |

### Baseline test state

`bun run test:unit -- <targets>` at HEAD, before any Phase 65 change:

| Target | Result |
|--------|--------|
| `src/components/shell/__tests__/main-nav.test.tsx` + `src/lib/__tests__/breadcrumbs.test.ts` | **41 passed / 41** |
| `src/components/shell/__tests__/app-shell.test.tsx`, `app-shell-nav.test.tsx`, `src/components/documents/**` | **89 passed / 89** |
| `bun run typecheck` (3 tsconfigs) | **green, no output** |

---

## STALE / CORRECTED — read this before planning

Ordered by how much damage the stale version would do.

### S-01 — **D-08's rationale is refuted by the code. The decision is fine; the reason is not.** 🔴

D-08 says the parent+children shape "makes the landing navigable." **It does not.**

`main-nav.tsx:205-265`, the `hasChildren` branch:

```tsx
if (hasChildren) {
  const sectionId = `nav-section-${item.label}`;
  return (
    <div key={item.label}>
      <button onClick={() => toggleExpanded(item.label)} aria-expanded={isExpanded} …>
        <div className="flex items-center gap-3"><Icon … />{item.label}</div>
        <ChevronDown … />
      </button>
      <div id={sectionId} inert={!isExpanded ? true : undefined} …>
        <div className="ml-8 py-1 space-y-0.5">
          {item.children!.map((child) => ( <Link key={child.href} href={child.href} …/> ))}
        </div>
      </div>
    </div>
  );
}
```

There is **no `<Link href={item.href}>` anywhere in this branch.** A parent's `href` is consumed
only by `const active = isActive(item.href)` at `:208` — and `active` is never referenced inside
the `hasChildren` return. It is dead for parents.

**Corollary you can check yourself:** `/reports` is not reachable from the sidebar today either.
`Reports` is a toggle; its seven children are all `/reports/<sub>`. The hub index is reachable via
Cmd+K (`app-shell.tsx:137`) and the breadcrumb — nothing else.

So after a literal D-08 implementation, `/documents` would be reachable from:
- the Cmd+K palette (D-10 repoints it) ✅
- the breadcrumb `Documents` crumb on every `/documents/*` page — **already a live `<Link>` today**
  (V-24) ✅
- the sidebar ❌

**Also note the unit tests cannot catch this.** `inert` is unimplemented in this test stack:
`grep -rl "inert"` returns **zero** hits in `@testing-library/dom/` and zero in `jsdom/lib/`
outside a generated CSS-property table, and `dom-accessibility-api` has none. Collapsed nav
children are therefore fully queryable by `getByRole("link")` in jsdom. A test asserting
"Vault link exists" will pass whether or not the section is reachable. The navigability gap has to
be asserted **structurally** (does the parent render a `<button>` or a `<link>`?), not by a query
that passes for the wrong reason.

**Resolution options for the planner** (do not pick silently — this is a user-facing behaviour
change either way):

| Option | Change | Cost | Effect on `Reports` |
|--------|--------|------|---------------------|
| **A — accept, mirror `Reports` exactly** | None beyond D-08 as written | Zero | Unchanged. Landing reachable via Cmd+K + breadcrumb only. Consistent with the pattern Phase 56 shipped. Honest framing: D-08's "makes the landing navigable" becomes "keeps the vault at one click and matches the shipped pattern." |
| **B — add an explicit child row** | `{ label: "Overview", href: "/documents" }` as the first child | 1 line | Unchanged. Landing gets a real one-click sidebar link. Introduces a shape `Reports` does not have. |
| **C — make parent rows link + toggle** | Split `renderNavItem`'s `hasChildren` header into a `<Link>` + a separate chevron `<button aria-controls>` | ~15 lines in shared code | **Changes `Reports` and `Analytics` too.** Fixes `/reports` unreachability as a side effect; breaks `main-nav.test.tsx:118-143` (both sections asserted as `getByRole("button")`); expands the phase's blast radius into Phase 56's shipped surface. |

**Recommendation: Option A**, with D-08's rationale sentence corrected in the plan, and the gap
noted in `65-SUMMARY.md` rather than silently absorbed. Option B is the cheapest fix if the user
wants the landing one click away; Option C is correct-in-principle but is a separate phase.

### S-02 — **Six unit tests break under D-08/D-09. All in one file. One of them is a designed tripwire.** 🔴

`src/components/shell/__tests__/main-nav.test.tsx`, currently 24/24 green:

| Line | Test | Breaks because | Fix |
|------|------|----------------|-----|
| `:47-49` | `getByRole("link", { name: /^documents$/i })` exists | `Documents` becomes a `<button>` | Re-target to `getByRole("button", { name: /^documents$/i })` |
| `:74-77` | `…toHaveAttribute("href", "/documents/vault")` | No `Documents` link exists at all | Assert the `Vault` **child** carries `/documents/vault` |
| `:135-143` | **"should render exactly two collapsible sections"** — `expect(sectionLabels).toEqual(["Analytics","Reports"])` | Becomes `["Documents","Analytics","Reports"]` (`coreItems` renders first at `:294`) | Update to the three-element array **and preserve the comment's intent** |
| `:210-214` | "should render Templates section header" — `getByText("Templates")` | The `<p>Templates</p>` at `:303-305` is deleted | Delete the test; replace with a negative assertion that no `Templates` section header exists |
| `:224-235` | "should render Lease Template link" | ⚠️ **Will still PASS** — collapsed children are queryable (inert unimplemented) | Keep, but move it under a `Documents children` describe and add an href assertion |
| `:357-368` | "should call onNavigate when a Templates link is clicked" | ⚠️ **Will still PASS** for the same reason | Rename to reflect the new parent |

**`:135-143` deserves special handling.** Its comment reads:

> *"D-29 FULL SEPARATION: this block carries exactly TWO peer sections — Analytics and Reports.
> Asserted as an exhaustive list rather than as the absence of the one section just deleted, so a
> third section reappearing under any name fails here."*

That test was **written to fail on exactly this change.** It is not stale — it is doing its job.
The planner must update it with a recorded rationale in the diff (Phase 65 D-08 makes `Documents`
a third deliberate collapsible section), never by loosening `toEqual` to `toContain`.

**Unaffected — verified, not assumed:**
- `app-shell-nav.test.tsx:103-125` ("targets only route trees that still exist") — the allowlist
  already contains `/documents` at `:110` and matches on `href === root`, so repointing the
  palette entry to `/documents` **passes**.
- `app-shell.test.tsx:414` (`getAllByText("Templates").length >= 1`) — that is the **Cmd+K**
  Templates group heading, and `MainNav` is mocked in that file (`app-shell-nav.test.tsx:43-45`
  and the equivalent in `app-shell.test.tsx`). Deleting the *sidebar* section does not touch it.
  **Deleting the Cmd+K group would break it** — see L-04.
- `app-shell.test.tsx:422` (`getAllByText("Documents")` has length exactly 1) — the label text is
  unchanged by D-10; only the href moves. **Passes.**
- E2E: `ROUTES.DOCUMENTS = "/documents"` is declared at `tests/e2e/tests/constants/routes.ts:50`
  but **no spec references it** (`grep -rn "ROUTES.DOCUMENTS"` across `tests/e2e/` → zero hits
  outside the declaration). No `DOCUMENTS_VAULT` constant exists. `owner-navigation.e2e.spec.ts`
  contains no `documents` string. **Zero E2E breakage.**

### S-03 — Line-number and path drift in the inherited citations

| Citation | Source | Actual | Impact |
|----------|--------|--------|--------|
| `document-search-keys.ts:27-28` (stale-time constants) | `56-RESEARCH.md:983-984` | **`:26-27`** | Cosmetic. CONTEXT already has it right. |
| `document-search-keys.ts:17` (`handlePostgrestError` import) | `56-RESEARCH.md:990` | **`:15`** | Cosmetic. |
| `main-nav.tsx:73-81` (Reports parent+children) | `65-CONTEXT.md` D-08 | full entry is **`:68-85`** | Minor — the cited range omits the D-29 comment and two children. |
| `main-nav.tsx:88-104` (Templates section) | `65-CONTEXT.md` canonical refs | array is **`:93-99`**; comment `:88-92`; **rendering block `:301-322`** | **Non-trivial** — the rendering JSX is 200 lines away from the data array. A planner reading only `:88-104` would miss half the deletion. |
| `main-nav.tsx:90` (precedent comment) | `56-UI-SPEC.md:589` | comment spans **`:88-92`** | Cosmetic. |
| `main-nav.tsx:88-91` (same) | `65-CONTEXT.md` D-09 | **`:88-92`** | Cosmetic. |
| `query-provider.tsx:70` — implied path `src/app/providers/` | D-11 text | **`src/providers/query-provider.tsx:70`** | Minor; the line number is correct. |
| `usage-section.tsx` (text-link precedent) | `56-UI-SPEC.md:445` | **`src/components/settings/sections/usage-section.tsx:50-55`** | Minor. The class string is confirmed: `font-medium text-primary-text hover:underline underline-offset-4`. |
| `revenue-expense-chart.tsx` cited as the no-`EmptyMedia` precedent | `56-UI-SPEC.md:667` | **Wrong precedent** — that file renders `EmptyMedia variant="icon"` at `src/app/(owner)/analytics/financial/revenue-expense-chart.tsx:58-60` | Use `chart-area-interactive.tsx:207-213` instead. Already flagged in CONTEXT's deferred block; carried here so the planner does not need to open a Phase 56 file to learn it. |
| `categories-settings.tsx:62-69` as the D-11 precedent | `65-CONTEXT.md` D-11 | Lines correct; **mechanism differs** (`documentQueries.all()`, not `documentSearchQueries.all()`) | See V-35 + the correction block. |

### S-04 — Nothing else in the inheritance conflicts with shipped code

Explicitly checked and found **not** stale: the three-band ladder, the six tiles, the row anatomy,
the three list states, the icon table, all locked copy strings, the spacing/typography/color
rungs, the registry-safety claim, the `permanentRedirect`-is-in-page claim, and the
`/documents/vault`-canonical claim. Phase 56 touched `/reports`, `/analytics`, `/financials`,
`next.config.ts`, `reporting-redirects.ts`, `breadcrumbs.ts` (Reports rows only), `main-nav.tsx`
(Reports children only), and `app-shell.tsx` (Reports rows only). **It changed nothing under
`/documents`.**

---

## Implementation Landmines

### L-01 — The 308 the browser may already have cached 🟡

`permanentRedirect` emits **308**, which browsers may cache indefinitely. Every authenticated
owner who has ever loaded `/documents` may hold a cached 308 → `/documents/vault` and never see
the new landing.

**What is verified:** an unauthenticated `curl -sSI https://tenantflow.app/documents` (run
2026-08-02) returns **`HTTP/2 307`** with `location: /login?redirect=%2Fdocuments` and
`cache-control: public, max-age=0, must-revalidate`. That is `src/proxy.ts`'s auth gate, which
runs **before** the page — so unauthenticated visitors never receive the 308 at all, and the
307 they do receive is `must-revalidate`.

**What is NOT verified:** the `Cache-Control` on the *authenticated* 308 from the page itself.
`vercel.json` sets no `Cache-Control` for `/documents` (only `/static/*`, `/_next/static/*`,
`/manifest.json`, `/sw.js` — read at `vercel.json:7-70`); `next.config.ts` declares no `headers()`
function at all. The `public, max-age=0, must-revalidate` seen above appears to be applied
app-wide, which — if it also applies to the 308 — makes the cached redirect revalidate on every
navigation and neutralizes the hazard.

**Cheap resolution the planner should schedule as a verification step, not as research:** with an
authenticated session, `curl -sSI` the current `/documents` with the session cookie and read the
`Cache-Control` on the 308. If it is `max-age=0, must-revalidate`, the risk is closed. If it is
absent or long-lived, add a manual post-deploy hard-refresh check to `65-VERIFICATION.md`.

**Mitigating context either way:** the sidebar and Cmd+K both pointed at `/documents/vault`, never
`/documents`, so the only users with a cached 308 are those who typed the bare URL or followed the
first breadcrumb crumb. `[ASSUMED]` that this is a small population — not measured.

### L-02 — Navigability of `/documents` after D-08 🔴

See §S-01. This is the single highest-value finding in this document. Pick Option A, B, or C
explicitly in the plan.

### L-03 — Deleting the `Templates` section leaves three dead symbols

`main-nav.tsx` after D-09 has three orphans:

1. `documentItems` (`:93-99`) — the array itself.
2. `DocumentItem` interface (`:31-35`) — **exported**, so `noUnusedLocals` will **not** flag it.
   TypeScript stays green with dead code in place. V-17 confirms zero external consumers, so it
   must be deleted by hand.
3. The `FileCheck` lucide import (`:9`) — **this one will error** under `noUnusedLocals` unless
   `FileCheck` is reused as the icon on the new `Lease Template` child. Note the child shape is
   `{ label, href }` with **no `icon` field** (`NavigationItem.children` at `:28`) — children
   render label-only (`:257`), so `FileCheck` genuinely becomes unused and must be removed from
   the import list.

Also delete the rendering block at `:301-322` including its `<p>Templates</p>` header and the
`mt-6 pt-4 border-t` wrapper. CLAUDE.md zero-tolerance #4 forbids leaving any of it commented out.

### L-04 — The Cmd+K `Templates` group is unaddressed by D-09/D-10 🟡

`app-shell.tsx:162-176` is a second, independent `Templates` group in the command palette holding
the same single `Lease Template → /documents/lease-template` entry. D-09 scopes to the "nav
section" (the sidebar); D-10 enumerates exactly two changed entries and this is not one of them.

Its own comment (`:165-169`) records the precedent that cuts the other way:

> *"Session 11 P3 #36: 'Generate Lease' lived here AND in the sidebar Templates section AND on
> /leases as the New Lease CTA. Cycle 1 review caught that removing the sidebar entry alone left
> the same workflow discoverable via Cmd+K."*

**Recommendation: leave it.** D-09 and D-10 are locked and neither covers it; the palette is a
search surface where duplication is a feature, not a nav hierarchy; and deleting it breaks
`app-shell.test.tsx:414`. **But the planner must state the choice explicitly**, because the
adjacent comment invites the opposite reading and a reviewer will raise it. If the decision is to
delete, `app-shell.test.tsx:411-414` must be updated in the same commit.

### L-05 — `DocumentsSection` mount inventory (D-11's blast radius)

Full-scope search (`grep -rn "DocumentsSection" src/ tests/` — **not** limited to `src/app`):

| # | File | Line | `entityType` |
|---|------|------|--------------|
| 1 | `src/app/(owner)/properties/property-details.client.tsx` | `:160` | `property` |
| 2 | `src/app/(owner)/tenants/components/tenant-details.client.tsx` | `:230` | `tenant` |
| 3 | `src/components/leases/detail/lease-details.client.tsx` | `:220` | `lease` |
| 4 | `src/components/maintenance/detail/maintenance-details.client.tsx` | `:183` | `maintenance_request` |
| 5 | `src/components/inspections/inspection-detail.client.tsx` | `:253` | `inspection` |

**Three of five live under `src/components/`.** A search scoped to `src/app` finds two and
produces a wrong count. D-11's claim that neither the vault nor the landing mounts
`DocumentsSection` is CONFIRMED — none of these five is under `/documents`. Therefore
`refetchType: 'active'` (the default) marks the entries stale with **zero network**, exactly as
D-11 argues.

**Two test files exist for this component** — `src/components/documents/documents-section.test.tsx`
(colocated, delete-confirmation only) and `src/components/documents/__tests__/documents-section.test.tsx`
(the fuller suite). Put the D-11 regression test in the `__tests__/` one.

### L-06 — `templates: "Templates"` in LABEL_MAP is a no-op that dresses up a dead link 🟡

`src/app/(owner)/documents/templates/` contains **no `page.tsx`** (V-07 file listing) — only a
`components/` directory and the four leaf routes. So `/documents/templates` is a 404.

`generateBreadcrumbs("/documents/templates/rental-application")` emits three crumbs, and
`app-shell-header.tsx:83-96` renders the middle one as a live `<Link href="/documents/templates">`
→ **404**.

**This dead link exists today** — the capitalize-fallback already produces the label `"Templates"`
and the href is emitted regardless of LABEL_MAP. Adding the entry changes nothing rendered (V-23),
but it does make an intentional-looking map entry point at a 404.

Options, in order of preference:
1. **Add the four hyphenated slugs and `vault`; omit `templates`.** The dead crumb stays exactly
   as it is today, and the map doesn't bless it. Deviates from D-07's literal list by one entry —
   flag it to the user.
2. Add all six as D-07 specifies, and record the dead crumb as a known pre-existing defect in
   `65-SUMMARY.md`.
3. Out of scope: creating `/documents/templates/page.tsx`. That is a seventh route DOCS-01 does
   not ask for.

### L-07 — `<Empty className="py-6">` does not compact the way the spec assumes 🟡

`Empty`'s base is `"… rounded-lg border-dashed p-6 text-center text-balance md:p-12"`
(`empty.tsx:11`). Passing `className="py-6"` through `cn` (tailwind-merge) does **not** remove
`p-6` or `md:p-12` — tailwind-merge drops an *earlier* `py-*` when a *later* `p-*` arrives, not the
reverse. So `md:p-12` survives and the panel gets 48px of padding at `md+`.

Whatever the planner ships must be pixel-checked, not assumed. `chart-area-interactive.tsx:207`
sidesteps it entirely with `className="h-75 flex-center"`; `notification-popover-list.tsx:86` does
it correctly with `className="gap-2 p-8 md:p-8"` — **note the explicit `md:` companion.** Mirror
that form: `className="py-6 md:py-6"` or `className="p-6 md:p-6"`.

Also: `EmptyTitle` and `EmptyDescription` do **not** require an `EmptyHeader` wrapper —
`chart-area-interactive.tsx:207-213` uses them bare. And `Empty`'s root carries `flex-1`, which is
inert inside a non-flex parent.

### L-08 — `Item` renders a `<div>`, but the spec calls for `<li>`

`Item` (`item.tsx:53-71`) is `<div>` by default or a radix `Slot` when `asChild`. There is no `as`
prop. The spec's `<ul>` of `<li>` rows therefore requires:

```tsx
<Item asChild size="sm">
  <li> … </li>
</Item>
```

Alternatively use `ItemGroup` (which sets `role="list"` on a div, `item.tsx:7-16`) and plain `Item`
divs — an already-shipped shape. Either is acceptable; the plan should pick one.

Three overrides the spec requires and the primitives do not give for free:
- `ItemTitle` defaults to `font-medium` (`:123`) → needs `font-normal` **and** `truncate`.
- `ItemDescription` defaults to `text-sm` (`:136`) → needs `text-xs` for the 12px metadata rung.
- `ItemMedia variant="icon"` is a `size-8 border rounded-sm bg-muted` medallion (`:79`), heavier
  than the spec's "`size-4 text-muted-foreground`" glyph. Use `variant="default"` with an explicit
  `size-4 text-muted-foreground` on the lucide element if the bordered medallion is too loud.

**Free win:** `itemVariants`' base includes `[a]:hover:bg-accent/50` (`:33`) — the hover style is
gated on the element being an anchor. Non-interactive rows get no hover for free, satisfying D-03
with no extra work.

### L-09 — `.claude/skills/shadcn` contains a rule that is wrong for this repo's `Button` 🟡

`.claude/skills/shadcn/rules/icons.md` instructs: *"Add `data-icon="inline-start"` … No sizing
classes on the icon."*

**This project's `Button` has no `data-icon` support.** `src/components/ui/button.tsx` is a plain
`cva` + radix `Slot` component (55 lines); `grep -n "data-icon\|svg" src/components/ui/button.tsx`
returns **zero hits**. Icon spacing comes from the base `gap-2` at `:8`. Following the skill's rule
would emit an unstyled, unsized icon.

Similarly, `.claude/skills/frontend-design/SKILL.md` prescribes distinctive display fonts, gradient
meshes, noise textures, and "bold aesthetic direction." That is **categorically inapplicable here**:
CLAUDE.md forbids gradient text globally, the design tokens are fixed, and this phase's visual
contract is locked by §I-1..I-10 above. Do not load it for this phase.

The applicable skills are `.claude/skills/shadcn/rules/{composition,styling}.md` for compound-component
form. Everything else defers to CLAUDE.md and the inherited spec.

### L-10 — Metadata for the new `/documents/page.tsx`

`/documents` has no `layout.tsx` (V-07). Two house patterns exist:

| Pattern | Used by | Shape |
|---------|---------|-------|
| `layout.tsx` + `ownerPageMetadata(title, desc)` | `reports`, `dashboard`, `properties`, `tenants`, `leases`, `analytics` | Returns `title: { absolute: "X | TenantFlow" }` — opts out of the root `title.template` |
| `page.tsx` + plain `Metadata` | `maintenance/page.tsx:4-8`, `documents/vault/page.tsx:4-8` | Plain string title; the root template appends `" | TenantFlow"` |

**Recommend the second** — `export const metadata: Metadata = { title: "Documents", description: "…" }`
directly in `documents/page.tsx`. It matches the two nearest siblings (`maintenance` and
`documents/vault`), needs no new file, and scopes cleanly to `/documents` alone. Adding a
`documents/layout.tsx` would wrap all `/documents/*` routes; harmless (child metadata wins) but
unnecessary.

Do **not** put `ownerPageMetadata(...)` in `page.tsx` alongside a sibling layout — see the
double-suffix history documented at `owner-page-metadata.ts:9-45`.

### L-11 — The relative-date formatter to use

Two exist:
- `formatRelativeDate` — `src/lib/formatters/date.ts:109-129`. Calendar-day granularity:
  `"Today"`, `"1 day ago"`, `"2 days ago"`, `"In 3 days"`. **Matches the spec mockup literally.**
- `date-fns` `formatDistanceToNow` — used by `notification-item.tsx:3,100`. Finer granularity
  (`"about 2 hours ago"`).

**Use `formatRelativeDate`.** It is repo-native, matches the "2 days ago / 5 days ago" mockup, and
avoids pulling `date-fns` into a new module. **Guard the null branch:** `DocumentRow.created_at` is
`string | null` (`document-keys.ts:83`, with a comment explaining the column has a `DEFAULT now()`
but no `NOT NULL`), and `formatRelativeDate` returns `""` for null input.

### L-12 — No reusable mime-icon helper is exported

The spec says "reuse, do not invent" a mime-derived icon. The logic exists — `document-row.tsx:14-26`
has `isImage(mime)` and `resolveMime(doc)`, used at `:47-48` as `isImage(mime) ? ImageIcon : FileText`.
**Neither is exported** (only the `DocumentRow` component at `:40` is).

And `DocumentRow` itself is unusable here: it is an interactive control surface with open/close
state and a download path, which D-03 forbids.

Options: (a) ship the plain lucide `File` the spec's fallback allows; (b) export `isImage` +
`resolveMime` from `document-row.tsx` and reuse them. **(a) is in-spec and zero-risk; prefer it**
unless the plan wants the visual parity, in which case (b) is a two-word `export` change.

### L-13 — Retry-button variant disagrees with both house precedents

The spec pins `Button variant="ghost" size="sm"` for the recent-list `Retry`. Both shipped siblings
use `variant="outline" size="sm"`:
- `documents-vault.client.tsx:499-507` — label `"Try again"`
- `notification-popover-list.tsx:82-84` — label `"Retry"`

The *label* `Retry` matches the notification popover; the *variant* matches neither. Ship the spec
(`ghost`) unless a UI check objects — but flag it in the plan so it reads as deliberate rather than
as a copy error. Note `Button size="sm"` carries `min-h-11` (`button.tsx:24`), a 44px touch target
even at `h-9`.

---

## Standard Stack

**Zero new dependencies.** Every primitive and hook this phase needs is already installed and in
use.

### Core

| Module | Version / location | Purpose | Why it's the standard here |
|--------|--------------------|---------|----------------------------|
| `next` | 16 (App Router) | RSC page shell, `<Link>`, `Metadata` | Project framework. `/reports/page.tsx` is the shipped precedent for this exact shape. |
| `react` | 19 + React Compiler | The one client island | Project framework. |
| `@tanstack/react-query` | `^5.100.10` (query-core 5.100.10 installed) | The recent-list `useQuery` and the D-11 `invalidateQueries` | Already the sole server-state layer; sharing the vault's cache entry is the whole point of SC-3. |
| `lucide-react` | installed | All 6 tile icons + `File` + `ArrowRight` | CLAUDE.md zero-tolerance #10 — sole icon library. |

### Supporting (all pre-existing, `src/components/ui/`)

| Module | Path | Used for |
|--------|------|----------|
| `Button` | `#components/ui/button` | The single primary `Open the vault` CTA; the `Retry` ghost button |
| `Empty` compound | `#components/ui/empty` | Recent-list empty state (`Empty`, `EmptyTitle`, `EmptyDescription`) |
| `Item` compound | `#components/ui/item` | Recent-row anatomy (`Item`, `ItemMedia`, `ItemContent`, `ItemTitle`, `ItemDescription`) |
| `Separator` | `#components/ui/separator` | CTA-to-recent-list divider in Band 1 |
| `Skeleton` | `#components/ui/skeleton` | 5 loading rows |
| `documentSearchQueries` | `#hooks/api/query-keys/document-search-keys` | The one and only data path |
| `formatRelativeDate` | `#lib/formatters/date` | Recent-row meta line |
| `generateBreadcrumbs` / `LABEL_MAP` | `#lib/breadcrumbs` | The six label additions |

### Alternatives Considered

| Instead of | Could use | Why not |
|------------|-----------|---------|
| `documentSearchQueries.list({ page: 0 })` | A dedicated `recentDocumentsQueries` factory + a `p_limit: 5` RPC | Blocking violation of D-02/SC-3. Two factories = two cache entries = the surfaces can disagree. |
| Client island | Server-rendered list via a server Supabase client | Forfeits SC-3 (second fetch path), and the signed-URL mint would run per request instead of per cache entry. |
| `formatRelativeDate` | `date-fns` `formatDistanceToNow` | Finer granularity than the mockup asks for; adds an import the module does not need. |
| Adding `documents/layout.tsx` | `export const metadata` in `page.tsx` | Layout would wrap all `/documents/*`; `maintenance` and `documents/vault` both use the page-level form. |

**Installation:** none. `bun install` unchanged.

---

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.**

| Package | Registry | Disposition |
|---------|----------|-------------|
| *(none)* | — | Phase adds no dependency to `package.json` |

**Packages removed due to slopcheck `[SLOP]` verdict:** none — no packages evaluated.
**Packages flagged `[SUS]`:** none.

Verified by scope: the entire implementation surface is `src/app/(owner)/documents/**`,
`src/components/shell/{main-nav,app-shell}.tsx`, `src/components/documents/documents-section.tsx`
(one line), and `src/lib/breadcrumbs.ts`. Every import named in this document already resolves in
the installed tree. The registry-safety claim inherited at §I-12 (zero third-party blocks, zero new
npm runtime dependencies) **holds unchanged**.

---

## Architecture Patterns

### System Architecture Diagram

```
  Browser request                    ┌──────────────────────────────────────┐
  GET /documents  ─────────────────▶ │ 1. src/proxy.ts                      │
                                     │    auth + subscription gate          │
                                     │    UNCHANGED this phase              │
                                     └───────────────┬──────────────────────┘
                          not authed  ◀──────────────┤
                          307 → /login?redirect=…    │ authed + active|trialing
                          [VERIFIED live 2026-08-02] ▼
                                     ┌──────────────────────────────────────┐
      BEFORE (today)  ───────────────│ 2. app/(owner)/documents/page.tsx    │
      308 → /documents/vault         │    permanentRedirect()  ← DELETED    │
                                     └───────────────┬──────────────────────┘
                                                     │  AFTER (DOCS-01)
                                                     ▼
                        ┌────────────────────────────────────────────────────┐
                        │  page.tsx  — SERVER COMPONENT, zero hooks          │
                        │  <h1> Documents · subtitle                         │
                        └──┬───────────────┬─────────────────┬───────────────┘
                           │               │                 │
                  BAND 1   ▼      BAND 2   ▼        BAND 3   ▼
             ┌──────────────────┐ ┌──────────────┐ ┌────────────────────────┐
             │ Vault panel      │ │ Lease Tmpl.  │ │ 4 printable tiles      │
             │ ├ medallion      │ │ tile <Link>  │ │ each one <Link>        │
             │ ├ description    │ └──────┬───────┘ └────┬───────────────────┘
             │ ├ [Open vault]   │        │              │
             │ │   ← only       │        │              │  static <Link> only
             │ │     primary    │        │              │  NO data, NO hooks
             │ ├ <Separator/>   │        ▼              ▼
             │ └ RecentPanel ───┼──▶ /documents/lease-template
             │    'use client'  │    /documents/templates/{4 routes}
             └────────┬─────────┘         [all 6 destinations VERIFIED present]
                      │
                      │  useQuery(documentSearchQueries.list({ page: 0 }))
                      ▼
        ┌──────────────────────────────────────────────────────────────┐
        │ TanStack Query cache                                         │
        │ key ["documents","search","",null,null,null,null,0]          │
        │ staleTime 45m · gcTime 55m                                   │
        │                                                              │
        │   ◀────── SAME ENTRY ──────▶  /documents/vault (unfiltered)  │
        │                                                              │
        │   ◀── invalidated by ──  D-11 line in documents-section.tsx  │
        │        (upload / delete on the 5 detail routes)              │
        └────────────────────────┬─────────────────────────────────────┘
                                 │ cache miss only
                                 ▼
                 ┌───────────────────────────────────────────┐
                 │ Supabase RPC  search_documents(…)         │
                 │   RLS-scoped · order by created_at desc   │
                 │   p_limit 50, p_offset 0                  │
                 └───────────────────┬───────────────────────┘
                                     ▼
                 ┌───────────────────────────────────────────┐
                 │ mapDocumentRow  (the ONE boundary mapper)  │
                 │ + storage.createSignedUrls(paths, 3600)   │
                 └───────────────────┬───────────────────────┘
                                     ▼
                      client-side .slice(0, 5)  → 5 non-interactive rows
                      (signed URLs go unused here — D-03: rows are not links)
```

### Recommended Project Structure

Copy the shipped `/reports` index layout exactly — it is 4 files, all under 200 lines
(`page.tsx` 63, `report-hub-tile.tsx` 47, `reports-hub-entries.ts` 150,
`reports-summary-strip.tsx` 173), and it satisfies the 300-line rule with room to spare.

```
src/app/(owner)/documents/
├── page.tsx                        # RSC. Metadata + 3 bands. Zero hooks. ~90 lines.
├── documents-hub-entries.ts        # Typed data module: the 6 tiles + band metadata.
│                                   #   Route-colocated, declares its own data,
│                                   #   re-exports NOTHING (CLAUDE.md ZT-2).
├── document-hub-tile.tsx           # Presentational tile. Whole-card <Link>,
│                                   #   aria-hidden medallion. Two size rungs
│                                   #   (size-10 Band 2 / size-8 Band 3).
├── recent-documents-panel.tsx      # 'use client'. THE only client boundary.
│                                   #   useQuery → slice(0,5) → 4 states.
└── __tests__/
    ├── documents-hub.test.ts       # Data-module pins (mirrors reports-hub.test.tsx)
    └── recent-documents-panel.test.tsx  # 4-state render + same-key assertion
```

`vault/`, `lease-template/`, `templates/` are untouched.

### Pattern 1 — RSC shell with exactly one client island

**What:** the page is a Server Component; a single named child carries `'use client'`.
**When to use:** any owner index page whose primary content is static navigation and whose only
data dependency is a subordinate panel.
**Verified precedent:** `src/app/(owner)/reports/page.tsx` — no `"use client"`, no hooks, no
`dynamic()`; the sole island is `<ReportsSummaryStrip />`. Its file header states the invariant
explicitly and a purity test enforces it.

```tsx
// src/app/(owner)/reports/page.tsx (shipped — copy this shape)
export default function ReportsPage() {
  return (
    <div className="p-6 lg:p-8 bg-background min-h-full space-y-8">
      <div>
        <h1 className="typography-h1">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Every financial statement and export in one place.
        </p>
      </div>
      <ReportsSummaryStrip />          {/* the ONE client island */}
      {REPORTS_HUB_GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={group.headingId} className="flex flex-col gap-4">
          <div>
            <h2 id={group.headingId} className="font-semibold text-foreground">{group.title}</h2>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {REPORTS_HUB_ENTRIES.filter((e) => e.group === group.id)
              .map((entry) => <ReportHubTile key={entry.id} entry={entry} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
```

Note the `<section aria-labelledby={headingId}>` + `<h2 id={headingId}>` pairing — this is exactly
what §I-4 requires for the Phase 65 bands, already shipped and reviewed.

### Pattern 2 — Route-colocated typed data module (not a barrel)

**What:** the tile set lives in a `.ts` module beside the page, exporting a typed readonly array.
**Why:** CLAUDE.md caps components at 300 lines; six inline JSX tiles would blow it. It also makes
the composition unit-testable without rendering (see Pattern 4).
**Verified precedent:** `src/app/(owner)/reports/reports-hub-entries.ts`, whose header explicitly
notes *"This is NOT a barrel file (ZT-2): it declares its own data and re-exports nothing."*

Phase 65's analogue needs `id`, `band`, `title`, `href`, `icon: LucideIcon`, `description`, plus a
`medallion` size rung. There is **no** tier-gating on this surface, so nothing like
`gatedReportType` / `hasGrowthBadge` is needed.

### Pattern 3 — Whole-card `<Link>` tile

**Verified precedent:** `src/app/(owner)/reports/report-hub-tile.tsx` (47 lines, RSC-safe, no
`"use client"`, no hooks):

```tsx
<Link href={entry.href}
      className="group bg-card border border-border rounded-lg p-5 hover:bg-muted/50 hover:border-primary/30 transition-colors">
  <div className="flex items-start justify-between mb-4">
    <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
      <Icon className="size-5 text-foreground" aria-hidden="true" />
    </div>
    <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                aria-hidden="true" />
  </div>
  <h3 className="font-semibold text-foreground mb-1">{entry.title}</h3>
  <p className="text-sm text-muted-foreground">{entry.description}</p>
</Link>
```

This already satisfies §I-4 (whole card is one `<Link>`, no nested interactive elements, decorative
icons `aria-hidden`). Phase 65 varies only the medallion rung (`size-10` Band 2 → `size-8` Band 3)
and the padding rung (`p-5` → `p-4`), and drops the `Badge`.

### Pattern 4 — Pin the data module, not the RSC render

**What:** unit-test the entries array directly rather than rendering a Server Component.
**Why:** `page.tsx` is pure composition over the array, so pinning the array pins the structure —
and RSCs are awkward to render under jsdom.
**Verified precedent:** `src/app/(owner)/reports/__tests__/reports-hub.test.tsx`, whose header
states the reasoning verbatim. Its 11 assertions map almost one-to-one onto Phase 65 needs:
exact entry count, exact band count and order, per-band counts, every `href` under the expected
prefix, no entry pointing at the index itself, non-empty title+description, unique ids.

### Anti-Patterns to Avoid

- **A second query for the recent list.** Any new factory, new mapper, or `.from('documents')`
  select is a blocking violation of D-02 and forfeits SC-3.
- **Making recent rows clickable.** D-03. It would create a second signed-URL download path
  competing with the vault's.
- **An error boundary around the whole page.** §I-10: a recent-list failure must never remove the
  vault CTA. Degrade inline in the panel only. `/reports/page.tsx`'s header records the same rule
  for the same reason.
- **A blocking page-level loader.** The three static bands have no data and must render instantly.
- **String-literal query keys.** CLAUDE.md zero-tolerance #9 — always the `queryOptions()` factory.
- **Lowering `LIST_STALE_TIME_MS`.** D-11 forbids it; the 45/55 pair is tied to the 1-hour
  signed-URL TTL.
- **Deleting `documents-section.tsx`'s existing entity-scoped invalidation.** D-11 is additive;
  `["documents","search"]` does not prefix-match `["documents","list",…]`.
- **`bg-white` / `text-muted`.** CLAUDE.md accessibility rules — `bg-background` and
  `text-muted-foreground`.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Fetching recent documents | A `p_limit: 5` RPC, a `recentDocumentsQueries` factory, or a `.from('documents')` select | `documentSearchQueries.list({ page: 0 })` + `.slice(0, 5)` | Only the shared factory produces the identical cache key that makes SC-3 structurally true. A second path also needs its own mapper, its own signed-URL mint, and its own error handling. |
| Row → `DocumentRow` typing | A local interface | `DocumentRow` from `#hooks/api/query-keys/document-keys` | CLAUDE.md zero-tolerance #3. `mapDocumentRow` already validates enum-shaped fields and throws on missing NOT NULLs. |
| PostgREST error surfacing | `error.message` in the UI | `handlePostgrestError` (already inside the factory's `queryFn`) | Captures to Sentry and rethrows so TanStack registers the failure; deliberately shows **no** toast, so the panel's inline copy is the whole user-facing surface. Raw PostgREST strings in UI are forbidden by §I-3. |
| Relative dates | `Date` arithmetic | `formatRelativeDate` (`#lib/formatters/date`) | Its comment records a fixed off-by-one: *"yesterday is '1 day ago', never '2 days ago' (the historical +1 overstated every past event's age by one day)."* |
| Empty state | A custom `<div>` with centered text | `Empty` + `EmptyTitle` + `EmptyDescription` | CLAUDE.md mandates the `Empty` compound for list empty states. |
| Loading rows | A spinner | `Skeleton` × 5 | §I-3 forbids spinners here. |
| Nav parent/child rendering | A new collapsible in `main-nav.tsx` | `NavigationItem.children` (`main-nav.tsx:28`) — already renders parents at `:211-265` | D-08 needs **zero** new nav capability. (But read L-02 first — what it renders may not be what you expect.) |
| Breadcrumb generation | Manual crumb arrays per page | `generateBreadcrumbs` + `LABEL_MAP` | Already wired at `app-shell.tsx:46`; the page needs no breadcrumb code at all. |
| Tile grid layout | A bespoke flex tree | The shipped `grid gap-4 sm:grid-cols-2 …` from `/reports/page.tsx` | §I-10's responsive contract is `grid-cols-1 → sm:grid-cols-2 → lg:grid-cols-4`. |
| Page metadata | Hand-written `<title>` | `export const metadata: Metadata` in `page.tsx` | Matches `maintenance/page.tsx` and `documents/vault/page.tsx`. See L-10. |

**Key insight:** every single capability this phase needs is already shipped somewhere in this
repo — the RSC hub shape at `/reports`, the query factory in `document-search-keys.ts`, the nav
`children` support in `main-nav.tsx`, the `Empty`/`Item`/`Skeleton` primitives, and the breadcrumb
map. The phase is composition and deletion, not construction. Anything that looks like new
machinery is almost certainly a duplicate of something above.

---

## Runtime State Inventory

> Phase 65 is a UI/routing change, not a rename or migration. Included anyway because the
> redirect reversal has one genuine runtime-state dimension.

| Category | Items found | Action required |
|----------|-------------|------------------|
| **Stored data** | **None.** No table, column, RPC, or seed row references `/documents`. `search_documents` is read-only and unmodified. `document_categories` untouched. | None |
| **Live service config** | **None.** No n8n workflow, Datadog dashboard, Tailscale ACL, or Cloudflare tunnel references `/documents`. Verified by absence from `next.config.ts`, `vercel.json`, and `src/lib/seo/*`. | None |
| **OS-registered state** | **None.** No cron job, scheduled task, or pm2 process touches this route. | None |
| **Secrets / env vars** | **None.** No env var names the route or the landing. | None |
| **Build artifacts / caches** | ⚠️ **Browser-cached 308s.** `permanentRedirect` emits a 308, which browsers may cache. Authenticated owners who previously loaded `/documents` may hold one. | See **L-01** — verify the authenticated 308's `Cache-Control` before/after deploy. The unauthenticated proxy response is `must-revalidate` [VERIFIED live], which is a strong hint the risk is already closed but is **not** proof for the authenticated path. |
| **CDN / edge caches** | `vercel.json` sets no `Cache-Control` for `/documents` (only `/static/*`, `/_next/static/*`, `/manifest.json`, `/sw.js`). Vercel's edge may still hold the 308 briefly. | A production deploy invalidates the edge automatically. No manual purge expected. `[ASSUMED]` |

---

## Common Pitfalls

### Pitfall 1 — Assuming `main-nav.tsx:48` is the only sidebar edit

**What goes wrong:** the `Documents` entry is repointed but the `Templates` section survives, so
`Lease Template` appears twice in the sidebar.
**Why it happens:** the two live 250 lines apart — the data array at `:93-99`, the rendering block
at `:301-322`. The CONTEXT citation `:88-104` covers neither fully.
**How to avoid:** treat D-09 as a **three-site** deletion (interface `:31-35`, array `:93-99`,
JSX `:301-322`) plus one import cleanup (`FileCheck`, `:9`).
**Warning sign:** `bun run typecheck` errors on unused `FileCheck` — that's the compiler telling
you the deletion is half-done. If typecheck is green but `DocumentItem` still exists, the deletion
is *also* half-done (exported interfaces escape `noUnusedLocals`).

### Pitfall 2 — Trusting a passing nav test

**What goes wrong:** `getByRole("link", { name: /lease template/i })` passes after the section is
deleted, so the change looks verified when the link is actually inside a collapsed, `inert`
container.
**Why it happens:** `inert` is unimplemented in jsdom, `@testing-library/dom`, and
`dom-accessibility-api` — verified by `grep -rl "inert"` returning zero hits in all three.
**How to avoid:** assert **structure** — that `Documents` is a `<button>` with
`aria-controls="nav-section-Documents"`, that the section-label array equals exactly
`["Documents","Analytics","Reports"]`, and that the `Vault` child's `href` is `/documents/vault`.
**Warning sign:** a test that would pass identically before and after the change.

### Pitfall 3 — Loosening the exhaustive collapsible-sections assertion

**What goes wrong:** `main-nav.test.tsx:135-143`'s `toEqual(["Analytics","Reports"])` fails, and
the quick fix is `toContain`.
**Why it happens:** the failure looks like test brittleness. It isn't — the comment at `:131-134`
says it was written as an exhaustive list *specifically* so an unplanned third section fails here.
**How to avoid:** update the array to the new three-element truth and extend the comment to record
that Phase 65 D-08 added `Documents` deliberately.
**Warning sign:** any diff that weakens a `toEqual` to a `toContain` in this file.

### Pitfall 4 — Believing the landing's cache sharing makes it fresh

**What goes wrong:** the phase ships, "Recently added" shows stale rows after an upload, and the
Claims Integrity milestone gains a new false claim.
**Why it happens:** sharing a cache entry guarantees the vault and the landing **agree with each
other**. It does not make either **correct**. `staleTime` is 45 minutes.
**How to avoid:** D-11 is not optional polish; it is what makes the word "Recently" true.
**Warning sign:** any plan that treats D-11 as a nice-to-have or defers it.

### Pitfall 5 — Re-deriving instead of consolidating

**What goes wrong:** the planner invents band spacing, copy, or icons that differ from §I-1..I-10.
**Why it happens:** the inherited contract is long and looks like background reading.
**How to avoid:** every string in §I-6 is **locked copy**. Every rung in §I-7 and §I-8 is pinned.
Discretion is confined to exactly four items (listed in `<user_constraints>`).
**Warning sign:** a plan that names an icon not in the §I-5 table, or a copy string not in §I-6.

### Pitfall 6 — Scoping a verification grep too narrowly

**What goes wrong:** `grep -rln DocumentsSection src/app` returns 2 and the plan under-scopes D-11's
blast radius.
**Why it happens:** three of the five mounts live under `src/components/`, not `src/app/`.
**How to avoid:** every verification search in this phase must span `src/` **and** `tests/`, and the
scope must be stated in the finding. A `grep -rl` that matches a code comment is not a live import
— open the file.
**Warning sign:** any claim about "how many places do X" without a stated search scope.

---

## Code Examples

### The D-11 edit, exactly

Current (`src/components/documents/documents-section.tsx:137-142`) — verified verbatim:

```tsx
const invalidateListAndDashboard = useCallback(() => {
  queryClient.invalidateQueries({
    queryKey: documentQueries.list({ entityType, entityId }).queryKey,
  });
  queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
}, [queryClient, entityType, entityId]);
```

After (the one added line + one added import; the existing two calls stay):

```tsx
// import added near documents-section.tsx:30
import { documentSearchQueries } from "#hooks/api/query-keys/document-search-keys";

const invalidateListAndDashboard = useCallback(() => {
  queryClient.invalidateQueries({
    queryKey: documentQueries.list({ entityType, entityId }).queryKey,
  });
  // Phase 65 D-11: the /documents landing and the vault both read the
  // ["documents","search",…] entry, which the entity-scoped ["documents","list",…]
  // key above cannot prefix-match. Without this, an upload here leaves
  // "Recently added" stale for LIST_STALE_TIME_MS (45 min). refetchType defaults
  // to 'active' and neither surface is mounted on this route, so this marks the
  // entry stale with zero network.
  queryClient.invalidateQueries({ queryKey: documentSearchQueries.all() });
  queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
}, [queryClient, entityType, entityId]);
```

Deps array is unchanged — `documentSearchQueries.all()` closes over nothing.

### The query-core evidence for D-11 (verified against the installed build)

```js
// node_modules/@tanstack/query-core/build/modern/query.js:127-138
isStaleByTime(staleTime = 0) {
  if (this.state.data === void 0)  return true;
  if (staleTime === "static")      return false;
  if (this.state.isInvalidated)    return true;      // ← short-circuits staleTime
  return !timeUntilStale(this.state.dataUpdatedAt, staleTime);
}
```

Every `staleTime` read in the package is observer-scoped:
`query.js:114` → `observer.options.staleTime`; `queryObserver.js:112, 191, 451, 461` →
`this.options.staleTime` / `options.staleTime`. **Zero occurrences of `query.options.staleTime`.**
Both halves of D-11's rejection of the per-observer-staleTime alternative are confirmed.

### The recent-list call (the one line SC-3 depends on)

```tsx
// recent-documents-panel.tsx — 'use client'
const { data, isLoading, isError, refetch } = useQuery(
  documentSearchQueries.list({ page: 0 }),   // ← exactly this; no filters, no overrides
);
const rows = (data?.rows ?? []).slice(0, 5);
```

Normalizes to `["documents","search","",null,null,null,null,0]` — byte-identical to what the vault
produces in its default unfiltered state, because every one of its five spreads is empty:

```tsx
// documents-vault.client.tsx:230-239 (shipped, verified unchanged)
const { data, isLoading, isFetching, isError, refetch } = useQuery(
  documentSearchQueries.list({
    ...(queryParam ? { query: queryParam } : {}),
    ...(entityType ? { entityType } : {}),
    ...(categories.length > 0 ? { categories } : {}),
    ...(fromParam ? { from: fromParam } : {}),
    ...(toParam ? { to: toParam } : {}),
    page: pageParam,
  }),
);
```

Do **not** pass `staleTime`, `gcTime`, `select`, or `enabled` overrides — a differing observer
option does not fork the cache entry, but it does fork the behaviour the "cannot disagree"
guarantee is stated about.

### The empty state (D-12 copy, correct shape, correct padding)

```tsx
// Shape mirrors chart-area-interactive.tsx:207-213 — the CORRECT precedent.
// (56-UI-SPEC cites revenue-expense-chart.tsx, which actually renders EmptyMedia.)
// The md: companion is required — see L-07: `py-6` alone does not remove
// Empty's base `md:p-12` under tailwind-merge.
<Empty className="py-6 md:py-6">
  <EmptyTitle>No documents yet</EmptyTitle>
  <EmptyDescription>Documents you upload appear here, newest first.</EmptyDescription>
</Empty>
```

No `EmptyMedia`. No `EmptyContent`. No CTA — the `Open the vault` button is 24px above.

### The nav shape D-08 mirrors (shipped, `main-nav.tsx:68-85`)

```tsx
{
  // D-29 FULL SEPARATION: Reports and Analytics are two peer sections, each
  // owning its own URL tree. […] The children mirror REPORTS_HUB_ENTRIES order exactly.
  label: "Reports",
  href: "/reports",
  icon: FileText,
  children: [
    { label: "Income Statement", href: "/reports/income-statement" },
    /* … 6 more … */
  ],
},
```

Phase 65's analogue goes in `coreItems` (which is already `NavigationItem[]`, so `children` is
available with no type change):

```tsx
{
  label: "Documents",
  href: "/documents",
  icon: FolderArchive,
  children: [
    { label: "Vault", href: "/documents/vault" },
    { label: "Lease Template", href: "/documents/lease-template" },
  ],
},
```

⚠️ **Read L-02 before shipping this.** `renderNavItem`'s `hasChildren` branch renders `label` as a
`<button>` toggle and never emits a `<Link href={item.href}>` — so `href: "/documents"` here is
consumed only by a dead `isActive()` call.

---

## State of the Art

| Old approach | Current approach | When changed | Impact on this phase |
|--------------|------------------|--------------|----------------------|
| `/documents` as a bare `permanentRedirect` to the vault, with an in-code note that no index would return | A real landing page | **This phase (DOCS-01)** | The note at `page.tsx:7-8` must be replaced by one recording the supersession (D-06). |
| Sidebar `Documents` → `/documents/vault` (flat), plus a separate one-item `Templates` section | `Documents` → `/documents`, still **FLAT** (L-02 resolved); `Templates` section deleted | **This phase (D-08/D-09)** | **3** unit-test edits, measured — `main-nav.test.tsx` `:76`, `:210`, `:357`. S-02's "six" was scoped to the reverted parent+children shape; the `:135-143` tripwire needs no edit under flat. |
| Nav sections rendered inline, one shape per section | Shared `renderNavItem` handling both flat items and parent+children | Pre-Phase 56, extended by Phase 56 for `Reports` | D-08 needs zero new nav capability — but inherits the parent-is-not-a-link behaviour (L-02). |
| `/reports` index with four dynamic-imported chart sections | RSC index, zero charts, one summary-strip island, 7 tiles from a typed data module | **Phase 56, shipped** | Gives Phase 65 a directly copyable 4-file template (Patterns 1-4). |
| Chart-free empty states hand-rolled per surface | `Empty` compound in `src/components/ui/empty.tsx` | v2.x | CLAUDE.md now mandates it for list empty states. |

**Deprecated / outdated in the inherited text:**
- The flat nav ruling ("nav `Documents` target → `/documents`") — superseded by D-08.
- The empty-body copy at `56-UI-SPEC.md:501` — superseded by D-12.
- `revenue-expense-chart.tsx` as the no-`EmptyMedia` precedent — factually wrong; use
  `chart-area-interactive.tsx:207-213`.
- Four line-number citations — see S-03.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| bun | all scripts | ✓ | 1.3.x per CLAUDE.md | — |
| `tsc` (`bun run typecheck`) | quality gate | ✓ | green at HEAD, 3 tsconfigs | — |
| `vitest` | unit tests | ✓ | 4.1.6 | — |
| `@tanstack/query-core` | D-11 semantics | ✓ | 5.100.10 | — |
| jsdom | unit tests | ✓ | via vitest `unit` project | — |
| Supabase (prod, PostgREST + `search_documents`) | recent list at runtime only | ✓ | RPC verified present in migration | — |
| Playwright | E2E | ✓ but **DO NOT RUN** | — | `--list` only. `tests/e2e/playwright.config.ts`'s `webServer.command` begins `rm -rf .next && rm -f .env.local` and will **delete `.env.local`**. E2E is CI-only (`E2E_OWNER_*` secrets are CI-scoped). |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

**Blocked local verification:** `bun run dev` currently fails env validation because `.env.local`
is missing the app vars (recorded in project memory). **Never create or edit `.env.local`.** Rely
on `bun run typecheck` + `bun run test:unit` for local verification; visual verification of the
landing needs either a working local env (owner-provided) or a preview deploy.

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 + jsdom, `unit` project |
| Config file | `vitest.config.ts` (projects: `unit`, component, integration) |
| Include pattern | `src/**/*.{test,spec}.{ts,tsx}` — **tests must live under `src/`** |
| Setup files | `./src/test/msw-polyfill.ts`, `./src/test/unit-setup.ts` |
| Quick run command | `bun run test:unit -- <path>` — **the script already injects `--run`; do not add it** |
| Full suite command | `bun run test:unit` |
| Coverage threshold | 80% lines/functions/branches/statements (lefthook pre-commit) |
| Type gate | `bun run typecheck` (3 tsconfigs) — authoritative over IDE diagnostics |

### Phase Requirements → Test Map

| Req / Criterion | Behavior | Type | Automated command | File exists? |
|-----------------|----------|------|-------------------|--------------|
| DOCS-01 / SC-1 | The 6 hub entries exist, are correctly banded, and every href points at a real route | unit | `bun run test:unit -- src/app/\(owner\)/documents/__tests__/documents-hub.test.ts` | ❌ Wave 0 — mirror `reports-hub.test.tsx` |
| DOCS-01 / SC-1 | `/documents/page.tsx` no longer calls `permanentRedirect` and is an RSC (no `"use client"`, no hooks) | unit (source-read guard) | same file — read `page.tsx` from disk and assert absence, mirroring `reports-hub-purity.test.ts` | ❌ Wave 0 |
| SC-2 | No new redirect for `/documents/vault`; no marketing surface changed | unit (source-read guard) | assert `reporting-redirects.ts` source array is unchanged and contains no `/documents` entry | ❌ Wave 0 (small; can fold into the hub test) |
| SC-3 | The recent panel calls `documentSearchQueries.list` with **exactly** `{ page: 0 }` | unit | `bun run test:unit -- src/app/\(owner\)/documents/__tests__/recent-documents-panel.test.tsx` — `vi.spyOn(documentSearchQueries, "list")`, mirroring `documents-vault.test.tsx:406` | ❌ Wave 0 |
| SC-3 / §I-3 | All four panel states render correctly (loading → 5 Skeletons; empty → D-12 copy; error → inline + Retry; success → 5 rows max) | unit | same file — mock `useQuery` per state, mirroring `documents-vault.test.tsx:202-230` | ❌ Wave 0 |
| §I-3 / D-03 | Recent rows contain **no** `<a>` and **no** `<button>` | unit | same file — `container.querySelectorAll("li a, li button")` → length 0 | ❌ Wave 0 |
| D-08 / D-09 | **(SUPERSEDED — flat)** `Documents` is a FLAT entry whose href is `/documents` and which renders as a `<Link>`; sections remain exactly `["Analytics","Reports"]`; no `Templates` section header; no `Documents` children | unit | `bun run test:unit -- src/components/shell/__tests__/main-nav.test.tsx` | ✅ EXISTS — **6 tests need deliberate edits, see S-02** |
| D-10 | The Cmd+K `Documents` entry href is `/documents` | unit | `bun run test:unit -- src/components/shell/__tests__/app-shell-nav.test.tsx` | ✅ EXISTS and already passes; **add an explicit `toContain("/documents")` assertion** so the repoint is pinned rather than incidentally allowed |
| D-07 | The four hyphenated template slugs resolve to proper labels | unit | `bun run test:unit -- src/lib/__tests__/breadcrumbs.test.ts` | ✅ EXISTS — add cases mirroring `:188-201` |
| D-11 | Upload/delete invalidates `["documents","search"]` | unit | `bun run test:unit -- src/components/documents/__tests__/documents-section.test.tsx` — assert `queryClient.invalidateQueries` was called with `{ queryKey: ["documents","search"] }` | ✅ FILE EXISTS — add the case |
| L-01 | The 308 does not stick in browser caches | manual | `curl -sSI` the authenticated `/documents` pre-deploy; hard-refresh check post-deploy | manual-only — no automated path (requires a real session cookie) |

### Sampling Rate

- **Per task commit:** `bun run typecheck && bun run test:unit -- <the touched test files>` — under 5s
  for the nav + documents subsets (measured: 41 tests in 1.12s, 89 tests in 2.29s).
- **Per wave merge:** `bun run validate:quick` (typecheck + biome + full unit suite).
- **Phase gate:** full unit suite green + `next build` green before `/gsd:verify-work`. E2E runs in
  CI only.

### Wave 0 Gaps

- [ ] `src/app/(owner)/documents/__tests__/documents-hub.test.ts` — covers DOCS-01 / SC-1 / SC-2
      (data-module pins + RSC purity guard + no-redirect guard)
- [ ] `src/app/(owner)/documents/__tests__/recent-documents-panel.test.tsx` — covers SC-3, §I-3, D-03
- [ ] Existing-file edits (not new files, but must be planned as deliberate work, not incidental):
      `main-nav.test.tsx` (6 tests), `app-shell-nav.test.tsx` (+1 assertion),
      `breadcrumbs.test.ts` (+4 cases), `__tests__/documents-section.test.tsx` (+1 case)
- [ ] Framework install: **none needed.**

---

## Security Domain

`security_enforcement` is not disabled in `.planning/config.json`, so this section applies.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard control |
|---------------|---------|------------------|
| V2 Authentication | **no change** | `src/proxy.ts` already gates `/documents` — **verified live**: unauthenticated `GET /documents` → 307 `/login?redirect=%2Fdocuments`. The route is already inside `(owner)`; no `PUBLIC_ROUTES` change. |
| V3 Session Management | **no change** | No session handling on this surface. `updateSession` / `getAll`/`setAll` untouched. |
| V4 Access Control | **yes, inherited** | The recent list reads through `search_documents`, a SECURITY DEFINER RPC with `search_path` locked and `revoke all … from public` + `grant execute … to authenticated` (verified in `20260426043911_…sql:117-118`). RLS scopes rows to the caller. **The landing adds no new data access whatsoever** — it reuses one existing RPC through one existing factory. |
| V5 Input Validation | **not applicable** | The landing accepts **zero** user input. No forms, no search box, no URL params, no `nuqs` state. `documentSearchQueries.list({ page: 0 })` is a hardcoded literal. |
| V6 Cryptography | **no change** | Signed-URL minting is unchanged inside the shared `queryFn`. No new crypto. |
| V7 Error Handling | **yes** | Inline error copy only, routed through `handlePostgrestError`, which captures to Sentry and rethrows without exposing the PostgREST message. §I-3 forbids raw PostgREST strings in UI. |
| V12 Files & Resources | **inherited only** | Signed URLs (1h TTL) are embedded in the shared cache entry. **D-03 makes the landing render none of them** — rows are non-interactive. The landing therefore has strictly *less* file-access surface than the vault. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard mitigation | Status here |
|---------|--------|---------------------|-------------|
| Owner A reading Owner B's documents | Information disclosure | RLS on `documents` + `search_documents` RPC scoping | Inherited unchanged; already covered by `tests/integration/rls/` |
| Signed-URL leakage via a rendered link | Information disclosure | D-03 — recent rows render no URLs | **Reduced** vs. the vault |
| Expired signed URL served from a persisted cache | — | Pre-existing (`gcTime` 55min < 1h TTL, but IndexedDB persists 24h) | **Explicitly deferred** in CONTEXT; D-11 does not affect it |
| Auth bypass on a new route | Elevation of privilege | `(owner)` route group + `src/proxy.ts` prefix gate | **Verified live** (307 → `/login`) — no new route is created; `/documents` already existed and was already gated |
| Subscription-gate bypass | Elevation of privilege | Proxy requires `subscription_status IN ('active','trialing')` | Unchanged — the route already sits behind it |
| XSS via document titles in the recent list | Tampering | React escapes text children by default; no `dangerouslySetInnerHTML` anywhere in scope | Confirm no `dangerouslySetInnerHTML` enters the panel |

**No SECURITY DEFINER function, RLS policy, migration, or Edge Function is created or modified by
this phase.** Zero database change. Zero `supabase/` change.

---

## Project Constraints (from CLAUDE.md)

Binding on every plan and every task. Non-negotiable:

| # | Rule | Where it bites in this phase |
|---|------|------------------------------|
| ZT-1 | No `any` types — use `unknown` + type guards | The entries module and the panel's row mapping |
| ZT-2 | **No barrel files / re-exports** | `documents-hub-entries.ts` must declare its own data and re-export nothing — the `/reports` analogue states this explicitly in its header |
| ZT-3 | No duplicate types — search `src/types/` first | Use `DocumentRow` from `document-keys.ts`; do not redeclare a row shape |
| ZT-4 | No commented-out code | The deleted `Templates` section and the old redirect must be **deleted**, not commented |
| ZT-5 | No inline styles | Tailwind utilities / `globals.css` custom properties only |
| ZT-7 | No emojis in code | lucide icons only |
| ZT-8 | No `as unknown as` | The factory's `mapDocumentRow` is the boundary; the panel receives typed rows |
| ZT-9 | **No string-literal query keys** — always `queryOptions()` factories | `documentSearchQueries.list({ page: 0 })` and `documentSearchQueries.all()` — never a hand-written array |
| ZT-10 | No `@radix-ui/react-icons` | `lucide-react` only |
| — | Server Components by default; `'use client'` only for hooks / events / browser APIs | Exactly one island (D-04) |
| — | Max **300 lines** per component, **50 lines** per function | Split as in §Recommended Project Structure; the `/reports` analogue is 4 files, largest 173 lines |
| — | Full TS strict incl. `noUnusedLocals`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | `noUnusedLocals` will catch the orphaned `FileCheck` import; it will **not** catch the exported `DocumentItem` interface (L-03) |
| — | `#`-prefixed subpath imports, declared in **both** `tsconfig.json#paths` and `package.json#imports` | `#components/*`, `#hooks/*`, `#lib/*` — no new alias is needed |
| — | Files kebab-case; types PascalCase; constants UPPER_SNAKE | `documents-hub-entries.ts`, `recent-documents-panel.tsx` |
| — | Mutations invalidate related keys **and** `ownerDashboardKeys.all` | Already satisfied at `documents-section.tsx:141`; D-11 adds one more key, does not replace it |
| — | Icon-only buttons need `aria-label`; `text-muted-foreground` not `text-muted`; `bg-background` not `bg-white` | The tile medallions are `aria-hidden` decorations, not buttons — no label needed |
| — | Commit subjects must start **lowercase** (commitlint `subject-case`) | e.g. `feat(65-01): replace /documents redirect with landing page` |
| — | **Never** `--no-verify`; never push to `main`; feature branch → PR | Standard workflow |
| — | Perfect-PR merge gate: two consecutive zero-finding review cycles | Applies to this phase's PR |

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | Only a small population of users holds a cached 308 for `/documents` (nav and Cmd+K both pointed at `/documents/vault`, never the bare path) | L-01, Runtime State | Some owners keep landing on the vault after ship. Mitigated by the L-01 verification step. Not measured. |
| A2 | Vercel edge caches for `/documents` are invalidated automatically on deploy | Runtime State | A brief post-deploy window where the edge still serves the 308. Standard Vercel behaviour, not verified for this project. |
| A3 | The authenticated `/documents` 308 carries the same `public, max-age=0, must-revalidate` observed on the unauthenticated 307 | L-01 | If false, the sticky-308 risk is real rather than theoretical. **This is the single most valuable thing to verify before implementation.** |
| A4 | `getByRole` in this stack ignores `inert` (inferred from zero `inert` occurrences in jsdom, `@testing-library/dom`, and `dom-accessibility-api`) | S-01, S-02, Pitfall 2 | If a dependency bump adds `inert` support, `main-nav.test.tsx:224-235` and `:357-368` would fail rather than pass. Evidence is absence-of-implementation, not a positive behavioural test. |
| A5 | The user accepts Option A for L-02 (landing reachable via Cmd+K + breadcrumb, matching `Reports`) | S-01, L-02 | If the user expected a one-click sidebar link — which D-08's rationale implies — the shipped nav does not deliver it. **Surface this to the user during planning; do not decide silently.** |
| A6 | The Cmd+K `Templates` group stays | L-04 | A reviewer may read `app-shell.tsx:165-169` as requiring its removal. Recommendation is to keep and state the choice; either way it must be explicit. |
| A7 | `tailwind-merge` does not remove a base `p-6 md:p-12` when only `py-6` is appended | L-07 | If it does, `className="py-6 md:py-6"` is merely redundant, not required. Low risk; the recommended form is correct either way. |

**Every other claim in this document is `[VERIFIED: file read]` or `[VERIFIED: command output]`
against HEAD on 2026-08-02.**

---

## Open Questions

1. **L-02 / A5 — Should the sidebar give `/documents` a one-click link?**
   - What we know: mirroring `Reports` exactly (D-08 as literally written) does **not** produce a
     sidebar link to the landing, because parent rows render as toggle buttons. `/reports` has the
     same gap today. The landing remains reachable via Cmd+K and the breadcrumb.
   - What's unclear: whether the user's "make the landing navigable" intent is satisfied by
     Cmd+K + breadcrumb, or requires an explicit sidebar affordance.
   - **Recommendation:** put Options A / B / C from §S-01 to the user during planning. Default to
     **A** (exact `Reports` mirror) if no answer, and record the corrected rationale in the plan.

2. **L-04 / A6 — Does the Cmd+K `Templates` group survive D-09?**
   - What we know: D-09 says "nav section" (sidebar); D-10 enumerates two changed entries and the
     palette group is not one of them. `app-shell.test.tsx:414` pins its heading.
   - What's unclear: whether "the one-item Templates nav section is deleted" was intended to span
     both route tables.
   - **Recommendation:** keep it; state the decision explicitly in the plan so a reviewer citing
     `app-shell.tsx:165-169` gets a recorded answer rather than a new finding.

3. **L-06 — Ship `templates: "Templates"` in LABEL_MAP or omit it?**
   - What we know: it is a rendering no-op (the fallback already yields "Templates"), and the crumb
     it labels links to `/documents/templates`, which has no `page.tsx` and 404s today.
   - What's unclear: whether D-07's six-entry list was written knowing `/documents/templates` is
     not a route.
   - **Recommendation:** ship the four hyphenated slugs plus `vault`; omit `templates`; note the
     pre-existing dead crumb in `65-SUMMARY.md`. If the user wants literal D-07 compliance, ship all
     six and note the dead crumb anyway.

4. **A3 — What `Cache-Control` does the authenticated 308 carry?**
   - What we know: the unauthenticated proxy response is `public, max-age=0, must-revalidate`;
     `vercel.json` and `next.config.ts` set nothing for `/documents`.
   - What's unclear: whether the page-level 308 inherits that header.
   - **Recommendation:** one `curl -sSI` with a session cookie, run **before** implementation
     starts. Cheap, and it either closes L-01 entirely or promotes it to a real deploy-time task.

5. **L-12 — Plain `File` icon, or export the vault's mime resolver?**
   - What we know: `isImage` / `resolveMime` exist at `document-row.tsx:14-26` but are not exported;
     the spec permits the plain `File` fallback.
   - **Recommendation:** ship plain `File`. Zero risk, in-spec, and the recent rows are a 5-item
     preview where per-mime differentiation buys little.

---

## Sources

### Primary — HIGH confidence (direct file reads at HEAD, 2026-08-02)

| Source | What was checked |
|--------|------------------|
| `src/app/(owner)/documents/page.tsx` | The 11-line redirect + its superseded comment |
| `src/app/(owner)/documents/**` (full `find`) | All 25 files; six destination routes; absence of `layout.tsx` and of `templates/page.tsx` |
| `src/hooks/api/query-keys/document-search-keys.ts` | Full read — factory, key shape, stale/gc constants, `handlePostgrestError` wiring |
| `src/hooks/api/query-keys/document-keys.ts` | `DocumentRow` shape `:67-85`; `all()` `:180`; `lists()` `:181` |
| `src/components/documents/documents-vault.client.tsx` | `:230-239` query call; `:495-535` error/empty states; `:582-585` row wrapper |
| `src/components/documents/documents-section.tsx` | `:1-175` — imports, `ENTITY_LABELS` `:62-68`, `invalidateListAndDashboard` `:137-142`, no-`onSuccess` comment `:144-147` |
| `src/components/documents/document-row.tsx` | Export surface; `isImage`/`resolveMime` are module-private |
| `src/components/settings/categories-settings.tsx` | `:43-82` — the D-11 precedent and its actual mechanism |
| `src/components/shell/main-nav.tsx` | **Full 328-line read** — `coreItems`, `analyticsItems`, `documentItems`, `renderNavItem`, both render branches |
| `src/components/shell/app-shell.tsx` | `:75-160` commandGroups; `:162-176` Templates group; `:46,289` breadcrumb wiring |
| `src/components/shell/app-shell-header.tsx` | `:40-124` — every crumb renders as a live `<Link>` |
| `src/components/shell/__tests__/{main-nav,app-shell,app-shell-nav}.test.tsx` | Full reads / targeted reads for the breakage analysis |
| `src/lib/breadcrumbs.ts` + `src/lib/__tests__/breadcrumbs.test.ts` | LABEL_MAP contents; fallback behaviour; existing documents case |
| `src/components/ui/{empty,item,button}.tsx` | Full reads — compound APIs, cva bases, `asChild`/Slot, no `data-icon` |
| `src/app/(owner)/reports/{page,report-hub-tile,reports-hub-entries,reports-summary-strip,layout}.tsx` | The complete shipped RSC-hub template |
| `src/app/(owner)/reports/__tests__/reports-hub.test.tsx` | The data-module-pinning test pattern |
| `src/components/notifications/notification-popover-list.tsx` | `:78-100` — the nested-preview convention |
| `src/app/(owner)/analytics/financial/revenue-expense-chart.tsx` | `:55-65` — refutes the inherited `EmptyMedia` citation |
| `src/components/dashboard/chart-area-interactive.tsx` | `:200-216` — the correct no-`EmptyMedia` precedent |
| `src/lib/formatters/date.ts` | `:105-129` — `formatRelativeDate` output shape and its off-by-one fix |
| `src/lib/postgrest-error-handler.ts` | `:1-40` — no-toast contract |
| `src/lib/seo/owner-page-metadata.ts` | `:30-73` — the double-suffix history and `title.absolute` |
| `src/providers/query-provider.tsx` | `:60,63,70` — global staleTime / gcTime / refetchOnWindowFocus |
| `supabase/migrations/20260426043911_v25_phase_63_search_documents_filter_extension.sql` | `:100-118` — `order by … created_at desc`; grants |
| `node_modules/@tanstack/query-core/build/modern/{query,queryObserver}.js` | `isStaleByTime` `:127-138`; all six observer-scoped staleTime reads |
| `vercel.json` `:1-70`, `next.config.ts` | Header rules; absence of a `/documents` redirect |
| `vitest.config.ts` `:60-125` | `unit` project include/exclude, setup files, coverage thresholds |
| `tests/e2e/tests/constants/routes.ts` | `:50-51` — `ROUTES.DOCUMENTS` declared but unreferenced |
| `.planning/{REQUIREMENTS,ROADMAP}.md`, `65-CONTEXT.md` | DOCS-01 text; Phase 65 goal + 3 success criteria; all locked decisions |
| `56-UI-SPEC.md` `:89,374-384,400-455,461-507,515-546,575-693`; `56-RESEARCH.md` `:943-1001` | The complete inheritance, transcribed into §Inherited Design Contract |

### Command output — HIGH confidence

| Command | Result |
|---------|--------|
| `bun run typecheck` | green, no output (3 tsconfigs) |
| `bun run test:unit -- <main-nav, breadcrumbs>` | 41 passed / 41 |
| `bun run test:unit -- <app-shell ×2, documents ×3>` | 89 passed / 89 |
| `grep -rn "DocumentsSection" src/ tests/` | 5 mount sites (3 under `src/components/`) |
| `grep -rn "documentSearchQueries" src/ tests/` | 13 hits, zero in any mutation |
| `grep -rn "documentQueries.all()" src/` | 1 invalidation call (`categories-settings.tsx:69`) |
| `grep -rn "DocumentItem\|documentItems" src/ tests/` | 3 hits, all in `main-nav.tsx` |
| `grep -rn "/documents/vault" src/ tests/ next.config.ts` | 8 hits; zero marketing |
| `grep -rl "inert"` in `@testing-library/dom/`, `dom-accessibility-api/dist/`, `jsdom/lib/` | zero relevant hits |
| `curl -sSI https://tenantflow.app/documents` | `HTTP/2 307`, `location: /login?redirect=%2Fdocuments`, `cache-control: public, max-age=0, must-revalidate` |
| `cat node_modules/@tanstack/query-core/package.json` | `"version": "5.100.10"` |

### Not used

No WebSearch, Context7, or external documentation lookup was performed. This phase introduces zero
new libraries; every question was answerable from the repository, the installed `node_modules`
tree, and one live production HTTP request. Introducing an external source here would have added
staleness risk without adding information.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Inherited design contract (§I-1..I-13) | **HIGH** | Transcribed verbatim from the approved spec; every structural dependency re-verified against HEAD |
| Standard stack | **HIGH** | Zero new dependencies; every module verified present in the installed tree |
| Architecture patterns | **HIGH** | All four patterns are copied from `/reports`, shipped and reviewed in Phase 56 |
| D-11 mechanism (query-core semantics) | **HIGH** | Verified against the installed 5.100.10 build, not against docs or training data |
| D-12 evidence | **HIGH** | Five entity labels, the drift-guard test, and the SQL ordering all read directly |
| Nav surgery + test breakage (S-01, S-02) | **HIGH** | Full 328-line read of `main-nav.tsx` and full read of its test file; baseline run green |
| `inert` behaviour in the test stack (A4) | **MEDIUM** | Inferred from absence-of-implementation across three packages, not from a positive behavioural test |
| 308 cache stickiness (L-01, A3) | **MEDIUM** | Unauthenticated path verified live; authenticated path unverifiable without a session cookie |
| Vercel edge invalidation (A2) | **LOW** | Standard platform behaviour, not verified for this project |

**Research date:** 2026-08-02
**Valid until:** 2026-09-01 (30 days — no fast-moving external dependency; the only invalidation
risk is another phase editing `main-nav.tsx`, `app-shell.tsx`, `documents-section.tsx`, or
`document-search-keys.ts` before Phase 65 executes)
</content>
</invoke>
