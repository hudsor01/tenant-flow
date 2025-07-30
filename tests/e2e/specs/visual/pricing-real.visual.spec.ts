import { test, expect } from '@playwright/test'

test.describe('Real Pricing Page Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the actual pricing page
    await page.goto('http://localhost:5173/pricing')
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle')
    
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

  test('real pricing page hero section', async ({ page }) => {
    await expect(page).toHaveScreenshot('real-pricing-hero.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1200, height: 600 },
      animations: 'disabled',
    })
  })

  test('real pricing cards section', async ({ page }) => {
    // Scroll to pricing cards
    await page.locator('text=Choose your plan').scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('real-pricing-cards.png', {
      fullPage: false,
      clip: { x: 0, y: 400, width: 1200, height: 800 },
      animations: 'disabled',
    })
  })

  test('real pricing full page', async ({ page }) => {
    await expect(page).toHaveScreenshot('real-pricing-fullpage.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('real pricing mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('real-pricing-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})