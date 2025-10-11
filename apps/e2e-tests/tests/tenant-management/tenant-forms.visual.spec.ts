/**
 * Visual Regression Tests for Tenant Forms
 * Uses Playwright's screenshot comparison for UI consistency
 */

import { expect, test } from '@playwright/test'

test.describe('Tenant Forms Visual Regression', () => {
	test.beforeEach(async ({ page }) => {
		// Set consistent viewport for screenshots
		await page.setViewportSize({ width: 1280, height: 720 })
	})

	test('tenant creation form - initial state', async ({ page }) => {
		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		// Wait for form to be visible
		await expect(
			page.getByRole('heading', { name: /create tenant/i })
		).toBeVisible()

		// Take screenshot of initial form state
		await expect(page).toHaveScreenshot('tenant-create-form-initial.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('tenant creation form - validation errors', async ({ page }) => {
		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		// Try to submit empty form to trigger validation errors
		const submitButton = page.getByRole('button', { name: /create tenant/i })
		await submitButton.click()

		// Wait for validation errors to appear
		await page
			.waitForSelector('text=/required/i', { timeout: 3000 })
			.catch(() => {
				// Validation might be inline
			})

		// Take screenshot of validation state
		await expect(page).toHaveScreenshot('tenant-create-form-validation.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('tenant creation form - filled state', async ({ page }) => {
		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		// Fill out form fields
		await page.fill('input[name="firstName"]', 'John')
		await page.fill('input[name="lastName"]', 'Doe')
		await page.fill('input[name="email"]', 'john.doe@example.com')
		await page.fill('input[name="phone"]', '(555) 123-4567')
		await page.fill(
			'input[name="emergencyContact"]',
			'Jane Doe - (555) 987-6543'
		)

		// Take screenshot of filled form
		await expect(page).toHaveScreenshot('tenant-create-form-filled.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('tenant edit form - initial state', async ({ page }) => {
		await page.goto('/manage/tenants')
		await page.waitForLoadState('networkidle')

		// Click first tenant to view details
		const firstTenant = page.locator('table tr').nth(1)
		await firstTenant.click()

		// Navigate to edit page
		await page.getByRole('link', { name: /edit/i }).click()
		await page.waitForLoadState('networkidle')

		// Take screenshot of edit form with pre-filled data
		await expect(page).toHaveScreenshot('tenant-edit-form-initial.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('tenant form - mobile viewport', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })

		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		// Take screenshot of mobile form layout
		await expect(page).toHaveScreenshot('tenant-create-form-mobile.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('tenant form - tablet viewport', async ({ page }) => {
		// Set tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 })

		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		// Take screenshot of tablet form layout
		await expect(page).toHaveScreenshot('tenant-create-form-tablet.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('tenant form - focus states', async ({ page }) => {
		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		// Focus on first input field
		await page.focus('input[name="firstName"]')

		// Take screenshot showing focus state
		await expect(page).toHaveScreenshot('tenant-form-focus-state.png', {
			animations: 'disabled'
		})
	})

	test('tenant form - dark mode', async ({ page }) => {
		// Enable dark mode by setting theme preference
		await page.goto('/manage/tenants/new')

		// Toggle dark mode (adjust selector based on your theme toggle)
		const themeToggle = page
			.locator('[aria-label*="theme"]')
			.or(page.locator('button:has-text("Theme")'))
			.first()
		if ((await themeToggle.count()) > 0) {
			await themeToggle.click()
			// Select dark mode if dropdown
			const darkOption = page.getByRole('menuitem', { name: /dark/i })
			if ((await darkOption.count()) > 0) {
				await darkOption.click()
			}
		}

		await page.waitForLoadState('networkidle')

		// Take screenshot in dark mode
		await expect(page).toHaveScreenshot('tenant-create-form-dark.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('tenant list view - initial state', async ({ page }) => {
		await page.goto('/manage/tenants')
		await page.waitForLoadState('networkidle')

		// Wait for table to load
		await expect(page.getByRole('table')).toBeVisible()

		// Take screenshot of list view
		await expect(page).toHaveScreenshot('tenant-list-view.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('tenant details view - initial state', async ({ page }) => {
		await page.goto('/manage/tenants')
		await page.waitForLoadState('networkidle')

		// Click first tenant
		const firstTenant = page.locator('table tr').nth(1)
		await firstTenant.click()
		await page.waitForLoadState('networkidle')

		// Take screenshot of details view
		await expect(page).toHaveScreenshot('tenant-details-view.png', {
			fullPage: true,
			animations: 'disabled'
		})
	})

	test('tenant form - hover states', async ({ page }) => {
		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		// Hover over submit button
		const submitButton = page.getByRole('button', { name: /create tenant/i })
		await submitButton.hover()

		// Take screenshot showing hover state
		await expect(page).toHaveScreenshot('tenant-form-button-hover.png', {
			animations: 'disabled'
		})
	})

	test('tenant form - loading state', async ({ page }) => {
		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		// Fill form with valid data
		await page.fill('input[name="firstName"]', 'Test')
		await page.fill('input[name="lastName"]', 'User')
		await page.fill('input[name="email"]', 'test@example.com')

		// Intercept form submission to delay and capture loading state
		await page.route('**/api/v1/tenants', async route => {
			await page.waitForTimeout(2000)
			await route.continue()
		})

		// Submit form
		const submitButton = page.getByRole('button', { name: /create tenant/i })
		await submitButton.click()

		// Wait briefly for loading state
		await page.waitForTimeout(500)

		// Take screenshot of loading state
		await expect(page).toHaveScreenshot('tenant-form-loading.png', {
			animations: 'disabled'
		})
	})

	test('tenant delete confirmation dialog', async ({ page }) => {
		await page.goto('/manage/tenants')
		await page.waitForLoadState('networkidle')

		// Click first tenant
		const firstTenant = page.locator('table tr').nth(1)
		await firstTenant.click()
		await page.waitForLoadState('networkidle')

		// Click delete button
		const deleteButton = page.getByRole('button', { name: /delete/i }).first()
		await deleteButton.click()

		// Wait for dialog
		await expect(
			page.getByText(/Are you sure you want to delete/i)
		).toBeVisible()

		// Take screenshot of confirmation dialog
		await expect(page).toHaveScreenshot('tenant-delete-confirmation.png', {
			animations: 'disabled'
		})
	})

	test('tenant form - multi-step progress', async ({ page }) => {
		// This test assumes a multi-step form exists
		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		// Check if multi-step indicator exists
		const stepIndicator = page
			.locator('[role="progressbar"]')
			.or(page.locator('.step-indicator'))
			.first()

		if ((await stepIndicator.count()) > 0) {
			// Take screenshot of step 1
			await expect(page).toHaveScreenshot('tenant-form-step-1.png', {
				fullPage: true,
				animations: 'disabled'
			})

			// Click next if available
			const nextButton = page.getByRole('button', { name: /next/i })
			if ((await nextButton.count()) > 0) {
				await nextButton.click()
				await page.waitForTimeout(300)

				// Take screenshot of step 2
				await expect(page).toHaveScreenshot('tenant-form-step-2.png', {
					fullPage: true,
					animations: 'disabled'
				})
			}
		}
	})

	test('tenant form - accessibility focus indicators', async ({ page }) => {
		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		// Tab through form fields
		await page.keyboard.press('Tab')
		await page.waitForTimeout(100)

		// Take screenshot showing keyboard focus
		await expect(page).toHaveScreenshot('tenant-form-keyboard-focus.png', {
			animations: 'disabled'
		})
	})
})

test.describe('Tenant Form Responsive Breakpoints', () => {
	const breakpoints = [
		{ name: 'mobile-sm', width: 320, height: 568 },
		{ name: 'mobile-md', width: 375, height: 667 },
		{ name: 'mobile-lg', width: 414, height: 896 },
		{ name: 'tablet', width: 768, height: 1024 },
		{ name: 'desktop-sm', width: 1024, height: 768 },
		{ name: 'desktop-md', width: 1280, height: 720 },
		{ name: 'desktop-lg', width: 1920, height: 1080 }
	]

	for (const breakpoint of breakpoints) {
		test(`tenant form at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, async ({
			page
		}) => {
			await page.setViewportSize({
				width: breakpoint.width,
				height: breakpoint.height
			})
			await page.goto('/manage/tenants/new')
			await page.waitForLoadState('networkidle')

			await expect(page).toHaveScreenshot(
				`tenant-form-${breakpoint.name}.png`,
				{
					fullPage: true,
					animations: 'disabled'
				}
			)
		})
	}
})
