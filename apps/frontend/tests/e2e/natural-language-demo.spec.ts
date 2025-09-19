/**
 * Simple demo showing "natural language testing" vs traditional Playwright
 */

import { test, expect } from '@playwright/test'
import { AIHelpers } from './ai-helpers'

test.describe('Traditional vs Natural Language Testing Demo', () => {
  test('Traditional Playwright way', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Traditional Playwright - you need to know exact selectors
    await page.locator('button[data-testid="login-button"]').click()
    await page.locator('input[name="email"]').fill('test@example.com')
    await page.locator('input[type="password"]').fill('password123')
    await page.locator('button[type="submit"]').click()

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
  })

  test('Natural Language way - describe what you want', async ({ page }) => {
    const ai = new AIHelpers(page)
    await page.goto('http://localhost:3000')

    // Natural language - describe what you want to do
    await ai.click('login button')
    await ai.fill('email field', 'test@example.com')
    await ai.fill('password field', 'password123')
    await ai.click('submit button')

    await ai.expectVisible('dashboard')
  })

  test('Explore what\'s actually on your homepage', async ({ page }) => {
    const ai = new AIHelpers(page)
    await page.goto('http://localhost:3000')

    // Debug what's on the page
    const pageInfo = await ai.debugCurrentPage()
    console.log('🏠 Homepage info:', pageInfo)

    const buttons = await ai.getAllButtons()
    console.log('🔘 Available buttons:', buttons)

    const inputs = await ai.getAllInputs()
    console.log('📝 Available inputs:', inputs)

    // This test just shows you what's available - no failures
    expect(pageInfo.title).toBeDefined()
  })

  test('Try to interact with what\'s actually there', async ({ page }) => {
    const ai = new AIHelpers(page)
    await page.goto('http://localhost:3000')

    try {
      // Try to find and click common elements
      await ai.click('Get Started')
      console.log('✅ Found and clicked "Get Started"')
    } catch (error) {
      console.log('❌ No "Get Started" button found')
    }

    try {
      await ai.click('Sign In')
      console.log('✅ Found and clicked "Sign In"')
    } catch (error) {
      console.log('❌ No "Sign In" button found')
    }

    try {
      await ai.click('Login')
      console.log('✅ Found and clicked "Login"')
    } catch (error) {
      console.log('❌ No "Login" button found')
    }

    // Always pass - this is just exploration
    expect(true).toBe(true)
  })
})