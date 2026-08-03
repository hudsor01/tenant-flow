---
phase: 65-documents-landing
verified: 2026-08-03T18:00:00Z
status: human_needed
score: 11/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Confirm the reversed 308 does not stick in browser/intermediary caches (WR-05 / L-01)"
    expected: "Authenticated GET /documents returns 200 (or the auth redirect to sign-in) with no `location: /documents/vault`, and `Cache-Control` on the response is not cacheable as permanent (ideally `no-store` given `(owner)/layout.tsx`'s `export const dynamic = \"force-dynamic\"`)."
    why_human: "Requires a real authenticated session cookie against a live/preview deploy; cannot be verified via static analysis. A browser that previously followed the old 308 needs a hard-refresh check post-deploy."
  - test: "Visual check of the three-band ladder at desktop and 375px"
    expected: "Band weighting descends correctly (size-12 -> size-10 -> size-8 medallions), Band 3 collapses lg:grid-cols-4 -> sm:grid-cols-2 -> 1 column, and the Empty block's md:py-6 companion actually compacts the empty-state panel at md+ widths."
    why_human: "No visual-regression or axe sweep is registered for /documents; layout/spacing correctness at breakpoints cannot be confirmed by grep or unit tests."
---

# Phase 65: Documents Landing Verification Report

**Phase Goal:** `/documents` stops being a bare redirect and becomes a real landing page — a
navigation surface with entry points to the document vault, the lease template builder, and
the printable templates.

**Verified:** 2026-08-03T18:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 (SC-1) | `/documents` renders a real landing page with entry points to the vault, the lease template builder and the printable templates; the `permanentRedirect` is reversed and the reversal is recorded in-code as superseding the earlier decision | VERIFIED | `src/app/(owner)/documents/page.tsx` is a Server Component (no `permanentRedirect`, no `next/navigation` import, no `"use client"`); its header doc block states "DOCS-01 SUPERSEDES what this file used to be (D-06)" and quotes the superseded rationale ("no plan to bring back a /documents index"). `documents-hub.test.ts` Group C source-scans for 9 forbidden patterns (incl. `permanentRedirect`, `redirect`, `from "next/navigation"`) on comment-stripped source and asserts `toEqual([])`; ran green (52 tests / 2 files). `next build --experimental-build-mode compile` manifest lists `/documents` as its own route, not a redirect target. |
| 2 (SC-2) | `/documents/vault` stays the canonical vault URL — the landing links to it; no sidebar, marketing or deep-link target outside this phase changes | VERIFIED | `grep -rln "/documents/vault"` across `src/` returns only the documents-landing files + their tests, `document-search-keys.ts`, and `breadcrumbs.ts`/its test — `main-nav.tsx` and `app-shell.tsx` no longer reference `/documents/vault` (both repointed to `/documents`, confirmed by direct read). Sidebar's collected `/documents*` href set pinned exactly `["/documents"]` (`main-nav.test.tsx:262`, passing). Palette's set pinned exactly `["/documents", "/documents/lease-template"]` (`app-shell-nav.test.tsx:140`, passing). Sidebar section count still exactly `["Analytics", "Reports"]` (`main-nav.test.tsx:159`, byte-identical to base, passing). `src/lib/routes/private-routes.ts` already listed `/documents` as a private prefix before this phase — no proxy/route-table change was needed or made. |
| 3 (SC-3) | The landing's recent-documents panel reuses the vault's existing query/mapper rather than a second data source, so the two surfaces can never disagree | VERIFIED | `recent-documents-panel.tsx` contains exactly one `useQuery` call in the whole `src/app/(owner)/documents/` tree (excluding the unrelated `templates/components/template-definition.ts`), calling `documentSearchQueries.list({ page: 0 })` with no second argument and no observer overrides — the SAME factory `documents-vault.client.tsx:239` calls, whose default-unfiltered state (all 5 spreads empty, `pageParam` 0) reduces to the identical params object. No `.from("documents")` select, no second mapper, anywhere under the landing. `recent-documents-panel.test.tsx` pins `toEqual({ page: 0 })` over every recorded spy call AND spells out the literal shared queryKey `["documents","search","",null,null,null,null,0]`; both tests pass. |
| 4 | Every one of the six hub hrefs resolves to a route directory that has a `page.tsx` on disk | VERIFIED | `documents-hub.test.ts` Group B `existsSync` assertions pass; independently confirmed on disk: `vault/page.tsx`, `lease-template/page.tsx`, and all four `templates/{slug}/page.tsx` exist; `templates/page.tsx` itself does NOT exist (correctly not linked by any tile). |
| 5 | `page.tsx` is a genuine Server Component — no client directive, hooks, Supabase client, or navigation-redirect import reach the page's own boundary; the review's WR-01 correction (dropped `Separator` import, restated error-boundary claim) is real | VERIFIED | Direct read of `page.tsx`: no `"use client"`, no hook, no Supabase import; the band-rule divider is a plain `<div role="none">`, not `#components/ui/separator` (which is itself `"use client"`); the doc block now states the page's *only* client island is `<RecentDocumentsPanel />` and correctly describes inheriting `(owner)/error.tsx` (confirmed that file exists) rather than the previous false "no error boundary" claim. |
| 6 | The recent-documents panel's 4-state machine does not falsely claim "No documents yet" while the query is pending-but-not-fetching (CR-01), and does not leak a non-string category value from a prototype-polluted slug (WR-02) | VERIFIED | `recent-documents-panel.tsx:222` destructures `isPending` (not `isLoading`) from `useQuery` and branches on it; `documents-vault.client.tsx:238` was fixed identically (both surfaces share one cache entry per SC-3, confirmed by reading both files). `categoryLabel()` uses `Object.hasOwn(CATEGORY_LABELS, slug)` before indexing. Regression tests present and passing: `"shows skeletons, never the empty copy, while pending but not fetching"` and `it.each(["__proto__","constructor"])` in `recent-documents-panel.test.tsx`. |
| 7 | The breadcrumb for the four hyphenated printable-template slugs renders a real label, and the phase does not newly make a 404 (`/documents/templates`) reachable via a live link (CR-02) | VERIFIED | `breadcrumbs.ts` LABEL_MAP gained the 5 entries (`vault`, 4 hyphenated slugs); `NON_ROUTABLE_SEGMENTS = new Set(["templates"])` emits `href: ""` for the `templates` middle crumb instead of a link, confirmed by direct read and by `breadcrumbs.test.ts` asserting `{ href: "", label: "Templates" }` and a source-level guard on `/NON_ROUTABLE_SEGMENTS\s*=\s*new Set\(\["templates"\]\)/`. |
| 8 | Uploading or deleting a document on any of the five detail routes marks the vault-search cache entry (`["documents","search"]`) stale (D-11) | VERIFIED | `documents-section.tsx`'s `invalidateListAndDashboard` contains exactly three `invalidateQueries` calls in order (entity list, `documentSearchQueries.all()`, `ownerDashboardKeys.all`), confirmed by direct read at `:140-159`. Two regression tests (upload path via file-input interaction, delete path via captured `onSuccess`) both assert `toContainEqual(documentSearchQueries.all())` alongside the retained entity-scoped key; both pass. |
| 9 | The sidebar `Documents` entry is a flat `<Link>` at `/documents`; the one-item `Templates` section (interface, array, render block, icon import) is gone | VERIFIED | Direct read of `main-nav.tsx`: `coreItems` has `{ label: "Documents", href: "/documents", icon: FolderArchive }` with no `children`; no `DocumentItem` interface, `documentItems` array, `Templates` render block, or `FileCheck` import remain. `grep -c 'DocumentItem\|documentItems\|FileCheck'` returns 0. |
| 10 | The Cmd+K palette `Documents` row points at `/documents`; the `Templates` group is deliberately kept with its rationale recorded in-source (L-04) | VERIFIED | `app-shell.tsx:101` — `{ label: "Documents", href: "/documents", icon: FolderArchive }`; `:163-181` — `Templates` heading retained, `/documents/lease-template` entry present, comment block records the 3-reason L-04 keep decision. `app-shell-nav.test.tsx` pins the palette's `/documents*` set to exactly `["/documents", "/documents/lease-template"]`; passes. |
| 11 | The sidebar still has exactly two collapsible sections, Analytics and Reports — Documents did not become a third | VERIFIED | `main-nav.test.tsx:159` — `expect(sectionLabels).toEqual(["Analytics", "Reports"])`, unmodified from base and passing; `Documents` renders through `renderNavItem`'s non-children branch as a `<Link>`, confirmed by direct read (no `children` array on the `Documents` entry). |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/(owner)/documents/documents-hub-entries.ts` | 6 entries / 3 bands, `DOCUMENTS_VAULT_ENTRY` exported, re-exports nothing | VERIFIED | Confirmed by direct read: 6 entries, 3 bands in order, 6 distinct icons, no barrel re-export. |
| `src/app/(owner)/documents/document-hub-tile.tsx` | Whole-card `<Link>` tile, 2 size rungs, no client directive | VERIFIED | Confirmed: single `<Link>` wrapping card, `size="md"`/`"sm"` rungs, no hooks. |
| `src/app/(owner)/documents/page.tsx` | RSC landing shell, 3 bands, single primary CTA, D-06 supersession recorded | VERIFIED | Confirmed by direct read (see Truth 1/5 evidence). |
| `src/app/(owner)/documents/recent-documents-panel.tsx` | Single client island, 4-state, shared cache entry | VERIFIED | Confirmed by direct read + passing 13-test suite (`recent-documents-panel.test.tsx`). |
| `src/app/(owner)/documents/__tests__/documents-hub.test.ts` | Composition/purity/SC-2 pins | VERIFIED | 40+ assertions across groups A-D; suite passes. |
| `src/components/documents/documents-section.tsx` | D-11 additional invalidation | VERIFIED | Confirmed at `:140-159`; 3 invalidations in `invalidateListAndDashboard`. |
| `src/components/shell/main-nav.tsx` | Flat Documents entry, no Templates section | VERIFIED | Confirmed by direct read. |
| `src/components/shell/app-shell.tsx` | Cmd+K Documents row repointed, Templates kept w/ rationale | VERIFIED | Confirmed by direct read. |
| `src/lib/breadcrumbs.ts` | 5 new LABEL_MAP entries, `templates` omitted, `NON_ROUTABLE_SEGMENTS` guard | VERIFIED | Confirmed by direct read. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `page.tsx` | `documents-hub-entries.ts` | import of `DOCUMENTS_HUB_ENTRIES`/`BANDS`/`VAULT_ENTRY` | WIRED | Confirmed import + filter usage in `VaultBand`/`BuildBand`/`PrintablesBand`. |
| `page.tsx` | `document-hub-tile.tsx` | `<DocumentHubTile entry={...} size={...} />` | WIRED | 2 usages confirmed (Band 2 `size="md"`, Band 3 `size="sm"`). |
| `page.tsx` | `recent-documents-panel.tsx` | `<RecentDocumentsPanel />` inside Band 1 | WIRED | Confirmed at end of `VaultBand()`; pinned by `documents-hub.test.ts` (`<RecentDocumentsPanel` + `from "./recent-documents-panel"` needles), both passing. |
| `recent-documents-panel.tsx` | `document-search-keys.ts` | `useQuery(documentSearchQueries.list({ page: 0 }))` | WIRED | Confirmed single call site; params pinned by test. |
| `documents-section.tsx` | `["documents","search"]` cache prefix | `queryClient.invalidateQueries(documentSearchQueries.all())` | WIRED | Confirmed inside `invalidateListAndDashboard`; regression-tested for both upload and delete paths. |
| `main-nav.tsx` `coreItems` | `/documents` | flat `NavigationItem` rendered as `<Link>` | WIRED | Confirmed; exhaustive href-set test passes. |
| `app-shell.tsx` `commandGroups` | `/documents` | Cmd+K route table | WIRED | Confirmed; exhaustive href-set test passes. |
| `breadcrumbs.ts` `LABEL_MAP`/`NON_ROUTABLE_SEGMENTS` | 4 template leaf routes + non-navigable `templates` crumb | `generateBreadcrumbs` segment lookup | WIRED | Confirmed; behavioral + source-guard tests pass. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `recent-documents-panel.tsx` | `data` / `rows` | `useQuery(documentSearchQueries.list({ page: 0 }))` → `search_documents` RPC via the shared factory's real `queryFn` | Yes — same factory the vault uses; not a static/empty stub | FLOWING |
| `page.tsx` (VaultBand/BuildBand/PrintablesBand) | `DOCUMENTS_HUB_ENTRIES` / `DOCUMENTS_HUB_BANDS` | Static typed data module (deliberately static — this is navigation-surface data, not user data) | N/A (static by design, not user-scoped) | FLOWING (static-by-design, not a stub: every href independently verified `existsSync` against a real route) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `/documents` is a real route, not a redirect target, in the production build manifest | `SKIP_ENV_VALIDATION=true bunx next build --experimental-build-mode compile` then grep manifest for `documents` | All 6 destinations listed as their own routes (`/documents`, `/documents/vault`, `/documents/lease-template`, `/documents/templates/{4 slugs}`) | PASS |
| Typecheck across all 3 tsconfigs | `bun run typecheck` | exit 0, no output | PASS |
| Lint across all touched dirs | `bunx biome check src/app/(owner)/documents src/components/shell src/lib/breadcrumbs.ts src/components/documents` | "Checked 50 files in 15ms. No fixes applied." | PASS |
| Phase-scoped unit suites | `bun run test:unit -- documents-hub.test.ts recent-documents-panel.test.tsx main-nav.test.tsx app-shell-nav.test.tsx app-shell.test.tsx breadcrumbs.test.ts src/components/documents` | 9 files, 195 tests, all passed | PASS |
| Full unit suite + coverage (repo-wide gate) | `bun run test:unit -- --coverage` | 310 files / 106,413 tests passed | PASS |
| Working tree clean after build (next-env.d.ts not left dirty) | `git checkout -- next-env.d.ts; git status --short` | Only pre-existing untracked `.agents/`, `.github/instructions/`, `skills-lock.json` (unrelated to this phase) remain | PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` probes exist for this phase and none are declared in the PLAN/SUMMARY files. Step 7c: SKIPPED (no probes declared or discovered).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| DOCS-01 | 65-01, 65-02, 65-03 (all three declare it) | `/documents` renders a real landing page (vault + lease template builder + printable templates entry points) instead of a bare redirect | SATISFIED | All 3 roadmap Success Criteria verified TRUE (see Truths 1-3); REQUIREMENTS.md still shows DOCS-01 as "Pending" at line 189 — consistent with this repo's established pattern of marking requirements Complete only after production verification (see RPTHUB-01..04's precedent, which stayed unchecked through its own phase-completion and was marked Complete separately after live verification). Not a gap. |

No orphaned requirements: `grep -n "Phase 65" REQUIREMENTS.md` shows only DOCS-01 mapped to this phase, and all 3 plans declare it.

### Anti-Patterns Found

None. Scanned all 8 phase-modified source files (`documents-hub-entries.ts`, `document-hub-tile.tsx`, `page.tsx`, `recent-documents-panel.tsx`, `documents-section.tsx`, `main-nav.tsx`, `app-shell.tsx`, `breadcrumbs.ts`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` and "coming soon"/"not yet implemented" phrasing — zero hits. No commented-out dead code (CLAUDE.md ZT-4 compliance confirmed by direct read, matching the plan's explicit instruction to delete rather than comment out the old redirect and the old Templates section).

### Recorded Deferrals (not gaps — explicit review resolution, confirmed by direct read of the review log)

These two review Warnings were deliberately deferred by the orchestrator as decisions requiring a human call, not left unaddressed by oversight. Neither blocks any of the three roadmap Success Criteria:

| ID | Finding | Why deferred | Where recorded |
|----|---------|---------------|-----------------|
| WR-03 | The `["documents","search",…]` cache entry carries up to 50 one-hour Storage signed URLs and persists to IndexedDB for 24h, surviving sign-out. Pre-existing in the vault; Phase 65 widens *who* triggers the mint (every Documents-section visitor, not only vault visitors). | Both remedies (exclude the namespace from persistence, or clear the persisted client on sign-out) trade something real and the second is a cross-cutting auth change belonging in its own phase — the orchestrator's own resolution log states this explicitly. | `65-REVIEW.md` resolution log, "WR-03 — deferred, requires a decision" |
| WR-04 | `main-nav.tsx`'s `coreItems` and `app-shell.tsx`'s `commandGroups[0].items` are two hand-maintained tables with no cross-table assertion that they agree; a future addition to one could silently miss the other with a green suite. | The fix (extract a shared `CORE_NAV_ITEMS` module) touches shell components beyond DOCS-01's scope. | `65-REVIEW.md` resolution log, "WR-04 — deferred, cross-cutting refactor" |

Both fixed findings (CR-01, CR-02, WR-01, WR-02) were independently re-verified in this pass by reading the current source and re-running their regression tests — not accepted on the review's or SUMMARY's word alone.

### Human Verification Required

### 1. The reversed 308 does not stick in caches (WR-05)

**Test:** Post-deploy, `curl -sSI` an authenticated request to `/documents` (or hard-refresh from a browser that previously followed the old 308 to `/documents/vault`) and inspect `HTTP` status + `Cache-Control` + `location` headers.
**Expected:** `HTTP/2 200` (or the sign-in redirect), no `location: /documents/vault`, and ideally `Cache-Control` is not permanently cacheable (ADR: `(owner)/layout.tsx` sets `export const dynamic = "force-dynamic"`, which normally yields `no-store`).
**Why human:** Requires a real authenticated session cookie against a live/preview deploy — the unauthenticated path only exercises the proxy's 307 to `/login`, not the page's former 308. This was already flagged by the review (WR-05) and separately by both 65-01 and 65-02 plans as a manual, non-automatable check.

### 2. Three-band ladder visual check at desktop and 375px

**Test:** On a preview deploy, signed in, view `/documents` at desktop width and at 375px.
**Expected:** Band weighting descends correctly (medallion rungs `size-12` → `size-10` → `size-8`), Band 3 collapses `lg:grid-cols-4` → `sm:grid-cols-2` → 1 column at narrower widths, and the `Empty` block's `md:py-6` companion class actually compacts the empty-state panel at `md` and above (its base class carries `md:p-12`, which `py-6` alone does not override per Tailwind-merge behavior).
**Expected outcome if broken:** A layout that either doesn't step down in visual weight across bands, doesn't collapse the printable-forms grid at narrow widths, or renders an oversized empty-state panel.
**Why human:** No visual-regression or axe sweep is registered for `/documents`; this is a rendering/spacing property that unit tests (jsdom) cannot observe.

### Gaps Summary

No gaps. All three ROADMAP Success Criteria and all eight plan-level must-have truths were independently verified against the current codebase (not accepted from SUMMARY.md claims): the redirect reversal is real and recorded in-code, the vault stays canonical with no unintended nav/breadcrumb drift, and the recent-documents panel is proven — by direct source reading, by its own test suite, and by the shared-cache-key literal — to read the exact same TanStack Query cache entry as the vault, with no second query, mapper, or `.from("documents")` select anywhere in the landing's code path. Two review-confirmed blockers (CR-01 pending-state false-empty, CR-02 breadcrumb-to-404 link) and two warnings (WR-01 false doc-block invariants, WR-02 prototype-pollution fallback) were fixed post-review and are independently re-verified here as present and regression-tested, not merely claimed. Two further warnings (WR-03 signed-URL persistence surface, WR-04 nav-table duplication) were deliberately deferred by the orchestrator with recorded rationale and do not block any of the three roadmap Success Criteria.

Status is `human_needed` rather than `passed` solely because two manual/visual checks — both already anticipated and documented by the executing plans themselves — cannot be verified by static analysis and require a live/preview deployment.

---

_Verified: 2026-08-03T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
