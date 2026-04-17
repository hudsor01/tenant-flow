/**
 * CANCEL-02 coverage test: maps supabase.rpc('get_subscription_status') response
 * → SubscriptionStatusResponse. Colocated in a dedicated file (not
 * use-billing-mutations.test.ts) because this suite requires a different
 * `#lib/supabase/client` mock than the mutation tests — Vitest hoists
 * `vi.mock()` calls, so a per-module mock must live in its own file.
 */
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'

const isoEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()

const rpcMock = vi.hoisted(() =>
	vi.fn().mockResolvedValue({
		data: [
			{
				status: 'active',
				customer: 'cus_from_rpc',
				price_id: 'price_from_rpc',
				current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
				cancel_at_period_end: true
			}
		],
		error: null
	})
)

vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user: { id: 'user-1' } },
				error: null
			})
		},
		from: vi.fn(() => ({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { stripe_customer_id: 'cus_from_rpc' },
				error: null
			})
		})),
		rpc: rpcMock
	})
}))

vi.mock('#lib/supabase/get-cached-user', () => ({
	getCachedUser: vi.fn().mockResolvedValue({ id: 'user-1', email: 'owner@example.com' })
}))

import { useSubscriptionStatus } from './use-billing'

describe('useSubscriptionStatus RPC response mapping (CANCEL-02 coverage)', () => {
	it('maps supabase.rpc("get_subscription_status") response → SubscriptionStatusResponse', async () => {
		// The hoisted rpcMock resolves with the sample row at file top.
		// We override it here to assert the mapping with a known isoEnd value.
		rpcMock.mockResolvedValueOnce({
			data: [
				{
					status: 'active',
					customer: 'cus_from_rpc',
					price_id: 'price_from_rpc',
					current_period_end: isoEnd,
					cancel_at_period_end: true
				}
			],
			error: null
		})

		const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
		const wrapper = ({ children }: { children: ReactNode }) =>
			createElement(QueryClientProvider, { client: qc }, children)

		const { result } = renderHook(() => useSubscriptionStatus(), { wrapper })

		await waitFor(() => {
			expect(result.current.isSuccess || result.current.isError).toBe(true)
		})

		expect(rpcMock).toHaveBeenCalledWith('get_subscription_status', {
			p_customer_id: 'cus_from_rpc'
		})
		expect(result.current.data?.cancelAtPeriodEnd).toBe(true)
		expect(result.current.data?.currentPeriodEnd).toBe(isoEnd)
		expect(result.current.data?.subscriptionStatus).toBe('active')
		expect(result.current.data?.stripeCustomerId).toBe('cus_from_rpc')
	})
})
