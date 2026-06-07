# Phase 7 Summary — Accessibility Labels (A11Y-01/02/03)

**Status:** Complete (workflow-orchestrated under ultracode)
**Branch:** gsd/phase-7-accessibility-labels

## What shipped
Programmatic labels + accessible names across the named form/control components, each pinned by a `getByLabelText`/`getByRole({name})` unit proof (the deterministic, mutation-resistant equivalent of the axe "label"/"button-name" rules). 9 components fixed via fix→adversarial-verify workflow fan-out (all 9 verify verdicts CLEAN). Full suite green: **206 files, 106,561 tests**.

### A11Y-01 — programmatic form labels (per-field `useId()` + `htmlFor`/`id`)
Design call: the Field inputs are raw inline `<input>` siblings of `<FieldLabel>`, so a FieldContext can't auto-wire them and a global FieldLabel-auto-htmlFor would point every existing form's label at a nonexistent id (a NEW app-wide bug). So per-field `useId()` + explicit `htmlFor`/`id` on the named forms only — `FieldLabel` already forwards `htmlFor`, so **no Field.tsx change, zero shared-infra regression**.
- `settings/owner-emergency-contact-section.tsx` — 3 inputs associated.
- `profiles/tenant/personal-information-section.tsx` — 4 inputs associated.
- `profiles/tenant/emergency-contact-section.tsx` — 3 inputs associated.
- `auth/change-password-dialog.tsx` — 3 password fields associated (toggle-button aria-labels kept).
- `profiles/owner/personal-info-section.tsx` — already compliant (htmlFor/id); pinned by a new test, no source change.

### A11Y-02 — accessible names
- `tenants/tenant-toolbar.tsx` — search input → `aria-label="Search tenants"`; status select → `aria-label`.
- `tenants/tenant-grid.tsx` — row-select checkbox → descriptive `aria-label`.
- `leases/table/leases-table-columns.tsx` + `leases-table.tsx` — row-select + select-all checkboxes → `aria-label`s.
- `leases/template/clause-selector.tsx` — info tooltip button → `aria-label`.

### A11Y-03 — token fix
- `error-boundary/error-boundary.tsx:85` — bare `text-muted` → `text-muted-foreground` (committed directly).

## Regression caught + fixed (perfect-PR discipline)
Associating the change-password inputs made the **pre-existing** `profile-page.test.tsx > opens change password dialog` test's loose `queryByLabelText(/current password/i)` ambiguous (it now matched both the labeled input AND the "Show current password" toggle aria-label → "multiple elements"). Tightened that query to exact label text. Per "perfect-PR covers pre-existing failures."

## Verification
- Full unit suite: 206 files / 106,561 passed. Typecheck + biome clean.
- Each fixed control has a `getByLabelText`/`getByRole({name})` assertion that fails if the label/accessible-name regresses (mutation-tested by the verify agents).
- axe integration layer remains the existing `@axe-core/playwright` dashboard-a11y E2E; the unit-level association proofs are this phase's deterministic local gate (extending the E2E to settings/tenant routes needs the running app + auth).

## Notes
- 9 components, all independent files → workflow fan-out with zero file contention; orchestrator committed (agents wrote only).
- 2 commits (A11Y-01 forms+regression-fix / A11Y-02 controls) + the earlier A11Y-03 commit.
