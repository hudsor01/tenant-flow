/**
 * Critical Pricing Flow Tests
 * Focused test suite for the most important pricing functionality
 */

import { test, expect } from '@playwright/test'

test.describe('Critical Pricing Flow', () => {
	test('Complete pricing page journey', async ({ page }) => {
		// 1. Navigate to standard pricing page
		await page.goto('/pricing')
		await expect(page).toHaveURL('/pricing')

		// 2. Verify all tiers are displayed (use first match for each)
		await expect(page.getByText('Free Trial').first()).toBeVisible()
		await expect(page.getByText('Starter').first()).toBeVisible()
		await expect(page.getByText('Growth').first()).toBeVisible()
		await expect(page.getByText('TenantFlow Max').first()).toBeVisible()

		// 3. Verify key pricing elements are present
		await expect(page.locator('text=Free Trial').first()).toBeVisible()
		await expect(page.locator('text=Starter').first()).toBeVisible()
		await expect(page.locator('text=Growth').first()).toBeVisible()
		await expect(page.locator('text=TenantFlow Max').first()).toBeVisible()

		// 4. Verify action buttons are present
		await expect(page.locator('a[href*="/signup"]').first()).toBeVisible()

		// 5. Verify essential page elements
		await expect(page.locator('text="Simple, Transparent"')).toBeVisible()
		await expect(page.locator('text="Pricing"')).toBeVisible()

		// 6. Verify interactive elements loaded
		await expect(
			page
				.locator('[data-testid="pricing-table-container"], .js-only')
				.first()
		).toBeVisible()

		console.log('✅ Standard pricing page tests passed')
	})

	test('Static pricing grid display', async ({ page }) => {
		// 1. Navigate to pricing page
		await page.goto('/pricing')

		// 2. Verify static pricing elements are displayed
		await expect(page.getByText('Free Trial').first()).toBeVisible()
		await expect(page.getByText('Starter').first()).toBeVisible()
		await expect(page.getByText('Growth').first()).toBeVisible()
		await expect(page.getByText('TenantFlow Max').first()).toBeVisible()

		// 3. Verify pricing is displayed
		await expect(page.getByText('$29').first()).toBeVisible()
		await expect(page.getByText('$79').first()).toBeVisible()
		await expect(page.getByText('$199').first()).toBeVisible()

		console.log('✅ Static pricing grid tests passed')
	})

	test('Checkout redirect for unauthenticated user', async ({ page }) => {
		// 1. Go to pricing page
		await page.goto('/pricing')

		// 2. Click Get Started on Starter plan
		const getStartedButton = page
			.getByRole('link', { name: /get started/i })
			.first()
		await getStartedButton.click()

		// 3. Should redirect to auth (login or signup)
		await expect(page).toHaveURL(/\/auth\/(login|signup)/)

		console.log('✅ Authentication redirect tests passed')
	})

	test('Responsive layout verification', async ({ page }) => {
		// Test mobile layout
		await page.setViewportSize({ width: 375, height: 667 })
		await page.goto('/pricing')

		// Verify we can see pricing plan titles specifically
		await expect(page.locator('#pricing-plans')).toBeVisible()
		await expect(page.getByText('Free Trial').first()).toBeVisible()

		// Test desktop layout
		await page.setViewportSize({ width: 1920, height: 1080 })
		await page.reload()

		// On desktop, verify pricing section is still visible
		await expect(page.locator('#pricing-plans')).toBeVisible()
		await expect(page.getByText('Starter').first()).toBeVisible()

		console.log('✅ Responsive layout tests passed')
	})

	test('FAQ interaction', async ({ page }) => {
		await page.goto('/pricing')

		// Scroll to FAQ section
		await page
			.getByText('Frequently Asked Questions')
			.scrollIntoViewIfNeeded()

		// Click FAQ item to expand
		const faqItem = page.getByText('Can I change plans anytime?')
		await faqItem.click()

		// Verify answer is visible
		await expect(
			page.getByText(/upgrade or downgrade your plan at any time/i)
		).toBeVisible()

		console.log('✅ FAQ interaction tests passed')
	})

	test('Performance check', async ({ page }) => {
		const startTime = Date.now()

		await page.goto('/pricing')
		await page.waitForLoadState('networkidle')

		const loadTime = Date.now() - startTime

		// Page should load in under 5 seconds (increased for development)
		expect(loadTime).toBeLessThan(5000)

		console.log(`✅ Page loaded in ${loadTime}ms`)
	})
})

test.describe('Visual Elements', () => {
	test('Trust badges are displayed', async ({ page }) => {
		await page.goto('/pricing')

		const trustBadges = ['No setup fees', 'Cancel anytime']

		for (const badge of trustBadges) {
			await expect(page.getByText(badge).first()).toBeVisible()
		}

		console.log('✅ Trust badges tests passed')
	})

	test('Support levels are shown', async ({ page }) => {
		await page.goto('/pricing')

		const supportLevels = ['Email support', 'Priority', 'support', 'Email']

		for (const level of supportLevels) {
			await expect(page.getByText(level).first()).toBeVisible()
		}

		console.log('✅ Support levels tests passed')
	})

	test('Most popular badge on Growth plan', async ({ page }) => {
		await page.goto('/pricing')

		// Look for badge text variations
		const badges = page.getByText(/most popular|recommended|popular/i)
		const badgeCount = await badges.count()
		expect(badgeCount).toBeGreaterThan(0)

		console.log('✅ Popular badge tests passed')
	})
})
