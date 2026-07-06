# Roadmap: TenantFlow

## Milestones

- ✅ **v1.0 Marketing Surface Honesty** — Phases 1-15 (shipped 2026-05-22) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Dashboard Command Center** — Phases 1-7 (shipped 2026-06-02, 34/34 requirements) — see [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Security Hardening** — Phases 1-3 (shipped 2026-06-02, 12/12 requirements) — see [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)
- ✅ **v4.0 Hardening & Hygiene** — Phases 1-8 (shipped 2026-06-07, 20/21 requirements; SEO-01 carried to v5.0) — see [milestones/v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md)
- ✅ **v5.0 AI Blog Content Engine** — Phases 9-14 (shipped 2026-06-10, 9/9 requirements) — see [milestones/v5.0-ROADMAP.md](milestones/v5.0-ROADMAP.md)
- ✅ **v6.0 Final Canonical Cleanup** — Phases 15-19 (resolved/verified 2026-06-19, 24 requirements) — see [milestones/v6.0-ROADMAP.md](milestones/v6.0-ROADMAP.md)
- 🔨 **v7.0 TanStack Form Composition Migration** — Phases 20-24 (active, started 2026-06-25, 13 requirements) — this file

---

## v7.0 TanStack Form Composition Migration

**Goal:** Adopt TanStack Form's built-in composition API (`createFormHook` / `useAppForm` / `withForm` / `withFieldGroup` / `formOptions`) so the codebase never hand-rolls a form-instance type again — delete all 5 hand-rolled 12-generic `ReactFormExtendedApi` aliases, the 10 `*FormApi`-prop section signatures, and the 123 per-field annotations, replacing them with one shared form-hook module + a typed field-component library. Built on `@tanstack/react-form@1.32` (already installed). Zero runtime/behavior change.

**Sequencing rule:** foundation first (pure addition, nothing migrated), then migrate forms in increasing complexity (single-section → multi-section/tenant → multi-step wizard + standalone), then a final drift-guard + verification phase. Every phase is an independently shippable PR under the perfect-PR gate; each migrated form's behavior is pinned by its existing (or extended) tests so "zero functional change" is observable, not asserted.

**5 phases** | **13 requirements mapped** | All covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 20 | Form Foundation | One shared `form-hook` module + typed field-component library + SubmitButton + `formOptions` convention — zero hand-rolled generics | FORM-01, FORM-02, FORM-03, FORM-11 | 4 |
| 21 | Single-Section Forms | Migrate property / subscribe / unit forms + sections to `useAppForm`/`withForm`; delete 3 type aliases | FORM-04, FORM-05, FORM-08 | 4 |
| 22 | Multi-Section & Tenant Forms | Migrate lease + tenant (+ tenant-edit) forms + their sections; delete 2 type aliases | FORM-06, FORM-07 | 4 |
| 23 | Wizard & Standalone Forms | Lease wizard via `withFieldGroup`; login + maintenance hook + 4 document-template forms | FORM-09, FORM-10 | 4 |
| 24 | Cleanup, Drift Guard & Verify | Delete residual type files; drift-guard test; behavior preservation pinned; full verify | FORM-12, FORM-13 | 4 |

### Phase Details

**Phase 20: Form Foundation**
Goal: Build the single shared foundation — `src/lib/forms/form-hook.tsx` (`createFormHookContexts()` + `createFormHook()` → `useAppForm`/`withForm`/`withFieldGroup`) plus the typed field-component library wrapping the existing shadcn primitives (`TextField`, `NumberField` with null coercion, `TextareaField`, `SelectField`, `SwitchField`, `IconInputField`, `DateField`) and a `SubmitButton` form component, plus the `formOptions()` convention. Pure addition: no existing form is migrated yet, so nothing can regress.
Requirements: FORM-01, FORM-02, FORM-03, FORM-11
Success criteria:
1. `form-hook.tsx` exports `useAppForm`/`withForm`/`withFieldGroup` with zero hand-rolled `ReactFormExtendedApi` generics; field components render through field context
2. Each field component matches the visual + behavioral output of its current ad-hoc equivalent (number/null coercion, leading-icon input, disabled state) — covered by new unit tests
3. The foundation is unused by production forms this phase (no behavior change anywhere); `tsc` + `lint` + unit suite green
4. Two consecutive zero-finding review cycles (perfect-PR gate)

**Phase 21: Single-Section Forms**
Goal: Migrate the three lowest-complexity typed forms — property (3 sections), owner-subscribe (1 section), unit (1 section incl. add/edit panels) — onto `useAppForm` + `withForm` + `formOptions`, converting their `form.Field` render-props to `form.AppField` + shared field components, and delete `property-form-types.ts`, `owner-subscribe-form-types.ts`, and `unit-form-types.ts`.
Requirements: FORM-04, FORM-05, FORM-08
Success criteria:
1. Property / subscribe / unit forms create + edit exactly as before (validation, defaults, image upload, signup flow all unchanged) — pinned by existing/extended tests
2. `PropertyFormApi`, `SubscribeFormApi`, `UnitFormApi` and their 3 `*-form-types.ts` files are deleted; no `*FormApi` prop remains on their sections
3. `tsc` + `lint` + `next build` + full unit suite green; zero new `any` / `as unknown as`
4. Two consecutive zero-finding review cycles

**Phase 22: Multi-Section & Tenant Forms**
Goal: Migrate the lease form (financial / tenant-date / property-unit sections) and the tenant forms (add-tenant info/property sections + tenant-edit) onto `useAppForm`/`withForm`, and delete `lease-form-types.ts` + `add-tenant-form-types.ts`.
Requirements: FORM-06, FORM-07
Success criteria:
1. Lease create and tenant record create/edit behave identically (validation, defaults, submit) — pinned by existing/extended tests
2. `LeaseFormApi`, `AddTenantFormApi` and their 2 `*-form-types.ts` files are deleted; no `*FormApi` prop remains on their sections
3. `tsc` + `lint` + `next build` + full unit suite green
4. Two consecutive zero-finding review cycles

**Phase 23: Wizard & Standalone Forms**
Goal: Type the multi-step lease-creation wizard via `withFieldGroup` (per-step field groups sharing `formOptions`), and migrate the remaining standalone forms — `login-form`, the `use-maintenance-form` hook, and the 4 document-template forms — onto `useAppForm` + the shared field components.
Requirements: FORM-09, FORM-10
Success criteria:
1. The lease wizard's step validation, navigation, rent-autofill, and unsaved-changes guard are unchanged; no hand-rolled per-step form type remains
2. Login, maintenance-form, and the 4 document-template forms keep their current validation + submit behavior on the shared foundation
3. `tsc` + `lint` + `next build` + `e2e-smoke` + full unit suite green
4. Two consecutive zero-finding review cycles

**Phase 24: Cleanup, Drift Guard & Verify**
Goal: Remove any residual hand-rolled form typing, add a drift guard so it can't return, and do the milestone-wide behavior-preservation verification.
Requirements: FORM-12, FORM-13
Success criteria:
1. `rg "ReactFormExtendedApi" src/` and `rg "React.ComponentType<any>" src/` both return zero; all 5 `*-form-types.ts` files are gone
2. A drift-guard test (CI-enforced) fails the build if a hand-rolled `ReactFormExtendedApi` alias or a form-field `any` is reintroduced
3. Full verification: `bun run typecheck` + `bun run lint` + the full unit suite green; every pre-existing form test passes unchanged or extended (none skipped); shared field components covered
4. Two consecutive zero-finding review cycles

## Requirement Coverage (Traceability)

| Requirement | Phase |
|-------------|-------|
| FORM-01 | 20 |
| FORM-02 | 20 |
| FORM-03 | 20 |
| FORM-11 | 20 |
| FORM-04 | 21 |
| FORM-05 | 21 |
| FORM-08 | 21 |
| FORM-06 | 22 |
| FORM-07 | 22 |
| FORM-09 | 23 |
| FORM-10 | 23 |
| FORM-12 | 24 |
| FORM-13 | 24 |

**Coverage:** 13/13 requirements mapped to exactly one phase ✓
