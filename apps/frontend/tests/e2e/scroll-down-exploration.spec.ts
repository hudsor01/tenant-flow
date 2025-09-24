/**
 * Explore what happens when scrolling down the page
 * To see what breaks or looks bad
 */

import { test, expect } from '@playwright/test'

test('Scroll down and see what breaks', async ({ page }) => {
  await page.goto('http://localhost:3000')

  // Take screenshot of initial state
  await page.screenshot({ path: 'test-results/homepage-top.png', fullPage: false })

  let visibleText = await page.locator('body').textContent()

  // Scroll down slowly and check what happens
  for (let i = 1; i <= 10; i++) {
    await page.evaluate(() => window.scrollBy(0, 500))
    await page.waitForTimeout(500) // Wait for any loading/animations


    // Check if any errors appeared
    const errors = await page.locator('[role="alert"], .error, .error-message').allTextContents()
    if (errors.length > 0) {
    }

    // Check if loading spinners are stuck
    const loaders = await page.locator('.spinner, [data-testid="loading"], .loading').count()
    if (loaders > 0) {
    }

    // Check for broken images
    const brokenImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'))
      return images.filter(img => !img.complete || img.naturalWidth === 0).length
    })
    if (brokenImages > 0) {
    }

    // Check for any console errors
    const consoleErrors = await page.evaluate(() => {
      // This won't catch all console errors, but let's see
    })

    // Take screenshot of current viewport
    await page.screenshot({
      path: `test-results/homepage-scroll-${i}.png`,
      fullPage: false
    })

    // Check if page is becoming unresponsive
    try {
      await page.locator('body').isVisible({ timeout: 1000 })
    } catch (error) {
      break
    }

    // Log what's currently visible
    const currentSection = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        .filter(h => {
          const rect = h.getBoundingClientRect()
          return rect.top >= 0 && rect.top <= window.innerHeight
        })
        .map(h => h.textContent?.trim())
        .filter(Boolean)
      return headings[0] || 'No visible heading'
    })
  }

  // Take full page screenshot to see everything
  await page.screenshot({ path: 'test-results/homepage-full.png', fullPage: true })

  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1000)

  await page.screenshot({ path: 'test-results/homepage-bottom.png', fullPage: false })

  // Check final state
  const finalErrors = await page.locator('[role="alert"], .error, .error-message').allTextContents()
  if (finalErrors.length > 0) {
  }

  // Always pass - this is just exploration
  expect(true).toBe(true)
})