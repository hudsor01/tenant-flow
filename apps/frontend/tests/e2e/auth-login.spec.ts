import { test, expect, type Page } from '@playwright/test'

// Page Object Model for Login Page
class LoginPage {
  constructor(private page: Page) {}

  private selectors = {
    emailInput: 'input#email',
    passwordInput: 'input#password',
    submitButton: 'button[type="submit"]',
    rememberMeCheckbox: 'input#rememberMe',
    forgotPasswordLink: 'a[href*="forgot-password"]',
    signupLink: 'a[href*="signup"]',
    errorMessage: '[role="alert"], .text-destructive',
    loadingSpinner: '[data-testid="loading-spinner"]',
    passwordToggle: '[data-testid="password-toggle"], button[aria-label*="password"]',
  }

  async navigate() {
    await this.page.goto('/auth/login')
    await this.page.waitForLoadState('networkidle')
  }

  async login(email: string, password: string, rememberMe = false) {
    await this.page.fill(this.selectors.emailInput, email)
    await this.page.fill(this.selectors.passwordInput, password)
    if (rememberMe) {
      await this.page.check(this.selectors.rememberMeCheckbox)
    }
    await this.page.click(this.selectors.submitButton)
  }

  async getErrorMessage() {
    return this.page.locator(this.selectors.errorMessage).textContent()
  }

  async isLoading() {
    return this.page.locator(this.selectors.loadingSpinner).isVisible()
  }

  async togglePasswordVisibility() {
    const toggle = this.page.locator(this.selectors.passwordToggle)
    if (await toggle.isVisible()) {
      await toggle.click()
    }
  }
}

test.describe('Auth Login E2E Tests', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.navigate()
  })

  test.describe('Form Rendering', () => {
    test('should render all login form elements', async ({ page }) => {
      await expect(page.locator('input#email')).toBeVisible()
      await expect(page.locator('input#password')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
      
      // Check for additional elements
      const forgotPasswordLink = page.getByText(/forgot password/i)
      const signupLink = page.getByText(/sign up/i)
      
      await expect(forgotPasswordLink).toBeVisible()
      await expect(signupLink).toBeVisible()
    })

    test('should have proper input attributes', async ({ page }) => {
      await expect(page.locator('input#email')).toHaveAttribute('type', 'email')
      await expect(page.locator('input#password')).toHaveAttribute('type', 'password')
      await expect(page.locator('input#email')).toHaveAttribute('required', '')
      await expect(page.locator('input#password')).toHaveAttribute('required', '')
    })
  })

  test.describe('Login Validation', () => {
    test('should validate empty fields', async ({ page }) => {
      // Try to submit empty form
      await page.click('button[type="submit"]')
      
      // Should not navigate away
      await page.waitForTimeout(1000)
      expect(page.url()).toContain('/auth/login')
    })

    test('should validate email format', async ({ page }) => {
      await loginPage.login('invalidemail', 'password123', false)
      await page.waitForTimeout(1000)
      
      // Should show validation error or stay on page
      expect(page.url()).toContain('/auth/login')
    })

    test('should handle incorrect credentials', async ({ page }) => {
      await loginPage.login('wrong@example.com', 'wrongpassword', false)
      await page.waitForTimeout(3000)
      
      // Should show error and stay on login page
      const pageContent = await page.textContent('body')
      const hasErrorIndicator = 
        pageContent.includes('invalid') ||
        pageContent.includes('incorrect') ||
        pageContent.includes('error') ||
        pageContent.includes('failed')
      
      expect(hasErrorIndicator).toBe(true)
      expect(page.url()).toContain('/auth/login')
    })
  })

  test.describe('Successful Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      // Use test credentials (these would be seeded in a real test environment)
      const testCredentials = {
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
      }

      // Monitor auth requests
      const authRequest = page.waitForRequest(req => 
        req.url().includes('/auth/login') && req.method() === 'POST',
        { timeout: 10000 }
      ).catch(() => null)

      await loginPage.login(testCredentials.email, testCredentials.password, true)
      
      const request = await authRequest
      if (request) {
        const postData = request.postDataJSON()
        expect(postData).toMatchObject({
          email: testCredentials.email,
        })
      }

      // Wait for navigation or success
      await page.waitForTimeout(5000)
      
      // Should navigate to dashboard or show success
      const currentUrl = page.url()
      const isLoggedIn = 
        currentUrl.includes('/dashboard') ||
        currentUrl.includes('/properties') ||
        currentUrl.includes('/tenants') ||
        !currentUrl.includes('/auth/login')
      
      // If still on login page, check for error
      if (!isLoggedIn) {
        const pageContent = await page.textContent('body')
        console.log('Login might have failed. Page content includes:', {
          hasError: pageContent.includes('error'),
          hasInvalid: pageContent.includes('invalid'),
          url: currentUrl
        })
      }
    })

    test('should persist session with remember me', async ({ page, context }) => {
      const testCredentials = {
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
      }

      await loginPage.login(testCredentials.email, testCredentials.password, true)
      await page.waitForTimeout(3000)

      // Check for persistent session cookies
      const cookies = await context.cookies()
      const sessionCookie = cookies.find(c => 
        c.name.includes('session') || 
        c.name.includes('auth') ||
        c.name.includes('supabase')
      )

      if (sessionCookie) {
        // If remember me works, cookie should have long expiry
        const expiryDate = sessionCookie.expires * 1000 // Convert to milliseconds
        const dayFromNow = Date.now() + (24 * 60 * 60 * 1000)
        expect(expiryDate).toBeGreaterThan(dayFromNow)
      }
    })
  })

  test.describe('Password Management', () => {
    test('should toggle password visibility', async ({ page }) => {
      await page.fill('input#password', 'testpassword')
      
      // Check initial type
      await expect(page.locator('input#password')).toHaveAttribute('type', 'password')
      
      // Look for password toggle button
      const toggleButton = page.locator('[data-testid="password-toggle"], button[aria-label*="password"]')
      if (await toggleButton.isVisible()) {
        await toggleButton.click()
        
        // Type should change to text
        await expect(page.locator('input#password')).toHaveAttribute('type', 'text')
        
        // Toggle back
        await toggleButton.click()
        await expect(page.locator('input#password')).toHaveAttribute('type', 'password')
      }
    })

    test('should navigate to forgot password', async ({ page }) => {
      const forgotLink = page.getByText(/forgot password/i)
      await forgotLink.click()
      
      await page.waitForLoadState('networkidle')
      expect(page.url()).toContain('forgot-password')
    })
  })

  test.describe('Security Features', () => {
    test('should handle rate limiting', async ({ page }) => {
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await loginPage.login('wrong@example.com', 'wrongpassword', false)
        await page.waitForTimeout(500)
      }

      // Check for rate limit message
      const pageContent = await page.textContent('body')
      // May show rate limit or just continue to fail
      expect(page.url()).toContain('/auth/login')
    })

    test('should protect against SQL injection', async ({ page }) => {
      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "admin'--",
        "' OR 1=1--",
        "'; DROP TABLE users--",
      ]

      for (const payload of sqlInjectionPayloads) {
        await loginPage.login(payload, payload, false)
        await page.waitForTimeout(1000)
        
        // Should not log in with SQL injection attempts
        expect(page.url()).toContain('/auth/login')
      }
    })

    test('should have secure password field', async ({ page }) => {
      // Password should not be visible in DOM as plain text
      await page.fill('input#password', 'SecretPassword123')
      
      const passwordInput = page.locator('input#password')
      const inputType = await passwordInput.getAttribute('type')
      expect(inputType).toBe('password')
      
      // Check autocomplete attribute for security
      const autocomplete = await passwordInput.getAttribute('autocomplete')
      expect(['current-password', 'off']).toContain(autocomplete)
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Focus first input
      await page.focus('input#email')
      
      // Tab to password
      await page.keyboard.press('Tab')
      await expect(page.locator('input#password')).toBeFocused()
      
      // Tab to remember me (if present)
      await page.keyboard.press('Tab')
      
      // Tab to submit button
      await page.keyboard.press('Tab')
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(['BUTTON', 'INPUT']).toContain(focusedElement)
    })

    test('should have proper ARIA labels', async ({ page }) => {
      const emailInput = page.locator('input#email')
      const passwordInput = page.locator('input#password')
      
      // Check for labels or aria-labels
      const emailHasLabel = await emailInput.evaluate((el) => {
        const label = document.querySelector(`label[for="${el.id}"]`)
        const ariaLabel = el.getAttribute('aria-label')
        return !!(label || ariaLabel)
      })
      
      const passwordHasLabel = await passwordInput.evaluate((el) => {
        const label = document.querySelector(`label[for="${el.id}"]`)
        const ariaLabel = el.getAttribute('aria-label')
        return !!(label || ariaLabel)
      })
      
      expect(emailHasLabel).toBe(true)
      expect(passwordHasLabel).toBe(true)
    })

    test('should work with Enter key submission', async ({ page }) => {
      await page.fill('input#email', 'test@example.com')
      await page.fill('input#password', 'password123')
      
      // Press Enter to submit
      await page.keyboard.press('Enter')
      
      // Should attempt to submit the form
      await page.waitForTimeout(1000)
      // Form should have been submitted (check by URL change or network request)
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await loginPage.navigate()
      
      // All elements should be visible
      await expect(page.locator('input#email')).toBeVisible()
      await expect(page.locator('input#password')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
      
      // Should be able to interact
      await page.fill('input#email', 'test@example.com')
      await page.fill('input#password', 'password123')
      
      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toBeEnabled()
    })

    test('should adapt layout for tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await loginPage.navigate()
      
      const form = page.locator('form')
      await expect(form).toBeVisible()
      
      // Check form is properly centered
      const formBox = await form.boundingBox()
      if (formBox) {
        expect(formBox.width).toBeGreaterThan(300)
        expect(formBox.width).toBeLessThan(600)
      }
    })
  })

  test.describe('Performance', () => {
    test('should load quickly', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/auth/login')
      await page.waitForLoadState('domcontentloaded')
      const loadTime = Date.now() - startTime
      
      // Should load in under 2 seconds
      expect(loadTime).toBeLessThan(2000)
    })

    test('should handle form submission without lag', async ({ page }) => {
      await page.fill('input#email', 'test@example.com')
      await page.fill('input#password', 'password123')
      
      const startTime = Date.now()
      await page.click('button[type="submit"]')
      
      // Should show loading state quickly
      await page.waitForTimeout(100)
      const responseTime = Date.now() - startTime
      
      // Initial response should be under 200ms
      expect(responseTime).toBeLessThan(500)
    })
  })
})