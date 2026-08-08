---
phase: 66-rental-application-intake
plan: 16
subsystem: ui
tags: [tanstack-form, tanstack-query, prefill, intercepting-routes, rls, pii, conversion, non-vacuity]

# Dependency graph
requires:
  - phase: 66-09
    provides: "applicationQueries.detail, RentalApplicationRow, recordApplicationConversionMutationOptions and its ApplicationConversionResult — including the (false, 'already_converted') resolution that this plan had to treat as a success"
  - phase: 66-04
    provides: "record_application_conversion itself, which refuses a second conversion server-side; the UI relies on that guard rather than duplicating it"
  - phase: 66-01
    provides: "converted_tenant_id on rental_applications with on delete set null, so no deletion in either direction cascades"
provides:
  - "AddTenantForm initialValues + applicationId props, spread over addTenantFormOptions.defaultValues"
  - "applicationToTenantInitialValues — the single application -> tenant-form mapping, four keys"
  - "AddTenantFormValues and ApplicationPrefillSource types"
  - "ApplicationPrefillNotice — the non-blocking duplicate-tenant alert with both actions"
  - "tenantQueries.byEmail + TenantEmailMatch — owner-scoped case-insensitive applicant lookup"
  - "prefill assertions at BOTH /tenants/new call sites, in their own test files"
affects:
  - 66-15 (its approve control navigates to /tenants/new?application=<uuid>; this plan is the destination that consumes it)
  - 66-17 (E-21 asserts the href shape against the rendered DOM; the destination behaviour is pinned here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Spread a Partial<> prefill OVER a form's defaultValues rather than replacing them, so an absent key keeps its \"\" default instead of silently going uncontrolled"
    - "Gate a not-enabled query's wait on the parameter that enables it — `id !== \"\" && query.isPending` — because a disabled query is `isPending` forever"
    - "Assert merge-not-replace by TYPING into the omitted field and checking for React's uncontrolled-input warning; the resting DOM cannot tell the two apart"
    - "One test file per call site of a twin-rendered component, so dropping a prop on one turns exactly one file red"
    - "Escape LIKE metacharacters before an ilike lookup, then re-check the value exactly client-side so the pattern is a hint and never the decision"

key-files:
  created:
    - src/components/tenants/application-prefill-notice.tsx
    - src/components/tenants/__tests__/add-tenant-form-prefill.test.tsx
    - src/app/(owner)/tenants/new/page.test.tsx
  modified:
    - src/components/tenants/add-tenant-form.tsx
    - src/app/(owner)/tenants/new/page.tsx
    - src/app/(owner)/@modal/(.)tenants/new/page.tsx
    - src/app/(owner)/@modal/(.)tenants/new/page.test.tsx
    - src/hooks/api/query-keys/tenant-keys.ts

key-decisions:
  - "applicationToTenantInitialValues maps FOUR keys, not the plan's five: `name` is not a field on this form, it is derived in onSubmit from first + last, so it cannot be an initialValues key"
  - "A third test file was added for the direct-navigation page — the plan named only the modal's, which would have left the twin call site the pitfall warns about completely unasserted"
  - "tenantQueries.byEmail was added to tenant-keys.ts; there was no email lookup anywhere and CLAUDE.md forbids a string-literal query key at the call site"
  - "already_converted is logged and the normal success flow continues with NO toast of any kind, per the plan's explicit instruction; the owner still gets the create mutation's success toast and the /tenants redirect"
  - "Both pages pass applicationId as \"\" (not undefined) when there is no parameter, so the form's guard is `if (!applicationId)` and a test pins the empty-string case specifically"

requirements-completed: [APPLY-04]

# Metrics
duration: 22min
completed: 2026-08-08
---

# Phase 66 Plan 16: Approve → Convert Summary

**One prop, one mapper and two call sites that both prefill the tenant form from an application id alone — with the conversion recorded after the tenant exists, a repeat conversion treated as the benign event it is, and a repeat applicant warned about rather than blocked.**

## Performance

- **Duration:** ~22 min (11:47–12:09 CDT)
- **Tasks:** 3 of 3
- **Files created:** 3 · **modified:** 5

## Task Commits

1. **Task 1: the `initialValues` prop and BOTH call sites** — `9bfc6191a` (feat)
2. **Task 2: record the conversion and surface the duplicate-tenant case** — `e5f577da4` (feat)
3. **Task 3: prefill tests at BOTH call sites** — `d29e9f0d6` (test)

## The three questions this plan exists to answer

**Do both `/tenants/new` entry points prefill identically? Yes, and it is proven by mutation, not by inspection.** `src/app/(owner)/tenants/new/page.tsx` and `src/app/(owner)/@modal/(.)tenants/new/page.tsx` each read `searchParams.get("application")`, resolve the row through the same `applicationQueries.detail(id)` factory, map it through the same `applicationToTenantInitialValues`, and forward the result plus the id. Deleting `initialValues={initialValues}` from the modal fails **5 tests, all in the modal's own file**, and leaves the direct page's file green; deleting it from the direct page fails **5 tests, all in the direct page's file**, and leaves the modal's file green. That is the Pitfall 6 property stated as an experiment rather than an intention.

**Does the URL carry only the application UUID? Yes.** Both pages read exactly one parameter and nothing else; every applicant value is resolved server-side under RLS from that id. Both test files assert it with a positive control first — the id **is** in the parameters and **is** the value the row was looked up by — before asserting that the query string contains no email, no name and no phone. Without that ordering the assertion would pass just as happily against a URL with no parameters at all, which is the trap the non-vacuity requirement names.

**How is `already_converted` surfaced to the owner?** It is **not** surfaced as a failure. The branch logs at info level and falls through to the normal success flow: the create mutation's "Tenant created successfully" toast has already fired, and the owner lands on `/tenants` (or on the lease flow if they picked a property). No `toast.error`, no `toast.warning`, no throw. That is the plan's explicit instruction — "log it and continue to the normal success flow" — and it is what the RPC returning rather than raising exists to make possible. A genuine RPC failure is a different branch and does warn, naming both facts: *"Tenant created. The application could not be marked as converted — open the application and try again."* No rollback is attempted, because none is possible and discarding the tenant would be worse than an unrecorded link.

## Accomplishments

- **The prefill merges, never replaces.** `defaultValues: { ...addTenantFormOptions.defaultValues, ...initialValues }`. Under a replacement, a key the mapper omits becomes `undefined`, and `IconInputField` forwards `field.state.value` straight through with no `?? ""` — so the input goes uncontrolled and React warns mid-typing.
- **Four keys leave the application row, and the `tenants` schema was not widened.** `email`, `first_name`, `last_name`, `phone`. Address, income, employer and references stay on the swept application row; the test compares the full key set for **equality**, so a fifth key is a red suite rather than a second retention surface (T-66-51).
- **A stale, deleted or foreign id degrades to an empty form.** RLS returns nothing for another owner's application, so "not found" and "not yours" are the same `null` here, and neither leaks (T-66-52). Refusing to create a tenant because a query parameter went stale would be the worse outcome.
- **The disabled-query trap was avoided explicitly.** `applicationQueries.detail("")` is not enabled and therefore stays `isPending` forever; the wait is gated on `applicationId !== ""` so a plain `/tenants/new` visit renders the form rather than a skeleton that never resolves. This is the `isPending`/`isLoading` hazard in its less obvious direction, and it has its own test on both pages.
- **The duplicate-tenant notice has zero inert controls and both actions work.** The grep gate (`0` occurrences of the banned attribute) is backed by behaviour: the link's `href` is asserted, and the continue control is **clicked** — the notice must actually clear and the prefilled form must survive. An inert control passes a presence check and fails this one.
- **Conversion recording is scoped to an application id and nothing else.** With no id the mutation is never called, asserted **after** a positive control that the tenant really was created — otherwise the negative assertion is satisfied by a form that silently failed validation.
- **Both routes compile.** `next build` emits `/(owner)/tenants/new/page -> /tenants/new` and `/(owner)/@modal/(.)tenants/new/page -> /(.)tenants/new` with no `useSearchParams` prerender bailout. (The build then fails on the pre-existing `/blog/[slug]` page-data collection recorded in `deferred-items.md` — unrelated, unchanged, and out of scope.)

## Non-vacuity: ten mutants, ten killed — two only after the suite was strengthened

Every mutant was applied to a byte-identical copy of a committed module, the suite was run, and the module was restored and `diff`-verified identical before the next.

| # | Module | Mutant | Result |
|---|---|---|---|
| 1 | `add-tenant-form.tsx` | `defaultValues: initialValues` (replace, not merge) | **SURVIVED at first** → 1 failed after fix |
| 2 | `add-tenant-form.tsx` | mapper emits a fifth key | 3 failed |
| 3 | `add-tenant-form.tsx` | null phone maps to `undefined` | 1 failed |
| 4 | `add-tenant-form.tsx` | guard weakened to `applicationId === undefined` | **SURVIVED at first** → 1 failed after fix |
| 5 | `add-tenant-form.tsx` | `already_converted` raises an error toast | 1 failed |
| 6 | `add-tenant-form.tsx` | conversion call removed from `onSubmit` | 3 failed |
| A | `@modal/(.)tenants/new/page.tsx` | modal drops `initialValues` | 5 failed, **all in the modal's file** |
| B | `tenants/new/page.tsx` | direct page drops `initialValues` | 5 failed, **all in the direct page's file** |
| C | `application-prefill-notice.tsx` | the continue control made inert | **SURVIVED at first** → 2 failed after fix |
| D | `@modal/(.)tenants/new/page.tsx` | modal stops rendering the notice | 1 failed |

**Three survivors, and each one was a real hole:**

1. **Mutant 1 — the assertion the plan called load-bearing did not bear the load.** `defaultValues: initialValues` with `phone` omitted renders an input whose `value` prop is `undefined`. jsdom reports that input's value as `""`, exactly as a merged `""` default does, so `expect(phoneInput()).toHaveValue("")` passed against the mutant. The resting DOM genuinely cannot distinguish the two. The fix types into the field and asserts React logged no uncontrolled-input warning, with a positive control that the typing landed. Both call-site test files carry the same assertion.
2. **Mutant 4 — the guard was tested against a value neither page ever passes.** `if (!applicationId)` rewritten as `if (applicationId === undefined)` survived, because the original test simply omitted the prop. Both pages pass `searchParams.get("application") ?? ""`, i.e. the **empty string**, on every ordinary tenant creation — so the weakened guard would have marked an application whose id is `""` on every unrelated save. A test now pins `applicationId=""` specifically.
3. **Mutant C — "both actions are available" was asserted as presence, which an inert control satisfies.** The plan's own criterion says "each a real control"; presence is not that. The notice test now clicks the continue action and requires the notice to clear with the prefilled form intact.

All three are the same species: an assertion that reads true for the correct implementation *and* for a plausible wrong one.

## Verification

| Gate | Result |
|---|---|
| Task 1 automated gate (typecheck, biome, `initialValues` in all three modules, `addTenantFormOptions.defaultValues`, mapper in ≥3 files) | **PASS** — 4 files reference the mapper |
| Task 2 automated gate (typecheck, biome, `recordApplicationConversion`, `already_converted`, zero banned attribute in the notice) | **PASS** — 0 occurrences |
| Task 3 automated gate (both named test files) | **PASS** |
| `bun run test:unit` on all three new/extended files | **PASS** — 28 tests (11 + 10 + 7) |
| `bun run typecheck` (app + integration + e2e projects) | **PASS** |
| `bun run lint` | **PASS** — 1370 files |
| Full suite + coverage via lefthook pre-commit on all three commits | **PASS** — no `--no-verify` |
| `next build` compile + route emission for both `/tenants/new` variants | **PASS** (pre-existing `/blog/[slug]` failure unchanged) |
| FORMFIX-04 carry-forward block unedited | **PASS** — `git diff` shows no change inside it |

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] The mapper maps four keys, not five**

- **Found during:** Task 1.
- **Issue:** the plan's `<interfaces>` block names "the five prefilled keys" and then lists four plus a note that `name` "is derived by the form itself as it already is". `name` is not in `addTenantFormOptions.defaultValues` at all — it is not a form field, it is computed in `onSubmit` as `` `${first} ${last}`.trim() ``. A five-key `Partial<AddTenantFormValues>` is not expressible.
- **Fix:** the mapper returns four keys and the test asserts that exact set. The fifth prefilled **tenant column** still gets written, from `onSubmit`, unchanged.
- **Commit:** `9bfc6191a`

**2. [Rule 3 — Blocking] There was no tenant-by-email lookup anywhere**

- **Found during:** Task 2. The duplicate check needs `tenants` filtered by `lower(email)` within the owner's scope, and no such query existed. CLAUDE.md rule 9 forbids a string-literal query key at the call site, so it could not be inlined.
- **Fix:** added `tenantQueries.byEmail` + `TenantEmailMatch` to `src/hooks/api/query-keys/tenant-keys.ts` (not in the plan's `files_modified`). It escapes `\`, `%` and `_` before the `ilike` — an applicant-supplied address containing a wildcard would otherwise widen an equality check into a pattern match across the owner's whole tenant list — and then re-checks the returned address exactly, so the pattern is only a lookup hint. `.neq("status","inactive")` per the soft-delete rule; `.limit(1)`.
- **Note:** the file is now 340 lines, above CLAUDE.md's 300-line guidance and consistent with the rest of `query-keys/` (`application-keys.ts` is 565). Every function is under the 50-line cap. Flagged rather than silently accepted.
- **Commit:** `e5f577da4`

**3. [Rule 2 — Missing critical coverage] The direct-navigation call site had no test**

- **Found during:** Task 3.
- **Issue:** the plan names two test files, one of which covers the modal page. Nothing covered `src/app/(owner)/tenants/new/page.tsx`. Pitfall 6 is symmetric — a suite that pins only the intercepted route stays green while a bookmark or a refresh lands the owner on an empty form — so testing one twin and not the other reproduces the defect class in the other direction.
- **Fix:** added `src/app/(owner)/tenants/new/page.test.tsx`, the mirror of the modal's. Mutants A and B confirm the two files fail independently.
- **Commit:** `d29e9f0d6`

**4. [Rule 1 — Bug] Three assertions were true of the wrong implementation too**

- **Found during:** Task 3's mutation campaign (mutants 1, 4 and C above).
- **Fix:** described in full in the non-vacuity section. Two of the three were assertions the plan itself nominated as load-bearing, which is the argument for running the mutants rather than reasoning about them.
- **Commit:** `d29e9f0d6`

**5. [Rule 3 — Blocking] The modal test's mocks pointed at modules the page does not import**

- **Found during:** Task 3. The existing file mocked `#hooks/api/use-properties` and `#hooks/api/use-unit`; the page imports `#hooks/api/query-keys/property-keys` and `#hooks/api/query-keys/unit-keys`. The mocks were inert, so the page rendered a skeleton forever and the three accessibility tests were asserting against a loading state.
- **Fix:** replaced with a `useQuery` mock that dispatches on the real query key root (the `application-queue.test.tsx` convention from 66-13), keeping the `queryOptions()` factories real. The Dialog-title query moved from `getByText` to `getByRole("heading")` because the now-rendered form also has a control labelled "Add Tenant".
- **Commit:** `d29e9f0d6`

### Implementation discretion inside the plan's contract

1. **`already_converted` produces no toast at all.** The plan says "log it and continue to the normal success flow"; an informational toast would have been defensible but is unrequested UI, and the acceptance criterion is about the absence of a failure signal. The owner still sees the create-success toast and the redirect.
2. **Both pages pass `applicationId=""` rather than `undefined`** when there is no parameter, and the form's guard is `if (!applicationId)`. Mutant 4 exists because of this choice, and the empty-string case is now pinned.
3. **A `Suspense` boundary wraps each page's body.** The `(owner)` layout is already `force-dynamic`, so `useSearchParams` would not have bailed out, but `/leases/new` established the belt-and-braces shape for exactly this and the build confirms both routes emit cleanly.
4. **`ApplicationPrefillNotice` returns `null` once acknowledged**, so its inferred return type is `JSX.Element | null` rather than the plan's `React.JSX.Element`. Dismissal is what makes "continue creating a new tenant" a real action rather than a label.
5. **The duplicate lookup is keyed on `applicationQuery.data?.applicant_email`,** so it is only enabled once the application resolves and is never issued for an unprefilled form.
6. **New markup uses `flex flex-col gap-*`, never `space-y-*`** (phase-wide ban). Pre-existing `space-y-*` in files outside the lines this plan rewrote was left alone per the scope boundary.
7. **The plan's verify block writes `bun run test:unit -- --run <files>`.** The `test:unit` script already injects `--run`, and the duplicate flag makes CAC exit silently with no output. Tests were run without it. Recorded because the same line will be copied into later plans.

**Total:** 5 auto-fixed issues (3× Rule 1, 1× Rule 2, 2× Rule 3 — one issue spans two rules), 7 recorded discretionary choices. No Rule 4 architectural question arose. No package was installed.

## Threat Model Coverage

| Threat ID | Disposition | Status |
|---|---|---|
| T-66-51 | mitigate | **Done.** Four keys, asserted by full key-set equality in two separate tests, one of which feeds the mapper a deliberately wider row and requires the output to stay four keys. The `tenants` schema is untouched. |
| T-66-11 | mitigate | **Done.** One parameter, the UUID. Both call-site tests assert the id is present and is the lookup key *before* asserting the query string carries no applicant values. |
| T-66-52 | transfer | **Done as designed.** `applicationQueries.detail` resolves `null` for a foreign or missing id under RLS; both pages render an unprefilled form for that case, tested on both. The two cases are indistinguishable to the caller. |
| T-66-20 | mitigate | **Done.** The RPC refuses the second conversion; the UI treats `already_converted` as success and does not retry. Mutant 5 confirms an error-toast implementation fails the suite. |
| T-66-53 | mitigate | **Done.** Zero occurrences of the banned attribute in the notice (gated by grep) *and* a behavioural test that clicks the continue action; mutant C proves the grep alone was not enough. |
| T-66-54 | mitigate | **Done.** Mutants A and B: dropping the prop at one call site fails only that call site's own test file. |
| T-66-SC | mitigate | **Done.** Zero packages installed. |

### Threat flags

None. This plan adds no network endpoint, no auth path, no file access and no schema change. `tenantQueries.byEmail` is a new read over an existing RLS-protected table, owner-scoped by the same policy as every other tenant read, and it returns two fields.

## Issues Encountered

`next build` fails locally at page-data collection for `/blog/[slug]`, exactly as recorded in `deferred-items.md` by plan 66-13 and attributed there to the missing local `.env.local` app vars. Unchanged by this plan, unrelated to it, and the compile stage — where a defect in these files would surface — succeeded and emitted both `/tenants/new` route variants.

Three untracked paths (`.agents/`, `.github/instructions/`, `skills-lock.json`) were present before this plan started and are unrelated to it. They were not staged, not modified and not removed.

## Next Phase Readiness

- **66-15 owns the only inbound link.** Nothing in `src/` currently navigates to `/tenants/new?application=<uuid>` — the approve control on the application detail page is plan 66-15's, and its own gate asserts the href shape. This plan is the destination and is complete and reachable the moment that control ships; both entry points work today if the URL is typed or bookmarked.
- **66-17's E-21** asserts `^/tenants/new\?application=[0-9a-f-]{36}$` against the rendered DOM. The destination side of that contract — one parameter, resolved under RLS, no PII — is pinned here in two unit files.
- **Anyone editing either `/tenants/new` page:** they are twins and each has its own test file. A change to one that is not made to the other fails exactly one suite, by design. Both files carry a header comment naming the other by path.
- **Anyone adding a field to the prefill:** `applicationToTenantInitialValues`'s key set is asserted for equality. Adding a key fails three tests, deliberately — a new key means applicant data landing on a table outside the 730-day sweep, which needs a decision, not a patch.

No blockers.

## Known Stubs

None. Every symbol added has a complete implementation backed by a real RPC, a real RLS-protected read, or real form state. No placeholder values, no mock data sources, no unwired components. `ApplicationPrefillNotice` is rendered from both pages with live query data.

## Self-Check: PASSED

**Files verified present on disk:**

- `src/components/tenants/add-tenant-form.tsx` — MODIFIED, 279 lines (under the 300 cap), `initialValues` + `applicationId` + mapper present
- `src/components/tenants/application-prefill-notice.tsx` — FOUND, 67 lines, 0 occurrences of the banned attribute
- `src/app/(owner)/tenants/new/page.tsx` — MODIFIED, prefill + notice + `applicationId`
- `src/app/(owner)/@modal/(.)tenants/new/page.tsx` — MODIFIED, same three
- `src/hooks/api/query-keys/tenant-keys.ts` — MODIFIED, `byEmail` + `TenantEmailMatch`
- `src/components/tenants/__tests__/add-tenant-form-prefill.test.tsx` — FOUND, 11 tests
- `src/app/(owner)/@modal/(.)tenants/new/page.test.tsx` — MODIFIED, 10 tests
- `src/app/(owner)/tenants/new/page.test.tsx` — FOUND, 7 tests
- `.planning/phases/66-rental-application-intake/66-16-SUMMARY.md` — FOUND

**Commits verified in `git log`:** `9bfc6191a`, `e5f577da4`, `d29e9f0d6`

**Branch:** `gsd/phase-66-rental-application-intake` — verified before the first commit; never `main`. No worktree created, no `git reset`, no `git clean`, no `git stash`, no `--no-verify`.

---
*Phase: 66-rental-application-intake*
*Completed: 2026-08-08*
