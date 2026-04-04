# Phase 31: Frontend Hook Factories - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 31-frontend-hook-factories
**Areas discussed:** Detail factory scope, Mutation callback depth, Migration granularity

---

## Detail Factory Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Include placeholderData (Recommended) | Factory accepts a list query key and auto-wires list-cache scan. Hooks that don't need it omit the param. | |
| Basic query only | Factory wraps useQuery + detail(id) + enabled. PlaceholderData stays inline. | |
| Config object with opt-in features | Full config object with each feature opt-in (placeholderData, staleTime, enabled). | |

**User's choice:** "You decide" — deferred to Claude's discretion.
**Notes:** User did not have a preference on the API shape for the detail factory. Claude will decide based on what the codebase patterns support cleanly.

---

## Mutation Callback Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Simple only (Recommended) | Covers invalidate + toast.success + handleMutationError. Complex mutations keep custom callbacks. | |
| Include optimistic updates | Factory also accepts optional onMutate config for optimistic cache writes + rollback on error. | ✓ |
| You decide | Claude picks the right depth based on codebase patterns. | |

**User's choice:** Include optimistic updates
**Notes:** User wants the factory to handle the full spectrum, including optimistic updates with cancellation and rollback — not just the simple toast+invalidate pattern.

---

## Migration Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Two plans (Recommended) | Plan 1: Build factories + proof migrations. Plan 2: Migrate all remaining hooks. | ✓ |
| Three plans by concern | Separate plans for detail queries, mutation callbacks, and cleanup. | |
| Single plan | One plan covers everything. Simpler to track, larger blast radius. | |

**User's choice:** Two plans (Recommended)
**Notes:** Build-then-apply split. Plan 1 creates both factories and proves them on 2-3 hooks. Plan 2 migrates the rest.

---

## Claude's Discretion

- Detail factory scope — API shape for `useEntityDetail<T>()` (whether/how placeholderData is included)
- Factory file locations
- TypeScript generic constraints
- Proof migration hook selection for Plan 1

## Deferred Ideas

None — discussion stayed within phase scope.
