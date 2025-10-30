import { expect, test } from '@playwright/test'

let baseUrl = ''
let adminEmail = ''
let adminPassword = ''

test.describe('Staging Tenant Portal Smoke', () => {
	test.beforeAll(() => {
		baseUrl =
			process.env.STAGING_BASE_URL ||
			process.env.PLAYWRIGHT_BASE_URL ||
			process.env.E2E_BASE_URL ||
			''
		adminEmail =
			process.env.STAGING_ADMIN_EMAIL || process.env.E2E_ADMIN_EMAIL || ''
		adminPassword =
			process.env.STAGING_ADMIN_PASSWORD || process.env.E2E_ADMIN_PASSWORD || ''

		const missing: string[] = []
		if (!baseUrl) {
			missing.push('STAGING_BASE_URL | PLAYWRIGHT_BASE_URL | E2E_BASE_URL')
		}
		if (!adminEmail) {
			missing.push('STAGING_ADMIN_EMAIL | E2E_ADMIN_EMAIL')
		}
		if (!adminPassword) {
			missing.push('STAGING_ADMIN_PASSWORD | E2E_ADMIN_PASSWORD')
		}

		const forceRun = process.env.E2E_FORCE_RUN === 'true'
		if (missing.length > 0 && !forceRun) {
			test.skip(true, `Missing staging env vars: ${missing.join(', ')}`)
		}
	})

	test('admin login renders dashboard stats', async ({ page }) => {
		const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

		await test.step('open staging login page', async () => {
			await page.goto(`${normalizedBaseUrl}/login`, {
				waitUntil: 'domcontentloaded'
			})
			await expect(page).toHaveTitle(/TenantFlow/i)
		})

		await test.step('submit credentials', async () => {
			await page.getByTestId('email-input').fill(adminEmail)
			await page.getByTestId('password-input').fill(adminPassword)
			await page.getByTestId('login-button').click()
		})

		await test.step('wait for dashboard redirect', async () => {
			await page.waitForURL('**/dashboard', { timeout: 45_000 })
			await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible(
				{
					timeout: 45_000
				}
			)
		})

		await test.step('assert key dashboard widgets render', async () => {
			await expect(
				page.getByRole('heading', { name: /recent activity/i })
			).toBeVisible({ timeout: 10_000 })
			await expect(
				page.getByRole('heading', { name: /quick actions/i })
			).toBeVisible({ timeout: 10_000 })
		})
	})

	test('API health endpoint reports ok', async ({ request }) => {
		const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
		const response = await request.get(`${normalizedBaseUrl}/api/v1/health`, {
			timeout: 20_000
		})

		expect(response.ok()).toBeTruthy()
		const payload = await response.json()
		expect(payload.status).toBe('ok')
		expect(payload).toHaveProperty('services')
	})
})
