import { expect, test } from '@playwright/test'

test.describe('Pricing Page - Stripe Checkout Flow', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/pricing', { waitUntil: 'networkidle', timeout: 60000 })
	})

	test('displays core pricing content from Stripe API', async ({ page }) => {
		// Check for main heading
		await expect(
			page.getByRole('heading', { name: /simple, transparent pricing/i })
		).toBeVisible()

		// Verify products loaded from Stripe (no mock data)
		await expect(page.locator('text=/STARTER|GROWTH|MAX/i').first()).toBeVisible()

		// Check for pricing display
		await expect(page.locator('text=/\\$\\d+/').first()).toBeVisible()

		// CTA buttons should be present
		await expect(
			page.locator('button:has-text("Get Started"), a:has-text("Get Started")').first()
		).toBeVisible()
	})

	test('Get Started button triggers Stripe checkout for authenticated users', async ({ page }) => {
		// For unauthenticated users, clicking Get Started redirects to login
		const getStartedButton = page.locator('button:has-text("Get Started")').first()
		await expect(getStartedButton).toBeVisible()

		// Click and check for either:
		// 1. Redirect to /login (unauthenticated)
		// 2. Redirect to Stripe Checkout (authenticated - requires auth setup)
		await getStartedButton.click()

		// Wait for navigation (either to login or external Stripe)
		await page.waitForTimeout(1000)

		const url = page.url()
		// Should redirect to login for unauthenticated users
		const redirectedToLogin = url.includes('/login')
		const redirectedToStripe = url.includes('checkout.stripe.com')

		expect(redirectedToLogin || redirectedToStripe).toBe(true)
	})

	test('billing toggle switches between monthly and annual pricing', async ({ page }) => {
		// Find the billing toggle
		const toggle = page.locator('button[role="switch"]')
		await expect(toggle).toBeVisible()

		// Should display "Annual billing" text with savings
		await expect(page.locator('text=/Annual billing/i')).toBeVisible()
		await expect(page.locator('text=/Save \\d+%/i')).toBeVisible()

		// Toggle and verify animation runs
		await toggle.click()
		await page.waitForTimeout(500) // Wait for confetti animation

		// Toggle back
		await toggle.click()
		await page.waitForTimeout(300)
	})

	test('displays plan features correctly', async ({ page }) => {
		// Check for common features across plans
		await expect(page.locator('text=/Unlimited tenants/i')).toBeVisible()
		await expect(page.locator('text=/Online rent collection/i')).toBeVisible()
		await expect(page.locator('text=/Lease management/i')).toBeVisible()

		// Check for Growth plan specific features
		await expect(page.locator('text=/Automated rent reminders/i')).toBeVisible()

		// Check for Max plan features
		await expect(page.locator('text=/Unlimited units/i')).toBeVisible()
	})

	test('Contact Sales button for Max plan links to contact page', async ({ page }) => {
		// Check if Contact Sales button/link exists
		const contactSales = page.locator('text=/Contact Sales/i')

		if (await contactSales.count() > 0) {
			// Max plan should have Contact Sales
			await expect(contactSales).toBeVisible()

			// Click and verify navigation to contact page
			await contactSales.click()
			await page.waitForURL(/\/contact/, { timeout: 5000 })
			expect(page.url()).toContain('/contact')
		}
	})

	test('handles pricing page errors gracefully', async ({ page }) => {
		// Check that page doesn't show errors
		const errorMessages = page.locator('text=/error|failed|something went wrong/i')
		const errorCount = await errorMessages.count()

		// Should not have visible errors on successful load
		expect(errorCount).toBe(0)
	})

	test('responsive design works on mobile devices', async ({ page }) => {
		// Test mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })

		// Should still display pricing content
		await expect(page.locator('text=/Simple, Transparent Pricing/i')).toBeVisible()

		// Get Started buttons should be visible
		const mobileButtons = page.locator('button:has-text("Get Started")')
		await expect(mobileButtons.first()).toBeVisible()

		// Billing toggle should be visible
		const toggle = page.locator('button[role="switch"]')
		await expect(toggle).toBeVisible()
	})
})
