import { test, expect } from '@playwright/test'
import { loginAsOwner } from '../../auth-helpers'
import path from 'path'
import { Buffer, Blob } from 'buffer'

test.describe('Property Bulk Import', () => {
	test.beforeEach(async ({ page }) => {
		// Authenticate as owner with valid session
		await loginAsOwner(page)
	})

	test('should import properties from CSV and display them immediately', async ({
		page
	}) => {
		// Navigate to properties page
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		// Get initial property count
		const initialCount = await page.locator('[data-testid="property-card"]').count()

		// Click bulk import button
		await page.getByRole('button', { name: /bulk import/i }).click()

		// Wait for modal to open
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByText(/import properties/i)).toBeVisible()

		// Upload CSV file
		const csvPath = path.join(__dirname, '../../../frontend/test-bulk-import.csv')
		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles(csvPath)

		// Verify file is selected
		await expect(page.getByText(/test-bulk-import\.csv/i)).toBeVisible()

		// Click import button
		await page.getByRole('button', { name: /import properties/i }).click()

		// Wait for success message
		await expect(
			page.getByText(/successfully imported|imported \d+ propert/i)
		).toBeVisible({ timeout: 10000 })

		// Modal should close automatically (within 3 seconds)
		await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })

		// ✅ CRITICAL: Properties should appear WITHOUT manual refresh
		await page.waitForTimeout(1000) // Brief wait for cache invalidation

		// Verify new properties are visible
		const newCount = await page.locator('[data-testid="property-card"]').count()
		expect(newCount).toBeGreaterThan(initialCount)

		// Expected: 5 properties from test CSV
		expect(newCount).toBe(initialCount + 5)

		// Verify specific properties from CSV are visible
		await expect(page.getByText('Sunset Apartments')).toBeVisible()
		await expect(page.getByText('Oak Grove Residence')).toBeVisible()
		await expect(page.getByText('Harbor View Complex')).toBeVisible()
		await expect(page.getByText('Maple Street Duplex')).toBeVisible()
		await expect(page.getByText('Tech Center Office')).toBeVisible()

		// Verify property details
		await expect(page.getByText('San Francisco, CA')).toBeVisible()
		await expect(page.getByText('APARTMENT')).toBeVisible()
		await expect(page.getByText('COMMERCIAL')).toBeVisible()
	})

	test('should handle CSV validation errors gracefully', async ({ page }) => {
		await page.goto('/manage/properties')

		// Click bulk import
		await page.getByRole('button', { name: /bulk import/i }).click()

		// Create invalid CSV content (missing required fields)
		const invalidCsv = 'name,address\nTest Property,123 Main St'
		const buffer = Buffer.from(invalidCsv)
		const blob = new Blob([buffer], { type: 'text/csv' })

		// Upload invalid file
		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles({
			name: 'invalid.csv',
			mimeType: 'text/csv',
			buffer: buffer
		})

		// Click import
		await page.getByRole('button', { name: /import properties/i }).click()

		// Should show error
		await expect(
			page.getByText(/failed|error|invalid|missing required/i)
		).toBeVisible({ timeout: 10000 })
	})

	test('should prevent uploading non-CSV files', async ({ page }) => {
		await page.goto('/manage/properties')
		await page.getByRole('button', { name: /bulk import/i }).click()

		// Try to upload a text file
		const fileInput = page.locator('input[type="file"]')

		// Should show validation error
		await expect(async () => {
			await fileInput.setInputFiles({
				name: 'test.txt',
				mimeType: 'text/plain',
				buffer: Buffer.from('not a csv')
			})
		}).rejects.toThrow()
	})

	test('should show import summary with success/failure counts', async ({
		page
	}) => {
		await page.goto('/manage/properties')
		await page.getByRole('button', { name: /bulk import/i }).click()

		const csvPath = path.join(__dirname, '../../../frontend/test-bulk-import.csv')
		const fileInput = page.locator('input[type="file"]')
		await fileInput.setInputFiles(csvPath)

		await page.getByRole('button', { name: /import properties/i }).click()

		// Should show summary
		await expect(page.getByText(/imported: \d+/i)).toBeVisible({ timeout: 10000 })
		await expect(page.getByText(/failed: \d+/i)).toBeVisible()
	})
})
