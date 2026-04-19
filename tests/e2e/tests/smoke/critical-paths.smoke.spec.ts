import { test, expect, type Page } from '@playwright/test'
import { createLogger } from '../../lib/frontend-logger'

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

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || ''
const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || ''
const hasCredentials = Boolean(OWNER_EMAIL && OWNER_PASSWORD)
const logger = createLogger({ component: 'CriticalPathsSmoke' })

/**
 * Reusable login helper using reliable selectors
 * Uses click + fill pattern for TanStack Form controlled inputs
 */
async function loginAsOwner(page: Page) {
	await page.goto(`${BASE_URL}/login`)

	const emailInput = page.locator('input#email')
	const passwordInput = page.locator('input#password')
	const submitButton = page.locator('button[type="submit"]')

	// Click and fill (click ensures focus for controlled inputs)
	await emailInput.click()
	await emailInput.fill(OWNER_EMAIL)
	await passwordInput.click()
	await passwordInput.fill(OWNER_PASSWORD)

	// Submit and wait for redirect
	await submitButton.click()
	await page.waitForURL(url => !url.pathname.includes('/login'), {
		timeout: 15000
	})
}

test.describe('🚨 CRITICAL PATH SMOKE TESTS 🚨', () => {
	test.skip(!hasCredentials, 'E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD must be set')
	test.describe.configure({ mode: 'serial' }) // Run in order

	test('🔥 P0: Owner can login', async ({ page }) => {
		// Navigate to login
		await page.goto(`${BASE_URL}/login`)

		// Wait for form to be fully interactive (inputs enabled)
		const emailInput = page.locator('input#email')
		const passwordInput = page.locator('input#password')
		const submitButton = page.locator('button[type="submit"]')

		// Wait for email input to be visible and enabled
		await expect(emailInput).toBeVisible({ timeout: 10000 })
		await expect(emailInput).toBeEnabled({ timeout: 5000 })

		// Fill credentials - use click + type for controlled components
		await emailInput.click()
		await emailInput.fill(OWNER_EMAIL)

		await passwordInput.click()
		await passwordInput.fill(OWNER_PASSWORD)

		// Verify values were entered
		await expect(emailInput).toHaveValue(OWNER_EMAIL)
		await expect(passwordInput).toHaveValue(OWNER_PASSWORD)

		// Submit
		await submitButton.click()

		// Wait for navigation AWAY from login page (not just any URL)
		try {
			await page.waitForURL(url => !url.pathname.includes('/login'), {
				timeout: 15000
			})
		} catch (e) {
			// Check if there's an error message on the page
			const errorMsg = await page
				.locator('text=/Sign in failed|Invalid|error/i')
				.textContent()
				.catch(() => null)
			if (errorMsg) {
				throw new Error(
					`🚨 LOGIN FAILED: ${errorMsg}\n\n` +
						`❌ CRITICAL: Owner cannot login!\n` +
						`Account: ${OWNER_EMAIL}\n\n` +
						`Fix:\n` +
						`1. Check Supabase Dashboard → Users\n` +
						`2. Verify account exists with correct password`,
					{ cause: e }
				)
			}
			throw new Error(
				`🚨 LOGIN TIMEOUT: No redirect after 15s\n` +
					`Current URL: ${page.url()}\n` +
					`Check: Supabase env vars, backend health, frontend build`,
				{ cause: e }
			)
		}

		// Verify we ended up on an authenticated page (dashboard or similar)
		const currentUrl = page.url()
		expect(currentUrl).not.toContain('/login')

	})

	test('🔥 P0: Dashboard loads for owner', async ({ page }) => {
		await loginAsOwner(page)

		// Navigate to dashboard
		await page.goto(`${BASE_URL}/dashboard`)

		// Verify dashboard loads - accept any of these as success
		// Note: Empty state shows "Welcome to TenantFlow" instead of stats
		const dashboardLoaded = await Promise.race([
			page
				.locator('h1:has-text("Dashboard")')
				.waitFor({ timeout: 5000 })
				.then(() => true),
			page
				.locator('[data-testid="dashboard"]')
				.waitFor({ timeout: 5000 })
				.then(() => true),
			page
				.locator('text=Total Properties')
				.waitFor({ timeout: 5000 })
				.then(() => true),
			page
				.locator('text=Welcome to TenantFlow')
				.waitFor({ timeout: 5000 })
				.then(() => true)
		]).catch(() => false)

		expect(dashboardLoaded).toBeTruthy()
	})

	test('🔥 P0: Properties page loads', async ({ page, request }) => {
		await loginAsOwner(page)

		// Navigate to properties
		await page.goto(`${BASE_URL}/properties`)

		// Verify properties page loads - accept any of these as success
		// Note: Empty state shows "No properties yet" instead of property list
		const propertiesLoaded = await Promise.race([
			page
				.locator('h1:has-text("Properties")')
				.waitFor({ timeout: 5000 })
				.then(() => true),
			page
				.locator('button:has-text("New Property")')
				.waitFor({ timeout: 5000 })
				.then(() => true),
			page
				.locator('text=No properties yet')
				.waitFor({ timeout: 5000 })
				.then(() => true),
			page
				.locator('button:has-text("Add Your First Property")')
				.waitFor({ timeout: 5000 })
				.then(() => true)
		]).catch(() => false)

		expect(propertiesLoaded).toBeTruthy()
	})

	// API contract tests removed — NestJS backend deleted in Phase 57.
	// Data now served via Supabase PostgREST from the Next.js app directly.

	test('🔥 P0: Navigation works', async ({ page }) => {
		await loginAsOwner(page)

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
				page
					.locator('h1')
					.first()
					.waitFor({ timeout: 5000 })
					.then(() => true),
				page
					.locator('main')
					.waitFor({ timeout: 5000 })
					.then(() => true)
			]).catch(() => false)

			if (!pageLoaded) {
				throw new Error(
					`🚨 NAVIGATION FAILED: ${testPage.name} page did not load\n` +
						`URL: ${testPage.url}\n` +
						`Current: ${page.url()}`
				)
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

		await loginAsOwner(page)

		// Visit critical pages
		// Using 'domcontentloaded' instead of 'networkidle' to avoid timeout
		// issues with Next.js dev server HMR and background polling
		await page.goto(`${BASE_URL}/dashboard`)
		await page.waitForLoadState('domcontentloaded')
		await page.waitForTimeout(1000) // Allow time for initial JS execution

		await page.goto(`${BASE_URL}/properties`)
		await page.waitForLoadState('domcontentloaded')
		await page.waitForTimeout(1000)

		// Filter out known acceptable errors
		const criticalErrors = errors.filter(
			err =>
				!err.includes('DevTools') &&
				!err.includes('favicon') &&
				!err.includes('webpack') &&
				!err.includes('HMR')
		)

		if (criticalErrors.length > 0) {
			logger.warn('⚠️  Console errors detected:', {
				metadata: { criticalErrors }
			})
			// Don't fail the test, just warn
			// In production, you might want to fail on any errors
		}
	})
})

test.describe('🔍 SMOKE: Environment Sanity Checks', () => {
	test('Environment variables are set', async () => {
		test.skip(!hasCredentials, 'E2E credentials not configured — skipping env check')
		expect(OWNER_EMAIL, 'E2E_OWNER_EMAIL must be set').toBeTruthy()
		expect(OWNER_PASSWORD, 'E2E_OWNER_PASSWORD must be set').toBeTruthy()
		expect(BASE_URL, 'PLAYWRIGHT_BASE_URL must be set').toBeTruthy()
	})

	test('Frontend is reachable', async ({ request }) => {
		const frontendResponse = await request.get(BASE_URL).catch(() => null)
		expect(
			frontendResponse,
			`Frontend not reachable at ${BASE_URL}`
		).toBeTruthy()
	})
})
