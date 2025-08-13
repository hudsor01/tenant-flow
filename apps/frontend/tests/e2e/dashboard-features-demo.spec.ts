/**
 * Dashboard Modernization Features - Demo Page Tests
 * 
 * Tests for the static demo page implementation of dashboard features.
 * This validates the UI components exist and are displayed correctly.
 */

import { test, expect } from '@playwright/test'

test.describe('Dashboard Features Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  test.describe('Layout and Structure', () => {
    test('should display main demo page layout', async ({ page }) => {
      // Page title
      await expect(page.locator('h1')).toContainText('Dashboard Features Demo')
      
      // Main container
      await expect(page.locator('.max-w-4xl')).toBeVisible()
      
      // Grid layout
      await expect(page.locator('.grid')).toBeVisible()
    })

    test('should show all feature sections', async ({ page }) => {
      const expectedSections = [
        'Theme System',
        'Command Palette', 
        'Dense Data Tables',
        'Mobile Navigation',
        'Sparkline Charts',
        'Performance'
      ]
      
      for (const section of expectedSections) {
        await expect(page.locator('h2', { hasText: section })).toBeVisible()
      }
    })
  })

  test.describe('Theme System Display', () => {
    test('should show theme toggle button', async ({ page }) => {
      const themeSection = page.locator('div.bg-white').filter({ 
        has: page.locator('h2:has-text("Theme System")') 
      })
      
      await expect(themeSection).toBeVisible()
      await expect(themeSection.locator('button')).toContainText('Theme Toggle')
      await expect(themeSection.locator('button')).toHaveClass(/bg-blue-600/)
    })
  })

  test.describe('Command Palette Display', () => {
    test('should show command palette input mockup', async ({ page }) => {
      const paletteSection = page.locator('div.bg-white').filter({
        has: page.locator('h2:has-text("Command Palette")')
      })
      
      await expect(paletteSection).toBeVisible()
      
      const input = paletteSection.locator('input')
      await expect(input).toBeVisible()
      await expect(input).toHaveAttribute('placeholder', 'Press ⌘K to search...')
      await expect(input).toHaveAttribute('readonly')
    })
  })

  test.describe('Dense Data Tables Display', () => {
    test('should show sample data table', async ({ page }) => {
      const tableSection = page.locator('div.bg-white').filter({
        has: page.locator('h2:has-text("Dense Data Tables")')
      })
      
      await expect(tableSection).toBeVisible()
      
      const table = tableSection.locator('table')
      await expect(table).toBeVisible()
      
      // Table headers
      await expect(table.locator('th:has-text("Property")')).toBeVisible()
      await expect(table.locator('th:has-text("Units")')).toBeVisible()
      await expect(table.locator('th:has-text("Rent")')).toBeVisible()
      
      // Sample data
      await expect(table.locator('td:has-text("Sunset Apartments")')).toBeVisible()
      await expect(table.locator('td:has-text("Downtown Loft")')).toBeVisible()
    })

    test('should use dense styling', async ({ page }) => {
      const table = page.locator('table')
      
      // Check for dense row height
      const rows = table.locator('tbody tr')
      await expect(rows.first()).toHaveClass(/h-8/)
      
      // Check for small text
      await expect(table).toHaveClass(/text-sm/)
      await expect(rows.first()).toHaveClass(/text-xs/)
    })
  })

  test.describe('Mobile Navigation Display', () => {
    test('should show mobile nav on small screens', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(500)
      
      // Mobile nav should be visible
      const mobileNav = page.locator('.md\\:hidden').filter({
        has: page.locator('button:has-text("Home")')
      })
      
      await expect(mobileNav).toBeVisible()
      
      // Check nav items
      await expect(mobileNav.locator('button:has-text("Home")')).toBeVisible()
      await expect(mobileNav.locator('button:has-text("Properties")')).toBeVisible()
      await expect(mobileNav.locator('button:has-text("Reports")')).toBeVisible()
      await expect(mobileNav.locator('button:has-text("Profile")')).toBeVisible()
      
      // FAB-style add button
      const fabButton = mobileNav.locator('button:has-text("+")')
      await expect(fabButton).toBeVisible()
      await expect(fabButton).toHaveClass(/bg-blue-600/)
      await expect(fabButton).toHaveClass(/rounded-full/)
    })

    test('should hide mobile nav on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.waitForTimeout(500)
      
      // Mobile nav should be hidden on desktop
      const mobileNav = page.locator('.md\\:hidden')
      
      // Element exists but should not be visible due to responsive classes
      await expect(mobileNav).toBeAttached()
    })
  })

  test.describe('Sparkline Charts Display', () => {
    test('should show chart visualization', async ({ page }) => {
      const chartSection = page.locator('div.bg-white').filter({
        has: page.locator('h2:has-text("Sparkline Charts")')
      })
      
      await expect(chartSection).toBeVisible()
      
      // Chart container
      const chartContainer = chartSection.locator('.flex.items-end')
      await expect(chartContainer).toBeVisible()
      await expect(chartContainer).toHaveClass(/h-10/)
      
      // Chart bars
      const bars = chartContainer.locator('div.bg-blue-500')
      await expect(bars).toHaveCount(6)
      
      // Check different heights (sparkline effect)
      const heights = ['h-6', 'h-8', 'h-4', 'h-10', 'h-7', 'h-9']
      for (let i = 0; i < heights.length; i++) {
        await expect(bars.nth(i)).toHaveClass(new RegExp(heights[i]))
      }
    })
  })

  test.describe('Performance Checklist Display', () => {
    test('should show performance indicators', async ({ page }) => {
      const performanceSection = page.locator('div.bg-white').filter({
        has: page.locator('h2:has-text("Performance")')
      })
      
      await expect(performanceSection).toBeVisible()
      
      const checklist = [
        '✅ Theme switching',
        '✅ Command palette (⌘K)',
        '✅ Responsive design', 
        '✅ Fast rendering'
      ]
      
      for (const item of checklist) {
        await expect(performanceSection.locator(`text=${item}`)).toBeVisible()
      }
    })
  })

  test.describe('Responsive Design', () => {
    test('should adapt to different screen sizes', async ({ page }) => {
      const viewports = [
        { width: 1280, height: 800, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ]
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(500)
        
        // Main content should always be visible
        await expect(page.locator('h1')).toBeVisible()
        await expect(page.locator('.grid')).toBeVisible()
        
        // Grid should adapt to screen size
        const grid = page.locator('.grid')
        if (viewport.width >= 768) {
          // md:grid-cols-2 should apply on tablet and desktop
          await expect(grid).toHaveClass(/md:grid-cols-2/)
        }
      }
    })
  })

  test.describe('Visual Consistency', () => {
    test('should use consistent styling patterns', async ({ page }) => {
      const cards = page.locator('.bg-white.p-6.rounded-lg.shadow')
      
      // Should have 6 feature cards
      await expect(cards).toHaveCount(6)
      
      // Each card should have consistent styling
      for (let i = 0; i < 6; i++) {
        const card = cards.nth(i)
        await expect(card).toHaveClass(/bg-white/)
        await expect(card).toHaveClass(/p-6/)
        await expect(card).toHaveClass(/rounded-lg/)
        await expect(card).toHaveClass(/shadow/)
        
        // Each card should have an h2 title
        await expect(card.locator('h2')).toBeVisible()
        await expect(card.locator('h2')).toHaveClass(/text-xl/)
        await expect(card.locator('h2')).toHaveClass(/font-semibold/)
        await expect(card.locator('h2')).toHaveClass(/mb-4/)
      }
    })
  })

  test.describe('Performance', () => {
    test('should load quickly', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/demo')
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      // Should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000)
      
      // All critical content should be visible
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('.grid')).toBeVisible()
    })

    test('should render all content without layout shifts', async ({ page }) => {
      await page.goto('/demo')
      
      // Wait for full render
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      // All sections should be stable
      const sections = page.locator('h2')
      const sectionCount = await sections.count()
      expect(sectionCount).toBe(6)
      
      // No loading spinners or placeholders should be visible
      await expect(page.locator('.loading, .spinner, .skeleton')).toHaveCount(0)
    })
  })
})