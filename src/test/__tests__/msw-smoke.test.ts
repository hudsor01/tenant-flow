/**
 * Smoke test to verify MSW integration works.
 * Uses opt-in enableMswServer() pattern.
 */
import { describe, it, expect } from 'vitest'
import { enableMswServer, server } from '#test/mocks/msw/server'
import { http, HttpResponse } from 'msw'

enableMswServer()

describe('MSW Integration', () => {
	it('intercepts fetch calls with default handlers', async () => {
		const response = await fetch(
			`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/properties`
		)
		const data = await response.json()
		expect(Array.isArray(data)).toBe(true)
		expect(data[0]).toHaveProperty('id', 'property-1')
	})

	it('allows per-test handler overrides', async () => {
		server.use(
			http.get(
				`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/properties`,
				() => {
					return HttpResponse.json(
						{ message: 'not found' },
						{ status: 404 }
					)
				}
			)
		)

		const response = await fetch(
			`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/properties`
		)
		expect(response.status).toBe(404)
	})

	it('resets overrides between tests (uses default again)', async () => {
		const response = await fetch(
			`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/properties`
		)
		expect(response.status).toBe(200)
		const data = await response.json()
		expect(data[0]).toHaveProperty('name', 'Test Property')
	})

	it('intercepts RPC calls', async () => {
		const response = await fetch(
			`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_dashboard_stats`,
			{ method: 'POST', body: '{}' }
		)
		const data = await response.json()
		expect(data).toHaveProperty('total_properties', 5)
	})

	it('intercepts auth calls', async () => {
		const response = await fetch(
			`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`
		)
		const data = await response.json()
		expect(data).toHaveProperty('id', 'owner-user-123')
		expect(data).toHaveProperty('email', 'owner@example.com')
	})
})
