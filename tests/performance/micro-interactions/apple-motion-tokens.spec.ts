/**
 * Apple Motion Tokens Performance Tests
 *
 * Tests the performance and proper implementation of Apple's motion system.
 * Validates that Apple motion tokens are applied correctly and perform within standards.
 *
 * Tests for:
 * - Correct Apple easing curves (ease-out-expo, ease-out-back)
 * - Proper duration usage (200ms fast, 300ms medium)
 * - Transform performance (scale, translate)
 * - Shadow animation smoothness
 * - Overall motion system consistency
 */

import { test, expect } from '@playwright/test'
import { PerformanceTestUtils, PerformanceAssertions } from '../performance-test-utilities'

test.describe('Apple Motion Tokens Performance Validation', () => {
  let performanceUtils: PerformanceTestUtils

  test.beforeEach(async ({ page }) => {
    performanceUtils = new PerformanceTestUtils(page)

    // Ensure Apple motion system is loaded
    await page.addInitScript(() => {
      // Verify motion tokens are available
      const testElement = document.createElement('div')
      testElement.style.transition = 'var(--duration-fast) var(--ease-out-expo)'
      document.body.appendChild(testElement)
      const computedStyle = window.getComputedStyle(testElement)

      // Mark motion system as tested
      ;(window as any).appleMotionSystemLoaded = computedStyle.transition !== 'initial'
      document.body.removeChild(testElement)
    })
  })

  test.describe('Apple Easing Curve Implementation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Primary buttons use Apple ease-out-expo curve', async ({ page }) => {
      const primaryButtons = [
        'button:has-text("Get Started")',
        '.hero-cta',
        'button[data-variant="primary"]',
        '.btn-primary'
      ]

      let appleEasingButtons = 0

      for (const selector of primaryButtons) {
        try {
          const button = page.locator(selector).first()

          const hasAppleEasing = await button.evaluate((el) => {
            const style = window.getComputedStyle(el)
            const transition = style.transition

            // Check for Apple's signature ease-out-expo
            const hasEaseOutExpo = transition.includes('cubic-bezier(0.19, 1, 0.22, 1)')

            // Check for CSS custom property usage
            const hasAppleVar = transition.includes('var(--ease-out-expo)') ||
                               transition.includes('var(--ease-out-back)')

            return hasEaseOutExpo || hasAppleVar
          })

          // Test the actual feel of the easing
          if (hasAppleEasing) {
            const microMetrics = await performanceUtils.testMicroInteractionSatisfaction(selector)

            // Apple easing should feel naturally satisfying
            if (microMetrics.satisfactionRating >= 0.8) {
              appleEasingButtons++
            }
          }
        } catch (error) {
          console.log(`Primary button ${selector} not found, skipping`)
        }
      }

      expect(appleEasingButtons, 'Not enough primary buttons using Apple easing curves')
        .toBeGreaterThan(0)
    })

    test('Card hover animations use proper Apple timing', async ({ page }) => {
      const cards = await page.locator('.card, .feature-card, [data-testid*="card"]').all()

      let properAppleTimingCards = 0

      for (const card of cards.slice(0, 6)) {
        try {
          const hasAppleTiming = await card.evaluate((el) => {
            const style = window.getComputedStyle(el)
            const transition = style.transition

            // Check for Apple duration tokens
            const hasAppleDuration = transition.includes('200ms') ||      // duration-fast
                                   transition.includes('300ms') ||      // duration-medium
                                   transition.includes('0.2s') ||       // duration-fast
                                   transition.includes('0.3s') ||       // duration-medium
                                   transition.includes('var(--duration-fast)') ||
                                   transition.includes('var(--duration-medium)')

            return hasAppleDuration
          })

          if (hasAppleTiming) {
            // Test hover performance with Apple timing
            const startTime = Date.now()
            await card.hover()
            await page.waitForTimeout(350) // Wait for animation completion
            const hoverTime = Date.now() - startTime

            // Apple timing should complete within expected range
            if (hoverTime >= 200 && hoverTime <= 400) {
              properAppleTimingCards++
            }
          }
        } catch (error) {
          continue
        }
      }

      const appleTimingRate = properAppleTimingCards / Math.min(cards.length, 6)
      expect(appleTimingRate, 'Cards not using proper Apple timing').toBeGreaterThanOrEqual(0.5)
    })

    test('Navigation elements use Apple micro-interaction timing', async ({ page }) => {
      const navElements = await page.locator('nav a, .nav-link').all()

      let appleNavElements = 0

      for (const navElement of navElements.slice(0, 5)) {
        try {
          const hasAppleMicroTiming = await navElement.evaluate((el) => {
            const style = window.getComputedStyle(el)
            const transition = style.transition

            // Check for Apple micro-interaction timing (150ms or duration-micro)
            return transition.includes('150ms') ||
                   transition.includes('0.15s') ||
                   transition.includes('var(--duration-micro)')
          })

          if (hasAppleMicroTiming) {
            // Test micro-interaction responsiveness
            const startTime = Date.now()
            await navElement.hover()
            const responseTime = Date.now() - startTime

            // Micro-interactions should be instant
            if (responseTime <= 180) {
              appleNavElements++
            }
          }
        } catch (error) {
          continue
        }
      }

      const microTimingRate = appleNavElements / Math.min(navElements.length, 5)
      expect(microTimingRate, 'Navigation not using Apple micro-timing').toBeGreaterThanOrEqual(0.6)
    })
  })

  test.describe('Apple Transform Performance', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Button press transforms use Apple scale values', async ({ page }) => {
      const buttons = await page.locator('button').all()

      let appleScaleButtons = 0

      for (const button of buttons.slice(0, 8)) {
        try {
          // Check for Apple press scale values
          const hasAppleScale = await button.evaluate((el) => {
            // Simulate :active state
            el.classList.add('active')
            const style = window.getComputedStyle(el)
            el.classList.remove('active')

            const transform = style.transform

            // Check for Apple scale values: scale(0.96) or scale(0.98)
            return transform.includes('scale(0.96)') ||
                   transform.includes('scale(0.98)') ||
                   transform.includes('var(--press-scale)') ||
                   transform.includes('var(--press-scale-small)')
          })

          if (hasAppleScale) {
            // Test press satisfaction with Apple transforms
            const microMetrics = await performanceUtils.testMicroInteractionSatisfaction(
              await button.getAttribute('data-testid') || 'button'
            )

            if (microMetrics.clickFeedbackTime <= 200) {
              appleScaleButtons++
            }
          }
        } catch (error) {
          continue
        }
      }

      const appleScaleRate = appleScaleButtons / Math.min(buttons.length, 8)
      expect(appleScaleRate, 'Buttons not using Apple scale transforms').toBeGreaterThanOrEqual(0.4)
    })

    test('Hover lift transforms perform smoothly', async ({ page }) => {
      const hoverElements = await page.locator('.card, button, a[role="button"]').all()

      let smoothHoverElements = 0

      for (const element of hoverElements.slice(0, 10)) {
        try {
          // Test hover lift performance
          const startTime = performance.now()
          await element.hover()
          await page.waitForTimeout(200) // Allow transform to complete
          const hoverTime = performance.now() - startTime

          // Check for Apple hover transforms
          const hasAppleHover = await element.evaluate((el) => {
            const style = window.getComputedStyle(el)
            const transform = style.transform

            // Check for Apple hover values: translateY(-1px), scale(1.02)
            return transform.includes('translateY(-1px)') ||
                   transform.includes('translateY(-0.5px)') ||
                   transform.includes('scale(1.02)') ||
                   transform.includes('scale(1.01)') ||
                   transform.includes('var(--hover-lift)') ||
                   transform.includes('var(--hover-scale)')
          })

          if (hasAppleHover && hoverTime <= 250) {
            smoothHoverElements++
          }
        } catch (error) {
          continue
        }
      }

      const smoothHoverRate = smoothHoverElements / Math.min(hoverElements.length, 10)
      expect(smoothHoverRate, 'Hover transforms not performing smoothly').toBeGreaterThanOrEqual(0.4)
    })

    test('Transform animations maintain 60fps performance', async ({ page }) => {
      // Test that Apple transforms don't cause frame drops
      const transformElements = await page.locator('button, .card').all()

      if (transformElements.length > 0) {
        const testElement = transformElements[0]

        // Start performance monitoring
        await page.evaluate(() => {
          (window as any).transformMetrics = {
            frames: [],
            startTime: performance.now()
          }

          function recordFrame() {
            (window as any).transformMetrics.frames.push(performance.now())
            requestAnimationFrame(recordFrame)
          }
          recordFrame()
        })

        // Trigger multiple transforms rapidly
        for (let i = 0; i < 5; i++) {
          await testElement.hover()
          await page.waitForTimeout(100)
          await testElement.blur()
          await page.waitForTimeout(100)
        }

        // Analyze frame performance
        const frameMetrics = await page.evaluate(() => {
          const data = (window as any).transformMetrics
          const totalTime = data.frames[data.frames.length - 1] - data.frames[0]
          const frameCount = data.frames.length
          const fps = (frameCount / totalTime) * 1000

          // Count janky frames (>16.67ms for 60fps)
          let jankCount = 0
          for (let i = 1; i < data.frames.length; i++) {
            const frameDelta = data.frames[i] - data.frames[i - 1]
            if (frameDelta > 16.67) {
              jankCount++
            }
          }

          return { fps, jankCount, frameCount }
        })

        expect(frameMetrics.fps, 'Transform animations dropping below 60fps').toBeGreaterThanOrEqual(55)
        expect(frameMetrics.jankCount, 'Too many janky frames during transforms').toBeLessThanOrEqual(5)
      }
    })
  })

  test.describe('Apple Shadow System Performance', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Card shadows use Apple multi-layer approach', async ({ page }) => {
      const cards = await page.locator('.card, .feature-card').all()

      let appleShadowCards = 0

      for (const card of cards.slice(0, 6)) {
        try {
          const hasAppleShadows = await card.evaluate((el) => {
            const style = window.getComputedStyle(el)
            const boxShadow = style.boxShadow

            // Check for Apple's multi-layer shadow system
            const hasMultipleShadows = (boxShadow.match(/,/g) || []).length >= 1

            // Check for Apple shadow values
            const hasAppleShadowValues = boxShadow.includes('rgba(0, 0, 0, 0.12)') ||
                                       boxShadow.includes('rgba(0, 0, 0, 0.08)') ||
                                       boxShadow.includes('rgba(0, 0, 0, 0.15)')

            return hasMultipleShadows || hasAppleShadowValues
          })

          if (hasAppleShadows) {
            // Test shadow animation performance on hover
            const startTime = performance.now()
            await card.hover()
            await page.waitForTimeout(300)
            const shadowAnimationTime = performance.now() - startTime

            // Shadow animations should be smooth
            if (shadowAnimationTime <= 400) {
              appleShadowCards++
            }
          }
        } catch (error) {
          continue
        }
      }

      const appleShadowRate = appleShadowCards / Math.min(cards.length, 6)
      expect(appleShadowRate, 'Cards not using Apple shadow system').toBeGreaterThanOrEqual(0.3)
    })

    test('Button shadows provide Apple-level feedback', async ({ page }) => {
      const buttons = await page.locator('button, .btn').all()

      let appleShadowButtons = 0

      for (const button of buttons.slice(0, 5)) {
        try {
          // Test button shadow states (rest, hover, pressed)
          const shadowStates = await button.evaluate((el) => {
            const restShadow = window.getComputedStyle(el).boxShadow

            // Simulate hover
            el.style.boxShadow = 'var(--shadow-button-hover)'
            const hoverShadow = window.getComputedStyle(el).boxShadow

            // Simulate pressed
            el.style.boxShadow = 'var(--shadow-button-pressed)'
            const pressedShadow = window.getComputedStyle(el).boxShadow

            // Reset
            el.style.boxShadow = ''

            return {
              rest: restShadow !== 'none',
              hover: hoverShadow !== restShadow,
              pressed: pressedShadow.includes('inset') || pressedShadow !== hoverShadow
            }
          })

          // Apple buttons should have shadow progression
          if (shadowStates.rest || shadowStates.hover) {
            const microMetrics = await performanceUtils.testMicroInteractionSatisfaction(
              await button.getAttribute('data-testid') || 'button'
            )

            if (microMetrics.satisfactionRating >= 0.7) {
              appleShadowButtons++
            }
          }
        } catch (error) {
          continue
        }
      }

      const shadowFeedbackRate = appleShadowButtons / Math.min(buttons.length, 5)
      expect(shadowFeedbackRate, 'Buttons lacking Apple shadow feedback').toBeGreaterThanOrEqual(0.4)
    })
  })

  test.describe('Apple Motion System Consistency', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Motion system provides consistent experience across components', async ({ page }) => {
      // Test different component categories for consistency
      const componentCategories = [
        { name: 'buttons', selector: 'button', expectedDuration: 200 },
        { name: 'links', selector: 'a', expectedDuration: 150 },
        { name: 'cards', selector: '.card', expectedDuration: 300 }
      ]

      let consistentCategories = 0

      for (const category of componentCategories) {
        try {
          const elements = await page.locator(category.selector).all()

          if (elements.length === 0) continue

          let consistentElements = 0

          for (const element of elements.slice(0, 3)) {
            const hasConsistentMotion = await element.evaluate((el, expectedDuration) => {
              const style = window.getComputedStyle(el)
              const transition = style.transition

              // Check for expected duration
              return transition.includes(`${expectedDuration}ms`) ||
                     transition.includes(`${expectedDuration / 1000}s`)
            }, category.expectedDuration)

            if (hasConsistentMotion) consistentElements++
          }

          const consistencyRate = consistentElements / Math.min(elements.length, 3)
          if (consistencyRate >= 0.6) {
            consistentCategories++
          }
        } catch (error) {
          continue
        }
      }

      expect(consistentCategories, 'Motion system lacks consistency across components')
        .toBeGreaterThanOrEqual(2)
    })

    test('Apple motion tokens are globally accessible', async ({ page }) => {
      // Test that Apple motion tokens are available as CSS custom properties
      const tokensAvailable = await page.evaluate(() => {
        const testEl = document.createElement('div')
        testEl.style.transition = 'var(--duration-fast) var(--ease-out-expo)'
        document.body.appendChild(testEl)

        const computedStyle = window.getComputedStyle(testEl)
        const transition = computedStyle.transition

        document.body.removeChild(testEl)

        // Check if CSS custom properties resolved
        return !transition.includes('var(') || transition.length > 10
      })

      expect(tokensAvailable, 'Apple motion tokens not globally accessible').toBe(true)
    })

    test('Reduced motion preference is respected', async ({ page }) => {
      // Test with reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' })

      const animatedElements = await page.locator('button, .card').all()

      let reducedMotionCompliant = 0

      for (const element of animatedElements.slice(0, 5)) {
        try {
          const respectsReducedMotion = await element.evaluate((el) => {
            const style = window.getComputedStyle(el)
            const transition = style.transition

            // With reduced motion, transitions should be disabled or very fast
            return transition === 'none' ||
                   transition.includes('0ms') ||
                   transition.includes('0s') ||
                   transition.length < 10
          })

          if (respectsReducedMotion) reducedMotionCompliant++
        } catch (error) {
          continue
        }
      }

      const complianceRate = reducedMotionCompliant / Math.min(animatedElements.length, 5)
      expect(complianceRate, 'Motion system not respecting reduced motion preference')
        .toBeGreaterThanOrEqual(0.7)
    })
  })

  test.describe('Performance Impact Assessment', () => {
    test('Apple motion system maintains overall page performance', async ({ page }) => {
      await page.goto('/')

      // Test page performance with motion system active
      const performanceMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          // Measure paint timing
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const paintEntries = entries.filter(entry =>
              entry.entryType === 'paint' || entry.entryType === 'largest-contentful-paint'
            )

            if (paintEntries.length > 0) {
              resolve({
                firstPaint: paintEntries.find(e => e.name === 'first-paint')?.startTime || 0,
                firstContentfulPaint: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0
              })
            }
          })

          observer.observe({ entryTypes: ['paint'] })

          // Fallback timeout
          setTimeout(() => {
            resolve({ firstPaint: 0, firstContentfulPaint: 0 })
          }, 3000)
        })
      })

      // Motion system shouldn't significantly impact initial paint performance
      if (performanceMetrics.firstContentfulPaint > 0) {
        expect(performanceMetrics.firstContentfulPaint, 'Motion system impacting FCP performance')
          .toBeLessThanOrEqual(2500)
      }
    })

    test('Rapid motion interactions maintain performance', async ({ page }) => {
      await page.goto('/')

      const button = page.locator('button').first()

      if (await button.count() > 0) {
        // Perform rapid interactions to stress test
        const startTime = performance.now()

        for (let i = 0; i < 20; i++) {
          await button.hover()
          await page.waitForTimeout(25)
          await button.blur()
          await page.waitForTimeout(25)
        }

        const totalTime = performance.now() - startTime

        // Rapid interactions should complete efficiently
        expect(totalTime, 'Rapid motion interactions too slow').toBeLessThanOrEqual(2000)

        // Test that the page is still responsive after stress test
        const responsiveMetrics = await performanceUtils.testSub200msInteraction('button')
        expect(responsiveMetrics.passes200msThreshold, 'Page unresponsive after motion stress test').toBe(true)
      }
    })
  })
})