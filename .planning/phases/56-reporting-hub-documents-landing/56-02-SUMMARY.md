---
phase: 56
plan: 02
subsystem: reporting-hub
tags: [redirects, seo, rpthub-02, d-29, d-32, guard-a, guard-b]
requires: []
provides:
  - REPORTING_REDIRECTS
  - ReportingRedirect
affects:
  - next.config.ts
tech-stack:
  added: []
  patterns:
    - "static redirect map as a pure module (blog-redirects.ts precedent) with no permanent flag per entry"
    - "source-array EQUALITY assertion as the structural defence against a stale map entry"
    - "guard-set tests that assert absence of sources, not presence of pages (D-40 caveat recorded in-file)"
key-files:
  created:
    - src/lib/seo/reporting-redirects.ts
    - src/lib/seo/__tests__/reporting-redirects.test.ts
  modified: []
decisions:
  - "The map is authored but deliberately NOT wired into next.config.ts — D-11 sequencing puts wiring in 56-07, after the hub routes are E2E-proven"
  - "No filterActiveRedirects equivalent: that only exists on the blog map because it is build-time-filtered against a live Supabase slug set; this map is static"
  - "Added an unplanned 8th structural assertion — every destination must sit under a PRIVATE_ROUTE_PREFIXES prefix — because it discharges threat T-56-04 directly rather than by inference"
  - "RPTHUB-02 was NOT marked complete: a pure module plus a unit test is not a delivered redirect (the delivering plans are 56-07/56-08)"
metrics:
  duration: ~25 min
  completed: 2026-07-31
---

# Phase 56 Plan 02: Reporting Redirect Map Summary

The seven-entry Phase 56 redirect map as a pure, unwired module plus a 20-case invariant suite whose
source-array **equality** assertion is the only structural defence against the stale
`/analytics/financial -> /reports/analytics` entry that the 2026-07-30 full-separation correction
inverted.

## What Was Built

| Task | Artifact | Commit |
|------|----------|--------|
| 1 | `src/lib/seo/reporting-redirects.ts` (79 lines) | `415d84c98` |
| 2 | `src/lib/seo/__tests__/reporting-redirects.test.ts` (171 lines) | `9c4d3525f` |

### Task 1 — the map

`ReportingRedirect` (`readonly source` / `readonly destination`) and
`REPORTING_REDIRECTS: readonly ReportingRedirect[]` with exactly the seven D-32 entries in D-32
order. No `permanent` field per entry — `next.config.ts` applies `permanent: true` uniformly at the
spread site, matching how `DELETED_BLOG_REDIRECTS` is consumed. No `filterActiveRedirects`
equivalent.

The header comment carries all four mandated statements, labelled (a)–(d): the inversion of entry 7
and the instruction not to "correct" it; why the target is the concrete `/analytics/overview` rather
than bare `/analytics` (`src/app/(owner)/analytics/page.tsx` is a five-line
`redirect("/analytics/overview")` — verified this session, it is 5 lines); Guard A with the
`ERR_TOO_MANY_REDIRECTS` consequence named; and Guard B with `/analytics/financial` called out as
the highest-risk member and the reason a subset check cannot catch it.

Entry 7 additionally carries an inline `// Entry 7 — the inversion.` marker at its call site so the
asymmetry is visible without scrolling to the header.

### Task 2 — the invariant suite

20 `it` cases. The 17 D-32 assertions map onto them as: the 7 positive source/destination pairs in
one `toEqual` on the full pair list, Guard A as `it.each` over its 3 paths, and Guard B as one
dedicated named `it` for `/analytics/financial` plus `it.each` over the other 6. The remaining 9
cases are the structural defences: source-array equality, length, the inversion, the bare-`/analytics`
chain guard, no-identity, unique sources, no-wildcard, `PRIVATE_ROUTE_PREFIXES` proxy isolation, and
the gated-destination check.

The file's header records the D-40 caveat verbatim in substance: Guard B proves "no config redirect
matched", not "these are 7 live pages" — only 3 of the 7 are real pages, the other 4 are in-app
redirect shims.

## Verification Results

Every number below is quoted from command output run this session.

| Check | Result |
|-------|--------|
| `bun run test:unit -- src/lib/seo/__tests__/reporting-redirects.test.ts` | exit 0 — **20 passed (20)** |
| `bun run test:unit` (full suite, regression guard) | exit 0 — **305 files, 108682 tests passed** |
| `bun run typecheck` | exit 0 (silent) |
| `bun run lint` | exit 0 — "Checked 1348 files in 160ms. No fixes applied." |
| `git diff --name-only HEAD -- next.config.ts` | **empty** (map deliberately unwired, D-11) |
| `git diff --name-only HEAD -- src/lib/routes/private-routes.ts` | **empty** (`/financials` removal is 56-07) |
| `git diff --diff-filter=D --name-only 415d84c98~1 HEAD` | **empty** — no file deleted by either commit |

### The injected-probe proof (T-56-07)

Appending `{ source: "/analytics/financial", destination: "/reports/analytics" }` to the map and
re-running the suite produced **exit 1, 4 failed | 16 passed (20)**. The four that fired:

```
× source array EQUALS the seven D-32 sources, in order
× maps every source to its exact D-32 destination
× holds exactly seven entries
× /analytics/financial is NEVER a source — it stays live under D-29
```

Critically, the ten per-path `.not.toContain()` guards all **passed** with the stale entry present,
which is exactly the failure mode D-32 predicted: a subset check cannot see it. The probe was
reverted with `git checkout -- src/lib/seo/reporting-redirects.ts`, `git diff HEAD` on that path is
empty, and the suite is back to **20 passed (20)**.

### Task-level greps

| Criterion | Result |
|---|---|
| `grep -v '^\s*//' map \| grep -c 'destination: "/analytics/overview"'` | **1** ✅ |
| `grep -v '^\s*//' map \| grep -c 'source: "/analytics'` | **0** ✅ |
| `grep -v '^\s*//' map \| grep -c 'source: "/reports/generate"\|source: "/reports/year-end"\|source: "/reports",'` | **0** ✅ |
| header contains `Guard A` / `Guard B` / `/analytics/financial` / `ERR_TOO_MANY_REDIRECTS` | 1 / 1 / 2 / 1 ✅ |
| test contains `REPORTING_REDIRECTS.map((r) => r.source)).toEqual([` | **1** ✅ |
| `grep -c 'analytics/financial' test` (criterion: ≥1) | **6** ✅ |
| `grep -c 'PRIVATE_ROUTE_PREFIXES' test` (criterion: ≥1) | **5** ✅ |
| sources containing `:`, `*` or `(` | **0** ✅ |

### 56-08 sweep compatibility (checked proactively, not assumed)

`grep -rn '/financials' src tests` returns **66** lines; `| grep -v 'reporting-redirects'` returns
**48**. The 18 filtered lines are attributable entirely to this plan's two files (12 in the test, 6
in the map) — because `grep -rn` prints the path on every line, the `reporting-redirects` substring
in both filenames does the filtering. The companion bound holds:
`grep -c 'source: "/financials' src/lib/seo/reporting-redirects.ts` returns **6**.

The remaining 48 unfiltered hits are the live `/financials` surface that plans 56-07/56-08 delete —
they are not this plan's to clear.

## Acceptance Criteria NOT Met As Literally Written

**Task 1 criterion 1: `grep -v '^\s*//' src/lib/seo/reporting-redirects.ts | grep -c 'source:'`
returns 8, not 7.**

The 8th match is the interface field declaration `readonly source: string;` inside
`ReportingRedirect` — a declaration the plan's own action text mandates. The grep is a proxy for
"exactly 7 entries" and does not exclude the type declaration. The underlying truth holds three
ways: `grep -c 'source: "'` (a source bound to a string literal, i.e. an actual entry) returns
**exactly 7**, `expect(REPORTING_REDIRECTS).toHaveLength(7)` passes, and the source-array equality
assertion pins all seven values and their order.

This is structurally the same artifact 56-01 reported for its `href:` criterion. Renaming the
interface field to dodge the grep would have been the wrong fix — `source` is the field name
`next.config.ts` requires and the plan specifies.

**Task 2 verify command: `bun run test:unit -- --run <file>` crashes and cannot exit 0.**

The `test:unit` script already injects `--run` (`vitest --run --project unit`), so passing `--run`
again produces a CAC duplicate-option error:

```
Error: Expected a single value for option "--run", received [true, true]
```

This is a pre-existing, documented repo gotcha, not a defect introduced here. The criterion was
satisfied via the correct invocation, `bun run test:unit -- src/lib/seo/__tests__/reporting-redirects.test.ts`,
which resolves to `vitest --run --project unit <file>` and exits 0 with 20 passed. The plan text was
not reworded; the discrepancy is reported.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's test-runner invocation is unrunnable**

- **Found during:** Task 2 verification
- **Issue:** `bun run test:unit -- --run <file>` exits 1 with a CAC duplicate-flag error before
  vitest starts.
- **Fix:** dropped the redundant `--run`. No source change.
- **Files modified:** none
- **Commit:** n/a (invocation-level)

**2. [Rule 3 - Blocking] biome formatting on the destination-map assertion**

- **Found during:** Task 2
- **Issue:** `bun run lint` exit 1 — the `expect(...)` wrapping the pair-list `.map()` was
  hand-broken across three lines where biome wanted it on one.
- **Fix:** collapsed to a single line.
- **Files modified:** `src/lib/seo/__tests__/reporting-redirects.test.ts`
- **Commit:** `9c4d3525f`

**3. [Rule 3 - Blocking] Three `gsd-sdk state` handlers no-op against this STATE.md**

Identical to what 56-01 recorded:

- `state.record-metric` → `"Performance Metrics section not found in STATE.md"`
- `state.add-decision` → `"Decisions section not found in STATE.md"`
- `state.record-session` → `"No session fields found in STATE.md"`

This project's STATE.md carries none of those three sections. The metric, the decisions and the
session stamp are recorded in this SUMMARY's frontmatter instead. `state.advance-plan` (2 → 3),
`state.update-progress` and `roadmap.update-plan-progress 56` all applied. `Status:` was
hand-corrected from the SDK's "Ready to execute".

### Additions Not Specified

**An 8th structural assertion: "every destination sits under a gated prefix."**

The plan's assertion 10 pins that `PRIVATE_ROUTE_PREFIXES` still *contains* `/analytics` and
`/reports`, which discharges threat T-56-04 (a redirect landing outside the auth gate) only by
inference — it proves the two prefixes survive, not that every destination actually uses one. The
added test walks all seven destinations against `PRIVATE_ROUTE_PREFIXES` directly, so a future entry
targeting an un-gated path fails at unit level rather than waiting for E2E. It costs one `it` and no
new import.

### Deliberately NOT Done

**`requirements.mark-complete RPTHUB-02` was not run.** A pure module plus a unit test is not a
delivered redirect: nothing is wired into `next.config.ts` (D-11 puts that in 56-07) and no legacy
URL 308s anywhere yet. Marking it here would repeat the false-completion 56-01 had to revert.
RPTHUB-02 belongs to 56-07/56-08. `.planning/REQUIREMENTS.md` is untouched by this plan —
`git diff --name-only HEAD -- .planning/REQUIREMENTS.md` is empty.

## Threat Model Disposition

| Threat | Disposition | Evidence |
|---|---|---|
| T-56-04 EoP — a destination outside the auth gate | mitigated | `PRIVATE_ROUTE_PREFIXES` containment assertion **plus** the added per-destination gated-prefix walk. All 7 destinations are under `/reports` or `/analytics`; none is external or protocol-relative. |
| T-56-05 DoS — Guard A identity entry | mitigated | 3 `it.each` cases assert absence; `grep -c` on the map returns 0 for all three paths. |
| T-56-06 open redirect — parameterised source | mitigated | no-wildcard test (`/^\/[a-z0-9/-]+$/` plus an explicit `[:*(]` rejection) returns `[]`; all sources and destinations are compile-time literals. |
| T-56-07 repudiation — stale map entry | mitigated **and proven** | source-array equality assertion; injected `/analytics/financial` probe failed 4 tests and was reverted (see above). |
| T-56-SC tampering — package installs | n/a | zero package-manager commands. `git status` shows no `bun.lock` change; `lockfile-verify` passed on both commits. |

## Known Stubs

None. Both files are complete: a static seven-entry data module and its full invariant suite. Nothing
is hardcoded-empty, nothing is placeholder copy.

**Intentionally unwired, not stubbed:** `next.config.ts` does not import `REPORTING_REDIRECTS`, and
no route redirects yet. That is D-11 sequencing, stated in the plan's own objective — the hub must be
E2E-proven (56-06) before legacy URLs move (56-07). The module has exactly one consumer today, its
own test.

## Threat Flags

None. No network endpoint, auth path, file access pattern or schema change was introduced. The plan
touches no runtime code path — the module is unreferenced by any route, component or config.

## Self-Check: PASSED

Both created files exist on disk:

- `src/lib/seo/reporting-redirects.ts` — FOUND
- `src/lib/seo/__tests__/reporting-redirects.test.ts` — FOUND

Both commit hashes resolve in `git log`:

- `415d84c98` feat(56-02): add 7-entry reporting redirect map
- `9c4d3525f` test(56-02): pin reporting redirect map invariants and guards

## Notes for 56-07 (the wiring plan)

- Spread `REPORTING_REDIRECTS` into `next.config.ts` `redirects()` with `permanent: true` applied at
  the spread site. Do not add a `permanent` field to the entries — the map's comment says so and the
  blog map is consumed the same way.
- Entry 7 is not a mistake. If a reviewer flags "one of these arrows points the wrong way", point
  them at header note (a).
- Removing `/financials` from `PRIVATE_ROUTE_PREFIXES` is 56-07's job and is safe once the routes are
  gone; removing `/analytics` or `/reports` is not — this suite fails loudly if either goes.
- The E2E `public` spec must assert the 17 D-32 outcomes at HTTP level (7 positive with exact
  `location`, 3 Guard A not-308, 7 Guard B not-308). The unit suite proves the map's shape; only E2E
  proves Next.js compiled it into the routes manifest as expected.
