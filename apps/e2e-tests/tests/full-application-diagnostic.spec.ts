import { test, expect } from '@playwright/test'
import { loginAsOwner } from '../auth-helpers'

interface PageDiagnostics {
	page: string
	url: string
	status: 'PASS' | 'FAIL'
	consoleErrors: string[]
	consoleWarnings: string[]
	networkErrors: { method: string; endpoint: string; status: number }[]
	uiElements: { type: string; count: number }[]
	renderingIssues: string[]
	apiEndpoints: { method: string; endpoint: string; status: number }[]
	screenshot?: string
}

const diagnostics: PageDiagnostics[] = []

test.describe('Full Application Diagnostic - All Pages & Features', () => {
	test('comprehensive navigation and bug identification', async ({ page, context }) => {
		test.setTimeout(300000) // 5 minutes for full diagnostic run
		// Setup error tracking
		const consoleMessages: { type: string; message: string }[] = []
		const networkRequests: { url: string; status: number; method: string }[] = []
		const pageErrors: string[] = []

		// Listen to console messages
		page.on('console', (msg) => {
			const entry = { type: msg.type(), message: msg.text() }
			consoleMessages.push(entry)
			if (msg.type() === 'error') {
				console.log(`[CONSOLE ERROR] ${msg.text()}`)
				pageErrors.push(msg.text())
			}
			if (msg.type() === 'warning') {
				console.log(`[CONSOLE WARNING] ${msg.text()}`)
			}
		})

		// Listen to network requests
		page.on('response', (response) => {
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

		// Setup environment-aware base URL
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
		const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600'
		
		console.log('\n=== ENVIRONMENT CONFIGURATION ===')
		console.log(`[ENV] Frontend Base URL: ${baseUrl}`)
		console.log(`[ENV] API Base URL: ${apiBaseUrl}`)
		console.log(`[ENV] Node Environment: ${process.env.NODE_ENV || 'development'}`)
		
		// Login first
		console.log('\n=== AUTHENTICATION ===')
		console.log('[TEST] Starting login...')
		await loginAsOwner(page)
		console.log('[TEST] Login complete')

		// Define all pages to test
		const pagesToTest = [
			{ path: '/', name: 'Dashboard' },
			{ path: '/properties', name: 'Properties' },
			{ path: '/units', name: 'Units' },
			{ path: '/tenants', name: 'Tenants' },
			{ path: '/leases', name: 'Leases' },
			{ path: '/maintenance', name: 'Maintenance Requests' },

			// Analytics pages
			{ path: '/analytics', name: 'Analytics (Main)' },
			{ path: '/analytics/overview', name: 'Analytics - Overview' },
			{ path: '/analytics/financial', name: 'Analytics - Financial' },
			{ path: '/analytics/occupancy', name: 'Analytics - Occupancy' },
			{ path: '/analytics/leases', name: 'Analytics - Leases' },
			{ path: '/analytics/maintenance', name: 'Analytics - Maintenance' },
			{ path: '/analytics/property-performance', name: 'Analytics - Property Performance' },

			// Reports pages
			{ path: '/reports', name: 'Reports (Main)' },
			{ path: '/reports/generate', name: 'Reports - Generate' },

			// Financials pages
			{ path: '/financials', name: 'Financials (Main)' },
			{ path: '/financials/income-statement', name: 'Financials - Income Statement' },
			{ path: '/financials/cash-flow', name: 'Financials - Cash Flow' },
			{ path: '/financials/balance-sheet', name: 'Financials - Balance Sheet' },
			{ path: '/financials/tax-documents', name: 'Financials - Tax Documents' },

			// Documents & Lease Templates
			{ path: '/documents', name: 'Documents' },
			{ path: '/documents/lease-template', name: 'Lease Template Builder' },

			// Settings pages
			{ path: '/settings', name: 'Settings (Main)' },
			{ path: '/payments/methods', name: 'Payment Methods' },
			{ path: '/rent-collection', name: 'Rent Collection' }
		]

		// Test each page
		for (const { path, name } of pagesToTest) {
			console.log(`\n=== TESTING PAGE: ${name.toUpperCase()} (${path}) ===`)

			const pageData: PageDiagnostics = {
				page: name,
				url: path,
				status: 'PASS',
				consoleErrors: [],
				consoleWarnings: [],
				networkErrors: [],
				uiElements: [],
				renderingIssues: [],
				apiEndpoints: []
			}

			try {
				// Clear previous requests
				const priorRequestCount = networkRequests.length
				const priorErrorCount = pageErrors.length

				// Navigate to page
				console.log(`[NAVIGATE] Going to ${path}`)
				await page.goto(path, { waitUntil: 'domcontentloaded' })

				// Wait for auth and page to be ready
				try {
					await page.waitForFunction(() => {
						const url = window.location.pathname
						return url.includes('/') || url.includes('/tenant')
					}, { timeout: 10000 })
				} catch {
					// Page might redirect if auth fails - that's ok, we'll catch it below
				}

				console.log(`[NAVIGATE] Arrived at ${path}`)

				// Wait for main content
				try {
					await expect(page.locator('main')).toBeVisible({ timeout: 5000 })
					console.log('[RENDER] Main content visible')
				} catch {
					console.log('[RENDER] Warning: Main content not immediately visible')
					pageData.renderingIssues.push('Main content not visible')
					pageData.status = 'FAIL'
				}

				// Get page title
				const heading = await page
					.locator('main h1, main h2, [role="heading"]')
					.first()
					.textContent()
					.catch(() => 'Unknown')
				console.log(`[PAGE] Heading: "${heading}"`)

				// Count UI elements
				const buttons = await page.locator('button').count()
				const forms = await page.locator('form, [role="form"]').count()
				const tables = await page.locator('table, [role="grid"]').count()
				const inputs = await page.locator('input, textarea, select').count()
				const dialogs = await page.locator('[role="dialog"]').count()

				console.log(`[UI] Elements - Buttons: ${buttons}, Forms: ${forms}, Tables: ${tables}, Inputs: ${inputs}, Dialogs: ${dialogs}`)

				pageData.uiElements = [
					{ type: 'buttons', count: buttons },
					{ type: 'forms', count: forms },
					{ type: 'tables', count: tables },
					{ type: 'inputs', count: inputs },
					{ type: 'dialogs', count: dialogs }
				]

				// Test interactive elements if present
				if (buttons > 0) {
					console.log('[INTERACTION] Testing button interactions...')
					const firstButton = page.locator('button').first()
					await firstButton.hover()
					console.log('[INTERACTION] Button hover successful')
				}

				// Collect network requests for this page
				const pageRequests = networkRequests.slice(priorRequestCount)
				const pageErrorMessages = pageErrors.slice(priorErrorCount)

				pageData.consoleErrors = pageErrorMessages
				pageData.consoleWarnings = consoleMessages
					.filter((m) => m.type === 'warning')
					.slice(priorErrorCount)
					.map((m) => m.message)

				pageData.networkErrors = pageRequests
					.filter((r) => r.status >= 400)
					.map((r) => ({
						method: r.method,
						endpoint: r.url.split('/api/')[1] || r.url,
						status: r.status
					}))

				pageData.apiEndpoints = pageRequests
					.filter((r) => r.url.includes('/api/'))
					.map((r) => ({
						method: r.method,
						endpoint: r.url.split('/api/')[1] || r.url,
						status: r.status
					}))

				console.log(`[NETWORK] Requests made: ${pageRequests.length}`)
				console.log(`[API] Endpoints called: ${pageData.apiEndpoints.length}`)
				console.log(`[ERRORS] Network errors: ${pageData.networkErrors.length}`)
				console.log(`[ERRORS] Console errors: ${pageData.consoleErrors.length}`)

				// Take screenshot
				const screenshotName = `diagnostic-${name.toLowerCase().replace(/ /g, '-')}.png`
				await page.screenshot({ path: `test-results/${screenshotName}` })
				pageData.screenshot = screenshotName
				console.log(`[SCREENSHOT] Saved: ${screenshotName}`)

				// Small delay before next page navigation to allow state cleanup
				await page.waitForTimeout(200)

				// Check for specific UI issues based on page
				if (name === 'Properties' || name === 'Units' || name === 'Tenants' || name === 'Leases' || name === 'Maintenance Requests') {
					// Check for data tables
					const tableRows = await page.locator('tbody tr, [role="row"]').count()
					console.log(`[TABLE] Rows found: ${tableRows}`)
					if (tableRows === 0) {
						pageData.renderingIssues.push('No data found in table (might be expected if empty)')
					}
				}

				if (name === 'Dashboard') {
					// Check for stat cards
					const statCards = await page.locator('[data-testid*="stat"], .stat-card, [class*="metric"]').count()
					console.log(`[DASHBOARD] Stat cards: ${statCards}`)
					if (statCards === 0) {
						pageData.renderingIssues.push('No stat cards visible')
					}
				}

				if (name.includes('Analytics')) {
					// Check for chart/graph elements
					const charts = await page.locator('[class*="chart"], [class*="graph"], svg[class*="recharts"]').count()
					const selectElements = await page.locator('select, [role="combobox"]').count()
					console.log(`[ANALYTICS] Charts found: ${charts}, Filters: ${selectElements}`)
					if (charts === 0) {
						pageData.renderingIssues.push('No charts visible - analytics may not have loaded data')
					}
				}

				if (name.includes('Financials')) {
					// Check for financial tables or reports
					const finTables = await page.locator('table, [role="grid"]').count()
					const finReports = await page.locator('[class*="report"], [class*="statement"], [class*="financial"]').count()
					console.log(`[FINANCIALS] Tables: ${finTables}, Financial elements: ${finReports}`)
					if (finTables === 0 && finReports === 0) {
						pageData.renderingIssues.push('No financial data displayed - page may not have loaded')
					}
				}

				if (name.includes('Reports') || name === 'Documents' || name.includes('Lease Template')) {
					// Check for document-related elements
					const docElements = await page.locator('[class*="document"], [class*="pdf"], [class*="template"]').count()
					const actionButtons = await page.locator('button').count()
					console.log(`[DOCUMENTS] Document elements: ${docElements}, Action buttons: ${actionButtons}`)
				}

				diagnostics.push(pageData)
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error)
				console.log(`[ERROR] Failed to test ${name}: ${errorMsg}`)
				pageData.status = 'FAIL'
				pageData.renderingIssues.push(errorMsg)
				diagnostics.push(pageData)
			}
		}

		// ===== DETAILED DIAGNOSTIC REPORT =====
		console.log('\n' + '='.repeat(100))
		console.log('COMPREHENSIVE APPLICATION DIAGNOSTIC REPORT')
		console.log('='.repeat(100))

		const failedPages = diagnostics.filter((p) => p.status === 'FAIL')
		const pagesWithErrors = diagnostics.filter((p) => p.consoleErrors.length > 0 || p.networkErrors.length > 0)
		const totalApiErrors = diagnostics.reduce((sum, p) => sum + p.networkErrors.length, 0)
		const totalConsoleErrors = diagnostics.reduce((sum, p) => sum + p.consoleErrors.length, 0)

		console.log('\n📊 SUMMARY STATISTICS')
		console.log(`Total Pages Tested: ${diagnostics.length}`)
		console.log(`Pages with Status FAIL: ${failedPages.length}`)
		console.log(`Pages with Issues: ${pagesWithErrors.length}`)
		console.log(`Total API Errors (4xx/5xx): ${totalApiErrors}`)
		console.log(`Total Console Errors: ${totalConsoleErrors}`)

		// Detailed breakdown per page
		console.log('\n📄 DETAILED PAGE BREAKDOWN')
		console.log('-'.repeat(100))

		diagnostics.forEach((diag) => {
			console.log(`\n🔹 ${diag.page.toUpperCase()} (${diag.url})`)
			console.log(`   Status: ${diag.status === 'FAIL' ? '❌ FAILED' : '✅ PASSED'}`)

			if (diag.uiElements.length > 0) {
				console.log(`   UI Elements:`)
				diag.uiElements.forEach((el) => {
					console.log(`     • ${el.type}: ${el.count}`)
				})
			}

			if (diag.consoleErrors.length > 0) {
				console.log(`   Console Errors (${diag.consoleErrors.length}):`)
				diag.consoleErrors.slice(0, 3).forEach((err) => {
					console.log(`     ❌ ${err.substring(0, 100)}`)
				})
				if (diag.consoleErrors.length > 3) {
					console.log(`     ... and ${diag.consoleErrors.length - 3} more`)
				}
			}

			if (diag.networkErrors.length > 0) {
				console.log(`   Network Errors (${diag.networkErrors.length}):`)
				diag.networkErrors.forEach((err) => {
					console.log(`     ❌ ${err.method} ${err.endpoint} [${err.status}]`)
				})
			}

			if (diag.apiEndpoints.length > 0) {
				console.log(`   API Endpoints Called (${diag.apiEndpoints.length}):`)
				diag.apiEndpoints.slice(0, 5).forEach((ep) => {
					const status = ep.status >= 400 ? '❌' : '✅'
					console.log(`     ${status} ${ep.method} ${ep.endpoint} [${ep.status}]`)
				})
				if (diag.apiEndpoints.length > 5) {
					console.log(`     ... and ${diag.apiEndpoints.length - 5} more`)
				}
			}

			if (diag.renderingIssues.length > 0) {
				console.log(`   Rendering Issues (${diag.renderingIssues.length}):`)
				diag.renderingIssues.forEach((issue) => {
					console.log(`     ⚠️ ${issue}`)
				})
			}

			if (diag.screenshot) {
				console.log(`   Screenshot: ${diag.screenshot}`)
			}
		})

		// Critical issues summary
		console.log('\n' + '='.repeat(100))
		console.log('🚨 CRITICAL ISSUES & BUGS FOUND')
		console.log('='.repeat(100))

		let criticalIssueCount = 0

		diagnostics.forEach((diag) => {
			if (diag.networkErrors.length > 0) {
				diag.networkErrors.forEach((err) => {
					criticalIssueCount++
					console.log(
						`\n[${criticalIssueCount}] ${diag.page} - API ERROR`
					)
					console.log(`    ${err.method} ${err.endpoint}`)
					console.log(`    Status Code: ${err.status}`)
					if (err.status === 404) {
						console.log(`    → Endpoint not implemented or incorrect route`)
					} else if (err.status === 401 || err.status === 403) {
						console.log(`    → Authentication/Authorization issue`)
					} else if (err.status >= 500) {
						console.log(`    → Server error - check backend logs`)
					}
				})
			}

			if (diag.consoleErrors.length > 0) {
				diag.consoleErrors.forEach((err) => {
					criticalIssueCount++
					console.log(`\n[${criticalIssueCount}] ${diag.page} - CONSOLE ERROR`)
					console.log(`    ${err.substring(0, 150)}`)
				})
			}

			if (diag.status === 'FAIL') {
				diag.renderingIssues.forEach((issue) => {
					criticalIssueCount++
					console.log(`\n[${criticalIssueCount}] ${diag.page} - RENDERING ISSUE`)
					console.log(`    ${issue}`)
				})
			}
		})

		console.log('\n' + '='.repeat(100))
		console.log(`TOTAL CRITICAL ISSUES FOUND: ${criticalIssueCount}`)
		console.log('='.repeat(100))

		// Assertions
		expect(failedPages, 'No pages should have FAIL status').toHaveLength(0)
		expect(totalApiErrors, 'Should have minimal API errors').toBeLessThan(10)
	})
})
