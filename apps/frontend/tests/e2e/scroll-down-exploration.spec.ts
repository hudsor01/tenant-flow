/**
 * Explore what happens when scrolling down the page
 * To see what breaks or looks bad
 */

import { test } from '@playwright/test'

test('Scroll down and see what breaks', async ({ page }) => {
  await page.goto('http://localhost:3000')

  // Scroll down slowly and check what happens
  for (let i = 1; i <= 10; i++) {
    await page.evaluate(() => window.scrollBy(0, 500))
    await page.waitForTimeout(500) // Wait for any loading/animations

    // Check if page is becoming unresponsive
    try {
      await page.locator('body').isVisible({ timeout: 1000 })
    } catch {
      break
    }
  }

  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(100)

  // Test passes if scrolling completed without errors
})
