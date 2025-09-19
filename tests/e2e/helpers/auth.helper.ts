import { Page, expect } from '@playwright/test'

/**
 * Authentication helper for Playwright tests
 * Provides reusable auth methods across tests
 */
export class AuthHelper {
	constructor(private page: Page) {}

	/**
	 * Login with email and password
	 */
	async login(email: string, password: string) {
		await this.page.goto('/login')
		await this.page.fill('[data-testid="email-input"]', email)
		await this.page.fill('[data-testid="password-input"]', password)
		await this.page.click('[data-testid="login-button"]')

		// Wait for redirect to dashboard
		await this.page.waitForURL('/dashboard', {
			timeout: 30000,
			waitUntil: 'networkidle'
		})
	}

	/**
	 * Logout current user
	 */
	async logout() {
		await this.page.click('[data-testid="user-menu"]')
		await this.page.click('[data-testid="logout-button"]')
		await this.page.waitForURL('/login', {
			timeout: 10000
		})
	}

	/**
	 * Sign up new user
	 */
	async signup(email: string, password: string, name?: string) {
		await this.page.goto('/signup')

		if (name) {
			await this.page.fill('[data-testid="name-input"]', name)
		}

		await this.page.fill('[data-testid="email-input"]', email)
		await this.page.fill('[data-testid="password-input"]', password)
		await this.page.fill('[data-testid="confirm-password-input"]', password)

		// Accept terms if present
		const termsCheckbox = this.page.locator('[data-testid="terms-checkbox"]')
		if (await termsCheckbox.isVisible()) {
			await termsCheckbox.check()
		}

		await this.page.click('[data-testid="signup-button"]')

		// Wait for redirect after signup
		await this.page.waitForURL('/dashboard', {
			timeout: 30000,
			waitUntil: 'networkidle'
		})
	}

	/**
	 * Verify user is logged in
	 */
	async verifyLoggedIn() {
		await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible()
	}

	/**
	 * Verify user is logged out
	 */
	async verifyLoggedOut() {
		await expect(this.page).toHaveURL('/login')
		await expect(this.page.locator('[data-testid="login-button"]')).toBeVisible()
	}

	/**
	 * Get current user info from UI
	 */
	async getCurrentUser() {
		const userMenu = this.page.locator('[data-testid="user-menu"]')
		if (!await userMenu.isVisible()) {
			return null
		}

		await userMenu.click()

		const userName = await this.page.locator('[data-testid="user-name"]').textContent()
		const userEmail = await this.page.locator('[data-testid="user-email"]').textContent()

		// Close menu
		await this.page.keyboard.press('Escape')

		return {
			name: userName?.trim(),
			email: userEmail?.trim()
		}
	}

	/**
	 * Switch between user roles (requires re-login)
	 */
	async switchUserRole(role: 'admin' | 'user' | 'landlord' | 'tenant') {
		// Logout current user if logged in
		const userMenu = this.page.locator('[data-testid="user-menu"]')
		if (await userMenu.isVisible()) {
			await this.logout()
		}

		// Login with role-specific credentials
		const credentials = {
			admin: {
				email: process.env.E2E_ADMIN_EMAIL || 'test.admin@example.com',
				password: process.env.E2E_ADMIN_PASSWORD || 'AdminPassword123!'
			},
			user: {
				email: process.env.E2E_USER_EMAIL || 'test.user@example.com',
				password: process.env.E2E_USER_PASSWORD || 'TestPassword123!'
			},
			landlord: {
				email: process.env.E2E_LANDLORD_EMAIL || 'test.landlord@example.com',
				password: process.env.E2E_LANDLORD_PASSWORD || 'LandlordPassword123!'
			},
			tenant: {
				email: process.env.E2E_TENANT_EMAIL || 'test.tenant@example.com',
				password: process.env.E2E_TENANT_PASSWORD || 'TenantPassword123!'
			}
		}

		const creds = credentials[role]
		await this.login(creds.email, creds.password)
	}

	/**
	 * Request password reset
	 */
	async requestPasswordReset(email: string) {
		await this.page.goto('/forgot-password')
		await this.page.fill('[data-testid="email-input"]', email)
		await this.page.click('[data-testid="reset-password-button"]')

		// Wait for success message
		await expect(
			this.page.locator('[data-testid="reset-email-sent"]')
		).toBeVisible()
	}

	/**
	 * Complete password reset with token
	 */
	async resetPassword(token: string, newPassword: string) {
		await this.page.goto(`/reset-password?token=${token}`)
		await this.page.fill('[data-testid="new-password-input"]', newPassword)
		await this.page.fill('[data-testid="confirm-password-input"]', newPassword)
		await this.page.click('[data-testid="reset-password-button"]')

		// Wait for redirect to login
		await this.page.waitForURL('/login', {
			timeout: 10000
		})
	}
}