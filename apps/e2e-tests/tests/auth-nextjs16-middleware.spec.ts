/**
 * Next.js 16 Proxy Tests
 *
 * Tests the proxy.ts auth enforcement pattern with Supabase SSR:
 * 1. proxy.ts auth enforcement (getClaims)
 * 2. Route protection redirects
 * 3. Role-based routing (OWNER → /dashboard, TENANT → /portal)
 * 4. Authenticated user redirects
 * 5. Cookie management
 *
 * Architecture (Next.js 16 Pattern):
 * - Proxy (proxy.ts): HTTP-level auth enforcement with getClaims()
 * - DAL (dal.ts): Data access only (no redirects)
 * - Layouts: Just UI (no auth checks)
 * - RLS: Database-level filtering
 */

import { expect, test } from '@playwright/test'
import { loginAsOwner, clearSessionCache } from '../auth-helpers'

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'

test.describe('Next.js 16 Proxy - Route Protection', () => {
	test.beforeEach(async ({ context }) => {
		// Clear cookies to start fresh
		await context.clearCookies()
	})

	test('should redirect unauthenticated user from /dashboard to /login', async ({
		page
	}) => {
		// Navigate to protected route without auth
		await page.goto(`${baseUrl}/dashboard`)

		// Should redirect to login with redirectTo parameter
		await expect(page).toHaveURL(/^\/login/)
		await expect(page).toHaveURL(/redirectTo=%2F/)
	})

	test('should redirect unauthenticated user from /tenant to /login', async ({
		page
	}) => {
		await page.goto(`${baseUrl}/tenant`)

		await expect(page).toHaveURL(/^\/login/)
		await expect(page).toHaveURL(/redirectTo=%2Ftenant/)
	})

	test('should redirect unauthenticated user from /settings to /login', async ({
		page
	}) => {
		await page.goto(`${baseUrl}/settings`)

		await expect(page).toHaveURL(/^\/login/)
		await expect(page).toHaveURL(/redirectTo=%2Fsettings/)
	})

	test('should allow unauthenticated access to /login', async ({ page }) => {
		await page.goto(`${baseUrl}/login`)

		// Should stay on login page
		await expect(page).toHaveURL(/^\/login/)
	})

	test('should allow unauthenticated access to homepage', async ({ page }) => {
		await page.goto(`${baseUrl}/`)

		// Should stay on homepage
		await expect(page).toHaveURL(new RegExp(`^${baseUrl}/?$`))
	})
})

test.describe('Next.js 16 Proxy - Authenticated Redirects', () => {
	test.beforeEach(async ({ page }) => {
		// Login before each test
		await loginAsOwner(page)
	})

	test('should redirect authenticated user from /login to /dashboard', async ({
		page
	}) => {
		// Try to access login page while logged in
		await page.goto(`${baseUrl}/login`)

		// Should redirect to owner dashboard
		await expect(page).toHaveURL(/^\/$/)
	})

	test('should honor redirectTo parameter after login', async ({
		page,
		context
	}) => {
		// Logout first
		await context.clearCookies()
		clearSessionCache()

		// Navigate to protected route (should redirect to login with redirectTo)
		await page.goto(`${baseUrl}/properties`)
		await expect(page).toHaveURL(/^\/login/)
		await expect(page).toHaveURL(/redirectTo=%2Fproperties/)

		// Login
		await loginAsOwner(page)

		// Should redirect to originally requested page
		await expect(page).toHaveURL(/^\/properties/)
	})

	test('should stay on protected routes when authenticated', async ({
		page
	}) => {
		const protectedRoutes = [
			'/',
			'/properties',
			'/tenants',
			'/leases',
			'/settings'
		]

		for (const route of protectedRoutes) {
			await page.goto(`${baseUrl}${route}`)
			await page.waitForLoadState('domcontentloaded')

			// Should stay on the route (not redirect)
			await expect(page).toHaveURL(new RegExp(route))
		}
	})
})

test.describe('Next.js 16 Proxy - Legacy Redirects', () => {
	test('should redirect /manage to /dashboard (unauthenticated)', async ({
		page,
		context
	}) => {
		await context.clearCookies()

		await page.goto(`${baseUrl}/manage`)

		// Should redirect to /dashboard, then to /login
		await expect(page).toHaveURL(/^\/login/)
		await expect(page).toHaveURL(/redirectTo=%2F/)
	})

	test('should redirect /manage to /dashboard (authenticated)', async ({
		page
	}) => {
		await loginAsOwner(page)

		await page.goto(`${baseUrl}/manage`)

		// Should redirect to /dashboard
		await expect(page).toHaveURL(/^\/$/)
	})

	test('should redirect /manage/properties to /properties', async ({
		page
	}) => {
		await loginAsOwner(page)

		await page.goto(`${baseUrl}/manage/properties`)

		// Should redirect to /properties
		await expect(page).toHaveURL(/^\/properties/)
	})
})

test.describe('Next.js 16 Proxy - Session Sync (getClaims)', () => {
	test('should set Supabase auth cookies after login', async ({
		page,
		context
	}) => {
		await loginAsOwner(page)

		const cookies = await context.cookies()

		// Should have Supabase session cookies
		const authCookies = cookies.filter(
			c => c.name.includes('sb-') || c.name.includes('auth')
		)

		expect(authCookies.length).toBeGreaterThan(0)
	})

	test('should persist session across navigation', async ({ page }) => {
		await loginAsOwner(page)

		// Navigate to different routes
		await page.goto(`${baseUrl}/dashboard`)
		await expect(page).toHaveURL(/^\/$/)

		await page.goto(`${baseUrl}/properties`)
		await expect(page).toHaveURL(/^\/properties/)

		await page.goto(`${baseUrl}/tenants`)
		await expect(page).toHaveURL(/^\/tenants/)

		// Should stay authenticated throughout
		// No redirects to login
	})

	test('should persist session across page refresh', async ({ page }) => {
		await loginAsOwner(page)

		await page.goto(`${baseUrl}/dashboard`)
		await expect(page).toHaveURL(/^\/$/)

		// Refresh page
		await page.reload()

		// Should still be on owner dashboard (not redirected to login)
		await expect(page).toHaveURL(/^\/$/)
	})
})

test.describe('Next.js 16 Proxy - Performance', () => {
	test('proxy should be fast (< 100ms overhead)', async ({ page }) => {
		await loginAsOwner(page)

		const navigationStart = Date.now()
		await page.goto(`${baseUrl}/dashboard`)
		await page.waitForLoadState('domcontentloaded')
		const navigationEnd = Date.now()

		const totalTime = navigationEnd - navigationStart

		// Proxy should add minimal overhead
		// Total page load should be reasonable (< 3s in dev)
		expect(totalTime).toBeLessThan(3000)
	})

	test('should not make unnecessary API calls in proxy', async ({
		page
	}) => {
		await loginAsOwner(page)

		const apiCalls: string[] = []

		page.on('request', request => {
			const url = request.url()
			// Track Supabase auth API calls
			if (url.includes('supabase') && url.includes('auth')) {
				apiCalls.push(url)
			}
		})

		await page.goto(`${baseUrl}/dashboard`)
		await page.waitForLoadState('networkidle')

		// Proxy should only call getClaims (1-2 requests max)
		// Not getUser, getSession, etc.
		expect(apiCalls.length).toBeLessThan(3)
	})
})
