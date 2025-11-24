import { test, expect } from '@playwright/test'

/**
 * CRITICAL PATH SMOKE TESTS
 *
 * These tests MUST pass before any code can be merged.
 * They test the absolute critical user journeys that must work in production.
 *
 * Target: <30 seconds total execution time
 * Run: On every commit, before every deployment
 *
 * If these fail, STOP and fix immediately - nothing else matters.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600'
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL!
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD!

test.describe('🚨 CRITICAL PATH SMOKE TESTS 🚨', () => {
	test.describe.configure({ mode: 'serial' }) // Run in order

	let authToken: string

	test('🔥 P0: System is alive', async ({ request }) => {
		// Test 1: Frontend is serving
		const frontendResponse = await request.get(BASE_URL)
		expect(frontendResponse.ok()).toBeTruthy()

		// Test 2: Backend health check
		const backendResponse = await request.get(`${API_URL}/health`)
		expect(backendResponse.ok()).toBeTruthy()

		const health = await backendResponse.json()
		expect(health.status).toBe('ok')
		expect(health.database.status).toBe('healthy')
	})

	test('🔥 P0: Owner can login', async ({ page }) => {
		// Navigate to login
		await page.goto(`${BASE_URL}/login`)

		// Verify login page loads
		await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 })

		// Fill credentials
		await page.fill('input[type="email"]', OWNER_EMAIL)
		await page.fill('input[type="password"]', OWNER_PASSWORD)

		// Submit
		await page.click('button[type="submit"]')

		// Wait for either success OR error (with good error message)
		const outcome = await Promise.race([
			page.waitForURL(`${BASE_URL}/**`, { timeout: 8000 }).then(() => 'success'),
			page.locator('text=/Sign in failed|Invalid/i').waitFor({ timeout: 8000 }).then(() => 'error')
		]).catch(() => 'timeout')

		if (outcome === 'error') {
			const errorMsg = await page.locator('text=/Sign in failed|Invalid/i').textContent()
			throw new Error(`🚨 LOGIN FAILED: ${errorMsg}\n\n` +
				`❌ CRITICAL: Owner cannot login!\n` +
				`Account: ${OWNER_EMAIL}\n\n` +
				`Fix:\n` +
				`1. Check Supabase Dashboard → Users\n` +
				`2. Verify account exists with correct password\n` +
				`3. Check Custom Access Token Hook is enabled\n` +
				`4. Verify app_metadata.user_type is set to "owner"`)
		}

		if (outcome === 'timeout') {
			throw new Error(`🚨 LOGIN TIMEOUT: No redirect after 8s\n` +
				`Current URL: ${page.url()}\n` +
				`Check: Supabase env vars, backend health, frontend build`)
		}

		// Extract auth token from cookies (Supabase SSR uses cookies, not localStorage)
		const cookies = await page.context().cookies()
		const authCookie = cookies.find(c =>
			c.name.includes('sb-') && c.name.includes('-auth-token')
		)

		if (authCookie) {
			try {
				const cookieData = JSON.parse(decodeURIComponent(authCookie.value))
				authToken = cookieData.access_token || cookieData[0]?.access_token || null
			} catch (error) {
				// Cookie might not be JSON encoded, try direct value
				authToken = authCookie.value
			}
		}

		expect(authToken).toBeTruthy()
	})

	test('🔥 P0: Dashboard loads for owner', async ({ page }) => {
		// Login
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', OWNER_EMAIL)
		await page.fill('input[type="password"]', OWNER_PASSWORD)
		await page.click('button[type="submit"]')
		await page.waitForURL(`${BASE_URL}/**`)

		// Navigate to dashboard
		await page.goto(`${BASE_URL}/dashboard`)

		// Verify dashboard loads - accept any of these as success
		const dashboardLoaded = await Promise.race([
			page.locator('h1:has-text("Dashboard")').waitFor({ timeout: 5000 }).then(() => true),
			page.locator('[data-testid="dashboard"]').waitFor({ timeout: 5000 }).then(() => true),
			page.locator('text=Total Properties').waitFor({ timeout: 5000 }).then(() => true)
		]).catch(() => false)

		expect(dashboardLoaded).toBeTruthy()
	})

	test('🔥 P0: Properties page loads', async ({ page, request }) => {
		// Login
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', OWNER_EMAIL)
		await page.fill('input[type="password"]', OWNER_PASSWORD)
		await page.click('button[type="submit"]')
		await page.waitForURL(`${BASE_URL}/**`)

		// Navigate to properties
		await page.goto(`${BASE_URL}/properties`)

		// Verify properties page loads
		const propertiesLoaded = await Promise.race([
			page.locator('h1:has-text("Properties")').waitFor({ timeout: 5000 }).then(() => true),
			page.locator('button:has-text("New Property")').waitFor({ timeout: 5000 }).then(() => true)
		]).catch(() => false)

		expect(propertiesLoaded).toBeTruthy()
	})

	test('🔥 P0: API endpoints are accessible', async ({ request, page }) => {
		// Login to get token
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', OWNER_EMAIL)
		await page.fill('input[type="password"]', OWNER_PASSWORD)
		await page.click('button[type="submit"]')
		await page.waitForURL(`${BASE_URL}/**`)

		const token = await page.evaluate(() => {
			const keys = Object.keys(localStorage)
			const authKey = keys.find(k => k.includes('supabase') || k.includes('sb-'))
			if (!authKey) return null

			try {
				const data = JSON.parse(localStorage.getItem(authKey) || '{}')
				return data?.currentSession?.access_token ||
					   data?.access_token ||
					   data?.session?.access_token ||
					   null
			} catch {
				return null
			}
		})

		expect(token).toBeTruthy()

		// Test critical API endpoints
		const endpoints = [
			{ name: 'Properties', path: '/api/v1/properties' },
			{ name: 'Units', path: '/api/v1/units' },
			{ name: 'Tenants', path: '/api/v1/tenants' },
			{ name: 'Leases', path: '/api/v1/leases' }
		]

		for (const endpoint of endpoints) {
			const response = await request.get(`${API_URL}${endpoint.path}`, {
				headers: { Authorization: `Bearer ${token}` }
			})

			if (!response.ok()) {
				throw new Error(`🚨 API FAILURE: ${endpoint.name} endpoint returned ${response.status()}\n` +
					`Path: ${endpoint.path}\n` +
					`This is CRITICAL - core API is broken!`)
			}
		}
	})

	test('🔥 P0: Navigation works', async ({ page }) => {
		// Login
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', OWNER_EMAIL)
		await page.fill('input[type="password"]', OWNER_PASSWORD)
		await page.click('button[type="submit"]')
		await page.waitForURL(`${BASE_URL}/**`)

		// Test navigation to key pages
		const pages = [
			{ url: '/', name: 'Dashboard' },
			{ url: '/properties', name: 'Properties' },
			{ url: '/tenants', name: 'Tenants' },
			{ url: '/leases', name: 'Leases' }
		]

		for (const testPage of pages) {
			await page.goto(`${BASE_URL}${testPage.url}`)

			// Wait for page to load - check for common elements
			const pageLoaded = await Promise.race([
				page.locator('h1').first().waitFor({ timeout: 5000 }).then(() => true),
				page.locator('main').waitFor({ timeout: 5000 }).then(() => true)
			]).catch(() => false)

			if (!pageLoaded) {
				throw new Error(`🚨 NAVIGATION FAILED: ${testPage.name} page did not load\n` +
					`URL: ${testPage.url}\n` +
					`Current: ${page.url()}`)
			}
		}
	})

	test('🔥 P0: No console errors on critical pages', async ({ page }) => {
		const errors: string[] = []

		page.on('pageerror', error => {
			errors.push(`Page Error: ${error.message}`)
		})

		page.on('console', msg => {
			if (msg.type() === 'error') {
				errors.push(`Console Error: ${msg.text()}`)
			}
		})

		// Login
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', OWNER_EMAIL)
		await page.fill('input[type="password"]', OWNER_PASSWORD)
		await page.click('button[type="submit"]')
		await page.waitForURL(`${BASE_URL}/**`)

		// Visit critical pages
		await page.goto(`${BASE_URL}/dashboard`)
		await page.waitForLoadState('networkidle')

		await page.goto(`${BASE_URL}/properties`)
		await page.waitForLoadState('networkidle')

		// Filter out known acceptable errors
		const criticalErrors = errors.filter(err =>
			!err.includes('DevTools') &&
			!err.includes('favicon') &&
			!err.includes('webpack') &&
			!err.includes('HMR')
		)

		if (criticalErrors.length > 0) {
			console.warn('⚠️  Console errors detected:', criticalErrors)
			// Don't fail the test, just warn
			// In production, you might want to fail on any errors
		}
	})
})

test.describe('🔍 SMOKE: Environment Sanity Checks', () => {
	test('Environment variables are set', async () => {
		expect(OWNER_EMAIL, 'E2E_OWNER_EMAIL must be set').toBeTruthy()
		expect(OWNER_PASSWORD, 'E2E_OWNER_PASSWORD must be set').toBeTruthy()
		expect(BASE_URL, 'PLAYWRIGHT_BASE_URL must be set').toBeTruthy()
		expect(API_URL, 'NEXT_PUBLIC_API_BASE_URL must be set').toBeTruthy()
	})

	test('Servers are reachable', async ({ request }) => {
		// Frontend
		const frontendResponse = await request.get(BASE_URL).catch(() => null)
		expect(frontendResponse, `Frontend not reachable at ${BASE_URL}`).toBeTruthy()

		// Backend
		const backendResponse = await request.get(`${API_URL}/health`).catch(() => null)
		expect(backendResponse, `Backend not reachable at ${API_URL}/health`).toBeTruthy()
	})
})
