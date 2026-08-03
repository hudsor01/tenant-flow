---
phase: 65-documents-landing
plan: 01
subsystem: ui
tags: [next.js, react-server-components, app-router, lucide-react, vitest, tailwind]

# Dependency graph
requires:
  - phase: 56-reporting-hub-documents-landing
    provides: "The /reports hub shape this plan deliberately copies — reports-hub-entries.ts, report-hub-tile.tsx, the RSC page shell, the stripComments source-scan test pattern, and REPORTING_REDIRECTS (the SC-2 guard's subject)."
provides:
  - "/documents is a real landing page instead of a 308 to /documents/vault"
  - "DOCUMENTS_HUB_ENTRIES (6) / DOCUMENTS_HUB_BANDS (3) / DOCUMENTS_VAULT_ENTRY — the typed hub directory plan 65-02 and 65-03 read from"
  - "DocumentHubTile — whole-card Link tile at two size rungs (md, sm)"
  - "The Band 1 vault panel with the page's single primary CTA, and the marked insertion point for 65-02's Separator + RecentDocumentsPanel"
  - "documents-hub.test.ts — 38 assertions pinning composition, RSC purity and the SC-2 no-new-redirect invariant"
affects: [65-02, 65-03, documents, navigation, reporting-redirects]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route-colocated typed hub directory + one presentational tile + RSC page that filters by band (mirrors /reports)"
    - "Comment-stripped source scan as the enforcement of Server-Component purity, with forbidden patterns PAIRED against required positives so the group cannot pass on an empty file"
    - "bandById() that throws, instead of ! or `as`, to satisfy noUncheckedIndexedAccess"

key-files:
  created:
    - "src/app/(owner)/documents/documents-hub-entries.ts"
    - "src/app/(owner)/documents/document-hub-tile.tsx"
    - "src/app/(owner)/documents/__tests__/documents-hub.test.ts"
  modified:
    - "src/app/(owner)/documents/page.tsx"

key-decisions:
  - "metadata.description references the PAGE_SUBTITLE module const — verified against a real next build, no inlining needed"
  - "Band sections extracted into three module-local components (VaultBand/BuildBand/PrintablesBand) to hold every function under CLAUDE.md's 50-line limit; rendered structure and order are unchanged"
  - "DocumentHubTile's return type is left inferred rather than annotated React.JSX.Element — the inferred type is identical and the repo has zero explicit JSX return annotations"
  - "The 65-02 insertion point is a JSX comment at the end of the Band 1 section, so the Separator spans the panel's full width per the I-1 ASCII"

patterns-established:
  - "Pattern 1: paired positive/negative source scan — every forbidden-pattern assertion ships with a required-substring assertion on the same stripped source, plus a length self-check, so the suite cannot go vacuous"
  - "Pattern 2: reference-identity pinning — DOCUMENTS_VAULT_ENTRY is asserted by toContain (identity) AND by filter equality, because the filter alone passes on a structural clone that would render the vault twice"
  - "Pattern 3: existsSync on every hub href's page.tsx — dead doors that read as shipped features fail the suite"

requirements-completed: [DOCS-01]

# Metrics
duration: 27min
completed: 2026-08-03
---

# Phase 65 Plan 01: Documents Landing (Static Half) Summary

**`/documents` stops 308-ing to the vault and becomes a Server-Component landing: a typed 6-entry / 3-band hub directory, a two-rung tile, an RSC page whose single primary CTA is "Open the vault", and a 38-assertion suite pinning composition, purity and the no-new-redirect invariant.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-08-03T13:36:00Z
- **Completed:** 2026-08-03T14:03:46Z
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 rewritten)

## Accomplishments

- Reversed the `/documents` permanent redirect. The route now appears in the build manifest as a real page (`"/documents"` in `.next/app-path-routes-manifest.json`) alongside all six of its destinations.
- Shipped the hub directory as data, not markup: `page.tsx` filters `DOCUMENTS_HUB_ENTRIES` by band and hand-lists nothing, so there is exactly one place a tile can be added or reworded.
- Six visually distinct lucide icons, pinned by a set-cardinality assertion — the four printable templates all ship `FileText` today, and that collision is now a test failure rather than a design regression.
- Every one of the six hrefs is asserted to have a `page.tsx` on disk. This is what refuses `/documents/templates`, which holds only a `components/` directory and 404s in production.
- SC-2 held: `REPORTING_REDIRECTS` is untouched at 7 entries with no `/documents` source or destination, and `git diff --stat package.json bun.lock` is empty.

## Task Commits

Each task was committed atomically:

1. **Task 1: Hub entries data module + tile component** — `27601ef8c` (feat)
2. **Task 2: Replace the redirect with the RSC landing page** — `8ba898f3f` (feat)
3. **Task 3: Pin composition, RSC purity and the SC-2 redirect guard** — `b9483c191` (test)

## Files Created/Modified

- `src/app/(owner)/documents/documents-hub-entries.ts` — 6 entries in 3 bands, `DOCUMENTS_VAULT_ENTRY` exported separately and reused by reference as element 0. **Re-exports nothing** (see ZT-2 confirmation below).
- `src/app/(owner)/documents/document-hub-tile.tsx` — whole-card `<Link>` tile, `size="md"` (p-5 / size-10 medallion) and `size="sm"` (p-4 / size-8). Neutral `bg-muted` medallion, badge dropped, no client directive.
- `src/app/(owner)/documents/page.tsx` — RSC landing. Three `<section aria-labelledby>` bands, one `<h1>`, one `<Button>`, one `bg-primary/10`. 164 lines.
- `src/app/(owner)/documents/__tests__/documents-hub.test.ts` — 38 assertions in four groups (directory pins, band pins, href reachability, purity + SC-2) plus a 9-case detector self-test.

## Decisions Made

**1. `metadata.description` keeps the const reference — verified, not assumed.**
The plan allowed inlining the literal if `next build` rejected a non-static metadata reference. It did not.
`SKIP_ENV_VALIDATION=true bunx next build --experimental-build-mode compile` completed successfully with:

```ts
const PAGE_SUBTITLE =
	"Your document vault, the lease builder, and printable forms.";

export const metadata: Metadata = {
	title: "Documents",
	description: PAGE_SUBTITLE,
};
```

**The const-reference form is what shipped.** No inlining was needed, so the meta description and the visible `<p>` cannot drift. The build left the tree clean — `next-env.d.ts` was not rewritten, so the `git checkout --` the plan warned about was unnecessary.

**2. ZT-2 confirmation: `documents-hub-entries.ts` re-exports nothing.**
It has exactly six exports, and all six are its own declarations: `DocumentsHubBandId` (type alias), `DocumentsHubEntry` (interface), `DocumentsHubBand` (interface), `DOCUMENTS_VAULT_ENTRY`, `DOCUMENTS_HUB_BANDS`, `DOCUMENTS_HUB_ENTRIES`. There is no `export { … } from`, no `export *`, and no re-export of the lucide icons it imports. It is a route-colocated data module, not a barrel file.

**3. `DocumentHubTile`'s return type is inferred, not annotated.**
The `<interfaces>` contract wrote it as `: React.JSX.Element`. The repo has **zero** occurrences of that annotation, and adding one requires importing the `React` namespace (UMD global access is not permitted in a module). The inferred return type is exactly `React.JSX.Element`, so the contract is satisfied structurally while matching the shipped `ReportHubTile` verbatim.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - CLAUDE.md constraint] Band sections extracted into module-local components**
- **Found during:** Task 2 (RSC landing page)
- **Issue:** The plan described `DocumentsPage()` returning one `<div>` with the header and all three bands inline. That body measures roughly 60 lines of JSX, breaching CLAUDE.md's "max 50 lines per function". CLAUDE.md is a hard constraint and takes precedence over the plan's literal shape.
- **Fix:** The three bands became module-local components in the same file — `VaultBand()`, `BuildBand()`, `PrintablesBand()` — composed by `DocumentsPage()` in the plan's specified order. Rendered DOM, class strings, heading ids, band order and the single-CTA/single-accent budget are all unchanged; only the function boundaries moved. Every function is now well under 50 lines and the file is 164 lines (limit 300).
- **Files modified:** `src/app/(owner)/documents/page.tsx`
- **Verification:** `grep -c` confirms exactly one `<h1`, one `<Button`, one `bg-primary/10` and three `<section` in the file; the Group C positives (`export default function`, `<h1`, `from "./documents-hub-entries"`, `<DocumentHubTile`, `Open the vault`) all still match on comment-stripped source.
- **Committed in:** `8ba898f3f` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1× Rule 2 — CLAUDE.md precedence).
**Impact on plan:** None on behaviour or contract. No scope creep; nothing was added or removed from the rendered page.

## Issues Encountered

**Worktree cold-start test flake (environment, not code).**
The first pre-commit run of Task 1 reported 826 failures across 124 test files, every one `Invalid Chai property: toBeInTheDocument`, in files this plan does not touch. Root cause: lefthook runs pre-commit commands **in parallel**, and in a freshly created worktree `lockfile-verify` (`bun install --frozen-lockfile`) was doing a real cold install into `node_modules` while `unit-tests` was concurrently resolving `@testing-library/jest-dom/vitest` out of it. The matcher registration lost the race.

Diagnosed rather than worked around: the same file passed in isolation, and an immediate re-run of the full suite with coverage passed **308/308 files, 106206/106206 tests**. Every subsequent commit passed the hook first time (the install is a no-op once `node_modules` is populated). No code change was made and none is warranted — this is a one-time cost of a cold worktree, not a repo defect. Worth knowing for other parallel executors on their first commit.

## Verification Evidence

| Check | Result |
|---|---|
| `bun run typecheck` (3 tsconfigs) | green |
| `bunx biome check "src/app/(owner)/documents"` | 29 files, clean |
| `bun run test:unit -- "…/documents-hub.test.ts"` | 38 passed |
| Full unit suite + coverage (pre-commit, ×3) | 308 files / 106206 tests passed |
| `SKIP_ENV_VALIDATION=true bunx next build --experimental-build-mode compile` | succeeded; `/documents` present in the app-path manifest |
| `git diff --stat package.json bun.lock` | empty — zero new dependencies |

**Mutation-tested — every pin was proven to fail on the thing it guards:**

| Mutation | Result |
|---|---|
| Both `<DocumentHubTile` usages renamed in `page.tsx` | FAIL — "still composes the hub: contains &lt;DocumentHubTile" |
| `"use client"` added to `page.tsx` | FAIL — "carries no client directive, hook, database client or navigation redirect" |
| `tenant-notice` href repointed to `/documents/templates` | FAIL — "tenant-notice -> /documents/templates has a page.tsx on disk" |

Each mutation was reverted with `git checkout -- <file>` and the suite returned to 38/38.

## User Setup Required

None — no external service configuration required. Zero packages installed (`git diff --stat package.json bun.lock` empty), so no package-legitimacy checkpoint applied.

## Next Phase Readiness

**Ready for plan 65-02.** The insertion point is explicit: a JSX comment at the end of the Band 1 `<section>` in `page.tsx`, positioned so the `<Separator />` spans the panel's full width per the I-1 ASCII. 65-02 needs to:

- Add `<Separator />` + `<RecentDocumentsPanel />` at that comment, replacing it.
- Add the `<RecentDocumentsPanel` composition pin to `HUB_INDEX_REQUIRED` in `documents-hub.test.ts` — the array is already the single place that list is declared. The header doc block records that this assertion is deliberately absent today.
- Note that `HUB_INDEX_FORBIDDEN` bans `useQuery`/`useState`/`useEffect` **on `page.tsx` only**; the island is a separate file and is unaffected.

**No blockers.** `/documents/vault` is untouched and remains canonical. Nav and Cmd+K changes (A-1, D-09) are not in this plan's scope and remain open for their own plan.

## Known Stubs

None. Every tile links to a route with a `page.tsx` on disk (asserted), and the page has no placeholder copy, no empty-array data source, and no TODO markers. The recent-documents list is not stubbed — it is simply absent, by explicit plan scope, with its insertion point marked for 65-02.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change was introduced. `/documents` already existed inside the `(owner)` group and is already covered by `PRIVATE_ROUTE_PREFIXES` in `src/proxy.ts`; no proxy or config file was modified. T-65-09 (information disclosure) is mitigated as planned — the page has zero data dependencies, enforced by the Group C scan.

## Self-Check: PASSED

- All 4 source files claimed above exist on disk.
- All 4 commit hashes (`27601ef8c`, `8ba898f3f`, `b9483c191`, `f7d4520da`) are present in the branch history.
- ZT-2 re-verified by listing every `export` in `documents-hub-entries.ts`: 6 exports, all own declarations, zero `export * from` / `export { … } from`.

---
*Phase: 65-documents-landing*
*Completed: 2026-08-03*
