import { Page, expect, BrowserContext, Locator } from '@playwright/test'
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
  return await uploadFileWithProgress(page, inputSelector, fileName)
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
export async function mockApiResponse(page: Page, endpoint: string, response: Record<string, string | number | boolean | null>) {
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

/**
 * Enhanced Performance Monitoring
 */
export async function measurePageLoad(page: Page, url: string) {
  const startTime = Date.now()
  
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  
  const loadTime = Date.now() - startTime
  const performanceMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
    }
  })
  
  console.log(`📊 Page Load Metrics for ${url}:`)
  console.log(`  Total Load Time: ${loadTime}ms`)
  console.log(`  DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`)
  console.log(`  First Paint: ${performanceMetrics.firstPaint}ms`)
  console.log(`  First Contentful Paint: ${performanceMetrics.firstContentfulPaint}ms`)
  
  // Assert performance thresholds
  expect(loadTime).toBeLessThan(5000) // Page load should be under 5 seconds
  expect(performanceMetrics.firstContentfulPaint).toBeLessThan(3000) // FCP should be under 3 seconds
  
  return { loadTime, ...performanceMetrics }
}

/**
 * Accessibility Testing Helper
 */
export async function checkAccessibility(page: Page, context?: string) {
  // Inject axe-core for accessibility testing
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })
  
  const accessibilityResults = await page.evaluate(() => {
    return new Promise((resolve) => {
      // @ts-ignore
      axe.run((err, results) => {
        if (err) throw err
        resolve(results)
      })
    })
  })
  
  const violations = (accessibilityResults as any).violations
  
  if (violations.length > 0) {
    console.log(`♿ Accessibility violations found ${context ? `in ${context}` : ''}:`)
    violations.forEach((violation: any) => {
      console.log(`  - ${violation.description} (${violation.impact})`)
      console.log(`    Affected elements: ${violation.nodes.length}`)
    })
  }
  
  // Assert no critical accessibility violations
  const criticalViolations = violations.filter((v: any) => v.impact === 'critical')
  expect(criticalViolations).toHaveLength(0)
  
  return accessibilityResults
}

/**
 * Network Request Monitoring
 */
export async function monitorNetworkRequests(page: Page, pattern?: string) {
  const requests: any[] = []
  const responses: any[] = []
  
  page.on('request', request => {
    if (!pattern || request.url().includes(pattern)) {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      })
    }
  })
  
  page.on('response', response => {
    if (!pattern || response.url().includes(pattern)) {
      responses.push({
        url: response.url(),
        status: response.status(),
        timestamp: Date.now()
      })
    }
  })
  
  return { requests, responses }
}

/**
 * Database State Verification
 */
export async function verifyDatabaseState(page: Page, entity: string, expectedCount: number) {
  // This would typically make an API call to verify database state
  const response = await page.request.get(`/api/test/verify/${entity}`)
  const data = await response.json()
  
  expect(data.count).toBe(expectedCount)
  return data
}

/**
 * Advanced Form Filling with Validation
 */
export async function fillFormWithValidation(page: Page, formData: Record<string, string>, validateEach = true) {
  for (const [fieldName, value] of Object.entries(formData)) {
    const field = page.locator(`[data-testid="${fieldName}"]`)
    
    // Check if field exists
    await expect(field).toBeVisible()
    
    // Fill field
    await field.fill(value)
    
    if (validateEach) {
      // Trigger validation by blurring field
      await field.blur()
      
      // Wait a moment for validation to complete
      await page.waitForTimeout(100)
      
      // Check for validation errors
      const errorField = page.locator(`[data-testid="${fieldName}-error"]`)
      if (await errorField.isVisible()) {
        const errorText = await errorField.textContent()
        console.warn(`⚠️ Validation error for ${fieldName}: ${errorText}`)
      }
    }
  }
}

/**
 * Enhanced File Upload with Progress Monitoring
 */
export async function uploadFileWithProgress(page: Page, inputSelector: string, fileName: string, fileSize = 1024) {
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.click(inputSelector)
  const fileChooser = await fileChooserPromise
  
  // Create a realistic test file
  const buffer = Buffer.alloc(fileSize, 'test file content')
  await fileChooser.setFiles([{
    name: fileName,
    mimeType: getMimeType(fileName),
    buffer
  }])
  
  // Monitor upload progress if progress indicator exists
  const progressBar = page.locator('[data-testid="upload-progress"]')
  if (await progressBar.isVisible()) {
    await expect(progressBar).toBeVisible()
    
    // Wait for upload to complete
    await expect(progressBar).not.toBeVisible({ timeout: 30000 })
  }
  
  return { fileName, fileSize }
}

function getMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return mimeTypes[extension || ''] || 'application/octet-stream'
}

/**
 * Wait for Multiple Conditions
 */
export async function waitForMultipleConditions(page: Page, conditions: (() => Promise<boolean>)[], timeout = 10000) {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    const results = await Promise.all(conditions.map(condition => 
      condition().catch(() => false)
    ))
    
    if (results.every(result => result)) {
      return true
    }
    
    await page.waitForTimeout(100)
  }
  
  throw new Error('Timeout waiting for multiple conditions')
}

/**
 * Drag and Drop Helper
 */
export async function dragAndDrop(page: Page, sourceSelector: string, targetSelector: string) {
  const source = page.locator(sourceSelector)
  const target = page.locator(targetSelector)
  
  await source.dragTo(target)
  
  // Wait for any animations or updates
  await page.waitForTimeout(500)
}

/**
 * Enhanced Toast Waiting with Multiple Messages
 */
export async function waitForToastSequence(page: Page, messages: string[]) {
  for (const message of messages) {
    await waitForToast(page, message)
  }
}

/**
 * Table Data Verification
 */
export async function verifyTableData(page: Page, tableSelector: string, expectedData: any[][]) {
  const table = page.locator(tableSelector)
  await expect(table).toBeVisible()
  
  const rows = table.locator('tbody tr')
  await expect(rows).toHaveCount(expectedData.length)
  
  for (let i = 0; i < expectedData.length; i++) {
    const row = rows.nth(i)
    const cells = row.locator('td')
    
    for (let j = 0; j < expectedData[i].length; j++) {
      await expect(cells.nth(j)).toContainText(expectedData[i][j])
    }
  }
}

/**
 * Keyboard Navigation Testing
 */
export async function testKeyboardNavigation(page: Page, startSelector: string, expectedSelectors: string[]) {
  await page.locator(startSelector).focus()
  
  for (const selector of expectedSelectors) {
    await page.keyboard.press('Tab')
    await expect(page.locator(selector)).toBeFocused()
  }
}

/**
 * Visual Regression Helper
 */
export async function compareScreenshot(page: Page, name: string, options?: { threshold?: number, clip?: any }) {
  await page.waitForLoadState('networkidle')
  
  // Remove dynamic content like timestamps
  await page.addStyleTag({
    content: `
      [data-testid*="timestamp"],
      [data-testid*="time"],
      .timestamp,
      .time {
        visibility: hidden !important;
      }
    `
  })
  
  await expect(page).toHaveScreenshot(`${name}.png`, {
    threshold: options?.threshold || 0.2,
    clip: options?.clip
  })
}

/**
 * API Response Validation
 */
export async function validateApiResponse(page: Page, endpoint: string, expectedSchema: any) {
  const responsePromise = page.waitForResponse(response => 
    response.url().includes(endpoint) && response.status() === 200
  )
  
  const response = await responsePromise
  const data = await response.json()
  
  // Basic schema validation (would use a proper schema validator in real implementation)
  for (const [key, expectedType] of Object.entries(expectedSchema)) {
    expect(typeof data[key]).toBe(expectedType)
  }
  
  return data
}

/**
 * Batch Operations Helper
 */
export async function performBatchOperations(page: Page, operations: (() => Promise<void>)[]) {
  const results = []
  
  for (const operation of operations) {
    try {
      await operation()
      results.push({ success: true })
    } catch (error) {
      results.push({ success: false, error: error.message })
    }
  }
  
  return results
}

/**
 * Enhanced Error Boundary Testing
 */
export async function triggerErrorBoundary(page: Page, errorType = 'generic') {
  // Inject error to trigger error boundary
  await page.evaluate((type) => {
    if (type === 'network') {
      // Simulate network error
      window.fetch = () => Promise.reject(new Error('Network error'))
    } else {
      // Trigger generic React error
      throw new Error('Test error boundary')
    }
  }, errorType)
  
  // Verify error boundary is displayed
  await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible()
}

/**
 * Memory Usage Monitoring
 */
export async function monitorMemoryUsage(page: Page) {
  const memoryUsage = await page.evaluate(() => {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      }
    }
    return null
  })
  
  if (memoryUsage) {
    console.log(`🧠 Memory Usage:`)
    console.log(`  Used: ${(memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  Total: ${(memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  Limit: ${(memoryUsage.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`)
  }
  
  return memoryUsage
}

/**
 * Cookie and Session Management
 */
export async function setCookies(page: Page, cookies: Array<{name: string, value: string, domain?: string}>) {
  for (const cookie of cookies) {
    await page.context().addCookies([{
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain || 'localhost',
      path: '/'
    }])
  }
}

export async function getCookies(page: Page, names?: string[]) {
  const allCookies = await page.context().cookies()
  
  if (names) {
    return allCookies.filter(cookie => names.includes(cookie.name))
  }
  
  return allCookies
}

/**
 * Local Storage Management
 */
export async function setLocalStorage(page: Page, items: Record<string, string>) {
  await page.evaluate((items) => {
    for (const [key, value] of Object.entries(items)) {
      localStorage.setItem(key, value)
    }
  }, items)
}

export async function getLocalStorage(page: Page, keys?: string[]) {
  return await page.evaluate((keys) => {
    const result: Record<string, string | null> = {}
    
    if (keys) {
      for (const key of keys) {
        result[key] = localStorage.getItem(key)
      }
    } else {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          result[key] = localStorage.getItem(key)
        }
      }
    }
    
    return result
  }, keys)
}

/**
 * Console Log Monitoring
 */
export async function monitorConsoleErrors(page: Page) {
  const errors: string[] = []
  const warnings: string[] = []
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    } else if (msg.type() === 'warning') {
      warnings.push(msg.text())
    }
  })
  
  return { errors, warnings }
}