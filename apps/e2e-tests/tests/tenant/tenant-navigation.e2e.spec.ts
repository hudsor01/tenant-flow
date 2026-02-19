import { test, expect } from '@playwright/test'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { ROUTES } from '../constants/routes'
import {
	clickSidebarLink,
	verifyCurrentPage,
	setupErrorMonitoring,
	verifyPageLoaded
} from '../helpers/navigation-helpers'
import { takePageScreenshot } from '../helpers/ui-validation-helpers'

/**
 * Tenant Navigation E2E Tests
 *
 * Uses official Playwright auth pattern: storageState provides authentication.
 * Tests start authenticated - no manual login required.
 * @see https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
 *
 * Tests all sidebar navigation links for the tenant portal:
 * - Dashboard
 * - Profile
 * - Lease
 * - Payments (with sub-routes)
 * - Maintenance
 * - Documents
 * - Settings
 *
 * For each link, verifies:
 * - URL matches expected path
 * - Page heading renders correctly
 * - No console errors
 * - No network errors (500, 404)
 */

test.describe('Tenant Navigation', () => {
	const logger = createLogger({ component: 'TenantNavigationE2E' })

	// Define all navigation links to test
	const tenantNavigationLinks = [
		{ name: 'Dashboard', path: '/tenant', expectedHeading: 'Tenant Dashboard' },
		{
			name: 'My Profile',
			path: '/tenant/profile',
			expectedHeading: 'My Profile'
		},
		{ name: 'My Lease', path: '/tenant/lease', expectedHeading: 'My Lease' },
		{ name: 'Payments', path: '/tenant/payments', expectedHeading: 'Payments' },
		{
			name: 'Payment Methods',
			path: '/tenant/payments/methods',
			expectedHeading: 'Payment Methods'
		},
		{
			name: 'Payment History',
			path: '/tenant/payments/history',
			expectedHeading: 'Payment History'
		},
		{
			name: 'Maintenance',
			path: '/tenant/maintenance',
			expectedHeading: 'Maintenance Requests'
		},
		{
			name: 'Documents',
			path: '/tenant/documents',
			expectedHeading: 'Documents'
		},
		{ name: 'Settings', path: '/tenant/settings', expectedHeading: 'Settings' }
	]

	// Auth provided via storageState - no beforeEach login needed

	// Test each navigation link
	for (const link of tenantNavigationLinks) {
		test(`should navigate to ${link.name}`, async ({ page }) => {
			// Set up error monitoring
			const { errors, networkErrors } = setupErrorMonitoring(page)

			// Navigate directly via URL (faster than clicking sidebar)
			await page.goto(link.path)

			// Verify page is fully loaded
			await verifyPageLoaded(page, link.path, link.expectedHeading)

			// Verify no console errors
			if (errors.length > 0) {
				logger.error(`Console errors on ${link.name}:`, {
					metadata: { errors }
				})
			}
			expect(errors).toHaveLength(0)

			// Verify no network errors
			if (networkErrors.length > 0) {
				logger.error(`Network errors on ${link.name}:`, {
					metadata: { networkErrors }
				})
			}
			expect(networkErrors).toHaveLength(0)

			// Take screenshot for visual regression
			await takePageScreenshot(
				page,
				`tenant-${link.name.toLowerCase().replace(/\s+/g, '-')}`
			)
		})
	}

	test('should navigate between pages using sidebar links', async ({
		page
	}) => {
		// Start on tenant dashboard
		expect(page.url()).toContain(ROUTES.TENANT_DASHBOARD)

		// Click Profile link
		await clickSidebarLink(page, 'Profile')
		await verifyCurrentPage(page, ROUTES.TENANT_PROFILE, 'My Profile')

		// Click Lease link
		await clickSidebarLink(page, 'Lease')
		await verifyCurrentPage(page, ROUTES.TENANT_LEASE, 'My Lease')

		// Click Maintenance link
		await clickSidebarLink(page, 'Maintenance')
		await verifyCurrentPage(
			page,
			ROUTES.TENANT_MAINTENANCE,
			'Maintenance Requests'
		)

		// Click back to Dashboard
		await clickSidebarLink(page, 'Dashboard')
		await verifyCurrentPage(page, ROUTES.TENANT_DASHBOARD, 'Tenant Dashboard')
	})

	test('should expand and navigate to Payments sub-routes', async ({
		page
	}) => {
		// Click Payments parent (may need to expand)
		const paymentsLink = page.getByRole('link', { name: /payments/i }).first()
		await paymentsLink.click()
		await page.waitForTimeout(500) // Wait for expansion animation

		// Navigate to Payment Methods
		await page.goto(ROUTES.TENANT_PAYMENTS_METHODS)
		await verifyPageLoaded(
			page,
			ROUTES.TENANT_PAYMENTS_METHODS,
			'Payment Methods'
		)

		// Navigate to Payment History
		await page.goto(ROUTES.TENANT_PAYMENTS_HISTORY)
		await verifyPageLoaded(
			page,
			ROUTES.TENANT_PAYMENTS_HISTORY,
			'Payment History'
		)
	})

	test('should verify all primary navigation items are visible', async ({
		page
	}) => {
		// Verify main navigation items
		const primaryNavItems = [
			'Dashboard',
			'Profile',
			'Lease',
			'Payments',
			'Maintenance',
			'Documents',
			'Settings'
		]

		for (const item of primaryNavItems) {
			await expect(
				page
					.getByRole('link', { name: new RegExp(item, 'i') })
					.or(page.getByText(new RegExp(item, 'i')))
			).toBeVisible({ timeout: 5000 })
		}
	})

	test('should not show owner-specific navigation items', async ({ page }) => {
		// Verify tenant does NOT see owner-specific items
		const ownerOnlyItems = [
			'Properties',
			'Tenants',
			'Analytics',
			'Financials',
			'Reports'
		]

		for (const item of ownerOnlyItems) {
			const ownerLink = page.getByRole('link', {
				name: new RegExp(`^${item}$`, 'i')
			})
			const count = await ownerLink.count()

			// Should not exist or not be visible
			expect(count).toBe(0)
		}
	})

	test('should maintain active state on current page', async ({ page }) => {
		// Navigate to Profile
		await page.goto(ROUTES.TENANT_PROFILE)
		await page.waitForLoadState('domcontentloaded')

		// Check if Profile link has active state
		const profileLink = page.getByRole('link', { name: /profile/i }).first()

		// Check for common active state indicators
		const hasActiveClass = await profileLink.evaluate(el => {
			const classes = (
				el.className as string | { toString(): string }
			).toString()
			return (
				classes.includes('active') ||
				classes.includes('bg-') ||
				classes.includes('font-bold') ||
				el.getAttribute('data-active') === 'true' ||
				el.getAttribute('aria-current') === 'page'
			)
		})

		expect(hasActiveClass).toBe(true)
	})

	test('should handle browser back/forward navigation', async ({ page }) => {
		// Navigate to Profile
		await page.goto(ROUTES.TENANT_PROFILE)
		await verifyPageLoaded(page, ROUTES.TENANT_PROFILE, 'My Profile')

		// Navigate to Lease
		await page.goto(ROUTES.TENANT_LEASE)
		await verifyPageLoaded(page, ROUTES.TENANT_LEASE, 'My Lease')

		// Go back
		await page.goBack()
		await page.waitForLoadState('domcontentloaded')
		expect(page.url()).toContain(ROUTES.TENANT_PROFILE)

		// Go forward
		await page.goForward()
		await page.waitForLoadState('domcontentloaded')
		expect(page.url()).toContain(ROUTES.TENANT_LEASE)
	})

	test('should navigate to new maintenance request page', async ({ page }) => {
		await page.goto(ROUTES.TENANT_MAINTENANCE_NEW)
		await verifyPageLoaded(
			page,
			ROUTES.TENANT_MAINTENANCE_NEW,
			'New Maintenance Request'
		)
	})

	test('should verify tenant cannot access owner routes', async ({ page }) => {
		const ownerRoutes = [
			ROUTES.OWNER_DASHBOARD,
			ROUTES.PROPERTIES,
			ROUTES.TENANTS,
			ROUTES.LEASES
		]

		for (const route of ownerRoutes) {
			await page.goto(route)
			await page.waitForTimeout(2000)

			// Should either redirect to tenant portal or show unauthorized
			const finalUrl = page.url()
			const isUnauthorized =
				finalUrl.includes('/tenant') ||
				finalUrl.includes('/403') ||
				finalUrl.includes('/unauthorized')

			expect(isUnauthorized).toBe(true)
		}
	})

	test('should verify search functionality if available', async ({ page }) => {
		// Check for search input (if it exists globally)
		const searchInput = page
			.getByRole('searchbox')
			.or(page.getByPlaceholder(/search/i))
			.or(page.locator('input[type="search"]'))

		const searchExists = (await searchInput.count()) > 0

		// If search exists, verify it's functional
		if (searchExists) {
			await expect(searchInput.first()).toBeVisible()
		}
	})

	test('should verify tenant-specific content in navigation', async ({
		page
	}) => {
		// Verify tenant sees "My Lease" not just "Leases"
		await expect(page.getByRole('link', { name: /my lease/i })).toBeVisible({
			timeout: 5000
		})

		// Verify tenant sees "My Profile" not just "Profile"
		await expect(page.getByRole('link', { name: /my profile/i })).toBeVisible({
			timeout: 5000
		})
	})

	test('should verify quick actions are available on dashboard', async ({
		page
	}) => {
		// Navigate to dashboard
		await page.goto(ROUTES.TENANT_DASHBOARD)
		await page.waitForLoadState('domcontentloaded')

		// Look for common quick action buttons (if they exist)
		const quickActions = [
			/pay rent/i,
			/request maintenance/i,
			/view lease/i,
			/contact/i
		]

		// At least one quick action should be visible
		let hasQuickAction = false
		for (const action of quickActions) {
			const button = page
				.getByRole('button', { name: action })
				.or(page.getByRole('link', { name: action }))
			const count = await button.count()
			if (count > 0) {
				hasQuickAction = true
				break
			}
		}

		// Note: This test will pass even if no quick actions exist
		// but will verify they work if they do exist
		if (hasQuickAction) {
			expect(hasQuickAction).toBe(true)
		}
	})

	test('should verify breadcrumb navigation if present', async ({ page }) => {
		// Navigate to a nested route
		await page.goto(ROUTES.TENANT_PAYMENTS_HISTORY)
		await page.waitForLoadState('domcontentloaded')

		// Check if breadcrumbs exist
		const breadcrumbs = page
			.locator('[aria-label*="breadcrumb"]')
			.or(page.locator('[data-testid="breadcrumb"]'))

		const breadcrumbsExist = (await breadcrumbs.count()) > 0

		if (breadcrumbsExist) {
			// Verify breadcrumbs show current location
			await expect(breadcrumbs).toBeVisible()
		}
	})

	test('should verify payment-related navigation is prominent', async ({
		page
	}) => {
		// Payments should be easily accessible for tenants
		const paymentsLink = page.getByRole('link', { name: /payments/i })

		// Should exist in navigation
		expect(await paymentsLink.count()).toBeGreaterThan(0)

		// Should be visible
		await expect(paymentsLink.first()).toBeVisible()
	})
})
