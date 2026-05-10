---
phase: 02-frontend-correctness-numberticker-mobile
reviewed: 2026-05-09T21:00:00Z
depth: deep
files_reviewed: 7
files_reviewed_list:
  - src/components/ui/number-ticker.tsx
  - src/components/ui/__tests__/number-ticker.test.tsx
  - src/app/marketing-home.tsx
  - src/components/layout/navbar.tsx
  - src/components/layout/navbar/navbar-mobile-menu.tsx
  - src/components/ui/sheet.tsx
  - tests/e2e/tests/public/mobile-nav-375px.spec.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 2: Code Review Report — Cycle 3

**Reviewed:** 2026-05-09T21:00:00Z
**Depth:** deep
**Files Reviewed:** 7
**Status:** clean

## Summary

Cycle 3 (fresh-eyes adversarial) re-review of PR #686. Seven production fault scenarios, mathematical correctness checks, test isolation analysis, accessibility compliance, and E2E edge cases examined. All reviewed files meet quality standards. No issues found.

### Adversarial Dimension Findings

**1. Concurrent renders / rAF double-start (production fault scenario)**

`hasIntersected` state is set via `setHasIntersected(true)` exactly once, gated by `hasIntersectedRef.current` in `use-intersection-observer.ts` (line 37-40). Even if the `IntersectionObserver` callback fires multiple times synchronously before React commits, the ref guard prevents double-invocation of `setHasIntersected`. React 19 batches these into a single render with `hasIntersected=true`. The effect in `number-ticker.tsx` therefore starts exactly one rAF chain. No double-animation possible.

**2. Test 6 (one-shot guard) cleanup and isolation**

Test 6 is the final test in the file. The `window.IntersectionObserver` restore at line 135 executes after assertions at lines 131-132. If those assertions threw, the restore would be skipped — but since this is the last test in the describe block and Vitest isolates each test file in a separate worker process, no subsequent test in the file or in another file would be contaminated. The pattern is safe in practice for this test suite structure.

The test's `disconnect()` delegation path was traced: `CapturingObserver.disconnect()` calls `this.inner.disconnect()` which calls `IntersectionObserverMock.disconnect` (a `vi.fn()`). The component's effect cleanup calls `observer.disconnect()` on the `CapturingObserver` instance. Path is correct end-to-end.

**3. Easing overshoot — mathematical correctness**

The easing function `eased = progress * (2 - progress)` is the quadratic ease-out `1 - (1-p)^2`, monotonically increasing from 0 to 1, never exceeding 1. `displayValue = from + change * eased` is therefore bounded by `[from, to]` throughout the animation. No frame can show a value greater than `to`. The terminal branch `setDisplayValue(to)` snaps to the exact integer. `Intl.NumberFormat` with 0 decimal places rounds the intermediate values using standard rounding — intermediate frames may show `to-1` during the final approach but never `to+1`. No overshoot possible for any of the production values (5, 7, 500, 14).

**4. IntersectionObserver options object stability**

`use-intersection-observer.ts` deps array is `[ref, options.threshold, options.root, options.rootMargin]` — primitives, not the options object. The literal `{ threshold: 0.1, rootMargin: '0px' }` passed by `number-ticker.tsx` creates a new object each render, but the hook correctly extracts to stable primitives. Effect is stable and will not re-run spuriously.

**5. `useIntersectionObserver` cleanup — disconnect**

The hook's effect cleanup returns `observer.disconnect()` (line 52 of `use-intersection-observer.ts`). If options changed (they do not in this usage), the old observer would be disconnected and a new one created. In test 6, the observer created is a `CapturingObserver`; its `disconnect()` delegates to the inner mock. Cleanup is correct.

**6. Sheet accessibility — close button**

`SheetPrimitive.Close` at line 73-79 of `sheet.tsx` carries `aria-label="Close"`. The `sr-only` span reads "Close dialog". Per ARIA spec, `aria-label` takes precedence over element text content in the accessible name computation — screen readers announce "Close" (from `aria-label`), not "Close dialog". There is no double-announcement. The redundant `sr-only` span is pre-existing and does not affect correctness. Focus trap and Tab cycling are provided by Radix Dialog primitives and are unchanged by this PR.

**7. E2E horizontal scroll assertion — +1 tolerance**

The `+1` tolerance on `bodyScrollWidth <= viewport + 1` accounts for sub-pixel rounding at device-pixel-ratio boundaries. On macOS with overlay scrollbars, vertical scrollbars do not consume layout width, so no false negatives. Playwright CI runs on Linux (Ubuntu); Linux Chrome uses classic scrollbars, but `scrollWidth` measures content width independent of scrollbar track width, so the assertion is platform-consistent. Not a bug.

**8. `page.mouse.click(10, 100)` and third-party DOM injection**

The outside-click coordinate `(10, 100)` targets the `SheetOverlay` which is `fixed inset-0 z-50`. When the Sheet is open, the overlay sits above any third-party widgets (e.g., Sentry feedback widget, z-index ~10000 would be above the overlay but is dismissed by the overlay click). The E2E spec comment at lines 86-90 documents the geometry. Non-issue.

**9. `page.locator('h1').first()` — not present**

The spec uses `page.getByRole('link', ...)` and `page.getByTestId(...)` selectors throughout. No `.first()` on generic selectors. The third-party script concern does not apply.

**10. `prefers-reduced-motion` — not in scope**

`NumberTicker` does not implement `prefers-reduced-motion: reduce` handling. This was not listed as a requirement in CONTEXT.md or REQUIREMENTS.md. Noted as a future a11y enhancement but not a defect against this PR's scope.

### CLAUDE.md Zero-Tolerance Compliance (cycle-3 re-verification)

- No `any` types in any production file (confirmed via grep)
- No debug artifacts (`console.log`, `debugger`, `TODO`, `FIXME`, `HACK`) in any of the 7 files
- No barrel file imports
- No `@radix-ui/react-icons` (`lucide-react` only: `Menu`, `X`, `XIcon`, `ArrowRight`, `ChevronDown`)
- No `as unknown as` in production code (test mock setup at line 104 is not an RPC/PostgREST boundary)
- No commented-out code
- No emojis
- Icon-only buttons all have `aria-label`
- No hex/rgb/`bg-white` / inline-ms tokens in changed code

All reviewed files meet quality standards. No issues found.

---

_Reviewed: 2026-05-09T21:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
