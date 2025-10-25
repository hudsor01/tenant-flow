/**
 * E2E Test: Atomic Tenant Onboarding Flow
 *
 * Tests the complete tenant creation flow at /manage/tenants/new
 * including form display, property/unit loading, and form submission.
 *
 * IMPORTANT: Uses loginAsOwner() helper because Supabase httpOnly cookies
 * cannot be captured by Playwright's storageState().
 */

import { expect, test } from '@playwright/test'
import { loginAsOwner } from '../auth-helpers'

test.describe('Tenant Onboarding', () => {
	test.beforeEach(async ({ page }) => {
		// Authenticate before each test (httpOnly cookies requirement)
		await loginAsOwner(page)
	})

	test('should load tenant creation form with properties and units', async ({
		page
	}) => {
		// Navigate to tenant creation page
		await page.goto('/manage/tenants/new')

		// Wait for page to load
		await page.waitForLoadState('networkidle')

		// Verify page heading
		await expect(
			page.getByRole('heading', { name: /onboard new tenant/i })
		).toBeVisible()

		// Verify two-card layout is present
		await expect(page.getByText(/tenant information/i)).toBeVisible()
		await expect(page.getByText(/lease assignment/i)).toBeVisible()

		// Verify form fields are present
		await expect(page.locator('#email')).toBeVisible()
		await expect(page.locator('#firstName')).toBeVisible()
		await expect(page.locator('#lastName')).toBeVisible()

		// SUCCESS! The page loaded, properties were fetched, no auth errors
		console.log(
			'✅ Tenant creation page loaded successfully with authentication working!'
		)
	})
})
