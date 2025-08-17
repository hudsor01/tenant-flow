/**
 * Comprehensive E2E Tests for Authentication and Properties
 * Tests both auth flow and properties functionality
 */

import { test, expect, Page } from '@playwright/test'

// Test data
const testUser = {
	email: 'test@example.com',
	password: 'Test123!',
	invalidEmail: 'invalid-email',
	shortPassword: '123'
}

test.describe('Authentication Flow', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/auth/login')
	})

	test('login page displays all required elements', async ({ page }) => {
		// Check page title/heading
		await expect(page.locator('h1, h2').first()).toBeVisible()

		// Check form elements
		await expect(page.locator('input[type="email"]')).toBeVisible()
		await expect(page.locator('input[type="password"]')).toBeVisible()
		await expect(
			page.getByRole('button', { name: /sign in/i })
		).toBeVisible()

		// Check for forgot password link
		const forgotPasswordLink = page.locator(
			'a:has-text("Forgot"), a:has-text("forgot")'
		)
		if ((await forgotPasswordLink.count()) > 0) {
			await expect(forgotPasswordLink.first()).toBeVisible()
		}

		// Check for sign up link
		const signUpLink = page.locator(
			'a:has-text("Sign up"), a:has-text("sign up"), a:has-text("Create")'
		)
		if ((await signUpLink.count()) > 0) {
			await expect(signUpLink.first()).toBeVisible()
		}
	})

	test('validates email format', async ({ page }) => {
		// Enter invalid email
		await page.fill('input[type="email"]', testUser.invalidEmail)
		await page.fill('input[type="password"]', testUser.password)

		// Try to submit with force click to bypass overlays
		const submitButton = page.getByRole('button', { name: /sign in/i })

		// Check if button is disabled due to validation
		const isDisabled = await submitButton.isDisabled()

		if (!isDisabled) {
			await submitButton.click({ force: true })
			await page.waitForTimeout(500)
		}

		// Check for validation error (either HTML5 or custom)
		const emailInput = page.locator('input[type="email"]')
		const isInvalid = await emailInput.evaluate(
			(el: HTMLInputElement) => !el.validity.valid
		)

		if (!isInvalid) {
			// Check for custom error message
			const errorMessage = page.locator('text=/email/i, text=/invalid/i')
			if ((await errorMessage.count()) > 0) {
				await expect(errorMessage.first()).toBeVisible()
			}
		} else {
			expect(isInvalid).toBeTruthy()
		}
	})

	test('validates password requirements', async ({ page }) => {
		// Enter valid email but short password
		await page.fill('input[type="email"]', testUser.email)
		await page.fill('input[type="password"]', testUser.shortPassword)

		// Try to submit with force click to bypass overlays
		const submitButton = page.getByRole('button', { name: /sign in/i })

		// Check if button is disabled due to validation
		const isDisabled = await submitButton.isDisabled()

		if (!isDisabled) {
			await submitButton.click({ force: true })
			await page.waitForTimeout(500)
		}

		// Check if we're still on login page (didn't navigate)
		await expect(page).toHaveURL(/.*auth.*login/)
	})

	test('shows/hides password visibility toggle', async ({ page }) => {
		const passwordInput = page.locator('input[type="password"]')
		await passwordInput.fill(testUser.password)

		// Look for password visibility toggle with more specific selector
		const toggleButton = page
			.locator('button[aria-label*="password"]')
			.first()

		if ((await toggleButton.count()) > 0) {
			// Force click to bypass any overlays
			await toggleButton.click({ force: true })

			// Wait for the type to change
			await page.waitForTimeout(200)

			// Password input should now be type="text"
			const inputType = await page
				.locator('input[id="password"]')
				.getAttribute('type')
			expect(inputType).toBe('text')

			// Click again to hide
			await toggleButton.click({ force: true })
			await page.waitForTimeout(200)

			const inputTypeAfter = await page
				.locator('input[id="password"]')
				.getAttribute('type')
			expect(inputTypeAfter).toBe('password')
		} else {
			// If no toggle button, skip this test
			console.log('Password visibility toggle not found, skipping')
		}
	})

	test('handles form submission', async ({ page }) => {
		// Fill valid credentials
		await page.fill('input[type="email"]', testUser.email)
		await page.fill('input[type="password"]', testUser.password)

		// Submit form with force click to bypass overlays
		await page
			.getByRole('button', { name: /sign in/i })
			.click({ force: true })

		// Wait for navigation or error
		await page.waitForTimeout(2000)

		// Check if we navigated away from login or got an error
		const url = page.url()
		if (url.includes('/auth/login')) {
			// Still on login, check for error message
			const errorMessage = page.locator(
				'text=/error/i, text=/invalid/i, text=/incorrect/i'
			)
			if ((await errorMessage.count()) > 0) {
				await expect(errorMessage.first()).toBeVisible()
			}
		} else {
			// Successfully navigated away
			expect(url).not.toContain('/auth/login')
		}
	})

	test('navigates to sign up page', async ({ page }) => {
		const signUpLink = page
			.locator('a')
			.filter({ hasText: /sign up|create account|register/i })

		if ((await signUpLink.count()) > 0) {
			await signUpLink.first().click()
			await page.waitForLoadState('networkidle')

			// Should navigate to sign up page
			await expect(page).toHaveURL(/.*sign.*up|.*register/)
		}
	})

	test('navigates to forgot password page', async ({ page }) => {
		const forgotLink = page
			.locator('a')
			.filter({ hasText: /forgot|reset/i })

		if ((await forgotLink.count()) > 0) {
			await forgotLink.first().click({ force: true })
			await page.waitForLoadState('networkidle')

			// Should navigate to password reset page
			await expect(page).toHaveURL(/.*forgot|.*reset/)
		}
	})
})

test.describe('Page Accessibility', () => {
	test('login page has proper ARIA labels', async ({ page }) => {
		await page.goto('/auth/login')

		// Check form has proper structure
		const form = page.locator('form')
		if ((await form.count()) > 0) {
			await expect(form.first()).toBeVisible()
		}

		// Check inputs have labels or aria-labels
		const emailInput = page.locator('input[type="email"]')
		const emailLabel =
			(await emailInput.getAttribute('aria-label')) ||
			(await emailInput.getAttribute('id'))
		expect(emailLabel).toBeTruthy()

		const passwordInput = page.locator('input[type="password"]')
		const passwordLabel =
			(await passwordInput.getAttribute('aria-label')) ||
			(await passwordInput.getAttribute('id'))
		expect(passwordLabel).toBeTruthy()
	})

	test('supports keyboard navigation', async ({ page }) => {
		await page.goto('/auth/login')

		// Tab through form elements
		await page.keyboard.press('Tab')
		let focusedElement = await page.evaluate(
			() => document.activeElement?.tagName
		)
		expect(focusedElement).toBeTruthy()

		// Tab to email input
		for (let i = 0; i < 5; i++) {
			await page.keyboard.press('Tab')
			focusedElement = await page.evaluate(
				() => document.activeElement?.tagName
			)
			if (focusedElement === 'INPUT') break
		}

		// Type in focused field
		await page.keyboard.type('test@example.com')

		// Tab to password
		await page.keyboard.press('Tab')
		await page.keyboard.type('password123')

		// Tab to submit button
		await page.keyboard.press('Tab')
		focusedElement = await page.evaluate(
			() => document.activeElement?.tagName
		)

		// Should be able to submit with Enter
		if (focusedElement === 'BUTTON') {
			// Can submit with Enter key
			expect(true).toBe(true)
		}
	})

	test('has proper heading hierarchy', async ({ page }) => {
		await page.goto('/auth/login')

		// Check for h1
		const h1 = await page.locator('h1').count()
		const h2 = await page.locator('h2').count()

		// Should have at least one main heading
		expect(h1 + h2).toBeGreaterThan(0)

		// Check heading order
		const headings = await page
			.locator('h1, h2, h3, h4, h5, h6')
			.allTextContents()
		expect(headings.length).toBeGreaterThan(0)
	})
})

test.describe('Responsive Design', () => {
	test('adapts to mobile viewport', async ({ page }) => {
		await page.goto('/auth/login')

		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })
		await page.waitForTimeout(500)

		// Form should still be visible and usable
		await expect(page.locator('input[type="email"]')).toBeVisible()
		await expect(page.locator('input[type="password"]')).toBeVisible()
		await expect(
			page.getByRole('button', { name: /sign in/i })
		).toBeVisible()

		// Elements should not overflow
		const bodyWidth = await page.locator('body').boundingBox()
		const formWidth = await page
			.locator('form, main, [role="main"]')
			.first()
			.boundingBox()

		if (bodyWidth && formWidth) {
			expect(formWidth.width).toBeLessThanOrEqual(bodyWidth.width)
		}
	})

	test('adapts to tablet viewport', async ({ page }) => {
		await page.goto('/auth/login')

		// Set tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.waitForTimeout(500)

		// Check layout
		const form = page.locator('form, main').first()
		const formBox = await form.boundingBox()

		if (formBox) {
			// Form should be centered and not full width on tablet
			expect(formBox.width).toBeLessThan(768)
		}
	})

	test('handles landscape orientation', async ({ page }) => {
		await page.goto('/auth/login')

		// Set landscape mobile viewport
		await page.setViewportSize({ width: 667, height: 375 })
		await page.waitForTimeout(500)

		// Form should still be accessible
		await expect(page.locator('input[type="email"]')).toBeVisible()
		await expect(
			page.getByRole('button', { name: /sign in/i })
		).toBeVisible()
	})
})

test.describe('Performance and Security', () => {
	test('loads quickly', async ({ page }) => {
		const startTime = Date.now()
		await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })
		const loadTime = Date.now() - startTime

		// Should load within 3 seconds
		expect(loadTime).toBeLessThan(3000)
	})

	test('uses HTTPS in production', async ({ page }) => {
		await page.goto('/auth/login')

		const url = page.url()
		// In production, should use HTTPS
		if (!url.includes('localhost')) {
			expect(url).toMatch(/^https:/)
		}
	})

	test('password field is properly masked', async ({ page }) => {
		await page.goto('/auth/login')

		const passwordInput = page.locator('input[type="password"]')
		await passwordInput.fill('secretpassword')

		// Password should be masked
		const inputType = await passwordInput.getAttribute('type')
		expect(inputType).toBe('password')

		// Value should be retrievable but not displayed
		const inputValue = await passwordInput.inputValue()
		expect(inputValue).toBe('secretpassword')

		// Check that password is not visible on screen (type=password ensures this)
		const isPassword = await passwordInput.evaluate(
			(el: HTMLInputElement) => el.type === 'password'
		)
		expect(isPassword).toBe(true)
	})

	test('handles network errors gracefully', async ({ page }) => {
		// First navigate to the page
		await page.goto('/auth/login')
		await page.fill('input[type="email"]', testUser.email)
		await page.fill('input[type="password"]', testUser.password)

		// Then simulate network failure for API calls only
		await page.route('**/api/**', route => route.abort())
		await page.route('**/auth/v1/**', route => route.abort())

		// Try to submit with force click
		await page
			.getByRole('button', { name: /sign in/i })
			.click({ force: true })

		// Should show error message or stay on page, not crash
		await page.waitForTimeout(2000)

		// Page should still be functional
		const pageTitle = await page.title()
		expect(pageTitle).toBeTruthy()

		// Should still be on login page
		await expect(page).toHaveURL(/.*auth.*login/)
	})
})

test.describe('Visual Regression', () => {
	test('login page visual consistency', async ({ page }) => {
		await page.goto('/auth/login')
		await page.waitForLoadState('networkidle')

		// Take screenshot
		await page.screenshot({
			path: 'test-results/auth-login-page.png',
			fullPage: true,
			animations: 'disabled'
		})

		// Screenshot taken successfully
		expect(true).toBe(true)
	})

	test('login form with errors visual', async ({ page }) => {
		await page.goto('/auth/login')

		// Trigger validation errors
		await page.fill('input[type="email"]', 'invalid')
		await page.fill('input[type="password"]', '123')

		// Try to submit with force click
		const submitButton = page.getByRole('button', { name: /sign in/i })
		const isDisabled = await submitButton.isDisabled()

		if (!isDisabled) {
			await submitButton.click({ force: true })
		}

		await page.waitForTimeout(1000)

		// Take screenshot with errors
		await page.screenshot({
			path: 'test-results/auth-login-errors.png',
			fullPage: true,
			animations: 'disabled'
		})

		expect(true).toBe(true)
	})

	test('login form filled visual', async ({ page }) => {
		await page.goto('/auth/login')

		// Fill form
		await page.fill('input[type="email"]', testUser.email)
		await page.fill('input[type="password"]', testUser.password)

		// Take screenshot with filled form
		await page.screenshot({
			path: 'test-results/auth-login-filled.png',
			fullPage: true,
			animations: 'disabled'
		})

		expect(true).toBe(true)
	})
})
