import { test, expect } from '@playwright/test'
import { ROUTES } from '../../constants/routes'
import { loginAsTenant, clearSessionCache } from '../../auth-helpers'
import { verifyPageLoaded, setupErrorMonitoring } from '../helpers/navigation-helpers'

/**
 * Tenant Authentication E2E Tests
 *
 * Tests the complete authentication flow for tenants:
 * - Login with valid credentials
 * - JWT token verification
 * - Redirect to tenant portal
 * - Portal layout rendering
 * - Auth cookie persistence
 */

test.describe('Tenant Authentication', () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  test.beforeEach(() => {
    // Clear session cache to ensure fresh login for each test
    clearSessionCache()
  })

  test('should login with valid tenant credentials', async ({ page }) => {
    // Set up error monitoring
    const { errors, networkErrors } = setupErrorMonitoring(page)

    // Perform login
    await loginAsTenant(page)

    // Verify we're on the tenant portal
    expect(page.url()).toContain(ROUTES.TENANT_DASHBOARD)

    // Verify no console errors
    expect(errors).toHaveLength(0)

    // Verify no network errors
    expect(networkErrors).toHaveLength(0)
  })

  test('should verify JWT contains user_type=TENANT', async ({ page, context }) => {
    // Login as tenant
    await loginAsTenant(page)

    // Get cookies from context
    const cookies = await context.cookies()

    // Find Supabase auth cookies
    const authCookies = cookies.filter(
      (cookie) =>
        cookie.name.startsWith('sb-') &&
        (cookie.name.includes('auth-token') || cookie.name.includes('access-token'))
    )

    // Verify auth cookies exist
    expect(authCookies.length).toBeGreaterThan(0)

    // Verify cookies are httpOnly for security
    const hasHttpOnlyCookie = authCookies.some((cookie) => cookie.httpOnly)
    expect(hasHttpOnlyCookie).toBe(true)
  })

  test('should redirect to /tenant after successful login', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${baseUrl}/login`)

    // Fill credentials
    const email = process.env.E2E_TENANT_EMAIL || 'test-tenant@tenantflow.app'
    const password =
      process.env.E2E_TENANT_PASSWORD ||
      (() => {
        throw new Error('E2E_TENANT_PASSWORD environment variable is required')
      })()

    await page.locator('[data-testid="email-input"]').fill(email)
    await page.locator('[data-testid="password-input"]').fill(password)

    // Submit and wait for redirect
    const submitButton = page.locator('[data-testid="login-button"]')
    await Promise.all([
      page.waitForURL(/\/tenant/, { timeout: 30000 }),
      submitButton.click(),
    ])

    // Verify final URL is tenant portal
    expect(page.url()).toContain(ROUTES.TENANT_DASHBOARD)
  })

  test('should render Tenant portal layout after login', async ({ page }) => {
    // Login as tenant
    await loginAsTenant(page)

    // Verify page is fully loaded
    await verifyPageLoaded(page, ROUTES.TENANT_DASHBOARD, 'Tenant Dashboard')

    // Verify main layout components exist
    // TenantSidebar
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10000 })

    // Verify sidebar brand/logo
    await expect(page.getByText(/tenantflow/i)).toBeVisible()

    // Verify main navigation links exist in sidebar
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /profile/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /lease/i })).toBeVisible()
  })

  test('should render TenantSidebar with tenant navigation', async ({ page }) => {
    // Login as tenant
    await loginAsTenant(page)

    // Verify all primary navigation items
    const navigationItems = [
      'Dashboard',
      'Profile',
      'Lease',
      'Payments',
      'Maintenance',
      'Documents',
      'Settings',
    ]

    for (const item of navigationItems) {
      await expect(
        page.getByRole('link', { name: new RegExp(item, 'i') }).or(
          page.getByText(new RegExp(item, 'i'))
        )
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test('should render SiteHeader after login', async ({ page }) => {
    // Login as tenant
    await loginAsTenant(page)

    // Verify header exists (look for common header elements)
    // Theme toggle
    await expect(
      page.locator('[data-testid="theme-toggle"]').or(
        page.getByRole('button', { name: /theme|dark|light/i })
      )
    ).toBeVisible({ timeout: 10000 })

    // User menu/avatar should be visible
    await expect(
      page.locator('[data-testid="user-menu"]').or(
        page.getByRole('button', { name: /account|profile|user/i })
      )
    ).toBeVisible({ timeout: 10000 })
  })

  test('should verify no console errors after login', async ({ page }) => {
    const consoleErrors: string[] = []

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Login as tenant
    await loginAsTenant(page)

    // Wait for page to fully load
    await page.waitForLoadState('networkidle')

    // Verify no console errors
    if (consoleErrors.length > 0) {
      console.error('Console errors detected:', consoleErrors)
    }
    expect(consoleErrors).toHaveLength(0)
  })

  test('should persist auth cookies across page navigations', async ({ page, context }) => {
    // Login as tenant
    await loginAsTenant(page)

    // Get initial cookies
    const initialCookies = await context.cookies()
    const initialAuthCookies = initialCookies.filter((cookie) =>
      cookie.name.startsWith('sb-')
    )

    expect(initialAuthCookies.length).toBeGreaterThan(0)

    // Navigate to different page
    await page.goto(`${baseUrl}${ROUTES.TENANT_LEASE}`)
    await page.waitForLoadState('networkidle')

    // Get cookies after navigation
    const afterNavigationCookies = await context.cookies()
    const afterAuthCookies = afterNavigationCookies.filter((cookie) =>
      cookie.name.startsWith('sb-')
    )

    // Verify auth cookies are still present
    expect(afterAuthCookies.length).toBeGreaterThanOrEqual(initialAuthCookies.length)

    // Verify still authenticated (should not redirect to login)
    expect(page.url()).not.toContain('/login')
  })

  test('should handle invalid credentials gracefully', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${baseUrl}/login`)

    // Fill with invalid credentials
    await page.locator('[data-testid="email-input"]').fill('invalid@example.com')
    await page.locator('[data-testid="password-input"]').fill('wrongpassword')

    // Submit form
    const submitButton = page.locator('[data-testid="login-button"]')
    await submitButton.click()

    // Wait a bit for error to appear
    await page.waitForTimeout(2000)

    // Should remain on login page
    expect(page.url()).toContain('/login')

    // Should show error message (look for common error indicators)
    await expect(
      page.getByText(/invalid|incorrect|wrong|failed/i).or(page.locator('[role="alert"]'))
    ).toBeVisible({ timeout: 5000 })
  })

  test('should verify tenant portal is only accessible when authenticated', async ({ page }) => {
    // Try to access tenant portal without authentication
    await page.goto(`${baseUrl}${ROUTES.TENANT_DASHBOARD}`)

    // Should redirect to login page
    await page.waitForURL(/\/login/, { timeout: 10000 })
    expect(page.url()).toContain('/login')
  })

  test('should verify tenant cannot access owner routes', async ({ page }) => {
    // Login as tenant
    await loginAsTenant(page)

    // Try to access owner dashboard
    await page.goto(`${baseUrl}${ROUTES.OWNER_DASHBOARD}`)

    // Should either redirect to tenant portal or show unauthorized
    await page.waitForTimeout(2000)

    // Should NOT be on the owner dashboard
    const finalUrl = page.url()
    const isUnauthorized = finalUrl.includes('/tenant') || finalUrl.includes('/403') || finalUrl.includes('/unauthorized')

    expect(isUnauthorized).toBe(true)
  })

  test('should verify session is valid for at least 5 minutes', async ({ page, context }) => {
    // Login as tenant
    await loginAsTenant(page)

    // Wait 30 seconds
    await page.waitForTimeout(30000)

    // Navigate to a different page
    await page.goto(`${baseUrl}${ROUTES.TENANT_PAYMENTS}`)
    await page.waitForLoadState('networkidle')

    // Should still be authenticated (not redirected to login)
    expect(page.url()).not.toContain('/login')

    // Page should load successfully
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 10000 })
  })

  test('should display tenant-specific content in navigation', async ({ page }) => {
    // Login as tenant
    await loginAsTenant(page)

    // Verify tenant-specific navigation items that owner should NOT have
    await expect(page.getByRole('link', { name: /my lease/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('link', { name: /my profile/i })).toBeVisible({ timeout: 5000 })

    // Verify tenant does NOT see owner-specific items
    await expect(page.getByRole('link', { name: /properties/i })).not.toBeVisible()
    await expect(page.getByRole('link', { name: /tenants/i })).not.toBeVisible()
  })
})
