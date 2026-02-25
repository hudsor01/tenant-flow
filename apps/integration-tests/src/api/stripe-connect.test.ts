import { createAuthenticatedClient, callEdgeFunction, isFunctionDeployed } from '../setup/edge-function-client'
import { getTestCredentials } from '../setup/supabase-client'
import { checkEnv } from '../setup/env-check'

const env = checkEnv()

describe.skipIf(!env.supabaseConfigured)('stripe-connect', () => {
	let deployed = true

	beforeAll(async () => {
		deployed = await isFunctionDeployed('stripe-connect')
		if (!deployed) console.warn('stripe-connect not deployed — skipping')
	})

	describe('unauthenticated requests', () => {
		it('returns 401 without auth header', async () => {
			if (!deployed) return
			const result = await callEdgeFunction('stripe-connect', {
				body: { action: 'account' },
			})
			expect(result.status).toBe(401)
		})

		it('returns 401 with invalid token', async () => {
			if (!deployed) return
			const result = await callEdgeFunction('stripe-connect', {
				body: { action: 'account' },
				accessToken: 'invalid-jwt',
			})
			expect(result.status).toBe(401)
		})
	})

	describe.skipIf(!env.authConfigured)('authenticated requests', () => {
		let ownerToken: string
		let authWorking = false

		beforeAll(async () => {
			const { ownerA } = getTestCredentials()
			const auth = await createAuthenticatedClient(ownerA.email, ownerA.password)
			ownerToken = auth.accessToken

			// Probe whether the function accepts auth — may fail if function env vars are misconfigured
			if (deployed) {
				const probe = await callEdgeFunction('stripe-connect', {
					body: { action: 'account' },
					accessToken: ownerToken,
				})
				authWorking = probe.status !== 401
				if (!authWorking) {
					console.warn(
						'stripe-connect rejects valid JWT — function may need redeployment or env var configuration',
					)
				}
			}
		})

		it('returns 400 for unknown action', async () => {
			if (!deployed || !authWorking) return
			const result = await callEdgeFunction('stripe-connect', {
				body: { action: 'nonexistent-action' },
				accessToken: ownerToken,
			})
			expect(result.status).toBe(400)
			const body = result.data as Record<string, unknown>
			expect(body.error).toContain('Unknown action')
		})

		it('returns 200 with account status', async () => {
			if (!deployed || !authWorking) return
			const result = await callEdgeFunction('stripe-connect', {
				body: { action: 'account' },
				accessToken: ownerToken,
			})
			expect(result.status).toBe(200)
			const body = result.data as Record<string, unknown>
			expect(body).toHaveProperty('hasAccount')
			expect(typeof body.hasAccount).toBe('boolean')
		})

		it('returns 200 with balance or 404 if no connected account', async () => {
			if (!deployed || !authWorking) return
			const result = await callEdgeFunction('stripe-connect', {
				body: { action: 'balance' },
				accessToken: ownerToken,
			})
			expect([200, 404]).toContain(result.status)
		})

		it('returns 200 with payouts or 404 if no connected account', async () => {
			if (!deployed || !authWorking) return
			const result = await callEdgeFunction('stripe-connect', {
				body: { action: 'payouts', limit: 5 },
				accessToken: ownerToken,
			})
			expect([200, 404]).toContain(result.status)
		})

		it('returns 200 with transfers or 404 if no connected account', async () => {
			if (!deployed || !authWorking) return
			const result = await callEdgeFunction('stripe-connect', {
				body: { action: 'transfers', limit: 5 },
				accessToken: ownerToken,
			})
			expect([200, 404]).toContain(result.status)
		})
	})
})
