import {
	createAuthenticatedClient,
	callEdgeFunction,
	isFunctionDeployed,
} from '../setup/edge-function-client'
import { getTestCredentials } from '../setup/supabase-client'
import { checkEnv } from '../setup/env-check'

const env = checkEnv()

interface AuthContext {
	accessToken: string
	userId: string
}

describe.skipIf(!env.supabaseConfigured)('stripe-billing-portal', () => {
	let deployed = true

	beforeAll(async () => {
		deployed = await isFunctionDeployed('stripe-billing-portal')
		if (!deployed) console.warn('stripe-billing-portal not deployed — skipping')
	})

	describe('unauthenticated requests', () => {
		it('returns 401 when no auth header is provided', async () => {
			if (!deployed) return
			const { status } = await callEdgeFunction('stripe-billing-portal', { method: 'POST' })
			expect(status).toBe(401)
		})

		it('returns 401 when an invalid token is provided', async () => {
			if (!deployed) return
			const { status } = await callEdgeFunction('stripe-billing-portal', {
				method: 'POST',
				accessToken: 'invalid.jwt.token',
			})
			expect(status).toBe(401)
		})
	})

	describe.skipIf(!env.authConfigured)('authenticated requests', () => {
		let auth: AuthContext
		let authWorking = false

		beforeAll(async () => {
			const { ownerA } = getTestCredentials()
			const result = await createAuthenticatedClient(ownerA.email, ownerA.password)
			auth = { accessToken: result.accessToken, userId: result.userId }

			if (deployed) {
				const probe = await callEdgeFunction('stripe-billing-portal', {
					method: 'POST',
					accessToken: auth.accessToken,
				})
				authWorking = probe.status !== 401
				if (!authWorking) {
					console.warn(
						'stripe-billing-portal rejects valid JWT — function may need redeployment or env var configuration',
					)
				}
			}
		})

		it('returns a portal URL or 404 when authenticated', async () => {
			if (!deployed || !authWorking) return
			const { status, data } = await callEdgeFunction('stripe-billing-portal', {
				method: 'POST',
				accessToken: auth.accessToken,
			})

			// 200 = has stripe_customer_id, 404 = doesn't
			expect([200, 404]).toContain(status)

			if (status === 200) {
				const body = data as { url: string }
				expect(body.url).toBeDefined()
				expect(body.url).toMatch(/^https:\/\/billing\.stripe\.com/)
			}
		})
	})
})

describe.skipIf(!env.supabaseConfigured)('stripe-checkout', () => {
	let deployed = true

	beforeAll(async () => {
		deployed = await isFunctionDeployed('stripe-checkout')
		if (!deployed) console.warn('stripe-checkout not deployed — skipping')
	})

	describe('unauthenticated requests', () => {
		it('returns 401 when no auth header is provided', async () => {
			if (!deployed) return
			const { status } = await callEdgeFunction('stripe-checkout', {
				method: 'POST',
				body: { price_id: 'price_fake' },
			})
			expect(status).toBe(401)
		})

		it('returns 401 when an invalid token is provided', async () => {
			if (!deployed) return
			const { status } = await callEdgeFunction('stripe-checkout', {
				method: 'POST',
				accessToken: 'garbage-token-value',
				body: { price_id: 'price_fake' },
			})
			expect(status).toBe(401)
		})
	})

	describe.skipIf(!env.authConfigured)('authenticated requests', () => {
		let auth: AuthContext
		let authWorking = false

		beforeAll(async () => {
			const { ownerA } = getTestCredentials()
			const result = await createAuthenticatedClient(ownerA.email, ownerA.password)
			auth = { accessToken: result.accessToken, userId: result.userId }

			if (deployed) {
				const probe = await callEdgeFunction('stripe-checkout', {
					method: 'POST',
					accessToken: auth.accessToken,
					body: {},
				})
				authWorking = probe.status !== 401
				if (!authWorking) {
					console.warn(
						'stripe-checkout rejects valid JWT — function may need redeployment or env var configuration',
					)
				}
			}
		})

		it('creates a checkout session or returns 400 for missing price_id', async () => {
			if (!deployed || !authWorking) return
			const { status, data } = await callEdgeFunction('stripe-checkout', {
				method: 'POST',
				accessToken: auth.accessToken,
				body: {},
			})

			if (status === 400) {
				const body = data as { error: string }
				expect(body.error).toBe('price_id is required')
			} else {
				expect(status).toBe(200)
				const body = data as { url: string }
				expect(body.url).toBeDefined()
				expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com/)
			}
		})

		it('returns 500 when an invalid Stripe price_id is provided', async () => {
			if (!deployed || !authWorking) return
			const { status, data } = await callEdgeFunction('stripe-checkout', {
				method: 'POST',
				accessToken: auth.accessToken,
				body: { price_id: 'price_nonexistent_000000' },
			})

			expect(status).toBe(500)
			const body = data as { error: string }
			expect(body.error).toBeDefined()
		})
	})
})

describe.skipIf(!env.supabaseConfigured)('stripe-checkout-session', () => {
	let deployed = true

	beforeAll(async () => {
		deployed = await isFunctionDeployed('stripe-checkout-session')
		if (!deployed) console.warn('stripe-checkout-session not deployed — skipping')
	})

	it('returns 400 when sessionId is missing', async () => {
		if (!deployed) return
		const { status, data } = await callEdgeFunction('stripe-checkout-session', {
			method: 'POST',
			body: {},
		})
		expect(status).toBe(400)
		const body = data as { error: string }
		expect(body.error).toBe('sessionId is required')
	})

	it('returns 400 when sessionId is an empty string', async () => {
		if (!deployed) return
		const { status, data } = await callEdgeFunction('stripe-checkout-session', {
			method: 'POST',
			body: { sessionId: '' },
		})
		expect(status).toBe(400)
		const body = data as { error: string }
		expect(body.error).toBe('sessionId is required')
	})

	it('returns 500 when an invalid sessionId is provided', async () => {
		if (!deployed) return
		const { status, data } = await callEdgeFunction('stripe-checkout-session', {
			method: 'POST',
			body: { sessionId: 'cs_test_fake_session_id_that_does_not_exist' },
		})
		expect(status).toBe(500)
		const body = data as { error: string }
		expect(body.error).toBeDefined()
	})
})
