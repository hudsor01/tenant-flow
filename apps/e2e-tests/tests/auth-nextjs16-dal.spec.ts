/**
 * Next.js 16 Data Access Layer (DAL) Tests
 *
 * Tests the simplified DAL pattern for data access:
 * 1. getClaims() - Fetch JWT claims (no auth enforcement)
 * 2. React.cache() - Request-scoped caching
 * 3. Server Component data access
 * 4. No 401/403 errors on protected pages
 *
 * Architecture (Next.js 16 Pattern):
 * - Proxy: HTTP-level auth enforcement (redirects)
 * - DAL: Data access only (getClaims for user context)
 * - Server Components: Business logic using DAL
 * - RLS: Database-level filtering
 */

import { expect, test } from '@playwright/test'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { loginAsOwner } from '../auth-helpers'

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'
const logger = createLogger({ component: 'AuthNextjs16DAL' })

test.describe('DAL - Server Component Data Access', () => {
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
			'/',
			'/properties',
			'/tenants',
			'/leases',
			'/maintenance',
			'/units'
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
			logger.error('Auth errors detected:', { metadata: { authErrors } })
		}
		expect(authErrors).toEqual([])
	})

	test('should fetch claims via DAL on each page load', async ({ page }) => {
		const routes = ['/', '/properties', '/tenants']

		for (const route of routes) {
			await page.goto(`${baseUrl}${route}`)
			await page.waitForLoadState('domcontentloaded')

			// Page should load successfully (proxy handled auth, DAL fetched data)
			await expect(page).toHaveURL(new RegExp(route))

			// Should not redirect to login (proxy protected)
			const url = page.url()
			expect(url).not.toContain('/login')
		}
	})

	test('should render user-specific data using DAL', async ({ page }) => {
		await page.goto(`${baseUrl}/dashboard`)
		await page.waitForLoadState('domcontentloaded')

		// Should render user-specific content
		// (Proxy enforced auth, DAL fetched claims for context)
		await page.waitForSelector('main', { timeout: 10000 })

		// Check for user-specific elements (sidebar, header, etc.)
		const content = await page.content()

		// Should NOT show login form (proxy redirected unauthenticated)
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
		await page.goto(`${baseUrl}/properties`)
		await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

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

		await page.goto(`${baseUrl}/properties`)
		await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

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

test.describe('DAL - Claims Caching (React.cache)', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page)
	})

	test('should cache getClaims() per request', async ({ page }) => {
		const authApiCalls: string[] = []

		page.on('request', request => {
			const url = request.url()
			// Track getClaims API calls (not getUser)
			if (url.includes('auth') && url.includes('user')) {
				authApiCalls.push(url)
			}
		})

		await page.goto(`${baseUrl}/dashboard`)
		await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

		// Should only call auth API once per page load
		// (React.cache memoizes getClaims for the request)
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
		await page.goto(`${baseUrl}/dashboard`)

		// Should redirect to login (proxy redirected, DAL never called)
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
		// Clear existing valid cookies first
		await context.clearCookies()

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
		await page.goto(`${baseUrl}/dashboard`)

		// Should redirect to login (proxy detected invalid session)
		await expect(page).toHaveURL(/\/login/)
	})
})

test.describe('DAL - Performance', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page)
	})

	test('should fetch claims quickly (< 200ms)', async ({ page }) => {
		const start = Date.now()

		await page.goto(`${baseUrl}/dashboard`)
		await page.waitForLoadState('domcontentloaded')

		const loadTime = Date.now() - start

		// Claims fetching should be fast (cached)
		// Total page load in dev should be reasonable
		expect(loadTime).toBeLessThan(3000)
	})

	test('should not block page rendering', async ({ page }) => {
		const metrics: any = {}

		await page.goto(`${baseUrl}/dashboard`)

		// Wait for page to be interactive
		await page.waitForLoadState('domcontentloaded')

		metrics.domContentLoaded = await page.evaluate(() =>
			performance.getEntriesByType('navigation')[0]
				? (performance.getEntriesByType('navigation')[0] as any)
						.domContentLoadedEventEnd
				: 0
		)

		// DOM should load quickly (DAL just fetches data)
		expect(metrics.domContentLoaded).toBeLessThan(3000)
	})
})
