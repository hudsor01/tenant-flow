import { Page, expect } from '@playwright/test'
import { TestUser } from './test-users'

/**
 * Helper functions for E2E testing
 */

/**
 * Login as a specific test user
 */
export async function loginAs(page: Page, userType: keyof typeof TestUser) {
  const user = TestUser[userType]
  
  await page.goto('/auth/login')
  await page.fill('[data-testid="login-email"]', user.email)
  await page.fill('[data-testid="login-password"]', user.password)
  await page.click('[data-testid="login-submit"]')
  
  // Wait for successful login
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()
}

/**
 * Wait for API request to complete
 */
export async function waitForApiResponse(page: Page, endpoint: string) {
  return page.waitForResponse(response => 
    response.url().includes(endpoint) && response.status() === 200
  )
}

/**
 * Fill out a form with data
 */
export async function fillForm(page: Page, formData: Record<string, string>) {
  for (const [fieldName, value] of Object.entries(formData)) {
    await page.fill(`[data-testid="${fieldName}"]`, value)
  }
}

/**
 * Upload a test file
 */
export async function uploadTestFile(page: Page, inputSelector: string, fileName: string) {
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.click(inputSelector)
  const fileChooser = await fileChooserPromise
  
  // Create a simple test file
  const buffer = Buffer.from('test file content')
  await fileChooser.setFiles([{
    name: fileName,
    mimeType: 'text/plain',
    buffer
  }])
}

/**
 * Wait for a toast notification
 */
export async function waitForToast(page: Page, message?: string) {
  const toast = page.locator('[data-testid="toast"]')
  await expect(toast).toBeVisible()
  
  if (message) {
    await expect(toast).toContainText(message)
  }
  
  return toast
}

/**
 * Navigate to a specific section in the app
 */
export async function navigateToSection(page: Page, section: string) {
  await page.click(`[data-testid="nav-${section}"]`)
  await expect(page).toHaveURL(new RegExp(section))
}

/**
 * Wait for loading state to complete
 */
export async function waitForLoadingComplete(page: Page) {
  // Wait for any loading spinners to disappear
  await expect(page.locator('[data-testid="loading-spinner"]')).toHaveCount(0, { timeout: 10000 })
  
  // Wait for any skeleton loaders to disappear
  await expect(page.locator('[data-testid="skeleton-loader"]')).toHaveCount(0, { timeout: 10000 })
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ 
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true 
  })
}

/**
 * Simulate mobile viewport
 */
export async function setMobileViewport(page: Page) {
  await page.setViewportSize({ width: 375, height: 667 })
}

/**
 * Simulate desktop viewport
 */
export async function setDesktopViewport(page: Page) {
  await page.setViewportSize({ width: 1920, height: 1080 })
}

/**
 * Check if element is visible in viewport
 */
export async function isInViewport(page: Page, selector: string) {
  return await page.evaluate((selector) => {
    const element = document.querySelector(selector)
    if (!element) return false
    
    const rect = element.getBoundingClientRect()
    return rect.top >= 0 && rect.left >= 0 && 
           rect.bottom <= window.innerHeight && 
           rect.right <= window.innerWidth
  }, selector)
}

/**
 * Scroll to element
 */
export async function scrollToElement(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded()
}

/**
 * Mock API response
 */
export async function mockApiResponse(page: Page, endpoint: string, response: any) {
  await page.route(`**/*${endpoint}*`, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    })
  })
}

/**
 * Clear all cookies and local storage
 */
export async function clearSession(page: Page) {
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}