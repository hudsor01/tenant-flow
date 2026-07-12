# 31-05 Summary — FORMFIX-05 (maintenance edit payload + validators)

**FORMFIX-05:** the maintenance EDIT form dropped unit/tenant changes + gave a raw PostgREST uuid error on empty fields.

- `use-maintenance-form.ts`: the edit payload now includes `unit_id`/`tenant_id` (was omitted), so reassigning the unit or tenant persists.
- `maintenance-form-fields.tsx`: wired `maintenanceRequestCreateSchema.shape.{unit_id,tenant_id,title,description}` as field-level `onChange`/`onSubmit` validators (+ `FieldError`), so empty/invalid values surface FIELD errors before the mutation instead of a raw uuid error. Field-level (avoids the string-vs-number estimated_cost gotcha).
- Tests: `maintenance-form.test.tsx` updated (29/29 pass).

Executed by Agent 2, which completed the code but died on a mid-response connection drop before committing; committed by the orchestrator after confirming typecheck 0 + tests green (+ a biome format fix on the test file). typecheck 0, lint 0.
