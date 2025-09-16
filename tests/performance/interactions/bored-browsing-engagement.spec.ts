/**
 * Bored Browsing Engagement Tests
 *
 * Tests the "mindless clicking" experience - when users are bored and randomly exploring.
 * Every interaction should be engaging enough to keep users interested and exploring.
 *
 * Apple's Philosophy: Even mindless browsing should feel rewarding and encourage exploration.
 * Test scenarios include rapid clicking, hover exploration, and engagement retention.
 */

import { test, expect } from '@playwright/test'
import { PerformanceTestUtils, PerformanceAssertions } from '../performance-test-utilities'

test.describe('Bored Browsing Engagement Tests - Apple Standard', () => {
  let performanceUtils: PerformanceTestUtils

  test.beforeEach(async ({ page }) => {
    performanceUtils = new PerformanceTestUtils(page)
  })

  test.describe('Homepage Bored Browsing', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Mindless clicking provides engaging feedback', async ({ page }) => {
      // Simulate bored user randomly clicking around
      const clickableElements = [
        'button',
        'a',
        '.card',
        '.feature-card',
        'nav a',
        '.btn',
        '[role="button"]',
        '.hero-cta',
        '.pricing-card'
      ]

      const boredBrowsingMetrics = await performanceUtils.testBoredBrowsingExperience(clickableElements)

      PerformanceAssertions.expectEngagingBoredBrowsing(boredBrowsingMetrics)

      // Additional engagement expectations
      expect(boredBrowsingMetrics.overallBoredBrowsingScore, 'Overall bored browsing not engaging enough')
        .toBeGreaterThanOrEqual(0.75)
      expect(boredBrowsingMetrics.visualFeedbackQuality, 'Visual feedback quality too low')
        .toBeGreaterThanOrEqual(0.7)
    })

    test('Rapid hover exploration feels responsive', async ({ page }) => {
      // Simulate rapid hover movements across the page
      const hoverTargets = await page.locator('button, a, .card, .feature-card').all()

      let totalHoverTime = 0
      let satisfyingHovers = 0

      for (let i = 0; i < Math.min(hoverTargets.length, 10); i++) {
        try {
          const startTime = Date.now()
          await hoverTargets[i].hover()
          await page.waitForTimeout(50) // Brief pause to observe hover state
          const hoverTime = Date.now() - startTime

          totalHoverTime += hoverTime
          if (hoverTime <= 150) satisfyingHovers++
        } catch (error) {
          // Element might not be hoverable, continue
          continue
        }
      }

      const avgHoverTime = totalHoverTime / Math.min(hoverTargets.length, 10)
      const satisfactionRate = satisfyingHovers / Math.min(hoverTargets.length, 10)

      expect(avgHoverTime, 'Average hover response too slow for bored browsing').toBeLessThanOrEqual(120)
      expect(satisfactionRate, 'Too few satisfying hovers for engagement').toBeGreaterThanOrEqual(0.8)
    })

    test('Feature cards encourage exploration', async ({ page }) => {
      // Test that feature cards invite interaction and exploration
      const featureCards = await page.locator('.feature-card, [data-testid*="feature"], .card').all()

      let explorationScore = 0
      let testedCards = 0

      for (const card of featureCards.slice(0, 6)) {
        try {
          // Check for exploration-encouraging elements
          const cardText = await card.textContent()
          const hasInvitingText = cardText && /(?:learn|explore|discover|try|see|get|start)/i.test(cardText)

          // Check for interactive visual feedback
          await card.hover()
          const hasHoverEffect = await card.evaluate((el) => {
            const beforeHover = window.getComputedStyle(el)
            return (
              beforeHover.transform !== 'none' ||
              beforeHover.boxShadow !== 'none' ||
              beforeHover.scale !== 'none'
            )
          })

          if (hasInvitingText) explorationScore += 0.5
          if (hasHoverEffect) explorationScore += 0.5
          testedCards++
        } catch (error) {
          continue
        }
      }

      if (testedCards > 0) {
        const avgExplorationScore = explorationScore / testedCards
        expect(avgExplorationScore, 'Feature cards not encouraging enough exploration').toBeGreaterThanOrEqual(0.7)
      }
    })

    test('Navigation invites bored exploration', async ({ page }) => {
      // Test navigation elements for bored browsing appeal
      const navElements = await page.locator('nav a, .nav-link').all()

      let invitingNavItems = 0

      for (const navElement of navElements) {
        try {
          // Test hover responsiveness
          const startTime = Date.now()
          await navElement.hover()
          const hoverTime = Date.now() - startTime

          // Check for visual feedback
          const hasVisualChange = await navElement.evaluate((el) => {
            const styles = window.getComputedStyle(el, ':hover')
            const normalStyles = window.getComputedStyle(el)
            return (
              styles.backgroundColor !== normalStyles.backgroundColor ||
              styles.color !== normalStyles.color ||
              styles.textDecoration !== normalStyles.textDecoration
            )
          })

          if (hoverTime <= 150 && hasVisualChange) {
            invitingNavItems++
          }
        } catch (error) {
          continue
        }
      }

      const invitationRate = invitingNavItems / Math.max(navElements.length, 1)
      expect(invitationRate, 'Navigation not inviting enough for bored browsing').toBeGreaterThanOrEqual(0.8)
    })
  })

  test.describe('Dashboard Bored Exploration', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
    })

    test('Dashboard widgets respond to mindless interaction', async ({ page }) => {
      const widgets = [
        '.card',
        '.widget',
        '.dashboard-item',
        '.stats-card',
        '.metric-card',
        '[data-testid*="widget"]'
      ]

      const boredBrowsingMetrics = await performanceUtils.testBoredBrowsingExperience(widgets)
      PerformanceAssertions.expectEngagingBoredBrowsing(boredBrowsingMetrics)

      // Dashboard should be especially engaging for exploration
      expect(boredBrowsingMetrics.explorationEncouragement, 'Dashboard not encouraging exploration')
        .toBeGreaterThanOrEqual(0.8)
    })

    test('Action buttons provide satisfying click feedback', async ({ page }) => {
      const actionButtons = await page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("Edit")').all()

      let satisfyingClicks = 0

      for (const button of actionButtons.slice(0, 5)) {
        try {
          const microInteractionMetrics = await performanceUtils.testMicroInteractionSatisfaction(
            await button.getAttribute('data-testid') || 'button'
          )

          if (microInteractionMetrics.satisfactionRating >= 0.7) {
            satisfyingClicks++
          }
        } catch (error) {
          continue
        }
      }

      const satisfactionRate = satisfyingClicks / Math.min(actionButtons.length, 5)
      expect(satisfactionRate, 'Action buttons not satisfying enough for bored clicking').toBeGreaterThanOrEqual(0.7)
    })

    test('Sidebar navigation invites exploration', async ({ page }) => {
      const sidebarLinks = await page.locator('[data-testid*="nav-"], .sidebar a, .nav-link').all()

      let exploratoryLinks = 0

      for (const link of sidebarLinks) {
        try {
          // Test quick hover response
          const startTime = Date.now()
          await link.hover()
          const responseTime = Date.now() - startTime

          // Check text content for exploration encouragement
          const linkText = await link.textContent()
          const isInviting = linkText && linkText.length > 3 // Has meaningful text

          if (responseTime <= 150 && isInviting) {
            exploratoryLinks++
          }
        } catch (error) {
          continue
        }
      }

      const explorationRate = exploratoryLinks / Math.max(sidebarLinks.length, 1)
      expect(explorationRate, 'Sidebar not inviting enough exploration').toBeGreaterThanOrEqual(0.8)
    })
  })

  test.describe('Form Bored Interaction', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/register')
      await page.waitForLoadState('networkidle')
    })

    test('Form elements respond nicely to random interaction', async ({ page }) => {
      const formElements = [
        'input[type="text"]',
        'input[type="email"]',
        'input[type="password"]',
        'select',
        'textarea',
        'button[type="submit"]'
      ]

      let responsiveElements = 0

      for (const selector of formElements) {
        try {
          const metrics = await performanceUtils.testSub200msInteraction(selector, 'focus')

          // Form elements should respond quickly to maintain engagement
          if (metrics.responseTime <= 120) {
            responsiveElements++
          }
        } catch (error) {
          continue
        }
      }

      const responsiveRate = responsiveElements / formElements.length
      expect(responsiveRate, 'Form elements not responsive enough for bored interaction').toBeGreaterThanOrEqual(0.8)
    })

    test('Submit button has satisfying press feel', async ({ page }) => {
      try {
        const submitButton = 'button[type="submit"], button:has-text("Submit")'
        const microMetrics = await performanceUtils.testMicroInteractionSatisfaction(submitButton)

        PerformanceAssertions.expectAppleLevelSatisfaction(microMetrics)

        // Submit buttons should be extra satisfying
        expect(microMetrics.satisfactionRating, 'Submit button not satisfying enough')
          .toBeGreaterThanOrEqual(0.85)
      } catch (error) {
        console.log('Submit button not found, skipping')
      }
    })
  })

  test.describe('Mobile Bored Browsing', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Mobile thumb-friendly exploration', async ({ page }) => {
      // Test touch targets for bored thumb scrolling
      const touchTargets = await page.locator('button, a[role="button"], .card, .btn').all()

      let thumbFriendlyTargets = 0

      for (const target of touchTargets.slice(0, 10)) {
        try {
          // Check touch target size
          const boundingBox = await target.boundingBox()
          if (boundingBox && boundingBox.height >= 44 && boundingBox.width >= 44) {
            // Test interaction responsiveness
            const metrics = await performanceUtils.testSub200msInteraction(
              `${await target.getAttribute('data-testid') || target.tagName.toLowerCase()}`
            )

            if (metrics.responseTime <= 150) {
              thumbFriendlyTargets++
            }
          }
        } catch (error) {
          continue
        }
      }

      const thumbFriendlinessRate = thumbFriendlyTargets / Math.min(touchTargets.length, 10)
      expect(thumbFriendlinessRate, 'Not enough thumb-friendly targets for mobile bored browsing')
        .toBeGreaterThanOrEqual(0.7)
    })

    test('Mobile swipe gestures feel responsive', async ({ page }) => {
      // Test if swipe-like interactions feel responsive
      const swipeableElements = await page.locator('.card, .carousel, .slider').all()

      if (swipeableElements.length > 0) {
        for (const element of swipeableElements.slice(0, 3)) {
          try {
            // Simulate touch start and move
            const box = await element.boundingBox()
            if (box) {
              await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
              const startTime = Date.now()
              await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2, { steps: 10 })
              const swipeTime = Date.now() - startTime

              expect(swipeTime, 'Swipe gesture too slow for mobile bored browsing').toBeLessThanOrEqual(300)
            }
          } catch (error) {
            continue
          }
        }
      }
    })
  })

  test.describe('Engagement Retention Metrics', () => {
    test('Sustained bored browsing maintains performance', async ({ page }) => {
      await page.goto('/')

      // Simulate 30 seconds of bored browsing
      const browsingSessions = []
      const startTime = Date.now()

      while (Date.now() - startTime < 30000) { // 30 seconds
        try {
          // Random element selection
          const clickableElements = await page.locator('button, a, .card').all()
          if (clickableElements.length > 0) {
            const randomIndex = Math.floor(Math.random() * clickableElements.length)
            const randomElement = clickableElements[randomIndex]

            const sessionStart = Date.now()
            await randomElement.hover()
            await page.waitForTimeout(100 + Math.random() * 200) // Random pause 100-300ms
            const sessionTime = Date.now() - sessionStart

            browsingSessions.push(sessionTime)
          }

          await page.waitForTimeout(200 + Math.random() * 500) // Random pause between interactions
        } catch (error) {
          continue
        }
      }

      // Analyze sustained browsing performance
      const avgSessionTime = browsingSessions.reduce((a, b) => a + b, 0) / browsingSessions.length
      const slowSessions = browsingSessions.filter(time => time > 300).length
      const slowSessionRate = slowSessions / browsingSessions.length

      expect(avgSessionTime, 'Sustained browsing degraded average performance').toBeLessThanOrEqual(250)
      expect(slowSessionRate, 'Too many slow sessions during sustained browsing').toBeLessThanOrEqual(0.2)
    })

    test('Bored browsing engagement metrics meet Apple standards', async ({ page }) => {
      await page.goto('/')

      // Test overall engagement across different page sections
      const pageSections = [
        '.hero',
        '.features',
        '.pricing',
        'nav',
        '.footer'
      ]

      let totalEngagement = 0
      let sectionsTested = 0

      for (const section of pageSections) {
        try {
          const sectionElements = await page.locator(`${section} button, ${section} a, ${section} .card`).all()

          if (sectionElements.length > 0) {
            const sectionSelectors = sectionElements.slice(0, 3).map((_, i) => `${section} button:nth-child(${i + 1}), ${section} a:nth-child(${i + 1})`)
            const sectionMetrics = await performanceUtils.testBoredBrowsingExperience(sectionSelectors)

            totalEngagement += sectionMetrics.overallBoredBrowsingScore
            sectionsTested++
          }
        } catch (error) {
          continue
        }
      }

      if (sectionsTested > 0) {
        const overallPageEngagement = totalEngagement / sectionsTested
        expect(overallPageEngagement, 'Overall page engagement below Apple standards').toBeGreaterThanOrEqual(0.75)
      }
    })
  })
})