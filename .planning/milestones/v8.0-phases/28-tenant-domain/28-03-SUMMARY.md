---
phase: 28-tenant-domain
plan: 03
subsystem: ui
tags: [tenants, zod, validation, forms, emergency-contact, tanstack-form]

# Dependency graph
requires: []
provides:
  - "tenantEmergencyContactEditSchema — empty-safe edit schema (name/relationship max-bounded, phone accepts '' OR a valid phone)"
  - "tenant-edit form uses the empty-safe schema so cleared/name-only edits submit"
affects: [TEN-05, tenant edit form, emergency-contact editing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Empty-safe form field for an always-present string: z.union([z.literal(''), fieldSchema]) — because a bare .optional() does not accept '' when the value is never undefined and the inner schema (phoneSchema.min(10)) rejects ''"

key-files:
  created: []
  modified:
    - src/lib/validation/tenants.ts
    - src/lib/validation/__tests__/tenants.test.ts
    - src/app/(owner)/tenants/components/tenant-edit-form.client.tsx

key-decisions:
  - "New exported tenantEmergencyContactEditSchema rather than mutating the required-contact emergencyContactSchema (which validates a required contact elsewhere)"
  - "phone uses z.union([z.literal(''), phoneSchema]); a bare .optional() would still reject '' because phoneSchema.min(10) does and the form value is never undefined"
  - "onSubmit left untouched — the update mutation does not re-validate (only omitUndefined), so empty strings persist as-is per the nullable columns"

patterns-established:
  - "For form validators over always-present string fields, model 'clearable' as z.union([z.literal(''), innerSchema]) not innerSchema.optional()"

requirements-completed: [TEN-05]

# Metrics
duration: ~15min
completed: 2026-07-07
---

# Phase 28 Plan 03: Empty-safe emergency-contact edit validation

**An owner can now clear the emergency-contact phone or save a name-only edit — `canSubmit` no longer stays false — while a non-empty phone still must match the phone format and name/relationship stay length-bounded.**

## Accomplishments

### Task 1 — empty-safe edit schema + unit tests (TEN-05)
- Added `tenantEmergencyContactEditSchema` to `src/lib/validation/tenants.ts`: `emergency_contact_name` (`z.string().max(100)`), `emergency_contact_relationship` (`z.string().max(50)`), and `emergency_contact_phone` (`z.union([z.literal(""), phoneSchema])`). Not `.required()`, not `.partial()`.
- Left the existing required-contact `emergencyContactSchema` unchanged.
- Appended 6 tests: all-empty valid, name-only valid, valid non-empty phone valid, too-short non-empty phone invalid, name > 100 invalid, relationship > 50 invalid.

### Task 2 — point the form at the schema (TEN-05)
- `tenant-edit-form.client.tsx`: imported `tenantEmergencyContactEditSchema`, deleted the local `.required()` `emergencyContactSchema` const + its stale doc comment, and set `validators: { onChange: tenantEmergencyContactEditSchema }`.
- Left `onSubmit` untouched (already sends the three fields; empty strings persist as-is — verified the update `mutationFn` only `omitUndefined`s, it does not re-validate through a Zod schema that would reject `""`).

## Task Commits

1. **Task 1: Empty-safe emergency-contact edit schema + tests (TEN-05)** — `d2942487b` (fix)
2. **Task 2: Point the form at the empty-safe schema (TEN-05)** — `8ae21d276` (fix)

## Verification

- `bun run test:unit -- src/lib/validation/__tests__/tenants.test.ts` — 44 tests pass (38 existing + 6 new TEN-05 cases).
- `bun run typecheck` — clean.
- `bun run lint` — exit 0 (only a biome config-migration info notice, unrelated).
- Full pre-commit gate passed on both commits.

## Deviations from Plan

None — plan executed as written.

## Issues Encountered

None. Confirmed the update mutation boundary (`tenantMutations.update`) does not re-validate with Zod, so empty-string emergency-contact fields survive to PostgREST and persist per the nullable columns — no onSubmit change was needed.

## Next Phase Readiness

- Emergency-contact edits (clear / name-only / partial) submit and persist. Manual verify covered by Plan 06.

---
*Phase: 28-tenant-domain*
*Completed: 2026-07-07*
