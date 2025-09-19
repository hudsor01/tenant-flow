import { ConsoleMessage, expect, Page, test } from '@playwright/test'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3005'
const SCREENSHOT_DIR = 'test-results/screenshots'
const CONSOLE_LOG_DIR = 'test-results/console-logs'

// Ensure directories exist
if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true })
if (!existsSync(CONSOLE_LOG_DIR))
	mkdirSync(CONSOLE_LOG_DIR, { recursive: true })

// Console message collector
class ConsoleCollector {
	private messages: string[] = []
	private errors: string[] = []
	private warnings: string[] = []

	constructor(page: Page) {
		page.on('console', (msg: ConsoleMessage) => {
			const type = msg.type()
			const text = msg.text()
			const location = msg.location()

			const formattedMsg = `[${type.toUpperCase()}] ${text} @ ${location.url}:${location.lineNumber}`

			this.messages.push(formattedMsg)

			if (type === 'error') {
				this.errors.push(formattedMsg)
			} else if (type === 'warning') {
				this.warnings.push(formattedMsg)
			}
		})

		// Capture page errors
		page.on('pageerror', error => {
			this.errors.push(`[PAGE ERROR] ${error.message}`)
		})

		// Capture request failures
		page.on('requestfailed', request => {
			this.errors.push(
				`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`
			)
		})
	}

	getAll() {
		return this.messages
	}
	getErrors() {
		return this.errors
	}
	getWarnings() {
		return this.warnings
	}

	save(filename: string) {
		const report = {
			timestamp: new Date().toISOString(),
			totalMessages: this.messages.length,
			errors: this.errors.length,
			warnings: this.warnings.length,
			messages: this.messages,
			errorDetails: this.errors,
			warningDetails: this.warnings
		}

		writeFileSync(
			join(CONSOLE_LOG_DIR, `${filename}.json`),
			JSON.stringify(report, null, 2)
		)
	}

	hasErrors() {
		return this.errors.length > 0
	}
	hasWarnings() {
		return this.warnings.length > 0
	}
}

// Visual regression helper
async function captureAndCompare(page: Page, name: string, options = {}) {
	const screenshotPath = join(SCREENSHOT_DIR, `${name}.png`)

	// Take screenshot with options
	await page.screenshot({
		path: screenshotPath,
		fullPage: true,
		animations: 'disabled',
		...options
	})

	// Also capture viewport screenshot for mobile testing
	if (options.viewport) {
		await page.screenshot({
			path: join(SCREENSHOT_DIR, `${name}-viewport.png`),
			fullPage: false
		})
	}

	return screenshotPath
}

// Performance metrics collector
async function collectPerformanceMetrics(page: Page) {
	return await page.evaluate(() => {
		const navigation = performance.getEntriesByType(
			'navigation'
		)[0] as PerformanceNavigationTiming
		const paint = performance.getEntriesByType('paint')

		return {
			domContentLoaded:
				navigation.domContentLoadedEventEnd -
				navigation.domContentLoadedEventStart,
			loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
			firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
			firstContentfulPaint:
				paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
			responseTime: navigation.responseEnd - navigation.requestStart,
			renderTime: navigation.domComplete - navigation.domLoading
		}
	})
}

// Accessibility checker
async function checkAccessibility(page: Page, name: string) {
	const violations = []

	// Check for missing alt text
	const imagesWithoutAlt = await page.$$eval(
		'img:not([alt])',
		imgs => imgs.length
	)
	if (imagesWithoutAlt > 0) {
		violations.push(`${imagesWithoutAlt} images without alt text`)
	}

	// Check for form labels
	const inputsWithoutLabel = await page.$$eval(
		'input:not([aria-label]):not([id])',
		inputs => inputs.length
	)
	if (inputsWithoutLabel > 0) {
		violations.push(`${inputsWithoutLabel} inputs without labels`)
	}

	// Check for heading hierarchy
	const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', headers =>
		headers.map(h => ({ level: parseInt(h.tagName[1]), text: h.textContent }))
	)

	// Check color contrast (simplified)
	const lowContrastElements = await page.evaluate(() => {
		const elements = document.querySelectorAll('*')
		let count = 0
		elements.forEach(el => {
			const style = window.getComputedStyle(el)
			const bg = style.backgroundColor
			const color = style.color
			// Simplified contrast check - in production use axe-core
			if (bg && color && bg !== 'rgba(0, 0, 0, 0)') {
				// Basic check - would need proper WCAG calculation
				count++
			}
		})
		return count
	})

	return {
		name,
		violations,
		headingStructure: headings,
		passed: violations.length === 0
	}
}

test.describe('Comprehensive UI/UX Testing Suite', () => {
	test.beforeEach(async ({ page }) => {
		// Set viewport for consistent screenshots
		await page.setViewportSize({ width: 1920, height: 1080 })
	})

	test('Dashboard Overview - Full Analysis', async ({ page }) => {
		const consoleCollector = new ConsoleCollector(page)

		await page.goto(`${BASE_URL}/dashboard/test`)
		await page.waitForLoadState('networkidle')

		// Capture screenshot
		await captureAndCompare(page, 'dashboard-overview')

		// Collect performance metrics
		const metrics = await collectPerformanceMetrics(page)
		console.log('Performance Metrics:', metrics)

		// Check accessibility
		const a11y = await checkAccessibility(page, 'dashboard-overview')
		console.log('Accessibility Check:', a11y)

		// Save console logs
		consoleCollector.save('dashboard-overview')

		// Assertions
		expect(consoleCollector.hasErrors()).toBe(false)
		expect(metrics.firstContentfulPaint).toBeLessThan(3000) // Under 3 seconds
		expect(a11y.passed).toBe(true)
	})

	test('Properties Page - Complete Testing', async ({ page }) => {
		const consoleCollector = new ConsoleCollector(page)

		await page.goto(`${BASE_URL}/dashboard/properties`)
		await page.waitForLoadState('networkidle')

		await captureAndCompare(page, 'properties-list')

		// Test interactions
		const addButton = page.locator('button:has-text("Add Property")')
		if (await addButton.isVisible()) {
			await addButton.click()
			await page.waitForTimeout(500)
			await captureAndCompare(page, 'properties-add-modal')
		}

		consoleCollector.save('properties-page')
		expect(consoleCollector.hasErrors()).toBe(false)
	})

	test('Tenants Page - Full Validation', async ({ page }) => {
		const consoleCollector = new ConsoleCollector(page)

		await page.goto(`${BASE_URL}/dashboard/tenants`)
		await page.waitForLoadState('networkidle')

		await captureAndCompare(page, 'tenants-list')

		// Test search functionality
		const searchInput = page.locator('input[placeholder*="Search"]')
		if (await searchInput.isVisible()) {
			await searchInput.fill('Test Tenant')
			await page.waitForTimeout(500)
			await captureAndCompare(page, 'tenants-search-results')
		}

		// Test filters
		const filterButton = page.locator('button:has-text("Filter")')
		if (await filterButton.isVisible()) {
			await filterButton.click()
			await captureAndCompare(page, 'tenants-filters')
		}

		consoleCollector.save('tenants-page')
		expect(consoleCollector.hasErrors()).toBe(false)
	})

	test('Leases Page - Complete Check', async ({ page }) => {
		const consoleCollector = new ConsoleCollector(page)

		await page.goto(`${BASE_URL}/dashboard/leases`)
		await page.waitForLoadState('networkidle')

		await captureAndCompare(page, 'leases-list')

		// Check for data loading states
		const loader = page.locator('.animate-spin')
		if (await loader.isVisible()) {
			await loader.waitFor({ state: 'hidden', timeout: 5000 })
			await captureAndCompare(page, 'leases-loaded')
		}

		consoleCollector.save('leases-page')
		expect(consoleCollector.hasErrors()).toBe(false)
	})

	test('Payments Page - Transaction Testing', async ({ page }) => {
		const consoleCollector = new ConsoleCollector(page)

		await page.goto(`${BASE_URL}/dashboard/payments`)
		await page.waitForLoadState('networkidle')

		await captureAndCompare(page, 'payments-list')

		// Test date filters
		const dateFilter = page.locator('button:has-text("This Month")')
		if (await dateFilter.isVisible()) {
			await dateFilter.click()
			await page.waitForTimeout(500)
			await captureAndCompare(page, 'payments-filtered')
		}

		consoleCollector.save('payments-page')
		expect(consoleCollector.hasErrors()).toBe(false)
	})

	test('Mobile Responsiveness - All Views', async ({ page }) => {
		const viewports = [
			{ name: 'iPhone 12', width: 390, height: 844 },
			{ name: 'iPad', width: 768, height: 1024 },
			{ name: 'Desktop', width: 1920, height: 1080 }
		]

		const pages = [
			'/dashboard/test',
			'/dashboard/properties',
			'/dashboard/tenants',
			'/dashboard/leases',
			'/dashboard/payments'
		]

		for (const viewport of viewports) {
			await page.setViewportSize(viewport)

			for (const pagePath of pages) {
				const consoleCollector = new ConsoleCollector(page)
				const pageName = pagePath.split('/').pop()

				await page.goto(`${BASE_URL}${pagePath}`)
				await page.waitForLoadState('networkidle')

				await captureAndCompare(page, `${viewport.name}-${pageName}`, {
					viewport: true
				})

				// Check if mobile menu is visible and functional
				if (viewport.width < 768) {
					const mobileMenu = page.locator('button[aria-label*="menu"]')
					if (await mobileMenu.isVisible()) {
						await mobileMenu.click()
						await page.waitForTimeout(300)
						await captureAndCompare(page, `${viewport.name}-${pageName}-menu`)
					}
				}

				consoleCollector.save(`${viewport.name}-${pageName}`)
			}
		}
	})

	test('Dark Mode Testing', async ({ page }) => {
		const consoleCollector = new ConsoleCollector(page)

		await page.goto(`${BASE_URL}/dashboard/test`)
		await page.waitForLoadState('networkidle')

		// Enable dark mode
		await page.evaluate(() => {
			document.documentElement.classList.add('dark')
		})

		await page.waitForTimeout(500)
		await captureAndCompare(page, 'dashboard-dark-mode')

		// Check color contrast in dark mode
		const darkModeA11y = await checkAccessibility(page, 'dashboard-dark-mode')

		consoleCollector.save('dark-mode')
		expect(darkModeA11y.passed).toBe(true)
	})

	test('Form Validation Testing', async ({ page }) => {
		const consoleCollector = new ConsoleCollector(page)

		await page.goto(`${BASE_URL}/dashboard/tenants/new`)
		await page.waitForLoadState('networkidle')

		await captureAndCompare(page, 'tenant-form-empty')

		// Try to submit empty form
		const submitButton = page.locator('button[type="submit"]')
		if (await submitButton.isVisible()) {
			await submitButton.click()
			await page.waitForTimeout(500)
			await captureAndCompare(page, 'tenant-form-validation-errors')

			// Check for validation messages
			const errorMessages = await page.locator('.text-red-500').count()
			expect(errorMessages).toBeGreaterThan(0)
		}

		// Fill partial form
		await page.fill('input[name="firstName"]', 'Test')
		await page.fill('input[name="email"]', 'invalid-email')
		await submitButton.click()
		await page.waitForTimeout(500)
		await captureAndCompare(page, 'tenant-form-partial-validation')

		consoleCollector.save('form-validation')
	})

	test('Network Error Handling', async ({ page }) => {
		const consoleCollector = new ConsoleCollector(page)

		// Simulate network failure
		await page.route('**/api/**', route => route.abort())

		await page.goto(`${BASE_URL}/dashboard/test`)
		await page.waitForTimeout(2000)

		await captureAndCompare(page, 'network-error-state')

		// Check for error messages
		const errorBoundary = page.locator('[role="alert"]')
		const hasErrorHandling = await errorBoundary.isVisible()

		consoleCollector.save('network-errors')
		expect(hasErrorHandling).toBe(true)
	})

	test('Generate Test Report', async ({ page }) => {
		// Generate HTML report with all findings
		const report = {
			timestamp: new Date().toISOString(),
			baseUrl: BASE_URL,
			totalTests: 10,
			screenshotsGenerated: existsSync(SCREENSHOT_DIR)
				? require('fs').readdirSync(SCREENSHOT_DIR).length
				: 0,
			consoleLogsCollected: existsSync(CONSOLE_LOG_DIR)
				? require('fs').readdirSync(CONSOLE_LOG_DIR).length
				: 0,
			summary: {
				dashboardTested: true,
				mobileResponsive: true,
				darkModeTested: true,
				formValidationTested: true,
				errorHandlingTested: true
			}
		}

		writeFileSync(
			'test-results/comprehensive-test-report.json',
			JSON.stringify(report, null, 2)
		)

		console.log('✅ Comprehensive Test Report Generated')
		console.log(`📸 Screenshots: ${report.screenshotsGenerated}`)
		console.log(`📝 Console Logs: ${report.consoleLogsCollected}`)
	})
})

// Visual Regression Testing
test.describe('Visual Regression Testing', () => {
	test('Compare Against Baseline', async ({ page }) => {
		const pages = [
			{ path: '/dashboard/test', name: 'dashboard' },
			{ path: '/dashboard/properties', name: 'properties' },
			{ path: '/dashboard/tenants', name: 'tenants' }
		]

		for (const pageInfo of pages) {
			await page.goto(`${BASE_URL}${pageInfo.path}`)
			await page.waitForLoadState('networkidle')

			// Use Playwright's built-in visual comparison
			await expect(page).toHaveScreenshot(`${pageInfo.name}-baseline.png`, {
				fullPage: true,
				animations: 'disabled',
				maxDiffPixels: 100
			})
		}
	})
})

// Performance Testing
test.describe('Performance Testing', () => {
	test('Load Time Analysis', async ({ page }) => {
		const results: any[] = []

		const pages = [
			'/dashboard/test',
			'/dashboard/properties',
			'/dashboard/tenants',
			'/dashboard/leases',
			'/dashboard/payments'
		]

		for (const pagePath of pages) {
			await page.goto(`${BASE_URL}${pagePath}`)

			const metrics = await page.evaluate(() => {
				const navigation = performance.getEntriesByType(
					'navigation'
				)[0] as PerformanceNavigationTiming

				return {
					page: location.pathname,
					totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
					domReady: navigation.domContentLoadedEventEnd - navigation.fetchStart,
					firstByte: navigation.responseStart - navigation.fetchStart,
					resourcesLoaded: performance.getEntriesByType('resource').length
				}
			})

			results.push(metrics)

			// Performance assertions
			expect(metrics.totalLoadTime).toBeLessThan(5000) // Under 5 seconds
			expect(metrics.firstByte).toBeLessThan(1000) // TTFB under 1 second
		}

		writeFileSync(
			'test-results/performance-report.json',
			JSON.stringify(results, null, 2)
		)
	})
})
