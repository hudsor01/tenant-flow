---
phase: 66-rental-application-intake
plan: 09
subsystem: api
tags: [tanstack-query, postgrest, supabase, typed-mappers, zod, query-keys, rls, pagination]

# Dependency graph
requires:
  - phase: 66-01
    provides: "the two tables, their column contract, the status/disposition CHECK vocabularies, and the deliberate absence of any INSERT or UPDATE policy that makes the RPCs the only write path"
  - phase: 66-02
    provides: "APPLICATION_STATUSES, ApplicationStatus and DispositionReasonValue in src/lib/applications/application-copy.ts"
  - phase: 66-04
    provides: "the five owner-callable RPCs this layer wraps: create_application_link, revoke_application_link, set_application_status, set_application_notes, record_application_conversion"
  - phase: 66-06
    provides: "the applied migration and the regenerated src/types/supabase.ts, so both new tables and all eight functions are real generated types rather than aspirational ones"
provides:
  - "applicationQueries.list / .detail, applicationKeys, mapRentalApplicationRow, mapRentalApplicationSummaryRow, isAnonymized, APPLICATIONS_PAGE_SIZE"
  - "setApplicationStatus / setApplicationNotes / recordApplicationConversion / deleteApplication mutation options, each taking a QueryClient"
  - "applicationLinkQueries.byUnit, applicationLinkKeys, mapApplicationLinkRow, applicationLinkState, applicationLinkUrl, DEFAULT_LINK_EXPIRY_DAYS"
  - "createApplicationLink / revokeApplicationLink mutation options"
  - "mutationKeys.applications — the six-entry owner write inventory"
affects:
  - 66-13 (owner queue + detail pages read applicationQueries and call four of the mutations)
  - 66-14 (link panel reads applicationLinkQueries and calls both link mutations)
  - 66-15 (decline dialog calls setApplicationStatus with a disposition reason)
  - 66-16 (conversion flow calls recordApplicationConversion and must branch on success)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Derive the row type from the generated table Row via Omit/Pick plus a narrowed enum field, instead of hand-writing a parallel interface (CLAUDE.md rule 3 applied to a 41-column table)"
    - "A distinct Pick<> summary row type for a list query that selects a subset of columns, so the unselected columns are a compile error rather than a silent null"
    - "Exhaustive split mappers: Pick<T, K> + Omit<T, K> return types make a forgotten field a compile error while keeping each function under the 50-line cap"
    - "Surface a returned-reason RPC outcome as a resolved mutation result, not a thrown error"
    - "Prove test non-vacuity by mutation: break the module deliberately, confirm the suite goes red, restore byte-identically"

key-files:
  created:
    - src/hooks/api/query-keys/application-keys.ts
    - src/hooks/api/query-keys/application-link-keys.ts
    - src/hooks/api/query-keys/__tests__/application-keys.test.ts
    - src/hooks/api/query-keys/__tests__/application-link-keys.test.ts
  modified:
    - src/hooks/api/mutation-keys.ts

key-decisions:
  - "ApplicationListPage.rows is ApplicationSummaryRow[], not RentalApplicationRow[] — the plan's stated contract would have been a type lie for the thirty columns the queue does not select"
  - "Two mappers, not one: a single strict mapper cannot serve both an eleven-column list select and a select('*') detail read without either over-fetching PII or fabricating nulls"
  - "occupant_count is excluded from the queue select — household size is familial-status data on a fair-housing-regulated surface and no queue row renders it"
  - "Mutation option factories take a QueryClient parameter so the invalidation lives with the mutation, which is what the plan's >=4 ownerDashboardKeys.all gate measures"
  - "record_application_conversion's (false, 'already_converted') resolves as { success: false, reason }, never throws"
  - "applicationLinkState checks revoked before expired and uses <= at the expiry boundary, both matching the server"

patterns-established:
  - "Pattern 1: a literal-string acceptance gate also scans comments — prohibitive prose that names the banned construct trips the gate. Three gates failed on explanatory comments here, the same class as 66-04's decided_at alignment defect."
  - "Pattern 2: when a plan's <interfaces> block and its <action> prose disagree about a type, the one that would produce a runtime lie loses. Record the divergence loudly, because four downstream plans consume the contract verbatim."

requirements-completed: [APPLY-01, APPLY-03, APPLY-04]

# Metrics
duration: 22min
completed: 2026-08-07
---

# Phase 66 Plan 09: Owner Application Data Layer Summary

**Two `queryOptions()` modules, two typed PostgREST boundary mappers and six mutation-option factories that between them cover every owner write the phase has — five plan 66-04 RPCs plus the single PostgREST DELETE — over two tables that have no INSERT or UPDATE policy for any role.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-08-07T21:06Z (local 21:06 CDT)
- **Completed:** 2026-08-07T21:28 CDT
- **Tasks:** 2 of 2
- **Files created:** 4 · **modified:** 1

## Task Commits

1. **Task 1: application-keys — factories, typed mapper, list pagination** — `c05e683a0` (feat)
2. **Task 2: application-link-keys — link state derivation and the URL builder** — `44ef1ec9c` (feat)

## The owner write inventory, checked against reality

This is the check 66-04's summary flagged as the one that fails only in wave 5/6, so it is verified here rather than asserted. Every mutation this layer exposes, and the write path it actually resolves to:

| # | Mutation exposed | Resolves to | Verified how |
|---|---|---|---|
| 1 | `createApplicationLinkMutationOptions` | `rpc("create_application_link")` | Present in `src/types/supabase.ts` with `Args: { p_expires_days?: number; p_unit_id: string }`; granted to `authenticated` |
| 2 | `revokeApplicationLinkMutationOptions` | `rpc("revoke_application_link")` | Generated `Args: { p_link_id: string }`; granted to `authenticated` |
| 3 | `setApplicationStatusMutationOptions` | `rpc("set_application_status")` | Generated `Args: { p_application_id; p_disposition_reason?; p_status }`; granted to `authenticated` |
| 4 | `setApplicationNotesMutationOptions` | `rpc("set_application_notes")` | Generated `Args: { p_application_id; p_notes }`; granted to `authenticated` |
| 5 | `recordApplicationConversionMutationOptions` | `rpc("record_application_conversion")` | Generated `Returns: { reason; success }[]`; granted to `authenticated` |
| 6 | `deleteApplicationMutationOptions` | PostgREST `DELETE` on `rental_applications` | Covered by the `rental_applications_delete` policy in `20260806120000_rental_applications_schema.sql:359` |

**No gap.** A comment-stripped scan of both modules finds zero `.update(`, zero `.insert(`, zero `.upsert(`, and the only `.delete(` is the one row 6 covers. The `rpc()` call sites resolve to exactly the five owner functions and neither service-role function (`get_application_context`, `submit_rental_application`) is referenced anywhere in this layer.

`typecheck` passing is meaningful evidence here, not decoration: `src/types/supabase.ts` was regenerated against the applied database in 66-06, so an RPC name typo or an argument-shape mismatch is a compile error rather than a runtime 404.

## Accomplishments

- **Every read goes through a `queryOptions()` factory.** Zero string-literal query keys in either module. `applicationKeys.detail(id)` and `applicationKeys.list(f)` both start at `applicationKeys.all`, asserted directly, so one `invalidateQueries` reaches both.
- **The queue is bounded and correctly totalled.** `.range(page * 25, page * 25 + 24)` with `{ count: "exact" }`; `total` is `count ?? 0`. Both `data.length` and `rows.length` are zero-occurrence in both modules — including in prose, so the grep gate stays honest.
- **The list ships eleven columns of forty-one.** Income, employer, current address, landlord contact, references, pet and vehicle details, owner notes and household size are all absent from the queue payload (T-66-34). `select("*")` appears only in the detail factory, which renders every field.
- **Zero double-assertion casts, zero `: any`, in both modules.** Every field is narrowed off a `Record<string, unknown>` via `requireString` / `nullableString` / `nullableNumber`. Where the repo idiom would have written `(raw.x as string | null) ?? null`, this uses a `typeof` guard instead, so there is no single-level cast either.
- **The four owner mutations each invalidate both roots.** `ownerDashboardKeys.all` appears exactly four times in `application-keys.ts` — once per mutation, inlined rather than factored into a shared helper, because a helper would satisfy the grep while leaving three mutations free to skip it.
- **`applicationLinkState` was proven by mutation, not by review.** Reordering the revoked/expired checks fails exactly one test; changing `<=` to `<` fails exactly one test. Both are the tests the plan predicted a naive implementation would be the only ones to fail.
- **The listing URL cannot be built from the browser's origin.** `applicationLinkUrl` reads `process.env.NEXT_PUBLIC_APP_URL`, trims trailing slashes, and is asserted to differ from the jsdom origin. The browser-origin global appears nowhere in the module, prose included.

## Non-vacuity: eleven mutants, eleven killed

Both plan 66-02 and 66-07 proved their suites non-vacuous by mutation, and this plan was held to the same standard. Each mutant was applied to a byte-identical copy of the committed module, the suite was run, and the module was restored and `diff`-verified identical before the next mutant.

| # | Mutant | Result |
|---|---|---|
| 1 | `requireString` returns `String(value)` instead of throwing | 3 failed / 35 passed |
| 2 | `total` sourced from the loaded slice length | 2 failed / 36 passed |
| 3 | `setApplicationNotes` drops the `ownerDashboardKeys.all` invalidation | 1 failed / 37 passed |
| 4 | `status` Zod validation short-circuited | 3 failed / 35 passed |
| 5 | List select changed to `"*"` | 1 failed / 37 passed |
| 6 | Detail `.limit(1)` widened to `.limit(2)` | 1 failed / 37 passed |
| 7 | `applicationLinkState` checks expiry before revoked | **1 failed** / 20 passed |
| 8 | Expiry boundary uses `<` instead of `<=` | **1 failed** / 20 passed |
| 9 | URL built from the browser origin | 3 failed / 18 passed |
| 10 | Trailing slash not trimmed | 1 failed / 20 passed |
| 11 | Link mapper stops throwing on missing NOT NULL fields | 1 failed / 20 passed |

Mutants 7 and 8 are the load-bearing ones and behaved exactly as the plan's acceptance criteria predicted: each killed **one** test and left every other state assertion green, which is the definition of a test that would not have been caught by an implementation that "looks right".

## Verification

| Gate | Result |
|---|---|
| Task 1 automated gate (tests, typecheck, `as unknown as` = 0, `: any` = 0, `count: "exact"`, `.range(`, `data.length`/`rows.length` = 0, `ownerDashboardKeys.all` >= 4) | **PASS** — 4 occurrences exactly |
| Task 2 automated gate (tests, typecheck, `as unknown as` = 0, browser-origin global = 0, `NEXT_PUBLIC_APP_URL` present, `.limit(` present) | **PASS** |
| `bun run test:unit` on both files | **PASS** — 59 tests, 38 + 21 |
| `bun run typecheck` (app + integration + e2e projects) | **PASS** |
| `bun run lint` | **PASS** — 1347 files |
| Full suite + coverage via lefthook pre-commit on both commits | **PASS** — no `--no-verify` |
| Comment-stripped scan for `.update(` / `.insert(` / `.upsert(` in both modules | **0 / 0 / 0** |

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] `ApplicationListPage.rows` typed as the full row would have been a type lie**

- **Found during:** Task 1, while reconciling the plan's `<interfaces>` block against its own `<action>` instruction to enumerate roughly ten columns.
- **Issue:** The plan specifies `rows: RentalApplicationRow[]` (41 fields) *and* a list select of about ten columns. Those cannot both be true. A consumer in 66-13 reading `row.employer_name` off a queue row would get `null` for every applicant and render "Not provided" forever, with nothing failing — the exact silent-mistyping failure mode the plan's own T-66-33 register entry describes for casts.
- **Fix:** added `ApplicationSummaryRow = Pick<RentalApplicationRow, ...11 keys>` and typed `ApplicationListPage.rows` as that. Reading an unselected column off a queue row is now a compile error in wave 5 instead of a blank field in production. `RentalApplicationRow` is unchanged and is still what `detail` returns.
- **Consumer impact:** additive for anything the queue actually renders (id, applicant name, property/unit label, status, created_at). A 66-13 author who wants a detail-only field on a queue row must add it to `LIST_SELECT_COLUMNS` and to the `Pick`, which is the correct forcing function.
- **Commit:** `c05e683a0`

**2. [Rule 1 — Bug] A single strict mapper cannot serve both read paths**

- **Found during:** Task 1.
- **Issue:** `mapRentalApplicationRow` must throw on a missing `occupant_count` (NOT NULL in the schema, typed `number` in the plan's interface). The queue does not select `occupant_count`, so reusing the detail mapper for the list would have thrown on every queue render. The only alternatives were to add `occupant_count` to the queue select — shipping household size, which is familial-status data, to a fair-housing-regulated surface that does not render it — or to widen the field to `number | null` and fabricate a null.
- **Fix:** added `mapRentalApplicationSummaryRow`, sharing the same helpers, covering exactly the eleven queue columns.
- **Commit:** `c05e683a0`

**3. [Rule 3 — Blocking] `mutationKeys.applications` did not exist**

- **Found during:** Task 1.
- **Issue:** every `mutationOptions()` in `src/hooks/api/query-keys/` carries a `mutationKey` from the central factory, which is what `useMutationState` global pending-state tracking reads. There was no `applications` block, and `src/hooks/api/mutation-keys.ts` is not in the plan's `files_modified` list.
- **Fix:** added a six-entry `applications` block (the four application mutations plus the two link mutations) with a header comment recording why `delete` is the only non-RPC entry.
- **Commit:** `c05e683a0`

**4. [Rule 1 — Bug] Three acceptance gates tripped on explanatory comments**

- **Found during:** Tasks 1 and 2.
- **Issue:** the gates are literal `grep -c` counts over the whole file. Writing "No `as unknown as` (rule 8)", "NEVER `rows.length`" and "NEVER from `window.location.origin`" in the doc comments made all three gates fail on files whose executable code was already clean. This is the same class as 66-04's `decided_at` alignment defect, and it is recorded as Pattern 1 because it will recur for any plan whose gate is a literal-string grep.
- **Fix:** rephrased each comment to state the prohibition without naming the construct, and noted in the URL builder's comment that the gate is a zero-occurrence grep so a future editor does not reintroduce the phrase. A fourth occurrence was real: `deleteApplication` used `data.length === 0`, rewritten to `!data?.[0]`.
- **Commit:** `c05e683a0` (task 1), `44ef1ec9c` (task 2)

### Implementation discretion inside the plan's contract

Not deviations — the plan left the mechanism open — but each is a judgement worth recording:

1. **`applicationQueries.detail` returns `RentalApplicationRow | null`.** The `<interfaces>` block says `UseQueryOptions<RentalApplicationRow>`, but the `<action>` requires `.limit(1)` + `[0]` "so a missing row is a `null` result". The action wins; the interface's non-null return was not achievable alongside it.
2. **Mutation-option factories take a `QueryClient`.** The plan writes `(...) => UseMutationOptions<...>` without naming the parameter. `lease-mutation-options.ts` keeps `onSuccess` in the hook file, but the plan's `>= 4 ownerDashboardKeys.all` gate is measured inside `application-keys.ts`, so the invalidation has to live with the mutation. Precedent for a `QueryClient` parameter exists at `src/app/(owner)/reports/generate/components/report-types.ts:107`.
3. **`nullableNumber` throws on a non-numeric value rather than degrading to null.** A non-numeric value in a `numeric` column is corruption, not an empty field, and a silent null would render an applicant's income as "Not provided".
4. **Both mappers validate `status` through a Zod `enum` `safeParse`,** following `tenant-mappers.ts` and CLAUDE.md's "validate enum-shaped fields via Zod safeParse" rather than `mapDocumentRow`'s pass-through (which is correct only because `document_type` became a soft FK in Phase 65).
5. **The list carries a deterministic `id` tiebreaker after `created_at desc`.** A burst of submissions through one listing link can share a `created_at`, and unordered ties duplicate or vanish across `.range()` pages — the same defect `notification-keys.ts` fixed.
6. **`applicationLinkState` fails closed to `"expired"` on an unparseable `expires_at`.** Offering "Create a new link" is better than handing the owner a URL the server refuses.
7. **`mapApplicationLinkRow` throws on `created_at` and `submission_count` too,** not only on the four fields the plan names. Both are NOT NULL and both are always selected, so a throw means a dropped column.
8. **`RentalApplicationRow` drops five audit columns** (`certified_at`, `submission_id`, `submitted_ip`, `submitted_user_agent`, `updated_at`). `submitted_ip` and `submitted_user_agent` are applicant network metadata with no owner-facing use; the row type omitting them means no future select can quietly start shipping them.
9. **`token_hash`, `owner_user_id` and `created_by` are omitted from `ApplicationLinkRow`.** `token_hash` is the unauthenticated lookup key and has no browser-side use at all.
10. **`createApplicationLink` always sends 60 days.** UI-SPEC §C offers the owner no expiry control, so no client path can send anything else; the RPC clamps to [1, 365] regardless.

**Total:** 4 auto-fixed issues (3× Rule 1, 1× Rule 3), 10 recorded discretionary choices. No Rule 4 architectural question arose. No package was installed.

## TDD Gate Compliance

Each task carries `tdd="true"`, but each task's `<action>` prescribes implementation-first ("Create `...-keys.ts` ... **Then** write the test file covering every `<behavior>` row"). I followed the explicit `<action>` ordering, so there is no separate `test(...)` RED commit ahead of each `feat(...)`.

The RED guarantee the gate exists to provide was established instead by the eleven-mutant campaign in the table above, which is strictly stronger than commit ordering: a `test → feat` sequence proves the suite failed against an *empty* module, whereas each mutant proves the suite fails against a module that is complete and plausible but wrong in one specific way. Recorded here rather than left implicit, per the gate-compliance instruction.

## Threat Model Coverage

| Threat ID | Disposition | Status |
|---|---|---|
| T-66-33 | mitigate | **Done.** Both mappers narrow every field off `Record<string, unknown>`; zero double-assertion casts and zero single-level `as` casts in either module, gated by grep. Numeric coercion is explicit and throws on corruption. |
| T-66-34 | mitigate | **Done.** The queue selects 11 of 41 columns; `select("*")` is confined to the detail factory. Income, employer, address, landlord contact, references, notes and household size never reach the queue payload. Asserted in the test, not just written. |
| T-66-09 | mitigate | **Done.** Every applicant value stays a string through the mapper and is returned as data. Zero `dangerouslySetInnerHTML` and zero HTML construction in this layer. |
| T-66-14 | transfer | **Done as designed.** All five mutations that touch owner data call a 66-04 RPC that re-checks `(select auth.uid())` server-side. This layer never sends an owner id and never assumes the client-side one is authoritative — `owner_user_id` is read-only here. |
| T-66-35 | mitigate | **Done.** `{ count: "exact" }` with `total: count ?? 0`; zero-occurrence grep for both `data.length` and `rows.length` across both modules, and a test asserting the null-count header resolves to 0 rather than the slice size. |
| T-66-SC | mitigate | **Done.** Zero packages installed. `@tanstack/react-query`, `@supabase/supabase-js` and `zod` were all already present. |

### Threat flags

None. This plan adds no network endpoint, no auth path, no file access and no schema change. It is client-side data access over surfaces 66-01 and 66-04 already established.

## Issues Encountered

None blocking.

One observation for the phase: `src/hooks/api/query-keys/application-keys.ts` is 565 lines, the largest file in `query-keys/`, above `financial-keys.ts` (548) and `maintenance-keys.ts` (533). It is over CLAUDE.md's 300-line guidance but within this directory's established range, and splitting the mutations into `application-mutation-options.ts` (the `lease-mutation-options.ts` precedent) would have moved `ownerDashboardKeys.all` out of the file the plan's gate measures. Every individual function is under the 50-line cap. Flagged rather than silently accepted.

Three untracked paths (`.agents/`, `.github/instructions/`, `skills-lock.json`) were present in the working tree before this plan started and are unrelated to it. They were not staged, not modified and not removed.

## Next Phase Readiness

**Four plans consume this layer verbatim and add no data access of their own.** Carry-forwards:

- **66-13 (queue + detail):** the list returns `ApplicationSummaryRow`, not the full row. If the queue needs a field outside the eleven, add it to `LIST_SELECT_COLUMNS` *and* to the `ApplicationSummaryRow` `Pick` — the compile error is the reminder. `applicationQueries.detail` resolves `null` for a missing or non-owned id; render that as "not found", not as an error. Mutation options take a `QueryClient`, so call them as `useMutation(setApplicationStatusMutationOptions(queryClient))`.
- **66-14 (link panel):** `applicationLinkQueries.byUnit()` returns every link the owner holds, newest first, capped at 200. The panel groups by `unit_id` client-side and renders one row per **unit**, joining against the unit list — a unit with no link is the `"none"` state, which `applicationLinkState(null, now)` already returns. Never derive state inline; `applicationLinkState` is the single source and its check order is tested.
- **66-15 (decline dialog):** pass `dispositionReason` from `DISPOSITION_REASONS` in `application-copy.ts`. Omitting it sends no `p_disposition_reason` key at all, which is what the RPC's optional arg expects; sending `undefined` explicitly would be rejected.
- **66-16 (conversion):** `recordApplicationConversion` **resolves** on a repeat with `{ success: false, reason: "already_converted" }`. Branch on `success`; treating a falsy result as an error puts a failure toast on a benign double-click, which is precisely what the RPC returning rather than raising exists to prevent.
- **Anyone adding an owner write:** there is no `.update()` or `.insert()` fallback for either table, for any role. A new owner mutation needs a new RPC in a migration first. The six-row inventory above is the complete surface.

No blockers.

## Self-Check: PASSED

**Files verified present on disk:**

- `src/hooks/api/query-keys/application-keys.ts` — FOUND, 565 lines
- `src/hooks/api/query-keys/application-link-keys.ts` — FOUND, 270 lines
- `src/hooks/api/query-keys/__tests__/application-keys.test.ts` — FOUND, 38 tests
- `src/hooks/api/query-keys/__tests__/application-link-keys.test.ts` — FOUND, 21 tests
- `src/hooks/api/mutation-keys.ts` — MODIFIED, `applications` block present
- `.planning/phases/66-rental-application-intake/66-09-SUMMARY.md` — FOUND

**Commits verified in `git log`:** `c05e683a0`, `44ef1ec9c`

**Branch:** `gsd/phase-66-rental-application-intake` — verified before the first commit; never `main`. No worktree created, no `git reset`, no `git clean`, no `git stash`, no `--no-verify`.

## Known Stubs

None. Every exported symbol has a complete implementation backed by a real RPC or a real RLS policy, verified against the regenerated `src/types/supabase.ts` and the applied migration. No placeholder values, no mock data sources, no unwired returns.

---
*Phase: 66-rental-application-intake*
*Completed: 2026-08-07*
