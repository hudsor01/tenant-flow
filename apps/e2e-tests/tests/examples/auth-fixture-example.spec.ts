/**
 * Example test using the worker-scoped auth fixture
 *
 * This demonstrates the recommended pattern for authenticated tests
 * using the optimized API-based authentication.
 *
 * DELETE THIS FILE after verifying the auth optimization works.
 */

import { test, expect } from '../fixtures/auth.fixture'

test.describe('Auth Fixture Example', () => {
	test('should navigate to authenticated route', async ({ authenticatedPage }) => {
		// Page is already authenticated via worker-scoped fixture
		await authenticatedPage.goto('/')

		// Verify we're on the authenticated route
		await expect(authenticatedPage).toHaveURL(/^\/$/)
	})

	test('should maintain auth across multiple tests', async ({ authenticatedPage }) => {
		// Each test in the worker gets a fresh page with auth loaded
		await authenticatedPage.goto('/properties')

		// Auth state persists across test runs in the same worker
		await expect(authenticatedPage).toHaveURL(/^\/properties/)
	})

	test('should have access to user context', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/')

		// Wait for auth to initialize
		await authenticatedPage.waitForLoadState('networkidle')

		// Verify authenticated user data is available
		const userMenuButton = authenticatedPage.locator('[data-testid="user-menu"]')
		await expect(userMenuButton).toBeVisible()
	})
})

/**
 * Example: Converting an existing test to use the fixture
 *
 * BEFORE (standard Playwright test with storageState):
 * ```typescript
 * import { test, expect } from '@playwright/test'
 *
 * test.use({ storageState: 'playwright/.auth/owner.json' })
 *
 * test('my test', async ({ page }) => {
 *   await page.goto('/')
 * })
 * ```
 *
 * AFTER (using auth fixture):
 * ```typescript
 * import { test, expect } from '../fixtures/auth.fixture'
 *
 * test('my test', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/')
 * })
 * ```
 */
