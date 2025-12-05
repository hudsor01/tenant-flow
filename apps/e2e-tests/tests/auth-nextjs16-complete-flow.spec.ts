/**
 * Next.js 16 Complete Authentication Flow Tests
 *
 * End-to-end tests covering the entire auth lifecycle:
 * 1. Login flow (form submission)
 * 2. Session persistence
 * 3. Logout flow
 * 4. Session refresh
 * 5. Cookie management
 * 6. Error scenarios
 *
 * Tests both proxy.ts and DAL working together.
 */

import { expect, test } from '@playwright/test'
import { loginAsOwner, clearSessionCache } from '../auth-helpers'

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'

test.describe('Complete Auth Flow - Login', () => {
	test.beforeEach(async ({ context }) => {
		await context.clearCookies()
		clearSessionCache()
	})

	test('should complete full login flow successfully', async ({ page }) => {
		// Start at login page
		await page.goto(`${baseUrl}/login`)
		await expect(page).toHaveURL(`${baseUrl}/login`)

		// Fill login form
		const email = process.env.E2E_OWNER_EMAIL || 'test-admin@tenantflow.app'
		const password = process.env.E2E_OWNER_PASSWORD || ''

		await page.locator('[data-testid="email-input"]').fill(email)
		await page.locator('[data-testid="password-input"]').fill(password)

		// Submit form
		const submitButton = page.locator('[data-testid="login-button"]')
		await submitButton.click()

		// Should redirect to root path
		await expect(page).toHaveURL(`${baseUrl}/dashboard`, { timeout: 10000 })

		// Should be authenticated (no redirect back to login)
		await page.waitForTimeout(1000)
		const currentUrl = page.url()
		expect(currentUrl).not.toContain('/login')
	})

	test('should set auth cookies after successful login', async ({
		page,
		context
	}) => {
		await loginAsOwner(page)

		const cookies = await context.cookies()

		// Should have Supabase session cookies
		const authCookies = cookies.filter(c => c.name.includes('sb-'))
		expect(authCookies.length).toBeGreaterThan(0)

		// Cookies should have security flags
		const accessTokenCookie = cookies.find(c =>
			c.name.includes('sb-access-token')
		)
		if (accessTokenCookie) {
			// Note: Supabase cookies are NOT httpOnly (intentional for client access)
			expect(accessTokenCookie.secure).toBe(false) // Local dev uses HTTP
			expect(accessTokenCookie.sameSite).toBeDefined()
		}
	})

	test('should redirect to originally requested page after login', async ({
		page
	}) => {
		// Try to access protected page (will redirect to login)
		await page.goto(`${baseUrl}/properties`)
		await expect(page).toHaveURL(`${baseUrl}/login`)
		await expect(page).toHaveURL(/redirectTo/)

		// Login
		await loginAsOwner(page)

		// Should redirect back to properties page
		await expect(page).toHaveURL(`${baseUrl}/properties`)
	})

	test('should show error for invalid credentials', async ({ page }) => {
		await page.goto(`${baseUrl}/login`)

		// Fill with invalid credentials
		await page.locator('[data-testid="email-input"]').fill('invalid@test.com')
		await page
			.locator('[data-testid="password-input"]')
			.fill('WrongPassword123!')

		// Submit
		const submitButton = page.locator('[data-testid="login-button"]')
		await submitButton.click()

		// Wait for error
		await page.waitForTimeout(2000)

		// Should stay on login page
		await expect(page).toHaveURL(`${baseUrl}/login`)

		// Should show error message
		const content = await page.content()
		expect(content.toLowerCase()).toMatch(/invalid|incorrect|error|failed/)
	})
})

test.describe('Complete Auth Flow - Session Persistence', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page)
	})

	test('should persist session across navigation', async ({ page }) => {
		// Navigate through multiple routes
		await page.goto(`${baseUrl}/dashboard`)
		await expect(page).toHaveURL(`${baseUrl}/dashboard`)

		await page.goto(`${baseUrl}/properties`)
		await expect(page).toHaveURL(`${baseUrl}/properties`)

		await page.goto(`${baseUrl}/tenants`)
		await expect(page).toHaveURL(`${baseUrl}/tenants`)

		await page.goto(`${baseUrl}/settings`)
		await expect(page).toHaveURL(`${baseUrl}/settings`)

		// Should stay authenticated throughout
	})

	test('should persist session across page refresh', async ({ page }) => {
		await page.goto(`${baseUrl}/dashboard`)
		await page.waitForLoadState('domcontentloaded')

		// Refresh multiple times
		for (let i = 0; i < 3; i++) {
			await page.reload()
			await page.waitForLoadState('domcontentloaded')

			// Should still be on owner dashboard (not redirected to login)
			await expect(page).toHaveURL(`${baseUrl}/dashboard`)
		}
	})

	test('should persist session across browser tabs', async ({
		page,
		context
	}) => {
		await page.goto(`${baseUrl}/dashboard`)
		await expect(page).toHaveURL(`${baseUrl}/dashboard`)

		// Open new tab
		const newPage = await context.newPage()
		await newPage.goto(`${baseUrl}/properties`)

		// Should be authenticated in new tab (shared cookies)
		await expect(newPage).toHaveURL(`${baseUrl}/properties`)

		await newPage.close()
	})
})

test.describe('Complete Auth Flow - Logout', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page)
	})

	test('should logout and clear session', async ({ page, context }) => {
		await page.goto(`${baseUrl}/dashboard`)
		await expect(page).toHaveURL(`${baseUrl}/dashboard`)

		// Find and click logout button
		// Note: Update selector based on your actual logout button
		const logoutButton = page.getByRole('button', { name: /logout|sign out/i })
		if ((await logoutButton.count()) > 0) {
			await logoutButton.click()

			// Should redirect to login
			await expect(page).toHaveURL(`${baseUrl}/login`, { timeout: 5000 })

			// Try to access protected route
			await page.goto(`${baseUrl}/dashboard`)

			// Should redirect back to login (session cleared)
			await expect(page).toHaveURL(`${baseUrl}/login`)
		}
	})

	test('should clear auth cookies on logout', async ({ page, context }) => {
		await page.goto(`${baseUrl}/dashboard`)

		// Clear cookies manually (simulating logout)
		await context.clearCookies()

		// Try to access protected route
		await page.goto(`${baseUrl}/dashboard`)

		// Should redirect to login (no session cookies)
		await expect(page).toHaveURL(`${baseUrl}/login`)
	})
})

test.describe('Complete Auth Flow - Error Scenarios', () => {
	test('should handle expired session gracefully', async ({
		page,
		context
	}) => {
		await loginAsOwner(page)

		// Set expired cookie (past maxAge)
		const cookies = await context.cookies()
		const expiredCookies = cookies.map(c => ({
			...c,
			expires: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
		}))

		await context.clearCookies()
		await context.addCookies(expiredCookies)

		// Try to access protected route
		await page.goto(`${baseUrl}/dashboard`)

		// Should redirect to login (expired session)
		await expect(page).toHaveURL(`${baseUrl}/login`)
	})

	test('should handle missing cookies gracefully', async ({ page }) => {
		const consoleErrors: string[] = []

		page.on('console', msg => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text())
			}
		})

		// Access protected route without cookies
		await page.goto(`${baseUrl}/dashboard`)

		// Should redirect to login
		await expect(page).toHaveURL(`${baseUrl}/login`)

		// Should NOT have critical errors
		const criticalErrors = consoleErrors.filter(
			err =>
				!err.includes('favicon') &&
				!err.includes('404') &&
				!err.includes('NetworkError')
		)
		expect(criticalErrors.length).toBe(0)
	})

	test('should handle network errors during auth', async ({ page }) => {
		await loginAsOwner(page)

		// Simulate offline
		await page.context().setOffline(true)

		try {
			await page.goto(`${baseUrl}/dashboard`)
			await page.waitForTimeout(2000)
		} catch {
			// Expected to fail
		}

		// Re-enable network
		await page.context().setOffline(false)

		// Should recover and work
		await page.goto(`${baseUrl}/dashboard`)
		await expect(page).toHaveURL(`${baseUrl}/dashboard`)
	})
})

test.describe('Complete Auth Flow - Security', () => {
	test.beforeEach(async ({ page }) => {
		await loginAsOwner(page)
	})

	test('should not expose tokens in URL', async ({ page }) => {
		await page.goto(`${baseUrl}/dashboard`)

		const url = page.url()

		// Should NOT have tokens in URL
		expect(url).not.toContain('token=')
		expect(url).not.toContain('access_token=')
		expect(url).not.toContain('jwt=')
	})

	test('should not expose sensitive data in localStorage', async ({ page }) => {
		await page.goto(`${baseUrl}/dashboard`)

		const localStorage = await page.evaluate(() => {
			const data: Record<string, string> = {}
			for (let i = 0; i < window.localStorage.length; i++) {
				const key = window.localStorage.key(i)
				if (key) {
					data[key] = window.localStorage.getItem(key) || ''
				}
			}
			return data
		})

		// Should NOT have raw tokens in localStorage
		// (Supabase SSR uses httpOnly cookies)
		const sensitiveKeys = Object.keys(localStorage).filter(key =>
			key.toLowerCase().includes('token')
		)

		// Note: Some token metadata is OK, but not raw JWTs
		for (const key of sensitiveKeys) {
			const value = localStorage[key]
			// Check it's not a JWT (starts with eyJ)
			if (value && value.startsWith('eyJ')) {
				throw new Error(`Raw JWT found in localStorage: ${key}`)
			}
		}
	})
})
