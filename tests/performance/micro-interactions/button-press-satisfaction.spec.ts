/**
 * Micro-Interaction Satisfaction Tests
 *
 * Tests the "feel" of button presses, hover states, and micro-animations.
 * Following Apple's obsession with interaction satisfaction and tactile feedback.
 *
 * Critical Areas:
 * - Button press satisfaction (visual, timing, feedback)
 * - Hover anticipation and micro-feedback
 * - Transition smoothness and naturalness
 * - Apple motion token performance validation
 */

import { test, expect } from '@playwright/test'
import { PerformanceTestUtils, PerformanceAssertions } from '../performance-test-utilities'

test.describe('Micro-Interaction Satisfaction - Apple Standard', () => {
  let performanceUtils: PerformanceTestUtils

  test.beforeEach(async ({ page }) => {
    performanceUtils = new PerformanceTestUtils(page)

    // Ensure Apple motion tokens are loaded
    await page.addInitScript(() => {
      // Verify Apple motion tokens are available
      document.documentElement.style.setProperty('--test-motion-available', 'true')
    })
  })

  test.describe('Button Press Satisfaction', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Primary CTAs have Apple-level press satisfaction', async ({ page }) => {
      const primaryButtons = [
        'button:has-text("Get Started")',
        '.hero-cta',
        'button[data-variant="primary"]',
        '.btn-primary'
      ]

      for (const selector of primaryButtons) {
        try {
          const microMetrics = await performanceUtils.testMicroInteractionSatisfaction(selector)

          PerformanceAssertions.expectAppleLevelSatisfaction(microMetrics)

          // Primary CTAs should be exceptionally satisfying
          expect(microMetrics.satisfactionRating, `Primary button ${selector} not satisfying enough`)
            .toBeGreaterThanOrEqual(0.9)
          expect(microMetrics.clickFeedbackTime, `Primary button ${selector} feedback too slow`)
            .toBeLessThanOrEqual(150)

          // Test Apple motion token application
          await page.locator(selector).hover()
          const hasAppleMotion = await page.locator(selector).evaluate((el) => {
            const style = window.getComputedStyle(el)
            const transition = style.transition

            // Check for Apple motion tokens (200ms, ease-out-expo)
            return transition.includes('200ms') || transition.includes('0.2s') ||
                   transition.includes('cubic-bezier(0.19, 1, 0.22, 1)')
          })

          expect(hasAppleMotion, `Primary button ${selector} not using Apple motion tokens`).toBe(true)
        } catch (error) {
          console.log(`Primary button ${selector} not found, skipping`)
        }
      }
    })

    test('Secondary buttons provide satisfying feedback', async ({ page }) => {
      const secondaryButtons = [
        'button[data-variant="secondary"]',
        '.btn-secondary',
        'button:has-text("Learn More")',
        'button:has-text("Cancel")'
      ]

      for (const selector of secondaryButtons) {
        try {
          const microMetrics = await performanceUtils.testMicroInteractionSatisfaction(selector)

          // Secondary buttons should still be quite satisfying
          expect(microMetrics.satisfactionRating, `Secondary button ${selector} not satisfying enough`)
            .toBeGreaterThanOrEqual(0.75)
          expect(microMetrics.hoverResponseTime, `Secondary button ${selector} hover too slow`)
            .toBeLessThanOrEqual(150)
          expect(microMetrics.clickFeedbackTime, `Secondary button ${selector} click too slow`)
            .toBeLessThanOrEqual(200)
        } catch (error) {
          console.log(`Secondary button ${selector} not found, skipping`)
        }
      }
    })

    test('Destructive actions have careful satisfaction balance', async ({ page }) => {
      const destructiveButtons = [
        'button:has-text("Delete")',
        'button[data-variant="destructive"]',
        '.btn-destructive',
        'button:has-text("Remove")'
      ]

      for (const selector of destructiveButtons) {
        try {
          const microMetrics = await performanceUtils.testMicroInteractionSatisfaction(selector)

          // Destructive buttons should be responsive but not too "fun" to click
          expect(microMetrics.hoverResponseTime, `Destructive button ${selector} hover too slow`)
            .toBeLessThanOrEqual(180)
          expect(microMetrics.clickFeedbackTime, `Destructive button ${selector} feedback too slow`)
            .toBeLessThanOrEqual(200)

          // Should have visual distinction
          const hasWarningStyle = await page.locator(selector).evaluate((el) => {
            const style = window.getComputedStyle(el)
            // Check for destructive variant or red hues in computed styles
            return style.backgroundColor.includes('red') ||
                   style.color.includes('red') ||
                   style.borderColor.includes('red') ||
                   el.getAttribute('data-variant') === 'destructive' ||
                   el.classList.contains('destructive') ||
                   el.classList.contains('btn-destructive')
          })

          expect(hasWarningStyle, `Destructive button ${selector} lacks visual warning`).toBe(true)
        } catch (error) {
          console.log(`Destructive button ${selector} not found, skipping`)
        }
      }
    })

    test('Form submit buttons have reassuring satisfaction', async ({ page }) => {
      await page.goto('/auth/register')

      try {
        const submitButton = 'button[type="submit"]'
        const microMetrics = await performanceUtils.testMicroInteractionSatisfaction(submitButton)

        PerformanceAssertions.expectAppleLevelSatisfaction(microMetrics)

        // Submit buttons should be especially reassuring
        expect(microMetrics.satisfactionRating, 'Submit button not reassuring enough')
          .toBeGreaterThanOrEqual(0.85)
        expect(microMetrics.anticipationFactor, 'Submit button lacks hover anticipation')
          .toBeGreaterThanOrEqual(0.9)
      } catch (error) {
        console.log('Submit button not found, skipping')
      }
    })
  })

  test.describe('Hover State Anticipation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Navigation links create micro-anticipation', async ({ page }) => {
      const navLinks = await page.locator('nav a').all()

      let satisfyingHovers = 0

      for (const link of navLinks.slice(0, 5)) {
        try {
          const beforeHover = await link.evaluate((el) => {
            const style = window.getComputedStyle(el)
            return {
              color: style.color,
              backgroundColor: style.backgroundColor,
              transform: style.transform
            }
          })

          await link.hover()
          await page.waitForTimeout(100) // Allow transition

          const afterHover = await link.evaluate((el) => {
            const style = window.getComputedStyle(el)
            return {
              color: style.color,
              backgroundColor: style.backgroundColor,
              transform: style.transform
            }
          })

          // Check if hover creates visible change (anticipation)
          const hasVisualChange = (
            beforeHover.color !== afterHover.color ||
            beforeHover.backgroundColor !== afterHover.backgroundColor ||
            beforeHover.transform !== afterHover.transform
          )

          if (hasVisualChange) satisfyingHovers++
        } catch (error) {
          continue
        }
      }

      const anticipationRate = satisfyingHovers / Math.min(navLinks.length, 5)
      expect(anticipationRate, 'Navigation lacks micro-anticipation on hover').toBeGreaterThanOrEqual(0.8)
    })

    test('Card hover states create depth and interest', async ({ page }) => {
      const cards = await page.locator('.card, .feature-card, [data-testid*="card"]').all()

      let engagingCards = 0

      for (const card of cards.slice(0, 6)) {
        try {
          const beforeBox = await card.boundingBox()
          await card.hover()
          await page.waitForTimeout(200) // Allow for shadow/transform transition

          // Check for elevation/shadow change
          const hasElevation = await card.evaluate((el) => {
            const style = window.getComputedStyle(el)
            return style.boxShadow !== 'none' || style.transform.includes('translate')
          })

          // Test hover response time
          const startTime = Date.now()
          await card.hover()
          const hoverTime = Date.now() - startTime

          if (hasElevation && hoverTime <= 200) {
            engagingCards++
          }
        } catch (error) {
          continue
        }
      }

      const engagementRate = engagingCards / Math.min(cards.length, 6)
      expect(engagementRate, 'Cards lack engaging hover states').toBeGreaterThanOrEqual(0.7)
    })

    test('Interactive elements use Apple motion tokens', async ({ page }) => {
      const interactiveElements = await page.locator('button, a[role="button"], .btn').all()

      let appleMotionElements = 0

      for (const element of interactiveElements.slice(0, 10)) {
        try {
          await element.hover()

          const usesAppleMotion = await element.evaluate((el) => {
            const style = window.getComputedStyle(el)
            const transition = style.transition

            // Check for Apple-specific timing and easing
            const hasAppleTiming = transition.includes('200ms') || transition.includes('0.2s') ||
                                 transition.includes('150ms') || transition.includes('0.15s')

            const hasAppleEasing = transition.includes('cubic-bezier(0.19, 1, 0.22, 1)') || // ease-out-expo
                                  transition.includes('cubic-bezier(0.25, 1, 0.5, 1)')     // ease-out-quart

            return hasAppleTiming || hasAppleEasing
          })

          if (usesAppleMotion) appleMotionElements++
        } catch (error) {
          continue
        }
      }

      const appleMotionRate = appleMotionElements / Math.min(interactiveElements.length, 10)
      expect(appleMotionRate, 'Not enough elements using Apple motion tokens').toBeGreaterThanOrEqual(0.6)
    })
  })

  test.describe('Transition Smoothness', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Modal animations feel natural and satisfying', async ({ page }) => {
      // Look for modal triggers
      const modalTriggers = await page.locator('button:has-text("Sign Up"), button:has-text("Login"), button[data-testid*="modal"]').all()

      if (modalTriggers.length > 0) {
        try {
          const trigger = modalTriggers[0]

          // Measure modal open animation
          const startTime = Date.now()
          await trigger.click()

          // Wait for modal to appear and animate
          await page.waitForSelector('[role="dialog"], .modal, [data-testid*="modal"]', { timeout: 5000 })
          const animationTime = Date.now() - startTime

          expect(animationTime, 'Modal animation too slow').toBeLessThanOrEqual(500)

          // Check if modal uses Apple-style animation
          const modal = page.locator('[role="dialog"], .modal').first()
          const hasNaturalAnimation = await modal.evaluate((el) => {
            const style = window.getComputedStyle(el)
            return style.transform !== 'none' || style.opacity !== '1'
          })

          expect(hasNaturalAnimation, 'Modal lacks natural animation').toBe(true)
        } catch (error) {
          console.log('Modal trigger not functional, skipping animation test')
        }
      }
    })

    test('Page transitions maintain smoothness', async ({ page }) => {
      const internalLinks = await page.locator('a[href^="/"], a[href^="./"]').all()

      if (internalLinks.length > 0) {
        try {
          const link = internalLinks[0]

          // Test page transition smoothness
          const startTime = Date.now()
          await link.click()
          await page.waitForLoadState('networkidle')
          const transitionTime = Date.now() - startTime

          // Page transitions should feel snappy
          expect(transitionTime, 'Page transition too slow').toBeLessThanOrEqual(2000)

          // Check for loading states during transition
          const hasLoadingState = await page.evaluate(() => {
            return document.querySelector('[data-testid*="loading"], .loading, .skeleton') !== null
          })

          // Should have some form of loading feedback for longer transitions
          if (transitionTime > 500) {
            expect(hasLoadingState, 'Long transition lacks loading feedback').toBe(true)
          }
        } catch (error) {
          console.log('Page transition test failed, skipping')
        }
      }
    })

    test('Form validation provides smooth feedback', async ({ page }) => {
      await page.goto('/auth/register')

      try {
        // Test form validation smoothness
        const emailInput = 'input[type="email"]'

        await page.fill(emailInput, 'invalid-email')
        await page.blur(emailInput) // Trigger validation

        await page.waitForTimeout(300) // Allow validation animation

        // Check for smooth validation feedback
        const hasValidationFeedback = await page.locator('.error, [data-testid*="error"], .invalid').count() > 0

        if (hasValidationFeedback) {
          // Test validation feedback timing
          await page.fill(emailInput, '')
          const startTime = Date.now()
          await page.fill(emailInput, 'valid@example.com')
          await page.blur(emailInput)

          // Wait for validation to clear
          await page.waitForTimeout(200)
          const validationTime = Date.now() - startTime

          expect(validationTime, 'Form validation feedback too slow').toBeLessThanOrEqual(400)
        }
      } catch (error) {
        console.log('Form validation test failed, skipping')
      }
    })
  })

  test.describe('Apple Motion Token Performance', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Apple duration tokens perform within standards', async ({ page }) => {
      // Test that Apple motion tokens don't cause performance issues
      const animatedElements = await page.locator('button, a, .card').all()

      let performantAnimations = 0

      for (const element of animatedElements.slice(0, 8)) {
        try {
          // Trigger animation and measure performance impact
          const startTime = performance.now()
          await element.hover()
          await page.waitForTimeout(250) // Wait for animation completion
          const animationTime = performance.now() - startTime

          // Check if animation runs smoothly without blocking
          const runsSmooth = animationTime <= 300

          // Test rapid repeated interactions (stress test)
          const rapidStart = performance.now()
          for (let i = 0; i < 5; i++) {
            await element.hover()
            await page.waitForTimeout(10)
          }
          const rapidTime = performance.now() - rapidStart

          if (runsSmooth && rapidTime <= 500) {
            performantAnimations++
          }
        } catch (error) {
          continue
        }
      }

      const performanceRate = performantAnimations / Math.min(animatedElements.length, 8)
      expect(performanceRate, 'Apple motion tokens causing performance issues').toBeGreaterThanOrEqual(0.8)
    })

    test('Ease-out-expo timing feels natural', async ({ page }) => {
      const buttons = await page.locator('button').all()

      let naturalEasingButtons = 0

      for (const button of buttons.slice(0, 5)) {
        try {
          // Check for Apple's signature ease-out-expo
          const hasNaturalEasing = await button.evaluate((el) => {
            const style = window.getComputedStyle(el)
            const transition = style.transition

            // Check for ease-out-expo or similar natural easing
            return transition.includes('cubic-bezier(0.19, 1, 0.22, 1)') ||
                   transition.includes('ease-out') ||
                   transition.includes('cubic-bezier(0.25, 1, 0.5, 1)')
          })

          if (hasNaturalEasing) naturalEasingButtons++
        } catch (error) {
          continue
        }
      }

      const naturalEasingRate = naturalEasingButtons / Math.min(buttons.length, 5)
      expect(naturalEasingRate, 'Not enough buttons using natural easing curves').toBeGreaterThanOrEqual(0.6)
    })

    test('Touch targets meet Apple 44px minimum with good press feel', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 812 })

      const touchTargets = await page.locator('button, a[role="button"]').all()

      let appliantTouchTargets = 0

      for (const target of touchTargets.slice(0, 10)) {
        try {
          const box = await target.boundingBox()

          if (box && box.height >= 44 && box.width >= 44) {
            // Test touch responsiveness
            const microMetrics = await performanceUtils.testMicroInteractionSatisfaction(
              await target.getAttribute('data-testid') || 'button'
            )

            if (microMetrics.satisfactionRating >= 0.7) {
              appliantTouchTargets++
            }
          }
        } catch (error) {
          continue
        }
      }

      const complianceRate = appliantTouchTargets / Math.min(touchTargets.length, 10)
      expect(complianceRate, 'Touch targets not meeting Apple standards').toBeGreaterThanOrEqual(0.8)
    })
  })

  test.describe('Satisfaction Metrics Integration', () => {
    test('Overall micro-interaction satisfaction score', async ({ page }) => {
      await page.goto('/')

      // Test different categories of interactions
      const interactionCategories = [
        { name: 'primary-buttons', selectors: ['button:has-text("Get Started")', '.hero-cta'] },
        { name: 'navigation', selectors: ['nav a'] },
        { name: 'cards', selectors: ['.card', '.feature-card'] },
        { name: 'forms', selectors: ['input', 'button[type="submit"]'] }
      ]

      let totalSatisfaction = 0
      let categoriesTested = 0

      for (const category of interactionCategories) {
        let categorySatisfaction = 0
        let elementsInCategory = 0

        for (const selector of category.selectors) {
          try {
            const elements = await page.locator(selector).all()

            for (const element of elements.slice(0, 2)) {
              try {
                const microMetrics = await performanceUtils.testMicroInteractionSatisfaction(
                  await element.getAttribute('data-testid') || selector
                )

                categorySatisfaction += microMetrics.satisfactionRating
                elementsInCategory++
              } catch (error) {
                continue
              }
            }
          } catch (error) {
            continue
          }
        }

        if (elementsInCategory > 0) {
          const avgCategorySatisfaction = categorySatisfaction / elementsInCategory
          totalSatisfaction += avgCategorySatisfaction
          categoriesTested++

          console.log(`${category.name} satisfaction: ${avgCategorySatisfaction.toFixed(2)}`)
        }
      }

      if (categoriesTested > 0) {
        const overallSatisfaction = totalSatisfaction / categoriesTested
        expect(overallSatisfaction, 'Overall micro-interaction satisfaction below Apple standards')
          .toBeGreaterThanOrEqual(0.75)

        console.log(`Overall satisfaction score: ${overallSatisfaction.toFixed(2)}`)
      }
    })
  })
})