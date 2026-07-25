---
phase: 55-rent-ledger
plan: 06
subsystem: ui
tags: [dialogs, tanstack-form, zod, shadcn, radix, money-boundary, landlord-only]

# Dependency graph
requires:
  - phase: 55-rent-ledger (plan 05)
    provides: useRecordReceiptMutation / useAddLineMutation / useStartTrackingMutation + the zod-validated input types
  - phase: 55-rent-ledger (plan 03)
    provides: LedgerEntry contract (ledger-math.ts) + the static money guard that scans src/components/ledger
provides:
  - src/components/ledger/record-receipt-dialog.tsx - per-charge receipt form (partials, method label)
  - src/components/ledger/add-line-dialog.tsx - manual late-fee / other-charge / credit form
  - src/components/ledger/track-since-dialog.tsx - start-date + opening-balance onboarding form
  - src/components/ledger/ledger-date-field.tsx - shared Calendar-in-Popover YYYY-MM-DD field
affects: [55-07 ledger tab]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dialog forms validate with a SINGLE form-level `onChange` zod schema and gate submit only on `isSubmitting` — an `onBlur` schema plus a canSubmit-disabled button silently swallows the submit click"
    - "The same schema that produces the field errors also produces the mutation payload (`safeParse` in onSubmit), so a nullable form value narrows to a number with no cast"
    - "A shared subsystem field component bound via `useFieldContext` mounts inside `form.AppField` without being registered in the global fieldComponents registry"

key-files:
  created:
    - src/components/ledger/record-receipt-dialog.tsx
    - src/components/ledger/add-line-dialog.tsx
    - src/components/ledger/track-since-dialog.tsx
    - src/components/ledger/ledger-date-field.tsx
    - src/components/ledger/__tests__/record-receipt-dialog.test.tsx
    - src/components/ledger/__tests__/add-line-dialog.test.tsx
    - src/components/ledger/__tests__/track-since-dialog.test.tsx
  modified:
    - src/app/__tests__/marketing-copy-landlord-only.test.ts
    - .planning/phases/55-rent-ledger/deferred-items.md

key-decisions:
  - "Submit buttons are NOT gated on `canSubmit`. A form-level blur validator invalidates the whole form on every blur, so the button disabled itself on the blur that the submit click itself caused and the click never landed."
  - "One `onChange` validator, not `onChange` + `onSubmit`. Submitting runs the change/blur/submit validators together, so registering the same schema twice writes the identical message under two errorMap keys and the field renders it twice."
  - "The three dialogs share one Calendar-in-Popover date field instead of triplicating ~45 lines; it lives in src/components/ledger, not the global field registry, because every consumer is a ledger dialog."
  - "The method helper uses a colon instead of the UI-SPEC's em-dash, honouring the same document's no-em-dash voice rule."
  - "'rent tracking' was removed from the false-feature-claim guard, per that file's own 'remove the entry when the product ships it' rule — Phase 55 ships the ledger and it is live in prod. Every facilitation phrase stays banned."

patterns-established:
  - "Ledger dialog shell: controlled Dialog + TanStack Form + zod + footer gated on isSubmitting, mutation owns the single toast, logger.error only on catch"
  - "Money in a form: dollars into a numeric input, dollars through zod, dollars to the mutation — no scaling anywhere on a ledger path"

requirements-completed: [LEDGER-02, LEDGER-04, LEDGER-05]

# Metrics
duration: 17min
completed: 2026-07-25
---

# Phase 55 Plan 06: Ledger Action Dialogs Summary

**The ledger's three write surfaces: a per-charge receipt form that accepts partial payments with a free-text method label, a manual-only charge/credit form, and a track-since onboarding form that warns the owner the tracked month's rent is auto-generated before they size the opening balance.**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-07-25T13:46:39Z
- **Completed:** 2026-07-25T14:03:19Z
- **Tasks:** 2
- **Files created:** 7 · **modified:** 2

## Accomplishments

- **`record-receipt-dialog.tsx` (288 lines).** Controlled shadcn `Dialog` + TanStack Form + zod. "Applies to charge" `Select` renders each charge as `{period} · {formatCurrency(remaining)} due` (remaining = `amount − receiptsSum`); "Amount received" is an autofocused dollar input; "Date received" is a Calendar popover; "Method" is a free-text `Input` with seven suggested chips (Cash / Check / Zelle / Venmo / ACH (manual) / Money order / Other) and the helper "A label only: cash, check, Zelle. TenantFlow does not move money." No cap is enforced against the remaining balance, so partials and overpayments both post (D-02). No "Pay now", no card form, no connect flow.
- **`add-line-dialog.tsx` (216 lines).** Type `Select` offering exactly the three owner-postable kinds (Late fee → `late_fee`, Other charge → `manual_charge`, Credit → `credit`), a dollar Amount, a Calendar Date, and a Description textarea. The form sends a plain magnitude; `toSignedLineAmount` in the mutation applies the credit's negative sign, so nothing in the component negates or scales. There is no automatic late-fee rule and no statutory-cap logic anywhere (D-05a).
- **`track-since-dialog.tsx` (185 lines).** "Start tracking from" (autofocused Calendar) + "Balance owed as of this date" (0 accepted, helper "Enter 0 if the tenant was current."), and the verbatim W1 callout: **"Rent for the month you start tracking is added automatically. Size your opening balance accordingly."** Generation is not prorated, so that sentence is the difference between a ledger that reconciles and one that is silently a month's rent too high.
- **`ledger-date-field.tsx` (117 lines).** One Calendar-in-Popover field for all three dialogs, bound through `useFieldContext`, converting on the local calendar day in both directions so the day the owner clicks is the day stored. Exports `LEDGER_DATE_PATTERN` / `toLedgerDateString` / `fromLedgerDateString`.
- **21-case behaviour suite across the three dialogs.** Pins the UI-SPEC copy, the per-charge remaining figure (`$1,000.00`, explicitly `not.toContain("$100,000.00")`), a partial payment reaching the mutation as `250.5`, a credit reaching it as a positive `125.25` with `type: "credit"`, an opening balance of `0` being accepted, the verbatim auto-generation note, every validation string, the absence of payment-rail copy, and that none of the three ever fires its own toast.

## Task Commits

1. **Task 1: record-receipt dialog (+ shared ledger date field)** - `91c8358d6` (feat)
2. **Task 2: add-line + track-since dialogs** - `8df12a669` (feat)

## Files Created/Modified

- `src/components/ledger/record-receipt-dialog.tsx` - per-charge receipt form.
- `src/components/ledger/add-line-dialog.tsx` - manual charge/credit form.
- `src/components/ledger/track-since-dialog.tsx` - track-since onboarding form.
- `src/components/ledger/ledger-date-field.tsx` - shared Calendar-in-Popover date field (see deviation 1).
- `src/components/ledger/__tests__/{record-receipt,add-line,track-since}-dialog.test.tsx` - 21 behaviour cases.
- `src/app/__tests__/marketing-copy-landlord-only.test.ts` - dropped the now-shipped "rent tracking" false-claim entry (see deviation 4).
- `.planning/phases/55-rent-ledger/deferred-items.md` - logged D4.

## Decisions Made

- **Submit is never gated on `canSubmit`.** With a form-level validator, blurring any field validates the WHOLE form, so `canSubmit` goes false while the user is still filling in the rest. A `!canSubmit`-disabled button therefore disables itself on the blur that the submit click itself causes, and the click is swallowed — the button visibly does nothing. Gating only on `isSubmitting` also gives the accessible behaviour: submitting an invalid form marks every field touched and surfaces all the validation copy at once.
- **A single `onChange` validator, not `onChange` + `onSubmit`.** TanStack runs the change, blur and submit validators together at submit time, so one schema is enough to catch a pristine invalid form. Registering the same schema twice writes the identical message under two `errorMap` keys and `FieldError` renders it twice in a `<ul>`.
- **`safeParse` in `onSubmit` rather than a hand-rolled narrow.** The amount field holds `number | null` (empty input maps to `null`, never `NaN`), and the mutation wants `number`. Re-parsing with the same schema that produced the field errors yields the payload already narrowed, with no cast and no chance of the two disagreeing.
- **One shared date field, kept out of the global registry.** `src/lib/forms/fields/` has a `DateField`, but it is a native `<input type="date">`; the UI-SPEC calls for Calendar-in-Popover. Rather than triplicate ~45 lines or push a ledger-specific field into the app-wide `fieldComponents` registry, the field lives beside its three consumers and binds through `useFieldContext` — which works because `form.AppField` provides the field context to its whole subtree.
- **Colon instead of the UI-SPEC's em-dash in the method helper.** The same Copywriting Contract forbids em-dashes in user-facing strings; "A label only: cash, check, Zelle. TenantFlow does not move money." satisfies both halves of the document.
- **An empty charge list gets an explanation, not a dead form.** A tracked lease with no charges yet renders "This ledger has no charges yet. Start tracking rent or add a line first, then record the payment against it." and disables the submit, instead of offering an empty picker.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The Calendar-in-Popover date field had no shared implementation**
- **Found during:** Task 1 (record-receipt dialog)
- **Issue:** The plan and the UI-SPEC both specify a Calendar in a Popover for the date on all three dialogs. The repo's registered `DateField` is a native `<input type="date">`, so honouring the spec meant either triplicating ~45 lines of popover/calendar/parse/format wiring or pushing a ledger-specific field into the app-wide registry in `form-hook.tsx`.
- **Fix:** Added `src/components/ledger/ledger-date-field.tsx` — one Calendar-in-Popover field bound via `useFieldContext`, plus the `LEDGER_DATE_PATTERN` / `toLedgerDateString` / `fromLedgerDateString` helpers the three zod schemas share. It is a fourth file beyond the plan's three, kept inside the ledger directory so the shared registry stays subsystem-agnostic.
- **Files modified:** `src/components/ledger/ledger-date-field.tsx` (new)
- **Verification:** All three dialogs render and submit a `YYYY-MM-DD` value; typecheck + lint clean; the money guard scans it (it lives under `src/components/ledger`).
- **Committed in:** `91c8358d6`

**2. [Rule 1 - Bug] The submit button disabled itself on the click that was meant to submit**
- **Found during:** Task 1 (record-receipt dialog)
- **Issue:** With `validators.onBlur` + a `disabled={!canSubmit}` submit button (the shape used elsewhere in the repo), filling the form and clicking "Record receipt" did nothing: the blur fired by the click validated the whole form, flipped `canSubmit` false, React re-rendered the button as disabled, and the click never reached the form. Reproduced deterministically — the form's `onSubmit` was never entered and only the last-blurred field showed an error.
- **Fix:** Gated the submit on `isSubmitting` (plus the structural `!hasCharges`) only, with a comment naming the cause. Applied to all three dialogs.
- **Files modified:** `record-receipt-dialog.tsx`, `add-line-dialog.tsx`, `track-since-dialog.tsx`
- **Verification:** "records a partial payment in dollars against the chosen charge" and the two sibling happy-path tests now reach `mutateAsync`; the empty-submit tests show all validation copy at once.
- **Committed in:** `91c8358d6`, `8df12a669`

**3. [Rule 1 - Bug] A value set without a blur left the form permanently unsubmittable**
- **Found during:** Task 1 (record-receipt dialog)
- **Issue:** Even with the button always clickable, `FormApi._handleSubmit` early-returns on a stale `canSubmit` BEFORE it revalidates. The method chips, the Calendar popover and the Radix `Select` all set values programmatically without blurring, so after filling the last field via a chip the form still believed itself invalid and refused to submit — with the stale error still on screen.
- **Fix:** Switched the form-level validator from `onBlur` to `onChange`, so every value change (typed, chipped, picked) keeps `canSubmit` honest. Dropped the duplicate `onSubmit` registration, which was rendering each message twice (submit runs the change/blur/submit validators together, so one schema still covers a pristine form). Applied to all three dialogs.
- **Files modified:** `record-receipt-dialog.tsx`, `add-line-dialog.tsx`, `track-since-dialog.tsx`
- **Verification:** Full suite green; "blocks a submit with no charge, no amount and no method" asserts exactly one instance of each message.
- **Committed in:** `91c8358d6`, `8df12a669`

**4. [Rule 3 - Blocking] The false-feature-claim guard still banned "rent tracking"**
- **Found during:** Task 2 (track-since dialog)
- **Issue:** `marketing-copy-landlord-only.test.ts` scans every non-test file under `src/components/**` for claims about capabilities the product does NOT ship, and `"rent tracking"` was on that list from the v2.7 positioning sweep. Phase 55 ships exactly that: `rent_charges` / `rent_receipts`, the `generate_rent_charges` cron, the read RPCs and the ledger surface are live in production. The entry is now factually stale and blocked the commit.
- **Fix:** Removed the single entry, with a comment citing Phase 55 and the file's own instruction ("if a future product genuinely ships any of these, remove the corresponding entry"). Every facilitation phrase is untouched and still banned — `rent collection`, `online rent`, `autopay`, `pay rent`, `process rent`, `rent processing` — because TenantFlow still moves no money: the ledger records payments the owner already received and `method` is a text label, not a rail.
- **Files modified:** `src/app/__tests__/marketing-copy-landlord-only.test.ts`
- **Verification:** The guard suite passes with every other ban intact.
- **Committed in:** `8df12a669`

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bugs)
**Impact on plan:** No scope creep. One extra file (the shared date field) exists only to satisfy the plan's own Calendar-in-Popover instruction across three consumers; the two form bugs would each have shipped a dialog whose primary button does nothing; the guard entry was a stale false-claim ban that Phase 55 itself invalidated.

## Issues Encountered

- **Diagnosing the dead submit button took three rounds.** The symptom (nothing happens, one stale error visible) is indistinguishable from "the click never fired". Isolating it needed a throwaway harness that dumped `form.state.fieldMeta` after a submit, which showed all fields touched but errors from a single blur — proving the click landed and `_handleSubmit` had early-returned. The throwaway harness was deleted before either commit. The general shape is logged as **D4** in `deferred-items.md`, since `lease-form-options.ts` and other forms carry the same `onBlur` + `canSubmit` combination.
- **Concurrent working-tree edits.** The orchestrator had its own files staged in the index throughout (two migrations plus five test files). Every commit here used a pathspec commit (`git commit -- <my paths>`) so nothing outside this plan was absorbed, and no `--no-verify` was used at any point. Three of those files also had formatting that failed `biome check` mid-run; they were re-checked and left untouched, and the whole-repo lint settled green on its own.

## Verification

- `bun run validate:quick` → **green: 302 files / 107,371 tests, typecheck clean (root + tests/integration + tests/e2e), biome clean (1336 files).**
- `bun run test:unit -- src/components/ledger/` → **33/33 pass** across the four ledger component suites.
- `bun run test:unit -- src/hooks/api/__tests__/rent-ledger-money.test.ts` → **18/18 pass**; the guard now emits a per-file assertion for all four new ledger components (it scans `src/components/ledger` recursively, so no path list needed extending this time).
- Task 1 gate: `RECEIPT_DIALOG_OK` — file exists, no `* 100` / `/ 100` / `formatCents(` / `Pay now`, no typecheck errors naming the file.
- Task 2 gate: `LINE_TRACK_OK` — both files exist, the opening-balance note matches verbatim, no cents math, no typecheck errors.
- Every commit passed the full lefthook chain (gitleaks, lockfile-verify, lint, typecheck, unit tests with the 80% coverage threshold) and commitlint.
- No `any`, no `as unknown as`, no inline styles, no emoji; every icon is lucide; muted text uses `text-muted-foreground`; all files are under the 300-line cap (288 / 216 / 185 / 117).

## Known Stubs

None. All three dialogs call live mutations that write real rows through the production RPCs and tables shipped in 55-01/55-02. No placeholder data, no hardcoded amounts, no unwired props.

## Threat Flags

None. This plan adds no network endpoint, auth path, file access pattern or schema change — it binds to mutations that already existed. The threat register's four mitigations are implemented: T-55-16 (zod bounds every amount, date, type and label before the mutation is called, with the UI-SPEC copy as the messages), T-55-18 (the method field is a labelled text input with suggestion chips; no card, ACH-connect or "Pay now" affordance exists, asserted by test), T-55-05 (dollars end-to-end, `formatCurrency` for display, enforced by the static money guard), T-55-19 (no dialog toasts on success or failure — `createMutationCallbacks` owns the single toast, and the form only logs on catch).

## User Setup Required

None.

## Next Phase Readiness

- **55-07 (ledger tab)** mounts these three with the controlled props contract: `RecordReceiptDialog { leaseId, charges, open, onOpenChange }`, `AddLineDialog { leaseId, open, onOpenChange }`, `TrackSinceDialog { leaseId, open, onOpenChange }`. `charges` is typed `readonly LedgerEntry[]`, so the tab can pass its `LedgerEntryRow[]` straight through after filtering to open/partial charges.
- The dialogs are controlled and stay mounted across opens; each resets its own defaults on close and on success, so the tab only owns the boolean.
- The tab must NOT add a success toast of its own — `createMutationCallbacks` fires "Payment recorded" / "Line added" / "Rent tracking started" already.
- `ledger-date-field.tsx` exports `LEDGER_DATE_PATTERN`, `toLedgerDateString` and `fromLedgerDateString` if the tab needs date handling; import from that file directly (no barrels).

## Self-Check: PASSED

- FOUND: src/components/ledger/record-receipt-dialog.tsx
- FOUND: src/components/ledger/add-line-dialog.tsx
- FOUND: src/components/ledger/track-since-dialog.tsx
- FOUND: src/components/ledger/ledger-date-field.tsx
- FOUND: src/components/ledger/__tests__/record-receipt-dialog.test.tsx
- FOUND: src/components/ledger/__tests__/add-line-dialog.test.tsx
- FOUND: src/components/ledger/__tests__/track-since-dialog.test.tsx
- FOUND commit: 91c8358d6
- FOUND commit: 8df12a669

---
*Phase: 55-rent-ledger*
*Completed: 2026-07-25*
