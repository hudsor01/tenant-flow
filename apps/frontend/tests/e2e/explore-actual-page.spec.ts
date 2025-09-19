/**
 * Simple test to see what's actually on your homepage
 * No assumptions, just exploration
 */

import { test, expect } from '@playwright/test'

test('See what is actually on the homepage', async ({ page }) => {
  await page.goto('http://localhost:3000')

  // Get page title
  const title = await page.title()
  console.log('Page title:', title)

  // Get all text content to see what's there
  const bodyText = await page.locator('body').textContent()
  console.log('Page contains:', bodyText?.substring(0, 500) + '...')

  // Get all buttons
  const buttons = await page.locator('button, [role="button"], a').allTextContents()
  console.log('Buttons found:', buttons.filter(text => text.trim().length > 0))

  // Get all headings
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents()
  console.log('Headings found:', headings)

  // Get all links
  const links = await page.locator('a').allTextContents()
  console.log('Links found:', links.filter(text => text.trim().length > 0))

  // Get all inputs
  const inputs = await page.locator('input').evaluateAll(elements =>
    elements.map(el => ({
      type: (el as HTMLInputElement).type,
      placeholder: (el as HTMLInputElement).placeholder,
      name: (el as HTMLInputElement).name
    }))
  )
  console.log('Inputs found:', inputs)

  // Just pass - this is exploration, not testing specific functionality
  expect(title).toBeDefined()
})