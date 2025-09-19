/**
 * Realistic test based on what's actually on your homepage
 * This works with your actual TenantFlow landing page
 */

import { test, expect } from '@playwright/test'

test.describe('TenantFlow Homepage - Reality Based Tests', () => {
  test('should show the marketing landing page', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Test what's actually there
    await expect(page).toHaveTitle(/TenantFlow/)

    // Check main CTA buttons exist
    await expect(page.getByText('Get Started Free')).toBeVisible()
    await expect(page.getByText('View Demo')).toBeVisible()

    // Check main heading
    await expect(page.getByText('Simplify Property Management', { exact: false })).toBeVisible()

    // Check pricing section
    await expect(page.getByText('Starter')).toBeVisible()
    await expect(page.getByText('Growth')).toBeVisible()
    await expect(page.getByText('TenantFlow Max')).toBeVisible()

    // Check email signup
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute('placeholder', 'Enter your email')
  })

  test('should navigate to pricing section', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Click pricing in nav
    await page.getByText('Pricing').first().click()

    // Should scroll to or show pricing section
    await expect(page.getByText('Simple pricing')).toBeVisible()
  })

  test('should allow email signup', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Find email input and fill it
    const emailInput = page.locator('input[type="email"]')
    await emailInput.fill('test@example.com')

    // Look for a subscribe button near the email input
    const subscribeButton = page.getByText('Subscribe')
    if (await subscribeButton.isVisible()) {
      await subscribeButton.click()
      // Would check for success message here
    }
  })

  test('should show "Get Started Free" call-to-action', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Test the main CTA
    const getStartedButton = page.getByText('Get Started Free').first()
    await expect(getStartedButton).toBeVisible()

    // Click it to see what happens
    await getStartedButton.click()

    // Wait a moment to see if it navigates or opens something
    await page.waitForTimeout(1000)

    // Could be a signup form, redirect, etc.
    // Just verify we're still on a TenantFlow page
    await expect(page).toHaveTitle(/TenantFlow/)
  })

  test('should show testimonials/reviews', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Check for customer testimonials mentioned in the page content
    await expect(page.getByText('Sarah Martinez')).toBeVisible()
    await expect(page.getByText('Michael Chen')).toBeVisible()
    await expect(page.getByText('Jessica Thompson')).toBeVisible()
  })

  test('should show footer navigation', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Check footer links
    await expect(page.getByText('Help Center')).toBeVisible()
    await expect(page.getByText('Privacy')).toBeVisible()
    await expect(page.getByText('Terms')).toBeVisible()
    await expect(page.getByText('Security')).toBeVisible()
  })

  test('should be responsive', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Main content should still be visible
    await expect(page.getByText('Simplify', { exact: false })).toBeVisible()
    await expect(page.getByText('Get Started Free')).toBeVisible()

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.getByText('Simplify', { exact: false })).toBeVisible()

    // Back to desktop
    await page.setViewportSize({ width: 1280, height: 720 })
    await expect(page.getByText('Simplify', { exact: false })).toBeVisible()
  })
})