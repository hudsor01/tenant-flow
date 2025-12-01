import { test, expect } from '@playwright/test'
import { createLogger } from '@repo/shared/lib/frontend-logger'
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
const logger = createLogger({ component: 'FullDiagnosticE2E' })

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
				logger.error(`[CONSOLE ERROR] ${msg.text()}`)
				pageErrors.push(msg.text())
			}
			if (msg.type() === 'warning') {
				logger.warn(`[CONSOLE WARNING] ${msg.text()}`)
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
				logger.error(
					`[API ERROR] ${response.request().method()} ${response.url()} - ${response.status()}`
				)
			}
		})

		// Setup environment-aware base URL
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
		const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600'
		
		logger.info('\n=== ENVIRONMENT CONFIGURATION ===')
		logger.info(`[ENV] Frontend Base URL: ${baseUrl}`)
		logger.info(`[ENV] API Base URL: ${apiBaseUrl}`)
		logger.info(`[ENV] Node Environment: ${process.env.NODE_ENV || 'development'}`)
		
		// Login first
		logger.info('\n=== AUTHENTICATION ===')
		logger.info('[TEST] Starting login...')
		await loginAsOwner(page)
		logger.info('[TEST] Login complete')

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
			logger.info(`\n=== TESTING PAGE: ${name.toUpperCase()} (${path}) ===`)

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
				logger.info(`[NAVIGATE] Going to ${path}`)
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

				logger.info(`[NAVIGATE] Arrived at ${path}`)

				// Wait for main content
				try {
					await expect(page.locator('main')).toBeVisible({ timeout: 5000 })
					logger.info('[RENDER] Main content visible')
				} catch {
					logger.info('[RENDER] Warning: Main content not immediately visible')
					pageData.renderingIssues.push('Main content not visible')
					pageData.status = 'FAIL'
				}

				// Get page title
				const heading = await page
					.locator('main h1, main h2, [role="heading"]')
					.first()
					.textContent()
					.catch(() => 'Unknown')
				logger.info(`[PAGE] Heading: "${heading}"`)

				// Count UI elements
				const buttons = await page.locator('button').count()
				const forms = await page.locator('form, [role="form"]').count()
				const tables = await page.locator('table, [role="grid"]').count()
				const inputs = await page.locator('input, textarea, select').count()
				const dialogs = await page.locator('[role="dialog"]').count()

				logger.info(`[UI] Elements - Buttons: ${buttons}, Forms: ${forms}, Tables: ${tables}, Inputs: ${inputs}, Dialogs: ${dialogs}`)

				pageData.uiElements = [
					{ type: 'buttons', count: buttons },
					{ type: 'forms', count: forms },
					{ type: 'tables', count: tables },
					{ type: 'inputs', count: inputs },
					{ type: 'dialogs', count: dialogs }
				]

				// Test interactive elements if present
				if (buttons > 0) {
					logger.info('[INTERACTION] Testing button interactions...')
					const firstButton = page.locator('button').first()
					await firstButton.hover()
					logger.info('[INTERACTION] Button hover successful')
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

				logger.info(`[NETWORK] Requests made: ${pageRequests.length}`)
				logger.info(`[API] Endpoints called: ${pageData.apiEndpoints.length}`)
				logger.info(`[ERRORS] Network errors: ${pageData.networkErrors.length}`)
				logger.info(`[ERRORS] Console errors: ${pageData.consoleErrors.length}`)

				// Take screenshot
				const screenshotName = `diagnostic-${name.toLowerCase().replace(/ /g, '-')}.png`
				await page.screenshot({ path: `test-results/${screenshotName}` })
				pageData.screenshot = screenshotName
				logger.info(`[SCREENSHOT] Saved: ${screenshotName}`)

				// Small delay before next page navigation to allow state cleanup
				await page.waitForTimeout(200)

				// Check for specific UI issues based on page
				if (name === 'Properties' || name === 'Units' || name === 'Tenants' || name === 'Leases' || name === 'Maintenance Requests') {
					// Check for data tables
					const tableRows = await page.locator('tbody tr, [role="row"]').count()
					logger.info(`[TABLE] Rows found: ${tableRows}`)
					if (tableRows === 0) {
						pageData.renderingIssues.push('No data found in table (might be expected if empty)')
					}
				}

				if (name === 'Dashboard') {
					// Check for stat cards
					const statCards = await page.locator('[data-testid*="stat"], .stat-card, [class*="metric"]').count()
					logger.info(`[DASHBOARD] Stat cards: ${statCards}`)
					if (statCards === 0) {
						pageData.renderingIssues.push('No stat cards visible')
					}
				}

				if (name.includes('Analytics')) {
					// Check for chart/graph elements
					const charts = await page.locator('[class*="chart"], [class*="graph"], svg[class*="recharts"]').count()
					const selectElements = await page.locator('select, [role="combobox"]').count()
					logger.info(`[ANALYTICS] Charts found: ${charts}, Filters: ${selectElements}`)
					if (charts === 0) {
						pageData.renderingIssues.push('No charts visible - analytics may not have loaded data')
					}
				}

				if (name.includes('Financials')) {
					// Check for financial tables or reports
					const finTables = await page.locator('table, [role="grid"]').count()
					const finReports = await page.locator('[class*="report"], [class*="statement"], [class*="financial"]').count()
					logger.info(`[FINANCIALS] Tables: ${finTables}, Financial elements: ${finReports}`)
					if (finTables === 0 && finReports === 0) {
						pageData.renderingIssues.push('No financial data displayed - page may not have loaded')
					}
				}

				if (name.includes('Reports') || name === 'Documents' || name.includes('Lease Template')) {
					// Check for document-related elements
					const docElements = await page.locator('[class*="document"], [class*="pdf"], [class*="template"]').count()
					const actionButtons = await page.locator('button').count()
					logger.info(`[DOCUMENTS] Document elements: ${docElements}, Action buttons: ${actionButtons}`)
				}

				diagnostics.push(pageData)
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error)
				logger.info(`[ERROR] Failed to test ${name}: ${errorMsg}`)
				pageData.status = 'FAIL'
				pageData.renderingIssues.push(errorMsg)
				diagnostics.push(pageData)
			}
		}

		// ===== DETAILED DIAGNOSTIC REPORT =====
		logger.info('\n' + '='.repeat(100))
		logger.info('COMPREHENSIVE APPLICATION DIAGNOSTIC REPORT')
		logger.info('='.repeat(100))

		const failedPages = diagnostics.filter((p) => p.status === 'FAIL')
		const pagesWithErrors = diagnostics.filter((p) => p.consoleErrors.length > 0 || p.networkErrors.length > 0)
		const totalApiErrors = diagnostics.reduce((sum, p) => sum + p.networkErrors.length, 0)
		const totalConsoleErrors = diagnostics.reduce((sum, p) => sum + p.consoleErrors.length, 0)

		logger.info('\n📊 SUMMARY STATISTICS')
		logger.info(`Total Pages Tested: ${diagnostics.length}`)
		logger.info(`Pages with Status FAIL: ${failedPages.length}`)
		logger.info(`Pages with Issues: ${pagesWithErrors.length}`)
		logger.info(`Total API Errors (4xx/5xx): ${totalApiErrors}`)
		logger.info(`Total Console Errors: ${totalConsoleErrors}`)

		// Detailed breakdown per page
		logger.info('\n📄 DETAILED PAGE BREAKDOWN')
		logger.info('-'.repeat(100))

		diagnostics.forEach((diag) => {
			logger.info(`\n🔹 ${diag.page.toUpperCase()} (${diag.url})`)
			logger.info(`   Status: ${diag.status === 'FAIL' ? '❌ FAILED' : '✅ PASSED'}`)

			if (diag.uiElements.length > 0) {
				logger.info(`   UI Elements:`)
				diag.uiElements.forEach((el) => {
					logger.info(`     • ${el.type}: ${el.count}`)
				})
			}

			if (diag.consoleErrors.length > 0) {
				logger.info(`   Console Errors (${diag.consoleErrors.length}):`)
				diag.consoleErrors.slice(0, 3).forEach((err) => {
					logger.info(`     ❌ ${err.substring(0, 100)}`)
				})
				if (diag.consoleErrors.length > 3) {
					logger.info(`     ... and ${diag.consoleErrors.length - 3} more`)
				}
			}

			if (diag.networkErrors.length > 0) {
				logger.info(`   Network Errors (${diag.networkErrors.length}):`)
				diag.networkErrors.forEach((err) => {
					logger.info(`     ❌ ${err.method} ${err.endpoint} [${err.status}]`)
				})
			}

			if (diag.apiEndpoints.length > 0) {
				logger.info(`   API Endpoints Called (${diag.apiEndpoints.length}):`)
				diag.apiEndpoints.slice(0, 5).forEach((ep) => {
					const status = ep.status >= 400 ? '❌' : '✅'
					logger.info(`     ${status} ${ep.method} ${ep.endpoint} [${ep.status}]`)
				})
				if (diag.apiEndpoints.length > 5) {
					logger.info(`     ... and ${diag.apiEndpoints.length - 5} more`)
				}
			}

			if (diag.renderingIssues.length > 0) {
				logger.info(`   Rendering Issues (${diag.renderingIssues.length}):`)
				diag.renderingIssues.forEach((issue) => {
					logger.info(`     ⚠️ ${issue}`)
				})
			}

			if (diag.screenshot) {
				logger.info(`   Screenshot: ${diag.screenshot}`)
			}
		})

		// Critical issues summary
		logger.info('\n' + '='.repeat(100))
		logger.info('🚨 CRITICAL ISSUES & BUGS FOUND')
		logger.info('='.repeat(100))

		let criticalIssueCount = 0

		diagnostics.forEach((diag) => {
			if (diag.networkErrors.length > 0) {
				diag.networkErrors.forEach((err) => {
					criticalIssueCount++
					logger.info(
						`\n[${criticalIssueCount}] ${diag.page} - API ERROR`
					)
					logger.info(`    ${err.method} ${err.endpoint}`)
					logger.info(`    Status Code: ${err.status}`)
					if (err.status === 404) {
						logger.info(`    → Endpoint not implemented or incorrect route`)
					} else if (err.status === 401 || err.status === 403) {
						logger.info(`    → Authentication/Authorization issue`)
					} else if (err.status >= 500) {
						logger.info(`    → Server error - check backend logs`)
					}
				})
			}

			if (diag.consoleErrors.length > 0) {
				diag.consoleErrors.forEach((err) => {
					criticalIssueCount++
					logger.info(`\n[${criticalIssueCount}] ${diag.page} - CONSOLE ERROR`)
					logger.info(`    ${err.substring(0, 150)}`)
				})
			}

			if (diag.status === 'FAIL') {
				diag.renderingIssues.forEach((issue) => {
					criticalIssueCount++
					logger.info(`\n[${criticalIssueCount}] ${diag.page} - RENDERING ISSUE`)
					logger.info(`    ${issue}`)
				})
			}
		})

		logger.info('\n' + '='.repeat(100))
		logger.info(`TOTAL CRITICAL ISSUES FOUND: ${criticalIssueCount}`)
		logger.info('='.repeat(100))

		// Assertions
		expect(failedPages, 'No pages should have FAIL status').toHaveLength(0)
		expect(totalApiErrors, 'Should have minimal API errors').toBeLessThan(10)
	})
})
