---
phase: 56
plan: 04
subsystem: reporting-hub
tags: [tier-gate, drift-guard, rpthub-03, d-12, d-13, edge-functions]
requires:
  - PREMIUM_REPORT_SLUGS
  - REPORTS_HUB_ENTRIES
  - hasGrowthBadge
provides:
  - premium-report-gate-drift-guard
affects:
  - supabase/functions/__tests__/**
  - vitest.config.ts
  - tsconfig.json
tech-stack:
  added: []
  patterns:
    - "source-of-truth-reading drift guard (robots.test.ts precedent), extended to cross-source set equality"
    - "Node-side Vitest test over Deno edge-function source read via node:fs — no `supabase functions serve` dependency"
    - "windowed gate-body assertion: the entitlement call must live INSIDE the conditional, not merely somewhere in the file"
key-files:
  created:
    - supabase/functions/__tests__/premium-report-gate.test.ts
  modified:
    - vitest.config.ts
    - tsconfig.json
decisions:
  - "The guard compares the two Deno sets against EACH OTHER, never against a hardcoded member list — a literal-comparison test would pass today and still let the three sources diverge tomorrow"
  - "tsconfig.json include was widened (beyond the plan's authorized vitest widening) so the test is actually typechecked; the repo's tsconfig excludes supabase/ entirely"
  - "biome.json was NOT changed: Biome 2.5.5 negations are absolute and `!supabase/functions/**` cannot be re-included by any later positive pattern, verified across 5 pattern/position variants. The ineffective edit was reverted rather than shipped as a no-op."
  - "The two dead Export buttons are recorded in a comment, not asserted by path, because a later wave of this same phase relocates the /financials tree — a path assertion would break the suite mid-phase for a fact that is not about the tier gate"
metrics:
  duration: ~13 min
  completed: 2026-07-31
---

# Phase 56 Plan 04: Premium-Report Tier-Gate Drift Guard Summary

One CI-runnable Vitest file that pins the three independently-maintained declarations of the
premium-report gated set mutually set-equal, pins that both edge functions still *consult* their
set rather than merely declaring it, and pins that the hub's two `Growth` badges map to genuinely
gated report types — proven by perturbing each guarded source and watching the suite fail.

## What Was Built

| Task | Artifact | Commit |
|------|----------|--------|
| 1 | `supabase/functions/__tests__/premium-report-gate.test.ts` (8 tests) + `vitest.config.ts` + `tsconfig.json` | `b4aabeaf2` |
| 2 | `supabase/functions/__tests__/premium-report-gate.test.ts` (+1 test, recorded findings) | `54f0c6b40` |

No production code changed. No edge function changed, so **no redeploy is required**.

### The three sources pinned

| # | Source | Constant | Role |
|---|--------|----------|------|
| 1 | `supabase/functions/export-report/index.ts:24` | `PREMIUM_REPORT_TYPES` | enforcement (402 at `:72`) |
| 2 | `supabase/functions/generate-pdf/index.ts:31` | `PREMIUM_REPORT_TYPES` | enforcement, Mode 1 (402 at `:322`) |
| 3 | `src/lib/reports/premium-report-slugs.ts:16` | `PREMIUM_REPORT_SLUGS` | presentation-only badge mirror (56-01) |

56-01 had already verified by extraction that all three yield `1099`, `cash-flow`, `financial`,
`income-statement`, `year-end`. **There was no drift to repair, and none was found.** This plan's
whole value is that future drift can no longer merge silently.

### Why the assertions compare sources to each other

A test asserting the current five members against a hardcoded list would pass today and still let
the three sources diverge tomorrow — editing any one of them would leave the other two, and the
test, untouched. Every equality assertion is source-against-source. Verified: excluding comments,
the only gated-set string literals in the test body are `"financial"` and `"year-end"` on lines
156-161, and both are checked *against the parsed `export-report` set* (plan assertion 6), never as
the basis of comparison. There is no five-member array anywhere in the file.

The Deno sources are read with `node:fs` because they are genuinely not importable from Vitest
(explicit `.ts` import specifiers, `Deno.serve`). **This is a Vitest unit test, not a Deno test — it
does NOT require `supabase functions serve`** and runs in CI with the rest of the unit suite. That
was a stated constraint in the execution brief and it is satisfied structurally, not by exception.

### The 9 assertions

| # | Test | Pins |
|---|------|------|
| 1 | non-empty, duplicate-free parse from both files | non-vacuity — an empty parse would make every equality below trivially true |
| 2 | the two Deno sets are set-equal | T-56-12 / D-12 |
| 3 | frontend mirror set-equal to the edge sets | badge cannot lie about what is gated |
| 4 | `export-report` still consults the set | gate not merely declared |
| 5 | `generate-pdf` Mode 1 still consults the set | gate not merely declared |
| 6 | every entry with a `gatedReportType` maps into the gated set | T-56-14 |
| 7 | exactly `tax-documents` + `year-end` are badged | T-56-14 |
| 8 | badged routes still send `financial` / `year-end`, both in the parsed set | T-56-13 / D-13 |
| 9 | `downloadYearEndCsv` + `download1099Csv` still exist and still POST the gated types | Task 2 recorded finding |

Assertions 4/5 are windowed, not string-presence: `checkTierEntitlement` must appear within 400
characters *after* the `if (PREMIUM_REPORT_TYPES.has(...))` match. Probe 3b below proves that
distinction is load-bearing.

## Drift-Guard Proof — the guard was demonstrated to FAIL

A guard never seen to fail is not known to guard anything. Six perturbations were applied, each
verified applied (needle-count printed before running), each run, each reverted.

| Probe | Perturbation | Result |
|-------|--------------|--------|
| 1 (plan-mandated) | remove `"cash-flow"` from `generate-pdf`'s set | **FAIL** — `1 failed \| 8 passed`, on *"the two Deno PREMIUM_REPORT_TYPES sets are set-equal"*: `AssertionError: expected [ '1099', 'financial', …(2) ] to deeply equal [ '1099', 'cash-flow', …(3) ]` |
| 2 | add `"balance-sheet"` to the frontend mirror | **FAIL** — `1 failed \| 8 passed`, on *"the frontend PREMIUM_REPORT_SLUGS mirror is set-equal to the edge-function sets"* |
| 3a | rename `export-report`'s gate conditional to `ALWAYS_ALLOW.has(...)` | **FAIL** — on *"export-report still consults PREMIUM_REPORT_TYPES before exporting"* |
| 3b | keep the conditional, rename the `checkTierEntitlement` call inside it | **FAIL** — same test. Proves the windowed body check, not just string presence |
| 3c | neuter `generate-pdf` Mode 1's gate conditional | **FAIL** — on *"generate-pdf Mode 1 still consults PREMIUM_REPORT_TYPES before rendering"* |
| 4 | set `balance-sheet`'s `gatedReportType` to an ungated value | **FAIL** — on *"every hub entry with a gatedReportType maps to a genuinely gated report type"* |

After every probe: `git diff --name-only` on all three perturbed sources printed **nothing**, and
the suite returned to `9 passed (9)`. **No perturbation is committed** — the two commits on this
plan touch exactly 3 files (`git diff --name-only HEAD~2 HEAD`):

```
supabase/functions/__tests__/premium-report-gate.test.ts
tsconfig.json
vitest.config.ts
```

A first attempt at probe 3 used a `perl -0pi` multiline substitution that silently did not match.
It was caught because the script printed the post-edit source and the gate was visibly intact, and
the probe was rewritten with a verified-needle `node` replacement. A probe that does not perturb
anything proves nothing, and reporting it as a pass would have been exactly the failure mode this
phase exists to correct.

## Verification Results

Every command run this session; output quoted, not paraphrased.

| Check | Result |
|-------|--------|
| `bun run test:unit -- supabase/functions/__tests__/premium-report-gate.test.ts` | exit 0 — **Tests 9 passed (9)** |
| `bun run test:unit` (full suite) | exit 0 — **Test Files 308 passed (308) · Tests 107313 passed (107313)** |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0 — "Checked 1340 files in 162ms. No fixes applied." |
| `git status --porcelain supabase/functions/export-report/ supabase/functions/generate-pdf/` | EMPTY |
| `git status --porcelain 'src/app/(owner)/analytics/'` | EMPTY (D-38 untouched) |
| `git diff --name-only src/hooks/api/query-keys/report-keys.ts` | EMPTY |
| `git diff --name-only '…/income-statement-page-header.tsx' '…/cash-flow-header.tsx'` | EMPTY |
| `.planning/REQUIREMENTS.md` | untouched — not in either commit, no working-tree change |

Content greps on the test file: `readFileSync` 2, `export-report` 12, `generate-pdf` 10,
`PREMIUM_REPORT_SLUGS` 5, `hasGrowthBadge` 3, `downloadYearEndCsv` 2, `download1099Csv` 2,
`no onClick` 1. All required needles present.

Confirmed the test file is genuinely in the tsc program, not silently skipped:
`bunx tsc --noEmit --listFiles | grep -c premium-report-gate.test.ts` → **1**.

## Acceptance Criteria NOT Met As Literally Written

**One criterion's literal command form is broken, in both tasks. It is reported, not reworded.**

Both tasks specify `bun run test:unit -- --run supabase/functions/__tests__/premium-report-gate.test.ts`.
That exact command **fails**, and not because of the test:

```
Error: Expected a single value for option "--run", received [true, true]
error: script "test:unit" exited with code 1
```

`package.json` defines `test:unit` as `vitest --run --project unit`, so the script already injects
`--run`; passing it again is a CAC duplicate-flag error. This is a known repo gotcha. The command
was run in its working form — `bun run test:unit -- <file>` — which exits 0 with 9 passing tests.
The criterion's substance (the file passes with ≥6 tests) is satisfied; its literal text is not
runnable as written and should be corrected in the plan, not worked around in the test.

**Everything else passed as literally written**, including the plan's harder criteria: the guard
provably fails when `"cash-flow"` is removed from `generate-pdf` (probe 1), and
`git diff --name-only` on both edge functions is empty after the probe is reverted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `vitest.config.ts` unit `include` did not collect the mandated path**

- **Found during:** Task 1, before writing the file
- **Issue:** the unit project's `include` was `["src/**/*.{test,spec}.{ts,tsx}", "scripts/**/*.{test,spec}.{ts,tsx}"]`. The plan's mandated artifact path lives under `supabase/`, so the file would have been written and never collected — a guard that never runs.
- **Fix:** added `"supabase/functions/__tests__/**/*.{test,spec}.ts"` with a comment recording why the Deno sources are unimportable and that `supabase/functions/tests/` (the separate Deno test directory) is deliberately excluded from the pattern.
- **Files modified:** `vitest.config.ts`
- **Commit:** `b4aabeaf2`
- **Plan authorization:** explicit — *"widen that include ONLY if the file would otherwise not be collected."*

**2. [Rule 3 - Blocking] `tsconfig.json` excluded the test from typechecking entirely**

- **Found during:** Task 1, before writing the file
- **Issue:** not anticipated by the plan. `tsconfig.json`'s `include` covers `src/**`, `scripts/**`, `next.config.ts` and the Next type dirs — **not `supabase/`**. The mandated file would have been the only test in the repo exempt from `noUncheckedIndexedAccess`, `noUnusedLocals` and the rest of strict mode, in a repo whose CLAUDE.md treats those as blocking. `bun run typecheck` would have exited 0 by not looking at it, which is precisely the kind of vacuous green this phase exists to eliminate.
- **Fix:** added `"supabase/functions/__tests__/**/*.ts"` to `include`. This is deliberately narrow — it admits only the new test directory, **not** the 38 Deno source files under `supabase/functions/` (`_shared/**`, `*/index.ts`, `stripe-webhooks/handlers/**`), which would fail Node typecheck on `Deno.serve` and `.ts` import specifiers.
- **Verified:** `tsc --noEmit --listFiles` now contains the file (count 1) and `bun run typecheck` still exits 0.
- **Files modified:** `tsconfig.json`
- **Commit:** `b4aabeaf2`

### Attempted And Reverted

**3. `biome.json` cannot lint the file — the fix does not exist, so no edit was shipped**

`biome.json` carries `"!supabase/functions/**"` in `files.includes`, so the new test is not linted
or format-checked by `bun run lint`. An edit adding `"supabase/functions/__tests__/**"` after the
negation was written, then **empirically disproven and reverted**: Biome 2.5.5 negations are
absolute, not order-sensitive. Five variants were probed against the real config —
`supabase/functions/__tests__/**` placed first / after the negation / at the end,
`**/__tests__/premium-report-gate.test.ts`, and the fully-qualified file path — and **all five
produced `Checked 0 files … No files were processed in the specified paths`**.

The only mechanical fix would be replacing the single blanket negation with ~5 narrower ones
(`!supabase/functions/_shared/**`, `!supabase/functions/*/index.ts`,
`!supabase/functions/*/handlers/**`, `!supabase/functions/tests/**`, `!supabase/functions/deno.json`).
That silently opts every *future* non-index Deno file into biome linting — a trap for whoever adds
one — for no benefit to RPTHUB-03. **Rejected as out of scope.** Shipping the no-op `biome.json`
line instead would have been worse: a config change that looks like it solved the problem and did
not.

The file was instead verified biome-clean directly, using an isolated config with
`files.includes: ["**"]` and `vcs.enabled: false`: `Checked 1 file in 2ms. No fixes applied.` So the
file conforms to the repo's formatter and linter rules; it is simply not re-checked by
`bun run lint`. **Recorded as a real, unrepaired gap** rather than presented as solved.

### Additions Not Specified

**Three probes beyond the one the plan mandates.** The plan requires only probe 1. Probes 2, 3a, 3b,
3c and 4 were added because the file makes five distinct claims and only one of them would have been
demonstrated. Probe 3b in particular (rename the entitlement call while leaving the conditional
intact) is what justifies the windowed `GATE_BODY_WINDOW` check over a plain `toContain`.

## Recorded Findings — Verified, Not Repaired (Task 2)

Both were verified this session before being written down.

**1. Two gated export paths are unexercised by the product.**
`reportMutations.downloadYearEndCsv` and `download1099Csv` POST reportTypes `year-end` and `1099`
to the gated `export-report` function. `grep -rn` across `src/` returns **zero call sites** for
either outside their own declaration in `report-keys.ts`. `/reports/year-end/page.tsx` builds its
CSV client-side via a local `downloadCsv` helper (`:31`, wired at `:228-229`) instead. The sibling
PDF mutations `downloadYearEndPdf` / `downloadTaxDocumentPdf` **are** wired, via
`use-report-mutations.ts:87,99`. Assertion 9 pins that both CSV exports still exist so a future
deletion is deliberate. **Not wired to UI here.**

**2. Two Export buttons render with no `onClick`.**
`income-statement-page-header.tsx:59-62` renders `<Button variant="outline">` and
`cash-flow-header.tsx:58-61` a raw `<button>`; grep confirms **neither file contains `onClick` at
all**. They reach no edge call and gate nothing — which is exactly why neither corresponding hub
tile carries a `Growth` badge. Recorded in the file's comment so an E2E author does not mistake a
dead button for working behaviour. **No handler added.** Deliberately *not* asserted by file path:
a later wave of this same phase relocates the `/financials` tree, and a path assertion would break
the suite mid-phase over a fact that is not about the tier gate.

## Known Stubs

None. The test file has no placeholder assertion, no `.skip`, no `it.todo`, and no hardcoded
expected-value list standing in for a real comparison.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change. The plan's five
registered threats are discharged as planned:

- **T-56-12** (EoP, duplicated set) — assertion 2 pins set-equality from disk; assertions 4/5 pin
  both gates still fire. Probes 1, 3a, 3b, 3c demonstrate each fails on tampering.
- **T-56-13** (EoP, route consolidation) — assertion 8 pins `financial` and `year-end` still
  members of the parsed `export-report` set after the move.
- **T-56-14** (Repudiation, badge fidelity) — assertions 6/7; probe 4 demonstrates the failure.
- **T-56-15** (Spoofing, client-side gate) — accepted, unchanged. No client-side disable, route
  guard or proxy change was added; `PREMIUM_REPORT_SLUGS` still drives only a `Badge`.
- **T-56-16** (Info disclosure, disk reads) — the test reads three repo-local source files and
  extracts only literal set members and export names. No secret, token or env value is read; the
  file has no `process.env` access.
- **T-56-SC** (Tampering, installs) — zero package-manager installs. `bun.lock` untouched;
  `lockfile-verify` passed on both commits.

## Self-Check: PASSED

Created file exists on disk:

- `supabase/functions/__tests__/premium-report-gate.test.ts` — FOUND

Both commits resolve in `git log`:

- `b4aabeaf2` test(56-04): add cross-source premium-report gate drift guard
- `54f0c6b40` test(56-04): record the two unexercised gate paths without repairing them

## Notes for Later Plans in Phase 56

- **56-05 / 56-07 must not break assertion 8.** Creating `/reports/tax-documents` and
  `/reports/year-end` is safe; changing either entry's `gatedReportType` in
  `reports-hub-entries.ts` is not. Probe 4 shows exactly how that fails.
- **Any new test placed under `supabase/functions/__tests__/`** is now collected by Vitest and
  typechecked by `tsc`, but is still **not** linted by `bun run lint`. Format it to tab-indent
  biome style by hand, or verify it with an isolated biome config as done here.
- **`supabase/functions/tests/`** (no underscores) remains the Deno test directory and is
  deliberately outside the new Vitest include pattern. Do not merge the two directories.
- **RPTHUB-03 is delivered by this plan**, but `REQUIREMENTS.md` was deliberately left untouched per
  the execution brief — the phase-level verifier marks it.
