# Requirements: TenantFlow v7.0 — TanStack Form Composition Migration

**Defined:** 2026-06-25
**Core Value:** The codebase never hand-rolls a form-instance type again. TanStack Form ships a first-class composition API (`createFormHook` / `useAppForm` / `withForm` / `withFieldGroup` / `formOptions`) that auto-types extracted form sections and shared field components. Adopting it deletes the 5 hand-rolled 12-generic `ReactFormExtendedApi` aliases, the 10 `*FormApi`-prop section signatures, and the 123 per-field annotations — replacing them with one shared foundation. Built on `@tanstack/react-form@1.32`, already installed: no new dependency, no runtime behavior change.

**Grounded in:** the official TanStack Form "Form Composition" guide + the v1.32 type surface verified in `node_modules` (`createFormHook` exports `useAppForm`/`withForm`/`withFieldGroup`; `formOptions` defines reusable options). Current surface: 5 `*-form-types.ts` aliases, 10 section components, 14 `useForm` sites, 123 `form.Field` usages, 0 existing `createFormHook`/`useAppForm`.

**Constraint (applies to every requirement):** zero runtime/behavior change. Every form keeps its current validation schema, default values, submit handler, and field-level UX (number/null coercion, icon inputs, disabled states, autofocus). Each phase ships under the perfect-PR gate (two consecutive zero-finding review cycles); `tsc --noEmit` + `biome check` + full unit suite stay green.

## v1 Requirements

### FORM-FOUNDATION — shared composition foundation

- [ ] **FORM-01**: A single shared form foundation module exists (`createFormHookContexts()` + `createFormHook()` → `useAppForm`, `withForm`, `withFieldGroup`) with no hand-rolled `ReactFormExtendedApi` generics; it is the only place form-hook wiring lives.
- [ ] **FORM-02**: A shared typed field-component library wraps the existing shadcn primitives — `TextField`, `NumberField` (null-coercing), `TextareaField`, `SelectField` (options-driven), `SwitchField`, `IconInputField` (InputGroup + leading icon), `DateField` — each consuming field context and usable via `form.AppField` + `field.X`.
- [ ] **FORM-03**: A shared `SubmitButton` form component (driven by `form.Subscribe` / `form.AppForm`) replaces per-form submit-button + `canSubmit`/`isSubmitting` wiring.
- [ ] **FORM-11**: Each migrated form defines its options once via `formOptions()` (default values + validators), shared between `useAppForm` and `withForm`, so `defaultValues` is never duplicated between a parent form and its sections.

### FORM-MIGRATE — per-domain form migration (delete the hand-rolled aliases)

- [ ] **FORM-04**: The property create/edit form + its 3 sections (info, address, acquisition-details) use `useAppForm`/`withForm`; `PropertyFormApi` and `src/components/properties/property-form-types.ts` are deleted; create/edit behavior, validation, and image upload unchanged.
- [ ] **FORM-05**: The owner-subscribe dialog + `SubscribeFormFields` use `useAppForm`/`withForm`; `SubscribeFormApi` and `src/components/pricing/owner-subscribe-form-types.ts` are deleted; signup validation (`signupFormSchema`) and submit flow unchanged.
- [ ] **FORM-06**: The lease form + its financial / tenant-date / property-unit sections use `useAppForm`/`withForm`; `LeaseFormApi` and `src/components/leases/lease-form-types.ts` are deleted; lease-create behavior unchanged.
- [ ] **FORM-07**: The add-tenant form + its info/property sections and the tenant-edit form use `useAppForm`/`withForm`; `AddTenantFormApi` and `src/components/tenants/add-tenant-form-types.ts` are deleted; tenant record create/edit behavior unchanged.
- [ ] **FORM-08**: The unit form (+ add-unit / edit-unit panels) + `unit-form-fields` use `useAppForm`/`withForm`; `UnitFormApi` and `src/components/units/unit-form-types.ts` are deleted; unit create/edit behavior unchanged.

### FORM-SPECIAL — multi-step + standalone forms

- [ ] **FORM-09**: The multi-step lease-creation wizard's steps are typed via `withFieldGroup` (or `withForm` sharing `formOptions`) with no hand-rolled per-step form types; step validation, navigation, and the unsaved-changes guard are unchanged.
- [ ] **FORM-10**: The remaining standalone forms — `login-form`, the `use-maintenance-form` hook, and the 4 document-template forms (property-inspection, tenant-notice, maintenance-request, rental-application) — migrate to `useAppForm` and the shared field components where they share field shapes; each keeps its current validation and submit behavior.

### FORM-GUARD — zero-drift verification

- [ ] **FORM-12**: Zero hand-rolled `ReactFormExtendedApi` aliases remain in `src/` — all 5 `*-form-types.ts` files are deleted, and a drift-guard test (or CI grep) asserts `ReactFormExtendedApi` and `React.ComponentType<any>` appear nowhere in app form code.
- [ ] **FORM-13**: Behavior preservation is pinned — existing form unit tests pass unchanged (or are extended, never skipped); new tests cover the shared field components; `bun run typecheck` + `bun run lint` + the full unit suite are green; zero new `any` / `as unknown as`.

## v2 Requirements

None scoped. Optional future follow-on (NOT this milestone): a `<form.AppForm>`-level shared error-summary component, and field-level async-validation helpers — deferred until the foundation lands.

## Out of Scope

| Item | Reason |
|------|--------|
| Migrating away from TanStack Form to React 19 native forms (`useActionState` / Server Actions) | Architectural pivot away from the client-side Supabase/PostgREST + TanStack Query mutation model the app is built on; native forms are built for server actions. Not a typing fix. |
| Changing any form's validation rules, default values, fields, or submit behavior | This milestone is a pure typing/composition refactor — zero functional change is a hard constraint, not a goal to expand. |
| Rebuilding the shadcn UI primitives (`Input`, `Select`, `Textarea`, `Switch`, `InputGroup`, `Field`) | The new field components *wrap* the existing primitives; the primitives themselves are unchanged. |
| Form devtools (`@tanstack/react-form-devtools`) | Nice-to-have observability, not required to delete the hand-rolled types; can be added later without rework. |

## Traceability

| REQ-ID | Phase |
|--------|-------|
| FORM-01 | 20 — Form Foundation |
| FORM-02 | 20 — Form Foundation |
| FORM-03 | 20 — Form Foundation |
| FORM-11 | 20 — Form Foundation |
| FORM-04 | 21 — Single-Section Forms |
| FORM-05 | 21 — Single-Section Forms |
| FORM-08 | 21 — Single-Section Forms |
| FORM-06 | 22 — Multi-Section & Tenant Forms |
| FORM-07 | 22 — Multi-Section & Tenant Forms |
| FORM-09 | 23 — Wizard & Standalone Forms |
| FORM-10 | 23 — Wizard & Standalone Forms |
| FORM-12 | 24 — Cleanup, Drift Guard & Verify |
| FORM-13 | 24 — Cleanup, Drift Guard & Verify |

All 13 requirements mapped to exactly one phase ✓
