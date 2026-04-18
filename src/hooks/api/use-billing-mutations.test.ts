import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		auth: {
			getSession: vi.fn().mockResolvedValue({
				data: { session: { access_token: 'test-token' } }
			})
		}
	})
}))

vi.mock('#lib/supabase/get-cached-user', () => ({
	getCachedUser: vi
		.fn()
		.mockResolvedValue({ id: 'user-1', email: 'owner@example.com' })
}))

import {
	useCancelSubscriptionMutation,
	useReactivateSubscriptionMutation
} from './use-billing-mutations'

function renderWithClient<TProps, TReturn>(
	hook: (props: TProps) => TReturn
): { result: { current: TReturn }; queryClient: QueryClient } {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
	})
	const wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children)
	const { result } = renderHook(hook, { wrapper })
	return { result, queryClient }
}

describe('useCancelSubscriptionMutation', () => {
	const originalFetch = globalThis.fetch

	beforeEach(() => {
		vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://test-supabase')
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		vi.unstubAllEnvs()
	})

	it('POSTs { action: "cancel" } to stripe-cancel-subscription with Bearer token', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 'sub_123',
				status: 'active',
				cancel_at_period_end: true,
				current_period_end: 1_800_000_000
			})
		})
		globalThis.fetch = fetchMock as unknown as typeof fetch

		const { result } = renderWithClient(() => useCancelSubscriptionMutation())
		await result.current.mutateAsync()

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(url).toBe('http://test-supabase/functions/v1/stripe-cancel-subscription')
		expect(init.method).toBe('POST')
		expect((init.headers as Record<string, string>).Authorization).toBe(
			'Bearer test-token'
		)
		expect(JSON.parse(init.body as string)).toEqual({ action: 'cancel' })
	})

	it('invalidates subscription-status and owner-dashboard keys on success', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 'sub_1',
				status: 'active',
				cancel_at_period_end: true,
				current_period_end: 1
			})
		}) as unknown as typeof fetch

		const { result, queryClient } = renderWithClient(() =>
			useCancelSubscriptionMutation()
		)
		const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

		await result.current.mutateAsync()

		await waitFor(() => {
			const invalidatedKeys = invalidateSpy.mock.calls.map(
				(call) => (call[0] as { queryKey: unknown }).queryKey
			)
			expect(invalidatedKeys).toContainEqual(['billing', 'subscription-status'])
			expect(invalidatedKeys).toContainEqual(['owner-dashboard'])
		})
	})

	it('throws a generic error when the Edge Function returns 4xx/5xx', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
			json: async () => ({ error: 'An error occurred' })
		}) as unknown as typeof fetch

		const { result } = renderWithClient(() => useCancelSubscriptionMutation())
		await expect(result.current.mutateAsync()).rejects.toMatchObject({
			message: expect.stringContaining('An error occurred')
		})
	})
})

describe('useReactivateSubscriptionMutation', () => {
	const originalFetch = globalThis.fetch

	beforeEach(() => {
		vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://test-supabase')
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		vi.unstubAllEnvs()
	})

	it('POSTs { action: "reactivate" }', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 'sub_1',
				status: 'active',
				cancel_at_period_end: false,
				current_period_end: 1
			})
		})
		globalThis.fetch = fetchMock as unknown as typeof fetch

		const { result } = renderWithClient(() => useReactivateSubscriptionMutation())
		await result.current.mutateAsync()

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(JSON.parse(init.body as string)).toEqual({ action: 'reactivate' })
	})
})

describe('useCancelSubscriptionMutation setQueryData (T-42-06 mitigation)', () => {
	beforeEach(() => {
		vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://test-supabase')
	})
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('writes Stripe response into subscription-status cache BEFORE invalidation', async () => {
		const futureUnix = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 'sub_abc',
				status: 'active',
				cancel_at_period_end: true,
				current_period_end: futureUnix
			})
		}) as unknown as typeof fetch

		const { result, queryClient } = renderWithClient(() => useCancelSubscriptionMutation())

		// Seed the cache so we can verify the merge path keeps prior fields
		queryClient.setQueryData(['billing', 'subscription-status'], {
			subscriptionStatus: 'active',
			stripeCustomerId: 'cus_seeded',
			stripePriceId: 'price_seeded',
			currentPeriodEnd: null,
			cancelAtPeriodEnd: false
		})

		await result.current.mutateAsync()

		const cached = queryClient.getQueryData<{
			subscriptionStatus: string
			stripeCustomerId: string | null
			currentPeriodEnd: string | null
			cancelAtPeriodEnd: boolean
		}>(['billing', 'subscription-status'])

		expect(cached?.cancelAtPeriodEnd).toBe(true)
		expect(cached?.subscriptionStatus).toBe('active')
		expect(cached?.stripeCustomerId).toBe('cus_seeded') // preserved via spread
		// currentPeriodEnd should be a future ISO string derived from the Unix timestamp
		expect(typeof cached?.currentPeriodEnd).toBe('string')
		expect(new Date(cached!.currentPeriodEnd as string).getTime()).toBeGreaterThan(Date.now())
	})
})

