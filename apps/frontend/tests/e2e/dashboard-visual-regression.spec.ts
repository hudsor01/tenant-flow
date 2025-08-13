/**
 * Visual Regression Tests for Dashboard Modernization
 * 
 * Captures screenshots to detect visual changes in the new UI components
 */

import { test, expect } from '@playwright/test'

test.describe('Dashboard Visual Regression', () => {
  test('should match dashboard layout screenshot', async ({ page }) => {
    await page.goto('/demo')
    await page.waitForLoadState('networkidle')
    
    // Wait for animations to settle
    await page.waitForTimeout(1000)
    
    // Hide dynamic elements (dates, times, etc.)
    await page.addStyleTag({
      content: `
        [data-testid*="time"], 
        [data-testid*="date"],
        .animate-pulse,
        [class*="animate-"] {
          animation: none !important;
          transition: none !important;
        }
      `
    })
    
    // Screenshot full page
    await expect(page).toHaveScreenshot('dashboard-full-page.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('should match command palette appearance', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Open command palette
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k')
    
    // Wait for it to open
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await page.waitForTimeout(500)
    
    // Screenshot just the command palette
    await expect(page.locator('[role="dialog"]')).toHaveScreenshot('command-palette.png')
  })

  test('should match theme toggle states', async ({ page }) => {
    await page.goto('/demo')
    await page.waitForLoadState('networkidle')
    
    // Find theme toggle
    const themeButton = page.locator('button').filter({ 
      hasText: /theme|dark|light|system/i 
    }).first()

    if (await themeButton.isVisible()) {
      // Light theme screenshot
      await expect(page.locator('body')).toHaveScreenshot('dashboard-light-theme.png')
      
      // Switch to dark theme
      await themeButton.click()
      const darkOption = page.locator('text=Dark')
      
      if (await darkOption.isVisible()) {
        await darkOption.click()
        await page.waitForTimeout(500)
        
        // Dark theme screenshot
        await expect(page.locator('body')).toHaveScreenshot('dashboard-dark-theme.png')
      }
    }
  })

  test('should match mobile navigation layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/demo')
    await page.waitForLoadState('networkidle')
    
    // Screenshot mobile layout
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true
    })
    
    // Screenshot just the mobile nav
    const mobileNav = page.locator('nav').last()
    if (await mobileNav.isVisible()) {
      await expect(mobileNav).toHaveScreenshot('mobile-navigation.png')
    }
  })

  test('should match dense table layout', async ({ page }) => {
    await page.goto('/properties')
    await page.waitForLoadState('networkidle')
    
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 5000 })
    
    // Screenshot the table
    const table = page.locator('table').first()
    if (await table.isVisible()) {
      await expect(table).toHaveScreenshot('dense-properties-table.png')
    }
  })

  test('should match sparkline charts appearance', async ({ page }) => {
    await page.goto('/demo')
    await page.waitForLoadState('networkidle')
    
    // Find widget with chart
    const chartWidget = page.locator('[class*="card"]').filter({
      has: page.locator('svg')
    }).first()
    
    if (await chartWidget.isVisible()) {
      await expect(chartWidget).toHaveScreenshot('sparkline-widget.png')
    }
  })

  test('should match responsive breakpoints', async ({ page }) => {
    const breakpoints = [
      { width: 1920, height: 1080, name: 'desktop-xl' },
      { width: 1280, height: 800, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 375, height: 667, name: 'mobile' }
    ]
    
    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      })
      
      await page.goto('/demo')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000) // Let responsive changes settle
      
      await expect(page).toHaveScreenshot(`dashboard-${breakpoint.name}.png`, {
        fullPage: true,
        animations: 'disabled'
      })
    }
  })
})