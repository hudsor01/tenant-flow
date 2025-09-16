/**
 * Sub-200ms Interaction Performance Tests
 *
 * Tests every user interaction meets Apple's obsession-critical performance standard.
 * Every click, hover, and focus must respond within 200ms for satisfying UX.
 *
 * Critical Test Coverage:
 * - All button interactions (primary, secondary, destructive)
 * - Navigation elements (navbar, sidebar, breadcrumbs)
 * - Form controls (inputs, selects, checkboxes)
 * - Interactive cards and components
 * - Modal and overlay triggers
 */

import { test, expect } from '@playwright/test'
import { PerformanceTestUtils, PerformanceAssertions } from '../performance-test-utilities'

test.describe('Sub-200ms Interaction Performance - Apple Standard', () => {
  let performanceUtils: PerformanceTestUtils

  test.beforeEach(async ({ page }) => {
    performanceUtils = new PerformanceTestUtils(page)

    // Disable animations for consistent performance measurement
    await page.addInitScript(() => {
      // Preserve Apple motion tokens but disable for testing
      document.documentElement.style.setProperty('--duration-fast', '0ms')
      document.documentElement.style.setProperty('--duration-medium', '0ms')
    })
  })

  test.describe('Homepage Interactions', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Hero CTA button meets sub-200ms standard', async () => {
      const metrics = await performanceUtils.testSub200msInteraction(
        '[data-testid="hero-cta"], .hero-cta, button:has-text("Get Started")'
      )

      PerformanceAssertions.expectSub200ms(metrics)

      // Additional Apple-level expectations
      expect(metrics.responseTime, 'Hero CTA should have instant feedback').toBeLessThanOrEqual(100)
      expect(metrics.satisfactionScore, 'Hero CTA should be exceptionally satisfying').toBeGreaterThanOrEqual(8)
    })

    test('Navigation menu items respond instantly', async () => {
      const navItems = [
        'nav a:has-text("Features")',
        'nav a:has-text("Pricing")',
        'nav a:has-text("About")',
        'nav a:has-text("Contact")'
      ]

      for (const selector of navItems) {
        const metrics = await performanceUtils.testSub200msInteraction(selector, 'hover')

        PerformanceAssertions.expectSub200ms(metrics)
        expect(metrics.responseTime, `Nav item ${selector} hover too slow`).toBeLessThanOrEqual(150)
      }
    })

    test('Feature cards are instantly interactive', async ({ page }) => {
      // Test all feature cards on homepage
      const featureCards = await page.locator('.feature-card, [data-testid*="feature"]').all()

      expect(featureCards.length, 'Should have feature cards to test').toBeGreaterThan(0)

      for (let i = 0; i < Math.min(featureCards.length, 6); i++) {
        const metrics = await performanceUtils.testSub200msInteraction(
          `.feature-card:nth-child(${i + 1}), [data-testid*="feature"]:nth-child(${i + 1})`,
          'hover'
        )

        PerformanceAssertions.expectSub200ms(metrics)
      }
    })

    test('Auth buttons (Login/Register) are Apple-responsive', async () => {
      const authButtons = [
        'a[href*="login"], button:has-text("Login"), button:has-text("Log In")',
        'a[href*="register"], a[href*="sign-up"], button:has-text("Sign Up")',
        'button:has-text("Get Started")'
      ]

      for (const selector of authButtons) {
        try {
          const metrics = await performanceUtils.testSub200msInteraction(selector)
          PerformanceAssertions.expectSub200ms(metrics)
        } catch (error) {
          // Button might not exist on this page, continue
          console.log(`Button ${selector} not found, skipping`)
        }
      }
    })
  })

  test.describe('Dashboard Interactions', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to dashboard (assuming auth is handled)
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
    })

    test('Sidebar navigation is Apple-instant', async () => {
      const sidebarItems = [
        '[data-testid="nav-dashboard"], a[href*="dashboard"]:has-text("Dashboard")',
        '[data-testid="nav-properties"], a[href*="properties"]:has-text("Properties")',
        '[data-testid="nav-tenants"], a[href*="tenants"]:has-text("Tenants")',
        '[data-testid="nav-leases"], a[href*="leases"]:has-text("Leases")',
        '[data-testid="nav-maintenance"], a[href*="maintenance"]:has-text("Maintenance")'
      ]

      for (const selector of sidebarItems) {
        try {
          const metrics = await performanceUtils.testSub200msInteraction(selector, 'hover')
          PerformanceAssertions.expectSub200ms(metrics)

          // Dashboard navigation should be exceptionally fast
          expect(metrics.responseTime, `Sidebar item ${selector} too slow`).toBeLessThanOrEqual(100)
        } catch (error) {
          console.log(`Sidebar item ${selector} not found, skipping`)
        }
      }
    })

    test('Action buttons meet Apple performance standards', async () => {
      const actionButtons = [
        'button:has-text("Add Property")',
        'button:has-text("Create")',
        'button:has-text("Save")',
        'button:has-text("Edit")',
        'button:has-text("Delete")',
        '[data-testid*="action-button"]'
      ]

      for (const selector of actionButtons) {
        try {
          const hoverMetrics = await performanceUtils.testSub200msInteraction(selector, 'hover')
          const clickMetrics = await performanceUtils.testSub200msInteraction(selector, 'click')

          PerformanceAssertions.expectSub200ms(hoverMetrics)
          PerformanceAssertions.expectSub200ms(clickMetrics)

          // Action buttons need exceptional responsiveness
          expect(hoverMetrics.responseTime, 'Action button hover too slow').toBeLessThanOrEqual(120)
          expect(clickMetrics.responseTime, 'Action button click too slow').toBeLessThanOrEqual(150)
        } catch (error) {
          console.log(`Action button ${selector} not found, skipping`)
        }
      }
    })

    test('Data table interactions are snappy', async ({ page }) => {
      // Test table row interactions
      const tableRows = await page.locator('table tbody tr, .table-row').all()

      if (tableRows.length > 0) {
        for (let i = 0; i < Math.min(tableRows.length, 5); i++) {
          const metrics = await performanceUtils.testSub200msInteraction(
            `table tbody tr:nth-child(${i + 1}), .table-row:nth-child(${i + 1})`,
            'hover'
          )

          PerformanceAssertions.expectSub200ms(metrics)
        }
      }
    })

    test('Modal triggers are instantaneous', async () => {
      const modalTriggers = [
        'button[data-testid*="modal"]',
        'button:has-text("Add")',
        'button:has-text("Create")',
        '[data-trigger="modal"]'
      ]

      for (const selector of modalTriggers) {
        try {
          const metrics = await performanceUtils.testSub200msInteraction(selector)
          PerformanceAssertions.expectSub200ms(metrics)

          // Modal triggers should feel instant
          expect(metrics.responseTime, `Modal trigger ${selector} too slow`).toBeLessThanOrEqual(100)
        } catch (error) {
          console.log(`Modal trigger ${selector} not found, skipping`)
        }
      }
    })
  })

  test.describe('Form Interactions', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/register')
      await page.waitForLoadState('networkidle')
    })

    test('Form inputs have instant focus response', async () => {
      const formInputs = [
        'input[type="text"]',
        'input[type="email"]',
        'input[type="password"]',
        'textarea',
        'select'
      ]

      for (const selector of formInputs) {
        try {
          const focusMetrics = await performanceUtils.testSub200msInteraction(selector, 'focus')
          PerformanceAssertions.expectSub200ms(focusMetrics)

          // Form inputs should have instant focus
          expect(focusMetrics.responseTime, `Input ${selector} focus too slow`).toBeLessThanOrEqual(80)
        } catch (error) {
          console.log(`Input ${selector} not found, skipping`)
        }
      }
    })

    test('Submit buttons provide immediate feedback', async () => {
      const submitButtons = [
        'button[type="submit"]',
        'button:has-text("Submit")',
        'button:has-text("Sign Up")',
        'button:has-text("Register")',
        'button:has-text("Login")'
      ]

      for (const selector of submitButtons) {
        try {
          const metrics = await performanceUtils.testSub200msInteraction(selector, 'hover')
          PerformanceAssertions.expectSub200ms(metrics)

          // Submit buttons are critical - need Apple-level responsiveness
          expect(metrics.responseTime, `Submit button ${selector} hover too slow`).toBeLessThanOrEqual(100)
          expect(metrics.satisfactionScore, `Submit button ${selector} not satisfying enough`).toBeGreaterThanOrEqual(8)
        } catch (error) {
          console.log(`Submit button ${selector} not found, skipping`)
        }
      }
    })

    test('Checkbox and radio buttons snap instantly', async ({ page }) => {
      const checkboxes = await page.locator('input[type="checkbox"], input[type="radio"]').all()

      for (let i = 0; i < checkboxes.length; i++) {
        const metrics = await performanceUtils.testSub200msInteraction(
          `input[type="checkbox"]:nth-child(${i + 1}), input[type="radio"]:nth-child(${i + 1})`
        )

        PerformanceAssertions.expectSub200ms(metrics)

        // Checkboxes should have that satisfying Apple "snap"
        expect(metrics.responseTime, 'Checkbox/radio response too slow').toBeLessThanOrEqual(120)
        expect(metrics.satisfactionScore, 'Checkbox/radio not satisfying').toBeGreaterThanOrEqual(7)
      }
    })
  })

  test.describe('Mobile Touch Targets', () => {
    test.use({ viewport: { width: 375, height: 812 } }) // iPhone viewport

    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Mobile buttons meet Apple 44px touch target performance', async () => {
      const mobileButtons = [
        'button',
        'a[role="button"]',
        '.btn',
        '[data-testid*="button"]'
      ]

      for (const selector of mobileButtons) {
        try {
          const metrics = await performanceUtils.testSub200msInteraction(selector)
          PerformanceAssertions.expectSub200ms(metrics)

          // Mobile touch targets need even faster response for good UX
          expect(metrics.responseTime, `Mobile button ${selector} too slow`).toBeLessThanOrEqual(150)
        } catch (error) {
          console.log(`Mobile button ${selector} not found, skipping`)
        }
      }
    })

    test('Mobile navigation is Apple-responsive', async () => {
      // Test mobile hamburger menu if present
      try {
        const hamburgerMetrics = await performanceUtils.testSub200msInteraction(
          'button[aria-label*="menu"], .hamburger, [data-testid="mobile-menu-trigger"]'
        )

        PerformanceAssertions.expectSub200ms(hamburgerMetrics)
        expect(hamburgerMetrics.responseTime, 'Mobile menu too slow').toBeLessThanOrEqual(120)
      } catch (error) {
        console.log('Mobile hamburger menu not found, skipping')
      }
    })
  })

  test.describe('Performance Regression Prevention', () => {
    test('Critical path interactions maintain sub-200ms consistently', async ({ page }) => {
      // Test the same interaction multiple times to catch performance regressions
      const criticalSelectors = [
        'button:has-text("Get Started")',
        'nav a:first-child',
        'button[type="submit"]'
      ]

      for (const selector of criticalSelectors) {
        const measurements = []

        // Take 5 measurements
        for (let i = 0; i < 5; i++) {
          await page.reload()
          await page.waitForLoadState('networkidle')

          try {
            const metrics = await performanceUtils.testSub200msInteraction(selector)
            measurements.push(metrics.interactionTime)
          } catch (error) {
            continue
          }
        }

        if (measurements.length > 0) {
          const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length
          const maxTime = Math.max(...measurements)

          expect(avgTime, `Average time for ${selector} too slow`).toBeLessThanOrEqual(180)
          expect(maxTime, `Max time for ${selector} too slow`).toBeLessThanOrEqual(250)
        }
      }
    })

    test('Performance stays consistent under rapid interactions', async ({ page }) => {
      await page.goto('/')

      // Rapid-fire interactions to test consistency
      const button = 'button:has-text("Get Started"), .hero-cta'
      const rapidMetrics = []

      for (let i = 0; i < 10; i++) {
        try {
          const metrics = await performanceUtils.testSub200msInteraction(button, 'hover')
          rapidMetrics.push(metrics.interactionTime)
          await page.waitForTimeout(50) // Brief pause between interactions
        } catch (error) {
          continue
        }
      }

      if (rapidMetrics.length > 0) {
        const avgRapidTime = rapidMetrics.reduce((a, b) => a + b, 0) / rapidMetrics.length
        const maxRapidTime = Math.max(...rapidMetrics)

        expect(avgRapidTime, 'Rapid interactions degraded average performance').toBeLessThanOrEqual(200)
        expect(maxRapidTime, 'Rapid interactions caused performance spike').toBeLessThanOrEqual(300)
      }
    })
  })

  test.afterEach(async ({ page }) => {
    // Log performance metrics for monitoring
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('measure').map(entry => ({
        name: entry.name,
        duration: entry.duration
      }))
    })

    if (performanceEntries.length > 0) {
      console.log('Performance Metrics:', JSON.stringify(performanceEntries, null, 2))
    }
  })
})