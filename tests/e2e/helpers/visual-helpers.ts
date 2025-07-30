import { Page, Locator } from '@playwright/test'

export class VisualTestHelpers {
  constructor(private page: Page) {}

  /**
   * Disable animations for consistent screenshots
   */
  async disableAnimations() {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          scroll-behavior: auto !important;
        }
        
        .loading-spinner {
          animation: none !important;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .fade-in, .animate-fadeIn {
          animation: none !important;
          opacity: 1 !important;
        }
      `,
    })
  }

  /**
   * Wait for all images to load
   */
  async waitForImages() {
    await this.page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'))
      return Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve()
          return new Promise(resolve => {
            img.onload = resolve
            img.onerror = resolve
          })
        })
      )
    })
  }

  /**
   * Wait for fonts to load
   */
  async waitForFonts() {
    await this.page.evaluate(() => {
      return (document as any).fonts?.ready || Promise.resolve()
    })
  }

  /**
   * Set up consistent test environment
   */
  async setupVisualEnvironment() {
    await this.disableAnimations()
    await this.waitForImages()
    await this.waitForFonts()
    
    // Set consistent date for date-related components
    await this.page.addInitScript(() => {
      const mockDate = new Date('2024-01-15T10:00:00Z')
      const OriginalDate = Date
      
      ;(global as any).Date = class extends OriginalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            return mockDate
          }
          return new OriginalDate(...args)
        }
        
        static now() {
          return mockDate.getTime()
        }
      }
    })
  }

  /**
   * Mask dynamic content for consistent screenshots
   */
  getDynamicContentMasks() {
    return [
      this.page.locator('[data-testid="timestamp"]'),
      this.page.locator('[data-testid="last-updated"]'),
      this.page.locator('[data-testid="created-date"]'),
      this.page.locator('[data-testid="live-data"]'),
      this.page.locator('[data-testid="user-avatar"]'),
      this.page.locator('.spinner'),
      this.page.locator('.loading'),
    ]
  }

  /**
   * Take a screenshot of a component with standard settings
   */
  async screenshotComponent(locator: Locator, name: string, options: any = {}) {
    return locator.screenshot({
      path: `tests/e2e/screenshots/components/${name}.png`,
      animations: 'disabled',
      ...options,
    })
  }

  /**
   * Take a full page screenshot with standard masks
   */
  async screenshotPage(name: string, options: any = {}) {
    return this.page.screenshot({
      path: `tests/e2e/screenshots/pages/${name}.png`,
      fullPage: true,
      animations: 'disabled',
      mask: this.getDynamicContentMasks(),
      ...options,
    })
  }

  /**
   * Test component at different viewport sizes
   */
  async testResponsiveComponent(locator: Locator, name: string) {
    const viewports = [
      { width: 1920, height: 1080, suffix: 'xl' },
      { width: 1440, height: 900, suffix: 'lg' },
      { width: 1024, height: 768, suffix: 'md' },
      { width: 768, height: 1024, suffix: 'sm' },
      { width: 375, height: 667, suffix: 'xs' },
    ]

    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport)
      await this.page.waitForTimeout(300)
      
      await locator.screenshot({
        path: `tests/e2e/screenshots/responsive/${name}-${viewport.suffix}.png`,
        animations: 'disabled',
      })
    }
  }

  /**
   * Test component in different themes
   */
  async testComponentThemes(locator: Locator, name: string) {
    const themes = ['light', 'dark', 'high-contrast']
    
    for (const theme of themes) {
      await this.page.evaluate((themeName) => {
        document.documentElement.setAttribute('data-theme', themeName)
      }, theme)
      
      await this.page.waitForTimeout(300)
      
      await locator.screenshot({
        path: `tests/e2e/screenshots/themes/${name}-${theme}.png`,
        animations: 'disabled',
      })
    }
    
    // Reset to default theme
    await this.page.evaluate(() => {
      document.documentElement.removeAttribute('data-theme')
    })
  }

  /**
   * Test component interaction states
   */
  async testInteractionStates(locator: Locator, name: string) {
    const states = [
      { name: 'default', action: null },
      { name: 'hover', action: 'hover' },
      { name: 'focus', action: 'focus' },
      { name: 'active', action: 'press' },
    ]

    for (const state of states) {
      if (state.action) {
        switch (state.action) {
          case 'hover':
            await locator.hover()
            break
          case 'focus':
            await locator.focus()
            break
          case 'press':
            await locator.press('Enter')
            break
        }
        await this.page.waitForTimeout(200)
      }
      
      await locator.screenshot({
        path: `tests/e2e/screenshots/states/${name}-${state.name}.png`,
        animations: 'disabled',
      })
      
      // Reset state
      if (state.action) {
        await this.page.locator('body').click()
        await this.page.waitForTimeout(100)
      }
    }
  }

  /**
   * Compare screenshots and handle differences
   */
  async compareScreenshot(locator: Locator, name: string, threshold = 0.2) {
    const screenshot = await locator.screenshot({
      animations: 'disabled',
    })
    
    // This would integrate with a visual comparison service
    // For now, we'll save the screenshot for manual comparison
    await this.page.screenshot({
      path: `tests/e2e/screenshots/comparisons/${name}-${Date.now()}.png`,
      animations: 'disabled',
    })
    
    return screenshot
  }

  /**
   * Set up mock data for consistent visual tests
   */
  async setupMockData() {
    await this.page.route('/api/v1/**', async (route) => {
      const url = route.request().url()
      
      // Mock common endpoints with consistent data
      if (url.includes('/dashboard/stats')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalProperties: 12,
            totalUnits: 48,
            occupiedUnits: 42,
            vacantUnits: 6,
            occupancyRate: 87.5,
            monthlyRevenue: 65400,
            recentActivity: [
              {
                id: '1',
                type: 'lease_signed',
                description: 'New lease signed for Unit 205',
                timestamp: '2024-01-15T09:30:00Z',
              },
              {
                id: '2',
                type: 'maintenance_completed',
                description: 'Plumbing repair completed',
                timestamp: '2024-01-15T08:15:00Z',
              },
            ],
          }),
        })
      } else {
        await route.continue()
      }
    })
  }

  /**
   * Test accessibility visual indicators
   */
  async testAccessibilityVisuals(locator: Locator, name: string) {
    // Test focus indicators
    await locator.focus()
    await this.page.waitForTimeout(200)
    await locator.screenshot({
      path: `tests/e2e/screenshots/a11y/${name}-focus.png`,
      animations: 'disabled',
    })

    // Test high contrast mode
    await this.page.evaluate(() => {
      document.documentElement.style.filter = 'contrast(200%)'
    })
    await this.page.waitForTimeout(200)
    await locator.screenshot({
      path: `tests/e2e/screenshots/a11y/${name}-high-contrast.png`,
      animations: 'disabled',
    })

    // Reset
    await this.page.evaluate(() => {
      document.documentElement.style.filter = ''
    })
  }

  /**
   * Test print styles
   */
  async testPrintStyles(name: string) {
    await this.page.emulateMedia({ media: 'print' })
    await this.page.waitForTimeout(300)
    
    await this.page.screenshot({
      path: `tests/e2e/screenshots/print/${name}-print.png`,
      fullPage: true,
      animations: 'disabled',
    })
    
    // Reset to screen media
    await this.page.emulateMedia({ media: 'screen' })
  }

  /**
   * Test component with loading states
   */
  async testLoadingStates(name: string, apiEndpoint: string) {
    // Mock slow API response
    await this.page.route(apiEndpoint, async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.continue()
    })

    await this.page.goto(this.page.url())
    
    // Capture loading state
    await this.page.screenshot({
      path: `tests/e2e/screenshots/loading/${name}-loading.png`,
      animations: 'disabled',
    })
  }

  /**
   * Test error states
   */
  async testErrorStates(name: string, apiEndpoint: string) {
    // Mock API error
    await this.page.route(apiEndpoint, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })

    await this.page.reload()
    await this.page.waitForLoadState('networkidle')
    
    // Capture error state
    await this.page.screenshot({
      path: `tests/e2e/screenshots/errors/${name}-error.png`,
      fullPage: true,
      animations: 'disabled',
    })
  }
}