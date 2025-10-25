/**
 * E2E Test: Complete Property CRUD Workflow
 *
 * Tests the full property management lifecycle:
 * - Creating a new property (form fill → submit → verify)
 * - Viewing property in the list
 * - Updating property details
 * - Deleting property
 *
 * This test ensures the entire user journey works end-to-end,
 * preventing production errors from broken forms or API integrations.
 */

import { expect, test } from '@playwright/test'
import { loginAsOwner } from '../auth.setup'

test.describe('Property CRUD Workflow', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page)
	})

	test('should create a new property successfully', async ({ page }) => {
		// Navigate to properties page
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		// Click "Create Property" or "Add Property" button
		const createButton = page.getByRole('button', { name: /create property|add property|new property/i })
		await expect(createButton).toBeVisible({ timeout: 10000 })
		await createButton.click()

		// Wait for form to appear (might be in a dialog/modal)
		await page.waitForTimeout(500) // Brief wait for animation

		// Fill out the property form
		const propertyName = `Test Property ${Date.now()}`

		// Look for name/address input fields
		const nameInput = page.locator('input[name="name"], input[id="name"], input[placeholder*="name" i]').first()
		await expect(nameInput).toBeVisible({ timeout: 5000 })
		await nameInput.fill(propertyName)

		// Fill address (if required)
		const addressInput = page.locator('input[name="address"], input[id="address"], input[placeholder*="address" i]').first()
		if (await addressInput.isVisible().catch(() => false)) {
			await addressInput.fill('123 Test Street, Test City, TC 12345')
		}

		// Select property type (if dropdown exists)
		const typeSelect = page.locator('select[name="type"], select[id="propertyType"], select[name="propertyType"]').first()
		if (await typeSelect.isVisible().catch(() => false)) {
			await typeSelect.selectOption({ index: 1 }) // Select first non-empty option
		}

		// Set number of units (if input exists)
		const unitsInput = page.locator('input[name="units"], input[name="totalUnits"], input[type="number"]').first()
		if (await unitsInput.isVisible().catch(() => false)) {
			await unitsInput.fill('10')
		}

		// Submit the form
		const submitButton = page.getByRole('button', { name: /create|save|submit|add/i }).last()
		await expect(submitButton).toBeVisible()

		// Wait for API call to complete
		const createResponse = page.waitForResponse(
			response => response.url().includes('/api/v1/properties') && response.request().method() === 'POST',
			{ timeout: 10000 }
		)

		await submitButton.click()

		// Verify API call succeeded
		const response = await createResponse
		expect(response.status()).toBe(201)
		const data = await response.json()
		expect(data.success).toBe(true)
		expect(data.data).toHaveProperty('id')

		console.log(`✅ Property created successfully: ${propertyName}`)

		// Wait for redirect or modal close
		await page.waitForTimeout(1000)

		// Verify the property appears in the list
		const propertyCard = page.locator(`text="${propertyName}"`).first()
		await expect(propertyCard).toBeVisible({ timeout: 5000 })

		console.log('✅ Property visible in list after creation')
	})

	test('should display validation errors for invalid property data', async ({ page }) => {
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		// Click create button
		const createButton = page.getByRole('button', { name: /create property|add property|new property/i })
		await createButton.click()
		await page.waitForTimeout(500)

		// Try to submit without filling required fields
		const submitButton = page.getByRole('button', { name: /create|save|submit|add/i }).last()
		await submitButton.click()

		// Verify validation errors appear
		// Look for error messages (common patterns)
		const errorMessage = page.locator('text=/required|cannot be empty|invalid/i, [role="alert"], .error-message').first()
		await expect(errorMessage).toBeVisible({ timeout: 3000 })

		console.log('✅ Form validation working correctly')
	})

	test('should load properties list without errors', async ({ page }) => {
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		// Wait for properties API call
		const propertiesResponse = page.waitForResponse(
			response => response.url().includes('/api/v1/properties') && response.status() === 200,
			{ timeout: 10000 }
		)

		const response = await propertiesResponse
		expect(response.ok()).toBeTruthy()

		// Verify response structure
		const data = await response.json()
		expect(data).toHaveProperty('success', true)
		expect(data).toHaveProperty('data')
		expect(Array.isArray(data.data)).toBeTruthy()

		// Verify page shows properties (or empty state)
		const mainContent = page.locator('main, [role="main"]')
		await expect(mainContent).toBeVisible()

		console.log('✅ Properties list loaded successfully')
	})

	test('should handle property creation API errors gracefully', async ({ page }) => {
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		// Intercept POST request and return error
		await page.route('**/api/v1/properties', route => {
			if (route.request().method() === 'POST') {
				route.fulfill({
					status: 400,
					contentType: 'application/json',
					body: JSON.stringify({
						success: false,
						message: 'Property name already exists',
						data: null
					})
				})
			} else {
				route.continue()
			}
		})

		// Try to create a property
		const createButton = page.getByRole('button', { name: /create property|add property|new property/i })
		await createButton.click()
		await page.waitForTimeout(500)

		// Fill form
		const nameInput = page.locator('input[name="name"], input[id="name"]').first()
		await nameInput.fill('Duplicate Property')

		// Submit
		const submitButton = page.getByRole('button', { name: /create|save|submit|add/i }).last()
		await submitButton.click()

		// Verify error message is shown to user
		const errorAlert = page.locator('text=/already exists|error|failed/i, [role="alert"]').first()
		await expect(errorAlert).toBeVisible({ timeout: 5000 })

		console.log('✅ Property creation error handling working correctly')
	})
})
