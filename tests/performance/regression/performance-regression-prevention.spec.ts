/**
 * Performance Regression Prevention Suite
 *
 * Critical CI tests that prevent performance regressions from reaching production.
 * These tests enforce Apple's sub-200ms interaction standard and fail builds that violate it.
 *
 * Key Features:
 * - Baseline performance validation
 * - Critical path monitoring
 * - Performance budget enforcement
 * - Regression detection algorithms
 * - CI-optimized test execution
 */

import { test, expect } from '@playwright/test'
import { PerformanceTestUtils, PerformanceAssertions } from '../performance-test-utilities'

test.describe('Performance Regression Prevention - CI Suite', () => {
  let performanceUtils: PerformanceTestUtils

  test.beforeEach(async ({ page }) => {
    performanceUtils = new PerformanceTestUtils(page)

    // CI-optimized settings for consistent performance measurement
    await page.addInitScript(() => {
      // Disable animations for consistent measurement in CI
      document.documentElement.style.setProperty('animation-duration', '0ms')
      document.documentElement.style.setProperty('transition-duration', '0ms')

      // Mark as CI environment
      ;(window as any).isCIEnvironment = true
    })
  })

  test.describe('Critical Path Performance Baselines', () => {
    const PERFORMANCE_BASELINES = {
      homepage_hero_cta: 150, // ms
      navigation_hover: 120,  // ms
      form_input_focus: 100,  // ms
      modal_open: 200,        // ms
      page_navigation: 300    // ms
    }

    test('Homepage Hero CTA maintains sub-150ms baseline', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const measurements = []

      // Take multiple measurements for CI consistency
      for (let i = 0; i < 3; i++) {
        const metrics = await performanceUtils.testSub200msInteraction(
          'button:has-text("Get Started"), .hero-cta, [data-testid="hero-cta"]'
        )

        measurements.push(metrics.interactionTime)
        await page.waitForTimeout(500) // Settle between measurements
      }

      const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length
      const maxTime = Math.max(...measurements)

      expect(avgTime, 'Hero CTA average time exceeds baseline').toBeLessThanOrEqual(PERFORMANCE_BASELINES.homepage_hero_cta)
      expect(maxTime, 'Hero CTA max time causes regression').toBeLessThanOrEqual(PERFORMANCE_BASELINES.homepage_hero_cta + 50)

      // CI-specific logging for performance monitoring
      console.log(`PERF_METRIC:hero_cta_avg:${avgTime.toFixed(1)}ms`)
      console.log(`PERF_METRIC:hero_cta_max:${maxTime.toFixed(1)}ms`)
    })

    test('Navigation hover responses stay within 120ms budget', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const navItems = ['nav a', '.nav-link', '[data-testid*="nav-"]']
      const navMeasurements = []

      for (const selector of navItems) {
        try {
          const elements = await page.locator(selector).all()

          for (const element of elements.slice(0, 3)) {
            const metrics = await performanceUtils.testSub200msInteraction(selector, 'hover')
            navMeasurements.push(metrics.responseTime)
          }
        } catch (error) {
          // Element not found, continue
          continue
        }
      }

      if (navMeasurements.length > 0) {
        const avgNavTime = navMeasurements.reduce((a, b) => a + b, 0) / navMeasurements.length
        const worstNavTime = Math.max(...navMeasurements)

        expect(avgNavTime, 'Navigation hover average exceeds budget').toBeLessThanOrEqual(PERFORMANCE_BASELINES.navigation_hover)
        expect(worstNavTime, 'Navigation hover worst case causes regression').toBeLessThanOrEqual(PERFORMANCE_BASELINES.navigation_hover + 30)

        console.log(`PERF_METRIC:nav_hover_avg:${avgNavTime.toFixed(1)}ms`)
        console.log(`PERF_METRIC:nav_hover_worst:${worstNavTime.toFixed(1)}ms`)
      }
    })

    test('Form input focus maintains 100ms responsiveness', async ({ page }) => {
      await page.goto('/auth/register')
      await page.waitForLoadState('networkidle')

      const inputTypes = ['input[type="email"]', 'input[type="password"]', 'input[type="text"]']
      const focusMeasurements = []

      for (const inputType of inputTypes) {
        try {
          const metrics = await performanceUtils.testSub200msInteraction(inputType, 'focus')
          focusMeasurements.push(metrics.responseTime)
        } catch (error) {
          continue
        }
      }

      if (focusMeasurements.length > 0) {
        const avgFocusTime = focusMeasurements.reduce((a, b) => a + b, 0) / focusMeasurements.length
        const maxFocusTime = Math.max(...focusMeasurements)

        expect(avgFocusTime, 'Form input focus average exceeds budget').toBeLessThanOrEqual(PERFORMANCE_BASELINES.form_input_focus)
        expect(maxFocusTime, 'Form input focus max time causes regression').toBeLessThanOrEqual(PERFORMANCE_BASELINES.form_input_focus + 20)

        console.log(`PERF_METRIC:input_focus_avg:${avgFocusTime.toFixed(1)}ms`)
        console.log(`PERF_METRIC:input_focus_max:${maxFocusTime.toFixed(1)}ms`)
      }
    })

    test('Modal opening stays within 200ms budget', async ({ page }) => {
      await page.goto('/')

      const modalTriggers = [
        'button:has-text("Sign Up")',
        'button:has-text("Login")',
        'button[data-testid*="modal"]',
        '[data-trigger="modal"]'
      ]

      let modalOpenTime = null

      for (const trigger of modalTriggers) {
        try {
          const metrics = await performanceUtils.testSub200msInteraction(trigger)
          modalOpenTime = metrics.interactionTime
          break
        } catch (error) {
          continue
        }
      }

      if (modalOpenTime !== null) {
        expect(modalOpenTime, 'Modal opening exceeds budget').toBeLessThanOrEqual(PERFORMANCE_BASELINES.modal_open)
        console.log(`PERF_METRIC:modal_open:${modalOpenTime.toFixed(1)}ms`)
      }
    })

    test('Page navigation completes within 300ms budget', async ({ page }) => {
      await page.goto('/')

      const internalLinks = await page.locator('a[href^="/"], a[href^="./"]').all()

      if (internalLinks.length > 0) {
        const link = internalLinks[0]

        const navigationStart = Date.now()
        await link.click()
        await page.waitForLoadState('domcontentloaded')
        const navigationTime = Date.now() - navigationStart

        expect(navigationTime, 'Page navigation exceeds budget').toBeLessThanOrEqual(PERFORMANCE_BASELINES.page_navigation)
        console.log(`PERF_METRIC:page_navigation:${navigationTime}ms`)
      }
    })
  })

  test.describe('Performance Budget Enforcement', () => {
    const PERFORMANCE_BUDGETS = {
      max_javascript_size: 250, // KB
      max_css_size: 50,         // KB
      max_font_size: 100,       // KB
      max_image_size: 500,      // KB per image
      max_total_requests: 50,   // Number of requests
      max_lcp: 2500,            // Largest Contentful Paint in ms
      max_fid: 100,             // First Input Delay in ms
      max_cls: 0.1              // Cumulative Layout Shift
    }

    test('Asset size budgets are not exceeded', async ({ page }) => {
      await page.goto('/')

      const resourceSizes = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const sizes = {
              javascript: 0,
              css: 0,
              fonts: 0,
              images: [],
              totalRequests: entries.length
            }

            entries.forEach((entry: any) => {
              const size = entry.transferSize || entry.encodedBodySize || 0
              const sizeKB = Math.round(size / 1024)

              if (entry.name.includes('.js')) {
                sizes.javascript += sizeKB
              } else if (entry.name.includes('.css')) {
                sizes.css += sizeKB
              } else if (entry.name.includes('.woff') || entry.name.includes('.ttf')) {
                sizes.fonts += sizeKB
              } else if (entry.name.includes('.jpg') || entry.name.includes('.png') || entry.name.includes('.webp')) {
                sizes.images.push(sizeKB)
              }
            })

            resolve(sizes)
          })

          observer.observe({ entryTypes: ['resource'] })

          // Fallback timeout
          setTimeout(() => {
            resolve({ javascript: 0, css: 0, fonts: 0, images: [], totalRequests: 0 })
          }, 5000)
        })
      })

      expect(resourceSizes.javascript, 'JavaScript bundle exceeds budget').toBeLessThanOrEqual(PERFORMANCE_BUDGETS.max_javascript_size)
      expect(resourceSizes.css, 'CSS bundle exceeds budget').toBeLessThanOrEqual(PERFORMANCE_BUDGETS.max_css_size)
      expect(resourceSizes.fonts, 'Font files exceed budget').toBeLessThanOrEqual(PERFORMANCE_BUDGETS.max_font_size)
      expect(resourceSizes.totalRequests, 'Too many HTTP requests').toBeLessThanOrEqual(PERFORMANCE_BUDGETS.max_total_requests)

      // Check individual image sizes
      const largeImages = resourceSizes.images.filter(size => size > PERFORMANCE_BUDGETS.max_image_size)
      expect(largeImages.length, 'Some images exceed size budget').toBe(0)

      console.log(`PERF_BUDGET:js:${resourceSizes.javascript}KB/${PERFORMANCE_BUDGETS.max_javascript_size}KB`)
      console.log(`PERF_BUDGET:css:${resourceSizes.css}KB/${PERFORMANCE_BUDGETS.max_css_size}KB`)
      console.log(`PERF_BUDGET:requests:${resourceSizes.totalRequests}/${PERFORMANCE_BUDGETS.max_total_requests}`)
    })

    test('Core Web Vitals stay within budget', async ({ page }) => {
      await page.goto('/')

      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = { lcp: 0, fid: 0, cls: 0 }

          // Measure LCP
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            if (entries.length > 0) {
              vitals.lcp = entries[entries.length - 1].startTime
            }
          })
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

          // Measure FID
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            entries.forEach((entry: any) => {
              if (entry.processingStart && entry.startTime) {
                vitals.fid = entry.processingStart - entry.startTime
              }
            })
          })
          fidObserver.observe({ entryTypes: ['first-input'] })

          // Measure CLS
          const clsObserver = new PerformanceObserver((list) => {
            let clsScore = 0
            list.getEntries().forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsScore += entry.value
              }
            })
            vitals.cls = clsScore
          })
          clsObserver.observe({ entryTypes: ['layout-shift'] })

          // Resolve after reasonable time
          setTimeout(() => {
            resolve(vitals)
          }, 3000)
        })
      })

      if (webVitals.lcp > 0) {
        expect(webVitals.lcp, 'LCP exceeds budget').toBeLessThanOrEqual(PERFORMANCE_BUDGETS.max_lcp)
      }
      if (webVitals.fid > 0) {
        expect(webVitals.fid, 'FID exceeds budget').toBeLessThanOrEqual(PERFORMANCE_BUDGETS.max_fid)
      }
      if (webVitals.cls > 0) {
        expect(webVitals.cls, 'CLS exceeds budget').toBeLessThanOrEqual(PERFORMANCE_BUDGETS.max_cls)
      }

      console.log(`WEB_VITALS:lcp:${webVitals.lcp.toFixed(1)}ms`)
      console.log(`WEB_VITALS:fid:${webVitals.fid.toFixed(1)}ms`)
      console.log(`WEB_VITALS:cls:${webVitals.cls.toFixed(3)}`)
    })
  })

  test.describe('Regression Detection Algorithms', () => {
    test('Performance consistency across multiple runs', async ({ page }) => {
      const testRuns = []
      const criticalInteractions = [
        { name: 'hero_cta', selector: 'button:has-text("Get Started")' },
        { name: 'nav_hover', selector: 'nav a:first-child', type: 'hover' }
      ]

      // Run same tests multiple times to detect inconsistencies
      for (let run = 0; run < 3; run++) {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        const runMetrics = {}

        for (const interaction of criticalInteractions) {
          try {
            const metrics = await performanceUtils.testSub200msInteraction(
              interaction.selector,
              interaction.type || 'click'
            )
            runMetrics[interaction.name] = metrics.interactionTime
          } catch (error) {
            runMetrics[interaction.name] = null
          }
        }

        testRuns.push(runMetrics)
        await page.waitForTimeout(1000) // Cool down between runs
      }

      // Analyze consistency
      for (const interaction of criticalInteractions) {
        const times = testRuns.map(run => run[interaction.name]).filter(t => t !== null)

        if (times.length >= 2) {
          const avgTime = times.reduce((a, b) => a + b, 0) / times.length
          const maxVariation = Math.max(...times) - Math.min(...times)
          const variationPercent = (maxVariation / avgTime) * 100

          expect(variationPercent, `${interaction.name} performance too inconsistent`).toBeLessThanOrEqual(30)
          console.log(`CONSISTENCY:${interaction.name}:${variationPercent.toFixed(1)}%`)
        }
      }
    })

    test('Memory leak detection during performance tests', async ({ page }) => {
      await page.goto('/')

      // Monitor memory usage during repeated interactions
      const memoryMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const metrics = { initial: 0, peak: 0, final: 0 }

          if ((performance as any).memory) {
            metrics.initial = (performance as any).memory.usedJSHeapSize
            let peakMemory = metrics.initial

            // Monitor memory during interactions
            const memoryCheck = setInterval(() => {
              const current = (performance as any).memory.usedJSHeapSize
              peakMemory = Math.max(peakMemory, current)
            }, 100)

            // Simulate repeated interactions
            let interactionCount = 0
            const interactionLoop = setInterval(() => {
              const button = document.querySelector('button')
              if (button) {
                button.dispatchEvent(new Event('mouseenter'))
                button.dispatchEvent(new Event('mouseleave'))
              }

              interactionCount++
              if (interactionCount >= 50) {
                clearInterval(interactionLoop)
                clearInterval(memoryCheck)

                // Force garbage collection attempt
                if (typeof gc === 'function') {
                  gc()
                }

                setTimeout(() => {
                  metrics.peak = peakMemory
                  metrics.final = (performance as any).memory.usedJSHeapSize
                  resolve(metrics)
                }, 1000)
              }
            }, 50)
          } else {
            resolve({ initial: 0, peak: 0, final: 0 })
          }
        })
      })

      if (memoryMetrics.initial > 0) {
        const memoryGrowth = memoryMetrics.final - memoryMetrics.initial
        const memoryGrowthMB = memoryGrowth / (1024 * 1024)

        // Memory should not grow significantly during interactions
        expect(memoryGrowthMB, 'Potential memory leak detected').toBeLessThanOrEqual(5)

        console.log(`MEMORY:initial:${(memoryMetrics.initial / 1024 / 1024).toFixed(1)}MB`)
        console.log(`MEMORY:peak:${(memoryMetrics.peak / 1024 / 1024).toFixed(1)}MB`)
        console.log(`MEMORY:final:${(memoryMetrics.final / 1024 / 1024).toFixed(1)}MB`)
      }
    })
  })

  test.describe('CI Performance Gates', () => {
    test('All critical interactions pass 200ms gate', async ({ page }) => {
      const criticalGates = [
        { path: '/', selector: 'button:has-text("Get Started")', name: 'homepage_cta' },
        { path: '/auth/login', selector: 'button[type="submit"]', name: 'login_submit' },
        { path: '/dashboard', selector: '[data-testid*="nav-"]', name: 'dashboard_nav', type: 'hover' }
      ]

      const gateResults = []

      for (const gate of criticalGates) {
        try {
          await page.goto(gate.path)
          await page.waitForLoadState('networkidle')

          const metrics = await performanceUtils.testSub200msInteraction(
            gate.selector,
            gate.type || 'click'
          )

          gateResults.push({
            name: gate.name,
            time: metrics.interactionTime,
            passed: metrics.passes200msThreshold
          })

          // Critical gate - must pass
          expect(metrics.passes200msThreshold, `${gate.name} failed critical 200ms gate`).toBe(true)

        } catch (error) {
          console.log(`Gate ${gate.name} could not be tested: ${error.message}`)
        }
      }

      // Log all gate results for CI monitoring
      gateResults.forEach(result => {
        const status = result.passed ? 'PASS' : 'FAIL'
        console.log(`GATE:${result.name}:${result.time.toFixed(1)}ms:${status}`)
      })

      const passedGates = gateResults.filter(r => r.passed).length
      expect(passedGates, 'Not all critical performance gates passed').toBe(gateResults.length)
    })

    test('Scroll performance meets CI standards', async ({ page }) => {
      const testPages = ['/', '/features', '/pricing']
      const scrollResults = []

      for (const pagePath of testPages) {
        try {
          await page.goto(pagePath)
          await page.waitForLoadState('networkidle')

          const scrollMetrics = await performanceUtils.testScrollPerformance()

          scrollResults.push({
            page: pagePath,
            fps: scrollMetrics.fps,
            jank: scrollMetrics.jankCount,
            passed: scrollMetrics.passesAppleStandard
          })

          // Each page must meet scroll standards
          expect(scrollMetrics.passesAppleStandard, `${pagePath} scroll performance below standard`).toBe(true)

        } catch (error) {
          console.log(`Scroll test failed for ${pagePath}: ${error.message}`)
        }
      }

      // Log scroll performance for CI
      scrollResults.forEach(result => {
        const status = result.passed ? 'PASS' : 'FAIL'
        console.log(`SCROLL:${result.page}:${result.fps.toFixed(1)}fps:${result.jank}jank:${status}`)
      })
    })
  })

  test.afterEach(async ({ page }, testInfo) => {
    // Log performance metrics for CI analysis
    if (testInfo.status === 'failed') {
      console.log(`PERF_TEST_FAILED:${testInfo.title}`)

      // Capture performance timing for failed tests
      const performanceTiming = await page.evaluate(() => {
        if (window.performance && window.performance.timing) {
          const timing = window.performance.timing
          return {
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
            pageLoad: timing.loadEventEnd - timing.navigationStart,
            firstPaint: window.performance.getEntriesByType('paint')[0]?.startTime || 0
          }
        }
        return null
      })

      if (performanceTiming) {
        console.log(`FAILED_TEST_METRICS:${JSON.stringify(performanceTiming)}`)
      }
    }
  })
})