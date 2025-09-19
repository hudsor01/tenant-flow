import { test, expect, Page } from '@playwright/test'

// Helper to capture console messages
async function captureConsoleLogs(page: Page): Promise<string[]> {
  const logs: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logs.push(`ERROR: ${msg.text()}`)
    } else if (msg.type() === 'warning') {
      logs.push(`WARN: ${msg.text()}`)
    }
  })
  return logs
}

// Helper to login
async function login(page: Page) {
  await page.goto('/signin')
  await page.fill('input[type="email"]', process.env.TEST_EMAIL || 'test@example.com')
  await page.fill('input[type="password"]', process.env.TEST_PASSWORD || 'testpassword')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard/**', { timeout: 10000 })
}

test.describe('Dashboard Views - Screenshot & Console Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1920, height: 1080 })
  })

  test('Dashboard Overview', async ({ page }) => {
    const logs = await captureConsoleLogs(page)
    
    await login(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Wait for data to load
    await page.waitForSelector('text=Total Properties', { timeout: 10000 })
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/dashboard-overview.png',
      fullPage: true 
    })
    
    // Check for console errors
    expect(logs.filter(l => l.startsWith('ERROR'))).toHaveLength(0)
    
    // Verify key elements exist
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    await expect(page.locator('text=Total Properties')).toBeVisible()
    await expect(page.locator('text=Active Tenants')).toBeVisible()
    await expect(page.locator('text=Monthly Revenue')).toBeVisible()
    await expect(page.locator('text=Occupancy Rate')).toBeVisible()
  })

  test('Properties Page', async ({ page }) => {
    const logs = await captureConsoleLogs(page)
    
    await login(page)
    await page.goto('/dashboard/properties')
    await page.waitForLoadState('networkidle')
    
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 })
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/properties-page.png',
      fullPage: true 
    })
    
    // Check for console errors
    expect(logs.filter(l => l.startsWith('ERROR'))).toHaveLength(0)
    
    // Verify elements
    await expect(page.locator('h1:has-text("Properties")')).toBeVisible()
    await expect(page.locator('button:has-text("Add Property")')).toBeVisible()
    await expect(page.locator('button:has-text("Export")')).toBeVisible()
  })

  test('Tenants Page', async ({ page }) => {
    const logs = await captureConsoleLogs(page)
    
    await login(page)
    await page.goto('/dashboard/tenants')
    await page.waitForLoadState('networkidle')
    
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 })
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/tenants-page.png',
      fullPage: true 
    })
    
    // Check for console errors
    expect(logs.filter(l => l.startsWith('ERROR'))).toHaveLength(0)
    
    // Verify elements
    await expect(page.locator('h1:has-text("Tenants")')).toBeVisible()
    await expect(page.locator('button:has-text("Add Tenant")')).toBeVisible()
    await expect(page.locator('button:has-text("Export")')).toBeVisible()
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
  })

  test('Leases Page', async ({ page }) => {
    const logs = await captureConsoleLogs(page)
    
    await login(page)
    await page.goto('/dashboard/leases')
    await page.waitForLoadState('networkidle')
    
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 })
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/leases-page.png',
      fullPage: true 
    })
    
    // Check for console errors
    expect(logs.filter(l => l.startsWith('ERROR'))).toHaveLength(0)
    
    // Verify elements
    await expect(page.locator('h1:has-text("Leases")')).toBeVisible()
    await expect(page.locator('button:has-text("New Lease")')).toBeVisible()
    await expect(page.locator('text=Active Leases')).toBeVisible()
  })

  test('Payments Page', async ({ page }) => {
    const logs = await captureConsoleLogs(page)
    
    await login(page)
    await page.goto('/dashboard/payments')
    await page.waitForLoadState('networkidle')
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/payments-page.png',
      fullPage: true 
    })
    
    // Check for console errors
    expect(logs.filter(l => l.startsWith('ERROR'))).toHaveLength(0)
    
    // Verify elements
    await expect(page.locator('h1:has-text("Payments")')).toBeVisible()
    await expect(page.locator('text=Total Collected')).toBeVisible()
  })

  test('New Tenant Form', async ({ page }) => {
    const logs = await captureConsoleLogs(page)
    
    await login(page)
    await page.goto('/dashboard/tenants/new')
    await page.waitForLoadState('networkidle')
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/new-tenant-form.png',
      fullPage: true 
    })
    
    // Check for console errors
    expect(logs.filter(l => l.startsWith('ERROR'))).toHaveLength(0)
    
    // Verify form fields
    await expect(page.locator('h1:has-text("Add New Tenant")')).toBeVisible()
    await expect(page.locator('input[id="full_name"]')).toBeVisible()
    await expect(page.locator('input[id="email"]')).toBeVisible()
    await expect(page.locator('input[id="phone"]')).toBeVisible()
    await expect(page.locator('button:has-text("Create Tenant")')).toBeVisible()
  })

  test('New Property Form', async ({ page }) => {
    const logs = await captureConsoleLogs(page)
    
    await login(page)
    await page.goto('/dashboard/properties/new')
    await page.waitForLoadState('networkidle')
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/new-property-form.png',
      fullPage: true 
    })
    
    // Check for console errors
    expect(logs.filter(l => l.startsWith('ERROR'))).toHaveLength(0)
    
    // Verify form fields
    await expect(page.locator('h1:has-text("Add New Property")')).toBeVisible()
    await expect(page.locator('input[id="name"]')).toBeVisible()
    await expect(page.locator('input[id="address"]')).toBeVisible()
    await expect(page.locator('button:has-text("Create Property")')).toBeVisible()
  })

  test('Mobile Responsiveness - Dashboard', async ({ page }) => {
    const logs = await captureConsoleLogs(page)
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    
    await login(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/mobile-dashboard.png',
      fullPage: true 
    })
    
    // Check for console errors
    expect(logs.filter(l => l.startsWith('ERROR'))).toHaveLength(0)
    
    // Verify mobile menu button is visible
    await expect(page.locator('button[aria-label="Toggle Sidebar"]')).toBeVisible()
  })

  test('Mobile Responsiveness - Tenants', async ({ page }) => {
    const logs = await captureConsoleLogs(page)
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    
    await login(page)
    await page.goto('/dashboard/tenants')
    await page.waitForLoadState('networkidle')
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: 'test-results/screenshots/mobile-tenants.png',
      fullPage: true 
    })
    
    // Check for console errors
    expect(logs.filter(l => l.startsWith('ERROR'))).toHaveLength(0)
    
    // Table should be responsive
    await expect(page.locator('table')).toBeVisible()
  })

  test('Form Validation - Tenant Form', async ({ page }) => {
    const logs = await captureConsoleLogs(page)
    
    await login(page)
    await page.goto('/dashboard/tenants/new')
    
    // Try to submit empty form
    await page.click('button:has-text("Create Tenant")')
    
    // Take screenshot of validation errors
    await page.screenshot({ 
      path: 'test-results/screenshots/tenant-form-validation.png',
      fullPage: true 
    })
    
    // Check for validation messages
    await expect(page.locator('text=Name must be at least 2 characters')).toBeVisible()
    await expect(page.locator('text=Invalid email address')).toBeVisible()
    
    // No console errors from validation
    expect(logs.filter(l => l.startsWith('ERROR'))).toHaveLength(0)
  })

  test('Export Functionality', async ({ page }) => {
    const logs = await captureConsoleLogs(page)
    
    await login(page)
    await page.goto('/dashboard/tenants')
    await page.waitForLoadState('networkidle')
    
    // Setup download promise before clicking
    const downloadPromise = page.waitForEvent('download')
    
    // Click export button
    await page.click('button:has-text("Export")')
    
    // Wait for download
    const download = await downloadPromise
    
    // Verify download
    expect(download.suggestedFilename()).toContain('tenants')
    expect(download.suggestedFilename()).toContain('.csv')
    
    // No console errors
    expect(logs.filter(l => l.startsWith('ERROR'))).toHaveLength(0)
  })
})
