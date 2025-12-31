import { expect, test } from '@playwright/test'

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600'

const legacyPaths = [
	'/api/v1/manage/stats',
	'/api/v1/manage/activity',
	'/api/v1/manage/billing/insights',
	'/api/v1/manage/uptime'
]

test.describe('Legacy /manage routes are removed', () => {
	let serverReachable = false

	test.beforeAll(async ({ request }) => {
		try {
			const res = await request.get(`${API_URL}/api/v1/health`, {
				timeout: 2000
			})
			serverReachable = res.ok()
			if (!serverReachable) {
				test.skip(
					true,
					'Backend API not reachable; skipping legacy route checks'
				)
			}
		} catch (error) {
			test.skip(true, 'Backend API not reachable; skipping legacy route checks')
		}
	})

	legacyPaths.forEach(path => {
		test(`GET ${path} returns 410 Gone`, async ({ request }) => {
			if (!serverReachable) test.skip()
			const response = await request.get(`${API_URL}${path}`)

			expect(response.status()).toBe(410)

			const body = await response.json().catch(() => null)
			expect(body?.message).toContain(
				'Legacy /manage routes have been removed. Use /owner/... endpoints.'
			)
			expect(body?.error).toBe('Gone')
		})
	})

	test('trailing slash variants also return 410', async ({ request }) => {
		if (!serverReachable) test.skip()
		const response = await request.get(`${API_URL}/api/v1/manage/stats/`)
		expect(response.status()).toBe(410)
		const body = await response.json().catch(() => null)
		expect(body?.message).toContain('Legacy /manage routes have been removed')
	})
})
