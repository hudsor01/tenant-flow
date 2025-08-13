/**
 * Visual Regression Tests for Dashboard Demo Page
 * 
 * Captures screenshots of the static demo implementation to detect visual changes
 */

import { test, expect } from '@playwright/test'

test.describe('Dashboard Demo Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    })
  })

  test('should match demo page full layout', async ({ page }) => {
    // Screenshot full demo page
    await expect(page).toHaveScreenshot('demo-full-page.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('should match desktop viewport layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.waitForTimeout(500)
    
    await expect(page).toHaveScreenshot('demo-desktop.png', {
      animations: 'disabled'
    })
  })

  test('should match tablet viewport layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)
    
    await expect(page).toHaveScreenshot('demo-tablet.png', {
      animations: 'disabled'
    })
  })

  test('should match mobile viewport layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    
    await expect(page).toHaveScreenshot('demo-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('should match individual feature cards', async ({ page }) => {
    const cards = page.locator('.bg-white.p-6.rounded-lg.shadow')
    
    // Screenshot each feature card individually
    for (let i = 0; i < 6; i++) {
      const card = cards.nth(i)
      const cardTitle = await card.locator('h2').textContent()
      const filename = `card-${cardTitle?.toLowerCase().replace(/\s+/g, '-')}.png`
      
      await expect(card).toHaveScreenshot(filename, {
        animations: 'disabled'
      })
    }
  })

  test('should match data table section', async ({ page }) => {
    const tableSection = page.locator('div.bg-white').filter({
      has: page.locator('h2:has-text("Dense Data Tables")')
    })
    
    await expect(tableSection).toHaveScreenshot('data-table-section.png', {
      animations: 'disabled'
    })
  })

  test('should match sparkline chart section', async ({ page }) => {
    const chartSection = page.locator('div.bg-white').filter({
      has: page.locator('h2:has-text("Sparkline Charts")')
    })
    
    await expect(chartSection).toHaveScreenshot('sparkline-section.png', {
      animations: 'disabled'
    })
  })

  test('should match mobile navigation on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    
    const mobileNav = page.locator('.md\\:hidden').filter({
      has: page.locator('button:has-text("Home")')
    })
    
    await expect(mobileNav).toHaveScreenshot('mobile-navigation.png', {
      animations: 'disabled'
    })
  })

  test('should match performance checklist section', async ({ page }) => {
    const performanceSection = page.locator('div.bg-white').filter({
      has: page.locator('h2:has-text("Performance")')
    })
    
    await expect(performanceSection).toHaveScreenshot('performance-section.png', {
      animations: 'disabled'
    })
  })

  test('should match grid layout at different breakpoints', async ({ page }) => {
    const breakpoints = [
      { width: 1920, height: 1080, name: 'xl' },
      { width: 1280, height: 800, name: 'lg' },
      { width: 1024, height: 768, name: 'md' },
      { width: 768, height: 1024, name: 'sm' },
      { width: 375, height: 667, name: 'xs' }
    ]
    
    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      })
      await page.waitForTimeout(500)
      
      const grid = page.locator('.grid')
      await expect(grid).toHaveScreenshot(`grid-${breakpoint.name}.png`, {
        animations: 'disabled'
      })
    }
  })

  test('should match theme system card interactivity', async ({ page }) => {
    const themeCard = page.locator('div.bg-white').filter({
      has: page.locator('h2:has-text("Theme System")')
    })
    
    // Normal state
    await expect(themeCard).toHaveScreenshot('theme-card-normal.png', {
      animations: 'disabled'
    })
    
    // Hover state
    await themeCard.locator('button').hover()
    await page.waitForTimeout(100)
    
    await expect(themeCard).toHaveScreenshot('theme-card-hover.png', {
      animations: 'disabled'
    })
  })
})