import { test, expect } from '@playwright/test'

test.describe('Pricing Pages Visual Verification', () => {
	// Skip auth setup for these public pages
	test.use({ storageState: { cookies: [], origins: [] } })
	test('pricing page renders with standard Tailwind classes', async ({ page }) => {
		await page.goto('http://localhost:3001/pricing')

		// Wait for page to load
		await page.waitForLoadState('networkidle')

		// Verify navigation is visible
		await expect(page.locator('nav')).toBeVisible()

		// Verify hero title is visible
		await expect(page.getByRole('heading', { name: 'Pricing that scales with you' })).toBeVisible()

		// Verify pricing section loaded
		await expect(page.getByText('Start with a 14-day free trial')).toBeVisible()

		// Verify FAQ section is visible
		await expect(page.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeVisible()

		// Verify CTA section is visible
		await expect(page.getByRole('heading', { name: 'Ready to transform your property management?' })).toBeVisible()

		// Take screenshot for visual comparison
		await page.screenshot({ path: 'test-results/pricing-page.png', fullPage: true })
	})

	test('pricing success page renders correctly', async ({ page }) => {
		// Mock session ID in URL
		await page.goto('http://localhost:3001/pricing/success?session_id=test_session_123')

		// Wait for page to load
		await page.waitForLoadState('networkidle')

		// Verify main heading
		await expect(page.getByRole('heading', { name: 'Payment Successful!' })).toBeVisible()

		// Verify card is visible
		await expect(page.locator('.shadow-2xl')).toBeVisible()

		// Take screenshot for visual comparison
		await page.screenshot({ path: 'test-results/pricing-success.png', fullPage: true })
	})

	test('pricing page has correct responsive behavior', async ({ page }) => {
		// Test desktop view
		await page.setViewportSize({ width: 1920, height: 1080 })
		await page.goto('http://localhost:3001/pricing')
		await page.waitForLoadState('networkidle')

		// Desktop nav links should be visible
		await expect(page.getByText('Features')).toBeVisible()

		// Test mobile view
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('http://localhost:3001/pricing')
		await page.waitForLoadState('networkidle')

		// Mobile nav links should be hidden
		await expect(page.getByText('Features')).toBeHidden()

		// Sign In button should be hidden on mobile
		const signInButton = page.getByRole('link', { name: 'Sign In' })
		await expect(signInButton).toBeHidden()
	})

	test('FAQ accordion functionality works', async ({ page }) => {
		await page.goto('http://localhost:3001/pricing')
		await page.waitForLoadState('networkidle')

		// Find first FAQ question
		const firstQuestion = page.getByText('How does the 14-day free trial work?')
		await expect(firstQuestion).toBeVisible()

		// FAQ answer should be hidden initially
		const firstAnswer = page.getByText('Start using TenantFlow immediately with full access')
		await expect(firstAnswer).toBeHidden()

		// Click to expand
		await firstQuestion.click()

		// Answer should now be visible
		await expect(firstAnswer).toBeVisible()

		// Click again to collapse
		await firstQuestion.click()

		// Answer should be hidden again
		await expect(firstAnswer).toBeHidden()
	})
})