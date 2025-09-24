import { test, expect } from './fixtures/page-with-console'
import path from 'path'

const DASHBOARD_ROUTES = [
  { path: '/dashboard', name: 'Dashboard Overview' },
  { path: '/dashboard/properties', name: 'Properties List' },
  { path: '/dashboard/properties/new', name: 'New Property' },
  { path: '/dashboard/tenants', name: 'Tenants List' },
  { path: '/dashboard/leases', name: 'Leases List' },
  { path: '/dashboard/payments', name: 'Payments & Invoices' },
  { path: '/dashboard/maintenance', name: 'Maintenance Requests' },
]

test.describe('Dashboard Complete UI/UX Testing', () => {
  test.beforeEach(async ({ pageWithConsole }) => {
    // Mock authentication if needed
    await pageWithConsole.goto('/')
    
    // Set up any required cookies/storage
    await pageWithConsole.context().addCookies([
      {
        name: 'auth-token',
        value: 'test-token',
        domain: 'localhost',
        path: '/'
      }
    ])
  })
  
  DASHBOARD_ROUTES.forEach(route => {
    test(`${route.name} - Visual & Console Test`, async ({ pageWithConsole }, testInfo) => {
      // Navigate to the route
      await pageWithConsole.goto(route.path)
      
      // Wait for page to be fully loaded
      await pageWithConsole.waitForLoadState('networkidle')
      
      // Take screenshot
      const screenshotPath = path.join(
        testInfo.outputDir, 
        `${route.name.toLowerCase().replace(/\s+/g, '-')}.png`
      )
      await pageWithConsole.screenshot({ 
        path: screenshotPath,
        fullPage: true 
      })
      
      // Attach screenshot to test results
      await testInfo.attach(route.name, {
        path: screenshotPath,
        contentType: 'image/png'
      })
      
      // Check for console errors
      expect(pageWithConsole.errors, `Console errors found on ${route.name}`).toHaveLength(0)
      
      // Visual regression test
      await expect(pageWithConsole).toHaveScreenshot(`${route.name.toLowerCase().replace(/\s+/g, '-')}.png`, {
        fullPage: true,
        animations: 'disabled',
        mask: [
          // Mask dynamic content like dates/times
          pageWithConsole.locator('[data-testid="timestamp"]'),
          pageWithConsole.locator('.date-display')
        ]
      })
      
      // Check page title
      await expect(pageWithConsole).toHaveTitle(/TenantFlow/)
      
      // Log console messages for debugging
      if (pageWithConsole.consoleLogs.length > 0) {
        pageWithConsole.consoleLogs.forEach(log => {
        })
      }
    })
    
    test(`${route.name} - Accessibility Test`, async ({ pageWithConsole }) => {
      await pageWithConsole.goto(route.path)
      await pageWithConsole.waitForLoadState('networkidle')
      
      // Check for basic accessibility
      // Check all images have alt text
      const images = await pageWithConsole.locator('img').all()
      for (const img of images) {
        const alt = await img.getAttribute('alt')
        expect(alt, 'Image missing alt text').toBeTruthy()
      }
      
      // Check all buttons have accessible text
      const buttons = await pageWithConsole.locator('button').all()
      for (const button of buttons) {
        const text = await button.textContent()
        const ariaLabel = await button.getAttribute('aria-label')
        expect(text || ariaLabel, 'Button missing accessible text').toBeTruthy()
      }
      
      // Check for proper heading hierarchy
      const h1Count = await pageWithConsole.locator('h1').count()
      expect(h1Count, 'Page should have exactly one h1').toBe(1)
    })
    
    test(`${route.name} - Performance Test`, async ({ pageWithConsole }) => {
      const startTime = Date.now()
      
      await pageWithConsole.goto(route.path)
      await pageWithConsole.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      // Page should load within 3 seconds
      expect(loadTime, `${route.name} took too long to load`).toBeLessThan(3000)
      
      // Check for large images
      const images = await pageWithConsole.locator('img').all()
      for (const img of images) {
        const src = await img.getAttribute('src')
        if (src && !src.startsWith('data:')) {
          // Image optimization check would go here
        }
      }
    })
  })
  
  test('Dashboard Navigation Flow', async ({ pageWithConsole }, testInfo) => {
    // Test complete navigation flow
    await pageWithConsole.goto('/dashboard')
    
    // Take initial screenshot
    await pageWithConsole.screenshot({ 
      path: path.join(testInfo.outputDir, 'dashboard-initial.png'),
      fullPage: true 
    })
    
    // Navigate through each section
    for (const route of DASHBOARD_ROUTES.slice(1)) {
      // Click on navigation item if visible
      const navLink = pageWithConsole.locator(`a[href="${route.path}"]`).first()
      if (await navLink.isVisible()) {
        await navLink.click()
        await pageWithConsole.waitForLoadState('networkidle')
        
        // Verify URL changed
        expect(pageWithConsole.url()).toContain(route.path)
        
        // Take screenshot
        await pageWithConsole.screenshot({ 
          path: path.join(testInfo.outputDir, `nav-${route.name.toLowerCase().replace(/\s+/g, '-')}.png`),
          fullPage: true 
        })
        
        // Check for errors after navigation
        expect(pageWithConsole.errors).toHaveLength(0)
      }
    }
  })
  
  test('Responsive Design Test', async ({ pageWithConsole }, testInfo) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ]
    
    for (const viewport of viewports) {
      await pageWithConsole.setViewportSize(viewport)
      
      for (const route of DASHBOARD_ROUTES) {
        await pageWithConsole.goto(route.path)
        await pageWithConsole.waitForLoadState('networkidle')
        
        // Take screenshot for each viewport
        const screenshotName = `${route.name.toLowerCase().replace(/\s+/g, '-')}-${viewport.name}.png`
        await pageWithConsole.screenshot({ 
          path: path.join(testInfo.outputDir, screenshotName),
          fullPage: true 
        })
        
        // Mobile specific checks
        if (viewport.name === 'mobile') {
          // Check if mobile menu is accessible
          const mobileMenuButton = pageWithConsole.locator('[data-testid="mobile-menu"]')
          if (await mobileMenuButton.isVisible()) {
            await mobileMenuButton.click()
            await pageWithConsole.waitForTimeout(500) // Wait for animation
            await pageWithConsole.screenshot({ 
              path: path.join(testInfo.outputDir, `${route.name.toLowerCase().replace(/\s+/g, '-')}-mobile-menu.png`),
              fullPage: true 
            })
          }
        }
      }
    }
  })
  
  test('Error Boundary Test', async ({ pageWithConsole }) => {
    // Test error handling
    await pageWithConsole.goto('/dashboard/non-existent-page')
    
    // Should show 404 or redirect
    const heading = await pageWithConsole.locator('h1').textContent()
    expect(heading).toMatch(/404|Not Found|Dashboard/i)
    
    // No JavaScript errors should occur
    expect(pageWithConsole.errors).toHaveLength(0)
  })
})

test.describe('Form Validation Tests', () => {
  test('New Property Form Validation', async ({ pageWithConsole }, testInfo) => {
    await pageWithConsole.goto('/dashboard/properties/new')
    await pageWithConsole.waitForLoadState('networkidle')
    
    // Try to submit empty form
    const submitButton = pageWithConsole.locator('button[type="submit"]')
    await submitButton.click()
    
    // Take screenshot of validation errors
    await pageWithConsole.screenshot({ 
      path: path.join(testInfo.outputDir, 'property-form-validation.png'),
      fullPage: true 
    })
    
    // Check for validation messages
    const errorMessages = await pageWithConsole.locator('.error-message, [role="alert"]').all()
    expect(errorMessages.length).toBeGreaterThan(0)
    
    // Fill in required fields
    await pageWithConsole.fill('input[name="name"]', 'Test Property')
    await pageWithConsole.fill('input[name="address"]', '123 Test Street')
    await pageWithConsole.selectOption('select[name="type"]', 'apartment')
    await pageWithConsole.fill('input[name="total_units"]', '10')
    
    // Take screenshot after filling
    await pageWithConsole.screenshot({ 
      path: path.join(testInfo.outputDir, 'property-form-filled.png'),
      fullPage: true 
    })
    
    // Submit should now work without errors
    await submitButton.click()
    
    // Check console for any errors
    expect(pageWithConsole.errors).toHaveLength(0)
  })
})

test.describe('Data Loading Tests', () => {
  test('Properties List Loading State', async ({ pageWithConsole }, testInfo) => {
    // Slow down network to see loading states
    await pageWithConsole.route('**/api/properties*', async route => {
      await pageWithConsole.waitForTimeout(2000) // Simulate slow API
      await route.continue()
    })
    
    await pageWithConsole.goto('/dashboard/properties')
    
    // Capture loading state
    await pageWithConsole.screenshot({ 
      path: path.join(testInfo.outputDir, 'properties-loading.png'),
      fullPage: true 
    })
    
    // Wait for content to load
    await pageWithConsole.waitForSelector('[data-testid="property-list"], table', { 
      timeout: 10000 
    })
    
    // Capture loaded state
    await pageWithConsole.screenshot({ 
      path: path.join(testInfo.outputDir, 'properties-loaded.png'),
      fullPage: true 
    })
    
    // No errors should occur during loading
    expect(pageWithConsole.errors).toHaveLength(0)
  })
})
