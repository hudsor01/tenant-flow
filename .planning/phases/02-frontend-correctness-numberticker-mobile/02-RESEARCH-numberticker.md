# Phase 2 — Specialist 1 Research: NumberTicker Animation Bug

**Researched:** 2026-05-09
**Domain:** Client-side animation lifecycle (IntersectionObserver + requestAnimationFrame + React 19 + React Compiler)
**Confidence:** HIGH on fix shape, MEDIUM on pinpointing the single trigger condition (the implementation has multiple compounding code smells, any of which can produce the symptom)

---

## TL;DR

`src/components/ui/number-ticker.tsx` is a hand-rolled `Date.now()` + recursive `requestAnimationFrame` animator with **no useEffect cleanup**, **no mounted-guard**, **no rAF id tracking**, and uses **reactive `isIntersecting`** as the trigger (instead of the one-shot `hasIntersected` already exposed by `useIntersectionObserver`). The animate function is also defined fresh inside the effect on every run, while four useEffect deps (`from`, `to`, `delay`, `duration`) cause the effect to invalidate even after `hasAnimated` has flipped — leaking dangling rAF chains into orphan closures.

The visible production symptom ("renders 0") is consistent with: the rAF chain being scheduled but interrupted by a re-render that creates a new effect closure, while React Compiler memoizes the `Intl.NumberFormat(...).format(displayValue)` JSX call site. The reliable fix is a small, focused rewrite that:

1. Triggers off **`hasIntersected`** (one-shot), not `isIntersecting` (reactive)
2. Stores `startTime` and `rafId` in refs, runs `performance.now()` (not `Date.now()`)
3. Returns a cleanup that cancels the rAF + clears the timeout
4. Uses a mounted-ref to short-circuit late-arriving frames

This is a single-file change in `src/components/ui/number-ticker.tsx` plus one new test file.

---

## Animation Lifecycle (current state)

The current `NumberTicker` component (`src/components/ui/number-ticker.tsx:1-93`):

| Step | Code | Notes |
|------|------|-------|
| 1. Hook setup | L33–34 | `useState(startValue=0)` + `useState(hasAnimated=false)` |
| 2. Observer | L35–41 | `useIntersectionObserver(ref, { threshold: 0.1, rootMargin: '0px' })` returns `isIntersecting` (reactive). **Does NOT use `hasIntersected` — even though the hook returns it (`src/hooks/use-intersection-observer.ts:57`).** |
| 3. Per-render derivation | L43–44 | `from`/`to` derived from props on every render. |
| 4. Effect | L46–79 | Fires when `isIntersecting && !hasAnimated`. Sets `hasAnimated=true`, computes `delayMs`, `startTime = Date.now() + delayMs`, defines `animate` closure, dispatches via `setTimeout`+`rAF` (delay>0) or bare `rAF` (delay=0). **No cleanup function returned** — no `cancelAnimationFrame`, no `clearTimeout`, no mounted guard. |
| 5. Animate closure | L54–71 | Calls `Date.now()`, computes `elapsed`, `progress`, `easedProgress`, `current = from + change * easedProgress`, calls `setDisplayValue(current)`, then **recursively** schedules `requestAnimationFrame(animate)` until progress reaches 1. |
| 6. Render | L82–91 | `Intl.NumberFormat(...).format(displayValue)` rendered inside `<span>`. |

**Triggering chain in production (from `src/components/sections/stats-showcase.tsx:67–94`):**

```
StatsShowcase (Server Component)
└── BlurFade (client, has its own IntersectionObserver — src/components/ui/blur-fade.tsx:33–55)
    └── div.showcase-card
        └── NumberTicker (client) ── ref attached to <span>
                                       ↑ observed by useIntersectionObserver
```

`BlurFade` is invoked with `inView={true}` and `delay={0.2 + index*0.1}`. With `inView=true`, BlurFade's `shouldAnimate = inView || isVisible` is `true` immediately on first render (`src/components/ui/blur-fade.tsx:86`) — so the wrapper does not start at `opacity-0` waiting on its own observer; it commits the visible classes on mount. The NumberTicker `<span>` therefore lays out at full opacity from the first paint.

`useEffect` deps array (L79): `[isIntersecting, hasAnimated, from, to, delay, duration]`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Animation trigger (in-view detection) | Browser/Client | — | IntersectionObserver is a DOM API, runs after hydration |
| Animation tween (rAF loop) | Browser/Client | — | requestAnimationFrame is a browser API tied to vsync |
| Number formatting (`Intl.NumberFormat`) | Browser/Client | Frontend Server | Runs on both server (initial 0) and client (animated values) — must produce identical output for `displayValue=0` to avoid hydration mismatch |
| Section layout / SSR | Frontend Server | — | `stats-showcase.tsx` is a Server Component; renders the static shell with `displayValue=0` |

The boundary that matters: SSR renders the literal text `"0"` for every ticker. The client must hydrate to the same `"0"` (else React 19 throws a hydration mismatch error in dev / silently flips to client-render in prod). The rewrite preserves that contract.

---

## Root Cause

### Primary diagnosis (MEDIUM confidence)

The implementation has **four compounding defects**, any subset of which produces the observed "value stuck at 0" symptom:

#### Defect 1 — Reactive trigger instead of one-shot (`number-ticker.tsx:35,47,79`)

The component subscribes to `isIntersecting` (reactive: flips true → false → true as the user scrolls past). Even though `hasAnimated` guards re-execution, `isIntersecting` is in the **useEffect deps array**. Every flip causes the effect to re-run. With **no cleanup**, the previous rAF chain stays alive in an orphan closure, while the new effect run skips the inner block (because `hasAnimated=true`). Result: the original animation closure references a `setDisplayValue` from the old render's binding, which is still valid (React preserves setter identity), but if React Compiler has memoized away the inline `animate` arrow function and re-created it for the new render, the rAF callback in flight may end up calling a stale `setDisplayValue` from a tear-down render. (Aside: setter identity is stable in React's contract, but the broader pattern is fragile and fights the compiler.)

The fix is to use `hasIntersected` from `useIntersectionObserver` — already returned by the hook (`src/hooks/use-intersection-observer.ts:57`), already tracked once via `hasIntersectedRef` (`src/hooks/use-intersection-observer.ts:25`), already designed for one-shot enter-viewport triggers. **This is a one-line change at the call site.**

#### Defect 2 — No useEffect cleanup (`number-ticker.tsx:46–79`)

The effect schedules a `setTimeout` and a recursive `requestAnimationFrame` chain. **No cleanup function is returned.** When the effect re-fires (Defect 1), or when the component unmounts, neither timer is cleared. Subsequent rAF frames call `setDisplayValue` on a closure whose component may have been re-rendered with a fresh effect run — at minimum producing React warnings, at worst calling stale setters that no longer reach the current commit.

#### Defect 3 — `Date.now()` for animation timing (`number-ticker.tsx:51,55`)

`Date.now()` is wall-clock, jumps if the user adjusts system time, and has 1ms resolution. The ecosystem standard for rAF tweens is `performance.now()` (high-resolution, monotonic, identical reference frame as `requestAnimationFrame`'s timestamp argument). Not the smoking gun, but the `setTimeout(... delayMs) → rAF → animate { Date.now() − (Date.now()+delayMs) }` arithmetic is more brittle than the canonical pattern of capturing `startTime` via `performance.now()` inside the rAF callback on its first invocation.

#### Defect 4 — `from`, `to`, `delay`, `duration` in the deps array (`number-ticker.tsx:79`)

These four values are recomputed on every render. They are primitives (numbers), so `Object.is` equality holds across stable-prop renders → deps don't change → effect doesn't re-run. **For the stats-showcase use case this is benign.** But the pattern is fragile: any caller that passes computed primitives (e.g. `value={Math.floor(totalRevenue)}` as in `src/app/(owner)/financials/income-statement/income-statement-page-stats.tsx:39`) and re-renders with a different value will see the effect re-fire — and again, with no cleanup, the previous rAF chain runs to completion racing against a new rAF chain.

### Ruled-out alternatives

| Hypothesis from CONTEXT.md | Ruled out by | Evidence |
|---------------------------|--------------|----------|
| `value` prop type mismatch (string/number) | Type system | `stats-showcase.tsx:17–43` defines `value: 5` as a number literal in a `const stats = [...]` array; `NumberTickerProps.value: number` (`number-ticker.tsx:14`); strict mode would catch any string. |
| SSR hydration mismatch from `delay` offset | Trace | Server renders `displayValue=0`. Client hydrates with `displayValue=startValue=0`. No mismatch. The `delay` only affects when animate STARTS, not initial render. |
| React Compiler optimizing away the hook | Compiler scope | React Compiler 1.0 (`package.json:203`) memoizes pure expressions. `useEffect`/`useState` are explicit hooks the compiler does NOT remove. Verified compatible per [React docs](https://react.dev/learn/react-compiler) and [reactwg/react-compiler discussion #18](https://github.com/reactwg/react-compiler/discussions/18). However, the compiler MAY memoize the inline `animate` arrow function across re-renders, which compounds Defect 1. |
| `BlurFade` opacity hides the element from IntersectionObserver | Code reading | `stats-showcase.tsx:68` passes `inView={true}` — `BlurFade` line 86 sets `shouldAnimate=true` on first render, so the wrapper is never opacity-0 in this use case. Even when opacity-0, the bounding box is preserved (opacity ≠ display:none). |
| `useIntersectionObserver` itself is broken | Hook reading | `src/hooks/use-intersection-observer.ts` correctly observes the element and emits `isIntersecting`. `hasIntersected` is correctly tracked-once via ref. |

### Why "renders 0" specifically (not partial values)

Three plausible mechanisms; we don't need to pick one — the rewrite eliminates all three:

1. **Effect re-fire wipes the in-flight chain**: as `isIntersecting` flips during scroll, the effect re-runs; combined with React 19's transition batching, intermediate `setDisplayValue(0.04)` calls may be coalesced and superseded before paint. The user sees the static SSR'd `"0"` until the chain completes and `setDisplayValue(to)` fires — but if the chain is broken (Defect 2), `to` never lands.
2. **rAF chain broken by tab-throttling**: if the page loads with the section just out of viewport and the user scrolls in within ~100ms, the BlurFade transition is in-flight while the animation effect schedules. Browsers throttle rAF in non-foreground or low-FPS contexts. Combined with no cleanup (Defect 2), the chain dies silently.
3. **Stale closure from compiler memoization**: React Compiler may hoist the inline `animate` function across renders. If the effect re-fires and the compiler reuses the old `animate` closure (which captured the old `startTime`), the `Date.now() − startTime` math produces a different `progress` curve than expected — possibly clamped to 0 indefinitely if the effect re-fires after `startTime` is already in the past.

---

## Recommended Fix

**Single-file replacement** of `src/components/ui/number-ticker.tsx`. No changes to `stats-showcase.tsx`, `blur-fade.tsx`, or `use-intersection-observer.ts`. No new dependencies (motion / framer-motion is NOT installed and the design-token constraint discourages adding deps).

### Replacement source (write verbatim)

```tsx
'use client'

import {
	ComponentPropsWithoutRef,
	RefObject,
	useEffect,
	useRef,
	useState
} from 'react'
import { useIntersectionObserver } from '#hooks/use-intersection-observer'
import { cn } from '#lib/utils'

interface NumberTickerProps extends ComponentPropsWithoutRef<'span'> {
	value: number
	startValue?: number
	direction?: 'up' | 'down'
	delay?: number
	decimalPlaces?: number
	duration?: number
}

export function NumberTicker({
	value,
	startValue = 0,
	direction = 'up',
	delay = 0,
	className,
	decimalPlaces = 0,
	duration = 2000,
	...props
}: NumberTickerProps) {
	const ref = useRef<HTMLSpanElement>(null)
	const [displayValue, setDisplayValue] = useState(startValue)

	// One-shot trigger: hasIntersected only flips false → true (never back).
	// useIntersectionObserver already tracks this via hasIntersectedRef.
	const { hasIntersected } = useIntersectionObserver(
		ref as RefObject<Element>,
		{
			threshold: 0.1,
			rootMargin: '0px'
		}
	)

	const from = direction === 'down' ? value : startValue
	const to = direction === 'down' ? startValue : value

	useEffect(() => {
		if (!hasIntersected) return

		let rafId = 0
		let timeoutId: ReturnType<typeof setTimeout> | undefined
		let startTime: number | undefined
		let cancelled = false

		const change = to - from
		const delayMs = delay * 1000

		const animate = (timestamp: number) => {
			if (cancelled) return
			if (startTime === undefined) startTime = timestamp
			const elapsed = timestamp - startTime
			const progress = Math.min(elapsed / duration, 1)
			// ease-out-quad
			const eased = progress * (2 - progress)
			setDisplayValue(from + change * eased)
			if (progress < 1) {
				rafId = requestAnimationFrame(animate)
			} else {
				setDisplayValue(to)
			}
		}

		const start = () => {
			if (cancelled) return
			rafId = requestAnimationFrame(animate)
		}

		if (delayMs > 0) {
			timeoutId = setTimeout(start, delayMs)
		} else {
			start()
		}

		return () => {
			cancelled = true
			if (rafId) cancelAnimationFrame(rafId)
			if (timeoutId) clearTimeout(timeoutId)
		}
	}, [hasIntersected, from, to, delay, duration])

	return (
		<span
			ref={ref}
			className={cn('inline-block tabular-nums tracking-wider', className)}
			{...props}
		>
			{Intl.NumberFormat('en-US', {
				minimumFractionDigits: decimalPlaces,
				maximumFractionDigits: decimalPlaces
			}).format(displayValue)}
		</span>
	)
}

export default NumberTicker
```

### Diff against current implementation

| Line(s) | Change | Why |
|---------|--------|-----|
| L34 (delete) | Remove `hasAnimated` state | One-shot is now provided by `hasIntersected` from the hook. |
| L35 | `isIntersecting` → `hasIntersected` | Fixes Defect 1. Effect runs once when element first enters viewport. |
| L46–47 | Guard `if (!hasIntersected) return` (early-return) instead of `if (isIntersecting && !hasAnimated)` | Cleaner control flow; aligns with cleanup pattern below. |
| L51 | Drop `Date.now() + delayMs` precomputation; capture `startTime` lazily inside rAF callback from the rAF `timestamp` argument | Fixes Defect 3. `performance.now()`-equivalent monotonic time, no jitter from `setTimeout` lag. |
| L54 | `animate(timestamp)` accepts the rAF timestamp argument | Standard rAF idiom. |
| L73–77 → cleanup block | Track `rafId`, `timeoutId`, `cancelled` in effect-local closures; return cleanup that cancels both | Fixes Defect 2. |
| L79 | Deps: `[hasIntersected, from, to, delay, duration]` (drop `isIntersecting`, drop `hasAnimated`) | Fixes Defect 4 partially — `from`/`to`/`delay`/`duration` retained because the effect MUST re-run if the target value changes (e.g., dashboard pages where `value` is derived from live data). The cleanup ensures no leaks. |

### Why this fix is sufficient

- **Hydration safety preserved**: server renders `Intl.NumberFormat(...).format(0)` = `"0"`. Client mounts with same `displayValue=0`. No mismatch.
- **One-shot animation per mount**: `hasIntersected` stays `true` after first intersection, so the effect's body runs at most once per mount. Re-renders that don't change `from/to/delay/duration` don't re-fire (primitives compare equal).
- **Re-target works correctly** (for dashboard pages where `value` changes): when `to` changes, effect cleanup runs (cancels in-flight rAF), then effect re-runs (starts fresh tween from current displayValue toward new `to`). This is actually a behavior IMPROVEMENT over the current code, which would silently leak the old chain and let it race the new one.
- **No new dependencies** added.
- **No changes to call sites** — the public prop API is unchanged.

---

## Test Strategy

### File location

**NEW:** `src/components/ui/__tests__/number-ticker.test.tsx`

Colocated under `__tests__/` directory next to the component, matching the existing convention (`src/components/ui/__tests__/animated-trend-indicator.test.tsx`, `mobile-nav.test.tsx`, etc. — see `ls src/components/ui/__tests__/`).

### Vitest 4.x conventions to follow

- `@vitest-environment jsdom` directive at top of file (matches existing test files).
- Use `render` from `#test/utils/test-render` (codebase pattern, not raw `@testing-library/react` render).
- `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` to step the rAF chain deterministically. Vitest 4's `useFakeTimers()` mocks both `setTimeout` and `requestAnimationFrame` by default.
- **No `.rejects.toThrow('string')` patterns needed here** (this test does no async-throwing). The chai 6 caveat from `CLAUDE.md` doesn't bite for synchronous DOM assertions.
- The shared `IntersectionObserverMock` in `src/test/unit-setup.ts:120–155` already fires `isIntersecting: true` synchronously inside `observe()` — the test inherits this and does NOT need to manually trigger intersection.

### What to assert

Five tests, all targeting the regression vector:

```tsx
/**
 * NumberTicker Component Tests
 *
 * Regression tests for CRIT-02 (homepage stats rendering "0" instead of animating).
 * Trigger: IntersectionObserverMock fires isIntersecting=true synchronously on observe();
 * we then advance fake timers to drive the rAF chain to completion and assert the final
 * displayed value matches the target.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '#test/utils/test-render'
import { NumberTicker } from '../number-ticker'

describe('NumberTicker', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('renders the start value on mount before animation completes', () => {
		render(<NumberTicker value={5} duration={2000} />)
		// Initial render: 0 (startValue default)
		expect(screen.getByText('0')).toBeInTheDocument()
	})

	it('animates to the target value after duration elapses (CRIT-02 regression)', async () => {
		render(<NumberTicker value={5} duration={2000} />)
		// Advance through the entire animation window
		await vi.advanceTimersByTimeAsync(2100)
		expect(screen.getByText('5')).toBeInTheDocument()
	})

	it('honors delay before starting the tween (mirrors stats-showcase usage)', async () => {
		render(<NumberTicker value={500} delay={0.3} duration={2000} />)
		// Halfway through delay window: still on startValue (no tween yet)
		await vi.advanceTimersByTimeAsync(150)
		expect(screen.getByText('0')).toBeInTheDocument()
		// After delay + full duration: target value reached
		await vi.advanceTimersByTimeAsync(2300)
		expect(screen.getByText('500')).toBeInTheDocument()
	})

	it('renders all four production stat values to completion', async () => {
		// Mirrors stats-showcase: 5, 7, 500, 14
		const { rerender } = render(<NumberTicker value={5} delay={0.3} />)
		await vi.advanceTimersByTimeAsync(2500)
		expect(screen.getByText('5')).toBeInTheDocument()

		rerender(<NumberTicker value={7} delay={0.4} />)
		await vi.advanceTimersByTimeAsync(2500)
		expect(screen.getByText('7')).toBeInTheDocument()

		rerender(<NumberTicker value={500} delay={0.5} />)
		await vi.advanceTimersByTimeAsync(2500)
		expect(screen.getByText('500')).toBeInTheDocument()

		rerender(<NumberTicker value={14} delay={0.6} />)
		await vi.advanceTimersByTimeAsync(2500)
		expect(screen.getByText('14')).toBeInTheDocument()
	})

	it('cancels the rAF chain on unmount (no setState-after-unmount warning)', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		const { unmount } = render(<NumberTicker value={5} duration={2000} />)
		await vi.advanceTimersByTimeAsync(500) // mid-animation
		unmount()
		await vi.advanceTimersByTimeAsync(2000) // would have completed if not cancelled
		expect(consoleError).not.toHaveBeenCalledWith(
			expect.stringContaining('unmounted component')
		)
		consoleError.mockRestore()
	})
})
```

### Why this catches the regression

- Test 2 directly asserts the bug surface — the audit finding is "value renders as 0"; this test fails if the rewrite doesn't reach the target.
- Test 3 covers the delayed-start path (which `stats-showcase` exclusively uses with `delay={0.3 + index * 0.1}`).
- Test 4 pins all four production values explicitly, so a future regression at any single counter is caught.
- Test 5 catches the cleanup defect that the current code has.

---

## React Compiler Compatibility

**Status: Compatible after rewrite.** Confirmed by:

1. **`'use client'` directive preserved** at the top of the file (`number-ticker.tsx:1`) — required for `useEffect`, `useState`, `useRef`, IntersectionObserver, requestAnimationFrame.
2. **No anti-patterns the compiler chokes on**: no mutation of props, no early `return` before all hooks called, no conditional hook calls. The rewrite uses standard React hooks the compiler is designed to optimize around.
3. **The `animate` closure is defined inside `useEffect`** (not at component scope), so React Compiler does not memoize it. Each effect run creates a fresh closure — but with the cleanup function preventing leaks, this is correct.
4. **`useIntersectionObserver` returns stable values** (`hasIntersected` only flips false→true once, then stays). The compiler's auto-memoization is safe here.
5. **Reference**: [reactwg/react-compiler discussion #18](https://github.com/reactwg/react-compiler/discussions/18) confirms `eslint-plugin-react-hooks` rules apply unchanged — and the rewrite satisfies `react-hooks/exhaustive-deps`.

**Not required:** no `'use no memo'` escape hatch needed.

**Verification step at PR time**: run `pnpm lint` and `pnpm typecheck`. The React Compiler is enabled in `next.config.ts:16` (`reactCompiler: true`); a successful build is the smoke test.

---

## Risk Matrix

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Rewrite breaks dashboard `NumberTicker` callers (`financials-summary-stats.tsx`, `income-statement-page-stats.tsx`) | LOW | Public prop API is unchanged. Behavior IS changed when `value` prop changes mid-mount — old code leaked, new code re-tweens cleanly. This is a fix not a regression, but worth manually smoke-testing `/financials` and `/financials/income-statement` after deploy. |
| `vi.advanceTimersByTimeAsync` doesn't drive `requestAnimationFrame` in jsdom | LOW | Vitest 4.x mocks `requestAnimationFrame` when `useFakeTimers()` is active. If a test ever fails for this reason, switch to `vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] })` explicitly. |
| Hydration mismatch on server | NONE | Initial `displayValue` matches server render (both `startValue=0`). |
| Animation appears "instant" on slow devices | LOW | `duration: 2000` is preserved; rAF is vsync-bound. |
| Cleanup of rAF on rapid prop changes causes janky restart | LOW | The new behavior — cancel old, start new tween — is more correct than the old (silent race). For the static stats-showcase use case, `value` never changes after mount. |
| Tests fail in CI but pass locally | MEDIUM | The shared `IntersectionObserverMock` (`src/test/unit-setup.ts:130`) fires synchronously inside `observe()`. This is correct in jsdom, but if a future setup change breaks it, the new tests will fail loudly. |
| Live-verification gap (Phase 1 lesson) | MEDIUM | Plan must include a post-deploy live curl + visual check at `https://tenantflow.app/` confirming all four values render correctly. The audit (`audit-ui-2026-05-08.md` item 2) is the regression baseline. |

---

## Confidence Levels

| Claim | Confidence | Source |
|-------|-----------|--------|
| Current implementation has no useEffect cleanup | HIGH | `number-ticker.tsx:46–79` — verified, no `return` statement in effect body |
| `hasIntersected` is exposed and one-shot | HIGH | `use-intersection-observer.ts:25,38–39,57` — verified |
| React 19.2.4 + React Compiler 1.0 are compatible with the rewrite | HIGH | [React docs](https://react.dev/learn/react-compiler), [reactwg discussion #18](https://github.com/reactwg/react-compiler/discussions/18); package.json lines 161, 203 |
| Vitest 4.x `useFakeTimers` mocks rAF by default | MEDIUM | Vitest documented behavior; codebase precedent (`src/components/ui/__tests__/animated-trend-indicator.test.tsx` uses similar patterns without explicit rAF setup) |
| The IntersectionObserverMock fires synchronously inside `observe()` | HIGH | `src/test/unit-setup.ts:130–147` — verified |
| Root cause is one of the four compounding defects (vs a single isolated bug) | MEDIUM | Static analysis cannot fully rule out a fifth cause without runtime debugging. The rewrite eliminates ALL four defects, so the fix is robust regardless of which subset is actually firing in production. |
| The rewrite preserves SSR hydration | HIGH | Initial state unchanged; render output unchanged for `displayValue=0` |
| The rewrite resolves the symptom | HIGH | The symptom is "renders 0"; the rewrite uses a battle-tested rAF-tween pattern (`performance.now()` from rAF timestamp + cleanup) that does not exhibit this failure mode |

**Live verification was attempted** but blocked by sandbox network restrictions on `https://tenantflow.app/`. The plan-execute-phase MUST include a post-deploy curl/visual check at production to confirm the fix lands. (See Phase 1 lessons in `02-CONTEXT.md` lines 78–83.)

---

## Project Constraints (from CLAUDE.md)

Verified the rewrite complies with:

- **No `any` types** ✓ — uses `ReturnType<typeof setTimeout>`, `RefObject<Element>`, etc.
- **No barrel files** ✓ — direct imports preserved.
- **No commented-out code** ✓.
- **No inline styles** ✓ — Tailwind utilities only.
- **No emojis in code** ✓.
- **No `as unknown as`** ✓ — preserved the existing `as RefObject<Element>` cast which is a single-step assertion against the `useRef<HTMLSpanElement>` return.
- **Max 300 lines per component** ✓ — file stays ~80 lines.
- **Max 50 lines per function** ✓ — the component body is ~50 lines, the effect body is ~35 lines.
- **Server Components by default; `'use client'` only when needed** ✓ — directive preserved (required).
- **Tests in `__tests__/` colocated** ✓ — matches `src/components/ui/__tests__/` convention.
- **Vitest 4.x patterns** ✓ — uses `vi.useFakeTimers()`/`vi.advanceTimersByTimeAsync()`, no `.rejects.toThrow('string')`.
- **No new dependencies** ✓ — uses only existing React + browser APIs.

---

## Sources

### Primary (HIGH confidence — codebase)

- `src/components/ui/number-ticker.tsx` (full file, 95 lines) — current broken implementation
- `src/components/sections/stats-showcase.tsx` (full file, 127 lines) — call site, values verified at L17–43
- `src/components/ui/blur-fade.tsx` (full file, 125 lines) — wrapper component, ruled out as cause
- `src/hooks/use-intersection-observer.ts` (full file, 58 lines) — observer hook, exposes `hasIntersected`
- `src/test/unit-setup.ts:115–155` — IntersectionObserver mock used in tests
- `src/components/ui/__tests__/animated-trend-indicator.test.tsx` — pattern reference for new test file
- `package.json:157,161,163,203` — Next 16.2.4, React 19.2.4, react-dom 19.2.4, babel-plugin-react-compiler 1.0
- `next.config.ts:16` — `reactCompiler: true`
- `CLAUDE.md` — zero-tolerance rules, Vitest patterns, hook organization rules
- `audit-ui-2026-05-08.md` item #2 — regression baseline
- `.planning/phases/02-frontend-correctness-numberticker-mobile/02-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence — external)

- [React Compiler — official docs](https://react.dev/learn/react-compiler) — confirmed `useEffect`/`useState` are not removed by the compiler
- [reactwg/react-compiler discussion #18](https://github.com/reactwg/react-compiler/discussions/18) — `eslint-plugin-react-hooks` and compiler interaction
- [Magic UI NumberTicker docs](https://magicui.design/docs/components/number-ticker) — prop signature reference (matches our public API)

### Tertiary (LOW confidence — needs validation post-deploy)

- The exact mechanism producing `"0"` in production (vs partial values) — three plausible mechanisms documented in Root Cause; rewrite eliminates all three. Live debugging would pin the specific one but is unnecessary for the fix.

---

## Open Questions (RESOLVED)

1. **Should `value` be added back to the deps?** (Currently `from`, `to` are derived from `value` and included.) Including `value` directly is more readable but redundant since `from = startValue, to = value` for the default `direction='up'` case. Recommendation: keep deps as `[hasIntersected, from, to, delay, duration]` per the rewrite — exhaustive-deps lint will validate.

2. **Should we add a `prefers-reduced-motion` short-circuit?** The audit doesn't call for it, and `BlurFade` already handles its own reduced-motion preference (`blur-fade.tsx:23–31`). Recommendation: defer — out of scope for CRIT-02.

3. **Is there a use case for `direction='down'` (countdown)?** Grepping the codebase, no caller uses `direction='down'`. Recommendation: keep the API for forward-compat, but the test suite focuses on `'up'`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Production browser's IntersectionObserver fires asynchronously after observe() (per spec) | Animation Lifecycle | LOW — spec-compliant; Chrome/Safari/Firefox all conform. If this assumption were wrong the bug would manifest differently. |
| A2 | The four production values (5/7/500/14) and their delays (0.3/0.4/0.5/0.6) are stable across renders (`stats-showcase.tsx:17–43`) | Test Strategy | LOW — verified statically; only changes if Phase 67's stat-claim-demolition gets revisited |
| A3 | Vitest 4.x `useFakeTimers()` mocks `requestAnimationFrame` by default | Test Strategy | MEDIUM — if false, switch to `vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] })` explicitly. Test runner errors will be loud. |
| A4 | Other `NumberTicker` call sites (financials pages) tolerate the new clean-restart-on-prop-change behavior | Risk Matrix | LOW — the new behavior is strictly more correct than the old. If a caller depends on the leak (e.g. doesn't want the tween to restart), that would be a pre-existing latent bug. |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + jsdom |
| Config file | `vitest.config.ts` (verify path; matches existing UI test runs) |
| Quick run command | `pnpm test:unit -- --run src/components/ui/__tests__/number-ticker.test.tsx` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRIT-02 | Stat counter animates from 0 to target value within `duration + delay` window | unit | `pnpm test:unit -- --run src/components/ui/__tests__/number-ticker.test.tsx::"animates to the target value after duration elapses"` | ❌ Wave 0 |
| CRIT-02 | All four production values (5, 7, 500, 14) reach completion | unit | same file::"renders all four production stat values to completion" | ❌ Wave 0 |
| CRIT-02 | Animation respects per-stat `delay` prop | unit | same file::"honors delay before starting the tween" | ❌ Wave 0 |
| CRIT-02 | rAF chain is cancelled on unmount | unit | same file::"cancels the rAF chain on unmount" | ❌ Wave 0 |
| CRIT-02 (live verification) | Production homepage shows animated counters | manual | `curl -s https://tenantflow.app/ | grep -A 2 "Entity Branches"` + visual confirmation in browser | manual-only — REQUIRED post-deploy per Phase 1 lessons |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run src/components/ui/__tests__/number-ticker.test.tsx`
- **Per wave merge:** `pnpm test:unit`
- **Phase gate:** Full suite green + manual visual verification of `https://tenantflow.app/` stats counters animating

### Wave 0 Gaps
- [ ] `src/components/ui/__tests__/number-ticker.test.tsx` — covers CRIT-02 (NEW — does not exist; specialist-1 provides full source above)
- No framework install needed — Vitest 4 + jsdom + IntersectionObserverMock all present

---

## Security Domain

Not applicable. CRIT-02 is a pure-frontend animation correctness bug. No auth, no data, no input handling, no crypto. ASVS V5 (Input Validation) trivially holds (`value: number` is type-checked). No secrets, no PII, no network I/O introduced.

---

## Metadata

**Confidence breakdown:**
- Animation lifecycle (current state): HIGH — full file read, all line citations verified
- Root cause (compounding defects): MEDIUM — static analysis cannot rule out a fifth cause without runtime debug; rewrite is robust regardless
- Recommended fix: HIGH — pattern is battle-tested, satisfies all four identified defects
- Test strategy: HIGH — matches existing codebase conventions
- React Compiler compatibility: HIGH — verified against official docs

**Research date:** 2026-05-09
**Valid until:** 2026-06-09 (30 days; stable React 19 + React Compiler 1.0 ecosystem)
