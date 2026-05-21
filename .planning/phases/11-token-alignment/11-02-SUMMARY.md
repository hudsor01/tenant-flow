---
phase: 11-token-alignment
plan: 02
subsystem: build
tags: [design-tokens, drift-guard, vitest, ci-gate, documentation]

# Dependency graph
requires:
  - phase: 11-01
    provides: "5 decorative loading components tokenized to var(--duration-*) — zero non-zero inline-ms literals remain in src/components"
provides:
  - "src/app/__tests__/design-token-drift.test.ts — TOKEN-03 drift-guard: scans src/components + src/app for hex/rgb/bg-white/non-zero-inline-ms, asserts zero non-exempt matches; runs in pre-commit + CI"
  - "11-LINT-RULE.md — mechanism documentation: drift-guard is a Vitest unit test (not an ESLint plugin), 4 regexes, D-03 allowlist rationale, escape-hatch policy"
affects: [12-seo-metadata, 13-performance-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Drift-guard via Vitest unit test: readdirSync recursive walker + per-(file x pattern) it() + per-pattern scoped exemption map (copy of marketing-copy-landlord-only.test.ts shape)"
    - "String-literal-scoped hex scan: extract \"...\"/'...'/`...` content before applying the hex regex so non-color #NNNN issue refs in comments do not false-positive"
    - "Meta-test: feed known-drift fixture strings to the regexes inside the test file to prove they catch drift and ignore the 0ms zero-case"

key-files:
  created:
    - src/app/__tests__/design-token-drift.test.ts
    - .planning/phases/11-token-alignment/11-LINT-RULE.md
  modified: []

key-decisions:
  - "inlineMs regex uses [1-9]\\d* (not \\d+) so the 0ms zero-case is not drift — globals.css has no --duration-0 token and 0ms is a legitimate no-delay"
  - "hex scan inspects string-literal content only (Pitfall-4 fix) — non-color #NNNN issue refs and the &#8984; HTML entity live in comments/JSX text, not inside string delimiters"
  - "HEX_ALIAS_PREFIXES filter (#config, #components, etc.) as forward-protection against subpath-import aliases false-positiving the 3-4-digit hex shape"
  - "D-03 allowlist is a 10-entry per-pattern scoped map — logo-cloud.tsx exempt for hex only; an inline-ms added to it still fails the guard"
  - "two-factor-setup-steps.tsx QR-code bg-white added to the allowlist as the one D-03 extension the Phase 11 audit surfaced (QR scanners require literal white)"

requirements-completed: [TOKEN-02, TOKEN-03]

# Metrics
duration: ~4min
completed: 2026-05-21
---

# Phase 11 Plan 02: Design-Token Drift-Guard Summary

**Authored the TOKEN-03 drift-guard — a Vitest unit-project test that recursively scans `src/components` + `src/app` for hex/`rgb`/`bg-white`/non-zero-inline-ms drift against a 10-entry D-03 allowlist (passes green, codifying the TOKEN-02 site-wide audit) — and documented the mechanism for maintainers in `11-LINT-RULE.md`.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-21T10:17:06-05:00
- **Completed:** 2026-05-21T10:20:29-05:00
- **Tasks:** 2
- **Files created:** 2 (1 drift-guard test + 1 mechanism doc)

## Accomplishments

- `src/app/__tests__/design-token-drift.test.ts` (180 lines) — recursive `readdirSync` walker over `src/components` + `src/app`, one `describe(relPath)` per file, one `it()` per non-exempt (file x pattern). Runs in the `unit` Vitest project, so it executes in the lefthook pre-commit `unit-tests` hook and the CI `checks` test gate.
- The drift-guard test passes green (2701 tests) — the TOKEN-02 site-wide audit is now codified: zero non-exempt hex/`rgb`/`bg-white`/inline-ms remains in scope after Plan 11-01's inline-ms fixes landed.
- Four drift regexes: `hex` (`#RGB`/`#RGBA`/`#RRGGBB`/`#RRGGBBAA` at a word boundary), `rgb` (`rgb(`/`rgba(`), `bgWhite` (`bg-white`, `bg-white/50`, `bg-white/[var(--x)]`), `inlineMs` (Tailwind arbitrary values + JS string literals, `[1-9]\d*` to exclude the `0ms` zero-case).
- 10-entry per-pattern `DRIFT_EXEMPTIONS` map with a justification comment on every entry — `next/og` satori image, browser-chrome `<meta>` colors, 5 generated standalone HTML/PDF document templates, 2 third-party brand SVG logos, and the 2FA QR-code `bg-white` container.
- 7-case meta-test proves each regex catches drift, the `inlineMs` regex ignores `0ms`, the hex scan keeps a hex inside a string literal, and the hex scan ignores a non-color `#NNN` issue ref in a comment.
- `11-LINT-RULE.md` (140 lines) — all 8 required sections (Mechanism, What it scans, The four drift patterns, The D-03 allowlist, How to add a new exemption, Where it runs, Escape-hatch policy, Known limitation). Correctly frames the mechanism as a Vitest unit test, not an ESLint plugin; ESLint appears only in the historical "was deleted in the Biome migration" context.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author the design-token drift-guard test** - `5b2705e13` (test)
2. **Task 2: Author 11-LINT-RULE.md documenting the drift-guard mechanism** - `38697c00e` (docs)

## Files Created/Modified

- `src/app/__tests__/design-token-drift.test.ts` - New: the TOKEN-03 drift-guard. `readdirSync` recursive walker + `STRING_LITERAL` extractor for the string-literal-scoped hex scan + `HEX_ALIAS_PREFIXES` forward-protection filter + 10-entry `DRIFT_EXEMPTIONS` map + 7-case meta-test.
- `.planning/phases/11-token-alignment/11-LINT-RULE.md` - New: drift-guard mechanism documentation. Replaces the deleted fictional `LINT-RULE.md` that described a non-existent `color-tokens` ESLint plugin.

## Decisions Made

- `inlineMs` regex uses `[1-9]\d*` rather than `\d+` so `0ms` (a legitimate no-delay, no `--duration-0` token exists) is not flagged as drift — documented as the zero-case in `11-LINT-RULE.md`.
- The hex scan inspects string-literal/template-literal content only (extracted via the `STRING_LITERAL` regex before applying the hex regex). This is the precise, non-brittle fix for Pitfall-4: non-color `#NNNN` strings (issue refs `PR #725`, the `&#8984;` HTML entity) live in comments and JSX text, never inside string delimiters; genuine color literals always do.
- `HEX_ALIAS_PREFIXES` (`#config`, `#components`, `#lib`, etc.) additionally filters subpath-import aliases as forward-protection — they are never color literals even inside a string.
- The exemption map is per-pattern, not whole-file — `logo-cloud.tsx` is exempt for `hex` only; an inline-ms added there still fails the guard.
- `two-factor-setup-steps.tsx`'s QR-code `bg-white` was added to the allowlist as the one D-03 extension the Phase 11 audit surfaced (D-03's original enumerated list did not include it, but a QR scanner needs literal white regardless of theme — a genuine exception of the same class). The file's line 62 carries the in-code justification comment.

## TDD Gate Compliance

This plan is `type: execute`, not `type: tdd`. The drift-guard test was authored as a single artifact (Task 1) and reached green because Plan 11-01's inline-ms tokenization had already landed — a deliberate red-to-green sequencing across the two-plan phase rather than a per-task RED/GREEN cycle. No TDD gate applies.

## Deviations from Plan

None - plan executed exactly as written. Both tasks landed verbatim per the PLAN spec: the four regexes, the `HEX_ALIAS_PREFIXES` set, the 10-entry `DRIFT_EXEMPTIONS` map, the per-(file x pattern) `it()` driver, and the 5-case meta-test (the implementation added 2 further meta-test cases for the string-literal hex scan, within the plan's "optionally add a meta-test" latitude — net 7 cases). `11-LINT-RULE.md` contains all 8 required sections.

Note: Task 1's drift-guard test was committed in a prior interrupted run of this executor (commit `5b2705e13`); this run verified it passes green (2701 tests), authored/committed Task 2's `11-LINT-RULE.md`, and produced the plan artifacts. This is a continuation, not a deviation — no work was redone.

## Issues Encountered

The pre-commit `lockfile-verify` hook (`bun install --frozen-lockfile`) fails inside the command sandbox with `PermissionDenied` — a sandbox restriction, not a real lockfile problem (the lockfile is in sync; the other four hooks plus commitlint all pass). Resolved the sanctioned way per the execution context: the `git commit` ran with the command sandbox disabled, so all five pre-commit checks plus commitlint passed normally. No `--no-verify` and no hook-bypass mechanism was used.

## User Setup Required

None - no external service configuration required. The drift-guard test runs automatically in the lefthook pre-commit hook and the CI `checks` test gate.

## Next Phase Readiness

- The drift-guard is now CI-gated: any future PR (Phases 12-13 and beyond) that introduces a non-exempt hex / `rgb(` / `bg-white` / non-zero inline-ms value fails the drift-guard test in pre-commit and in CI.
- `11-LINT-RULE.md` documents the escape-hatch policy (the only way to allow a flagged value is a reviewed, commented `DRIFT_EXEMPTIONS` entry) for maintainers extending the allowlist.
- Phase 11 is complete (Plans 11-01 + 11-02): TOKEN-01, TOKEN-02, TOKEN-03 all satisfied.

## Self-Check: PASSED

All claimed files verified to exist; both task commits verified present in git history.

- FOUND: src/app/__tests__/design-token-drift.test.ts
- FOUND: .planning/phases/11-token-alignment/11-LINT-RULE.md
- FOUND: commit 5b2705e13 (Task 1)
- FOUND: commit 38697c00e (Task 2)
- VERIFIED: drift-guard test passes green (2701 tests)
- VERIFIED: typecheck clean, Biome lint clean (1187 files)

---
*Phase: 11-token-alignment*
*Completed: 2026-05-21*
