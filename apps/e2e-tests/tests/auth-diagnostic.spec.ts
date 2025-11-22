/**
 * Authentication Diagnostic Test
 *
 * Enhanced logging to identify auth bottlenecks and bugs
 * Captures network requests, console messages, timing data
 */

import { expect, test, type Location } from '@playwright/test'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'AuthDiagnostic' })

interface NetworkLog {
  url: string
  method: string
  status?: number | undefined
  timing: number
  type: string
  error?: string
}

interface ConsoleLog {
	type: string
	message: string
	timestamp: number
}

test.describe('Authentication Diagnostic Tests', () => {
	test('diagnose login flow with comprehensive logging', async ({
		page,
		context
	}) => {
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
		const networkLogs: NetworkLog[] = []
		const consoleLogs: ConsoleLog[] = []
		const timings: { [key: string]: number } = {}
		let navigationStart = Date.now()

		// Capture all network requests
		page.on('request', request => {
			networkLogs.push({
				url: request.url(),
				method: request.method(),
				timing: Date.now() - navigationStart,
				type: request.resourceType(),
				status: undefined
			})
		})

		page.on('response', response => {
			const existing = networkLogs.find(
				log => log.url === response.url() && log.method === response.request().method()
			)
			if (existing) {
				existing.status = response.status()
			}

			// Log auth errors
			if (response.status() === 401 || response.status() === 403) {
				console.error(`[AUTH_ERROR] ${response.status()} - ${response.url()}`)
			}
		})

		// Capture console messages
		page.on('console', msg => {
			const log: ConsoleLog = {
				type: msg.type(),
				message: msg.text(),
				timestamp: Date.now() - navigationStart
			}
			consoleLogs.push(log)

			if (msg.type() === 'error' || msg.type() === 'warning') {
				console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`)
			}
		})

		// Track page load stages
		console.log(`[TIMING] Starting navigation to ${baseUrl}/login`)
		navigationStart = Date.now()

		await page.goto(`${baseUrl}/login`)
		timings.pageLoadStart = Date.now() - navigationStart

		await page.waitForLoadState('domcontentloaded')
		timings.domContentLoaded = Date.now() - navigationStart

		await page.waitForLoadState('networkidle')
		timings.networkIdle = Date.now() - navigationStart

		console.log('[TIMING] Page load stages:', timings)

		// Check for Supabase initialization
		const supabaseInitialized = await page.evaluate(() => {
			const w = window as unknown as {
				supabase?: unknown;
				_supabaseClient?: unknown;
			};
			return !!w.supabase || !!w._supabaseClient;
		});
		console.log(`[SUPABASE] Initialized: ${supabaseInitialized}`)

		// Get environment info
		const envInfo = await page.evaluate(() => {
			const w = window as unknown as {
				location: Location;
				NEXT_PUBLIC_SB_URL?: string;
				NEXT_PUBLIC_SB_ANON_KEY?: string;
			};
			return {
				origin: w.location.origin,
				pathname: w.location.pathname,
				supabaseUrl: w.NEXT_PUBLIC_SB_URL,
				supabaseKey: w.NEXT_PUBLIC_SB_ANON_KEY ? 'SET' : 'NOT SET'
			};
		});
		console.log('[ENV] Frontend environment:', envInfo)

		// Log initial network requests
		console.log('[NETWORK] Initial page load requests:')
		networkLogs.slice(0, 10).forEach(log => {
			console.log(`  ${log.method} ${log.url.substring(0, 100)} - Status: ${log.status} (${log.timing}ms)`)
		})

		// Wait for form to be visible
		const emailField = page.locator('#email')
		await expect(emailField).toBeVisible({ timeout: 10000 })
		timings.formVisible = Date.now() - navigationStart

		// Log form state
		const formVisible = await emailField.isVisible()
		console.log(`[FORM] Email field visible: ${formVisible}`)

		// Fill form
		const email = process.env.E2E_OWNER_EMAIL || 'test-admin@tenantflow.app'
		const password = process.env.E2E_OWNER_PASSWORD || ''

		console.log(`[LOGIN] Attempting login with email: ${email}`)
		timings.formFillStart = Date.now() - navigationStart

		await emailField.fill(email, { force: true })
		await page.locator('#password').fill(password, { force: true })
		timings.formFilled = Date.now() - navigationStart

		// Wait for form state to settle
		await page.waitForTimeout(500)

		// Capture form state before submission
		const formData = await page.evaluate(() => ({
			email: (document.querySelector('#email') as HTMLInputElement)?.value,
			password: (document.querySelector('#password') as HTMLInputElement)?.value,
			submitButton: (document.querySelector('button[type="submit"]') as HTMLButtonElement)?.textContent
		}))
		console.log('[FORM] Form state before submission:', formData)

		// Track form submission
		console.log('[LOGIN] Clicking submit button')
		timings.submitStart = Date.now() - navigationStart

		const submitButton = page.getByRole('button', {
			name: /sign in|login|submit/i
		})
		await expect(submitButton).toBeEnabled({ timeout: 5000 })

		// Listen for navigation
		let navigationComplete = false
		page.on('load', () => {
			navigationComplete = true
			timings.navigationComplete = Date.now() - navigationStart
			console.log(`[NAVIGATION] Page loaded at ${timings.navigationComplete}ms`)
		})

		// Track API calls during login
		const authApiCalls: NetworkLog[] = []
		const originalOn = page.on.bind(page)

		// Submit and wait for result
		await Promise.race([
			page.waitForURL(/\/(manage|tenant|auth)/, { timeout: 30000 }),
			page.waitForLoadState('networkidle', { timeout: 30000 })
		]).catch(err => {
			console.error('[LOGIN_TIMEOUT] Login did not complete within 30s')
			console.error('[CURRENT_URL]', page.url())
		})

		timings.loginComplete = Date.now() - navigationStart

		// Log network requests related to auth
		console.log('[NETWORK] Authentication-related requests:')
		networkLogs
			.filter(
				log =>
					log.url.includes('/auth') ||
					log.url.includes('supabase') ||
					log.url.includes('/login') ||
					log.status === 401 ||
					log.status === 403
			)
			.forEach(log => {
				console.log(
					`  [${log.status || '?'}] ${log.method} ${log.url.substring(0, 80)} (+${log.timing}ms)`
				)
			})

		// Log console errors and warnings
		console.log('[CONSOLE] Errors and warnings:')
		consoleLogs
			.filter(log => log.type === 'error' || log.type === 'warning')
			.slice(0, 10)
			.forEach(log => {
				console.log(`  [${log.timestamp}ms] ${log.type}: ${log.message.substring(0, 100)}`)
			})

		// Check final state
		const finalUrl = page.url()
		const sessionCookies = await context.cookies()
		const authCookies = sessionCookies.filter(c => c.name.includes('auth') || c.name.includes('sb-'))

		console.log('[FINAL_STATE]')
		console.log(`  URL: ${finalUrl}`)
		console.log(`  Auth cookies: ${authCookies.length}`)
		console.log(`  Page title: ${await page.title()}`)

		// Performance summary
		console.log('[PERFORMANCE_SUMMARY]')
		Object.entries(timings).forEach(([key, value]) => {
			console.log(`  ${key}: ${value}ms`)
		})

		console.log('[DIAGNOSIS_COMPLETE]')
		console.log(`Total network requests: ${networkLogs.length}`)
		console.log(`Console logs: ${consoleLogs.length}`)
		console.log(`Auth-related requests: ${networkLogs.filter(log => log.url.includes('auth')).length}`)

		// Assertion
		expect(finalUrl).toMatch(/\/(manage|tenant|auth)/)
	})

	test('check Supabase connectivity', async ({ page }) => {
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

		console.log('[SB_CHECK] Testing Supabase connectivity')

		await page.goto(`${baseUrl}/login`)
		await page.waitForLoadState('networkidle')

		// Try to access Supabase
		const supabaseTest = await page.evaluate(async () => {
			try {
				const response = await fetch(
					`${(window as any).NEXT_PUBLIC_SB_URL}/rest/v1/`,
					{
						method: 'HEAD',
						headers: {
							'apikey': (window as any).NEXT_PUBLIC_SB_ANON_KEY
						}
					}
				)
				return {
					status: response.status,
					statusText: response.statusText,
					ok: response.ok
				}
			} catch (err) {
				return {
					error: err instanceof Error ? err.message : String(err)
				}
			}
		})

		console.log('[SB_CHECK] Result:', supabaseTest)
		expect(supabaseTest).toHaveProperty('status')
	})

	test('capture detailed auth flow timeline', async ({ page }) => {
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
		const events: Array<{ time: number; event: string; details: any }> = []

		const startTime = Date.now()
		const log = (event: string, details?: any) => {
			events.push({
				time: Date.now() - startTime,
				event,
				details
			})
			console.log(`[${Date.now() - startTime}ms] ${event}`, details || '')
		}

		log('Starting auth flow diagnostic')

		// Navigate to login
		log('Navigating to login page')
		await page.goto(`${baseUrl}/login`)

		log('Waiting for page load')
		await page.waitForLoadState('networkidle')

		log('Checking for form elements')
		const emailVisible = await page.locator('#email').isVisible()
		log('Email field visible', { visible: emailVisible })

		if (emailVisible) {
			const email = process.env.E2E_OWNER_EMAIL || 'test@example.com'
			const password = process.env.E2E_OWNER_PASSWORD || ''

			log('Filling credentials', { email })
			await page.locator('#email').fill(email)
			await page.locator('#password').fill(password)
			await page.waitForTimeout(500)

			log('Submitting form')
			const submitButton = page.getByRole('button', {
				name: /sign in|login/i
			})

			// Intercept responses
			let loginResponse: any = null
			page.on('response', response => {
				if (response.url().includes('/auth') || response.url().includes('login')) {
					loginResponse = {
						url: response.url(),
						status: response.status()
					}
					log('Auth API Response', loginResponse)
				}
			})

			await submitButton.click()
			log('Submit button clicked')

			// Wait for response or timeout
			await page.waitForTimeout(3000)
			log('Wait complete')

			const currentUrl = page.url()
			log('Current URL after login attempt', { url: currentUrl })
		}

		// Output timeline
		console.log('\n[TIMELINE]')
		events.forEach(e => {
			console.log(`${e.time}ms - ${e.event}`, e.details)
		})
	})
})
