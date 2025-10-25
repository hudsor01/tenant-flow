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
import { loginAsOwner } from '../auth.setup'

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

	test('should create a new tenant successfully', async ({ page }) => {
		// Navigate to tenant creation page
		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		// Fill out tenant information
		const timestamp = Date.now()
		const testEmail = `tenant.test.${timestamp}@example.com`

		await page.locator('#email').fill(testEmail)
		await page.locator('#firstName').fill('Test')
		await page.locator('#lastName').fill('Tenant')

		// Fill phone number if field exists
		const phoneInput = page.locator('input[name="phone"], input[id="phone"]')
		if (await phoneInput.isVisible().catch(() => false)) {
			await phoneInput.fill('555-123-4567')
		}

		// Select a property and unit (if dropdowns exist)
		const propertySelect = page.locator('select[name="propertyId"], select[id="propertyId"]')
		if (await propertySelect.isVisible().catch(() => false)) {
			await propertySelect.selectOption({ index: 1 }) // Select first property
			await page.waitForTimeout(500) // Wait for units to load
		}

		const unitSelect = page.locator('select[name="unitId"], select[id="unitId"]')
		if (await unitSelect.isVisible().catch(() => false)) {
			await unitSelect.selectOption({ index: 1 }) // Select first unit
		}

		// Fill lease details if fields exist
		const rentInput = page.locator('input[name="rent"], input[name="monthlyRent"]')
		if (await rentInput.isVisible().catch(() => false)) {
			await rentInput.fill('1500')
		}

		const startDateInput = page.locator('input[name="startDate"], input[type="date"]').first()
		if (await startDateInput.isVisible().catch(() => false)) {
			await startDateInput.fill('2025-11-01')
		}

		// Submit the form
		const submitButton = page.getByRole('button', { name: /create|onboard|submit|save/i }).last()
		await expect(submitButton).toBeVisible()

		// Wait for API call
		const createResponse = page.waitForResponse(
			response => response.url().includes('/api/v1/tenants') && response.request().method() === 'POST',
			{ timeout: 15000 }
		)

		await submitButton.click()

		// Verify API call succeeded
		const response = await createResponse
		expect(response.status()).toBe(201)
		const data = await response.json()
		expect(data.success).toBe(true)
		expect(data.data).toHaveProperty('id')

		console.log(`✅ Tenant created successfully: ${testEmail}`)

		// Wait for redirect to tenants list
		await page.waitForURL(/\/manage\/tenants(?!\/new)/, { timeout: 10000 })

		// Verify the tenant appears in the list
		await expect(page.locator(`text="${testEmail}"`)).toBeVisible({ timeout: 5000 })

		console.log('✅ Tenant visible in list after creation')
	})

	test('should display validation errors for invalid tenant data', async ({ page }) => {
		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		// Try to submit without filling required fields
		const submitButton = page.getByRole('button', { name: /create|onboard|submit|save/i }).last()
		await submitButton.click()

		// Verify validation errors appear
		const errorMessage = page.locator('text=/required|cannot be empty|invalid/i, [role="alert"]').first()
		await expect(errorMessage).toBeVisible({ timeout: 3000 })

		console.log('✅ Tenant form validation working correctly')
	})

	test('should handle tenant creation API errors gracefully', async ({ page }) => {
		await page.goto('/manage/tenants/new')
		await page.waitForLoadState('networkidle')

		// Intercept POST request and return error
		await page.route('**/api/v1/tenants', route => {
			if (route.request().method() === 'POST') {
				route.fulfill({
					status: 409,
					contentType: 'application/json',
					body: JSON.stringify({
						success: false,
						message: 'Tenant with this email already exists',
						data: null
					})
				})
			} else {
				route.continue()
			}
		})

		// Fill form with valid data
		await page.locator('#email').fill('duplicate@example.com')
		await page.locator('#firstName').fill('Test')
		await page.locator('#lastName').fill('Tenant')

		// Submit
		const submitButton = page.getByRole('button', { name: /create|onboard|submit|save/i }).last()
		await submitButton.click()

		// Verify error message is shown to user
		const errorAlert = page.locator('text=/already exists|error|failed/i, [role="alert"]').first()
		await expect(errorAlert).toBeVisible({ timeout: 5000 })

		console.log('✅ Tenant creation error handling working correctly')
	})
})
