import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, useSyncExternalStore, type ReactNode } from 'react'

// Hoisted module-level state so the mock factory and the test body share refs.
//
// Critical design choices that make this mock a faithful reproduction of the
// production bug surface:
//
//   1. The outer result object returned by each hook MUST be a fresh
//      reference per render (the real `MutationObserver#updateResult` builds
//      a new `#currentResult` on every notify).
//
//   2. The inner `mutate` / `reset` methods MUST be STABLE references across
//      renders (the real observer binds them in its constructor — see
//      `mutationObserver.js#bindMethods`).
//
//   3. Calling `reset()` MUST schedule a re-render of every subscriber, just
//      like the real `#notify()` does via `useSyncExternalStore`.
//
// Together, those three properties create the loop: buggy code with the full
// result object in deps → reset() notifies → re-render → fresh result ref →
// dep equality fails → effect re-fires → reset() again → ... React error
// #185. Fixed code with destructured bound methods in deps → reset() notifies
// → re-render → same bound `reset` ref → deps unchanged → effect does NOT
// re-fire. Counter stops at 1 (2 under strict-mode double-invocation).
const store = vi.hoisted(() => {
	const enrollListeners = new Set<() => void>()
	const verifyListeners = new Set<() => void>()
	let enrollVersion = 0
	let verifyVersion = 0
	const counters = {
		enrollResetCount: 0,
		verifyResetCount: 0,
		enrollMutateCount: 0
	}
	return {
		counters,
		enrollListeners,
		verifyListeners,
		getEnrollVersion: () => enrollVersion,
		getVerifyVersion: () => verifyVersion,
		stableEnrollMutate: () => {
			counters.enrollMutateCount += 1
		},
		stableEnrollReset: () => {
			counters.enrollResetCount += 1
			enrollVersion += 1
			enrollListeners.forEach(fn => fn())
		},
		stableVerifyReset: () => {
			counters.verifyResetCount += 1
			verifyVersion += 1
			verifyListeners.forEach(fn => fn())
		}
	}
})

vi.mock('#hooks/api/use-mfa', () => {
	return {
		useMfaEnrollMutation: () => {
			useSyncExternalStore(
				cb => {
					store.enrollListeners.add(cb)
					return () => store.enrollListeners.delete(cb)
				},
				store.getEnrollVersion,
				store.getEnrollVersion
			)
			// Fresh outer object every render — this is the real bug surface.
			return {
				mutate: store.stableEnrollMutate,
				mutateAsync: vi.fn(),
				reset: store.stableEnrollReset,
				isPending: false,
				isError: false,
				isSuccess: false,
				error: null,
				data: undefined,
				status: 'idle' as const
			}
		},
		useMfaVerifyMutation: () => {
			useSyncExternalStore(
				cb => {
					store.verifyListeners.add(cb)
					return () => store.verifyListeners.delete(cb)
				},
				store.getVerifyVersion,
				store.getVerifyVersion
			)
			return {
				mutate: vi.fn(),
				mutateAsync: vi.fn(),
				reset: store.stableVerifyReset,
				isPending: false,
				isError: false,
				isSuccess: false,
				error: null,
				data: undefined,
				status: 'idle' as const
			}
		},
		useMfaUnenrollMutation: () => ({
			mutate: vi.fn(),
			mutateAsync: vi.fn(),
			reset: vi.fn(),
			isPending: false
		})
	}
})

vi.mock('#components/auth/two-factor-setup-steps', () => ({
	QrStep: () => createElement('div', { 'data-testid': 'qr-step' }),
	VerifyStep: () => createElement('div', { 'data-testid': 'verify-step' }),
	SuccessStep: () => createElement('div', { 'data-testid': 'success-step' })
}))

vi.mock('sonner', () => ({
	toast: { success: vi.fn(), error: vi.fn() }
}))

vi.mock('#lib/frontend-logger', () => ({
	logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}))

import { TwoFactorSetupDialog } from '../two-factor-setup-dialog'

function renderWithClient(ui: ReactNode) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})
	return render(
		createElement(QueryClientProvider, { client: queryClient }, ui)
	)
}

describe('TwoFactorSetupDialog — no infinite loop (P1 regression)', () => {
	beforeEach(() => {
		store.counters.enrollResetCount = 0
		store.counters.verifyResetCount = 0
		store.counters.enrollMutateCount = 0
	})

	afterEach(() => {
		cleanup()
	})

	// Battle-test 2026-05-12 surfaced React error #185 ("Maximum update depth
	// exceeded") on every visit to /settings?tab=security. Cycle-1 review of
	// PR #709 caught a P0 in the original version of this test: the mocked
	// `reset()` was a bare counter that did not schedule a re-render, so the
	// cascade could not be reproduced and the test passed against the buggy
	// code too. The mock above now drives a `useSyncExternalStore` so each
	// `reset()` call notifies subscribers — faithful to the real
	// `MutationObserver#notify()`. Verified empirically: temporarily
	// reverting the deps in `two-factor-setup-dialog.tsx` to the buggy form
	// causes this test to fail (counters climb past the ceiling).
	it('does not call reset() in an unbounded loop when mounted closed', async () => {
		renderWithClient(
			createElement(TwoFactorSetupDialog, {
				open: false,
				onOpenChange: vi.fn()
			})
		)

		// Flush microtasks + a macrotask so any pending re-renders settle.
		// If the loop returns, the cascade keeps firing every microtask tick
		// and the counter climbs into the hundreds before this resolves.
		await Promise.resolve()
		await new Promise<void>(resolve => setTimeout(resolve, 50))

		// Allow a tiny ceiling for React's StrictMode double-invocation plus
		// the legitimate single mount. A regression pushes both counters past
		// 100 well before the timeout.
		expect(store.counters.enrollResetCount).toBeLessThanOrEqual(4)
		expect(store.counters.verifyResetCount).toBeLessThanOrEqual(4)

		// The start-enrollment effect must NOT fire when closed.
		expect(store.counters.enrollMutateCount).toBe(0)
	})

	it('does not call mutate() when mounted closed', async () => {
		renderWithClient(
			createElement(TwoFactorSetupDialog, {
				open: false,
				onOpenChange: vi.fn()
			})
		)

		await Promise.resolve()
		await new Promise<void>(resolve => setTimeout(resolve, 50))

		expect(store.counters.enrollMutateCount).toBe(0)
	})
})
