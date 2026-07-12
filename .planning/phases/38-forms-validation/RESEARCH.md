# Phase 38 Research — Forms & Validation
_Fix-approach research + will-fix validation for FORM-01..19. Source: .planning/audits/2026-07-11-full-audit.md_

> **Cross-cutting decision applied throughout (full rationale in Cross-cutting notes):**
> The money columns `leases.{rent_amount,security_deposit,late_fee_amount,pet_deposit,pet_rent}`,
> `units.rent_amount`, `maintenance_requests.estimated_cost` are `integer` (whole dollars) in prod —
> re-verified via information_schema. All money findings are fixed by **enforcing whole-dollar
> integers client-side** (schema `.int()` + `step="1"` + no-cents placeholders + integer parse/guard),
> which matches prod reality and the already-shipped renew-lease `step="1"` precedent
> (renew-lease-form-fields.tsx:183). The alternative (migrate the columns to `numeric(10,2)` per
> CLAUDE.md's stated convention) is recorded as the Decision on each money REQ and rejected for blast radius.

## FORM-01 — Lease rent/deposit inputs accept cents into integer columns
- **Finding:** src/components/leases/lease-form-financial-fields.tsx:43 (high) — Monthly Rent / Security Deposit use `step="0.01"` + `Number.parseFloat`, but `leases.rent_amount`/`security_deposit` are `integer`; a decimal entry inserts/PATCHes a fractional value → 22P02, genericized to "Something went wrong."
- **Root cause:** The input invites cents (`step="0.01"`) and `Number.parseFloat` preserves them, and the form validator (`lease-form-options.ts` `validationSchema`) is `z.number().min(0)` with no `.int()`. `leaseMutations.create`/`update` insert the raw float straight into the integer column with no rounding.
- **Fix:** Whole-dollar enforcement in three coordinated spots (do the whole money class at once):
  1. `lease-form-financial-fields.tsx`: change both `rent_amount` and `security_deposit` inputs to `step="1"`, and parse with `Math.round(Number.parseFloat(v))` (or `Number.parseInt`) so state can never hold cents.
  2. `lease-form-options.ts` `validationSchema`: change `rent_amount`/`security_deposit` from `z.number().min(0)` to the new whole-dollar helpers (`positiveWholeDollarSchema` / `nonNegativeWholeDollarSchema` from common.ts — see Cross-cutting) so a decimal that slips in shows a field error ("Enter a whole dollar amount (no cents)") instead of a raw DB failure.
- **Why it fixes it:** The verifier's exact failure is `json_populate_record(null::leases,'{"rent_amount":1500.55}')` → 22P02. Feeding only integers to the insert removes the decimal that triggers 22P02; the schema `.int()` gives an actionable field error rather than the genericized toast that RAW_DB_INTERNALS produces for `invalid input syntax`.
- **Risks / interactions:** `defaultValues` seed from `lease?.rent_amount ?? 0` are already integers in prod, so edit-mode prefill is unaffected. Shares the common.ts helper with the whole class — land the helper first. Same file (`lease-form-options.ts`) is edited by FORM-07 (date refine) — batch. No DB change.
- **Files touched:** src/components/leases/lease-form-financial-fields.tsx, src/components/leases/lease-form-options.ts, src/lib/validation/common.ts
- **Decision:** Whole-dollar client enforcement chosen over an integer→`numeric(10,2)` DB migration (CLAUDE.md convention). See Cross-cutting.

## FORM-02 — Lease edit always sends a non-existent `version` column → PGRST204
- **Finding:** src/components/leases/lease-form.tsx:103 (high) — Edit mode submits `version: lease.version ?? 1`; `leases` has no `version` column, so `?? 1` always yields `1` and every edit PATCH is rejected PGRST204.
- **Root cause:** `LeaseWithExtras.version` (core.ts:135) is a phantom client-only optional never populated from the DB, so `lease.version` is always `undefined` and `?? 1` coerces it to the truthy `1`, which is passed to `updateLeaseMutation.mutateAsync({ id, data, version })`. Confirmed against generated `supabase.ts`: only `notification_settings` carries a `version` column; `leases` (and units/maintenance) do not — which is why units/maintenance, that pass `version` only when `!== undefined`, never break, while leases' `?? 1` always does.
- **Fix (class-wide with FORM-04):** Stop sending `version` on lease updates entirely. In `lease-form.tsx` drop the `version: lease.version ?? 1` argument from the `updateLeaseMutation.mutateAsync({...})` call (edit branch). Paired with FORM-04 removing the param from the mutationFn.
- **Why it fixes it:** With no `version` key in the mutate args, the PATCH body (after FORM-04) never contains an unknown column, so PostgREST stops returning PGRST204 and the update succeeds — resolving the verifier's "every edit-mode submit throws via handlePostgrestError."
- **Risks / interactions:** Must land together with FORM-04 (same call contract) in one change. Removes the only reference to `lease.version` in this file — no optimistic-lock behavior is lost because none ever existed for leases. Phantom `LeaseWithExtras.version`/`LeaseWithVersion` types can stay (Phase 40 TYPE may prune them) — not required for this fix and must not block it.
- **Files touched:** src/components/leases/lease-form.tsx
- **Decision:** Remove the phantom `version` (root cause) rather than add a real `version` column + optimistic-locking trigger to `leases`; adding real optimistic locking is a much larger migration for an unrequested feature and is out of scope.

## FORM-03 — Edit Unit panel rent input accepts cents into integer `units.rent_amount`
- **Finding:** src/components/properties/edit-unit-panel.tsx:194 (high) — `step="0.01"`/placeholder `0.00`, `Number.parseFloat` (line 72), only a `>0` guard; a cents rent hits 22P02 with a generic "Update unit" toast and no field error. Sibling of add-unit-panel and unit-form.
- **Root cause:** Same money class. This panel validates imperatively (toast-based), not via zod, so there is no schema to catch a non-integer — the only guards are `Number.isFinite` + `> 0`, which pass `1500.50`.
- **Fix:** In `edit-unit-panel.tsx`: change the `rent_amount` `IconInputField` to `step="1"` and placeholder `"0"`, and in the onSubmit numeric-validation block add an explicit integer guard after parsing: `if (!Number.isInteger(rent_amount)) { toast.error("Monthly rent must be a whole dollar amount (no cents)"); setIsSubmitting(false); return; }`.
- **Why it fixes it:** The verifier's `json_populate_record(null::units,'{"rent_amount":1500.50}')` → 22P02 is prevented — a non-integer is caught with a clear message before `unitMutations.update`; only integers reach PostgREST.
- **Risks / interactions:** Identical pattern to FORM-12 (add-unit-panel) and FORM-15 (unit-form) — do all three as one sweep so no sibling trickles out. The `>0`/`Number.isFinite` guards stay. No interaction with the PROP-05 `square_feet` null-clear logic already present.
- **Files touched:** src/components/properties/edit-unit-panel.tsx
- **Decision:** Whole-dollar client enforcement over `numeric(10,2)` migration. See Cross-cutting.

## FORM-04 — Lease update mutationFn spreads phantom `version` into the PATCH body → PGRST204
- **Finding:** src/hooks/api/query-keys/lease-mutation-options.ts:96 (high) — `payload = omitUndefined(version ? { ...data, version } : { ...data })`; `omitUndefined` keeps the truthy `1`, so the PATCH carries an unknown `version` column and PostgREST rejects it.
- **Root cause:** The `update` mutationFn accepts an optional `version?: number` and merges it into the payload when truthy. Combined with FORM-02 always passing `1`, every lease update body includes `version`. `leases` has no such column.
- **Fix (class-wide with FORM-02):** Remove `version` from `leaseMutations.update` entirely — drop the `version` field from the destructured args and the `version?: number` from the arg type, and simplify to `const payload = omitUndefined({ ...data })`. Update `useUpdateLeaseMutation`'s variable type if it re-exports the arg shape.
- **Why it fixes it:** The PATCH body reduces to real lease columns in `data`, so the PGRST204 "Could not find the 'version' column of 'leases'" the verifier reproduced no longer occurs.
- **Risks / interactions:** Coupled to FORM-02 (its sole caller — grep confirms lease-form.tsx is the only caller). `omitUndefined` semantics unchanged for the rest of `data`.
- **Files touched:** src/hooks/api/query-keys/lease-mutation-options.ts
- **Decision:** Same as FORM-02 — remove phantom `version` vs. add real optimistic locking. Remove.

## FORM-05 — Template Preview/Export never validate, so wired zod schemas gate nothing
- **Finding:** src/app/(owner)/documents/templates/components/use-template-pdf.ts:87 (medium) — `handleExport`/`handlePreview` call `getPayload()` on raw `form.state.values` and never invoke `form.handleSubmit()`/check `isValid`, so the four templates' `onSubmitAsync` schema validators are dead code; an invalid rental-application email or empty tenant name still exports a finished PDF.
- **Root cause:** `useTemplatePdf` has no reference to the form and no validation gate; each template client wires validators but the PDF actions bypass them by reading state directly.
- **Fix:** Add an optional `validate` gate to `useTemplatePdf` and call it in `handleExport` before generating:
  1. `use-template-pdf.ts`: accept a third arg `validate?: () => boolean | Promise<boolean>`; at the top of `handleExport`, `if (validate && !(await validate())) { toast.error("Please fix the highlighted fields before exporting."); return; }`. Gate export; leave preview lenient so drafts still render.
  2. Each of the four clients (tenant-notice, rental-application, property-inspection, maintenance-request `*.client.tsx`): pass `validate` that runs the form's validators and surfaces field errors, e.g. `async () => { await form.handleSubmit(); return form.state.isValid }` (TanStack `handleSubmit` runs the `onSubmitAsync` validators and maps the zod tree errors onto fields even with no `onSubmit` handler).
- **Why it fixes it:** The verifier's repro — clearing `tenantName` or entering an invalid email and clicking Export still downloads a PDF — is blocked because export now aborts on `isValid === false` and the tree errors render on the fields via `handleSubmit`.
- **Risks / interactions:** All four clients share `useTemplatePdf`, so the signature change touches each call site (fifth caller is `use-template-pdf.test.ts` — update it). Preview stays unvalidated by design (fast draft). `DynamicForm` already renders `field.state.meta.errors`.
- **Files touched:** src/app/(owner)/documents/templates/components/use-template-pdf.ts, src/app/(owner)/documents/templates/components/tenant-notice-template.client.tsx, src/app/(owner)/documents/templates/components/rental-application-template.client.tsx, src/app/(owner)/documents/templates/components/property-inspection-template.client.tsx, src/app/(owner)/documents/templates/components/maintenance-request-template.client.tsx

## FORM-06 — Lease CSV import accepts decimal rent/deposit; RPC silently rounds into integer columns
- **Finding:** src/components/leases/bulk-import-config.ts:109 (medium) — `coerceOptionalNumber` keeps decimals and shared `leaseInputSchema` rent/deposit have no `.int()`, so `"1800.50"` validates clean; `bulk_import_create_lease(p_rent_amount numeric)` then inserts into `leases.rent_amount integer` where the numeric→integer assignment cast rounds to 1801 with no warning.
- **Root cause:** `leaseInputSchema.rent_amount`/`security_deposit`/`late_fee_amount` use `positiveNumberSchema`/`nonNegativeNumberSchema` (no `.int()`); the RPC's `numeric` params accept the fraction and Postgres rounds on assignment.
- **Fix:** Add `.int()` at the shared schema (fixes the import path without touching the RPC): in `leases.ts` change `leaseInputSchema.rent_amount`/`security_deposit`/`late_fee_amount` to the whole-dollar helpers (`positiveWholeDollarSchema`/`nonNegativeWholeDollarSchema` + existing `.max()`). `coerceOptionalNumber` can stay — a decimal cell now fails the row with a readable "whole dollar amount" error instead of silently rounding.
- **Why it fixes it:** The verifier's "1800.5 validates clean → RPC rounds to 1801" is stopped at client validation: `.int()` rejects 1800.5, so the row surfaces an error and is never sent to the RPC.
- **Risks / interactions:** `leaseInputSchema` money fields are consumed by the lease bulk import; the lease FORM uses its own `lease-form-options` schema and the wizard its own, so tightening here is import-scoped. RPC signature stays `numeric` (no migration) — defense-at-the-edge, consistent with the client-enforcement decision.
- **Files touched:** src/lib/validation/leases.ts, src/lib/validation/common.ts
- **Decision:** Whole-dollar client `.int()` over migrating the columns and/or the RPC params to `numeric(10,2)`. See Cross-cutting.

## FORM-07 — Lease form has no end-date-after-start-date validation
- **Finding:** src/components/leases/lease-form-options.ts:13 (medium) — `validationSchema` only checks both dates are non-empty; a draft lease with `end_date < start_date` persists silently, and an active/pending one hits the raw exclusion-constraint range error genericized to "Something went wrong."
- **Root cause:** No cross-field refine on the form schema; the DB's only guard (`leases_unit_date_overlap_exclusion`) is a partial constraint `where lease_status in ('active','pending_signature')` that never evaluates draft rows, and raises a raw range error when it does fire.
- **Fix:** Add a `.refine()` to the `lease-form-options.ts` `validationSchema` mirroring the wizard's `termsStepSchema`: `end_date` must be strictly after `start_date`, `{ message: "End date must be after start date", path: ["end_date"] }` (compare via `new Date(...T00:00:00.000Z)`). The end_date field renders through `field.DateField`, which surfaces `field.state.meta.errors`, so the message shows inline.
- **Why it fixes it:** Both verifier cases resolve — the draft-lease silent persist is blocked by a field error, and the active-lease raw range error is pre-empted before the mutation fires.
- **Risks / interactions:** Refine runs on `onBlur`+`onSubmit` (both validators are the same schema object). Same file as FORM-01 (money `.int()`) — coordinate the two edits. `DateField` is a standard form-hook field (like `TextField`) and renders errors.
- **Files touched:** src/components/leases/lease-form-options.ts
- **Decision:** Client-side refine chosen over adding a DB `CHECK (end_date >= start_date)` on `leases`. A CHECK is defense-in-depth but is a migration that would reject pre-existing reversed-date draft rows and needs a backfill audit; the client refine matches the wizard precedent with zero blast radius.

## FORM-08 — Wizard Pet Deposit / Pet Rent accept cents into integer columns
- **Finding:** src/components/leases/wizard/details-step.tsx:160 (medium) — `pet_deposit`/`pet_rent` inputs use `step="0.01"` + placeholders `300.00`/`25.00`, `parseDollars` preserves decimals, and `leaseDetailsStepSchema` has no `.int()`; both prod columns are `integer`, so 300.50 passes the wizard then fails 22P02 at final insert.
- **Root cause:** Money class in the wizard's details step — decimal-inviting inputs + `nonNegativeNumberSchema` without `.int()`.
- **Fix:** In `details-step.tsx` change both pet inputs to `step="1"` and placeholders `"300"`/`"25"`, and parse to integer (round in `parseDollars`). In `lease-wizard.schemas.ts` change `leaseDetailsStepSchema.pet_deposit`/`pet_rent` (and the `leaseWizardBaseSchema` mirror) to `nonNegativeWholeDollarSchema.max(...)`. The `.int()` message becomes visible once FORM-09 renders wizard errors.
- **Why it fixes it:** The verifier's `pet_deposit:300.5` → 22P02 is prevented — only integers reach the insert, and a stray decimal is caught by `.int()` (surfaced by FORM-09).
- **Risks / interactions:** Depends on FORM-09 landing (same phase) for the message to be user-visible. Shares `lease-wizard.schemas.ts` with FORM-10 — do the terms + details money edits together.
- **Files touched:** src/components/leases/wizard/details-step.tsx, src/lib/validation/lease-wizard.schemas.ts, src/lib/validation/common.ts
- **Decision:** Whole-dollar client enforcement over `numeric(10,2)` migration. See Cross-cutting.

## FORM-09 — Wizard step errors are computed but never rendered
- **Finding:** src/components/leases/wizard/lease-creation-wizard.tsx:246 (medium) — `validateStep` returns only `safeParse().success` feeding `disabled={!canGoNext}`; TermsStep/DetailsStep render no field errors, so a reversed date, `payment_day` 0/32, or missing lead-paint ack just greys out Next with no explanation.
- **Root cause:** The wizard discards the zod `issues` (keeps only `.success`) and no step component has error UI.
- **Fix:** Surface the issues:
  1. `lease-creation-wizard.tsx`: replace the boolean-only gate with validate-on-advance — keep Next/Create enabled, and in `goToNextStep`/`handleSubmit` run the current step's `safeParse`; on failure store a `Record<fieldPath, message>` (flatten `error.issues` by `issue.path[0]`) in state and do not advance; on success clear + advance. Pass the per-step error map down.
  2. `terms-step.tsx` / `details-step.tsx`: accept an `errors?: Partial<Record<string,string>>` prop and render `<FieldError>` (destructive style) under each field, plus a summary line for cross-field errors (`end_date`, `lead_paint_disclosure_acknowledged`).
- **Why it fixes it:** The verifier's "schema messages never shown" is resolved — "End date must be after start date", "Payment day must be between 1 and 31", and the lead-paint ack requirement now render at the field on a failed advance.
- **Risks / interactions:** Larger change (3 files). It is the delivery vehicle for the `.int()` messages added in FORM-08/FORM-10 — sequence the FORM-08/10 schema edits and FORM-09 rendering together. `payment_day` is a free-text `parseInteger` input; the schema already bounds 1–31, so the error now shows. No back-end change.
- **Files touched:** src/components/leases/wizard/lease-creation-wizard.tsx, src/components/leases/wizard/terms-step.tsx, src/components/leases/wizard/details-step.tsx

## FORM-10 — Wizard Rent/Deposit/Late-Fee accept cents into integer columns
- **Finding:** src/components/leases/wizard/terms-step.tsx:179 (medium) — `parseDollars` keeps decimals, placeholders `1500.00`/`50.00`, `termsStepSchema` uses `positiveNumberSchema`/`nonNegativeNumberSchema` without `.int()`; 1500.50 passes step validation then fails 22P02 after all four steps.
- **Root cause:** Money class in the wizard's terms step.
- **Fix:** Three coordinated spots:
  1. `terms-step.tsx`: change the three currency inputs (`rent_amount`/`security_deposit`/`late_fee_amount`) from decimal-inviting to whole-dollar — placeholders `1500.00`/`1500.00`/`50.00` → `1500`/`1500`/`50`, and `inputMode="decimal"` → `inputMode="numeric"` so the mobile keyboard drops the decimal key (matching the sibling `payment_day`/`grace_period_days` inputs already on `inputMode="numeric"`). Leave `parseDollars` un-rounded (it strips everything except digits and `.`) so a stray `1500.50` a desktop user still types reaches the schema and is REJECTED by `.int()` rather than silently rounded to 1501.
  2. `lease-wizard.schemas.ts`: change `termsStepSchema.rent_amount`/`security_deposit`/`late_fee_amount` (and the `leaseWizardBaseSchema` mirror) to `positiveWholeDollarSchema`/`nonNegativeWholeDollarSchema` + existing `.max()`.
  3. `__tests__/terms-step.test.tsx` (the co-located UI test): the "should use decimal inputMode for currency fields" case (lines 143-158) hard-asserts `toHaveAttribute("inputMode", "decimal")` on all three currency inputs, so the inputMode flip must land with it — rename the case to "should use numeric inputMode for currency fields (whole dollars)" and flip its three assertions to `"numeric"`. Nothing else in the file breaks: the "should use numeric inputMode for integer fields" case (line 160) is unaffected, no placeholder is asserted, and the `dollarsToDisplay` value tests (`toHaveValue("1500")`/`"2000"`/`"50"`) still pass since state holds integers.
- **Why it fixes it:** The verifier's `rent_amount:1500.50` → 22P02 at final insert is prevented — integers only reach `supabase.from("leases").insert()`, and a stray decimal is caught by `.int()` (surfaced by FORM-09) with an actionable message instead of the raw DB error, while `inputMode="numeric"` removes the decimal key that invited the cents. Updating `terms-step.test.tsx` in the same change keeps `test:unit` green — the prior proposal flipped the inputMode but omitted the test, breaking `terms-step.test.tsx:143`'s hard `toHaveAttribute("inputMode","decimal")` assertion; both the flip and the test update are now paired.
- **Risks / interactions:** Same `lease-wizard.schemas.ts` and `terms-step.tsx` as FORM-08/FORM-09 — batch the wizard edits. Depends on FORM-09 for visible messaging. The inputMode flip requires editing the co-located `terms-step.test.tsx` (added to Files) — the file's own header note states validation is tested in the schema tests and this component test verifies UI behavior only, so flipping the decimal→numeric assertions is a mechanical, correct update tracking the intended whole-dollar UX, not a weakened test. `parseDollars` is intentionally left un-rounded so `.int()` rejects cents rather than silently altering the amount.
- **Files touched:** src/components/leases/wizard/terms-step.tsx, src/components/leases/wizard/__tests__/terms-step.test.tsx, src/lib/validation/lease-wizard.schemas.ts, src/lib/validation/common.ts
- **Decision:** Whole-dollar client enforcement over `numeric(10,2)` migration. See Cross-cutting.

## FORM-11 — Estimated Cost accepts decimals and negatives into integer `maintenance_requests.estimated_cost`
- **Finding:** src/components/maintenance/maintenance-form-fields.tsx:246 (medium) — the `estimated_cost` field has no validator, the form is `noValidate` (so native `min="0"`/`step` are inert), and `use-maintenance-form.ts` passes raw `parseFloat` through; `250.50` fails 22P02 (generic toast) and `-50` saves silently (no DB CHECK).
- **Root cause:** No field-level validator on a string-typed input, `noValidate` disables the native checks, and the mutation inserts the parsed float directly (`maintenance-keys.ts` create line 325 / update line 350 use `omitUndefined(data)` with no rounding). The schema's `estimated_cost` is a `z.number()` schema and cannot be attached to a string field.
- **Fix:** Attach a string-based whole-dollar validator to the field and align the input:
  1. `maintenance-form-fields.tsx`: change the input to `step="1"`/placeholder `"0"`, and add `validators={{ onChange: optionalWholeDollarStringSchema, onSubmit: optionalWholeDollarStringSchema }}` where `optionalWholeDollarStringSchema` (new, in common.ts) = `z.string().refine(v => v.trim() === "" || (/^\d+$/.test(v.trim()) && Number(v) > 0), "Estimated cost must be a whole dollar amount greater than 0")`. This rejects both `250.50` and `-50` with a field error; empty stays valid (cost is optional).
  2. `use-maintenance-form.ts` (defense): parse with `Number.parseInt`/`Math.round` so a validated integer string is stored as an integer.
- **Why it fixes it:** The verifier's `json_to_recordset('[{"a":250.5}]') AS t(a integer)` 22P02 and the silent `-50` insert are both blocked at the field validator before the mutation, and the input no longer invites cents.
- **Risks / interactions:** Must use a STRING schema (the field value is a string) — do NOT attach `maintenanceRequestCreateSchema.shape.estimated_cost` (a number schema; type-mismatched). Empty must stay valid. Sibling money field `actual_cost` (also integer, edited elsewhere) is out of FORM-11 scope but warrants the same treatment — see Cross-cutting sweep.
- **Files touched:** src/components/maintenance/maintenance-form-fields.tsx, src/hooks/use-maintenance-form.ts, src/lib/validation/common.ts
- **Decision:** Whole-dollar client enforcement over `numeric(10,2)` migration. See Cross-cutting.

## FORM-12 — Add Unit panel rent input accepts cents into integer `units.rent_amount`
- **Finding:** src/components/properties/add-unit-panel.tsx:189 (medium) — `step="0.01"`/placeholder `0.00`, `Number.parseFloat` (line 80), only a `>0` guard; a rent of 950.75 hits 22P02 surfaced only as a generic "Create unit" toast. Sibling of edit-unit-panel and unit-form.
- **Root cause:** Same as FORM-03 — imperative (non-zod) validation with no integer guard.
- **Fix:** In `add-unit-panel.tsx`: input `step="1"`/placeholder `"0"`, and add the same integer guard as FORM-03 after parsing (`if (!Number.isInteger(rent_amount)) { toast.error("Monthly rent must be a whole dollar amount (no cents)"); setIsSubmitting(false); return; }`).
- **Why it fixes it:** The verifier's `json_populate_record(null::units,'{"rent_amount":950.75}')` → 22P02 is prevented — the non-integer is caught with a clear message before `unitMutations.create`.
- **Risks / interactions:** Do together with FORM-03 (edit-unit) and FORM-15 (unit-form) as one sweep. No DB change.
- **Files touched:** src/components/properties/add-unit-panel.tsx
- **Decision:** Whole-dollar client enforcement over `numeric(10,2)` migration. See Cross-cutting.

## FORM-13 — Emergency-contact save/delete await mutateAsync with no try/catch (unhandled rejection)
- **Finding:** src/components/settings/owner-emergency-contact-section.tsx:59 (medium) — `handleSave` (59) and `handleDelete` (81) bare-`await` `mutateAsync` inside async handlers passed to `onSubmit`/`onClick`; a failure escapes as a window `unhandledrejection` (duplicate Sentry + dev overlay) even though the hook's `onError` already toasts. FORMFIX-08 class.
- **Root cause:** The returned promise from `mutateAsync` is neither caught nor awaited by React; TanStack `mutateAsync` always rejects on failure.
- **Fix (class-wide with FORM-18):** Wrap each handler body in try/catch. Keep the success-only state changes inside the try after the await (`setIsEditing(false)`; for delete `setFormData(EMPTY_FORM)` + `setIsEditing(false)` — so they only run on success). In `catch`, log via a `createLogger` (matching the FORMFIX-08 precedent) and do NOT re-throw; the hook's `onError` (toast + rollback, use-owner-emergency-contact.ts) already handled the user-facing side.
- **Why it fixes it:** The verifier's "escapes as a window unhandledrejection → second Sentry capture + dev overlay" is eliminated because the rejection is caught locally.
- **Risks / interactions:** Same one-line-class pattern as commit 21bf44032. The delete's `setFormData(EMPTY_FORM)` becomes intentionally success-only rather than incidental (currently only skipped by the throw). No behavior change on success.
- **Files touched:** src/components/settings/owner-emergency-contact-section.tsx

## FORM-14 — Unit CSV import accepts decimal rent_amount → raw per-row 22P02
- **Finding:** src/components/units/bulk-import-config.ts:87 (medium) — `unitInputSchema.rent_amount` is `nonNegativeNumberSchema` with no `.int()` (unlike bedrooms/square_feet), and `coerceOptionalNumber` keeps decimals, so `"1500.50"` validates as importable, then the direct insert fails `invalid input syntax for type integer: "1500.50"` shown raw in the row-error list.
- **Root cause:** Missing `.int()` on the shared `unitInputSchema.rent_amount`.
- **Fix:** In `units.ts` change `unitInputSchema.rent_amount` from `nonNegativeNumberSchema.max(UNIT_RENT_MAXIMUM,...)` to `nonNegativeWholeDollarSchema.max(UNIT_RENT_MAXIMUM,...)`. The row then fails at validation with a readable "whole dollar amount" message instead of a raw DB error.
- **Why it fixes it:** The verifier's `rent_amount:1500.50` insert 22P02 is stopped at validation — `.int()` rejects it before `insertRow`, surfacing a clean message.
- **Risks / interactions:** `unitInputSchema.rent_amount` is also consumed by `useCreateUnitMutation`/`useUpdateUnitMutation` typing — the panels/unit-form pass already-integer values (after FORM-03/12/15 guards), so tightening the schema is consistent, not conflicting. `bedrooms`/`square_feet` already `.int()`; this brings `rent_amount` in line.
- **Files touched:** src/lib/validation/units.ts, src/lib/validation/common.ts
- **Decision:** Whole-dollar client enforcement over `numeric(10,2)` migration. See Cross-cutting.

## FORM-15 — Unit form Monthly Rent input accepts cents into integer `units.rent_amount`
- **Finding:** src/components/units/unit-form-fields.tsx:104 (medium) — the field renders `step="0.01"`/placeholder `0.00`; `unit-form.client.tsx:108` parses with `Number.parseFloat` and only checks `>0` before inserting, so 1250.50 fails 22P02 with the generic toast. The renew-lease dialog already fixed this class with `step="1"`.
- **Root cause:** Same money class; the input invites cents and the imperative validation lacks an integer guard.
- **Fix:** In `unit-form-fields.tsx` change the `rent_amount` `IconInputField` to `step="1"`/placeholder `"0"`. In `unit-form.client.tsx` add the integer guard in the numeric-validation block (`if (!Number.isInteger(rent_amount)) { toast.error("Monthly rent must be a whole dollar amount (no cents)"); return; }`), matching FORM-03/12.
- **Why it fixes it:** The verifier's `json_to_recordset` 1250.5→int 22P02 is prevented — the non-integer is caught with a clear message before `unit-keys` insert/update.
- **Risks / interactions:** `unit-form-fields.tsx` is the shared display for both create and edit (`unit-form.client.tsx`), so one input change covers both modes; the guard lives in the client's onSubmit. Do together with FORM-03/12 and the FORM-14 schema tightening. Matches the shipped renew-lease `step="1"` precedent (renew-lease-form-fields.tsx:183).
- **Files touched:** src/components/units/unit-form-fields.tsx, src/components/units/unit-form.client.tsx
- **Decision:** Whole-dollar client enforcement over `numeric(10,2)` migration. See Cross-cutting.

## FORM-16 — Property form validates state/ZIP as merely non-empty, bypassing the strict rules in the same file
- **Finding:** src/lib/validation/properties.ts:208 (medium) — `propertyFormSchema.state`/`postal_code` are `requiredString` (`z.string().min(1)`), and `property-form-options.ts` picks exactly those as the form validators; the strict `/^[A-Z]{2}$/` and `/^\d{5}(-\d{4})?$/` rules in `propertyInputSchema` never run on the form, so state "T" or ZIP "abcde" save into unconstrained text columns.
- **Root cause:** The form-specific schema declares the loose `requiredString` for `state`/`postal_code` instead of reusing the strict field definitions that already exist in `propertyInputSchema`/`propertyAddressSchema`.
- **Fix:** In `properties.ts` change `propertyFormSchema.state` and `postal_code` to the strict definitions (reuse the exact `z.string().min(2).max(2).regex(/^[A-Z]{2}$/, "State must be 2 uppercase letters")` and `z.string().regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code (12345 or 12345-6789)")`; optionally hoist both into shared consts to avoid duplication). Because `property-form-options.ts` `.pick()`s these fields, the strict rules now run on blur/submit; `property-address-section.tsx` already renders `FieldError` for `state`, and the ZIP field renders errors via `field.TextField`.
- **Why it fixes it:** The verifier's "state 'T' and ZIP 'abcde' save without complaint" is resolved — both now fail the form validators with an inline message before `propertyMutations.create/update`.
- **Risks / interactions:** On EDIT, any existing property whose stored `state`/`postal_code` is not already normalized fails validation until corrected — acceptable/desired (the state input already uppercases and caps length 2). No DB migration (defense stays client-side; columns remain unconstrained text, consistent with the app-level-validation pattern).
- **Files touched:** src/lib/validation/properties.ts

## FORM-17 — Contact form has no client max-length while the edge function hard-rejects over-length
- **Finding:** src/components/contact/contact-form.tsx:51 (low) — `validateForm` checks only minimums and the inputs have no `maxLength`; `send-contact-email/index.ts` 400-rejects name/subject > 200, message > 5000, phone/company > 200. A pasted 6000-char message passes client validation, the 400 surfaces as "We couldn't send your message. Please try again…", and retrying can never succeed.
- **Root cause:** Client validation is not mirrored to the server's length caps, so an over-length field fails only server-side with a non-actionable generic message.
- **Fix:** Mirror the server caps client-side using the existing `VALIDATION_LIMITS.CONTACT_FORM_*` constants (name 100, subject 200, message 5000, phone 20 — all ≤ the edge caps):
  1. `contact-form.tsx` `validateForm`: add max-length checks with field-specific messages (e.g. `data.message.trim().length > CONTACT_FORM_MESSAGE_MAX_LENGTH → newErrors.message = "Message cannot exceed 5000 characters"`) for name/subject/message and optional phone/company.
  2. `contact-form-fields.tsx`: add matching `maxLength` attributes to the name/message/phone/company inputs so the UI prevents over-typing.
- **Why it fixes it:** The verifier's "6000-char message → 400 → unsatisfiable retry loop" is resolved — the field is blocked (or errors with an actionable message) before submit.
- **Risks / interactions:** Keep client caps ≤ server caps so anything the client accepts the server accepts. Low severity, public form with a stated email fallback. No back-end change.
- **Files touched:** src/components/contact/contact-form.tsx, src/components/contact/contact-form-fields.tsx

## FORM-18 — Failed inspection creation escapes handleSubmit as an unhandled rejection
- **Finding:** src/components/inspections/new-inspection-form.client.tsx:58 (low) — `await createInspection.mutateAsync(dto)` sits in an async submit handler with no try/catch; `useCreateInspection` uses `createMutationCallbacks` (onError already toasts + Sentry-captures), so a failure escapes as an unhandled rejection (duplicate capture + dev overlay). FORMFIX-08 class.
- **Root cause:** Same as FORM-13 — `mutateAsync` rejection not caught in the handler.
- **Fix (class-wide with FORM-13):** Wrap the mutate + post-success navigation in try/catch. Keep the `router.push(/inspections/${newId})` inside the try (success-only); in `catch`, log via `createLogger` and do NOT re-throw (the mutation's `onError` already toasts).
- **Why it fixes it:** The verifier's "any insert failure escapes as an unhandled rejection" is eliminated because the rejection is caught locally; the already-shown error toast remains the single user-facing signal.
- **Risks / interactions:** Same pattern as property-form.client.tsx (the cited FORMFIX-08 precedent). `createInspection.isPending` still drives the button state; no success-path change.
- **Files touched:** src/components/inspections/new-inspection-form.client.tsx

## FORM-19 — Add-tenant phone field has no validator despite an existing schema
- **Finding:** src/components/tenants/add-tenant-info-fields.tsx:62 (low) — `first_name`/`last_name`/`email` attach `addTenantSchema.shape.*` validators, but the phone `AppField` has no `validators`, so `phoneSchema` (regex + min 10) never runs; `add-tenant-form.tsx` sends any non-empty string to `tenants` (no DB CHECK), so "abc" persists.
- **Root cause:** Missing `validators` prop on the phone field. Important nuance: `addTenantSchema.shape.phone` is `phoneSchema.optional()`, and the field value is always a string ("" when empty) — an empty string is NOT `undefined`, so `phoneSchema.optional()` would run `phoneSchema` on "" and FAIL `.min(10)`, breaking the "phone is optional" UX. The validator must accept empty-OR-valid.
- **Fix:** Add a shared optional-empty phone schema `optionalPhoneSchema = z.union([z.literal(""), phoneSchema])` in common.ts (mirrors the proven `tenantEmergencyContactEditSchema.emergency_contact_phone` union), and attach `validators={{ onChange: optionalPhoneSchema }}` to the phone `AppField` in `add-tenant-info-fields.tsx`. The submit path `...(value.phone ? { phone: value.phone } : {})` already drops empty phone, so no change there.
- **Why it fixes it:** The verifier's "'abc' persists silently" is resolved — a non-empty malformed phone fails the field validator with the phoneSchema message; empty still passes (optional preserved).
- **Risks / interactions:** Do NOT attach `addTenantSchema.shape.phone` directly (it would reject the empty string and break optional entry). `optionalPhoneSchema` is reusable for other optional phone fields. No DB change.
- **Files touched:** src/components/tenants/add-tenant-info-fields.tsx, src/lib/validation/common.ts

## Cross-cutting notes

### Money-column whole-dollar class (FORM-01, 03, 06, 08, 10, 11, 12, 14, 15) — ONE decision, shared helpers
All nine are the same defect: decimal-accepting inputs/schemas feeding `integer` money columns (`leases.{rent_amount,security_deposit,late_fee_amount,pet_deposit,pet_rent}`, `units.rent_amount`, `maintenance_requests.estimated_cost`), producing 22P02 on decimals (and, for FORM-06, silent RPC rounding; for FORM-11, silent negative persistence).

- **Direction chosen — client-side whole-dollar enforcement.** Add shared helpers to `src/lib/validation/common.ts`:
  - `positiveWholeDollarSchema = z.number().int("Enter a whole dollar amount (no cents)").positive("Value must be positive")`
  - `nonNegativeWholeDollarSchema = z.number().int("Enter a whole dollar amount (no cents)").min(0, "Value must be non-negative")`
  - `optionalWholeDollarStringSchema` for string-typed fields (FORM-11): `z.string().refine(v => v.trim() === "" || (/^\d+$/.test(v.trim()) && Number(v) > 0), "Estimated cost must be a whole dollar amount greater than 0")`.
  Apply `.max(...)` at each use site (limits differ: `RENT_MAXIMUM_VALUE` vs `UNIT_RENT_MAXIMUM`). **Do NOT change the shared `positiveNumberSchema`/`nonNegativeNumberSchema`** — `units.bathrooms` legitimately uses `positiveNumberSchema` fractionally (1.5). Change only the money fields.
  For inputs: `step="0.01"`→`step="1"`, placeholders `0.00`/`1500.00`→`0`/`1500`, integer parse (`Math.round(parseFloat)` or `parseInt`). For the two imperative panels + unit-form (no zod on the field) add an explicit `Number.isInteger` guard with a clear toast — reject, never silently round.
- **Alternative (recorded Decision on each money REQ) — migrate the columns to `numeric(10,2)`** to match CLAUDE.md's stated "all amount columns store dollars as numeric(10,2)" convention. Rejected: multi-table migration (leases/units/maintenance_requests, plus `expenses.amount` for consistency) that also requires touching the `bulk_import_create_lease` RPC and any aggregating RPC, regenerating `supabase.ts`, and re-verifying every downstream money consumer — large blast radius against the deliberate prod reality (integer, re-verified via information_schema) and the shipped renew-lease `step="1"` whole-dollar precedent. If product later wants cents, do it as its own milestone.
- **Sibling sweep:** treat `maintenance_requests.actual_cost` (also integer, edited outside these 19 findings) and any other money input with `step="0.01"` the same way so a fix doesn't trickle out one-per-review-cycle.

### Phantom `version` class (FORM-02 + FORM-04) — fix as one unit
`leases` has no `version` column (only `notification_settings` does, per generated `supabase.ts`). `lease-form.tsx` passes `version: lease.version ?? 1` (always `1`) and `lease-mutation-options.ts` spreads it into the PATCH → PGRST204 on every edit. Fix both files together: drop the arg at the call site and the param + payload merge in the mutationFn. Units/maintenance are unaffected (they pass `version` only when `!== undefined`, which never happens absent the column) — do not touch them.

### FORMFIX-08 unhandled-rejection class (FORM-13 + FORM-18)
Both are un-awaited/un-caught `mutateAsync` in async handlers whose mutations already toast+capture in `onError`. Apply the established pattern (try/catch, log-only, no re-throw) exactly as in property-form.client.tsx / use-maintenance-form.ts (commit 21bf44032). Two independent files, one pattern.

### Shared-file coordination (single sequential phase)
- `src/lib/validation/common.ts` — new helpers for FORM-01/06/08/10/11/14/19. Land helpers first, then consumers.
- `src/lib/validation/lease-wizard.schemas.ts` — FORM-08 + FORM-10 both edit money fields here; batch.
- `src/components/leases/lease-form-options.ts` — FORM-01 (money `.int()`) + FORM-07 (date refine) both edit this schema; batch.
- `src/components/leases/wizard/{terms-step,details-step}.tsx` — FORM-08/10 (inputs) + FORM-09 (error rendering) all touch these; sequence schema edits before/with the render change so the `.int()` messages are visible.
- `src/components/units/unit-form-fields.tsx` + `unit-form.client.tsx` + `add-unit-panel.tsx` + `edit-unit-panel.tsx` — FORM-03/12/15 are one whole-dollar sweep.
- FORM-05 changes the `useTemplatePdf` signature — update all four `*.client.tsx` call sites and `use-template-pdf.test.ts`.

### Cross-phase dependency notes (phase order 36→51)
No hard dependency on an earlier phase's file: none of the FORM files overlap Phase 36 (BILL) or 37 (AUTH) scope. Phantom-`version` client types (`LeaseWithExtras.version`, `LeaseWithVersion`) may be pruned by Phase 40 (TYPE), but the FORM-02/04 runtime fix does not require it and must not wait for it. The whole-dollar `.int()` tightening in `common.ts`/`leases.ts`/`units.ts`/`lease-wizard.schemas.ts` is self-contained; if Phase 39 (DATA) or 40 (TYPE) later touches these schemas, this whole-dollar direction is the baseline they build on.
