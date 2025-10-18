import { expect, test } from '@playwright/test'

test.describe('Pricing Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/pricing', { waitUntil: 'load', timeout: 60000 })
	})

	test('displays core pricing content', async ({ page }) => {
		await expect(
			page.getByRole('heading', { name: /pricing that scales with you/i })
		).toBeVisible()

		await expect(
			page.getByRole('heading', { name: /simple, transparent pricing/i })
		).toBeVisible()

		// CTA buttons should be present
		await expect(
			page.getByRole('link', { name: /start free trial/i }).first()
		).toBeVisible()
		await expect(
			page.getByRole('link', { name: /talk to sales/i }).first()
		).toBeVisible()
	})

test('primary CTA points to signup', async ({ page }) => {
	const ctaLink = page.getByRole('link', { name: /start free trial/i }).first()
	await expect(ctaLink).toBeVisible()
	await expect(ctaLink).toHaveAttribute('href', '/signup')
})
})
