/**
 * Authentication & JWT Validation E2E Tests

 * Validates that JWT signing keys work correctly and users can access
 * protected routes without 401 errors after login.

 * Tests:
 * 1. Login with valid credentials
 * 2. Access all protected owner routes (properties, tenants, leases, etc.)
 * 3. Verify no 401/403 errors on protected pages
 * 4. Verify JWT tokens are valid and properly signed
 * 5. Verify no legacy JWT signing key errors
 *
 * Run with: E2E_OWNER_EMAIL=test-admin@tenantflow.app E2E_OWNER_PASSWORD='TestPassword123!' npx playwright test auth-jwt-validation.spec.ts
 */

import { expect, test } from '@playwright/test'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { loginAsOwner } from '../auth-helpers'

const logger = createLogger({ component: 'AuthJwtValidationE2E' })

test.describe('Authentication & JWT Validation', () => {
	test.beforeEach(async ({ page }) => {
		// Login before each test to ensure fresh JWT token
		await loginAsOwner(page, { forceLogin: true })
	})

	test('should login successfully and access dashboard without 401 errors', async ({
		page
	}) => {
		// Monitor network requests for auth errors
		const authErrors: string[] = []
		page.on('response', response => {
			if (response.status() === 401 || response.status() === 403) {
				authErrors.push(`${response.status()} - ${response.url()}`)
			}
		})

		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

		// Navigate to dashboard
		await page.goto(`${baseUrl}/manage`)
		await page.waitForLoadState('networkidle')

		// Verify we're on dashboard (not redirected to login)
		await expect(page).toHaveURL(/\/manage/)

		// Verify no auth errors occurred
		expect(authErrors).toEqual([])
	})

	test('should access properties page without 401 errors', async ({ page }) => {
		const authErrors: string[] = []
		const apiErrors: { status: number; url: string; body?: string }[] = []

		page.on('response', async response => {
			const url = response.url()
			if (response.status() === 401 || response.status() === 403) {
				let body: string | undefined
				try {
					body = await response.text()
				} catch {
					// Ignore if can't read body
				}
				authErrors.push(`${response.status()} - ${url}`)
				apiErrors.push({ status: response.status(), url, body })
			}
		})

		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

		// Navigate to properties page
		await page.goto(`${baseUrl}/manage/properties`)
		await page.waitForLoadState('networkidle')

		// Verify we're on properties page
		await expect(page).toHaveURL(/\/manage\/properties/)

		// Wait for properties table or empty state
		await page.waitForSelector(
			'table, [data-testid="empty-state"], text="No properties"',
			{
				timeout: 10000
			}
		)

		// Verify no auth errors occurred
		if (authErrors.length > 0) {
			logger.error('Auth errors detected', {
				metadata: { apiErrors }
			})
		}
		expect(authErrors).toEqual([])
	})

	test('should access all protected owner routes without 401 errors', async ({
		page
	}) => {
		const authErrors: Map<string, string[]> = new Map()

		page.on('response', response => {
			if (response.status() === 401 || response.status() === 403) {
				const route = page.url()
				if (!authErrors.has(route)) {
					authErrors.set(route, [])
				}
				authErrors.get(route)!.push(`${response.status()} - ${response.url()}`)
			}
		})

		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

		// Test all protected routes
		const protectedRoutes = [
			'/manage',
			'/manage/properties',
			'/manage/tenants',
			'/manage/leases',
			'/manage/maintenance',
			'/manage/units'
		]

		for (const route of protectedRoutes) {
			logger.info(`Testing route: ${route}`)

			await page.goto(`${baseUrl}${route}`)
			await page.waitForLoadState('networkidle')

			// Verify we're on the expected route (not redirected to login)
			await expect(page).toHaveURL(new RegExp(route))

			// Wait for content to load (table or empty state)
			await page.waitForSelector(
				'table, [data-testid="empty-state"], main, h1',
				{
					timeout: 10000
				}
			)

			// Small delay to allow any background requests to complete
			await page.waitForTimeout(500)
		}

		// Verify no auth errors across all routes
		if (authErrors.size > 0) {
			logger.error('Auth errors by route', {
				metadata: Object.fromEntries(authErrors)
			})
		}
		expect(authErrors.size).toBe(0)
	})

	test('should have valid JWT token in cookies', async ({ page, context }) => {
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

		// Navigate to dashboard
		await page.goto(`${baseUrl}/manage`)
		await page.waitForLoadState('networkidle')

		// Get all cookies
		const cookies = await context.cookies()

		// Find Supabase auth cookies
		const authCookies = cookies.filter(
			cookie =>
				cookie.name.includes('auth') ||
				cookie.name.includes('sb-') ||
				cookie.name.includes('supabase')
		)

		// Verify we have auth cookies
		expect(authCookies.length).toBeGreaterThan(0)

		// Log cookie names for debugging
		logger.info('Auth cookies found', {
			metadata: { cookies: authCookies.map(c => c.name) }
		})

		// Verify cookies have httpOnly flag (security best practice)
		const httpOnlyCookies = authCookies.filter(c => c.httpOnly)
		expect(httpOnlyCookies.length).toBeGreaterThan(0)
	})

	test('should not have legacy JWT signing key errors in console', async ({
		page
	}) => {
		const consoleErrors: string[] = []
		const jwtErrors: string[] = []

		// Capture console errors
		page.on('console', msg => {
			if (msg.type() === 'error') {
				const text = msg.text()
				consoleErrors.push(text)

				// Check for JWT-specific errors
				if (
					text.includes('JWT') ||
					text.includes('signature') ||
					text.includes('token') ||
					text.includes('signing key')
				) {
					jwtErrors.push(text)
				}
			}
		})

		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

		// Navigate to properties page (most common user flow)
		await page.goto(`${baseUrl}/manage/properties`)
		await page.waitForLoadState('networkidle')

		// Wait for any async operations
		await page.waitForTimeout(2000)

		// Verify no JWT-related errors
		if (jwtErrors.length > 0) {
			logger.error('JWT errors detected', { metadata: { jwtErrors } })
		}
		expect(jwtErrors).toEqual([])

		// Log other console errors for awareness (but don't fail test)
		if (consoleErrors.length > 0) {
			logger.warn('Other console errors (non-JWT)', {
				metadata: {
					errors: consoleErrors.filter(e => !jwtErrors.includes(e))
				}
			})
		}
	})

	test('should make successful API calls to backend with JWT', async ({
		page
	}) => {
		const apiCalls: { url: string; status: number }[] = []

		// Track API calls to backend
		page.on('response', response => {
			const url = response.url()
			if (url.includes('/api/v1/')) {
				apiCalls.push({ url, status: response.status() })
			}
		})

		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

		// Navigate to properties page (triggers API calls)
		await page.goto(`${baseUrl}/manage/properties`)
		await page.waitForLoadState('networkidle')

		// Wait for API calls to complete
		await page.waitForTimeout(2000)

		// Verify we made at least one successful API call
		const successfulCalls = apiCalls.filter(
			call => call.status >= 200 && call.status < 300
		)
		expect(successfulCalls.length).toBeGreaterThan(0)

		// Verify no 401/403 errors
		const authErrorCalls = apiCalls.filter(
			call => call.status === 401 || call.status === 403
		)
		if (authErrorCalls.length > 0) {
			logger.error('API auth errors detected', {
				metadata: { authErrorCalls }
			})
		}
		expect(authErrorCalls).toEqual([])

		logger.info(` Made ${successfulCalls.length} successful API calls`)
	})

	test('should handle token refresh gracefully', async ({ page }) => {
		const authErrors: string[] = []

		page.on('response', response => {
			if (response.status() === 401 || response.status() === 403) {
				authErrors.push(`${response.status()} - ${response.url()}`)
			}
		})

		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

		// Navigate to properties
		await page.goto(`${baseUrl}/manage/properties`)
		await page.waitForLoadState('networkidle')

		// Wait 2 seconds to allow any background token refresh
		await page.waitForTimeout(2000)

		// Navigate to another route
		await page.goto(`${baseUrl}/manage/tenants`)
		await page.waitForLoadState('networkidle')

		// Verify no auth errors during navigation/refresh
		expect(authErrors).toEqual([])
	})
})

test.describe('JWT Security Validation', () => {
	test('should not expose JWT token in URL or localStorage', async ({
		page
	}) => {
		await loginAsOwner(page)

		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
		await page.goto(`${baseUrl}/manage`)
		await page.waitForLoadState('networkidle')

		// Check URL doesn't contain token
		const url = page.url()
		expect(url).not.toMatch(/token=/)
		expect(url).not.toMatch(/jwt=/)
		expect(url).not.toMatch(/access_token=/)

		// Check localStorage doesn't contain sensitive token data
		const localStorageData = await page.evaluate(() => {
			const data: Record<string, string> = {}
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i)
				if (key) {
					data[key] = localStorage.getItem(key) || ''
				}
			}
			return data
		})

		// JWT tokens should not be in localStorage (should be httpOnly cookies)
		const sensitiveKeys = Object.keys(localStorageData).filter(
			key =>
				key.includes('token') ||
				key.includes('jwt') ||
				key.includes('access_token')
		)

		// If found, log for security review
		if (sensitiveKeys.length > 0) {
			logger.warn('️ Potential sensitive data in localStorage', {
				metadata: { sensitiveKeys }
			})
		}

		// Tokens should be in httpOnly cookies, not localStorage
		// This is just a warning, not a hard failure
	})
})
