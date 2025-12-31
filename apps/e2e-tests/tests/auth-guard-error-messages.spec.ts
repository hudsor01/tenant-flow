import { test, expect } from '@playwright/test'
import { loginAsOwner } from '../auth-helpers'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Playwright Best Practices Applied:
 * 1. Use role-based locators (getByRole) instead of CSS selectors
 * 2. Rely on auto-waiting instead of explicit networkidle waits
 * 3. Use web-first assertions (await expect().toBeVisible())
 * 4. Avoid flaky waitForLoadState('networkidle') - use element waits instead
 * Reference: https://playwright.dev/docs/best-practices
 */

test.describe('JWT Auth Guard Error Messages', () => {
	test('should successfully authenticate and display manage dashboard', async ({
		page
	}) => {
		// Login as owner (navigates to /dashboard)
		await loginAsOwner(page)

		// Verify we're on the dashboard (use getByRole per Playwright best practices)
		await expect(page.url()).toContain('/dashboard')
		await expect(page.getByRole('main')).toBeVisible()

		// Verify dashboard content is visible (auto-waiting handles timing)
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
			timeout: 10000
		})
	})

	test('should handle bulk import with valid authentication', async ({
		page
	}) => {
		// Login and navigate to properties
		await loginAsOwner(page)
		await page.goto('/properties')

		// Wait for page to be fully hydrated by checking for interactive content
		// The "Properties" heading indicates the page has rendered
		await expect(
			page.getByRole('heading', { name: 'Properties', level: 1 })
		).toBeVisible({ timeout: 15000 })

		// Wait for the bulk import button to be visible AND enabled (indicates hydration complete)
		const bulkImportBtn = page.getByRole('button', { name: /bulk import/i })
		await expect(bulkImportBtn).toBeVisible({ timeout: 10000 })
		await expect(bulkImportBtn).toBeEnabled()
		await bulkImportBtn.click()

		// Wait for modal with explicit timeout (use role-based locator)
		await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })

		// Verify modal content
		await expect(
			page.getByRole('dialog').getByText(/import properties/i)
		).toBeVisible()
		await expect(
			page.getByRole('dialog').getByText(/required columns/i)
		).toBeVisible()
	})

	test('should display improved error message on API failures', async ({
		page,
		context
	}) => {
		// Intercept API requests to simulate backend errors
		await page.route('**/api/v1/properties/**', route => {
			if (route.request().method() === 'POST') {
				// Simulate authentication failure with new error message
				route.abort('failed')
			} else {
				// Allow GET requests to pass through
				route.continue()
			}
		})

		// Login and navigate
		await loginAsOwner(page)
		await page.goto('/properties')

		// Wait for page to be fully hydrated
		await expect(
			page.getByRole('heading', { name: 'Properties', level: 1 })
		).toBeVisible({ timeout: 15000 })

		// Wait for bulk import button to be ready
		const bulkImportBtn = page.getByRole('button', { name: /bulk import/i })
		await expect(bulkImportBtn).toBeVisible({ timeout: 10000 })
		await expect(bulkImportBtn).toBeEnabled()
		await bulkImportBtn.click()

		// Wait for dialog
		await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })

		// Select a file - use fixture from e2e-tests directory
		const csvPath = path.join(__dirname, '../fixtures/test-bulk-import.csv')
		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles(csvPath)

		// Try to import - should show error
		await page.getByRole('button', { name: /import properties/i }).click()

		// Verify error message appears
		await expect(page.getByText(/failed|error|try again/i)).toBeVisible({
			timeout: 10000
		})
	})

	test('should show clear error for invalid CSV with proper formatting', async ({
		page
	}) => {
		await loginAsOwner(page)
		await page.goto('/properties')

		// Wait for page to be fully hydrated
		await expect(
			page.getByRole('heading', { name: 'Properties', level: 1 })
		).toBeVisible({ timeout: 15000 })

		// Wait for bulk import button to be ready
		const bulkImportBtn = page.getByRole('button', { name: /bulk import/i })
		await expect(bulkImportBtn).toBeVisible({ timeout: 10000 })
		await expect(bulkImportBtn).toBeEnabled()
		await bulkImportBtn.click()

		// Wait for dialog
		await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })

		// Create and upload invalid CSV (missing required columns: city, state, postal_code)
		const invalidCsv = 'name,address\nTest Property,123 Main St'
		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'invalid.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(invalidCsv)
		})

		// Click import
		await page.getByRole('button', { name: /import properties/i }).click()

		// Should show validation error - look for alert/error role or specific error text
		// Avoid matching "Required columns:" by using more specific patterns
		const errorMsg = page
			.getByRole('dialog')
			.getByRole('alert')
			.or(
				page
					.getByRole('dialog')
					.getByText(/csv.*missing|import.*failed|validation.*error/i)
			)
		await expect(errorMsg.first()).toBeVisible({ timeout: 15000 })

		// Error message should be readable and helpful
		const errorText = await errorMsg.first().textContent()
		expect(errorText).toBeTruthy()
		expect(errorText?.length).toBeGreaterThan(5)
	})

	test('manage dashboard should remain accessible after multiple navigation', async ({
		page
	}) => {
		// Test that auth guard doesn't break subsequent requests
		await loginAsOwner(page)

		// Navigate through multiple protected routes (use element waits instead of networkidle)
		await page.goto('/properties')
		await expect(page.getByRole('main')).toBeVisible()
		await expect(page.url()).toContain('/properties')

		// Go to units
		await page.goto('/units')
		await expect(page.getByRole('main')).toBeVisible()
		await expect(page.url()).toContain('/units')

		// Go to leases
		await page.goto('/leases')
		await expect(page.getByRole('main')).toBeVisible()
		await expect(page.url()).toContain('/leases')

		// Navigate back to dashboard (not '/' which is marketing page)
		await page.goto('/dashboard')
		await expect(page.url()).toContain('/dashboard')

		// Should still be logged in and dashboard should load (use role-based locator)
		await expect(page.getByRole('main')).toBeVisible()
	})

	test('should handle session persistence across page refreshes', async ({
		page
	}) => {
		// Login once
		await loginAsOwner(page)
		await page.goto('/properties')

		// Wait for page to be ready (auto-waiting preferred)
		await expect(page.getByRole('main')).toBeVisible()

		// Verify we're logged in
		const initialUrl = page.url()
		expect(initialUrl).toContain('/properties')

		// Refresh the page
		await page.reload()

		// Wait for content to reload (auto-waiting)
		await expect(page.getByRole('main')).toBeVisible()

		// Should still be logged in and on same page
		expect(page.url()).toBe(initialUrl)
	})
})
