---
phase: 65-documents-landing
plan: 02
subsystem: ui
tags: [react, tanstack-query, client-island, vitest, tailwind, cache-invalidation]

# Dependency graph
requires:
  - phase: 65-documents-landing
    plan: 01
    provides: "The RSC landing page, its Band 1 vault panel (VaultBand), and the marked insertion point at the end of that section."
  - phase: 60-63
    provides: "documentSearchQueries — the search_documents RPC factory, its mapDocumentRow boundary, and the 45min/55min stale/gc pair tied to the 1-hour signed-URL TTL."
provides:
  - "RecentDocumentsPanel — the phase's single 'use client' island, four states, reading the vault's own cache entry"
  - "The D-11 freshness guarantee: uploading or deleting a document on any of the five detail routes marks ['documents','search'] stale"
  - "Two regression tests pinning BOTH mutation paths (upload and delete) against BOTH keys"
affects: [documents, documents-vault, documents-section, 65-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared-cache preview: a second surface reuses an existing queryOptions factory with byte-identical params rather than fetching its own data, and the params are pinned with toEqual so drift is a test failure"
    - "Branch components (RecentSkeletons/RecentError/RecentEmpty/RecentList) to hold the island's render function under CLAUDE.md's 50-line cap"
    - "Callback capture in a useMutation mock to exercise an onSuccess path the mock previously dropped"

key-files:
  created:
    - "src/app/(owner)/documents/recent-documents-panel.tsx"
    - "src/app/(owner)/documents/__tests__/recent-documents-panel.test.tsx"
  modified:
    - "src/app/(owner)/documents/page.tsx"
    - "src/app/(owner)/documents/__tests__/documents-hub.test.ts"
    - "src/components/documents/documents-section.tsx"
    - "src/components/documents/__tests__/documents-section.test.tsx"

key-decisions:
  - "The RED test and the GREEN implementation ship in ONE commit: lefthook pre-commit runs a full typecheck plus unit suite, so a red tree cannot be committed while hooks are honoured, and hooks are never bypassed in this repo"
  - "Retry keeps variant=ghost per 65-UI-SPEC I-3, diverging from both shipped Retry siblings which use variant=outline — deliberate, commented inline"
  - "The island's render function is composed of four branch components rather than inline JSX, matching the VaultBand/BuildBand/PrintablesBand precedent plan 65-01 established for the same 50-line reason"
  - "invalidateQueries uses the NARROW ['documents','search'] key, not the broad ['documents'] prefix the categories-settings precedent uses"

patterns-established:
  - "Pattern 1: pin shared-cache params with toEqual over EVERY recorded spy call, never a call count — React may render more than once, so the count is brittle but every argument is the actual contract"
  - "Pattern 2: pair every absence assertion with a populated-tree assertion in the same test, so a selector that stops matching cannot pass vacuously"
  - "Pattern 3: assert BOTH the new key and the retained key on an additive invalidation, so the test fails in both directions"

requirements-completed: [DOCS-01]

# Metrics
duration: 22min
completed: 2026-08-03
---

# Phase 65 Plan 02: Recent Documents Island Summary

**The `/documents` Band 1 vault panel now carries a live "Recently added" preview that reads the vault's own TanStack Query cache entry rather than a second data source, and uploading or deleting a document anywhere in the app marks that entry stale — so the word "Recently" is a claim the code actually keeps.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-08-03T09:12:00Z
- **Completed:** 2026-08-03T09:34:00Z
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- Shipped the phase's single `'use client'` island. It makes exactly one `useQuery` call, its sole argument is `documentSearchQueries.list({ page: 0 })`, and it passes no second argument and no observer overrides — which is the entirety of the SC-3 "the two surfaces cannot disagree" guarantee, now enforced by a test rather than asserted in prose.
- Closed the freshness gap the plan called out as non-optional. Sharing a cache entry makes the landing and the vault **agree**; it does not make either **fresh**. Before this plan, an upload or delete on any of the five detail routes left "Recently added" showing pre-upload rows for the full 45-minute `LIST_STALE_TIME_MS` window.
- Rows render as inert previews: zero `<a>`, zero `<button>`, zero `href` inside any `<li>`. The shared cache entry carries live 1-hour signed URLs for up to 50 documents and the landing renders **none** of them — strictly less file-access surface than the vault.
- Every load-bearing pin was mutation-tested and proven to fail on the exact thing it guards (five mutations, table below). None of them passed by construction.
- Zero packages installed; `git diff --stat package.json bun.lock` is empty.

## Task Commits

Each task was committed atomically:

1. **Task 1 + 2a: The island, test-first** — `88eb78e2e` (feat)
2. **Task 2b: Band 1 wiring + composition pin** — `5ccb395ad` (feat)
3. **Task 3: D-11 search-key invalidation** — `05cab8406` (fix)

## Files Created/Modified

- `src/app/(owner)/documents/recent-documents-panel.tsx` — 226 lines. One `useQuery`, four states, four branch components. Header doc block records why a second query/mapper/`.from("documents")` select is a blocking violation and why no observer option may be passed at the call site.
- `src/app/(owner)/documents/__tests__/recent-documents-panel.test.tsx` — 9 tests across three describe blocks: the shared-cache guarantee, the four states, the success state.
- `src/app/(owner)/documents/page.tsx` — gained `<Separator className="mt-6" />` + `<RecentDocumentsPanel />` and the two imports. Still no `"use client"`, no hook, no Supabase import.
- `src/app/(owner)/documents/__tests__/documents-hub.test.ts` — 38 → **40** assertions; the two new needles are the island's usage and its import.
- `src/components/documents/documents-section.tsx` — one import, one `invalidateQueries` call, 19 lines net (16 of them the comment explaining the narrow-key choice).
- `src/components/documents/__tests__/documents-section.test.tsx` — 53 → **55** cases in the `src/components/documents` scope.

## Decisions Made

**1. The RED test and the GREEN implementation ship in one commit.**

This is the plan's one structural deviation and it is worth stating plainly. Task 1 was executed as a genuine RED step — the test was authored first, run first, and failed first, on exactly the intended cause:

```
Error: Failed to resolve import "../recent-documents-panel" from
"src/app/(owner)/documents/__tests__/recent-documents-panel.test.tsx". Does the file exist?
```

Every other import in the file resolved. It was not a typo, not a syntax error, not a bad import of an existing module.

It could not be **committed** in that state. `lefthook.yml` runs `bun run typecheck` and `CI=true bun run test:unit -- --coverage` as pre-commit commands over the whole repo, so any red tree fails the hook, and this repo forbids bypassing hooks by any means. `bun run typecheck` on the RED tree failed with the same single error (`TS2307: Cannot find module '../recent-documents-panel'`). The RED signal was therefore **obtained and verified** but folded into the implementation commit rather than lost or faked.

**2. `variant="ghost"` on Retry — deliberate divergence, flagged inline (L-13).**

65-UI-SPEC §I-3 pins `Button variant="ghost" size="sm"` for the panel's Retry. Both shipped siblings disagree:

| Surface | Variant | Label |
|---|---|---|
| `documents-vault.client.tsx:499-507` | `outline` | `Try again` |
| `notification-popover-list.tsx:82-84` | `outline` | `Retry` |
| **This panel** | **`ghost`** | **`Retry`** |

The spec shipped. An inline comment records the divergence as deliberate so it does not read as a copy error in review, with the reason: this panel sits inside the vault card, 24px under the page's only filled primary button, and an outlined control there would compete with the CTA the whole band exists to promote.

**3. `LIST_STALE_TIME_MS` / `LIST_GC_TIME_MS` were NOT touched.**

Confirmed by an empty diff: `git diff <base>..HEAD -- src/hooks/api/query-keys/document-search-keys.ts` produces no output. The file is byte-identical to the wave-1 base. The 45-minute stale / 55-minute gc pair is still `45 * 60 * 1000` and `55 * 60 * 1000` at lines 26-27 and still applied at lines 193-194. Commit `757c271d3` records that this pair is chosen against the 1-hour signed-URL TTL; raising it past ~55 minutes would let the cache serve expired URLs. The island reaches the entry without altering it.

**4. The narrow search key, not the broad documents prefix.**

`categories-settings.tsx:62-69` is the house precedent and its comment names the `["documents","search",…]` prefix — but its actual call is `documentQueries.all()`, the broad `["documents"]` key. The broad key was rejected here: it would duplicate the entity-scoped invalidation on the line directly above **and** invalidate every other entity's document list, which an upload to this property does not affect.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The RED commit could not exist; the test folded into the GREEN commit**

- **Found during:** Task 1 commit
- **Issue:** `lefthook.yml` pre-commit runs full `typecheck` + full `test:unit --coverage`. A test file importing a not-yet-written module fails both. The plan's Task 1 `<done>` criteria describes committing a red tree, which is impossible here without bypassing hooks — absolutely forbidden by project policy.
- **Fix:** RED was executed and verified (output quoted above), then the test and the component were committed together as `88eb78e2e`. Task 2's remaining work (page wiring + hub pin) stayed a separate commit, so the plan still produced three atomic commits.
- **Files modified:** none beyond plan scope
- **Commit:** `88eb78e2e`

**2. [Rule 2 - CLAUDE.md constraint] The island's render split into four branch components**

- **Found during:** Task 2
- **Issue:** The plan describes `RecentDocumentsPanel` returning one root `<div>` with all four state branches inline. That body measures well over CLAUDE.md's "max 50 lines per function". CLAUDE.md is a hard constraint and takes precedence over the plan's literal shape.
- **Fix:** The branches became module-local components in the same file — `RecentSkeletons()`, `RecentError()`, `RecentEmpty()`, `RecentList()` — composed by a short ternary chain. This is the same resolution plan 65-01 applied to `page.tsx` (VaultBand/BuildBand/PrintablesBand), so the file reads consistently with its sibling. Rendered DOM, class strings, state order and the single-link budget are all unchanged; only the function boundaries moved.
- **Files modified:** `src/app/(owner)/documents/recent-documents-panel.tsx`
- **Commit:** `88eb78e2e`

**3. [Rule 3 - Blocking] `vi.spyOn` generic form did not typecheck**

- **Found during:** Task 3
- **Issue:** The natural spelling of the test helper's parameter type, `ReturnType<typeof vi.spyOn<QueryClient, "invalidateQueries">>`, fails with `TS2344: Type '"invalidateQueries"' does not satisfy the constraint 'never'` — `invalidateQueries` is generic, which breaks that constraint form.
- **Fix:** The helper takes the calls array directly (`calls: readonly (readonly unknown[])[]`) and casts each first argument to `{ queryKey?: unknown } | undefined`. One plain `as` from `unknown`, no `as unknown as` (ZT-8 respected).
- **Files modified:** `src/components/documents/__tests__/documents-section.test.tsx`
- **Commit:** `05cab8406`

**4. [Rule 1 - Formatting] Biome reflowed one line in the test mock**

- **Found during:** Task 3
- **Issue:** The captured-callback assignment exceeded the print width; `biome check` failed on formatting only.
- **Fix:** `bunx biome check --write src/components/documents`. Suite re-run green afterwards.
- **Commit:** `05cab8406`

---

**Total deviations:** 4 auto-fixed (2× Rule 3, 1× Rule 2, 1× Rule 1).
**Impact on plan:** None on behaviour or contract. Every success criterion is met; no scope was added or removed.

## Verification Evidence

| Check | Result |
|---|---|
| `bun run typecheck` (3 tsconfigs) | green |
| `bunx biome check "src/app/(owner)/documents"` | 31 files, clean |
| `bunx biome check src/components/documents` | 7 files, clean |
| `bun run test:unit -- "…/recent-documents-panel.test.tsx"` | **9 passed** |
| `bun run test:unit -- "…/documents-hub.test.ts"` | **40 passed** (38 baseline + 2) |
| `bun run test:unit -- src/components/documents` | **55 passed** (53 baseline + 2) |
| `bun run validate:quick` | **310 files / 106,406 tests passed** |
| Full unit suite + coverage (pre-commit, ×3) | passed on all three commits |
| `SKIP_ENV_VALIDATION=true bunx next build --experimental-build-mode compile` | succeeded; `/documents` present in the app-path manifest with all six destinations |
| `git status --short` after build | clean — `next-env.d.ts` was not rewritten |
| `git diff --stat package.json bun.lock` | **empty** — zero new dependencies |

**The 53-case baseline was verified by running it, not assumed.** `bun run test:unit -- src/components/documents` returned exactly 53 before Task 3 and 55 after — confirming the plan's warning that the 89 figure in `65-RESEARCH.md` is a broader scope that also sweeps in `app-shell.test.tsx` and `app-shell-nav.test.tsx`.

**Mutation-tested — every load-bearing pin was proven to fail on the thing it guards:**

| Mutation | Expected | Result |
|---|---|---|
| `list({ page: 0 })` → `list({ page: 0, entityType: "property" })` | SC-3 params pin fails | FAIL — `expected { page: +0, entityType: 'property' } to deeply equal { page: +0 }` |
| Delete BOTH the `<RecentDocumentsPanel />` usage and its import from `page.tsx` | both composition needles fail | FAIL ×2 — and critically the doc block's prose mention did **not** satisfy the usage needle, proving `stripComments` is load-bearing |
| Remove `invalidateQueries({ queryKey: documentSearchQueries.all() })` | both D-11 tests fail | FAIL ×2 |
| Remove the entity-scoped `documentQueries.list(...)` invalidation | both D-11 tests fail (additive proof) | FAIL ×2 |
| Remove `onSuccess: invalidateListAndDashboard` from `deleteMutation` | delete test only fails | FAIL ×1 — upload test correctly still passed, confirming the pin is precise and not merely coincidental |

Each mutation was reverted and the suites returned to green.

**`invalidateListAndDashboard` body read directly, not grepped** (the whole file carries a fourth `invalidateQueries` at the `usageQueries.storage()` site in `handleFilesSelected`). The function contains exactly three calls in order — entity list, search, dashboard — and its `useCallback` deps array is byte-identical to before at `[queryClient, entityType, entityId]`.

## Manual Verification — carried into `65-VERIFICATION.md`

Reproduced verbatim from the plan. Neither can be run here: `bun run dev` cannot start locally because `.env.local` is missing app vars and must never be created or edited.

| Check | Why manual | Instructions |
|-------|-----------|--------------|
| The reversed 308 does not stick in browser caches (L-01) | Needs a real authenticated session cookie; the unauthenticated path returns the proxy's 307, not the page's 308 | Pre-deploy: `curl -sSI` the authenticated `/documents` and read `Cache-Control`. If it is `max-age=0, must-revalidate` the risk is closed. Post-deploy: hard-refresh from a browser that previously followed the 308 to `/documents/vault`. |
| Three-band ladder at desktop and 375px | No visual-regression or axe sweep is registered for `/documents` | On a preview deploy, signed in: check band weighting, the medallion rungs `size-12` → `size-10` → `size-8`, that Band 3 collapses `lg:grid-cols-4` → `sm:grid-cols-2` → 1, and that `Empty`'s `md:py-6` companion actually compacts the panel at `md+` (L-07 — `py-6` alone does NOT remove the primitive's base `md:p-12`). |

## Issues Encountered

**Cold-worktree pre-commit flake, confirmed and self-resolving.** The first commit attempt reported hundreds of `Invalid Chai property: toBeInTheDocument` failures in files this plan does not touch — the documented lefthook `parallel: true` race between `lockfile-verify`'s install and `unit-tests` resolving `@testing-library/jest-dom/vitest`. That same run **also** carried a real `typecheck` failure (the RED module-resolution error), so the two were separated by running `bun run typecheck` and `bun run test:unit` directly rather than by retrying blind. Once the component existed, all three commits passed the hook first time with no retry. No code change was made for the flake and none is warranted.

## User Setup Required

None — no external service configuration required. Zero packages installed, so no package-legitimacy checkpoint applied.

## Next Phase Readiness

**Ready.** `/documents/vault` is untouched and remains canonical; `documents-vault.test.tsx:209-219`, the vault's five-entity drift guard, still passes because the landing's empty title (`No documents yet`) is a different string from the vault's (`No documents uploaded yet.`) and that guard matches `/no documents uploaded yet/i`.

Two notes for whoever picks up the phase's remaining work:

- The nav and Cmd+K changes (A-1, D-09) are still open and were never in this plan's scope.
- The island is the phase's **only** client boundary. `page.tsx`'s purity scan (`HUB_INDEX_FORBIDDEN`) bans `useQuery`/`useState`/`useEffect` on `page.tsx` alone; a second island would need its own justification against D-04.

## Known Stubs

None. The panel is wired to real data through the vault's own factory, renders four real states, and contains no placeholder copy, no hardcoded empty array feeding the UI, and no TODO markers.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change was introduced. The island reads an RPC that already existed through a factory that already existed; it opens no new trust boundary and, by rendering no `signed_url`, strictly reduces file-access surface relative to the vault. All seven registered threats in the plan's STRIDE register are mitigated as planned:

| Threat ID | Status | Evidence |
|---|---|---|
| T-65-01 | mitigated | D-11 invalidation + 2 mutation-tested regression tests |
| T-65-02 | mitigated | `toEqual({ page: 0 })` params pin over every recorded call; no new factory, mapper or `.from("documents")` select in any modified file |
| T-65-03 | mitigated | `li a, li button` length 0 and `li [href]` length 0, paired with a length-5 populated-tree assertion |
| T-65-05 | mitigated | injection-title test: `container.querySelector("img")` is null, payload renders as text |
| T-65-06 | mitigated | error test asserts `PGRST116` absent from `container.textContent` |
| T-65-12 | mitigated | single `useQuery` call verified by `grep -c`; no second argument, no observer override |
| T-65-SC | mitigated | `git diff --stat package.json bun.lock` empty |

## Self-Check: PASSED

- Both created files exist on disk at the paths claimed.
- All four modified files exist and carry the claimed changes.
- All three commit hashes (`88eb78e2e`, `5ccb395ad`, `05cab8406`) are present in the branch history.
- `document-search-keys.ts` re-verified as byte-identical to the wave-1 base via an empty `git diff`.

---
*Phase: 65-documents-landing*
*Completed: 2026-08-03*
