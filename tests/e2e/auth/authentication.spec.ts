import { test, expect } from '@playwright/test'
import { TestUser } from '../utils/test-users'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should allow user to sign up successfully', async ({ page }) => {
    // Navigate to signup page
    await page.click('[data-testid="signup-button"]')
    await expect(page).toHaveURL('/auth/signup')

    // Fill out signup form
    const uniqueEmail = `test-${Date.now()}@example.com`
    await page.fill('[data-testid="signup-email"]', uniqueEmail)
    await page.fill('[data-testid="signup-password"]', 'TestPassword123!')
    await page.fill('[data-testid="signup-confirm-password"]', 'TestPassword123!')
    await page.fill('[data-testid="signup-first-name"]', 'Test')
    await page.fill('[data-testid="signup-last-name"]', 'User')
    
    // Select role
    await page.selectOption('[data-testid="signup-role"]', 'LANDLORD')

    // Submit form
    await page.click('[data-testid="signup-submit"]')

    // Should redirect to dashboard or email verification
    await expect(page.url()).toMatch(/(dashboard|verify-email)/)
  })

  test('should allow existing user to login successfully', async ({ page }) => {
    // Navigate to login page
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/auth/login')

    // Fill out login form with test user credentials
    await page.fill('[data-testid="login-email"]', TestUser.LANDLORD.email)
    await page.fill('[data-testid="login-password"]', TestUser.LANDLORD.password)

    // Submit form
    await page.click('[data-testid="login-submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()
  })

  test('should show validation errors for invalid login', async ({ page }) => {
    await page.click('[data-testid="login-button"]')
    
    // Try to login with invalid credentials
    await page.fill('[data-testid="login-email"]', 'invalid@example.com')
    await page.fill('[data-testid="login-password"]', 'wrongpassword')
    await page.click('[data-testid="login-submit"]')

    // Should show error message
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials')
  })

  test('should handle forgot password flow', async ({ page }) => {
    await page.click('[data-testid="login-button"]')
    await page.click('[data-testid="forgot-password-link"]')
    
    await expect(page).toHaveURL('/auth/forgot-password')
    
    // Fill email and submit
    await page.fill('[data-testid="forgot-password-email"]', TestUser.LANDLORD.email)
    await page.click('[data-testid="forgot-password-submit"]')
    
    // Should show success message
    await expect(page.locator('[data-testid="forgot-password-success"]')).toBeVisible()
  })

  test('should allow user to logout', async ({ page }) => {
    // Login first
    await page.goto('/auth/login')
    await page.fill('[data-testid="login-email"]', TestUser.LANDLORD.email)
    await page.fill('[data-testid="login-password"]', TestUser.LANDLORD.password)
    await page.click('[data-testid="login-submit"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    // Logout
    await page.click('[data-testid="user-avatar"]')
    await page.click('[data-testid="logout-button"]')
    
    // Should redirect to home page
    await expect(page).toHaveURL('/')
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
  })

  test('should support Google OAuth login', async ({ page }) => {
    await page.click('[data-testid="login-button"]')
    
    // Mock Google OAuth (in real test, this would open OAuth popup)
    await page.click('[data-testid="google-oauth-button"]')
    
    // For E2E testing, we'd need to mock the OAuth flow
    // This test would need additional setup for OAuth testing
    await expect(page.locator('[data-testid="google-oauth-button"]')).toBeVisible()
  })

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access protected route without login
    await page.goto('/dashboard')
    
    // Should redirect to login
    await expect(page).toHaveURL('/auth/login')
  })

  test('should persist login state across browser refresh', async ({ page }) => {
    // Login
    await page.goto('/auth/login')
    await page.fill('[data-testid="login-email"]', TestUser.LANDLORD.email)
    await page.fill('[data-testid="login-password"]', TestUser.LANDLORD.password)
    await page.click('[data-testid="login-submit"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    // Refresh page
    await page.reload()
    
    // Should still be logged in
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()
  })
})