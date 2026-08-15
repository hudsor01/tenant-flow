---
phase: 66-rental-application-intake
plan: 12
subsystem: public-surface
tags: [client-island, tanstack-form, zod, honeypot, idempotency, fair-housing, apply-02, apply-06, ui-01, ui-04, ui-05, ui-06, ui-09, ui-10, d-01, d-06, t-66-40]

# Dependency graph
requires:
  - phase: 66-02
    provides: "rentalApplicationSchema (the browser contract) and the locked copy constants APPLY_DISCLAIMER + FAIR_HOUSING_NOTE"
  - phase: 66-07
    provides: "the apply-token submit action, its envelope shape, and HONEYPOT_FIELD"
  - phase: 66-11
    provides: "the Server Component shell and the marked insertion point in the valid branch"
provides:
  - "src/components/applications/application-form-options.ts - 29 controlled defaults, the form/contract adapter, and the form-level validator"
  - "src/components/applications/application-fields-{about,address,income,household,references}.tsx - the five withForm sections"
  - "src/components/applications/application-disclaimer.tsx - the APPLY-06 block and the UI-05 attestation"
  - "src/components/applications/application-outcome.tsx - the A-5 confirmation and the two non-accusing notices"
  - "src/components/applications/rental-application-form.tsx - the client island, the honeypot, and the submit orchestration"
  - "src/components/applications/__tests__/rental-application-form.test.tsx - 17 tests / 75 assertions, every absence paired with a positive control"
affects:
  - 66-17 (the E2E spec drives this form; E-1, E-2, E-3, E-6, E-7, E-8, E-11 and E-16 all target it)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A browser module importing a constant directly from supabase/functions/_shared, which works because that module is a verified dependency-free leaf and makes 66-02's HONEYPOT_FIELD assertion load-bearing on both sides of the wire"
    - "z.preprocess as the single form-shape/contract-shape adapter, consumed through a function validator rather than TanStack's Standard Schema slot because a preprocessor's declared input is unknown"
    - "Absence assertions written with an in-test positive control using the same query mechanism, after a mutation proved the storage assertion could pass against a store that does not exist in the environment"

key-files:
  created:
    - src/components/applications/application-form-options.ts
    - src/components/applications/application-fields-about.tsx
    - src/components/applications/application-fields-address.tsx
    - src/components/applications/application-fields-income.tsx
    - src/components/applications/application-fields-household.tsx
    - src/components/applications/application-fields-references.tsx
    - src/components/applications/application-disclaimer.tsx
    - src/components/applications/application-outcome.tsx
    - src/components/applications/rental-application-form.tsx
    - src/components/applications/__tests__/rental-application-form.test.tsx
  modified:
    - src/app/apply/[token]/page.tsx

key-decisions:
  - "The form-level validator is a FUNCTION, not the zod schema handed to TanStack's Standard Schema slot. That slot is typed StandardSchemaV1<TFormData, unknown> and a z.preprocess pipe declares its input as unknown, so it does not fit. The only alternatives were a cast (hides a real mismatch) or a second schema over the form shape (the contract restated somewhere free to drift)."
  - "The honeypot's wire name is IMPORTED from supabase/functions/_shared/application-guards, closing 66-07's carry-forward. Verified end to end: typecheck, unit tests and a full next build all pass with the cross-tree import in the client bundle."
  - "application-outcome.tsx is a tenth file the plan did not list. The form shell hit 344 lines against CLAUDE.md's 300-line ceiling; the confirmation view and the two notices are the natural seam because nothing in them touches form state."
  - "The capped-state copy drops the copy deck's retry interval. The shipped limiter is a one-hour window and the per-link cap does not reopen at all, so the deck's promised wait is wrong by two orders of magnitude; the repo's own marketing-copy guard bans the same wording independently."

requirements-completed: [APPLY-02, APPLY-06]

# Metrics
duration: 68min
completed: 2026-08-08
---

# Phase 66 Plan 12: The Applicant Form Summary

**A 26-field single-scroll public form whose layout is the compliance control: the source-neutral income total renders before every employer label, household is a count with no per-person detail, no D-06 field exists at any layer, and a 429 costs the applicant nothing typed — all of it pinned by 17 tests that survived none of the 13 mutations aimed at them.**

## Performance

- **Duration:** ~68 min
- **Tasks:** 3 of 3
- **Files created:** 10 · **modified:** 1
- **Tests:** 17 / 75 assertions, all passing
- **Mutations applied:** 13, all 13 caught

## Task Commits

| Task | Name | Commit |
|---|---|---|
| 1 | Form options, the section scaffold, and sections 1 and 2 | `528a6a716` |
| 2 | Sections 3, 4 and 5 — the compliance-constrained layouts | `7a45887d9` |
| 3 | The disclaimer, the honeypot, the submit orchestration, the six states, the page wiring | `384cc6b1e` |

## The three claims the brief asked for explicitly

### (a) No D-06 forbidden field renders

**Established, at three layers.** The component-level test runs UI-SPEC E-8's selector string verbatim — `input[name*="ssn" i]` through `input[name*="government" i]`, thirteen patterns — and finds zero matches, **paired in the same test with `input[name*="name" i]` finding matches and a `> 20` count on all inputs**, so the zero is about the form and not about an empty render. A second test sweeps all 26 rendered `<label>` texts against `ssn|social security|date of birth|driver|passport|routing|criminal|eviction|upload` and asserts `input[type="file"]` is absent while `textarea` is present.

The 26 labels, in full, are the entire field surface:

> First name · Last name · Email · Phone · Desired move-in date · Street address · City · State · ZIP · Current landlord name (optional) · Current landlord phone (optional) · Reason for moving (optional) · Gross monthly income from all sources · Employer (optional) · Job title (optional) · Months at this employer (optional) · Other income source (optional) · Other monthly amount (optional) · Number of people who will live in the unit · Pets (optional) · Vehicles (optional) · Reference name · Relationship to you (optional) · Reference phone · Reference name (optional) · Relationship to you (optional) · Reference phone (optional)

Mutation M1 (an `ssn` field added to section 1) fails **two** of these tests.

### (b) The required total-income label precedes every employer label in DOM order

**Established.** The test finds all four labels first, asserts each is defined, and only then compares positions with `compareDocumentPosition`, so an ordering claim over a missing label cannot pass. A second test asserts the income `<section>` holds exactly six inputs, that the **first** of them is `gross_monthly_income`, and that it contains exactly **one** `<h3>` whose text is `Where your income comes from (optional)`.

Mutation M2 (employer promoted above the total) fails two tests. Mutation M3 (a second `Employment` heading, i.e. the separated-Employment layout the contract calls a blocking violation) fails the heading-count test.

Source order matches, and 66-17's E-11 will assert the same property against real CSS — both are needed, because source order can be right while a grid placement inverts the render.

### (c) The §D-1 countermeasures applied, and where

| Countermeasure | Applied at |
|---|---|
| `inputSize="lg"` on **every** input | all 5 section files — 23 of the 26 fields (`about` 5, `address` 6, `income` 6, `household` 1, `references` 6). The 3 remaining fields are textareas. |
| `className="min-h-24!"` on **every** textarea, commented at each use site | `application-fields-address.tsx` (Reason for moving), `application-fields-household.tsx` (Pets, Vehicles) — 3 use sites, 3 comments naming D-1. Each comment describes the layered-important override without spelling the class literal, because the plan's gate is a whole-file count of exactly 2 in the household file. |
| **Zero `Select`** anywhere on `/apply` (UI-03) | gated at 0 in all files; State is a 2-char `TextField` with `autoComplete="address-level1"` validated against the existing `USState` union |
| `Field orientation="horizontal" className="items-start gap-3"` on the attestation | `application-disclaimer.tsx` — top-aligns the 44×44 mobile checkbox against a two-line label |
| **Zero `space-y-*`** phase-wide (D-2) | gated at 0 in all 10 files; `flex flex-col gap-*` / `grid gap-*` throughout |
| `mb-0` on every trapped `<p>`, each with a comment naming the parent box (D-3) | 12 sites across `income`, `household`, `disclaimer` and `outcome`; ordinals are `<span>` not `<p>` in all five sections |

## Non-Vacuity Evidence

13 mutations, applied one at a time to the committed source, suite re-run, tree restored and verified clean after each.

| # | Mutation | Result |
|---|---|---|
| M1 | an `ssn` field appears in section 1 | **2 fail** — forbidden-input selector, label sweep |
| M2 | employer name promoted above the required total | **2 fail** — DOM order, income-section shape |
| M3 | a second `Employment` heading wraps the employer fields | **1 fail** — exactly-one-heading |
| M4 | honeypot becomes `type="hidden"` | **1 fail** — honeypot attributes |
| M5 | honeypot becomes tabbable (`tabIndex={0}`) | **2 fail** — honeypot attributes, tab-order |
| M6 | the disclaimer moves below the submit control | **1 fail** — APPLY-06 placement |
| M7 | an acknowledgement checkbox lands on the disclaimer | **9 fail** — UI-04 plus every test that resolves the single checkbox |
| M8 | a 429 resets the form (page-replacing behaviour) | **3 fail** — 429 survival, capped-reason survival, retry idempotency |
| M9 | the honeypot is left inside the `application` object | **7 fail** — envelope shape plus every submit-path test, because the strict validator then rejects every submission |
| M10 | a new submission id minted per attempt | **1 fail** — retry idempotency |
| M11 | the confirmation recaps the applicant's email | **1 fail** — nothing survives on the device |
| M12 | a draft is written to device storage on every change | **1 fail** — device-storage probe |
| M13 | a per-occupant relationship field appears in household | **1 fail** — household is a count only |

**M12 is the one worth recording, because the first version of its test did not catch it.**

The device-storage assertion was originally `vi.spyOn(Storage.prototype, "setItem")` with a `window.localStorage` positive control. That control threw, because **this environment provides no key/value stores at all** — `window.localStorage` is `undefined` and the Node warning `localStorage is not available because --localstorage-file was not provided` explains why. After "fixing" the control the assertion passed, and then **M12 passed too**: the mutation's `globalThis.localStorage?.setItem(...)` short-circuited on `undefined`, so the spy could never fire. The test was asserting that a method nothing could reach was not reached.

It was rewritten to **install** callable stubs for `localStorage`, `sessionStorage` and `indexedDB` via `vi.stubGlobal`, assert none of them is touched, and then exercise all three as the positive control. M12 now fails. This is exactly the vacuity class the brief warned about, found in my own test by the mutation rather than by reading it.

### Positive controls, by assertion

| Absence asserted | Positive control in the same test |
|---|---|
| no forbidden input matches E-8's selector | `input[name*="name" i]` matches, and `> 20` inputs render |
| no `input[type="file"]` | `textarea` count `> 0`, label count `> 20` |
| honeypot not in the tab order | `> 20` other controls **are** tabbable |
| no control inside the disclaimer section | that section renders exactly 3 `<p>`, and the page has exactly 1 checkbox elsewhere |
| employer labels follow the total | all four labels asserted defined before any position is compared |
| household has no per-person control | 1 input and 2 textareas **are** present in that section |
| no store is written | all three installed stores are then exercised and observed |
| no submitted value survives a success | the same value asserted present in the tree immediately before submit |
| submit disabled without the attestation | submit **enabled** immediately after checking it |

## Verification

| Gate | Result |
|---|---|
| `bun run test:unit -- src/components/applications/__tests__/rental-application-form.test.tsx` | **17 tests / 75 assertions, pass** |
| `bun run test:unit` (full suite, via lefthook on all three commits) | **320 files / 108,575 tests, pass** |
| `bun run typecheck` (root + integration + e2e) | **pass** |
| `bun run lint` (`biome check`, 1363 files) | **pass** |
| `next build` with the CI-parity env block | **pass** — `/apply/[token]` listed as **`ƒ (Dynamic)`**, and the cross-tree `HONEYPOT_FIELD` import bundles cleanly |

Plan gates, per task:

| Gate | Result |
|---|---|
| Task 1 — `inputSize="lg"` ≥ 4 in `about` | **6** (5 uses + 1 in the header note) |
| Task 1 — `<Select` in `address`, `space-y-` in either | **0 / 0** |
| Task 1 — `autoFocus`, `FieldGroup className="gap-5"` in both | **present / present** |
| Task 1 — default keys | **29** (14 required + 14 optional + honeypot) |
| Task 1 — asterisks in any label | **0**; all 8 optional labels end `(optional)` |
| Task 2 — `<h3` in income | **1** |
| Task 2 — `<FieldGroup` in income | **1** (limit 2) |
| Task 2 — `<Select` / `<Card` in income | **0** |
| Task 2 — `FAIR_HOUSING_NOTE` in income | **present** |
| Task 2 — occupant/relationship identifiers, `<Switch`, `<Checkbox` in household | **0** |
| Task 2 — `min-h-24!` in household | **exactly 2** |
| Task 3 — `localStorage` / `sessionStorage` / `indexedDB` in the form | **0** |
| Task 3 — `style=` in the form | **0** |
| Task 3 — `onBlur:` in the form | **0**; `onChange:` **present** |
| Task 3 — `tabIndex={-1}` in the form | **present** |
| Task 3 — `fixed ` / `sticky ` in the form | **0** |
| Task 3 — `<RentalApplicationForm` in `page.tsx` | **present**, placeholder comment removed |

File sizes, against CLAUDE.md's 300-line ceiling: 103 / 131 / 163 / 122 / 113 / 103 / 136 / 179 / **297**. All pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's `validators: { onChange: rentalApplicationSchema }` does not compile, and would not have worked at runtime either**

- **Found during:** Task 3
- **Issue:** Three separate problems with handing the schema straight to TanStack. (i) `rentalApplicationSchema` is `.strict()`, so `company_website` in the form values raises `unrecognized_keys` on every keystroke and `canSubmit` never becomes true. (ii) `NumberField` binds `number | null`, and `null` fails `z.number().optional()` on the two optional numeric fields, so a correctly filled form stays unsubmittable with no error attached to any rendered field. (iii) Wrapping both fixes in `z.preprocess` produces a schema whose Standard Schema **input** type is `unknown`, and TanStack's form-level slot is `StandardSchemaV1<TFormData, unknown>` — it requires the declared input to be the form's value type. `tsc` rejects it.
- **Fix:** One adapter, `toApplicationValues`, expressed once in `application-form-options.ts`: drop the honeypot, drop every `null`. Empty strings are deliberately left alone because the schema accepts them and the server's `isFilled` skips them. The `z.preprocess` pipe is consumed through a small function validator, `validateApplicationForm`, which maps one message per field by the issue's first path segment — the same mapping TanStack performs internally. The rejected alternatives were a cast (hides a real type mismatch) and a hand-written second schema over the form shape (the contract restated in a place free to drift from it).
- **Files modified:** `src/components/applications/application-form-options.ts`, `src/components/applications/rental-application-form.tsx`
- **Commit:** `384cc6b1e`

**2. [Rule 3 - Blocking] The form shell breached CLAUDE.md's 300-line ceiling at 344 lines**

- **Found during:** Task 3
- **Issue:** The plan's file list has no home for the confirmation view or the notice alerts, and with them inline the shell was 344 lines against a hard 300-line rule.
- **Fix:** Extracted `application-outcome.tsx` (136 lines) holding the A-5 state-4 confirmation, the state-5 and state-6 alerts and their A-7 copy. It is a real seam, not an arbitrary cut: nothing in it touches form state. The shell is now 297 lines. The honeypot was additionally lifted into a `withForm` component inside the shell, which took the render function from 103 to 79 code lines.
- **Files modified:** new `src/components/applications/application-outcome.tsx`
- **Commit:** `384cc6b1e`

**3. [Rule 1 - Bug] The copy deck's capped-state retry interval is wrong by two orders of magnitude**

- **Found during:** Task 3, caught by the repo's own `marketing-copy-landlord-only` guard on the first commit attempt
- **Issue:** UI-SPEC A-7's capped body tells the applicant to wait a few minutes and submit again. `apply-token`'s address-keyed limiter is **5 requests per hour**, and the per-link cap does not reopen at all — so an applicant who waits the promised interval is told exactly the same thing again. The repo's banlist independently rejects that wording as an undocumented response-time commitment, which is the same objection arriving from the other direction.
- **Fix:** The interval was removed and the reassurance kept verbatim: *"Nothing you typed has been lost. Please wait a while and submit again."* The divergence and its reasoning are recorded in the file's docblock.
- **Files modified:** `src/components/applications/application-outcome.tsx`
- **Commit:** `384cc6b1e`

**4. [Rule 3 - Blocking] The comment explaining the divergence tripped the same banlist, twice**

- **Found during:** Task 3
- **Issue:** The docblock explaining fix 3 quoted the banned phrase, then — after rewording — used "in minutes", which is also on the list. A whole-file scan cannot tell a comment from a declaration.
- **Fix:** Reworded to describe the wording rather than quote it, with a parenthetical saying so. This is the **fifth and sixth** instance of this class in phase 66 (66-07 recorded two, 66-11 two). The rule 66-11 stated holds: when a whole-file absence check and a mandated explanation collide, write the explanation about the concept and never the token.
- **Files modified:** `src/components/applications/application-outcome.tsx`
- **Commit:** `384cc6b1e`

**5. [Rule 2 - Missing critical functionality] The plan's markup left every helper line unassociated with its field**

- **Found during:** Task 2
- **Issue:** `NumberField` / `TextareaField` render no description slot, so composing a `FieldDescription` alongside puts the text visually near the control and semantically nowhere. The occupants helper — *"We do not ask for names, ages, or relationships"* — is a fair-housing statement about that specific field; a screen-reader user would never hear it while on the control.
- **Fix:** Every helper carries an `id` and every field an `aria-describedby` pointing at it. Pets carries two (`aria-describedby="apply-pets-help apply-pets-assistance"`), which is what makes the assistance-animal line reach the person it is written for.
- **Files modified:** `application-fields-income.tsx`, `application-fields-household.tsx`
- **Commit:** `7a45887d9`

**6. [Rule 2 - Missing critical functionality] The attestation had nowhere to render its error**

- **Found during:** Task 3
- **Issue:** UI-SPEC A-4's attestation markup is a two-child horizontal `Field` with no `FieldError`. The schema's message, *"Confirm that your answers are true and complete"*, therefore had no render site, and the only signal for an unchecked box was a submit button that silently would not enable.
- **Fix:** The `Field` is wrapped in a `flex flex-col gap-2` with a `FieldError` beneath it. `FieldError` returns `null` with no content, so the visual contract at A-4 is unchanged when the box is checked.
- **Files modified:** `src/components/applications/application-disclaimer.tsx`
- **Commit:** `384cc6b1e`

### Additive to the Plan

**The honeypot's wire name is imported, closing 66-07's carry-forward.** 66-07 asserted that the literal `"company_website"` appears nowhere in the Edge Function and recorded that its `expect(HONEYPOT_FIELD).toBe(...)` assertion only becomes load-bearing once every consumer imports the constant. The plan's own markup spells the literal. `HONEYPOT_FIELD` is now imported into `application-form-options.ts` (as the computed default key), into `rental-application-form.tsx` (the envelope key) and into the test. This was verified rather than assumed: `tsc`, the unit suite and a full `next build` all pass with the cross-tree import in the client bundle, which works because `application-guards.ts` is a verified dependency-free leaf with no runtime-global references. The `<input>`'s `id` remains the literal `apply-company-website`, because that is a DOM identifier the E2E spec targets, not a wire name.

**Six tests beyond the plan's six.** The plan names six assertions; the file has seventeen. The additions are the envelope shape, retry idempotency (T-66-20), the duplicate-as-success path, the income-section shape, the household contract, and the UI-04 no-acknowledgement property — each of which is a threat-register disposition with no other local gate.

**A `role="group"` on the second reference.** All three of its fields are labelled exactly like the first reference's, so a screen-reader user hears "Reference name" twice with nothing distinguishing them. The group is labelled by the `<h3>` the spec already requires. No visual change.

### Stated Position, Not a Silent Overrun

**`RentalApplicationForm`'s render function is 79 code lines against CLAUDE.md's 50-line guideline.** It owns six render states and is already decomposed into seven sibling modules plus three module-level helpers (`postApplication`, `submitApplication`, `focusFirstInvalid`) and one `withForm` child. For calibration, the repo's two comparable form shells measure **92** (`AddTenantForm`) and **214** (`SignLeaseForm`) code lines by the same counter. Further extraction would trade readability for a metric; recorded here rather than hidden.

## Known Stubs

None. Every field, state and copy string this plan owns is wired to real data or a real constant.

## Threat Flags

None beyond the plan's register. Every disposition is addressed and gated:

| Threat | Disposition | Where |
|---|---|---|
| T-66-40 applicant PII on a shared device | mitigate | Zero storage identifiers in the form (grep) **and** an installed-store runtime probe; the form resets before the confirmation mounts; no copy/print/download. Mutations M11, M12 |
| T-66-08 honeypot evasion or detection | mitigate | Off-screen by Tailwind class, no inline declaration, never `display:none`, never `type="hidden"`, `tabIndex={-1}`, `aria-hidden`, name imported. Mutations M4, M5 |
| T-66-06 a legitimate applicant losing their form to a rate limit | mitigate | Inline default-variant `Alert`, form intact, submit live; tests assert the surviving input value and the enabled button, not merely the alert. Mutation M8 |
| T-66-41 discriminatory form design | mitigate | Required source-neutral total first, one optional group at identical weight, no income-type selector, occupant count only, no disability or assistance-animal question, template fair-housing note. Mutations M2, M3, M13 |
| T-66-11 a forbidden field reaching the wire | mitigate | E-8's selector at the component layer, 66-02's strict validator at the boundary, 66-17's E-8 against the shipped DOM. Mutation M1 |
| T-66-42 submitting without seeing the disclaimer | mitigate | No floating bar (gated at 0), disclaimer last in normal flow, DOM-order test here and E-1's pixel assertion in 66-17. Mutation M6 |
| T-66-20 duplicate rows from a double-click | mitigate | One submission id per mount, sent with every attempt. Mutation M10 |
| T-66-SC package installs | mitigate | Zero packages. Every primitive and the whole form rail pre-existed. |

## Issues Encountered

**`next build` rewrites `next-env.d.ts`.** Same as 66-11: the build swaps the generated import from the dev route-types path to the production one. Reverted with `git checkout -- next-env.d.ts`, a single named file, never a blanket reset.

**The plan's test command cannot run as written.** `bun run test:unit -- --run <file>` is a CAC duplicate-flag error; `package.json#scripts.test:unit` already injects `--run`. Run as `bun run test:unit -- <file>`. Third recording of this gap in this phase (66-07, 66-11).

## Next Phase Readiness

- **66-17 (E2E):** the form is the target of E-1, E-2, E-3, E-4, E-6, E-7, E-8, E-11, E-13, E-14, E-15 and E-16. Two notes. E-2 asserts every input is exactly 48px; 23 of the 26 fields carry `inputSize="lg"` and the other three are textareas, which E-3 covers at `>= 96`. E-16's "submit button still enabled" half needs the attestation checked first, because `canSubmit` is false without it for reasons unrelated to the 429.
- **The capped copy differs from UI-SPEC A-7.** An E2E snapshot written from the deck will fail. The shipped string is *"Nothing you typed has been lost. Please wait a while and submit again."* — reasoning in `application-outcome.tsx`'s docblock and in deviation 3 above.
- **`submission_id` is minted at hydration**, not at server render, so an E2E test that reloads the page gets a new one. That is correct behaviour (a refresh is a new application) and the retry-idempotency property is only observable within one page load.
- **The timing guard is server-side.** The client sends `form_loaded_at` and gates on nothing, so an E2E run that fills and submits in under 3 seconds will receive a **200 success with zero rows written**. Any E2E assertion about a stored row needs a real delay before submit.

No blockers.

## Self-Check: PASSED

Files:

- `src/components/applications/application-form-options.ts` — FOUND (179 lines)
- `src/components/applications/application-fields-about.tsx` — FOUND (103 lines)
- `src/components/applications/application-fields-address.tsx` — FOUND (131 lines)
- `src/components/applications/application-fields-income.tsx` — FOUND (163 lines)
- `src/components/applications/application-fields-household.tsx` — FOUND (122 lines)
- `src/components/applications/application-fields-references.tsx` — FOUND (113 lines)
- `src/components/applications/application-disclaimer.tsx` — FOUND (103 lines)
- `src/components/applications/application-outcome.tsx` — FOUND (136 lines)
- `src/components/applications/rental-application-form.tsx` — FOUND (297 lines)
- `src/components/applications/__tests__/rental-application-form.test.tsx` — FOUND (520 lines, 75 assertions)
- `src/app/apply/[token]/page.tsx` — FOUND (233 lines, modified)

Commits:

- `528a6a716` — FOUND in git log
- `7a45887d9` — FOUND in git log
- `384cc6b1e` — FOUND in git log

Artifact contracts: `rental-application-form.tsx` contains `useAppForm` and `functions/v1/apply-token`; `application-disclaimer.tsx` contains `APPLY_DISCLAIMER`; `page.tsx` contains `<RentalApplicationForm` and no leftover placeholder comment.

Working tree clean for every file this plan touched. The three untracked entries (`.agents/`, `.github/instructions/`, `skills-lock.json`) pre-date this plan and were left alone.

---
*Phase: 66-rental-application-intake*
*Completed: 2026-08-08*
