import { test, expect } from '@playwright/test'
import { loginAsOwner } from '../auth-helpers'
import path from 'path'

test.describe('JWT Auth Guard Error Messages', () => {
	test('should successfully authenticate and display dashboard', async ({ page }) => {
		// Login as owner
		await loginAsOwner(page)

		// Verify we're on the dashboard
		await expect(page.url()).toContain('/manage')
		await expect(page.locator('main')).toBeVisible()

		// Verify dashboard content is visible
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 5000 })
	})

	test('should handle bulk import with valid authentication', async ({ page }) => {
		// Login and navigate to properties
		await loginAsOwner(page)
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		// Click bulk import button
		const bulkImportBtn = page.getByRole('button', { name: /bulk import/i })
		await expect(bulkImportBtn).toBeVisible()
		await bulkImportBtn.click()

		// Wait for modal
		await expect(page.getByRole('dialog')).toBeVisible()

		// Verify modal content
		await expect(page.getByText(/import properties/i)).toBeVisible()
		await expect(page.getByText(/required columns/i)).toBeVisible()
	})

	test('should display improved error message on API failures', async ({ page, context }) => {
		// Intercept API requests to simulate backend errors
		await page.route('**/api/v1/properties/**', route => {
			if (route.request().method() === 'POST') {
				// Simulate authentication failure with new error message
				route.abort('failed')
			}
		})

		// Login and navigate
		await loginAsOwner(page)
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		// Click bulk import
		await page.getByRole('button', { name: /bulk import/i }).click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Select a file
		const csvPath = path.join(__dirname, '../../frontend/test-bulk-import.csv')
		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles(csvPath)

		// Try to import - should show error
		await page.getByRole('button', { name: /import properties/i }).click()

		// Verify error message appears
		await expect(
			page.getByText(/failed|error|try again/i)
		).toBeVisible({ timeout: 5000 })
	})

	test('should show clear error for invalid CSV with proper formatting', async ({ page }) => {
		await loginAsOwner(page)
		await page.goto('/manage/properties')

		// Open bulk import modal
		await page.getByRole('button', { name: /bulk import/i }).click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Create and upload invalid CSV (missing required columns)
		const invalidCsv = 'name,address\\nTest Property,123 Main St'
		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'invalid.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(invalidCsv)
		})

		// Click import
		await page.getByRole('button', { name: /import properties/i }).click()

		// Should show validation error
		const errorMsg = page.getByText(/failed|error|invalid|missing|required/i)
		await expect(errorMsg).toBeVisible({ timeout: 10000 })

		// Error message should be readable and helpful
		const errorText = await errorMsg.first().textContent()
		expect(errorText).toBeTruthy()
		expect(errorText?.length).toBeGreaterThan(10)
	})

	test('dashboard should remain accessible after multiple navigation', async ({ page }) => {
		// Test that auth guard doesn't break subsequent requests
		await loginAsOwner(page)

		// Navigate through multiple protected routes
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')
		await expect(page.url()).toContain('/manage/properties')

		// Go to units
		await page.goto('/manage/units')
		await page.waitForLoadState('networkidle')
		await expect(page.url()).toContain('/manage/units')

		// Go to leases
		await page.goto('/manage/leases')
		await page.waitForLoadState('networkidle')
		await expect(page.url()).toContain('/manage/leases')

		// Navigate back to dashboard
		await page.goto('/manage')
		await page.waitForLoadState('networkidle')
		await expect(page.url()).toContain('/manage')

		// Should still be logged in and dashboard should load
		await expect(page.locator('main')).toBeVisible()
	})

	test('should handle session persistence across page refreshes', async ({ page }) => {
		// Login once
		await loginAsOwner(page)
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		// Verify we're logged in
		const initialUrl = page.url()
		expect(initialUrl).toContain('/manage/properties')

		// Refresh the page
		await page.reload()
		await page.waitForLoadState('networkidle')

		// Should still be logged in and on same page
		expect(page.url()).toBe(initialUrl)
		await expect(page.locator('main')).toBeVisible()
	})
})
