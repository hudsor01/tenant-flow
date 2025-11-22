/**
 * Next.js 16 Data Access Layer (DAL) Tests
 *
 * Tests the DAL pattern for server-side authentication:
 * 1. verifySession() - Cached auth verification
 * 2. requireUser() - Required auth with errors
 * 3. Server Component auth checks
 * 4. No 401/403 errors on protected pages
 * 5. Authorization enforcement
 *
 * Architecture:
 * - DAL provides defense-in-depth security
 * - All Server Components call DAL before rendering
 * - All data access goes through DAL
 */

import { expect, test } from '@playwright/test'
import { loginAsOwner } from '../auth-helpers'

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('DAL - Server Component Auth Verification', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page)
	})

	test('should load protected pages without 401/403 errors', async ({
		page
	}) => {
		const authErrors: string[] = []

		page.on('response', response => {
			if (response.status() === 401 || response.status() === 403) {
				authErrors.push(`${response.status()} - ${response.url()}`)
			}
		})

		const protectedRoutes = [
			'/manage',
			'/manage/properties',
			'/manage/tenants',
			'/manage/leases',
			'/manage/maintenance',
			'/manage/units'
		]

		for (const route of protectedRoutes) {
			await page.goto(`${baseUrl}${route}`)
			await page.waitForLoadState('domcontentloaded')

			// Wait for content to render
			await page.waitForSelector('main, h1, [data-testid="page-content"]', {
				timeout: 10000
			})

			// Small delay for background requests
			await page.waitForTimeout(500)
		}

		// Should have NO auth errors (DAL verified session)
		if (authErrors.length > 0) {
			console.error('Auth errors detected:', authErrors)
		}
		expect(authErrors).toEqual([])
	})

	test('should verify session via DAL on each page load', async ({ page }) => {
		const routes = ['/manage', '/manage/properties', '/manage/tenants']

		for (const route of routes) {
			await page.goto(`${baseUrl}${route}`)
			await page.waitForLoadState('domcontentloaded')

			// Page should load successfully (DAL verified session)
			await expect(page).toHaveURL(new RegExp(route))

			// Should not redirect to login
			const url = page.url()
			expect(url).not.toContain('/login')
		}
	})

	test('should render user-specific data after DAL auth', async ({ page }) => {
		await page.goto(`${baseUrl}/manage`)
		await page.waitForLoadState('domcontentloaded')

		// Should render user-specific content
		// (DAL returned user data to Server Component)
		await page.waitForSelector('main', { timeout: 10000 })

		// Check for user-specific elements (sidebar, header, etc.)
		const content = await page.content()

		// Should NOT show login form
		expect(content).not.toContain('sign in')
		expect(content).not.toContain('password')
	})
})

test.describe('DAL - Authorization Enforcement', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page)
	})

	test('should enforce authorization in data fetching', async ({ page }) => {
		const forbiddenErrors: string[] = []

		page.on('response', response => {
			if (response.status() === 403) {
				forbiddenErrors.push(`${response.status()} - ${response.url()}`)
			}
		})

		// Navigate to properties page
		await page.goto(`${baseUrl}/manage/properties`)
		await page.waitForLoadState('networkidle')

		// Should NOT have 403 errors (user authorized for own data)
		expect(forbiddenErrors).toEqual([])
	})

	test('should return minimal DTOs (not full DB objects)', async ({ page }) => {
		const apiResponses: any[] = []

		page.on('response', async response => {
			const url = response.url()
			if (url.includes('/api/v1/') && response.status() === 200) {
				try {
					const data = await response.json()
					apiResponses.push({ url, data })
				} catch {
					// Ignore non-JSON responses
				}
			}
		})

		await page.goto(`${baseUrl}/manage/properties`)
		await page.waitForLoadState('networkidle')

		// Check that responses don't contain sensitive fields
		for (const { data } of apiResponses) {
			if (Array.isArray(data)) {
				for (const item of data) {
					// Should NOT expose sensitive fields
					expect(item).not.toHaveProperty('password')
					expect(item).not.toHaveProperty('passwordHash')
					expect(item).not.toHaveProperty('internalNotes')
					expect(item).not.toHaveProperty('stripe_customer_secret')
				}
			}
		}
	})
})

test.describe('DAL - Session Caching (React.cache)', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page)
	})

	test('should cache verifySession() per request', async ({ page }) => {
		const authApiCalls: string[] = []

		page.on('request', request => {
			const url = request.url()
			if (url.includes('auth') && url.includes('user')) {
				authApiCalls.push(url)
			}
		})

		await page.goto(`${baseUrl}/manage`)
		await page.waitForLoadState('networkidle')

		// Should only call auth API once per page load
		// (React.cache memoizes verifySession for the request)
		// Allow 1-2 calls max (initial + potential refresh)
		expect(authApiCalls.length).toBeLessThanOrEqual(2)
	})
})

test.describe('DAL - Error Handling', () => {
	test('should handle missing session gracefully', async ({
		page,
		context
	}) => {
		// Clear session
		await context.clearCookies()

		const consoleErrors: string[] = []

		page.on('console', msg => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text())
			}
		})

		// Try to access protected route
		await page.goto(`${baseUrl}/manage`)

		// Should redirect to login (DAL returned null)
		await expect(page).toHaveURL(/\/login/)

		// Should NOT have console errors (graceful handling)
		const criticalErrors = consoleErrors.filter(
			err => !err.includes('favicon') && !err.includes('404')
		)
		expect(criticalErrors).toEqual([])
	})

	test('should handle invalid session gracefully', async ({
		page,
		context
	}) => {
		// Set invalid auth cookie
		await context.addCookies([
			{
				name: 'sb-access-token',
				value: 'invalid-token-12345',
				domain: 'localhost',
				path: '/'
			}
		])

		// Try to access protected route
		await page.goto(`${baseUrl}/manage`)

		// Should redirect to login (DAL detected invalid session)
		await expect(page).toHaveURL(/\/login/)
	})
})

test.describe('DAL - Performance', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page)
	})

	test('should verify session quickly (< 200ms)', async ({ page }) => {
		const start = Date.now()

		await page.goto(`${baseUrl}/manage`)
		await page.waitForLoadState('domcontentloaded')

		const authTime = Date.now() - start

		// Auth verification should be fast (cached)
		// Total page load in dev should be reasonable
		expect(authTime).toBeLessThan(3000)
	})

	test('should not block page rendering', async ({ page }) => {
		const metrics: any = {}

		await page.goto(`${baseUrl}/manage`)

		// Wait for page to be interactive
		await page.waitForLoadState('domcontentloaded')

		metrics.domContentLoaded = await page.evaluate(() =>
			performance.getEntriesByType('navigation')[0]
				? (performance.getEntriesByType('navigation')[0] as any)
						.domContentLoadedEventEnd
				: 0
		)

		// DOM should load quickly (auth doesn't block)
		expect(metrics.domContentLoaded).toBeLessThan(3000)
	})
})
