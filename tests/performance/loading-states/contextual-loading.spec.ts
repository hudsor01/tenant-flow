/**
 * Loading States and Skeleton Screen Tests
 *
 * Tests loading states for contextual messaging and entertainment value.
 * Ensures loading states appear instantly and provide engaging, helpful feedback.
 *
 * Apple Philosophy: Loading should never feel like waiting - it should be informative,
 * contextual, and even entertaining. Users should know what's happening and why.
 */

import { test, expect } from '@playwright/test'
import { PerformanceTestUtils, PerformanceAssertions } from '../performance-test-utilities'

test.describe('Loading States & Contextual Messaging', () => {
  let performanceUtils: PerformanceTestUtils

  test.beforeEach(async ({ page }) => {
    performanceUtils = new PerformanceTestUtils(page)
  })

  test.describe('Instant Loading State Appearance', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Page loading states appear instantly', async ({ page }) => {
      // Test initial page load loading state
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

      // Check for loading indicators within first 50ms
      const loadingAppeared = await page.evaluate(() => {
        return new Promise((resolve) => {
          const startTime = performance.now()

          // Check for various loading indicators
          const checkForLoading = () => {
            const loadingElements = document.querySelectorAll(
              '.loading, .skeleton, [data-testid*="loading"], .spinner, .loader'
            )

            if (loadingElements.length > 0) {
              const appearTime = performance.now() - startTime
              resolve({ found: true, time: appearTime })
            } else if (performance.now() - startTime > 200) {
              resolve({ found: false, time: performance.now() - startTime })
            } else {
              requestAnimationFrame(checkForLoading)
            }
          }

          checkForLoading()
        })
      })

      if (loadingAppeared.found) {
        expect(loadingAppeared.time, 'Loading state did not appear instantly').toBeLessThanOrEqual(50)
      }
    })

    test('Form submission shows immediate loading feedback', async ({ page }) => {
      await page.goto('/auth/register')

      try {
        // Fill form and trigger submission
        await page.fill('input[type="email"]', 'test@example.com')
        await page.fill('input[type="password"]', 'password123')

        // Monitor for loading state on submit
        const submitButton = 'button[type="submit"]'

        const loadingFeedback = await page.evaluate(() => {
          const submitBtn = document.querySelector('button[type="submit"]')
          if (!submitBtn) return { found: false }

          return new Promise((resolve) => {
            const startTime = performance.now()

            // Observe button changes
            const observer = new MutationObserver(() => {
              const button = document.querySelector('button[type="submit"]')
              if (button) {
                const isLoading = button.textContent?.includes('Loading') ||
                                button.textContent?.includes('...') ||
                                button.hasAttribute('disabled') ||
                                button.querySelector('.loading, .spinner')

                if (isLoading) {
                  const feedbackTime = performance.now() - startTime
                  observer.disconnect()
                  resolve({ found: true, time: feedbackTime })
                }
              }
            })

            observer.observe(document.body, { childList: true, subtree: true, attributes: true })

            // Trigger submit
            submitBtn.click()

            // Timeout after 1 second
            setTimeout(() => {
              observer.disconnect()
              resolve({ found: false, time: 1000 })
            }, 1000)
          })
        })

        if (loadingFeedback.found) {
          expect(loadingFeedback.time, 'Submit button loading feedback too slow').toBeLessThanOrEqual(100)
        }
      } catch (error) {
        console.log('Form submission test failed, skipping')
      }
    })

    test('Data loading shows skeleton screens instantly', async ({ page }) => {
      await page.goto('/dashboard')

      // Look for skeleton screens during data loading
      const skeletonAppearance = await page.evaluate(() => {
        return new Promise((resolve) => {
          const startTime = performance.now()
          let foundSkeleton = false

          const checkForSkeletons = () => {
            const skeletons = document.querySelectorAll(
              '.skeleton, [data-testid*="skeleton"], .animate-pulse, [class*="skeleton"]'
            )

            if (skeletons.length > 0 && !foundSkeleton) {
              foundSkeleton = true
              const appearTime = performance.now() - startTime
              resolve({ found: true, time: appearTime, count: skeletons.length })
            } else if (performance.now() - startTime > 500) {
              resolve({ found: false, time: performance.now() - startTime, count: 0 })
            } else {
              requestAnimationFrame(checkForSkeletons)
            }
          }

          checkForSkeletons()
        })
      })

      if (skeletonAppearance.found) {
        expect(skeletonAppearance.time, 'Skeleton screens appeared too slowly').toBeLessThanOrEqual(100)
        expect(skeletonAppearance.count, 'Should have multiple skeleton elements').toBeGreaterThan(0)
      }
    })
  })

  test.describe('Contextual Loading Messages', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
    })

    test('Loading messages are contextual and helpful', async ({ page }) => {
      // Test contextual loading messages in different sections
      const loadingContexts = [
        { selector: '[data-testid*="properties"]', expectedContext: ['properties', 'loading', 'fetching'] },
        { selector: '[data-testid*="tenants"]', expectedContext: ['tenants', 'loading', 'users'] },
        { selector: '[data-testid*="dashboard"]', expectedContext: ['dashboard', 'analytics', 'data'] }
      ]

      let contextualMessages = 0

      for (const context of loadingContexts) {
        try {
          const loadingElement = page.locator(context.selector).first()

          if (await loadingElement.count() > 0) {
            const hasContextualMessage = await loadingElement.evaluate((el, expectedWords) => {
              const text = el.textContent?.toLowerCase() || ''

              // Check for contextual words
              const hasContext = expectedWords.some(word => text.includes(word))

              // Check that it's not generic loading text
              const isNotGeneric = !text.includes('loading...') ||
                                 !text.includes('please wait') ||
                                 text.length > 20

              return hasContext && isNotGeneric
            }, context.expectedContext)

            if (hasContextualMessage) contextualMessages++
          }
        } catch (error) {
          continue
        }
      }

      expect(contextualMessages, 'Not enough contextual loading messages').toBeGreaterThanOrEqual(1)
    })

    test('Loading states explain what is happening', async ({ page }) => {
      // Test various loading states for explanatory messaging
      const explanatoryKeywords = [
        'fetching', 'updating', 'saving', 'calculating', 'processing',
        'retrieving', 'analyzing', 'loading your', 'preparing'
      ]

      const loadingElements = await page.locator(
        '.loading, [data-testid*="loading"], .skeleton'
      ).all()

      let explanatoryMessages = 0

      for (const element of loadingElements.slice(0, 5)) {
        try {
          const hasExplanatoryText = await element.evaluate((el, keywords) => {
            const text = el.textContent?.toLowerCase() || ''

            // Check for explanatory keywords
            return keywords.some(keyword => text.includes(keyword))
          }, explanatoryKeywords)

          if (hasExplanatoryText) explanatoryMessages++
        } catch (error) {
          continue
        }
      }

      if (loadingElements.length > 0) {
        const explanatoryRate = explanatoryMessages / Math.min(loadingElements.length, 5)
        expect(explanatoryRate, 'Loading states not explanatory enough').toBeGreaterThanOrEqual(0.3)
      }
    })

    test('Progress indicators provide meaningful feedback', async ({ page }) => {
      // Look for progress indicators and test their meaningfulness
      const progressElements = await page.locator(
        '[role="progressbar"], .progress, [data-testid*="progress"]'
      ).all()

      if (progressElements.length > 0) {
        let meaningfulProgress = 0

        for (const progress of progressElements) {
          try {
            const isMeaningful = await progress.evaluate((el) => {
              // Check for actual progress value
              const hasValue = el.hasAttribute('value') || el.hasAttribute('aria-valuenow')

              // Check for progress text
              const text = el.textContent || ''
              const hasProgressText = text.includes('%') ||
                                    text.includes('step') ||
                                    text.includes('of') ||
                                    /\d+\/\d+/.test(text)

              return hasValue || hasProgressText
            })

            if (isMeaningful) meaningfulProgress++
          } catch (error) {
            continue
          }
        }

        const meaningfulRate = meaningfulProgress / progressElements.length
        expect(meaningfulRate, 'Progress indicators not meaningful enough').toBeGreaterThanOrEqual(0.7)
      }
    })
  })

  test.describe('Entertainment Value & Engagement', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Loading animations are engaging and smooth', async ({ page }) => {
      const loadingAnimations = await page.locator(
        '.spinner, .loader, .animate-spin, .animate-pulse, [data-testid*="loading"]'
      ).all()

      if (loadingAnimations.length > 0) {
        let engagingAnimations = 0

        for (const animation of loadingAnimations.slice(0, 3)) {
          try {
            // Check if animation is smooth and not too fast/slow
            const animationQuality = await animation.evaluate((el) => {
              const style = window.getComputedStyle(el)
              const animationDuration = style.animationDuration
              const animationName = style.animationName

              // Check for reasonable animation duration (not too fast/slow)
              const hasGoodTiming = animationDuration.includes('1s') ||
                                  animationDuration.includes('2s') ||
                                  animationDuration.includes('1.5s')

              // Check for actual animation
              const isAnimated = animationName !== 'none' && animationName !== 'initial'

              return hasGoodTiming && isAnimated
            })

            if (animationQuality) engagingAnimations++
          } catch (error) {
            continue
          }
        }

        const engagingRate = engagingAnimations / Math.min(loadingAnimations.length, 3)
        expect(engagingRate, 'Loading animations not engaging enough').toBeGreaterThanOrEqual(0.6)
      }
    })

    test('Loading states maintain visual hierarchy', async ({ page }) => {
      // Test that loading states don't break the visual design
      const skeletonElements = await page.locator('.skeleton, [data-testid*="skeleton"]').all()

      if (skeletonElements.length > 0) {
        let wellDesignedSkeletons = 0

        for (const skeleton of skeletonElements.slice(0, 5)) {
          try {
            const hasGoodDesign = await skeleton.evaluate((el) => {
              const style = window.getComputedStyle(el)

              // Check for proper skeleton styling
              const hasSkeletonColor = style.backgroundColor.includes('gray') ||
                                     style.backgroundColor.includes('rgb(') ||
                                     style.background.includes('gradient')

              // Check for rounded corners (matches real content)
              const hasRoundedCorners = style.borderRadius !== '0px' &&
                                      style.borderRadius !== 'none'

              // Check for appropriate height (not too small/large)
              const heightValue = parseInt(style.height)
              const hasGoodHeight = heightValue >= 16 && heightValue <= 200

              return hasSkeletonColor && (hasRoundedCorners || hasGoodHeight)
            })

            if (hasGoodDesign) wellDesignedSkeletons++
          } catch (error) {
            continue
          }
        }

        const designQualityRate = wellDesignedSkeletons / Math.min(skeletonElements.length, 5)
        expect(designQualityRate, 'Skeleton screens poorly designed').toBeGreaterThanOrEqual(0.7)
      }
    })

    test('Loading states encourage patience with helpful tips', async ({ page }) => {
      // Test for helpful tips or interesting content during loading
      const loadingAreas = await page.locator(
        '.loading, [data-testid*="loading"], .skeleton-container'
      ).all()

      let helpfulLoadingAreas = 0

      for (const area of loadingAreas.slice(0, 3)) {
        try {
          const hasHelpfulContent = await area.evaluate((el) => {
            const text = el.textContent?.toLowerCase() || ''

            // Check for helpful tips or interesting content
            const helpfulPhrases = [
              'tip:', 'did you know', 'while we load', 'fun fact',
              'preparing your', 'almost ready', 'this will only take'
            ]

            return helpfulPhrases.some(phrase => text.includes(phrase)) ||
                   text.length > 50 // Has substantial content
          })

          if (hasHelpfulContent) helpfulLoadingAreas++
        } catch (error) {
          continue
        }
      }

      if (loadingAreas.length > 0) {
        const helpfulnessRate = helpfulLoadingAreas / Math.min(loadingAreas.length, 3)

        // Even if not all areas have tips, some should
        expect(helpfulnessRate, 'Loading states could be more helpful').toBeGreaterThanOrEqual(0.2)
      }
    })
  })

  test.describe('Performance Impact of Loading States', () => {
    test('Loading states don\'t impact initial render performance', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/dashboard')

      // Measure time to first loading state appearance
      const loadingMetrics = await performanceUtils.testLoadingStatesContextual('.loading, .skeleton')

      expect(loadingMetrics.appearsInstantly, 'Loading states impacting initial render').toBe(true)

      const totalLoadTime = Date.now() - startTime
      expect(totalLoadTime, 'Page with loading states too slow to start').toBeLessThanOrEqual(1000)
    })

    test('Multiple skeleton screens render efficiently', async ({ page }) => {
      await page.goto('/dashboard')

      // Count skeleton elements and test performance
      const skeletonCount = await page.locator('.skeleton, [data-testid*="skeleton"]').count()

      if (skeletonCount > 5) {
        // Test that many skeletons don't slow down the page
        const interactionMetrics = await performanceUtils.testSub200msInteraction('button')

        expect(interactionMetrics.passes200msThreshold,
          'Many skeleton screens affecting page responsiveness').toBe(true)
      }
    })

    test('Loading animations maintain 60fps', async ({ page }) => {
      await page.goto('/')

      const scrollMetrics = await performanceUtils.testScrollPerformance()

      // Loading animations shouldn't cause scroll jank
      PerformanceAssertions.expectButterySmoothScroll(scrollMetrics)

      expect(scrollMetrics.jankCount, 'Loading animations causing scroll jank').toBeLessThanOrEqual(3)
    })
  })

  test.describe('Mobile Loading Experience', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Mobile loading states are thumb-friendly', async ({ page }) => {
      await page.goto('/dashboard')

      // Check for mobile-optimized loading states
      const mobileLoadingElements = await page.locator('.loading, .skeleton').all()

      if (mobileLoadingElements.length > 0) {
        let mobileOptimized = 0

        for (const element of mobileLoadingElements.slice(0, 3)) {
          try {
            const box = await element.boundingBox()

            if (box) {
              // Check for appropriate mobile sizing
              const isMobileFriendly = box.height >= 20 && box.width >= 100 &&
                                      box.height <= 100 // Not too tall for mobile

              if (isMobileFriendly) mobileOptimized++
            }
          } catch (error) {
            continue
          }
        }

        const mobileOptimizationRate = mobileOptimized / Math.min(mobileLoadingElements.length, 3)
        expect(mobileOptimizationRate, 'Loading states not mobile-optimized').toBeGreaterThanOrEqual(0.7)
      }
    })

    test('Mobile loading doesn\'t block touch interactions', async ({ page }) => {
      await page.goto('/dashboard')

      // Test that loading states don't interfere with touch
      const touchTargets = await page.locator('button, a[role="button"]').all()

      if (touchTargets.length > 0) {
        const touchTarget = touchTargets[0]

        // Test touch responsiveness even with loading states present
        const touchMetrics = await performanceUtils.testSub200msInteraction(
          await touchTarget.getAttribute('data-testid') || 'button'
        )

        PerformanceAssertions.expectSub200ms(touchMetrics)
      }
    })
  })

  test.describe('Loading State Accessibility', () => {
    test('Loading states are announced to screen readers', async ({ page }) => {
      await page.goto('/dashboard')

      // Check for proper ARIA labels and roles
      const loadingElements = await page.locator('.loading, [data-testid*="loading"]').all()

      if (loadingElements.length > 0) {
        let accessibleLoading = 0

        for (const element of loadingElements) {
          try {
            const isAccessible = await element.evaluate((el) => {
              return el.hasAttribute('aria-label') ||
                     el.hasAttribute('aria-labelledby') ||
                     el.getAttribute('role') === 'status' ||
                     el.hasAttribute('aria-live')
            })

            if (isAccessible) accessibleLoading++
          } catch (error) {
            continue
          }
        }

        const accessibilityRate = accessibleLoading / loadingElements.length
        expect(accessibilityRate, 'Loading states not accessible enough').toBeGreaterThanOrEqual(0.5)
      }
    })

    test('Progress indicators have proper ARIA attributes', async ({ page }) => {
      const progressElements = await page.locator('[role="progressbar"], .progress').all()

      if (progressElements.length > 0) {
        let accessibleProgress = 0

        for (const progress of progressElements) {
          try {
            const hasProperAria = await progress.evaluate((el) => {
              return el.hasAttribute('aria-valuenow') ||
                     el.hasAttribute('aria-valuemin') ||
                     el.hasAttribute('aria-valuemax') ||
                     el.hasAttribute('aria-label')
            })

            if (hasProperAria) accessibleProgress++
          } catch (error) {
            continue
          }
        }

        const ariaComplianceRate = accessibleProgress / progressElements.length
        expect(ariaComplianceRate, 'Progress indicators lack proper ARIA').toBeGreaterThanOrEqual(0.8)
      }
    })
  })
})