---
phase: 13-perf-conversion
cycle: 2
reviewed: 2026-05-13T10:30:00Z
depth: deep
files_reviewed: 5
files_reviewed_list:
  - src/components/marketing/lead-capture-modal.tsx
  - src/components/marketing/sticky-conversion-cta.tsx
  - src/components/marketing/__tests__/lead-capture-modal.test.tsx
  - src/components/marketing/__tests__/sticky-conversion-cta.test.tsx
  - supabase/functions/stripe-webhooks/index.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
verdict: PASS
---

# Phase 13: Code Review Report — Cycle 2

**Reviewed:** 2026-05-13
**Branch:** `gsd/phase-13-perf-conversion`
**Latest commit:** `6ede47053`
**Depth:** deep
**Files Reviewed:** 5
**Status:** clean
**Verdict:** PASS — zero findings; cycle-3 confirms the perfect-PR gate.

## Summary

Cycle-2 verified all six cycle-1 fixes landed correctly and ran a fresh probe across the modified surface. Every cycle-1 finding (P1-02, P1-03, P2-01, P2-02, P2-05, P2-07) has been remediated correctly, and the fresh hunts for ref-forwarding, autoFocus, in-place mutation strict-mode, unused imports, test execution, the double-tap rationale, file/function size caps, and the standard CLAUDE.md forbidden patterns surfaced no new issues. Typecheck clean. Lint clean. Marketing tests pass in isolation and in the full unit project (99,393 unit tests total).

## Cycle-1 Finding Verification

### P1-02 — handleSubmit double-submit guard — **PASS**

`src/components/marketing/lead-capture-modal.tsx:112-120` —
```tsx
function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Guard against touch double-tap: ...
    if (mutation.isPending) return
    const email = inputRef.current?.value?.trim()
    if (email) mutation.mutate(email)
}
```

The guard is the FIRST executable line after `preventDefault()` (which is required first — `preventDefault` must run on the event itself regardless of the guard, so this ordering is correct). The guard precedes the value read and the `mutate` call, blocking the second tap before any work happens.

### P1-03 — stripe-webhooks header-missing → warning — **PASS**

`supabase/functions/stripe-webhooks/index.ts:47-58` — header-missing branch now calls `captureWebhookWarning` (line 53) with `reason: 'header_missing'`. Block comment (lines 48-52) accurately explains why this branch is warning-level (public probes) while the verification-failed branch (line 71) stays at error level. Both branches return `400` with appropriate response bodies. The function was redeployed to prod as version 82 per the user's note. Both imports (`captureWebhookError` line 14, `captureWebhookWarning` line 15) are used (lines 71 and 53/141 respectively) — no dead imports.

### P2-01 — `<input>` → `<Input>` — **PASS**

`src/components/marketing/lead-capture-modal.tsx:18` — `import { Input } from '#components/ui/input'` added.
`src/components/marketing/lead-capture-modal.tsx:139-146` — JSX uses `<Input ref={inputRef} type="email" placeholder="your@email.com" required autoFocus aria-label="Email address" />`. The hand-rolled className stack from cycle-0 (`w-full rounded-md border border-input bg-background px-3 py-2 ... focus-visible:ring-offset-2`) was removed and replaced with the design-system default. The visual swap intentionally adopts the design-system canonical styling (h-11 height, shadow-xs, ring-[3px] focus). This is the cycle-1 goal — not a regression.

### P2-02 — JSDoc redeploy honesty — **PASS**

`src/components/marketing/lead-capture-modal.tsx:30-39`:
```
* Gated by `NEXT_PUBLIC_LEAD_CAPTURE_MODAL=on`
* so the surface can be toggled per environment without a code change.
* (The env var is bundled at build time, so toggling still requires a
* redeploy — but only an env-var update, not a code edit + review.)
```

Accurate. `NEXT_PUBLIC_*` env vars are Next.js-bundled at build time and require redeploy. The parenthetical correctly distinguishes "env-var change + redeploy" from "code edit + PR + review + redeploy."

### P2-05 — sticky-conversion-cta useEffect — **PASS**

`src/components/marketing/sticky-conversion-cta.tsx:42-60`:
- Line 43: `if (dismissed) return` — early-return at the top of the effect.
- Line 60: `}, [scrollThresholdPx, storageKey, dismissed])` — `dismissed` in dep array.

Both changes present. Together they prevent the effect from re-registering scroll listeners after `setDismissed(true)` runs — the cleanup runs, the effect re-runs, the early-return fires, no new listener. Correct.

### P2-07 — in-place mockSession/mockStorage.clear() — **PASS**

`src/components/marketing/__tests__/lead-capture-modal.test.tsx:74-79`:
```ts
// Mutate in place — never reassign `mockSession`, otherwise the
// other vi.fn closures keep their pre-clear reference and the
// stub silently desyncs.
clear: vi.fn(() => {
    for (const k of Object.keys(mockSession)) delete mockSession[k]
}),
```

`src/components/marketing/__tests__/sticky-conversion-cta.test.tsx:57-62`: identical pattern with `mockStorage`. Both reassignment bugs (`mockX = {}`) are fixed; the comment explains the closure-staleness rationale.

## Fresh Probe Results

7. **Input ref forwarding** — PASS. `src/components/ui/input.tsx` is a React 19 function component (no `forwardRef`) that spreads `...props` onto the native `<input>`. In React 19.2 (confirmed `react@19.2.4` in package.json), `ref` is a regular prop on function components: when the component doesn't consume `ref` explicitly, it auto-forwards through to whatever the spread targets. `ComponentProps<'input'>` in `@types/react@19.2.14` includes `ref` as a regular prop. `inputRef` is correctly typed as `RefObject<HTMLInputElement | null>` and typecheck passes — verified.

8. **autoFocus support** — PASS. `<Input>` accepts `autoFocus` via `ComponentProps<'input'> & VariantProps<...>` (autoFocus is a standard HTML attribute on `HTMLInputElement`). `{...props}` spreads it onto the native `<input>`, so the autoFocus behavior survives the swap.

9. **In-place delete strict-mode safety** — PASS. `for (const k of Object.keys(mockSession)) delete mockSession[k]` is sound under `noUncheckedIndexedAccess`: `delete` operates on the key, not the read value, so the `string | undefined` typing of `mockSession[k]` does not block the operation. No strict-mode error; typecheck passes.

10. **Unused imports in stripe-webhooks** — PASS. `captureWebhookError` (line 14): used at line 71. `captureWebhookWarning` (line 15): used at lines 53 and 141. `errorResponse` (line 13): used at lines 39 and 161. No unused imports.

11. **Marketing test execution** — PASS. Both `lead-capture-modal.test.tsx` (6 tests) and `sticky-conversion-cta.test.tsx` (7 tests) pass in isolation via `npx vitest --run --project unit <path>`. Full unit suite: 133 test files / 99,393 tests passing.

12. **Other test files with `vi.stubGlobal('localStorage', ...)`** — NOTED, NOT FLAGGED. `src/stores/__tests__/data-density.test.ts:32-34` has the same `mockLocalStorage = {}` reassignment pattern in its `clear` mock. Per the user's instruction, this is noted for future cleanup but not flagged: the test file's `clear()` is not exercised by any current test, the test passes today, and the bug is dormant. Future test addition that calls `localStorage.clear()` in this file will silently fail closure-stale — worth a one-line fix when next touched, but out of Phase 13's scope.

13. **Double-tap guard rationale honesty** — PASS. The comment (`lead-capture-modal.tsx:114-116`) is technically accurate. React's `setState` schedules a commit; the DOM `disabled` attribute updates synchronously at commit, but commit can lag the next click on mobile when touchend → click pairs fire faster than the React commit cycle. `mutation.mutate()` is sync-invoke + async-settle, so `mutation.isPending` flips only on the next render. A second click that fires between `mutate()` and the next commit sees `disabled=false` in the DOM. The guard is defensive but justified; the comment honestly frames it as a guard rather than overstating the threat.

14. **File/function size caps** — PASS.
    - `lead-capture-modal.tsx`: 164 lines (< 300).
    - `sticky-conversion-cta.tsx`: 113 lines (< 300).
    - `lead-capture-modal.test.tsx`: 153 lines (< 300).
    - `sticky-conversion-cta.test.tsx`: 177 lines (< 300).
    - `stripe-webhooks/index.ts`: 163 lines (< 300).
    - Longest function: `useEffect` body in `lead-capture-modal.tsx` lines 55-92 = 38 lines (< 50). All other inline functions / handlers are 5-25 lines.

15. **Standard CLAUDE.md forbidden-pattern scan** — PASS.
    - No `: any` / `<any>` types in any modified file.
    - No `as unknown as` casts in any modified file.
    - No `bg-white` (modified files use `bg-background`, `bg-background/95`, `bg-muted`).
    - No bare `text-muted` (all uses are `text-muted-foreground`).
    - No inline `style={...}` props (only `className` with Tailwind utilities).
    - All imports use `#` subpath aliases (no relative cross-package imports).
    - No string-literal query keys (no TanStack queryKey arrays in this surface — modal mutation uses `useMutation` without a key).
    - No emojis in code.
    - No `as` in JSX or props beyond library types.
    - Typecheck: clean (`tsc --noEmit` exits 0).
    - Lint: clean (`eslint` exits 0).

## Final Verdict

**PASS** — zero findings. This is cycle-2 of the perfect-PR merge gate. If cycle-3 also returns zero findings, the gate is satisfied and Phase 13 is mergeable.

---

_Reviewed: 2026-05-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
