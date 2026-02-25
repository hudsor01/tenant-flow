import { checkEnv } from '../setup/env-check'
import { createAuthenticatedClient, isFunctionDeployed } from '../setup/edge-function-client'

const env = checkEnv()

describe('smoke: environment', () => {
	it('has Supabase env vars configured', () => {
		if (!env.supabaseConfigured) {
			console.warn('Missing: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
		}
		expect(env.supabaseConfigured).toBe(true)
	})

	it('has auth test credentials configured', () => {
		if (!env.authConfigured) {
			console.warn('Missing auth env vars:', env.missing.filter((m) => m.startsWith('E2E_')))
		}
		expect(env.authConfigured).toBe(true)
	})

	it('reports Stripe/service-role env status', () => {
		if (!env.stripeConfigured) {
			console.warn(
				'Missing Stripe env vars:',
				env.missing.filter(
					(m) => m === 'STRIPE_SECRET_KEY' || m === 'SUPABASE_SECRET_KEY',
				),
			)
			console.warn('Webhook and service-role tests will be skipped')
		}
		// Informational only — actual tests skip gracefully via describe.skipIf
	})
})

describe.skipIf(!env.supabaseConfigured)('smoke: function deployment', () => {
	const functions = [
		'stripe-billing-portal',
		'stripe-checkout',
		'stripe-checkout-session',
		'stripe-connect',
		'stripe-webhooks',
		'export-report',
		'tenant-invitation-validate',
		'tenant-invitation-accept',
		'docuseal',
		'docuseal-webhook',
		'generate-pdf',
	]

	it.each(functions)('%s deployment status', async (fn) => {
		const deployed = await isFunctionDeployed(fn)
		if (!deployed) {
			console.warn(`${fn} is NOT deployed — tests for this function will be skipped`)
		}
		// Informational only — actual tests check isFunctionDeployed in beforeAll
	})
})

describe.skipIf(!env.supabaseConfigured || !env.authConfigured)('smoke: authentication', () => {
	it('can authenticate with test owner credentials', async () => {
		const email = process.env['E2E_OWNER_EMAIL'] ?? ''
		const password = process.env['E2E_OWNER_PASSWORD'] ?? ''
		const { accessToken, userId } = await createAuthenticatedClient(email, password)
		expect(accessToken).toBeTruthy()
		expect(userId).toBeTruthy()
	})
})
