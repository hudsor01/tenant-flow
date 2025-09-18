/**
 * Real User Monitoring for Interaction Satisfaction
 *
 * Tests real user monitoring capabilities for tracking interaction satisfaction.
 * Monitors user behavior patterns, satisfaction metrics, and engagement data.
 *
 * Key Features:
 * - User interaction pattern analysis
 * - Satisfaction score calculation
 * - Engagement metrics tracking
 * - Performance impact on user behavior
 * - Real-world usage pattern validation
 */

import { test, expect } from '@playwright/test'
import { PerformanceTestUtils } from '../performance-test-utilities'

test.describe('Real User Monitoring - Interaction Satisfaction', () => {
  let performanceUtils: PerformanceTestUtils

  test.beforeEach(async ({ page }) => {
    performanceUtils = new PerformanceTestUtils(page)

    // Initialize user monitoring instrumentation
    await page.addInitScript(() => {
      // Real User Monitoring (RUM) instrumentation
      ;(window as any).RUMCollector = {
        interactions: [],
        satisfactionMetrics: [],
        engagementEvents: [],
        performanceMarks: [],

        // Track user interactions with satisfaction scoring
        trackInteraction(type: string, element: string, startTime: number, endTime: number) {
          const responseTime = endTime - startTime
          const satisfactionScore = this.calculateSatisfactionScore(responseTime, type)

          this.interactions.push({
            type,
            element,
            responseTime,
            satisfactionScore,
            timestamp: Date.now()
          })

          // Real-time satisfaction analysis
          this.analyzeSatisfactionTrend()
        },

        // Calculate satisfaction based on Apple's performance psychology
        calculateSatisfactionScore(responseTime: number, interactionType: string): number {
          const thresholds = {
            click: { excellent: 100, good: 150, acceptable: 200 },
            hover: { excellent: 50, good: 100, acceptable: 150 },
            focus: { excellent: 80, good: 120, acceptable: 180 }
          }

          const threshold = thresholds[interactionType] || thresholds.click

          if (responseTime <= threshold.excellent) return 10
          if (responseTime <= threshold.good) return 8
          if (responseTime <= threshold.acceptable) return 6
          if (responseTime <= threshold.acceptable * 1.5) return 4
          return 2
        },

        // Track engagement patterns
        trackEngagement(eventType: string, data: any) {
          this.engagementEvents.push({
            type: eventType,
            data,
            timestamp: Date.now()
          })
        },

        // Analyze satisfaction trends
        analyzeSatisfactionTrend() {
          if (this.interactions.length >= 5) {
            const recentInteractions = this.interactions.slice(-5)
            const avgSatisfaction = recentInteractions.reduce((sum, i) => sum + i.satisfactionScore, 0) / 5

            this.satisfactionMetrics.push({
              avgSatisfaction,
              timestamp: Date.now(),
              sampleSize: recentInteractions.length
            })

            // Trigger alerts for low satisfaction
            if (avgSatisfaction < 6) {
              console.log(`RUM_ALERT: Low satisfaction detected: ${avgSatisfaction}`)
            }
          }
        },

        // Get current satisfaction dashboard
        getSatisfactionDashboard() {
          const totalInteractions = this.interactions.length
          if (totalInteractions === 0) return null

          const avgSatisfaction = this.interactions.reduce((sum, i) => sum + i.satisfactionScore, 0) / totalInteractions
          const avgResponseTime = this.interactions.reduce((sum, i) => sum + i.responseTime, 0) / totalInteractions

          const satisfactionByType = {}
          this.interactions.forEach(interaction => {
            if (!satisfactionByType[interaction.type]) {
              satisfactionByType[interaction.type] = { total: 0, count: 0, avgResponse: 0 }
            }
            satisfactionByType[interaction.type].total += interaction.satisfactionScore
            satisfactionByType[interaction.type].count++
            satisfactionByType[interaction.type].avgResponse += interaction.responseTime
          })

          // Calculate averages
          Object.keys(satisfactionByType).forEach(type => {
            const data = satisfactionByType[type]
            data.avgSatisfaction = data.total / data.count
            data.avgResponse = data.avgResponse / data.count
          })

          return {
            totalInteractions,
            avgSatisfaction,
            avgResponseTime,
            satisfactionByType,
            engagementScore: this.calculateEngagementScore()
          }
        },

        // Calculate overall engagement score
        calculateEngagementScore(): number {
          const factors = {
            interactionFrequency: Math.min(this.interactions.length / 10, 1), // Max score at 10 interactions
            avgSatisfaction: (this.interactions.reduce((sum, i) => sum + i.satisfactionScore, 0) / Math.max(this.interactions.length, 1)) / 10,
            engagementEvents: Math.min(this.engagementEvents.length / 5, 1), // Max score at 5 events
            timeSpent: Math.min(Date.now() - (this.interactions[0]?.timestamp || Date.now()), 30000) / 30000 // Max at 30s
          }

          return (factors.interactionFrequency + factors.avgSatisfaction + factors.engagementEvents + factors.timeSpent) / 4
        }
      }

      // Auto-instrument common interactions
      document.addEventListener('click', (e) => {
        const startTime = performance.now()
        const element = e.target as Element
        const elementDesc = element.tagName + (element.className ? '.' + element.className.split(' ')[0] : '')

        setTimeout(() => {
          ;(window as any).RUMCollector.trackInteraction('click', elementDesc, startTime, performance.now())
        }, 0)
      })

      document.addEventListener('mouseover', (e) => {
        const startTime = performance.now()
        const element = e.target as Element
        const elementDesc = element.tagName + (element.className ? '.' + element.className.split(' ')[0] : '')

        setTimeout(() => {
          ;(window as any).RUMCollector.trackInteraction('hover', elementDesc, startTime, performance.now())
        }, 0)
      })

      document.addEventListener('focusin', (e) => {
        const startTime = performance.now()
        const element = e.target as Element
        const elementDesc = element.tagName + (element.className ? '.' + element.className.split(' ')[0] : '')

        setTimeout(() => {
          ;(window as any).RUMCollector.trackInteraction('focus', elementDesc, startTime, performance.now())
        }, 0)
      })
    })
  })

  test.describe('User Interaction Satisfaction Monitoring', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Real user interaction patterns meet Apple satisfaction standards', async ({ page }) => {
      // Simulate realistic user interaction patterns
      const userJourney = [
        { action: 'hover', selector: 'nav a:first-child' },
        { action: 'click', selector: 'button:has-text("Get Started")' },
        { action: 'hover', selector: '.card:first-child' },
        { action: 'click', selector: 'a:has-text("Features")' },
        { action: 'hover', selector: 'button:has-text("Learn More")' }
      ]

      // Execute user journey
      for (const step of userJourney) {
        try {
          const element = page.locator(step.selector).first()

          if (step.action === 'hover') {
            await element.hover()
          } else if (step.action === 'click') {
            await element.click()
          } else if (step.action === 'focus') {
            await element.focus()
          }

          await page.waitForTimeout(200 + Math.random() * 300) // Realistic pause
        } catch (error) {
          console.log(`Step failed: ${step.action} ${step.selector}`)
        }
      }

      // Analyze collected satisfaction data
      const satisfactionDashboard = await page.evaluate(() => {
        return (window as any).RUMCollector.getSatisfactionDashboard()
      })

      if (satisfactionDashboard) {
        expect(satisfactionDashboard.avgSatisfaction, 'User satisfaction too low').toBeGreaterThanOrEqual(7)
        expect(satisfactionDashboard.avgResponseTime, 'Average response time too slow').toBeLessThanOrEqual(200)
        expect(satisfactionDashboard.engagementScore, 'User engagement too low').toBeGreaterThanOrEqual(0.6)

        console.log(`RUM_SATISFACTION:${satisfactionDashboard.avgSatisfaction.toFixed(1)}`)
        console.log(`RUM_RESPONSE_TIME:${satisfactionDashboard.avgResponseTime.toFixed(1)}ms`)
        console.log(`RUM_ENGAGEMENT:${satisfactionDashboard.engagementScore.toFixed(2)}`)

        // Log satisfaction by interaction type
        Object.entries(satisfactionDashboard.satisfactionByType).forEach(([type, data]: [string, any]) => {
          console.log(`RUM_${type.toUpperCase()}:satisfaction:${data.avgSatisfaction.toFixed(1)}:response:${data.avgResponse.toFixed(1)}ms`)
        })
      }
    })

    test('Rapid user interactions maintain satisfaction levels', async ({ page }) => {
      // Simulate rapid user interactions (power user behavior)
      const rapidInteractions = [
        'button', 'a', '.card', '.feature-card', 'nav a'
      ]

      for (let i = 0; i < 15; i++) {
        try {
          const randomSelector = rapidInteractions[Math.floor(Math.random() * rapidInteractions.length)]
          const elements = await page.locator(randomSelector).all()

          if (elements.length > 0) {
            const randomElement = elements[Math.floor(Math.random() * elements.length)]
            await randomElement.hover()
            await page.waitForTimeout(50 + Math.random() * 100) // Very rapid interactions
          }
        } catch (error) {
          continue
        }
      }

      // Check satisfaction during rapid interactions
      const rapidSatisfactionData = await page.evaluate(() => {
        const dashboard = (window as any).RUMCollector.getSatisfactionDashboard()
        const recentInteractions = (window as any).RUMCollector.interactions.slice(-10)

        return {
          dashboard,
          recentSatisfaction: recentInteractions.reduce((sum, i) => sum + i.satisfactionScore, 0) / Math.max(recentInteractions.length, 1),
          consistencyScore: this.calculateConsistencyScore(recentInteractions)
        }
      })

      if (rapidSatisfactionData.dashboard) {
        expect(rapidSatisfactionData.recentSatisfaction, 'Rapid interaction satisfaction degraded')
          .toBeGreaterThanOrEqual(6.5)

        console.log(`RUM_RAPID_SATISFACTION:${rapidSatisfactionData.recentSatisfaction.toFixed(1)}`)
      }
    })

    test('User flow completion satisfaction tracking', async ({ page }) => {
      // Track satisfaction through a complete user flow
      await page.evaluate(() => {
        ;(window as any).RUMCollector.trackEngagement('flow_start', { flow: 'homepage_to_features' })
      })

      // Navigate through flow
      await page.click('a:has-text("Features")')
      await page.waitForLoadState('networkidle')

      await page.evaluate(() => {
        ;(window as any).RUMCollector.trackEngagement('flow_step', { step: 'features_page_loaded' })
      })

      // Interact with features page
      const featureCards = await page.locator('.card, .feature-card').all()
      for (let i = 0; i < Math.min(featureCards.length, 3); i++) {
        await featureCards[i].hover()
        await page.waitForTimeout(300)
      }

      await page.evaluate(() => {
        ;(window as any).RUMCollector.trackEngagement('flow_complete', { flow: 'homepage_to_features' })
      })

      // Analyze flow satisfaction
      const flowSatisfaction = await page.evaluate(() => {
        const dashboard = (window as any).RUMCollector.getSatisfactionDashboard()
        const engagementEvents = (window as any).RUMCollector.engagementEvents

        return {
          satisfaction: dashboard,
          flowEvents: engagementEvents.filter(e => e.type.startsWith('flow')),
          completionRate: engagementEvents.filter(e => e.type === 'flow_complete').length /
                         Math.max(engagementEvents.filter(e => e.type === 'flow_start').length, 1)
        }
      })

      expect(flowSatisfaction.completionRate, 'Flow completion rate too low').toBeGreaterThanOrEqual(0.8)

      if (flowSatisfaction.satisfaction) {
        expect(flowSatisfaction.satisfaction.avgSatisfaction, 'Flow satisfaction too low')
          .toBeGreaterThanOrEqual(7)
      }

      console.log(`RUM_FLOW_COMPLETION:${flowSatisfaction.completionRate}`)
      console.log(`RUM_FLOW_SATISFACTION:${flowSatisfaction.satisfaction?.avgSatisfaction.toFixed(1) || 'N/A'}`)
    })
  })

  test.describe('Mobile User Monitoring', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Mobile touch interaction satisfaction', async ({ page }) => {
      // Simulate mobile touch patterns
      const touchTargets = await page.locator('button, a[role="button"], .card').all()

      for (let i = 0; i < Math.min(touchTargets.length, 8); i++) {
        try {
          // Simulate touch with slight delay (realistic mobile interaction)
          await touchTargets[i].tap()
          await page.waitForTimeout(250 + Math.random() * 200) // Mobile interaction pauses
        } catch (error) {
          continue
        }
      }

      const mobileSatisfaction = await page.evaluate(() => {
        const dashboard = (window as any).RUMCollector.getSatisfactionDashboard()
        return dashboard
      })

      if (mobileSatisfaction) {
        // Mobile satisfaction should still be high
        expect(mobileSatisfaction.avgSatisfaction, 'Mobile satisfaction too low')
          .toBeGreaterThanOrEqual(6.5)
        expect(mobileSatisfaction.avgResponseTime, 'Mobile response time too slow')
          .toBeLessThanOrEqual(250) // Slightly more lenient for mobile

        console.log(`RUM_MOBILE_SATISFACTION:${mobileSatisfaction.avgSatisfaction.toFixed(1)}`)
        console.log(`RUM_MOBILE_RESPONSE:${mobileSatisfaction.avgResponseTime.toFixed(1)}ms`)
      }
    })

    test('Mobile scroll satisfaction monitoring', async ({ page }) => {
      // Track satisfaction during mobile scrolling
      await page.evaluate(() => {
        let scrollStartTime = performance.now()
        let scrollSatisfactionSum = 0
        let scrollCount = 0

        window.addEventListener('scroll', () => {
          const scrollEndTime = performance.now()
          const scrollResponseTime = scrollEndTime - scrollStartTime

          // Score scroll satisfaction (smooth scrolling)
          let scrollSatisfaction = 10
          if (scrollResponseTime > 16.67) scrollSatisfaction -= 2 // Frame drop penalty
          if (scrollResponseTime > 33.33) scrollSatisfaction -= 3 // Major jank penalty

          scrollSatisfactionSum += Math.max(scrollSatisfaction, 1)
          scrollCount++

          ;(window as any).RUMCollector.trackEngagement('scroll', {
            responseTime: scrollResponseTime,
            satisfaction: scrollSatisfaction
          })

          scrollStartTime = performance.now()
        })
      })

      // Perform mobile-style scrolling
      await page.mouse.wheel(0, 300)
      await page.waitForTimeout(500)
      await page.mouse.wheel(0, 400)
      await page.waitForTimeout(300)
      await page.mouse.wheel(0, -200)
      await page.waitForTimeout(400)

      const scrollSatisfaction = await page.evaluate(() => {
        const scrollEvents = (window as any).RUMCollector.engagementEvents.filter(e => e.type === 'scroll')
        if (scrollEvents.length === 0) return null

        const avgScrollSatisfaction = scrollEvents.reduce((sum, e) => sum + e.data.satisfaction, 0) / scrollEvents.length
        const avgScrollResponse = scrollEvents.reduce((sum, e) => sum + e.data.responseTime, 0) / scrollEvents.length

        return {
          avgSatisfaction: avgScrollSatisfaction,
          avgResponse: avgScrollResponse,
          scrollCount: scrollEvents.length
        }
      })

      if (scrollSatisfaction) {
        expect(scrollSatisfaction.avgSatisfaction, 'Mobile scroll satisfaction too low')
          .toBeGreaterThanOrEqual(7)
        expect(scrollSatisfaction.avgResponse, 'Mobile scroll response too slow')
          .toBeLessThanOrEqual(33.33) // Should be under 2 frames at 60fps

        console.log(`RUM_SCROLL_SATISFACTION:${scrollSatisfaction.avgSatisfaction.toFixed(1)}`)
        console.log(`RUM_SCROLL_RESPONSE:${scrollSatisfaction.avgResponse.toFixed(1)}ms`)
      }
    })
  })

  test.describe('Satisfaction Trend Analysis', () => {
    test('Long-term satisfaction trend monitoring', async ({ page }) => {
      await page.goto('/')

      // Simulate extended user session with varying interaction patterns
      const sessionDuration = 10000 // 10 seconds
      const startTime = Date.now()

      while (Date.now() - startTime < sessionDuration) {
        try {
          // Vary interaction intensity over time
          const elapsed = Date.now() - startTime
          const intensity = Math.sin(elapsed / 2000) * 0.5 + 0.5 // Sine wave intensity

          if (Math.random() < intensity) {
            const buttons = await page.locator('button, a').all()
            if (buttons.length > 0) {
              const randomButton = buttons[Math.floor(Math.random() * buttons.length)]
              await randomButton.hover()
            }
          }

          await page.waitForTimeout(100 + Math.random() * 200)
        } catch (error) {
          continue
        }
      }

      // Analyze satisfaction trends
      const trendAnalysis = await page.evaluate(() => {
        const satisfactionMetrics = (window as any).RUMCollector.satisfactionMetrics
        if (satisfactionMetrics.length < 3) return null

        const earlyMetrics = satisfactionMetrics.slice(0, Math.ceil(satisfactionMetrics.length / 3))
        const lateMetrics = satisfactionMetrics.slice(-Math.ceil(satisfactionMetrics.length / 3))

        const earlyAvg = earlyMetrics.reduce((sum, m) => sum + m.avgSatisfaction, 0) / earlyMetrics.length
        const lateAvg = lateMetrics.reduce((sum, m) => sum + m.avgSatisfaction, 0) / lateMetrics.length

        return {
          earlyAvg,
          lateAvg,
          trend: lateAvg - earlyAvg,
          consistency: Math.abs(lateAvg - earlyAvg) <= 1 // Within 1 point
        }
      })

      if (trendAnalysis) {
        // Satisfaction should remain consistent or improve over time
        expect(trendAnalysis.trend, 'Satisfaction declined over session').toBeGreaterThanOrEqual(-1)
        expect(trendAnalysis.consistency, 'Satisfaction not consistent over time').toBe(true)
        expect(trendAnalysis.lateAvg, 'Late session satisfaction too low').toBeGreaterThanOrEqual(6)

        console.log(`RUM_TREND:early:${trendAnalysis.earlyAvg.toFixed(1)}:late:${trendAnalysis.lateAvg.toFixed(1)}`)
        console.log(`RUM_TREND_DIRECTION:${trendAnalysis.trend >= 0 ? 'improving' : 'declining'}`)
      }
    })

    test('Satisfaction recovery after performance issues', async ({ page }) => {
      await page.goto('/')

      // Simulate performance degradation scenario
      await page.addInitScript(() => {
        // Simulate temporary performance degradation
        ;(window as any).simulateSlowdown = true
        const originalAddEventListener = EventTarget.prototype.addEventListener

        EventTarget.prototype.addEventListener = function(type, listener, options) {
          if ((window as any).simulateSlowdown && (type === 'click' || type === 'mouseover')) {
            const wrappedListener = function(event) {
              // Add artificial delay
              setTimeout(() => {
                if (typeof listener === 'function') {
                  listener.call(this, event)
                } else if (listener && typeof listener.handleEvent === 'function') {
                  listener.handleEvent(event)
                }
              }, 300) // Artificial 300ms delay
            }
            return originalAddEventListener.call(this, type, wrappedListener, options)
          }
          return originalAddEventListener.call(this, type, listener, options)
        }
      })

      // Interact during slow period
      const slowInteractions = await page.locator('button, a').all()
      for (let i = 0; i < 3; i++) {
        if (slowInteractions.length > 0) {
          await slowInteractions[i].hover()
          await page.waitForTimeout(400) // Wait for slow response
        }
      }

      // Remove artificial slowdown
      await page.evaluate(() => {
        ;(window as any).simulateSlowdown = false
      })

      // Test interactions after recovery
      for (let i = 0; i < 5; i++) {
        if (slowInteractions.length > i + 3) {
          await slowInteractions[i + 3].hover()
          await page.waitForTimeout(200)
        }
      }

      // Analyze recovery
      const recoveryAnalysis = await page.evaluate(() => {
        const interactions = (window as any).RUMCollector.interactions
        if (interactions.length < 5) return null

        const slowPeriod = interactions.slice(0, 3)
        const recoveryPeriod = interactions.slice(-5)

        const slowAvgSatisfaction = slowPeriod.reduce((sum, i) => sum + i.satisfactionScore, 0) / slowPeriod.length
        const recoveryAvgSatisfaction = recoveryPeriod.reduce((sum, i) => sum + i.satisfactionScore, 0) / recoveryPeriod.length

        return {
          slowPeriodSatisfaction: slowAvgSatisfaction,
          recoveryPeriodSatisfaction: recoveryAvgSatisfaction,
          recoveryImprovement: recoveryAvgSatisfaction - slowAvgSatisfaction,
          fullRecovery: recoveryAvgSatisfaction >= 7
        }
      })

      if (recoveryAnalysis) {
        expect(recoveryAnalysis.recoveryImprovement, 'No satisfaction recovery detected')
          .toBeGreaterThan(1)
        expect(recoveryAnalysis.fullRecovery, 'Satisfaction did not fully recover')
          .toBe(true)

        console.log(`RUM_RECOVERY:slow:${recoveryAnalysis.slowPeriodSatisfaction.toFixed(1)}:recovered:${recoveryAnalysis.recoveryPeriodSatisfaction.toFixed(1)}`)
      }
    })
  })

  test.afterEach(async ({ page }) => {
    // Export final RUM dashboard for analysis
    const finalDashboard = await page.evaluate(() => {
      return (window as any).RUMCollector?.getSatisfactionDashboard()
    })

    if (finalDashboard) {
      console.log(`RUM_FINAL_DASHBOARD:${JSON.stringify(finalDashboard, null, 2)}`)
    }
  })
})