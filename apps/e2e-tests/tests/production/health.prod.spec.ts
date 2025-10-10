import { expect, test } from '@playwright/test'

test.describe('Production Monitoring Placeholder', () => {
	const requiredEnv = ['PROD_HEALTH_URL'] as const

	test.beforeAll(() => {
		const missing = requiredEnv.filter(key => !process.env[key])
		test.skip(
			missing.length > 0,
			`Missing production env vars: ${missing.join(', ')}`
		)
	})

	test('health endpoint responds', async ({ request }) => {
		const response = await request.get(process.env.PROD_HEALTH_URL!)
		expect(response.ok()).toBeTruthy()
	})
})
