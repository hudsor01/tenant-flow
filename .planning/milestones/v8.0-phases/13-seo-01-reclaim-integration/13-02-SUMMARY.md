---
phase: 13-seo-01-reclaim-integration
plan: 02
subsystem: seo
tags: [seo, reclaim, blog-redirects, collision-guard, codemod, vitest]

# Dependency graph
requires:
  - phase: 13-01
    provides: "RECLAIM_QUEUE const (the 10 reclaimable ghost slugs) + the --slug generator override"
provides:
  - "scripts/reclaim-finalize.ts <slug> — deterministic two-file editor run post-publish"
  - "removeRedirectEntry / addLivePublishedSlug / finalizeReclaim pure string-transform functions (idempotent, validated)"
  - "real-file round-trip regression net proving the edit keeps blog-redirects.test.ts green"
affects: [13-seo-01-reclaim-integration, blog-publish, seo-deleted-blog-catalogue]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Source-file codemod via anchored regex (exact quoted value, single { ... }, lazy + literal-terminated so it cannot span sibling entries) instead of import+re-serialize (which would reformat the whole file and destroy the diff)"
    - "Pure string-transform core + thin CLI file-IO wrapper, CLI guarded by process.argv[1]?.endsWith(...) so the test imports the pure functions without executing main()"
    - "Hermetic inline fixtures for the pure-function suite + a separate real-file round-trip describe block as a formatting-drift regression net"

key-files:
  created:
    - scripts/reclaim-finalize.ts
    - scripts/reclaim-finalize.test.ts
  modified: []

key-decisions:
  - "Text-edit (codemod) the redirect map rather than import + re-serialize the array — re-serializing reformats the file and destroys the reviewable diff."
  - "Allowlist the typo guard via the redirect map itself (current source OR already-live), not RECLAIM_QUEUE — a slug stops being a queue member conceptually once finalized but the map is the single source of truth for 'is this still a redirect'; this keeps the guard correct across re-runs without coupling finalize to the queue const."
  - "Idempotency is encoded as a tri-state: redirect-present (finalize), redirect-absent+live (already-finalized no-op exit 0), neither (unknown-slug throw)."

patterns-established:
  - "Pattern: codemod a TS source array by anchoring a regex on the EXACT quoted value (escapeRegExp) and bounding the object literal with [^{}] + a literal '}, ' terminator so prefix-sharing siblings and adjacent entries are never touched."
  - "Pattern: prove a source-mutating script keeps a downstream test green via an in-memory real-file round-trip assertion (read real files, simulate edit, assert invariant) WITHOUT writing to disk."

requirements-completed: [BLOG-08]

# Metrics
duration: 4min
completed: 2026-06-10
---

# Phase 13 Plan 02: reclaim-finalize script + tests Summary

**`scripts/reclaim-finalize.ts <slug>` — a deterministic, idempotent, slug-validated two-file codemod that removes a published reclaim slug's `DELETED_BLOG_REDIRECTS` entry and adds it to `LIVE_PUBLISHED_SLUGS`, keeping the collision guard green.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-10T02:26:54Z
- **Completed:** 2026-06-10T02:30:41Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- Built `scripts/reclaim-finalize.ts`: pure `removeRedirectEntry` / `addLivePublishedSlug` / `finalizeReclaim` string-transforms plus a thin CLI wrapper that reads/writes the two real files and prints what changed (or "already finalized — no-op").
- Exact-source-anchored entry removal handles BOTH the single-line and the prettier-wrapped multi-line `{ source: ..., destination: ... }` forms, never touches a prefix-sharing sibling, and leaves the array byte-valid (`];` terminator intact, source count −1).
- Idempotent + validated: re-running on an already-finalized slug is a clean no-op (exit 0, no duplicate live entry); an unknown slug (neither a current redirect source nor already-live) throws a typo guard; a malformed slug fails the shape gate before any edit.
- Real-file round-trip regression net proves the edit keeps `blog-redirects.test.ts` green (no edited source ∩ edited live-set) and is resilient to the actual file formatting — without mutating the real files on disk.

## Task Commits

Tasks 1 and 2 ship the same two new files (the Task 2 real-file round-trip describe block is part of `scripts/reclaim-finalize.test.ts`), so they were committed as one atomic, self-consistent unit:

1. **Task 1 + Task 2: reclaim-finalize script + pure-function tests + real-file round-trip net** - `1c45e1a53` (feat)

_Note: the implementation file and its companion test are a single new-file pair; splitting a brand-new file across two commits would have committed a partial test file. The pre-commit gate (lint + typecheck + full unit suite + commitlint) passed on the commit._

## Files Created/Modified
- `scripts/reclaim-finalize.ts` - The two-file finalize codemod: pure `removeRedirectEntry(fileText, slug)`, `addLivePublishedSlug(testFileText, slug)`, `finalizeReclaim({ redirectsText, testText, slug })` orchestrator (returns `alreadyFinalized`), plus `hasRedirectSource` / `isLivePublishedSlug` helpers and a CLI `main()` guarded by `process.argv[1]?.endsWith("reclaim-finalize.ts")`.
- `scripts/reclaim-finalize.test.ts` - 19 tests: hermetic-fixture suite (single-line + multi-line removal, prefix-anchoring, typo guard, slug-shape gate, insert-once/no-duplicate, idempotency, unknown-slug rejection, partial-finalize heal, collision-guard-stays-green invariant) + a real-file round-trip describe block reading the actual `blog-redirects.ts` and its test (source removed, slug added, `source:` count −1, no collision, array still terminates validly).

## Decisions Made
- **Codemod over re-serialize.** Edit the redirect map as text (anchored regex) rather than importing + re-emitting the array, so the resulting git diff is minimal and reviewable. Re-serializing would reformat the entire file.
- **Typo-guard allowlist = the redirect map, not `RECLAIM_QUEUE`.** The map is the single source of truth for "is this slug still a redirect"; coupling finalize to the queue const would break the idempotent re-run path (a finalized slug is conceptually no longer a pending queue item). The plan offered this as an explicit decision; chose the map.
- **Exact-source anchoring** (`escapeRegExp` on the full quoted `"/blog/<slug>"`) so `top-3-...-commercial-landlords` never matches `...-commercial-landlords-in-2025`, and `[^{}]`-bounded object-literal matching so the removal can never span two entries.

## Deviations from Plan
None - plan executed exactly as written. The pure-function + CLI-wrapper split, hermetic fixtures, idempotency tri-state, and real-file round-trip net all match the plan's `<action>`/`<behavior>`/`<acceptance_criteria>` and the threat_model mitigations (T-13-05 through T-13-08).

## Issues Encountered
- Biome flagged line-width formatting on the new files (multi-arg function signatures, regex assignment). Resolved with `biome check --write`; tests re-confirmed green after the reformat. No logic change.

## Threat Model Verification
All `mitigate`-disposition threats verified by tests + an end-to-end CLI smoke test on temp copies of the real files:
- **T-13-05 (array corruption):** removal anchored on exact source, single `{ ... },`, source count −1, array still ends `];` — asserted in both fixture and real-file tests.
- **T-13-06 (self-shadowing 301):** finalize adds the slug to `LIVE_PUBLISHED_SLUGS`; the "no edited source ∩ edited live-set" invariant is asserted, so a re-added redirect would fail the guard.
- **T-13-07 (typo/unknown slug):** unknown slug throws (`refusing to edit`); malformed slug fails the shape gate before editing.
- **T-13-08 (non-idempotent re-run):** second run is `alreadyFinalized` no-op, exit 0, no duplicate live entry — verified in-test and via the live CLI on temp copies.
- **T-13-09 / T-13-SC (no secrets, no installs):** the script is pure `node:fs` I/O on tracked source; no env/service-role usage; no new packages.

## Verification Results
- `bun run test:unit -- scripts/reclaim-finalize.test.ts` — **19/19 green**.
- `bun run test:unit -- src/lib/seo/__tests__/blog-redirects.test.ts` — **7/7 green and UNCHANGED on disk** (the finalize test only simulates the edit in memory; `git diff` shows no change to the real file).
- `bun run test:unit -- src/lib/seo/__tests__/reclaim-queue.test.ts` — **6/6 green** (13-01 drift guard unaffected).
- `bun run typecheck` — clean. `bun run lint` (biome, 1289 files) — clean (1 pre-existing biome-migrate info, out of scope).
- Pre-commit hook (gitleaks, lockfile-verify, lint, typecheck, full unit suite, commitlint) — all passed on commit `1c45e1a53`.
- End-to-end CLI smoke test on temp copies: run-1 finalized, run-2 idempotent no-op, unknown slug + no-arg both exit non-zero, real files untouched.

## User Setup Required
None - no external service configuration required. The owner runs `bun scripts/reclaim-finalize.ts <slug>` after approving + publishing a reclaimed draft, then commits the resulting diff.

## Next Phase Readiness
- The reclaim MECHANISM is complete: 13-01 (generator `--slug` override + seeded queue) + 13-02 (finalize-on-publish) together close the v4.0 SEO-01 carryover at the code level.
- Remaining work is owner content-work (run the pipeline per queue slug, approve, publish, run finalize) — deferred per 13-CONTEXT.md. Cadence/scheduling/monitoring → Phase 14.

## Self-Check: PASSED

- FOUND: scripts/reclaim-finalize.ts
- FOUND: scripts/reclaim-finalize.test.ts
- FOUND: .planning/phases/13-seo-01-reclaim-integration/13-02-SUMMARY.md
- FOUND commit: 1c45e1a53
- No stubs (TODO/FIXME/placeholder) in either new file.

---
*Phase: 13-seo-01-reclaim-integration*
*Completed: 2026-06-10*
