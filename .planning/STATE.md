---
gsd_state_version: 1.0
milestone: v7.0
milestone_name: TanStack Form Composition Migration
status: planning
last_updated: "2026-06-25T00:00:00.000Z"
last_activity: 2026-06-25
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value (v7.0):** The codebase never hand-rolls a form-instance type again. TanStack Form's built-in composition API (`createFormHook` / `useAppForm` / `withForm` / `withFieldGroup` / `formOptions`) becomes the single typed foundation for every form — extracted sections are auto-typed by `withForm`, fields render through a shared typed component library, and the 5 hand-rolled 12-generic `ReactFormExtendedApi` aliases are deleted. Zero runtime/behavior change.
**Current focus:** Milestone defined. Branch `milestone/v7.0-form-composition` off `main` (includes merged PRs #867 inspection-exhaustiveness + #868 form-`any` removal). Built on `@tanstack/react-form@1.32` (already installed — no new dependency). Next: plan Phase 20 (Form Foundation).

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-06-25 — Milestone v7.0 started

## Roadmap Summary (v7.0)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 20. Form Foundation | One shared `form-hook` module + typed field-component library + SubmitButton + `formOptions` convention; zero hand-rolled generics | FORM-01..03, FORM-11 |
| 21. Single-Section Forms | Migrate property / subscribe / unit forms + sections to `useAppForm`/`withForm`; delete those 3 type aliases | FORM-04, FORM-05, FORM-08 |
| 22. Multi-Section & Tenant Forms | Migrate lease + tenant (+ tenant-edit) forms + their sections; delete those 2 type aliases | FORM-06, FORM-07 |
| 23. Wizard & Standalone Forms | Lease wizard via `withFieldGroup`; login + maintenance hook + 4 document-template forms | FORM-09, FORM-10 |
| 24. Cleanup, Drift Guard & Verify | Delete residual type files; drift-guard test; full verify; behavior preservation pinned | FORM-12, FORM-13 |

## Blockers

None.

## Roadmap Evolution

- 2026-05-22: v1.0 "Marketing Surface Honesty" archived (15 phases).
- 2026-06-02: v2.0 "Dashboard Command Center" shipped + archived (7 phases, 34/34).
- 2026-06-02: v3.0 "Security Hardening" shipped + archived (3 phases, 12/12).
- 2026-06-07: v4.0 "Hardening & Hygiene" shipped + archived (8 phases, 20/21).
- 2026-06-10: v5.0 "AI Blog Content Engine" shipped + archived (6 phases 9-14, 9/9).
- 2026-06-14: v6.0 "Final Canonical Cleanup" roadmap created (5 phases 15-19, 24 requirements); audit findings resolved/verified 2026-06-19. Archived to `.planning/milestones/v6.0-{REQUIREMENTS,ROADMAP}.md`.
- 2026-06-25: v7.0 "TanStack Form Composition Migration" started (5 phases 20-24, FORM-01..13). Preceded by merged PRs #867 (inspection compile-time exhaustiveness) + #868 (last form-field `any`s removed via hand-rolled typed API — superseded by this milestone's composition-API adoption).

## Next Action

Plan Phase 20 (Form Foundation): `/gsd-plan-phase 20`. Build the shared `src/lib/forms/form-hook.tsx` (`createFormHookContexts` + `createFormHook` → `useAppForm`/`withForm`/`withFieldGroup`) + the field-component library (TextField/NumberField/TextareaField/SelectField/SwitchField/IconInputField/DateField) + SubmitButton, wrapping the existing shadcn primitives. Pure addition — no form migrated yet, no behavior change.

## Overrides

(none active)

---
*Last updated: 2026-06-25 — v7.0 "TanStack Form Composition Migration" started; REQUIREMENTS + ROADMAP authored on branch `milestone/v7.0-form-composition`. Integer phase numbers continue across milestones (20-24). Trust `git log main` + `gh pr list --state merged` + `.planning/ROADMAP.md` as source of truth over this cache.*
