---
phase: 56
plan: 07
subsystem: reporting-hub
tags: [deletion, redirects, rpthub-02, rpthub-04, d-09, d-32, d-41, d-44, destructive]
requires:
  - REPORTING_REDIRECTS
  - "the five /reports/* statement routes (56-05)"
  - "the reports-hub e2e gate green in CI (56-06 + PR #957 e2e-smoke)"
provides:
  - "the 7-entry redirect map served as 308s from next.config.ts"
  - "17 live redirect assertions in the public Playwright project CI runs"
affects:
  - next.config.ts
  - src/lib/routes/private-routes.ts
  - "src/app/(owner)/financials/ — DELETED"
tech-stack:
  added: []
  patterns:
    - "compile-only next build (--experimental-build-mode compile) to obtain .next/routes-manifest.json when the full build cannot complete locally"
    - "manifest-level guard check: assert map sources present AND guard paths absent, proven against a synthetic leaked-entry probe"
key-files:
  created:
    - tests/e2e/tests/public/reporting-redirects.spec.ts
  modified:
    - next.config.ts
    - src/lib/routes/private-routes.ts
    - .planning/phases/56-reporting-hub-documents-landing/deferred-items.md
  deleted:
    - "src/app/(owner)/financials/ (44 files)"
decisions:
  - "D-41's per-component disposition was OVERRIDDEN with evidence: all six financials-* components are DELETED, not moved. Its 'financials-summary-stats has a second consumer' premise is provably false — that reference is a code comment."
  - "The task-2 verify command (SKIP_ENV_VALIDATION=true bun run build) exits 1 on a pre-existing /blog/[slug] env failure, proven identical at HEAD with this plan's change reverted. Substituted --experimental-build-mode compile, which exits 0 and produces the artifact actually under test."
  - "Task 3's playwright run was DECLINED: the webServer command begins `rm -rf .next && rm -f .env.local`. Registration and selection proven by --list under CI's exact three-project invocation; execution is CI's."
  - "The 17 assertions are written out literally rather than loop-generated, so the `grep -c maxRedirects >= 17` criterion is a real check rather than one defeated by parameterisation."
metrics:
  duration: ~40 min
  completed: 2026-07-31
---

# Phase 56 Plan 07: Legacy Deletion + Redirect Wiring Summary

The `/financials` tree is gone, its six URLs plus the one outbound `/reports/analytics` entry are
served as 308s from `next.config.ts`, and 17 live assertions covering the 7 positives and both guard
sets are registered in the `public` Playwright project CI actually runs.

## What Was Built

| Task | Artifact | Commit |
|------|----------|--------|
| 1 | 44 files deleted + `"/financials"` removed from `PRIVATE_ROUTE_PREFIXES` | `51192fdf0` |
| 2 | `REPORTING_REDIRECTS` spread into `next.config.ts` `redirects()` | `4d0c39526` |
| 3 | `tests/e2e/tests/public/reporting-redirects.spec.ts` (229 lines, 17 tests) | `e2c2fa1d9` |

### The RPTHUB-04 gate, discharged

56-06's SUMMARY and STATE.md both said the hub E2E spec had never run and that this plan must not
delete anything on 56-06's completion alone. **That is now out of date.** PR #957's `e2e-smoke` job
executed the spec: **PASS in 3m53s, 88 passed + 1 skipped = 89 tests**, and a local `--list` under
CI's exact `--project=smoke --project=public --project=owner-axe` selection resolves to the same 89
tests in 9 files, 9 of them `reports-hub`. The hub spec contains zero skips; the single skip is a
conditional in `critical-paths`/`seo-smoke`. All 8 hub routes render for an authenticated owner, so
the ordering guarantee — prove the hub, then remove the legacy tree — is satisfied in the commit
graph rather than asserted.

### Task 1 — the deletion

`git rm -r 'src/app/(owner)/financials'`. **44 files, not the plan's stated 45** (see "Acceptance
Criteria NOT Met" below): `page.tsx`, `layout.tsx`, the six `financials-*.tsx` shared components, and
the five statement route trees whose copies 56-05 placed under `/reports/*`.

Then exactly one line removed from `src/lib/routes/private-routes.ts` — `"/financials",` at line 12.
`git diff --numstat` on that file is `0	1`: zero insertions, one deletion. `"/analytics"` and
`"/reports"` both survive, each at count 1, which is the mitigation for T-56-25 — the highest-
consequence line in this phase's diff, because that one array gates owner routes in **both**
`proxy.ts` and `robots.ts`. `src/app/robots.test.ts` imports the array rather than duplicating it and
needed no edit: **7 passed**.

**No orphan cleanup was required.** `bun run typecheck` exited 0 on the first run after deletion.
Nothing outside the deleted tree imported anything inside it — verified by an import-statement grep
before deleting, not assumed. Every external `/financials` reference is an href string or a test
path, all of which belong to 56-08.

#### D-41's per-component disposition was OVERRIDDEN, with evidence

D-41 directed that `financials-summary-stats.tsx` "STAYS PUT" because it has "a second live consumer
(`expenses/_components/expense-stats.tsx`) that is NOT in this phase's scope." **That premise is
false.** The mandated verification grep returns:

```
src/app/(owner)/financials/page.tsx:13:import { FinancialsSummaryStats } from "./financials-summary-stats";
src/app/(owner)/financials/page.tsx:67:			<FinancialsSummaryStats
src/app/(owner)/financials/financials-summary-stats.tsx:30:interface FinancialsSummaryStatsProps {
src/app/(owner)/financials/financials-summary-stats.tsx:39:export function FinancialsSummaryStats({
src/app/(owner)/financials/financials-summary-stats.tsx:46:}: FinancialsSummaryStatsProps) {
src/app/(owner)/financials/expenses/_components/expense-stats.tsx:12:// Match financials-summary-stats: dollars, two decimals, no /100 mis-conversion.
src/app/(owner)/reports/expenses/_components/expense-stats.tsx:12:// Match financials-summary-stats: dollars, two decimals, no /100 mis-conversion.
```

The declaration, the import, two usages — and **two code comments, not one.** The plan's grep
specification predicted a single comment; the second is in 56-05's copy of the same file under
`/reports/expenses/`, which did not exist when the plan was written. Both are comments; neither is an
import. `expense-stats.tsx` duplicates the `formatUsd` helper locally and imports nothing from the
file. Since the second comment is an expected artifact of an intervening plan rather than an
unexpected consumer, this did not meet the plan's "if it returns anything else, STOP" bar — but it is
recorded so the discrepancy is auditable.

With no second consumer, D-41's own stated principle applies unchanged: deleting `financials/page.tsx`
leaves **all six** components with zero importers, so moving any of them would ship dead files.
`grep -rnE 'FinancialsSummaryStats|FinancialsQuickLinks|FinancialsHighlights|FinancialsHeader|FinancialsLoading|FinancialsError' src tests`
now returns **0**.

### Task 2 — the wiring

`REPORTING_REDIRECTS` imported with a relative specifier (`next.config.ts` cannot use the `#lib/*`
subpath alias) beside the `blog-redirects` import, and spread into `redirects()` after the existing
entries with `permanent: true` applied uniformly at the spread site. No `filterActiveRedirects` —
that exists only because the blog map is build-time-filtered against a live Supabase slug set.

The diff is **+23 / -0**, purely additive. All 5 pre-existing literal entries are byte-unchanged,
including the `permanent: false` `/.well-known/change-password` entry and its method-preservation
comment; `fetchPublishedBlogSlugs` and the blog-map spread are untouched. `experimental.useTypeScriptCli`
is intact (count 2 — the flag plus its explanatory comment). `grep -c 'rewrites' next.config.ts`
returns **0**: RPTHUB-02 routes redirects through `redirects()` only, with no proxy involvement.

### Task 3 — the live assertions

17 tests in `tests/e2e/tests/public/reporting-redirects.spec.ts`, `dirname` exactly
`tests/e2e/tests/public`. Every test title carries the `RPTHUB-02` tag so `-g "RPTHUB-02"` selects
them and nothing else.

7 positive assertions, each two checks: status in `[301, 308]` and an exact `location` header. Entry
7 gets its own clearly-named test recording that it is the ONE redirect pointing away from the hub,
plus the chain assertion that its `location` is **not** bare `/analytics` — targeting `/analytics`
would produce a 308 then 307 chain, because `src/app/(owner)/analytics/page.tsx` in-page-redirects to
`/analytics/overview`.

Guard A (3) and Guard B (7) assert `expect([301, 308]).not.toContain(status)` rather than 200 or 404,
which is auth-independent: these routes are gated, so an anonymous request legitimately receives a
307 to `/login`. No `location` assertion is made on a guard — the point is the absence of a permanent
redirect, not what a 307 points at. `/analytics/financial` has its own named test as Guard B's
highest-risk member.

The header comment carries the trailing-slash gotcha (Next auto-injects `/:path+/ -> /:path+` as the
first redirect, so every assertion uses the slash-less form) and the note that this file's
`/financials/*` strings are **URLs under test, not live links**, expected to survive the sweep
alongside the map and its unit test.

## Verification Results

Every figure below is quoted from command output run this session.

| Check | Result |
|-------|--------|
| `bun run typecheck` | exit 0 (silent), run after each task |
| `bun run lint` | exit 0 — "Checked 1334 files in 171ms. No fixes applied." |
| `bun run test:unit` (full suite) | exit 0 — **308 files, 106181 tests passed** (was 310 / 112160 — the two duplicated colocated tests died with the legacy tree) |
| 56-03 purity guard | **31 passed (31)** — D-34 and the D-18 exemption both intact |
| 56-02 redirect-map suite | **20 passed (20)** |
| `src/app/robots.test.ts` | **7 passed (7)** |
| `test ! -d 'src/app/(owner)/financials'` | PASS |
| deletions in commit `51192fdf0` | **44** |
| `git diff --numstat src/lib/routes/private-routes.ts` | `0	1` — 1 deleted line, 0 added |
| `grep -c '"/analytics"'` / `'"/reports"'` / `'"/financials"'` in private-routes | **1 / 1 / 0** |
| `git status --porcelain` on proxy.ts, middleware.ts, analytics/, shell/, breadcrumbs.ts, ledger/, e2e constants, REQUIREMENTS.md | **empty** |
| `grep -c 'REPORTING_REDIRECTS' next.config.ts` | **2** (import + spread) |
| `grep -c 'rewrites' next.config.ts` | **0** |
| `grep -c 'useTypeScriptCli' next.config.ts` | **2** (still present) |
| `git diff --numstat next.config.ts` | `23	0` — purely additive |
| `grep -c 'maxRedirects'` in the new spec | **18** (17 tests + 1 header mention), criterion ≥17 |
| `grep -c '/analytics/financial'` in the new spec | **4**, criterion ≥1 |
| the five `/reports/*` statement trees survive | all 5 `page.tsx` present; 48 files under `/reports` |

### The compiled routes manifest (T-56-26 / T-56-27 / T-56-28)

`.next/routes-manifest.json`, produced this session, checked by a throwaway script since deleted:

```
total redirect sources in manifest: 139
map sources present: 7/7
guard paths leaked: 0/10
destinations exact: 7/7
map entry status codes: [308,308,308,308,308,308,308]
PASS — all 7 map sources present, 0 guard paths leaked
```

The seven entries as compiled, with their generated regexes:

```
/financials                   -> /reports                   | 308 | ^(?!/_next)/financials(?:/)?$
/financials/balance-sheet     -> /reports/balance-sheet      | 308 | ^(?!/_next)/financials/balance-sheet(?:/)?$
/financials/cash-flow         -> /reports/cash-flow          | 308 | ^(?!/_next)/financials/cash-flow(?:/)?$
/financials/expenses          -> /reports/expenses           | 308 | ^(?!/_next)/financials/expenses(?:/)?$
/financials/income-statement  -> /reports/income-statement   | 308 | ^(?!/_next)/financials/income-statement(?:/)?$
/financials/tax-documents     -> /reports/tax-documents      | 308 | ^(?!/_next)/financials/tax-documents(?:/)?$
/reports/analytics            -> /analytics/overview         | 308 | ^(?!/_next)/reports/analytics(?:/)?$
```

Both-ends-anchored, confirming D-32's ordering non-issue. The first manifest entry is Next's
auto-injected `{"source":"/:path+/","destination":"/:path+","statusCode":308}`, which is the
trailing-slash gotcha the spec's header records.

The compiled app paths confirm the deletion landed and the hub survived: `grep -c 'financials'
.next/server/app-paths-manifest.json` returns **0**, and all 8 `/(owner)/reports/**/page` keys are
present.

**The check script was proven to detect, not merely to run.** Fed a synthetic manifest containing the
stale `/analytics/financial -> /reports/analytics` entry, it exited **1** and reported
`LEAKED guard paths: [ '/analytics/financial' ]` — the exact 2026-07-30 inversion hazard. Both the
script and the probe fixture were deleted afterwards.

### Playwright selection (proven by `--list`, never executed locally)

| Invocation | Result |
|---|---|
| `--project=public -g "RPTHUB-02" --list` | **17 tests in 1 file**, all 17 enumerated by name |
| `--project=public --list` | **77 tests in 5 files** (was 60 in 4) |
| `--project=smoke --project=public --project=owner-axe --list` (CI's exact selection) | **106 tests in 10 files** (was 89 in 9) — exactly +17, +1 file |
| `--project=chromium / owner / owner-axe / smoke / firefox --list` | **0** matches each — no double-execution |

`.env.local` stat is byte-identical before and after every command: `1204 1784342884 50572079`, same
inode.

## Acceptance Criteria NOT Met As Literally Written

Four, reported with evidence rather than reworded to pass.

### 1. Task 2's `<verify>` command exits 1 — on a pre-existing failure, proven

`SKIP_ENV_VALIDATION=true bun run build` compiles successfully, finishes TypeScript, then dies:

```
Collecting page data using 17 workers ...
TypeError: Cannot read properties of undefined (reading 'includes')
> Build error occurred
Error: Failed to collect page data for /blog/[slug]
```

**Proven pre-existing rather than assumed.** The wired `next.config.ts` was copied aside,
`git checkout -- next.config.ts` restored HEAD, and the same command was re-run: **identical failure,
same route, same TypeError.** The file was then restored (`grep -c 'REPORTING_REDIRECTS'` back to 2).
This is 56-05's deferred item 4 — `/blog/[slug]`'s `generateStaticParams` opens an anon-key Supabase
client at build time and `.env.local` lacks the app vars. `.env.local` was never edited.

Because the build aborts before writing it, `.next/routes-manifest.json` — **the artifact the task's
own comment says is under test** — is not produced by the full build locally.

**Substituted:** `SKIP_ENV_VALIDATION=true bunx next build --experimental-build-mode compile`, which
exits **0** and writes the manifest. Compile-only mode skips exactly the page-data collection step
that hits the missing env. This satisfies the criterion's substance — the manifest results are quoted
above — while the literal command's exit code remains 1 for reasons this plan did not cause. The
workaround is recorded in `deferred-items.md` so later plans do not re-derive it.

`next build` also rewrote `next-env.d.ts` (flipping `./.next/dev/types/routes.d.ts` to
`./.next/types/routes.d.ts`, and back). Reverted with `git checkout -- next-env.d.ts`; never staged.

### 2. Task 3's `<verify>` command and its full-project criterion were DECLINED, not run

`bunx playwright test --config tests/e2e/playwright.config.ts --project=public [-g "RPTHUB-02"]`
was **not executed**. `tests/e2e/playwright.config.ts:284-286`'s `webServer` command, in both
branches, begins:

```
rm -rf .next && rm -f .env.local && bash -c "..."
```

`.env.local` is gitignored and unrecoverable, and nothing was listening on :3050 so
`reuseExistingServer` would not have applied — the deletion would have happened. The execution
directive forbids this explicitly and 56-06 refused on the same grounds. `--list` is safe and was
proven non-destructive by the stat check above.

**What was proven instead:** the spec is selected by the `public` project, `-g "RPTHUB-02"` resolves
to exactly its 17 tests, it appears in CI's exact three-project invocation (+17 over the 89 that
`e2e-smoke` ran on PR #957), and it leaks into no other project. **What was NOT proven: that any of
the 17 assertions passes against a served response.** Registration guarantees execution, not success.
CI's `e2e-smoke` on the next push is the verification source, exactly as it was for 56-06's gate.

### 3. Task 1 deletes 44 files, not the plan's stated 45

The plan's objective says "45 files deleted"; its Task 1 action says "the entire directory ... — all
45 files". `find 'src/app/(owner)/financials' -type f | wc -l` returned **44** before deletion, and
the commit deletes 44 (`git diff --diff-filter=D --name-only HEAD~1 HEAD | wc -l`). The composition
matches the plan's enumeration exactly — `page.tsx`, `layout.tsx`, six `financials-*.tsx`, five
statement route trees. The plan's figure is off by one; nothing was left behind, and the directory is
gone.

### 4. `grep -c 'maxRedirects' >= 17` initially returned 11 — fixed by expanding, not by rewording

The first draft generated Guard A and Guard B from two `for...of` loops. That produces the correct 17
tests in `--list`, but `grep -c` counts lines, so the token appeared 11 times and the criterion
failed. The spec was rewritten with all 17 assertions written out literally, matching the mandated
analog `routing-aliases.spec.ts`. Count is now **18** (17 tests plus one mention in the header
comment). This is the criterion being met by changing the implementation, not the criterion — and the
literal form is strictly better here, since each of the 17 paths is independently named in the CI
report and greppable in the file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The task-2 verify command cannot produce its own artifact under test**

- **Found during:** Task 2 verification
- **Issue:** `SKIP_ENV_VALIDATION=true bun run build` exits 1 in `/blog/[slug]` page-data collection
  and never writes `.next/routes-manifest.json`.
- **Fix:** used `--experimental-build-mode compile`, which exits 0 and writes the manifest. Confirmed
  the failure is pre-existing by reproducing it at HEAD with this plan's `next.config.ts` change
  reverted.
- **Files modified:** none
- **Commit:** n/a (invocation-level)

**2. [Rule 1 - Bug] Loop-generated guard tests defeated the spec's own grep criterion**

- **Found during:** Task 3 acceptance-criteria run
- **Issue:** `grep -c 'maxRedirects'` = 11 against a criterion of ≥17.
- **Fix:** expanded both guard loops into 10 literal tests.
- **Files modified:** `tests/e2e/tests/public/reporting-redirects.spec.ts`
- **Commit:** `e2c2fa1d9` (pre-commit — the loop form was never committed)

**3. [Rule 3 - Blocking] `next build` left a modified `next-env.d.ts`**

- **Found during:** Task 2
- **Issue:** the generated reference flipped between the dev and prod routes types.
- **Fix:** `git checkout -- next-env.d.ts`; typecheck re-run clean afterwards. Same condition 56-05
  hit.
- **Files modified:** none, net
- **Commit:** n/a — reverted, never staged

### Deliberate Overrides

**D-41's per-component disposition.** Documented in full above with the verification grep. Five of
the six were already directed to MOVE + RENAME by D-41 and one to STAY PUT; all six are DELETED
instead, because `financials/page.tsx` was the sole importer of every one of them and the `/reports`
index is a new composition (56-01/56-03) that needs no mount point for any of them. The plan's own
action text mandates this override and supplies the per-component reasoning; it is recorded here so
the deviation from the locked CONTEXT decision is auditable rather than silent.

### Deliberately NOT Done

**`requirements.mark-complete` was not run.** `.planning/REQUIREMENTS.md` is unmodified
(`git status --porcelain` empty on it), per the execution directive and consistent with 56-01 through
56-06. RPTHUB-02 is not fully delivered until 56-08 clears the remaining nav/palette/breadcrumb
references; the phase verifier marks requirements after 56-08.

**No repo-wide `/financials` count was asserted.** The plan forbids it and the reason holds: after
this plan, `grep -rn '/financials' src tests | grep -v 'reporting-redirects'` returns **39** lines
across 10 files, every one of them 56-08's. The plan predicted 36; the extra 3 are comment lines
added by 56-06 after 56-02 took its 48-line baseline (`tests/e2e/tests/reports-hub.spec.ts` ×2,
`tests/e2e/playwright.config.ts` ×1). 48 − 12 (this plan's) + 3 = 39. The arithmetic closes exactly.

Breakdown of the 39, all outside this plan's file list:

| File | Lines |
|---|---|
| `src/lib/__tests__/breadcrumbs.test.ts` | 12 |
| `src/components/shell/main-nav.tsx` | 5 |
| `src/components/shell/app-shell.tsx` | 5 |
| `tests/e2e/tests/constants/routes.ts` | 4 |
| `src/lib/__tests__/auth-redirect.test.ts` | 3 |
| `src/components/shell/__tests__/main-nav.test.tsx` | 3 |
| `tests/e2e/tests/reports-hub.spec.ts` | 2 |
| `src/app/(owner)/analytics/financial/page.tsx` | 2 |
| `src/app/(owner)/analytics/financial/_components/breakdown-list.test.tsx` | 2 |
| `tests/e2e/playwright.config.ts` | 1 |

**The three permanent holders are intact and correctly named.** `grep -rl '/financials' src tests |
grep 'reporting-redirects'` returns exactly the map, its unit test, and this plan's new spec, and
`grep -c 'source: "/financials' src/lib/seo/reporting-redirects.ts` still returns **6** — the
companion bound that keeps 56-08's `grep -v` filter honest.

**`tests/e2e/tests/owner/owner-financials.e2e.spec.ts` was not touched.** It still navigates to
`ROUTES.FINANCIALS_*`, which now 308 to their hub equivalents. It compiles (the constants still
exist), and the `owner` project is never invoked by CI (D-25), so it gates nothing either way.
`tests/e2e/tests/constants/routes.ts` is explicitly on this plan's must-not-touch list.

## Deferred Issues

Appended to `deferred-items.md` as items 5 and 6:

1. Item 3 (doubled colocated tests) is **resolved** by this deletion — suite went 310 → 308 files.
   Threat T-56-20 closed.
2. Item 4 (`next build` cannot complete locally) is **confirmed pre-existing** and now carries the
   `--experimental-build-mode compile` workaround plus the `next-env.d.ts` revert note.
3. Item 2's orphan table re-verified post-deletion and extended: `reportAnalyticsQueries.paymentAnalytics`
   loses its last production consumer when 56-08 applies D-37 to `src/lib/reports/report-data.ts:381`;
   `DateRangeSelector` and `getDefaultDateRange` have zero importers **and** zero test coverage, making
   them the only orphans deletable without also deleting tests. The four `use-reports` hooks still back
   roughly 1100 lines of live test file, so removing them remains a deliberate change rather than a
   sweep. None is a build error — `noUnusedLocals` does not flag unused exports.

## Known Stubs

None. The plan is a deletion, a 23-line configuration addition and a test file with 17 real
assertions against real paths. Nothing is hardcoded-empty, no placeholder copy was introduced, no
component was left unwired.

**Not a stub, but an honest limitation:** the 17 E2E assertions have never executed. They are
registered in the project CI runs and proven selectable, but their first real run is `e2e-smoke` on
the next push. The manifest check above is the independent evidence that the wiring is correct —
it proves all 7 sources compiled to 308s with exact destinations and 0 guard leaks, which is what the
7 positive and 10 guard assertions test at HTTP level.

## Threat Model Disposition

| Threat | Disposition | Evidence |
|---|---|---|
| T-56-25 EoP — removing `"/analytics"` instead of `"/financials"` | **mitigated** | `git diff --numstat` on `private-routes.ts` is `0	1`; `grep -c` returns `/analytics` 1, `/reports` 1, `/financials` 0. `robots.test.ts`, which imports the same array, is **7 passed**. `git status --porcelain src/proxy.ts src/lib/supabase/middleware.ts` empty. |
| T-56-26 DoS — a Guard A identity redirect | **mitigated at 3 layers** | 56-02's unit equality assertion (20 passed); the compiled-manifest check (`guard paths leaked: 0/10`, covering all three); 3 live E2E assertions registered in the `public` project. |
| T-56-27 tampering — stale `/analytics/financial` entry | **mitigated and proven** | The manifest check reports 0 guard leaks, and was **proven to detect** this exact entry: a synthetic manifest carrying it exited 1 with `LEAKED guard paths: [ '/analytics/financial' ]`. Plus its own named E2E guard test. |
| T-56-28 spoofing / open redirect | **mitigated** | All 7 destinations are compile-time literals under `/reports` or `/analytics`, both still in `PRIVATE_ROUTE_PREFIXES`. No source is parameterised — every compiled regex is both-ends-anchored (`^(?!/_next)/financials/cash-flow(?:/)?$`). `grep -c 'rewrites' next.config.ts` = **0**. |
| T-56-29 information disclosure — deleted tree | **mitigated** | Dropping `"/financials"` shrinks the robots disallow list, but the routes no longer exist (`grep -c 'financials' .next/server/app-paths-manifest.json` = 0) and every legacy URL now 308s to an auth-gated `/reports/*` equivalent. The 7 positive assertions prove redirect-not-404. |
| T-56-30 repudiation — deletion before proof | **mitigated** | PR #957's `e2e-smoke` ran the 56-06 hub spec green (89 tests, 3m53s) **before** commit `51192fdf0` deleted anything. 56-05 copied rather than moved, so both trees were live throughout the proof. The ordering is auditable in the commit graph, which is RPTHUB-04. |
| T-56-SC tampering — package installs | **n/a** | Zero package-manager commands. `bun.lock` untouched; `lockfile-verify` passed on all three commits. |

## Threat Flags

None. No network endpoint, auth path, file access pattern or schema change was introduced. The one
security-relevant edit — removing a prefix from `PRIVATE_ROUTE_PREFIXES` — **reduces** surface rather
than expanding it: the routes it gated no longer exist, and their URLs now resolve to paths that are
still gated.

## Self-Check: PASSED

Created file exists on disk:

- `tests/e2e/tests/public/reporting-redirects.spec.ts` — FOUND (229 lines, 17 tests)

Deleted directory confirmed absent:

- `src/app/(owner)/financials/` — ABSENT (`test ! -d` succeeds)

All three commit hashes resolve in `git log`:

- `51192fdf0` feat(56-07): delete the legacy financials route tree — 45 files (44 D, 1 M)
- `4d0c39526` feat(56-07): wire the 7-entry reporting redirect map into next.config.ts — 1 file, +23
- `e2c2fa1d9` test(56-07): add the 17 live reporting-redirect assertions — 1 file, +229

`.env.local` verified unmodified: stat `1204 1784342884 50572079` identical before and after every
command run this session.

## Notes for 56-08

- **The 39 remaining `/financials` matches are enumerated above by file.** Expect 39, not the 36 the
  plans predicted — the extra 3 are 56-06 comment lines. Do not "fix" the discrepancy by deleting
  56-06's comments; they explain the gate.
- **Keep the `grep -v 'reporting-redirects'` filter and its companion bound.** All three permanent
  holders are in place and the map still holds all 6 legacy sources. Renaming any of the three breaks
  the sweep.
- **`tests/e2e/tests/constants/routes.ts` still carries 4 `FINANCIALS_*` keys and `REPORTS_ANALYTICS`,
  all pointing at deleted routes.** `owner/owner-financials.e2e.spec.ts` consumes the four. That spec
  is superseded by `reports-hub.spec.ts` and runs in the `owner` project CI never invokes — deleting
  it and its constants together is the clean move, and it is 56-08's file to touch, not this plan's.
- **D-37's edit is now the last consumer of `paymentAnalytics` in production code.** After
  `src/lib/reports/report-data.ts:381` goes, the query has only test consumers. See deferred item 6.
- **Do not remove `experimental.useTypeScriptCli` from `next.config.ts`.** TypeScript 7 is the
  Go-native compiler and ships no JS compiler API; without the flag `next build` exits 1 before it
  reaches anything else.
- **If you need `.next/routes-manifest.json`, use `--experimental-build-mode compile`.** The full
  build cannot complete in this working copy and the reason is environmental, not a code defect.
