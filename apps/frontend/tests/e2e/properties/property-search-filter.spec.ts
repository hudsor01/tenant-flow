import { test, expect } from '@playwright/test'
import { mockPropertiesAPI } from '../helpers/mock-data'

test.describe('Property Search and Filter', () => {
	test.beforeEach(async ({ page }) => {
		await mockPropertiesAPI(page)
		await page.goto('/properties')
		await page.waitForLoadState('networkidle')
	})

	test('should search properties by name', async ({ page }) => {
		// Type in search box
		const searchInput = page.getByPlaceholder(
			'Search properties by name, address, or type...'
		)
		await searchInput.fill('Sunset')

		// Wait for filtered results
		await page.waitForTimeout(500) // Debounce delay

		// Check only matching property is shown
		const propertyRows = page.getByRole('row')
		await expect(propertyRows).toHaveCount(2) // 1 result + header
		await expect(page.getByText('Sunset Apartments')).toBeVisible()

		// Clear search
		await searchInput.clear()
		await page.waitForTimeout(500)

		// All properties should be visible again
		await expect(propertyRows).toHaveCount(4) // 3 results + header
	})

	test('should search properties by address', async ({ page }) => {
		const searchInput = page.getByPlaceholder(
			'Search properties by name, address, or type...'
		)
		await searchInput.fill('123 Main')

		await page.waitForTimeout(500)

		// Check matching property
		await expect(page.getByText('Sunset Apartments')).toBeVisible()
		const propertyRows = page.getByRole('row')
		await expect(propertyRows).toHaveCount(2) // 1 result + header
	})

	test('should search properties by city', async ({ page }) => {
		const searchInput = page.getByPlaceholder(
			'Search properties by name, address, or type...'
		)
		await searchInput.fill('San Francisco')

		await page.waitForTimeout(500)

		// Check results filtered by city
		const propertyRows = page.getByRole('row')
		const visibleCount = await propertyRows.count()

		// Verify filtered results
		for (let i = 1; i < visibleCount; i++) {
			const row = propertyRows.nth(i)
			await expect(row).toContainText('San Francisco')
		}
	})

	test('should filter by property type', async ({ page }) => {
		// Click filter button
		await page.getByRole('button', { name: 'Filters' }).click()

		// Select property type
		const typeSelect = page.locator('select').first()
		await typeSelect.selectOption('RESIDENTIAL')

		// Wait for filtered results
		await page.waitForTimeout(500)

		// Check only residential properties shown
		const badges = page.locator('[data-testid="property-type-badge"]')
		const count = await badges.count()

		for (let i = 0; i < count; i++) {
			await expect(badges.nth(i)).toHaveText('RESIDENTIAL')
		}
	})

	test('should combine search and filter', async ({ page }) => {
		// Apply search
		const searchInput = page.getByPlaceholder(
			'Search properties by name, address, or type...'
		)
		await searchInput.fill('Apartment')

		// Apply filter
		await page.getByRole('button', { name: 'Filters' }).click()
		const typeSelect = page.locator('select').first()
		await typeSelect.selectOption('RESIDENTIAL')

		await page.waitForTimeout(500)

		// Check combined results
		const propertyRows = page.getByRole('row')
		const count = await propertyRows.count()

		// Should show only apartments that are residential
		for (let i = 1; i < count; i++) {
			const row = propertyRows.nth(i)
			await expect(row).toContainText('Apartment')
			await expect(
				row.locator('[data-testid="property-type-badge"]')
			).toHaveText('RESIDENTIAL')
		}
	})

	test('should show no results message when search has no matches', async ({
		page
	}) => {
		const searchInput = page.getByPlaceholder(
			'Search properties by name, address, or type...'
		)
		await searchInput.fill('NonexistentProperty123')

		await page.waitForTimeout(500)

		// Check no results message
		await expect(page.getByText('No properties found')).toBeVisible()
		await expect(
			page.getByText('Try adjusting your search criteria or filters')
		).toBeVisible()
	})

	test('should clear filters', async ({ page }) => {
		// Apply filter
		await page.getByRole('button', { name: 'Filters' }).click()
		const typeSelect = page.locator('select').first()
		await typeSelect.selectOption('COMMERCIAL')

		await page.waitForTimeout(500)

		// Check filtered results
		let propertyRows = page.getByRole('row')
		let initialCount = await propertyRows.count()

		// Clear filter
		await typeSelect.selectOption('')

		await page.waitForTimeout(500)

		// All properties should be visible
		propertyRows = page.getByRole('row')
		const finalCount = await propertyRows.count()
		expect(finalCount).toBeGreaterThan(initialCount)
	})

	test('should persist search when navigating back', async ({ page }) => {
		// Apply search
		const searchInput = page.getByPlaceholder(
			'Search properties by name, address, or type...'
		)
		await searchInput.fill('Sunset')

		await page.waitForTimeout(500)

		// Navigate to property details
		await page.getByText('Sunset Apartments').click()
		await expect(page.getByRole('dialog')).toBeVisible()

		// Close drawer
		await page.keyboard.press('Escape')

		// Search should still be applied
		await expect(searchInput).toHaveValue('Sunset')
		const propertyRows = page.getByRole('row')
		await expect(propertyRows).toHaveCount(2) // 1 result + header
	})

	test('should handle special characters in search', async ({ page }) => {
		const searchInput = page.getByPlaceholder(
			'Search properties by name, address, or type...'
		)

		// Test various special characters
		const specialChars = ['@', '#', '$', '%', '&', '*', '(', ')']

		for (const char of specialChars) {
			await searchInput.fill(char)
			await page.waitForTimeout(500)

			// Should handle gracefully without errors
			await expect(page.getByText('No properties found')).toBeVisible()
			await searchInput.clear()
		}
	})

	test('should be case-insensitive in search', async ({ page }) => {
		const searchInput = page.getByPlaceholder(
			'Search properties by name, address, or type...'
		)

		// Test different cases
		const searchTerms = ['sunset', 'SUNSET', 'SuNsEt']

		for (const term of searchTerms) {
			await searchInput.fill(term)
			await page.waitForTimeout(500)

			// Should find the property regardless of case
			await expect(page.getByText('Sunset Apartments')).toBeVisible()
			await searchInput.clear()
		}
	})
})
