import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'

// Hoisted counters so the mocked hooks share state with the test body.
const counters = vi.hoisted(() => ({
	enrollResetCount: 0,
	verifyResetCount: 0,
	enrollMutateCount: 0
}))

vi.mock('#hooks/api/use-mfa', () => {
	// Each render builds a fresh result object (the real MutationObserver
	// behaves this way). The bound methods, by contrast, share identity.
	const enrollMutate = vi.fn(() => {
		counters.enrollMutateCount += 1
	})
	const enrollReset = vi.fn(() => {
		counters.enrollResetCount += 1
	})
	const verifyMutate = vi.fn()
	const verifyReset = vi.fn(() => {
		counters.verifyResetCount += 1
	})
	const unenrollMutate = vi.fn()
	const unenrollReset = vi.fn()
	return {
		useMfaEnrollMutation: () => ({
			mutate: enrollMutate,
			mutateAsync: vi.fn(),
			reset: enrollReset,
			isPending: false,
			isError: false,
			isSuccess: false,
			error: null,
			data: undefined,
			status: 'idle' as const
		}),
		useMfaVerifyMutation: () => ({
			mutate: verifyMutate,
			mutateAsync: vi.fn(),
			reset: verifyReset,
			isPending: false,
			isError: false,
			isSuccess: false,
			error: null,
			data: undefined,
			status: 'idle' as const
		}),
		useMfaUnenrollMutation: () => ({
			mutate: unenrollMutate,
			mutateAsync: vi.fn(),
			reset: unenrollReset,
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
		counters.enrollResetCount = 0
		counters.verifyResetCount = 0
		counters.enrollMutateCount = 0
	})

	afterEach(() => {
		cleanup()
	})

	// Battle-test 2026-05-12 surfaced React error #185 ("Maximum update depth
	// exceeded") on every visit to /settings?tab=security. The dialog was
	// mounted with `open={false}` and its close-reset effect listed the
	// entire `useMutation()` result object in its dep array. TanStack Query
	// v5's `MutationObserver.reset()` calls `#updateResult()` (new result
	// reference) and `#notify()` (re-render). The new reference flipped the
	// dep equality check, re-firing the effect, which called reset again —
	// an infinite chain. This test pins the fix: with `open={false}`, the
	// close-reset effect must fire AT MOST a small bounded number of times
	// (effectively once after mount; React 19 strict-mode double-invocation
	// is also bounded). A regression would push the counter well into the
	// hundreds before the test runner times out the render.
	it('does not call reset() in an unbounded loop when mounted closed', async () => {
		renderWithClient(
			createElement(TwoFactorSetupDialog, {
				open: false,
				onOpenChange: vi.fn()
			})
		)

		// Flush microtasks + a macrotask so any pending re-renders settle.
		await Promise.resolve()
		await new Promise<void>(resolve => setTimeout(resolve, 25))

		// If the loop returns, these counts climb well past 100 before vitest's
		// default test timeout kicks in. Allow a tiny ceiling for React 19's
		// double-invocation under strict mode and the legitimate initial mount.
		expect(counters.enrollResetCount).toBeLessThanOrEqual(4)
		expect(counters.verifyResetCount).toBeLessThanOrEqual(4)

		// The first effect (start-enrollment) must NOT fire when closed.
		expect(counters.enrollMutateCount).toBe(0)
	})

	it('does not call mutate() when mounted closed', async () => {
		renderWithClient(
			createElement(TwoFactorSetupDialog, {
				open: false,
				onOpenChange: vi.fn()
			})
		)

		await Promise.resolve()
		await new Promise<void>(resolve => setTimeout(resolve, 25))

		expect(counters.enrollMutateCount).toBe(0)
	})
})
