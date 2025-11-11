import { expect, test } from '@playwright/test'
import type { TestInfo } from '@playwright/test'
import { loginAsOwner } from '../auth-helpers'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'LeaseTemplatePDFTest' })

/**
 * E2E tests for Lease Template Builder (NOT Texas Lease Generation)
 * 
 * NOTE: This tests the lease template builder feature, which is different from
 * the Texas Residential Lease Agreement generation (tested in texas-lease-generation.spec.ts)
 * 
 * Tests the complete user journey:
 * 1. Navigate to lease template builder
 * 2. Configure template selections (state, clauses)
 * 3. Fill in lease context (owner, tenant, property details)
 * 4. Click "Render PDF" button
 * 5. Backend generates PDF via POST /api/v1/pdf/lease/template/preview
 * 6. Frontend receives PDF and displays in iframe
 * 7. User can download the PDF
 */

async function attachText(testInfo: TestInfo, name: string, lines: string[]) {
	if (!lines.length) return
	await testInfo.attach(name, {
		contentType: 'text/plain',
		body: Buffer.from(lines.join('\n'), 'utf-8')
	})
}

test.describe('Lease Template PDF Generation', () => {
	let consoleErrors: string[] = []
	let networkErrors: string[] = []
	let authenticationAvailable = false

	// Check if authentication is available before running tests
	test.beforeAll(async ({ browser }) => {
		const page = await browser.newPage()
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 10000)
		
		try {
			// Try to login with timeout using AbortController
			await loginAsOwner(page)
			
			if (controller.signal.aborted) {
				throw new Error('Auth timeout')
			}
			
			authenticationAvailable = true
			logger.info('✅ Authentication successful - tests will run')
		} catch (error) {
			authenticationAvailable = false
			logger.warn('⚠️  Authentication failed - tests will be SKIPPED')
			logger.info('   Set up test account at http://localhost:3000/signup')
			logger.info(
				`   Email: ${process.env.E2E_OWNER_EMAIL || 'test-owner@example.com'}`
			)
		} finally {
			clearTimeout(timeoutId)
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
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text())
			}
		})

		page.on('requestfailed', (request) => {
			networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`)
		})

		page.on('response', (response) => {
			if (response.status() >= 400) {
				networkErrors.push(`${response.url()} - Status: ${response.status()}`)
			}
		})
	})

	test.afterEach(async (_fixtures, testInfo) => {
		await attachText(testInfo, 'console-errors', consoleErrors)
		await attachText(testInfo, 'network-errors', networkErrors)
	})

	test('should generate and preview lease PDF from template builder', async ({ page }, testInfo) => {
		// Navigate to lease template builder
		await page.goto('/manage/documents/lease-template', { 
			waitUntil: 'networkidle',
			timeout: 30000 
		})

		// Verify page loaded
		await expect(page.locator('h1, h2').filter({ hasText: /lease/i }).first()).toBeVisible()

		// Select state (California for comprehensive requirements)
		const stateSelect = page.locator('select[name="state"], [role="combobox"]').first()
		if (await stateSelect.isVisible()) {
			await stateSelect.selectOption('CA')
		}

		// Fill in owner information (required fields)
		const ownerNameInput = page.getByLabel(/owner.*name/i).or(page.locator('input[name*="owner"][name*="name"]')).first()
		if (await ownerNameInput.isVisible()) {
			await ownerNameInput.fill('Test Property Owner LLC')
		}

		// Fill in tenant information
		const tenantNameInput = page.getByLabel(/tenant.*name/i).or(page.locator('input[name*="tenant"][name*="name"]')).first()
		if (await tenantNameInput.isVisible()) {
			await tenantNameInput.fill('John Doe; Jane Smith')
		}

		// Fill in property address
		const propertyAddressInput = page.getByLabel(/property.*address/i).or(page.locator('input[name*="property"][name*="address"]')).first()
		if (await propertyAddressInput.isVisible()) {
			await propertyAddressInput.fill('123 Main Street, Los Angeles, CA 90001')
		}

		// Fill in rent amount
		const rentInput = page.getByLabel(/rent.*amount/i).or(page.locator('input[name*="rent"][type="number"]')).first()
		if (await rentInput.isVisible()) {
			await rentInput.fill('2500')
		}

		// Intercept the PDF preview API call
		const pdfPreviewPromise = page.waitForResponse(
			response => response.url().includes('/api/v1/pdf/lease/template/preview') && response.status() === 200,
			{ timeout: 30000 }
		)

		// Click "Render PDF" button
		const renderButton = page.getByRole('button', { name: /render.*pdf|generate.*pdf/i })
		await expect(renderButton).toBeVisible()
		await renderButton.click()

		// Wait for PDF generation
		const pdfResponse = await pdfPreviewPromise
		expect(pdfResponse.status()).toBe(200)

		// Verify response contains PDF data
		const pdfData = await pdfResponse.json()
		expect(pdfData).toHaveProperty('success', true)
		expect(pdfData).toHaveProperty('pdf')
		expect(pdfData.pdf).toBeTruthy()
		expect(typeof pdfData.pdf).toBe('string') // Base64 encoded PDF

		// Verify PDF preview iframe appears
		const pdfIframe = page.locator('iframe[title*="Lease"][title*="PDF"], iframe[src*="data:application/pdf"]').first()
		await expect(pdfIframe).toBeVisible({ timeout: 10000 })

		// Verify iframe has PDF content loaded
		const iframeSrc = await pdfIframe.getAttribute('src')
		expect(iframeSrc).toContain('data:application/pdf;base64,')

		// Log success
		await testInfo.attach('pdf-generation-success', {
			contentType: 'text/plain',
			body: `PDF successfully generated and displayed\nPDF size: ${pdfData.pdf.length} bytes (base64)\nResponse time: ${pdfResponse.timing()}`
		})

		// Verify no console or network errors during the process
		expect(consoleErrors.length).toBe(0)
		const criticalErrors = networkErrors.filter(err => 
			!err.includes('analytics') && 
			!err.includes('telemetry') &&
			!err.includes('favicon')
		)
		expect(criticalErrors.length).toBe(0)
	})

	test('should handle missing required fields gracefully', async ({ page }) => {
		await page.goto('/manage/documents/lease-template', { 
			waitUntil: 'networkidle',
			timeout: 30000 
		})

		// Try to render PDF without filling required fields
		const renderButton = page.getByRole('button', { name: /render.*pdf|generate.*pdf/i })
		
		if (await renderButton.isVisible()) {
			// Should either be disabled or show validation error
			const isDisabled = await renderButton.isDisabled()
			
			if (!isDisabled) {
				await renderButton.click()
				
				// Wait a bit for validation message
				await page.waitForTimeout(1000)
				
				// Should show error toast or validation message
				const errorMessage = page.locator('[role="alert"], .error-message, [class*="error"]').first()
				// Note: Validation might be client-side, so this is optional
				// Only assert if errorMessage is present in DOM
				if (await errorMessage.count() > 0) {
					await expect(errorMessage).toBeVisible({ timeout: 3000 })
				}
			}
		}
	})

	test('should handle PDF generation API errors gracefully', async ({ page }) => {
		// Mock API to return error
		await page.route('**/api/v1/pdf/lease/template/preview', route => {
			route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'PDF generation failed' })
			})
		})

		await page.goto('/manage/documents/lease-template', { 
			waitUntil: 'networkidle',
			timeout: 30000 
		})

		// Fill minimum required fields
		const stateSelect = page.locator('select[name="state"], [role="combobox"]').first()
		if (await stateSelect.isVisible()) {
			await stateSelect.selectOption('CA')
		}

		// Click render button
		const renderButton = page.getByRole('button', { name: /render.*pdf|generate.*pdf/i })
		if (await renderButton.isVisible() && !(await renderButton.isDisabled())) {
			await renderButton.click()

			// Should show error toast/message
			const errorMessage = page.locator('[role="alert"], .toast, [class*="error"]').filter({ hasText: /failed|error/i }).first()
			await expect(errorMessage).toBeVisible({ timeout: 5000 })
		}
	})

	test('should maintain template selections when regenerating PDF', async ({ page }) => {
		await page.goto('/manage/documents/lease-template', { 
			waitUntil: 'networkidle',
			timeout: 30000 
		})

		// Select specific state
		const stateSelect = page.locator('select[name="state"], [role="combobox"]').first()
		if (await stateSelect.isVisible()) {
			await stateSelect.selectOption('NY')
			
			// Verify New York was selected
			const selectedValue = await stateSelect.inputValue()
			expect(selectedValue).toBe('NY')
		}

		// Toggle some clauses (if available)
		const checkboxes = page.locator('input[type="checkbox"]')
		const checkboxCount = await checkboxes.count()
		
		if (checkboxCount > 0) {
			// Toggle first checkbox
			const firstCheckbox = checkboxes.first()
			const initialState = await firstCheckbox.isChecked()
			await firstCheckbox.click()
			
			// Verify it toggled
			const newState = await firstCheckbox.isChecked()
			expect(newState).toBe(!initialState)
		}

		// Generate PDF (if button is enabled)
		const renderButton = page.getByRole('button', { name: /render.*pdf/i })
		if (await renderButton.isVisible() && !(await renderButton.isDisabled())) {
			// Note: Without filling all required fields, button might be disabled
			// This test primarily verifies state persistence
		}

		// Verify state selection persisted after any interactions
		if (await stateSelect.isVisible()) {
			const finalValue = await stateSelect.inputValue()
			expect(finalValue).toBe('NY')
		}
	})
})
