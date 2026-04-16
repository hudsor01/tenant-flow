import { expect, test } from '@playwright/test'

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD
const ownerEmail = process.env.E2E_OWNER_EMAIL
const ownerPassword = process.env.E2E_OWNER_PASSWORD

test.describe('admin analytics page', () => {
	test.skip(
		!adminEmail || !adminPassword,
		'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set'
	)

	test('admin sees deliverability and funnel sections', async ({ page }) => {
		await page.goto('/login')
		await page.getByLabel('Email').fill(adminEmail!)
		await page.getByLabel('Password').fill(adminPassword!)
		await page.getByRole('button', { name: /sign in/i }).click()
		await page.waitForURL(/\/dashboard|\/admin/)

		await page.goto('/admin/analytics')

		await expect(
			page.getByRole('heading', { name: /platform analytics/i })
		).toBeVisible()
		await expect(
			page.getByRole('heading', { name: /email deliverability/i })
		).toBeVisible()
		await expect(
			page.getByRole('heading', { name: /onboarding funnel/i })
		).toBeVisible()
	})
})

test.describe('admin analytics page - non-admin redirect', () => {
	test.skip(
		!ownerEmail || !ownerPassword,
		'E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD not set'
	)

	test('owner is redirected to /dashboard', async ({ page }) => {
		await page.goto('/login')
		await page.getByLabel('Email').fill(ownerEmail!)
		await page.getByLabel('Password').fill(ownerPassword!)
		await page.getByRole('button', { name: /sign in/i }).click()
		await page.waitForURL(/\/dashboard/)

		await page.goto('/admin/analytics')
		await page.waitForURL(/\/dashboard/)
		expect(page.url()).toMatch(/\/dashboard/)
	})
})
