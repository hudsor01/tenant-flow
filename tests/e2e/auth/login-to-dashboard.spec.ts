import { test, expect } from '@playwright/test'
import { AuthHelper } from '../helpers/auth.helper'
import { DashboardPage } from '../pages/dashboard.page'

test.describe('Authentication Flow to Dashboard', () => {
	let authHelper: AuthHelper
	let dashboardPage: DashboardPage

	test.beforeEach(async ({ page }) => {
		authHelper = new AuthHelper(page)
		dashboardPage = new DashboardPage(page)
	})

	test('should login and navigate to dashboard', async ({ page }) => {
		// Clear any existing auth state for this test
		await page.context().clearCookies()

		// Perform login
		await authHelper.login(
			process.env.E2E_USER_EMAIL || 'test.user@example.com',
			process.env.E2E_USER_PASSWORD || 'TestPassword123!'
		)

		// Verify logged in
		await authHelper.verifyLoggedIn()

		// Verify dashboard loaded
		await dashboardPage.verifyLoaded()
		await dashboardPage.verifyDataLoaded()

		// Screenshot removed - visual validation no longer needed

		// Get and verify stats
		const stats = await dashboardPage.getStats()
		expect(stats.totalProperties).toBeTruthy()
		expect(stats.totalTenants).toBeTruthy()
	})

	test('should persist auth state across page reloads', async ({ page }) => {
		// This test uses the stored auth state from global setup
		await dashboardPage.goto()
		await dashboardPage.verifyLoaded()

		// Reload page
		await page.reload()

		// Should still be logged in
		await authHelper.verifyLoggedIn()
		await dashboardPage.verifyLoaded()
	})

	test('should logout and redirect to login page', async ({ page }) => {
		// Start from dashboard (using stored auth)
		await dashboardPage.goto()
		await dashboardPage.verifyLoaded()

		// Perform logout
		await authHelper.logout()

		// Verify logged out
		await authHelper.verifyLoggedOut()

		// Try to access dashboard - should redirect to login
		await page.goto('/dashboard')
		await expect(page).toHaveURL('/login')
	})

	test('should handle invalid credentials', async ({ page }) => {
		// Clear auth state
		await page.context().clearCookies()

		// Try to login with invalid credentials
		await page.goto('/login')
		await page.fill('[data-testid="email-input"]', 'invalid@example.com')
		await page.fill('[data-testid="password-input"]', 'WrongPassword123!')
		await page.click('[data-testid="login-button"]')

		// Should show error message
		await expect(
			page.locator('[data-testid="error-message"]')
		).toContainText(/Invalid email or password/)

		// Should stay on login page
		await expect(page).toHaveURL('/login')
	})

	test('should switch between user roles', async ({ page }) => {
		// Start as regular user
		await authHelper.switchUserRole('user')
		await dashboardPage.goto()

		// Verify user dashboard
		await dashboardPage.verifyLoaded()
		const userInfo = await authHelper.getCurrentUser()
		expect(userInfo?.email).toContain('test.user')

		// Switch to admin
		await authHelper.switchUserRole('admin')
		await dashboardPage.goto()

		// Verify admin dashboard
		await dashboardPage.verifyLoaded()
		const adminInfo = await authHelper.getCurrentUser()
		expect(adminInfo?.email).toContain('test.admin')

		// Admin should see additional features
		await expect(
			page.locator('[data-testid="admin-panel"]')
		).toBeVisible()
	})

	test('should navigate to different dashboard sections', async ({ page }) => {
		// Use stored auth state
		await dashboardPage.goto()
		await dashboardPage.verifyLoaded()

		// Navigate to properties
		await dashboardPage.navigateTo('properties')
		await expect(page).toHaveURL(/\/properties/)

		// Navigate to tenants
		await dashboardPage.navigateTo('tenants')
		await expect(page).toHaveURL(/\/tenants/)

		// Navigate to maintenance
		await dashboardPage.navigateTo('maintenance')
		await expect(page).toHaveURL(/\/maintenance/)
	})

	test('should use quick actions from dashboard', async ({ page }) => {
		await dashboardPage.goto()
		await dashboardPage.verifyLoaded()

		// Test add property quick action
		await dashboardPage.performQuickAction('add-property')
		await expect(
			page.locator('[data-testid="add-property-modal"]')
		).toBeVisible()

		// Close modal
		await page.keyboard.press('Escape')

		// Test create maintenance quick action
		await dashboardPage.performQuickAction('create-maintenance')
		await expect(
			page.locator('[data-testid="create-maintenance-modal"]')
		).toBeVisible()
	})

	test('should search from dashboard', async ({ page }) => {
		await dashboardPage.goto()
		await dashboardPage.verifyLoaded()

		// Perform search
		await dashboardPage.search('apartment')

		// Verify search results
		await expect(
			page.locator('[data-testid="search-results"]')
		).toBeVisible()
	})
})

test.describe('Dashboard Snapshots', () => {
	test('should match dashboard visual snapshot', async ({ page }) => {
		const dashboardPage = new DashboardPage(page)

		// Navigate to dashboard with auth
		await dashboardPage.goto()
		await dashboardPage.verifyLoaded()
		await dashboardPage.verifyDataLoaded()

		// Wait for animations to complete
		await page.waitForTimeout(1000)

		// Take visual snapshot
		await expect(page).toHaveScreenshot('dashboard-full.png', {
			fullPage: true,
			animations: 'disabled'
		})

		// Test stats section specifically
		await expect(
			page.locator('[data-testid="dashboard-stats"]')
		).toHaveScreenshot('dashboard-stats.png')
	})
})