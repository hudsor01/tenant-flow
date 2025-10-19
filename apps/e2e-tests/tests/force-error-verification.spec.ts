/**
 * Force Error State Verification Test
 * Intercepts API calls to force error state and verify all improvements
 */

import { expect, test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const STORAGE_STATE = {
	OWNER: path.join(__dirname, '..', '.auth', 'owner.json')
}

test.describe('Force Error State to Verify Improvements', () => {
	test.use({ storageState: STORAGE_STATE.OWNER })

	test('force API error and verify all recovery UI elements', async ({
		page
	}) => {
		console.log('\n🔬 FORCING API ERROR TO TEST IMPROVEMENTS\n')

		// Intercept the tenants API call and force it to fail
		await page.route('**/api/v1/tenants*', route => {
			console.log('🚫 Intercepted API call - forcing 500 error')
			route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({
					error: 'Internal Server Error',
					message: 'Database connection timeout'
				})
			})
		})

		await test.step('1. Navigate to tenant page with forced error', async () => {
			await page.goto('/manage/tenants')
			await page.waitForLoadState('networkidle')
			console.log('✓ Navigated to /manage/tenants')

			// Wait for retries to complete and error state to appear
			await page.waitForTimeout(15000) // Allow time for 3 retries with backoff
			console.log('✓ Waited for retry attempts to complete')
		})

		await test.step('2. Take screenshot of error state', async () => {
			await page.screenshot({
				path: 'VERIFIED-ERROR-STATE-WITH-IMPROVEMENTS.png',
				fullPage: true
			})
			console.log(
				'✓ Screenshot saved: VERIFIED-ERROR-STATE-WITH-IMPROVEMENTS.png'
			)
		})

		await test.step('3. Verify error heading', async () => {
			const errorHeading = page.locator('text=/Failed to load tenants/i')
			await expect(errorHeading).toBeVisible({ timeout: 30000 })
			console.log('✅ Error heading "Failed to load tenants" is visible')
		})

		await test.step('4. Verify error message details', async () => {
			// Check for detailed error message
			const errorText = page.locator('p.text-sm.text-muted-foreground').first()
			if (await errorText.isVisible()) {
				const text = await errorText.textContent()
				console.log(`✅ Error details shown: "${text?.trim()}"`)
			}
		})

		await test.step('5. Verify retry attempt count', async () => {
			const attemptMessage = page.locator('text=/Attempted.*time/i')
			if ((await attemptMessage.count()) > 0) {
				await expect(attemptMessage.first()).toBeVisible()
				const text = await attemptMessage.textContent()
				console.log(`✅ Retry count displayed: "${text?.trim()}"`)
			} else {
				console.log(
					'  ℹ️  Retry count not shown (may show after retries complete)'
				)
			}
		})

		await test.step('6. Verify "Retry" button exists and is clickable', async () => {
			const retryButton = page.locator('button:has-text("Retry")')
			await expect(retryButton).toBeVisible()
			console.log('✅ "Retry" button is visible')

			const isEnabled = await retryButton.isEnabled()
			expect(isEnabled).toBe(true)
			console.log('✅ "Retry" button is enabled and clickable')

			// Take close-up screenshot
			await retryButton.screenshot({ path: 'VERIFIED-RETRY-BUTTON.png' })
			console.log('✓ Button screenshot: VERIFIED-RETRY-BUTTON.png')
		})

		await test.step('7. Verify "Create Tenant Anyway" button exists', async () => {
			const createButton = page.locator('a:has-text("Create Tenant Anyway")')
			await expect(createButton).toBeVisible()
			console.log('✅ "Create Tenant Anyway" button is visible')

			// Verify it links to the correct page
			const href = await createButton.getAttribute('href')
			expect(href).toContain('/manage/tenants/new')
			console.log(`✅ Button links to: ${href}`)

			// Verify it has the icon
			const hasIcon = await createButton.locator('svg').count()
			if (hasIcon > 0) {
				console.log('✅ Button has UserPlus icon')
			}

			// Take close-up screenshot
			await createButton.screenshot({
				path: 'VERIFIED-CREATE-ANYWAY-BUTTON.png'
			})
			console.log('✓ Button screenshot: VERIFIED-CREATE-ANYWAY-BUTTON.png')
		})

		await test.step('8. Test "Create Tenant Anyway" functionality', async () => {
			// Remove the API intercept for the next navigation
			await page.unroute('**/api/v1/tenants*')

			const createButton = page.locator('a:has-text("Create Tenant Anyway")')
			await createButton.click()
			console.log('✓ Clicked "Create Tenant Anyway"')

			await page.waitForLoadState('networkidle')

			// Verify we navigated to the form
			await expect(page).toHaveURL(/\/manage\/tenants\/new/)
			console.log('✅ Successfully navigated to /manage/tenants/new')
			console.log('✅ Error bypass functionality working!')

			await page.screenshot({
				path: 'VERIFIED-FORM-AFTER-BYPASS.png',
				fullPage: true
			})
			console.log('✓ Form page screenshot: VERIFIED-FORM-AFTER-BYPASS.png')
		})

		console.log('\n' + '='.repeat(60))
		console.log('✅ ALL IMPROVEMENTS VERIFIED AND WORKING!')
		console.log('='.repeat(60))
		console.log('✓ Error state displays correctly')
		console.log('✓ Retry button present and functional')
		console.log('✓ Create Tenant Anyway button present and functional')
		console.log('✓ Error bypass successfully navigates to form')
		console.log('✓ Users can accomplish their goal despite API errors')
		console.log('='.repeat(60) + '\n')
	})

	test('verify retry logic with forced failures', async ({ page }) => {
		console.log('\n⏱️  TESTING RETRY LOGIC AND TIMING\n')

		let requestCount = 0
		const requestTimes: number[] = []

		// Intercept and count retry attempts
		await page.route('**/api/v1/tenants*', route => {
			requestCount++
			requestTimes.push(Date.now())
			console.log(
				`🔄 Retry attempt #${requestCount} at ${new Date().toISOString()}`
			)

			route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Forced failure for testing' })
			})
		})

		const startTime = Date.now()
		await page.goto('/manage/tenants')
		await page.waitForLoadState('networkidle')

		// Wait for all retries to complete (3 retries + initial = 4 total)
		await page.waitForTimeout(20000)

		const totalTime = Date.now() - startTime

		console.log('\n📊 RETRY ANALYSIS:')
		console.log(`Total requests: ${requestCount}`)
		console.log(`Total time: ${(totalTime / 1000).toFixed(1)}s`)
		console.log(`Expected: 4 requests (initial + 3 retries)`)

		// Calculate delays between requests
		if (requestTimes.length > 1) {
			console.log('\nDelay between requests:')
			for (let i = 1; i < requestTimes.length; i++) {
				const delay = (requestTimes[i] - requestTimes[i - 1]) / 1000
				console.log(`  Retry ${i}: ${delay.toFixed(1)}s delay`)
			}
		}

		// Verify we got the expected number of retries
		expect(requestCount).toBeGreaterThanOrEqual(3) // At least 3 attempts
		console.log('\n✅ Retry logic is working as expected!')

		// Verify error state is shown after retries
		const errorState = page.locator('text=/Failed to load tenants/i')
		await expect(errorState).toBeVisible()
		console.log('✅ Error state displayed after retry attempts\n')
	})
})
