import { test, expect } from '@playwright/test'
import { VisualTestHelpers } from '../../helpers/visual-helpers'

test.describe('Dashboard Visual Regression', () => {
  let visualHelpers: VisualTestHelpers

  test.beforeEach(async ({ page }) => {
    visualHelpers = new VisualTestHelpers(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Wait for all animations to complete
    await page.waitForTimeout(1000)
    
    // Disable animations for consistent screenshots
    await visualHelpers.disableAnimations()
  })

  test('dashboard overview layout', async ({ page }) => {
    // Test full dashboard layout
    await expect(page).toHaveScreenshot('dashboard-overview.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        page.locator('[data-testid="dynamic-date"]'),
        page.locator('[data-testid="live-timestamp"]'),
        page.locator('[data-testid="user-avatar"]'),
      ],
    })
  })

  test('dashboard statistics cards', async ({ page }) => {
    const statsContainer = page.locator('[data-testid="dashboard-stats"]')
    await expect(statsContainer).toHaveScreenshot('dashboard-stats-cards.png')
  })

  test('recent activity section', async ({ page }) => {
    const activitySection = page.locator('[data-testid="recent-activity"]')
    await expect(activitySection).toHaveScreenshot('recent-activity-section.png')
  })

  test('navigation sidebar', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]')
    await expect(sidebar).toHaveScreenshot('navigation-sidebar.png')
  })

  test('dashboard with no data state', async ({ page }) => {
    // Mock empty state
    await page.route('/api/v1/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalProperties: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          vacantUnits: 0,
          monthlyRevenue: 0,
          recentActivity: [],
        }),
      })
    })

    await page.reload()
    await page.waitForLoadState('networkidle')
    await visualHelpers.disableAnimations()

    await expect(page).toHaveScreenshot('dashboard-empty-state.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('dashboard loading states', async ({ page }) => {
    // Intercept API calls to simulate loading
    await page.route('/api/v1/dashboard/stats', async (route) => {
      // Delay response to capture loading state
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.continue()
    })

    await page.goto('/dashboard')
    
    // Capture loading state
    await expect(page.locator('[data-testid="dashboard-loading"]')).toHaveScreenshot('dashboard-loading-state.png')
  })

  test('dashboard responsive breakpoints', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-xl' },
      { width: 1440, height: 900, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 375, height: 667, name: 'mobile' },
      { width: 320, height: 568, name: 'mobile-small' },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.waitForTimeout(500) // Wait for layout to settle
      
      await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="dynamic-date"]'),
          page.locator('[data-testid="live-timestamp"]'),
        ],
      })
    }
  })

  test('dashboard dark theme', async ({ page }) => {
    // Switch to dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
    })
    
    await page.waitForTimeout(300)
    await visualHelpers.disableAnimations()

    await expect(page).toHaveScreenshot('dashboard-dark-theme.png', {
      fullPage: true,
      animations: 'disabled',
      mask: [
        page.locator('[data-testid="dynamic-date"]'),
        page.locator('[data-testid="live-timestamp"]'),
      ],
    })
  })

  test('dashboard hover states', async ({ page }) => {
    // Test hover states for interactive elements
    const statsCards = page.locator('[data-testid="stat-card"]')
    const firstCard = statsCards.first()
    
    // Capture normal state
    await expect(firstCard).toHaveScreenshot('stat-card-normal.png')
    
    // Capture hover state
    await firstCard.hover()
    await page.waitForTimeout(200)
    await expect(firstCard).toHaveScreenshot('stat-card-hover.png')
  })

  test('dashboard accessibility contrast', async ({ page }) => {
    // Test high contrast mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-contrast', 'high')
    })
    
    await page.waitForTimeout(300)
    await visualHelpers.disableAnimations()

    await expect(page).toHaveScreenshot('dashboard-high-contrast.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('dashboard print styles', async ({ page }) => {
    // Emulate print media
    await page.emulateMedia({ media: 'print' })
    await page.waitForTimeout(300)

    await expect(page).toHaveScreenshot('dashboard-print-view.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})