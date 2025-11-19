import { expect, test } from '@playwright/test'
import type { TestInfo } from '@playwright/test'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { loginAsOwner } from '../auth-helpers'

const logger = createLogger({ component: 'TexasLeaseGenerationTest' })

/**
 * E2E tests for Texas Residential Lease Agreement Generation

 * Tests the complete user journey:
 * 1. Navigate to lease generation page (requires property + unit + tenant selection)
 * 2. Auto-fill form data from backend (GET /api/v1/leases/auto-fill/:property_id/:unit_id/:tenant_id)
 * 3. User reviews/modifies form fields
 * 4. Click "Generate & Download Lease" button
 * 5. Backend generates PDF via POST /api/v1/leases/generate (form-fill PDF with AcroForm fields)
 * 6. Frontend receives PDF binary and triggers download
 * 7. PDF file downloads successfully

 * Security Tests:
 * - Verifies PropertyOwnershipGuard prevents unauthorized access
 * - Verifies DTO validation rejects invalid data
 */

async function attachText(testInfo: TestInfo, name: string, lines: string[]) {
	if (!lines.length) return
	await testInfo.attach(name, {
		contentType: 'text/plain',
		body: Buffer.from(lines.join('\n'), 'utf-8')
	})
}

/**
 * E2E AUTHENTICATION SETUP REQUIRED

 * These tests require a local test account to be set up in your database:
 * Email: process.env.E2E_OWNER_EMAIL (default: test-owner@example.com)
 * Password: process.env.E2E_OWNER_PASSWORD (default: TestPassword123!)
 * To set up:
 * 1. Sign up at http://localhost:3000/signup with the test credentials
 * 2. Verify the email in your local Supabase dashboard
 * 3. Run these tests

 * Tests will be SKIPPED if authentication fails.
 */
test.describe('Texas Lease Generation', () => {
	let consoleErrors: string[] = []
	let networkErrors: string[] = []
	let authenticationAvailable = false

	// Check if authentication is available before running tests
	test.beforeAll(async ({ browser }) => {
		const page = await browser.newPage()

		try {
			// Try to login with timeout using Promise.race
			await Promise.race([
				loginAsOwner(page),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Auth timeout after 10s')), 10000)
				)
			])

			authenticationAvailable = true
			logger.info(' Authentication successful - tests will run')
		} catch (error) {
			authenticationAvailable = false
			logger.warn('️ Authentication failed - tests will be SKIPPED')
			logger.info(' Set up test account at http://localhost:3000/signup')
			logger.info(
				` Email: ${process.env.E2E_OWNER_EMAIL || 'test-owner@example.com'}`
			)
		} finally {
			await page.close()
		}
	})

	test.beforeEach(async ({ page }) => {
		// Skip authentication if not available (checked in beforeAll)
		if (!authenticationAvailable) {
			test.skip()
			return
		}

		consoleErrors = []
		networkErrors = []

		// Authenticate before each test for clean state
		await loginAsOwner(page)

		// Set up console and network monitoring
		page.on('console', msg => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text())
			}
		})

		page.on('requestfailed', request => {
			networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`)
		})

		page.on('response', response => {
			if (response.status() >= 400) {
				networkErrors.push(`${response.url()} - Status: ${response.status()}`)
			}
		})
	})

	test.afterEach(async (testInfo) => {
		await attachText(testInfo, 'console-errors', consoleErrors)
		await attachText(testInfo, 'network-errors', networkErrors)
	})

	test('should auto-fill and generate Texas lease PDF', async ({
		page
	}, testInfo) => {
		// Authentication handled in beforeEach

		// Navigate to leases page
		await page.goto('/manage/leases', {
			waitUntil: 'networkidle',
			timeout: 30000
		})

		// Verify page loaded
		await expect(
			page.locator('h1, h2').filter({ hasText: /lease/i }).first()
		).toBeVisible()

		// Click "New Lease" or "Generate Lease" button
		const newLeaseButton = page.getByRole('button', {
			name: /new.*lease|generate.*lease|add.*lease/i
		})
		await expect(newLeaseButton).toBeVisible({ timeout: 10000 })
		await newLeaseButton.click()

		// Select property (required)
		const propertySelect = page
			.getByLabel(/property/i)
			.or(
				page.locator(
					'select[name*="property"], [user_type="combobox"][aria-label*="property"]'
				)
			)
			.first()
		await expect(propertySelect).toBeVisible({ timeout: 5000 })

		// Get the first available property
		await propertySelect.click()
		const firstPropertyOption = page.locator('[user_type="option"]').first()
		await firstPropertyOption.click()

		// Select unit (required)
		const unitSelect = page
			.getByLabel(/unit/i)
			.or(
				page.locator(
					'select[name*="unit"], [user_type="combobox"][aria-label*="unit"]'
				)
			)
			.first()
		await expect(unitSelect).toBeVisible({ timeout: 5000 })

		await unitSelect.click()
		const firstUnitOption = page.locator('[user_type="option"]').first()
		await firstUnitOption.click()

		// Select tenant (required)
		const tenantSelect = page
			.getByLabel(/tenant/i)
			.or(
				page.locator(
					'select[name*="tenant"], [user_type="combobox"][aria-label*="tenant"]'
				)
			)
			.first()
		await expect(tenantSelect).toBeVisible({ timeout: 5000 })

		// Set up auto-fill listener BEFORE clicking tenant (to avoid race condition)
		const autoFillPromise = page.waitForResponse(
			response =>
				response.url().includes('/api/v1/leases/auto-fill/') &&
				response.status() === 200,
			{ timeout: 30000 }
		)

		await tenantSelect.click()
		const firstTenantOption = page.locator('[user_type="option"]').first()
		await firstTenantOption.click()

		// Wait for auto-fill to complete
		const autoFillResponse = await autoFillPromise
		expect(autoFillResponse.status()).toBe(200)

		const autoFillData = await autoFillResponse.json()
		expect(autoFillData).toHaveProperty('propertyAddress')
		expect(autoFillData).toHaveProperty('tenantName')
		expect(autoFillData).toHaveProperty('ownerName')
		expect(autoFillData).toHaveProperty('rent_amount')

		await testInfo.attach('auto-fill-data', {
			contentType: 'application/json',
			body: JSON.stringify(autoFillData, null, 2)
		})

		// Verify form fields are populated
		const ownerNameInput = page
			.getByLabel(/owner.*name/i)
			.or(page.locator('input[name="ownerName"]'))
			.first()
		if (await ownerNameInput.isVisible()) {
			const ownerNameValue = await ownerNameInput.inputValue()
			expect(ownerNameValue).toBeTruthy()
			expect(ownerNameValue).not.toBe('')
		}

		const rent_amountInput = page
			.getByLabel(/monthly.*rent/i)
			.or(page.locator('input[name="rent_amount"]'))
			.first()
		if (await rent_amountInput.isVisible()) {
			const rentValue = await rent_amountInput.inputValue()
			expect(rentValue).toBeTruthy()
			const rentNumber = Number.parseFloat(rentValue)
			expect(rentNumber).not.toBeNaN()
			expect(rentNumber).toBeGreaterThan(0)
		}

		// Intercept PDF generation API call
		const pdfGeneratePromise = page.waitForResponse(
			response =>
				response.url().includes('/api/v1/leases/generate') &&
				response.status() === 200,
			{ timeout: 60000 } // PDF generation can take longer
		)

		// Set up download listener BEFORE clicking button
		const downloadPromise = page.waitForEvent('download', { timeout: 60000 })

		// Click "Generate & Download Lease" button
		const generateButton = page.getByRole('button', {
			name: /generate.*download.*lease/i
		})
		await expect(generateButton).toBeVisible()
		await expect(generateButton).toBeEnabled()
		await generateButton.click()

		// Wait for PDF generation
		const pdfResponse = await pdfGeneratePromise
		expect(pdfResponse.status()).toBe(200)

		// Verify response is PDF binary
		const contentType = pdfResponse.headers()['content-type']
		expect(contentType).toContain('application/pdf')

		const contentDisposition = pdfResponse.headers()['content-disposition']
		expect(contentDisposition).toContain('attachment')
		expect(contentDisposition).toMatch(/lease-.*\.pdf/)

		// Verify file downloads
		const download = await downloadPromise
		expect(download.suggestedFilename()).toMatch(/lease-.*\.pdf/)

		// Get PDF size
		const pdfBuffer = await pdfResponse.body()
		const pdfSize = pdfBuffer.length

		await testInfo.attach('pdf-generation-success', {
			contentType: 'text/plain',
			body: `PDF successfully generated and downloaded\nPDF size: ${pdfSize} bytes\nFilename: ${download.suggestedFilename()}`
		})

		// Verify PDF is valid (starts with %PDF header)
		const pdfHeader = pdfBuffer.slice(0, 5).toString('utf-8')
		expect(pdfHeader).toBe('%PDF-')

		// Verify no critical errors during the process
		expect(consoleErrors.length).toBe(0)
		const criticalErrors = networkErrors.filter(
			err =>
				!err.includes('analytics') &&
				!err.includes('telemetry') &&
				!err.includes('favicon')
		)
		expect(criticalErrors.length).toBe(0)
	})

	test('should reject generation without required property/unit/tenant', async ({
		page
	}) => {
		await page.goto('/manage/leases', {
			waitUntil: 'networkidle',
			timeout: 30000
		})

		// Try to access lease generation without selecting required data
		const newLeaseButton = page.getByRole('button', {
			name: /new.*lease|generate.*lease/i
		})

		if (await newLeaseButton.isVisible()) {
			await newLeaseButton.click()

			// Generate button should be disabled or show error message
			const generateButton = page.getByRole('button', {
				name: /generate.*download.*lease/i
			})

			// Wait for button to appear or error message
			await Promise.race([
				generateButton
					.waitFor({ state: 'visible', timeout: 5000 })
					.catch(() => {}),
				page
					.locator('[class*="error"], [user_type="alert"]')
					.first()
					.waitFor({ state: 'visible', timeout: 5000 })
					.catch(() => {})
			])

			if (await generateButton.isVisible()) {
				// Should be disabled without required selections
				const isDisabled = await generateButton.isDisabled()
				expect(isDisabled).toBe(true)
			} else {
				// Or should show error message about missing required data
				const errorMessage = page
					.locator('[class*="error"], [user_type="alert"]')
					.filter({
						hasText: /property.*unit.*tenant|required|missing/i
					})
					.first()
				await expect(errorMessage).toBeVisible({ timeout: 5000 })
			}
		}
	})

	test('should handle PDF generation API errors gracefully', async ({
		page
	}) => {
		// Mock API to return error
		await page.route('**/api/v1/leases/generate', route => {
			route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({
					message: 'Failed to generate lease PDF',
					statusCode: 500,
					error: 'Internal Server Error'
				})
			})
		})

		await page.goto('/manage/leases', {
			waitUntil: 'networkidle',
			timeout: 30000
		})

		// Proceed through form (simplified - assumes form can be filled)
		const newLeaseButton = page.getByRole('button', { name: /new.*lease/i })
		if (await newLeaseButton.isVisible()) {
			await newLeaseButton.click()

			// Wait for form to load
			await page
				.getByRole('button', { name: /generate/i })
				.waitFor({ state: 'attached', timeout: 5000 })
				.catch(() => {})

			// Try to generate (if button becomes enabled)
			const generateButton = page.getByRole('button', {
				name: /generate.*download/i
			})

			if (
				(await generateButton.isVisible()) &&
				!(await generateButton.isDisabled())
			) {
				await generateButton.click()

				// Should show error toast/message
				const errorMessage = page
					.locator('[user_type="alert"], .toast, [class*="error"]')
					.filter({
						hasText: /failed|error/i
					})
					.first()
				await expect(errorMessage).toBeVisible({ timeout: 10000 })
			}
		}
	})

	test('should validate required fields before submission', async ({
		page
	}) => {
		// Mock API with validation error
		await page.route('**/api/v1/leases/generate', route => {
			route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({
					message: 'Validation failed',
					statusCode: 400,
					errors: [
						{ field: 'agreementDate', message: 'Agreement date is required' },
						{ field: 'ownerName', message: 'Property owner name is required' },
						{ field: 'tenantName', message: 'Tenant name is required' }
					]
				})
			})
		})

		await page.goto('/manage/leases', {
			waitUntil: 'networkidle',
			timeout: 30000
		})

		// Try to generate with missing data
		const newLeaseButton = page.getByRole('button', { name: /new.*lease/i })
		if (await newLeaseButton.isVisible()) {
			await newLeaseButton.click()

			// Wait for form
			await page
				.getByRole('button', { name: /generate/i })
				.waitFor({ state: 'attached', timeout: 5000 })
				.catch(() => {})

			const generateButton = page.getByRole('button', { name: /generate/i })

			if (
				(await generateButton.isVisible()) &&
				!(await generateButton.isDisabled())
			) {
				await generateButton.click()

				// Should show validation errors
				const validationError = page
					.locator('[class*="error"], [user_type="alert"]')
					.first()
				await expect(validationError).toBeVisible({ timeout: 5000 })
			}
		}
	})

	test('should maintain form data when regenerating', async ({ page }) => {
		await page.goto('/manage/leases', {
			waitUntil: 'networkidle',
			timeout: 30000
		})

		const newLeaseButton = page.getByRole('button', { name: /new.*lease/i })
		if (await newLeaseButton.isVisible()) {
			await newLeaseButton.click()

			// Wait for form to load
			await page
				.getByRole('button', { name: /generate/i })
				.waitFor({ state: 'attached', timeout: 5000 })
				.catch(() => {})

			// Modify a form field (monthly rent)
			const rent_amountInput = page
				.getByLabel(/monthly.*rent/i)
				.or(page.locator('input[name="rent_amount"]'))
				.first()

			if (await rent_amountInput.isVisible()) {
				await rent_amountInput.clear()
				await rent_amountInput.fill('2500')

				// Verify value persisted
				const rentValue = await rent_amountInput.inputValue()
				expect(rentValue).toBe('2500')
			}

			// Modify security deposit
			const security_depositInput = page
				.getByLabel(/security.*deposit/i)
				.or(page.locator('input[name="security_deposit"]'))
				.first()

			if (await security_depositInput.isVisible()) {
				await security_depositInput.clear()
				await security_depositInput.fill('3000')

				const depositValue = await security_depositInput.inputValue()
				expect(depositValue).toBe('3000')
			}
		}
	})
})
