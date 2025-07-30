import { test, expect } from '@playwright/test'
import { VisualTestHelpers } from '../../helpers/visual-helpers'

test.describe('Authentication Visual Regression', () => {
  let visualHelpers: VisualTestHelpers

  test.beforeEach(async ({ page }) => {
    visualHelpers = new VisualTestHelpers(page)
    await visualHelpers.setupVisualEnvironment()
  })

  test.describe('Login Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Mock login page content
      await page.route('**/*', async (route) => {
        const url = route.request().url()
        if (url.includes('/login') || url.endsWith('/')) {
          await route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Login - TenantFlow</title>
                  <style>
                    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                    .login-container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .form-group { margin-bottom: 20px; }
                    label { display: block; margin-bottom: 5px; font-weight: bold; }
                    input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
                    input:focus { outline: none; border-color: #007bff; }
                    .btn { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
                    .btn:hover { background: #0056b3; }
                    .error { color: red; font-size: 14px; margin-top: 5px; }
                    .forgot-password { text-align: center; margin-top: 20px; }
                    .forgot-password a { color: #007bff; text-decoration: none; }
                  </style>
                </head>
                <body data-theme="light">
                  <div class="login-container">
                    <h1>Sign In</h1>
                    <form>
                      <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" data-testid="email-input" />
                        <div class="error" id="email-error" style="display: none;">Please enter a valid email</div>
                      </div>
                      <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" data-testid="password-input" />
                        <div class="error" id="password-error" style="display: none;">Password is required</div>
                      </div>
                      <button type="submit" class="btn" data-testid="login-submit-button">Sign In</button>
                    </form>
                    <div class="forgot-password">
                      <a href="/reset-password" data-testid="forgot-password-link">Forgot Password?</a>
                    </div>
                  </div>
                </body>
              </html>
            `
          })
        } else {
          await route.continue()
        }
      })
      
      await page.goto('/login')
      await page.waitForLoadState('networkidle')
    })

    test('login page initial state', async ({ page }) => {
      await expect(page).toHaveScreenshot('login-page-initial.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('login form field states', async ({ page }) => {
      const emailField = page.locator('[name="email"]')
      const passwordField = page.locator('[name="password"]')

      // Empty state
      await expect(emailField).toHaveScreenshot('login-email-empty.png')
      await expect(passwordField).toHaveScreenshot('login-password-empty.png')

      // Focus states
      await emailField.focus()
      await expect(emailField).toHaveScreenshot('login-email-focus.png')

      await passwordField.focus()
      await expect(passwordField).toHaveScreenshot('login-password-focus.png')

      // Filled states
      await emailField.fill('user@example.com')
      await passwordField.fill('password123')
      await expect(emailField).toHaveScreenshot('login-email-filled.png')
      await expect(passwordField).toHaveScreenshot('login-password-filled.png')
    })

    test('login validation errors', async ({ page }) => {
      // Submit empty form
      await page.click('[data-testid="login-submit-button"]')
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('login-validation-errors.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('login invalid credentials error', async ({ page }) => {
      // Mock invalid credentials response
      await page.route('/auth/v1/token*', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Invalid login credentials',
          }),
        })
      })

      await page.fill('[name="email"]', 'invalid@example.com')
      await page.fill('[name="password"]', 'wrongpassword')
      await page.click('[data-testid="login-submit-button"]')
      await page.waitForTimeout(500)

      await expect(page).toHaveScreenshot('login-invalid-credentials.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('login loading state', async ({ page }) => {
      // Mock slow authentication
      await page.route('/auth/v1/token*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await route.continue()
      })

      await page.fill('[name="email"]', 'user@example.com')
      await page.fill('[name="password"]', 'password123')
      await page.click('[data-testid="login-submit-button"]')
      await page.waitForTimeout(200)

      await expect(page).toHaveScreenshot('login-loading-state.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('forgot password link', async ({ page }) => {
      const forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]')
      
      // Normal state
      await expect(forgotPasswordLink).toHaveScreenshot('forgot-password-link-normal.png')
      
      // Hover state
      await forgotPasswordLink.hover()
      await page.waitForTimeout(200)
      await expect(forgotPasswordLink).toHaveScreenshot('forgot-password-link-hover.png')
    })
  })

  test.describe('Signup Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/signup')
      await page.waitForLoadState('networkidle')
    })

    test('signup page initial state', async ({ page }) => {
      await expect(page).toHaveScreenshot('signup-page-initial.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('signup form field validation', async ({ page }) => {
      // Fill partial form to trigger different validation states
      await page.fill('[name="email"]', 'invalid-email')
      await page.fill('[name="password"]', '123') // Too short
      await page.fill('[name="confirmPassword"]', '456') // Mismatch
      await page.blur('[name="confirmPassword"]')
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('signup-field-validation.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('signup password strength indicator', async ({ page }) => {
      const passwordField = page.locator('[name="password"]')
      
      // Weak password
      await passwordField.fill('123')
      await page.waitForTimeout(200)
      await expect(page.locator('[data-testid="password-strength"]')).toHaveScreenshot('password-strength-weak.png')

      // Medium password
      await passwordField.fill('password123')
      await page.waitForTimeout(200)
      await expect(page.locator('[data-testid="password-strength"]')).toHaveScreenshot('password-strength-medium.png')

      // Strong password
      await passwordField.fill('Password123!@#')
      await page.waitForTimeout(200)
      await expect(page.locator('[data-testid="password-strength"]')).toHaveScreenshot('password-strength-strong.png')
    })

    test('signup terms and conditions', async ({ page }) => {
      const termsCheckbox = page.locator('[name="acceptTerms"]')
      
      // Unchecked state
      await expect(termsCheckbox).toHaveScreenshot('terms-checkbox-unchecked.png')
      
      // Checked state
      await termsCheckbox.check()
      await expect(termsCheckbox).toHaveScreenshot('terms-checkbox-checked.png')
    })

    test('signup organization selection', async ({ page }) => {
      const orgTypeSelect = page.locator('[name="organizationType"]')
      
      // Initial state
      await expect(orgTypeSelect).toHaveScreenshot('org-type-select-initial.png')
      
      // Open dropdown
      await orgTypeSelect.click()
      await page.waitForTimeout(200)
      await expect(page.locator('[data-testid="org-type-dropdown"]')).toHaveScreenshot('org-type-dropdown-open.png')
      
      // Selected state
      await page.selectOption('[name="organizationType"]', 'PROPERTY_MANAGEMENT')
      await expect(orgTypeSelect).toHaveScreenshot('org-type-select-selected.png')
    })
  })

  test.describe('Password Reset Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/reset-password')
      await page.waitForLoadState('networkidle')
    })

    test('password reset page initial state', async ({ page }) => {
      await expect(page).toHaveScreenshot('password-reset-initial.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('password reset email sent confirmation', async ({ page }) => {
      await page.fill('[name="email"]', 'user@example.com')
      
      // Mock successful reset request
      await page.route('/auth/v1/recover', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Reset email sent' }),
        })
      })

      await page.click('[data-testid="reset-submit-button"]')
      await page.waitForTimeout(500)

      await expect(page).toHaveScreenshot('password-reset-email-sent.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('password reset token expired', async ({ page }) => {
      // Simulate expired token scenario
      await page.goto('/reset-password?token=expired-token')
      await page.waitForLoadState('networkidle')

      await expect(page).toHaveScreenshot('password-reset-token-expired.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })
  })

  test.describe('Multi-Factor Authentication', () => {
    test.beforeEach(async ({ page }) => {
      // Mock MFA required scenario
      await page.route('/auth/v1/token*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: null,
            mfa_required: true,
            challenge_id: 'test-challenge-id',
          }),
        })
      })

      await page.goto('/login')
      await page.fill('[name="email"]', 'user@example.com')
      await page.fill('[name="password"]', 'password123')
      await page.click('[data-testid="login-submit-button"]')
      await page.waitForSelector('[data-testid="mfa-challenge"]')
    })

    test('mfa challenge screen', async ({ page }) => {
      await expect(page).toHaveScreenshot('mfa-challenge-screen.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('mfa code input states', async ({ page }) => {
      const codeInputs = page.locator('[data-testid="mfa-code-input"]')
      
      // Empty state
      await expect(codeInputs.first()).toHaveScreenshot('mfa-code-input-empty.png')
      
      // Partially filled
      await codeInputs.nth(0).fill('1')
      await codeInputs.nth(1).fill('2')
      await codeInputs.nth(2).fill('3')
      await expect(page.locator('[data-testid="mfa-code-container"]')).toHaveScreenshot('mfa-code-partial.png')
      
      // Fully filled
      await codeInputs.nth(3).fill('4')
      await codeInputs.nth(4).fill('5')
      await codeInputs.nth(5).fill('6')
      await expect(page.locator('[data-testid="mfa-code-container"]')).toHaveScreenshot('mfa-code-complete.png')
    })

    test('mfa invalid code error', async ({ page }) => {
      // Mock invalid MFA code
      await page.route('/auth/v1/verify', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid_code',
            error_description: 'Invalid verification code',
          }),
        })
      })

      // Fill invalid code
      const codeInputs = page.locator('[data-testid="mfa-code-input"]')
      for (let i = 0; i < 6; i++) {
        await codeInputs.nth(i).fill('1')
      }
      
      await page.click('[data-testid="verify-mfa-button"]')
      await page.waitForTimeout(500)

      await expect(page).toHaveScreenshot('mfa-invalid-code-error.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('mfa backup codes option', async ({ page }) => {
      await page.click('[data-testid="use-backup-codes-link"]')
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('mfa-backup-codes-screen.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })
  })

  test.describe('Authentication Responsive Design', () => {
    const viewports = [
      { width: 1440, height: 900, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 375, height: 667, name: 'mobile' },
      { width: 320, height: 568, name: 'mobile-small' },
    ]

    test('login page responsive layouts', async ({ page }) => {
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(300)

        await expect(page).toHaveScreenshot(`login-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
        })
      }
    })

    test('signup page responsive layouts', async ({ page }) => {
      await page.goto('/signup')
      await page.waitForLoadState('networkidle')

      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(300)

        await expect(page).toHaveScreenshot(`signup-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
        })
      }
    })
  })

  test.describe('Authentication Themes', () => {
    test('login page dark theme', async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
      })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('login-dark-theme.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('signup page high contrast theme', async ({ page }) => {
      await page.goto('/signup')
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-contrast', 'high')
      })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('signup-high-contrast.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('mfa challenge dark theme', async ({ page }) => {
      // Setup MFA scenario
      await page.route('/auth/v1/token*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: null,
            mfa_required: true,
            challenge_id: 'test-challenge-id',
          }),
        })
      })

      await page.goto('/login')
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
      })
      
      await page.fill('[name="email"]', 'user@example.com')
      await page.fill('[name="password"]', 'password123')
      await page.click('[data-testid="login-submit-button"]')
      await page.waitForSelector('[data-testid="mfa-challenge"]')

      await expect(page).toHaveScreenshot('mfa-challenge-dark-theme.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })
  })

  test.describe('Social Authentication', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
      await page.waitForLoadState('networkidle')
    })

    test('social login buttons', async ({ page }) => {
      const socialButtons = page.locator('[data-testid="social-login-buttons"]')
      await expect(socialButtons).toHaveScreenshot('social-login-buttons.png')
    })

    test('social login button hover states', async ({ page }) => {
      const googleButton = page.locator('[data-testid="google-login-button"]')
      const githubButton = page.locator('[data-testid="github-login-button"]')
      
      // Normal states
      await expect(googleButton).toHaveScreenshot('google-login-normal.png')
      await expect(githubButton).toHaveScreenshot('github-login-normal.png')
      
      // Hover states
      await googleButton.hover()
      await page.waitForTimeout(200)
      await expect(googleButton).toHaveScreenshot('google-login-hover.png')
      
      await githubButton.hover()
      await page.waitForTimeout(200)
      await expect(githubButton).toHaveScreenshot('github-login-hover.png')
    })

    test('social login loading states', async ({ page }) => {
      // Mock slow OAuth redirect
      await page.route('/auth/v1/authorize*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await route.continue()
      })

      await page.click('[data-testid="google-login-button"]')
      await page.waitForTimeout(200)

      await expect(page.locator('[data-testid="google-login-button"]')).toHaveScreenshot('google-login-loading.png')
    })
  })
})