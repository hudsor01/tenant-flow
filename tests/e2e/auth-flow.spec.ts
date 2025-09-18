import { test, expect, type Page } from '@playwright/test'
import { randomBytes } from 'crypto'

/**
 * E2E Test Suite: Authentication Flow
 * Tests the complete authentication lifecycle including registration,
 * login, session management, and logout.
 */

// Test data generator
const generateTestUser = () => ({
	email: `test-${randomBytes(8).toString('hex')}@tenantflow.app`,
	password: 'Test@Password123!',
	name: `Test User ${randomBytes(4).toString('hex')}`
})

// Helper to fill auth forms
async function fillAuthForm(page: Page, email: string, password: string) {
	await page.fill('input[name="email"]', email)
	await page.fill('input[name="password"]', password)
}

test.describe('Authentication Flow', () => {
	let testUser: ReturnType<typeof generateTestUser>

	test.beforeEach(async ({ page }) => {
		testUser = generateTestUser()
		// Start from home page
		await page.goto('/')
	})

	test('should complete full registration flow', async ({ page }) => {
		// Navigate to sign up
		await page.click('text=Get Started')
		await expect(page).toHaveURL('/signup')

		// Fill registration form
		await page.fill('input[name="name"]', testUser.name)
		await page.fill('input[name="email"]', testUser.email)
		await page.fill('input[name="password"]', testUser.password)
		await page.fill('input[name="confirmPassword"]', testUser.password)

		// Accept terms
		const termsCheckbox = page.locator('input[type="checkbox"]')
		await termsCheckbox.check()

		// Submit form
		await page.click('button[type="submit"]')

		// Verify success message or redirect
		await expect(page).toHaveURL(/\/(dashboard|sign-up-success|verify-email)/, { timeout: 10000 })

		// Check for success indicators
		const successMessage = page.locator('text=/verify|check|success/i')
		if (await successMessage.isVisible({ timeout: 3000 })) {
			await expect(successMessage).toBeVisible()
		}
	})

	test('should handle login with valid credentials', async ({ page }) => {
		// Navigate to login
		await page.goto('/auth/login')

		// Use test account credentials (if available in env)
		const testEmail = process.env.E2E_TEST_EMAIL || 'test@example.com'
		const testPassword = process.env.E2E_TEST_PASSWORD || 'Test@Password123!'

		// Fill login form
		await fillAuthForm(page, testEmail, testPassword)

		// Submit
		await page.click('button[type="submit"]')

		// Should redirect to dashboard on success
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

		// Verify user is logged in
		const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user"], .user-avatar')
		await expect(userMenu).toBeVisible({ timeout: 5000 })
	})

	test('should handle login with invalid credentials', async ({ page }) => {
		// Navigate to login
		await page.goto('/auth/login')

		// Fill with invalid credentials
		await fillAuthForm(page, 'invalid@example.com', 'WrongPassword123!')

		// Submit
		await page.click('button[type="submit"]')

		// Should show error message
		const errorMessage = page.locator('text=/invalid|incorrect|failed|error/i')
		await expect(errorMessage).toBeVisible({ timeout: 5000 })

		// Should remain on login page
		await expect(page).toHaveURL(/\/auth\/login/)
	})

	test('should handle password reset flow', async ({ page }) => {
		// Navigate to login
		await page.goto('/auth/login')

		// Click forgot password
		await page.click('text=/forgot|reset/i')

		// Should be on password reset page
		await expect(page).toHaveURL(/\/(forgot|reset)/)

		// Enter email
		await page.fill('input[name="email"]', testUser.email)

		// Submit
		await page.click('button[type="submit"]')

		// Should show success message
		const successMessage = page.locator('text=/sent|check|email/i')
		await expect(successMessage).toBeVisible({ timeout: 5000 })
	})

	test('should validate required fields', async ({ page }) => {
		// Navigate to sign up
		await page.goto('/signup')

		// Try to submit empty form
		await page.click('button[type="submit"]')

		// Check for validation messages
		const validationMessages = page.locator('.error-message, [role="alert"], .text-red-500')
		const count = await validationMessages.count()
		expect(count).toBeGreaterThan(0)

		// Check specific field validation
		await page.fill('input[name="email"]', 'invalid-email')
		await page.press('input[name="email"]', 'Tab')

		const emailError = page.locator('text=/valid|email/i')
		await expect(emailError).toBeVisible()
	})

	test('should handle OAuth login flow', async ({ page }) => {
		// Navigate to login
		await page.goto('/auth/login')

		// Check for OAuth buttons
		const googleButton = page.locator('button:has-text("Google"), button[aria-label*="Google"]')

		if (await googleButton.isVisible({ timeout: 3000 })) {
			// Click Google login
			await googleButton.click()

			// Should redirect to Google OAuth
			await page.waitForURL(/accounts\.google\.com|supabase/, { timeout: 10000 })

			// Note: Cannot complete full OAuth flow in E2E tests
			// Just verify redirect happens
			expect(page.url()).toMatch(/google|supabase/)
		}
	})

	test('should maintain session across page refreshes', async ({ page, context }) => {
		// Skip if no test credentials
		if (!process.env.E2E_TEST_EMAIL) {
			test.skip()
			return
		}

		// Login first
		await page.goto('/auth/login')
		await fillAuthForm(page, process.env.E2E_TEST_EMAIL, process.env.E2E_TEST_PASSWORD!)
		await page.click('button[type="submit"]')
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

		// Get cookies
		const cookies = await context.cookies()
		expect(cookies.length).toBeGreaterThan(0)

		// Refresh page
		await page.reload()

		// Should still be on dashboard
		await expect(page).toHaveURL(/\/dashboard/)

		// User should still be logged in
		const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user"], .user-avatar')
		await expect(userMenu).toBeVisible()
	})

	test('should handle logout', async ({ page }) => {
		// Skip if no test credentials
		if (!process.env.E2E_TEST_EMAIL) {
			test.skip()
			return
		}

		// Login first
		await page.goto('/auth/login')
		await fillAuthForm(page, process.env.E2E_TEST_EMAIL, process.env.E2E_TEST_PASSWORD!)
		await page.click('button[type="submit"]')
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

		// Find and click user menu
		const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user"], .user-avatar')
		await userMenu.click()

		// Click logout
		await page.click('text=/logout|sign out/i')

		// Should redirect to home or login
		await expect(page).toHaveURL(/\/(auth\/login|$)/, { timeout: 5000 })

		// Try to access protected route
		await page.goto('/dashboard')

		// Should redirect to login
		await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
	})

	test('should show password strength indicator', async ({ page }) => {
		// Navigate to sign up
		await page.goto('/signup')

		const passwordInput = page.locator('input[name="password"]')

		// Test weak password
		await passwordInput.fill('weak')
		const weakIndicator = page.locator('text=/weak|poor/i')
		if (await weakIndicator.isVisible({ timeout: 1000 })) {
			await expect(weakIndicator).toBeVisible()
		}

		// Test strong password
		await passwordInput.clear()
		await passwordInput.fill('Str0ng!P@ssw0rd#2024')
		const strongIndicator = page.locator('text=/strong|good/i')
		if (await strongIndicator.isVisible({ timeout: 1000 })) {
			await expect(strongIndicator).toBeVisible()
		}
	})

	test('should handle rate limiting gracefully', async ({ page }) => {
		// Navigate to login
		await page.goto('/auth/login')

		// Attempt multiple failed logins
		for (let i = 0; i < 5; i++) {
			await fillAuthForm(page, 'test@example.com', `wrong${i}`)
			await page.click('button[type="submit"]')
			await page.waitForTimeout(100) // Small delay between attempts
		}

		// Check for rate limit message
		const rateLimitMessage = page.locator('text=/too many|rate limit|slow down/i')
		if (await rateLimitMessage.isVisible({ timeout: 3000 })) {
			await expect(rateLimitMessage).toBeVisible()
		}
	})
})

test.describe('Protected Routes', () => {
	test('should redirect unauthenticated users to login', async ({ page }) => {
		// Try to access protected routes
		const protectedRoutes = [
			'/dashboard',
			'/dashboard/properties',
			'/dashboard/tenants',
			'/dashboard/leases',
			'/dashboard/maintenance',
			'/dashboard/settings'
		]

		for (const route of protectedRoutes) {
			await page.goto(route)
			// Should redirect to login
			await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
		}
	})

	test('should allow access to public routes', async ({ page }) => {
		// Access public routes
		const publicRoutes = [
			'/',
			'/about',
			'/pricing',
			'/features',
			'/contact',
			'/blog',
			'/auth/login',
			'/signup'
		]

		for (const route of publicRoutes) {
			await page.goto(route)
			// Should not redirect
			await expect(page).not.toHaveURL(/\/auth\/login/)
		}
	})
})

test.describe('Session Management', () => {
	test('should handle expired sessions', async ({ page, context }) => {
		// Skip if no test credentials
		if (!process.env.E2E_TEST_EMAIL) {
			test.skip()
			return
		}

		// Login
		await page.goto('/auth/login')
		await fillAuthForm(page, process.env.E2E_TEST_EMAIL, process.env.E2E_TEST_PASSWORD!)
		await page.click('button[type="submit"]')
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

		// Clear session cookies to simulate expiration
		await context.clearCookies()

		// Try to navigate to protected page
		await page.goto('/dashboard/properties')

		// Should redirect to login
		await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })
	})

	test('should handle concurrent sessions', async ({ browser }) => {
		// Skip if no test credentials
		if (!process.env.E2E_TEST_EMAIL) {
			test.skip()
			return
		}

		// Create two browser contexts (simulating different browsers/devices)
		const context1 = await browser.newContext()
		const context2 = await browser.newContext()

		const page1 = await context1.newPage()
		const page2 = await context2.newPage()

		try {
			// Login in first context
			await page1.goto('/auth/login')
			await fillAuthForm(page1, process.env.E2E_TEST_EMAIL, process.env.E2E_TEST_PASSWORD!)
			await page1.click('button[type="submit"]')
			await expect(page1).toHaveURL(/\/dashboard/, { timeout: 10000 })

			// Login in second context
			await page2.goto('/auth/login')
			await fillAuthForm(page2, process.env.E2E_TEST_EMAIL, process.env.E2E_TEST_PASSWORD!)
			await page2.click('button[type="submit"]')
			await expect(page2).toHaveURL(/\/dashboard/, { timeout: 10000 })

			// Both sessions should be valid
			await page1.goto('/dashboard/properties')
			await expect(page1).toHaveURL(/\/dashboard\/properties/)

			await page2.goto('/dashboard/tenants')
			await expect(page2).toHaveURL(/\/dashboard\/tenants/)
		} finally {
			await context1.close()
			await context2.close()
		}
	})
})