import { expect, test } from '@playwright/test'

test.describe('Production Monitoring Placeholder', () => {
	const requiredEnv = ['PROD_HEALTH_URL'] as const

	test.beforeAll(() => {
		const missing = requiredEnv.filter(key => !process.env[key])
		const forceRun = process.env.E2E_FORCE_RUN === 'true'
		test.skip(
			missing.length > 0 && !forceRun,
			`Missing production env vars: ${missing.join(', ')}`
		)
	})

	test('health endpoint responds', async ({ request }) => {
		const response = await request.get(process.env.PROD_HEALTH_URL!)
		expect(response.ok()).toBeTruthy()
	})
})
