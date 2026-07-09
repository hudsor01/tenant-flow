---
phase: 31-forms-behavior
plan: 04
subsystem: hooks
tags: [forms, react-19, render-loop, localstorage, useCallback]
requires: []
provides:
  - useFormWithProgress auto-save keyed on stable identities + change guard
affects:
  - src/hooks/use-form-progress.ts
tech-stack:
  patterns:
    - "useCallback for stable hook-returned function identities"
    - "serialized last-saved useRef as an effect change guard"
key-files:
  created:
    - src/hooks/use-form-progress.test.ts
  modified:
    - src/hooks/use-form-progress.ts
decisions:
  - "Stabilize via useCallback (saveProgress/clearProgress, deps: formType) + depend on progress.saveProgress/progress.isLoading, not the whole object; guard writes on a serialized value change; prime the guard on restore."
metrics:
  tasks: 1
  commits: 1
  files: 2
  completed: 2026-07-09
---

# Phase 31 Plan 04: use-form-progress Render Loop Summary

`useFormWithProgress` no longer render-loops: the auto-save effect is keyed on stable identities (memoized `saveProgress` + `progress.isLoading`) instead of the whole `progress` object, and guarded by a serialized last-saved ref so a save fires once per real change.

## Tasks

| Task | Requirement | Commit | What |
|------|-------------|--------|------|
| 1 | FORMFIX-03 | `a4774e7bb` | `useCallback`-memoize `saveProgress`/`clearProgress` (deps: `formType`, functional setState avoids `state`). Replace the `progress` object dep with `progress.saveProgress` + `progress.isLoading`. Add a `useRef` last-saved serialized (password-free) guard: skip when unchanged, update + save otherwise. Prime the guard on restore so restoring does not write the data straight back. |

## Key Decisions

- **Root cause:** the auto-save effect listed `progress` (the full `useFormProgress` return, a new object every render) as a dependency, firing on every render. `saveProgress` was also a fresh async function each render and itself called `setState`, feeding the loop.
- **Fix:** stable identities (`useCallback` + primitive/function deps) break the every-render firing; the serialized-value change guard ensures at most one write per real change. Restore primes `lastSavedRef` with the same serialization the auto-save computes (both derive from the identical merged object), so no redundant self-save occurs.
- **Security preserved:** password/confirmPassword are stripped both in `saveProgress` and before the auto-save/guard serialization — passwords are never written.
- **Public shape unchanged:** `useFormWithProgress`'s return object is identical.

## Deviations from Plan

None — plan executed as written. Discretionary choice (per CONTEXT: "Claude's Discretion on useCallback vs primitive deps") landed on `useCallback` + primitive deps + a serialized change guard.

## Tests

Created `src/hooks/use-form-progress.test.ts` (4 tests, all green):
- Saves exactly once per real change; zero additional writes on unchanged re-renders (loop broken).
- A second real field change produces exactly one more save.
- Passwords are never persisted.
- Restore applies the draft once and does not ping-pong (0 redundant writes after restore).

Note: this project's jsdom does not expose a usable global `localStorage`; the test installs a minimal in-memory mock on `globalThis` so the hook's bare-`localStorage` writes are observable.

`bun run test:unit -- src/hooks/use-form-progress.test.ts` → 4 passed. Passed the full pre-commit suite.

## Self-Check: PASSED
- Files exist: use-form-progress.ts, use-form-progress.test.ts — both present.
- Commit exists: a4774e7bb — in `git log`.
