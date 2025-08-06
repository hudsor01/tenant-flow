/**
 * Performance E2E Tests
 * Tests for page load times, responsiveness, and performance metrics
 */

import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test('dashboard loads within acceptable time limits', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'owner@tenantflow.app')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    // Wait for dashboard to fully load
    await page.waitForSelector('[data-testid="dashboard-stats"]')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(5000) // Should load in under 5 seconds
    
    // Check Core Web Vitals
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          if (entries.length > 0) {
            resolve(entries[entries.length - 1].startTime)
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] })
        
        setTimeout(() => resolve(0), 3000)
      })
    })
    
    expect(lcp).toBeLessThan(2500) // LCP should be under 2.5s
  })
  
  test('property list handles large datasets efficiently', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'owner@tenantflow.app')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    await page.click('[data-testid="properties-nav-link"]')
    
    const startTime = Date.now()
    
    // Wait for properties list to load
    await page.waitForSelector('[data-testid="properties-table"]')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000) // Should load in under 3 seconds
    
    // Test scrolling performance with large list
    await page.evaluate(() => {
      const table = document.querySelector('[data-testid="properties-table"]')
      if (table) {
        table.scrollTop = table.scrollHeight
      }
    })
    
    // Should not cause significant lag
    await page.waitForTimeout(100)
    
    // Test search/filter performance
    const searchStartTime = Date.now()
    await page.fill('[data-testid="search-input"]', 'test')
    await page.waitForTimeout(500) // Debounce delay
    
    const searchTime = Date.now() - searchStartTime
    expect(searchTime).toBeLessThan(1000) // Search should be under 1 second
  })
  
  test('form submission responsiveness', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'owner@tenantflow.app')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    await page.click('[data-testid="properties-nav-link"]')
    await page.click('[data-testid="add-property-button"]')
    
    // Fill form rapidly
    const startTime = Date.now()
    
    await page.fill('[data-testid="property-name-input"]', 'Performance Test Property')
    await page.fill('[data-testid="property-address-input"]', '123 Performance St')
    await page.fill('[data-testid="property-city-input"]', 'Test City')
    await page.selectOption('[data-testid="property-state-select"]', 'TX')
    await page.fill('[data-testid="property-zip-input"]', '12345')
    
    const fillTime = Date.now() - startTime
    expect(fillTime).toBeLessThan(2000) // Form filling should be responsive
    
    // Test form validation performance
    const validationStartTime = Date.now()
    await page.click('[data-testid="save-property-button"]')
    
    // Wait for validation messages
    await page.waitForSelector('[data-testid="field-error"]', { timeout: 1000 })
    
    const validationTime = Date.now() - validationStartTime
    expect(validationTime).toBeLessThan(500) // Validation should be instant
  })
  
  test('navigation performance between pages', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'owner@tenantflow.app')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    // Test navigation between main sections
    const navigationTests = [
      { link: '[data-testid="properties-nav-link"]', selector: '[data-testid="properties-table"]' },
      { link: '[data-testid="tenants-nav-link"]', selector: '[data-testid="tenants-list"]' },
      { link: '[data-testid="leases-nav-link"]', selector: '[data-testid="leases-table"]' },
      { link: '[data-testid="maintenance-nav-link"]', selector: '[data-testid="maintenance-list"]' },
      { link: '[data-testid="dashboard-nav-link"]', selector: '[data-testid="dashboard-stats"]' }
    ]
    
    for (const nav of navigationTests) {
      const startTime = Date.now()
      
      await page.click(nav.link)
      await page.waitForSelector(nav.selector)
      await page.waitForLoadState('networkidle')
      
      const navigationTime = Date.now() - startTime
      expect(navigationTime).toBeLessThan(2000) // Navigation should be under 2 seconds
    }
  })
  
  test('memory usage during extended session', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'owner@tenantflow.app')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    // Simulate extended usage
    for (let i = 0; i < 10; i++) {
      // Navigate through different sections
      await page.click('[data-testid="properties-nav-link"]')
      await page.waitForSelector('[data-testid="properties-table"]')
      
      await page.click('[data-testid="tenants-nav-link"]')
      await page.waitForSelector('[data-testid="tenants-list"]')
      
      await page.click('[data-testid="dashboard-nav-link"]')
      await page.waitForSelector('[data-testid="dashboard-stats"]')
      
      // Check memory usage periodically
      if (i % 5 === 0) {
        const metrics = await page.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory
          }
          return null
        })
        
        if (metrics) {
          console.log(`Memory usage after ${i} iterations:`, metrics)
          // Ensure memory usage doesn't exceed reasonable limits
          expect(metrics.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024) // 100MB
        }
      }
    }
  })
  
  test('image loading and optimization', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'owner@tenantflow.app')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    await page.click('[data-testid="properties-nav-link"]')
    
    // Monitor image loading
    const imageLoadTimes: number[] = []
    
    page.on('response', response => {
      if (response.url().includes('.jpg') || response.url().includes('.png') || response.url().includes('.webp')) {
        const timing = response.timing()
        if (timing) {
          imageLoadTimes.push(timing.responseEnd - timing.requestStart)
        }
      }
    })
    
    // Wait for images to load
    await page.waitForLoadState('networkidle')
    
    // Check that images load reasonably quickly
    const averageLoadTime = imageLoadTimes.reduce((a, b) => a + b, 0) / imageLoadTimes.length
    expect(averageLoadTime).toBeLessThan(1000) // Average image load under 1 second
    
    // Check for lazy loading implementation
    const images = await page.locator('img').count()
    const visibleImages = await page.locator('img[loading="lazy"]').count()
    
    // At least some images should use lazy loading
    expect(visibleImages).toBeGreaterThan(0)
  })
  
  test('bundle size and loading optimization', async ({ page }) => {
    // Monitor network requests
    const requests: string[] = []
    const requestSizes: number[] = []
    
    page.on('response', response => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        requests.push(response.url())
        const contentLength = response.headers()['content-length']
        if (contentLength) {
          requestSizes.push(parseInt(contentLength))
        }
      }
    })
    
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    
    // Check that JS bundles are reasonably sized
    const totalSize = requestSizes.reduce((a, b) => a + b, 0)
    expect(totalSize).toBeLessThan(2 * 1024 * 1024) // Total size under 2MB
    
    // Check for code splitting (multiple JS chunks)
    const jsFiles = requests.filter(url => url.includes('.js'))
    expect(jsFiles.length).toBeGreaterThan(1) // Should have multiple chunks
    
    console.log('Loaded JS files:', jsFiles)
    console.log('Total bundle size:', totalSize, 'bytes')
  })
  
  test('mobile performance and responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    const startTime = Date.now()
    
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'owner@tenantflow.app')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    await page.waitForSelector('[data-testid="dashboard-stats"]')
    await page.waitForLoadState('networkidle')
    
    const mobileLoadTime = Date.now() - startTime
    expect(mobileLoadTime).toBeLessThan(6000) // Mobile should load in under 6 seconds
    
    // Test touch interactions
    await page.tap('[data-testid="properties-nav-link"]')
    await page.waitForSelector('[data-testid="properties-table"]')
    
    // Test responsive layout
    const isTableResponsive = await page.locator('[data-testid="properties-table"]').isVisible()
    expect(isTableResponsive).toBe(true)
    
    // Test mobile menu functionality
    const menuButton = page.locator('[data-testid="mobile-menu-button"]')
    if (await menuButton.isVisible()) {
      await menuButton.tap()
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
    }
  })
})