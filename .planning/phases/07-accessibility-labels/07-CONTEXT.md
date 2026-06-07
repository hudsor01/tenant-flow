# Phase 7: Accessibility Labels - Context

**Gathered:** 2026-06-07
**Status:** Ready for execution (workflow-orchestrated)
**Source:** Direct source-read of every named component + axe-infra probe. Frontend a11y fixes (real src edits) + deterministic unit a11y tests.

<domain>
## Phase Boundary
Programmatic labels + accessible names for the named form/control components (A11Y-01/02), and the `text-muted`→`text-muted-foreground` token fix (A11Y-03). Verified by testing-library `getByLabelText`/`getByRole({name})` unit assertions (the deterministic, local proof of association) — the repo's axe runs via `@axe-core/playwright` E2E (`tests/e2e/tests/owner/dashboard-a11y.e2e.spec.ts`).
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### Shared design call (A11Y-01) — DO NOT modify Field.tsx behavior
The Field inputs are RAW `<input>` elements rendered inline as siblings of `<FieldLabel>` inside `<Field>` — they are NOT descendant components, so a `FieldContext` cannot auto-wire them, and globally auto-setting `FieldLabel htmlFor` from a context id would point EVERY existing form's label at a nonexistent control id (a NEW app-wide a11y bug). Therefore: **per-field `useId()` + explicit `htmlFor` on `FieldLabel` + matching `id` on the control**, applied ONLY to the named components. `FieldLabel` already forwards `htmlFor` to the underlying radix `<Label>` (it spreads `...props`), so no Field.tsx change is needed. This satisfies "thread useId through Field, auto-associate label/input, no bare <Label>" with ZERO shared-infra regression risk.

### A11Y-01 — programmatic labels (per-field useId + htmlFor/id)
- `src/components/settings/owner-emergency-contact-section.tsx` — 3 raw inputs (name/relationship/phone) under `<Field><FieldLabel>…</FieldLabel><input/></Field>` with no association. Add `const nameId = useId()` etc.; `<FieldLabel htmlFor={nameId}>` + `<input id={nameId}>`.
- `src/components/profiles/tenant/personal-information-section.tsx` — same pattern (first/last name + others).
- `src/components/profiles/tenant/emergency-contact-section.tsx` — same.
- `src/components/auth/change-password-dialog.tsx` — 3 password fields; the input is WRAPPED (show/hide toggle button already has aria-label). Wire `useId()` + `htmlFor`/`id` on each (current/new/confirm). Keep the existing toggle-button aria-labels.
- `src/components/profiles/owner/personal-info-section.tsx` — ALREADY compliant (`<Label htmlFor="first_name">` + `<Input id="first_name">` pairs). Verify; no change needed unless a bare label is found. Add a `getByLabelText` test to pin it.

### A11Y-02 — accessible names
- `src/components/tenants/tenant-toolbar.tsx` — search `<input>` (placeholder-only) → add `aria-label="Search tenants"`; status `<select>` → add `aria-label="Filter by status"`. (The Table/Grid view-toggle buttons already have visible text → accessible names OK; optionally add `aria-pressed`.)
- `src/components/tenants/tenant-grid.tsx` — the row-select `<input type="checkbox">` (line ~107) → `aria-label={`Select ${tenant name}`}` (per-row, descriptive). The icon action buttons (view/edit/delete) already have aria-labels.
- `src/components/leases/table/leases-table-columns.tsx` — row-select `<input type="checkbox">` (line ~72) → `aria-label={`Select lease …`}`. Also check `leases-table.tsx` for a header select-all checkbox → `aria-label="Select all leases"`.
- `src/components/leases/template/clause-selector.tsx` — the `<button>` inside `<TooltipTrigger>` (line ~91) wrapping only an `<Info>` icon → `aria-label="More information about this clause"` (or similar).

### A11Y-03 — token fix (done directly by orchestrator)
- `src/components/error-boundary/error-boundary.tsx:85` — `className="text-muted font-mono bg-muted p-2 rounded"` → `text-muted-foreground` (bare `text-muted` is not a valid text-color token; breaks muted-text contrast). One-line.

### Verification
- Add/extend a **unit a11y test** per fixed component (testing-library): `getByLabelText('First Name')` etc. resolves each input (proves htmlFor↔id association — this IS the axe "label" rule, deterministically); `getByRole('checkbox', { name: /select/i })` + `getByRole('button', { name: /more information/i })` + `getByRole('textbox', { name: /search tenants/i })` resolve the A11Y-02 controls. These run locally (jsdom) and fail if association/accessible-name regresses.
- The existing `@axe-core/playwright` dashboard-a11y E2E remains the integration-level axe gate; extending it to settings/tenant routes needs the running app + auth, so the unit-level assertions are the authoritative local proof this phase.
</decisions>

<constraints>
- No inline styles; Tailwind tokens only (`text-muted-foreground`, not bare `text-muted`).
- No `any`, no barrel files. `useId()` from React (one per field). Match component style (tabs).
- Icon-only buttons: `aria-label` (CLAUDE.md Accessibility rule). `getByLabelText` is the association proof.
- Test-files alongside the existing `__tests__` convention; mirror existing component-test patterns (`src/test/utils/test-render.tsx`).
- Parallel fix agents WRITE files only — orchestrator commits sequentially (no agent git-commits).
</constraints>

<canonical_refs>
- CLAUDE.md Accessibility section (aria-label on icon-only buttons; text-muted-foreground; bg-background).
- `tests/e2e/tests/owner/dashboard-a11y.e2e.spec.ts` (@axe-core/playwright pattern).
- `src/components/ui/field.tsx` (FieldLabel forwards htmlFor — no change needed).
- `src/components/profiles/owner/personal-info-section.tsx` (the already-correct htmlFor/id reference pattern).
</canonical_refs>

<deferred>
None — A11Y-01/02/03 are the whole phase.
</deferred>

---
*Phase: 07-accessibility-labels — source-read 2026-06-07; per-field useId (no Field.tsx regression), aria-labels on named controls, text-muted token fix; getByLabelText/getByRole unit proofs.*
