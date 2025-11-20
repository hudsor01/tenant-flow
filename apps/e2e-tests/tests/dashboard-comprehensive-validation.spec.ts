import { test, expect } from '@playwright/test'
import { loginAsOwner } from '../auth-helpers'

interface PageValidation {
	url: string
	title: string
	hasErrors: boolean
	consoleErrors: string[]
	networkErrors: string[]
	renderingIssues: string[]
	apiEndpoints: string[]
}

const pageValidations: PageValidation[] = []

test.describe('Dashboard Comprehensive Navigation & Validation', () => {
	test('should validate complete dashboard navigation with network and console monitoring', async ({
		page,
		context
	}) => {
		// Setup error tracking
		const consoleMessages: { type: string; message: string }[] = []
		const networkRequests: { url: string; status: number; method: string }[] = []
		const renderingErrors: string[] = []

		// Listen to console messages
		page.on('console', msg => {
			consoleMessages.push({
				type: msg.type(),
				message: msg.text()
			})
			if (msg.type() === 'error') {
				console.log(`[CONSOLE ERROR] ${msg.text()}`)
			}
		})

		// Listen to network requests
		page.on('response', response => {
			networkRequests.push({
				url: response.url(),
				status: response.status(),
				method: response.request().method()
			})
			if (response.status() >= 400) {
				console.log(
					`[API ERROR] ${response.request().method()} ${response.url()} - ${response.status()}`
				)
			}
		})

		// Listen to page crashes or errors
		page.on('framenavigated', () => {
			console.log('[PAGE] Navigation detected')
		})

		// Login
		console.log('[TEST] Starting login...')
		await loginAsOwner(page)
		console.log('[TEST] Login complete')

		// Define dashboard pages to test
		const dashboardPages = [
			{ path: '/manage', title: 'Dashboard' },
			{ path: '/manage/properties', title: 'Properties' },
			{ path: '/manage/units', title: 'Units' },
			{ path: '/manage/leases', title: 'Leases' },
			{ path: '/manage/maintenance', title: 'Maintenance' },
			{ path: '/manage/settings', title: 'Settings' }
		]

		// Test each page
		for (const { path, title } of dashboardPages) {
			console.log(`\n[TEST] Testing page: ${title} (${path})`)

			const pageNetwork: string[] = []
			const pageConsoleErrors: string[] = []
			const apiErrors: string[] = []

			// Clear previous request tracking
			const priorRequestCount = networkRequests.length

			try {
				// Navigate to page
				console.log(`[NAVIGATE] Going to ${path}`)
				await page.goto(path, { waitUntil: 'networkidle' })
				console.log(`[NAVIGATE] Arrived at ${path}`)

				// Get page title/heading
				const heading = await page
					.locator('main h1, main h2, [role="heading"]')
					.first()
					.textContent()
				console.log(`[PAGE] Main heading: "${heading}"`)

				// Wait for main content
				await expect(page.locator('main')).toBeVisible()

				// Check for loading states
				const loadingIndicators = await page.locator('[data-testid*="loading"], .spinner, [aria-busy="true"]').count()
				console.log(`[PAGE] Loading indicators visible: ${loadingIndicators}`)

				// Get screenshot for visual inspection
				await page.screenshot({ path: `test-results/dashboard-${title.toLowerCase()}.png` })
				console.log(`[SCREENSHOT] Saved screenshot for ${title}`)

				// Analyze network requests for this page
				const pageRequests = networkRequests.slice(priorRequestCount)
				console.log(`[NETWORK] Requests made: ${pageRequests.length}`)

				pageRequests.forEach(req => {
					if (req.status >= 400) {
						const errorMsg = `${req.method} ${req.url} returned ${req.status}`
						apiErrors.push(errorMsg)
						console.log(`[ERROR] ${errorMsg}`)
					}
					// Log API endpoints called
					if (req.url.includes('/api/')) {
						console.log(`[API] ${req.method} ${req.url.split('/api/')[1]} - ${req.status}`)
					}
				})

				// Check for console errors on this page
				const pageErrors = consoleMessages.filter(m => m.type === 'error').map(m => m.message)
				pageConsoleErrors.push(...pageErrors)

				if (pageErrors.length > 0) {
					console.log(`[CONSOLE] Errors on ${title}:`)
					pageErrors.forEach(err => console.log(`  - ${err}`))
				}

				// Verify main content is visible
				const mainContent = page.locator('main')
				await expect(mainContent).toBeVisible()

				// Check for interactive elements
				const buttons = await page.locator('button').count()
				const forms = await page.locator('form, [role="form"]').count()
				console.log(`[UI] Interactive elements - Buttons: ${buttons}, Forms: ${forms}`)

				// Verify no 404s or 500s
				const hasApiErrors = pageRequests.some(r => r.status >= 400)
				if (hasApiErrors) {
					console.log(`[WARNING] Page ${title} has API errors`)
				}

				// Store validation result
				pageValidations.push({
					url: path,
					title,
					hasErrors: pageConsoleErrors.length > 0 || apiErrors.length > 0,
					consoleErrors: pageConsoleErrors,
					networkErrors: apiErrors,
					renderingIssues: [],
					apiEndpoints: pageRequests
						.filter(r => r.url.includes('/api/'))
						.map(r => `${r.method} ${r.url.split('/api/')[1]} [${r.status}]`)
				})
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error)
				console.log(`[ERROR] Failed to load ${title}: ${errorMsg}`)
				pageValidations.push({
					url: path,
					title,
					hasErrors: true,
					consoleErrors: [errorMsg],
					networkErrors: [],
					renderingIssues: [errorMsg],
					apiEndpoints: []
				})
			}
		}

		// Print comprehensive validation report
		console.log('\n' + '='.repeat(80))
		console.log('DASHBOARD VALIDATION REPORT')
		console.log('='.repeat(80))

		pageValidations.forEach(validation => {
			console.log(`\n📄 Page: ${validation.title} (${validation.url})`)
			console.log(`   Status: ${validation.hasErrors ? '❌ ISSUES FOUND' : '✅ OK'}`)

			if (validation.consoleErrors.length > 0) {
				console.log(`   Console Errors: ${validation.consoleErrors.length}`)
				validation.consoleErrors.slice(0, 3).forEach(err => {
					console.log(`     - ${err.substring(0, 80)}`)
				})
			}

			if (validation.networkErrors.length > 0) {
				console.log(`   Network Errors: ${validation.networkErrors.length}`)
				validation.networkErrors.forEach(err => {
					console.log(`     - ${err}`)
				})
			}

			if (validation.apiEndpoints.length > 0) {
				console.log(`   API Endpoints Called: ${validation.apiEndpoints.length}`)
				validation.apiEndpoints.forEach(endpoint => {
					console.log(`     - ${endpoint}`)
				})
			}

			if (validation.renderingIssues.length > 0) {
				console.log(`   Rendering Issues: ${validation.renderingIssues.length}`)
				validation.renderingIssues.forEach(issue => {
					console.log(`     - ${issue}`)
				})
			}
		})

		console.log('\n' + '='.repeat(80))
		console.log('SUMMARY')
		console.log('='.repeat(80))

		const pagesWithErrors = pageValidations.filter(p => p.hasErrors)
		const totalApiErrors = pageValidations.reduce((sum, p) => sum + p.networkErrors.length, 0)
		const totalConsoleErrors = pageValidations.reduce((sum, p) => sum + p.consoleErrors.length, 0)

		console.log(`Total Pages Tested: ${pageValidations.length}`)
		console.log(`Pages with Issues: ${pagesWithErrors.length}`)
		console.log(`Total API Errors: ${totalApiErrors}`)
		console.log(`Total Console Errors: ${totalConsoleErrors}`)

		// Assert no critical errors
		expect(totalApiErrors, 'Should have no API errors').toBe(0)
		expect(pagesWithErrors, 'All pages should load without errors').toHaveLength(0)
	})
})
