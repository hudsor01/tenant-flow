import { expect, test } from '@playwright/test'

/**
 * PUBLIC PAGE NOTIFICATION TESTS
 * These tests verify notification functionality on public pages
 * Most notification features require authentication, so we test what we can publicly
 */
test.describe('Notification System - Public Tests', () => {
	test.beforeEach(async ({ page }) => {
		// Go to the public homepage
		// Use 'load' to avoid waiting for long-running analytics/resources
		await page.goto('/', { waitUntil: 'load', timeout: 60000 })
	})

	test('should not show notification bell on public pages', async ({ page }) => {
		// Notification bell should NOT be visible on public pages
		// It only appears in authenticated context
		const notificationBell = page.locator('svg.lucide-bell')

		await expect(notificationBell).toHaveCount(0)
	})

	test('should expose a sign-in link in the navigation', async ({ page }) => {
		const signInLink = page.locator('a[href="/login"]').first()
		await expect(signInLink).toHaveText(/sign in/i)
	})

	test('should show getting started CTA', async ({ page }) => {
		const getStartedButton = page.locator('a[href="/signup"]').first()
		await expect(getStartedButton).toHaveText(/get started|start free trial/i)
	})
})
