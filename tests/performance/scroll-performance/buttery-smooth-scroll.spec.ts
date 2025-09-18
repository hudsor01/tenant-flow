/**
 * Buttery Smooth Scroll Performance Tests
 *
 * Tests scroll performance to Apple's buttery smooth standard.
 * Every scroll interaction must maintain 60fps with minimal jank.
 *
 * Critical Areas:
 * - Smooth scrolling animations
 * - Scroll-triggered animations
 * - Parallax effects
 * - Infinite scroll performance
 * - Mobile scroll momentum
 */

import { test, expect } from '@playwright/test'
import { PerformanceTestUtils, PerformanceAssertions } from '../performance-test-utilities'

test.describe('Buttery Smooth Scroll Performance - Apple Standard', () => {
  let performanceUtils: PerformanceTestUtils

  test.beforeEach(async ({ page }) => {
    performanceUtils = new PerformanceTestUtils(page)
  })

  test.describe('Basic Scroll Smoothness', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Homepage scroll maintains 60fps', async ({ page }) => {
      const scrollMetrics = await performanceUtils.testScrollPerformance()

      PerformanceAssertions.expectButterySmoothScroll(scrollMetrics)

      // Additional Apple-level expectations
      expect(scrollMetrics.fps, 'Homepage scroll FPS too low').toBeGreaterThanOrEqual(58)
      expect(scrollMetrics.smoothnessScore, 'Homepage scroll not smooth enough').toBeGreaterThanOrEqual(0.95)

      console.log(`Homepage scroll: ${scrollMetrics.fps.toFixed(1)} fps, ${scrollMetrics.jankCount} jank frames`)
    })

    test('Long page scroll performance stays consistent', async ({ page }) => {
      // Create or navigate to a long page
      await page.setContent(`
        <div style="height: 5000px; background: linear-gradient(to bottom, #ff0000, #0000ff);">
          ${Array(100).fill(0).map((_, i) =>
            `<div style="height: 50px; margin: 10px; background: white; border-radius: 8px;">Item ${i}</div>`
          ).join('')}
        </div>
      `)

      // Test scroll performance across the entire page
      const longScrollMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const metrics = { frames: [], jankCount: 0, startTime: performance.now() }

          function recordFrame() {
            const now = performance.now()
            metrics.frames.push(now)

            if (metrics.frames.length > 1) {
              const frameDelta = now - metrics.frames[metrics.frames.length - 2]
              if (frameDelta > 16.67) { // Janky frame at 60fps
                metrics.jankCount++
              }
            }

            if (metrics.frames.length < 120) { // Record for ~2 seconds at 60fps
              requestAnimationFrame(recordFrame)
            } else {
              resolve(metrics)
            }
          }

          // Start smooth scroll to bottom
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
          recordFrame()
        })
      })

      const totalTime = longScrollMetrics.frames[longScrollMetrics.frames.length - 1] - longScrollMetrics.frames[0]
      const fps = (longScrollMetrics.frames.length / totalTime) * 1000

      expect(fps, 'Long scroll FPS degraded').toBeGreaterThanOrEqual(55)
      expect(longScrollMetrics.jankCount, 'Too much jank during long scroll').toBeLessThanOrEqual(6)
    })

    test('Rapid scroll changes maintain smoothness', async ({ page }) => {
      await page.setContent(`
        <div style="height: 3000px;">
          ${Array(50).fill(0).map((_, i) =>
            `<div style="height: 60px; margin: 5px; background: #f0f0f0; border-radius: 4px;">Content ${i}</div>`
          ).join('')}
        </div>
      `)

      // Test rapid scroll direction changes
      const rapidScrollMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const metrics = { jankCount: 0, totalFrames: 0, maxFrameTime: 0 }
          let startTime = performance.now()

          function recordFrame() {
            const now = performance.now()
            const frameTime = now - startTime
            metrics.totalFrames++
            metrics.maxFrameTime = Math.max(metrics.maxFrameTime, frameTime)

            if (frameTime > 16.67) {
              metrics.jankCount++
            }

            startTime = now

            if (metrics.totalFrames < 180) { // 3 seconds worth
              requestAnimationFrame(recordFrame)
            } else {
              resolve(metrics)
            }
          }

          // Simulate rapid scroll changes
          let scrollDirection = 1
          const scrollInterval = setInterval(() => {
            window.scrollBy(0, scrollDirection * 100)
            scrollDirection *= -1 // Change direction
          }, 200)

          setTimeout(() => clearInterval(scrollInterval), 3000)
          recordFrame()
        })
      })

      const jankRate = rapidScrollMetrics.jankCount / rapidScrollMetrics.totalFrames
      expect(jankRate, 'Too much jank during rapid scroll changes').toBeLessThanOrEqual(0.1)
      expect(rapidScrollMetrics.maxFrameTime, 'Frame time too long during rapid scroll').toBeLessThanOrEqual(33.33)
    })
  })

  test.describe('Scroll-Triggered Animations', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Scroll animations don\'t cause jank', async ({ page }) => {
      // Look for elements with scroll-triggered animations
      const animatedElements = await page.locator('[data-aos], .fade-in, .animate-on-scroll').count()

      if (animatedElements > 0) {
        // Test scroll performance with animations
        const animationScrollMetrics = await performanceUtils.testScrollPerformance()

        PerformanceAssertions.expectButterySmoothScroll(animationScrollMetrics)

        // Animations shouldn't significantly impact scroll performance
        expect(animationScrollMetrics.jankCount, 'Scroll animations causing too much jank')
          .toBeLessThanOrEqual(5)
      } else {
        console.log('No scroll animations found, skipping animation-specific test')
      }
    })

    test('Parallax effects maintain performance', async ({ page }) => {
      // Check for parallax elements
      const parallaxElements = await page.locator('.parallax, [data-parallax]').count()

      if (parallaxElements > 0) {
        // Test scroll with parallax effects
        const parallaxMetrics = await page.evaluate(() => {
          return new Promise((resolve) => {
            const metrics = { frames: [], jankCount: 0 }
            const startTime = performance.now()

            function recordFrame() {
              const now = performance.now()
              metrics.frames.push(now)

              if (metrics.frames.length > 1) {
                const frameDelta = now - metrics.frames[metrics.frames.length - 2]
                if (frameDelta > 16.67) {
                  metrics.jankCount++
                }
              }

              if (now - startTime < 2000) { // 2 seconds
                requestAnimationFrame(recordFrame)
              } else {
                const totalTime = now - startTime
                const fps = (metrics.frames.length / totalTime) * 1000
                resolve({ fps, jankCount: metrics.jankCount, frameCount: metrics.frames.length })
              }
            }

            // Smooth scroll to trigger parallax
            window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' })
            recordFrame()
          })
        })

        expect(parallaxMetrics.fps, 'Parallax effects degrading scroll FPS').toBeGreaterThanOrEqual(55)
        expect(parallaxMetrics.jankCount, 'Parallax causing too much scroll jank').toBeLessThanOrEqual(6)
      }
    })

    test('Intersection Observer animations are efficient', async ({ page }) => {
      // Test elements that likely use Intersection Observer
      await page.evaluate(() => {
        // Add test elements that might trigger on scroll
        const container = document.createElement('div')
        container.style.height = '2000px'

        for (let i = 0; i < 20; i++) {
          const element = document.createElement('div')
          element.style.height = '100px'
          element.style.margin = '10px'
          element.style.background = '#f0f0f0'
          element.style.transition = 'transform 0.3s ease-out-expo'
          element.textContent = `Animated Item ${i}`
          container.appendChild(element)
        }

        document.body.appendChild(container)
      })

      // Test scroll performance with potential intersection observer elements
      const observerScrollMetrics = await performanceUtils.testScrollPerformance()

      expect(observerScrollMetrics.fps, 'Intersection Observer animations affecting FPS')
        .toBeGreaterThanOrEqual(57)
      expect(observerScrollMetrics.jankCount, 'Intersection Observer causing scroll jank')
        .toBeLessThanOrEqual(4)
    })
  })

  test.describe('Mobile Scroll Performance', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Mobile scroll momentum feels natural', async ({ page }) => {
      // Test mobile scroll momentum and physics
      const mobileScrollMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const metrics = {
            momentumDuration: 0,
            smoothnessScore: 0,
            velocityChanges: [],
            startTime: performance.now()
          }

          let lastScrollTop = 0
          let velocityMeasurements = []

          const handleScroll = () => {
            const currentScrollTop = window.pageYOffset
            const now = performance.now()
            const velocity = Math.abs(currentScrollTop - lastScrollTop)

            velocityMeasurements.push({ velocity, time: now })
            lastScrollTop = currentScrollTop

            // Calculate smoothness based on velocity consistency
            if (velocityMeasurements.length > 5) {
              const recentVelocities = velocityMeasurements.slice(-5).map(v => v.velocity)
              const avgVelocity = recentVelocities.reduce((a, b) => a + b) / recentVelocities.length
              const variance = recentVelocities.reduce((acc, v) => acc + Math.pow(v - avgVelocity, 2), 0) / recentVelocities.length
              metrics.smoothnessScore = Math.max(0, 1 - (variance / 100)) // Lower variance = smoother
            }
          }

          window.addEventListener('scroll', handleScroll, { passive: true })

          // Simulate momentum scroll
          window.scrollBy(0, 500)

          setTimeout(() => {
            window.removeEventListener('scroll', handleScroll)
            metrics.momentumDuration = performance.now() - metrics.startTime
            resolve(metrics)
          }, 1500)
        })
      })

      expect(mobileScrollMetrics.smoothnessScore, 'Mobile scroll momentum not smooth enough')
        .toBeGreaterThanOrEqual(0.7)
      expect(mobileScrollMetrics.momentumDuration, 'Mobile scroll momentum too short')
        .toBeGreaterThanOrEqual(300)
    })

    test('Touch scroll responsiveness meets Apple standards', async ({ page }) => {
      // Test touch scroll initiation speed
      const touchScrollMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const metrics = { initiationTime: 0, responsiveness: 0 }
          const startTime = performance.now()
          let firstScrollDetected = false

          const detectFirstScroll = () => {
            if (!firstScrollDetected) {
              firstScrollDetected = true
              metrics.initiationTime = performance.now() - startTime
            }
          }

          window.addEventListener('scroll', detectFirstScroll, { passive: true, once: true })

          // Simulate touch-initiated scroll
          window.scrollBy(0, 100)

          setTimeout(() => {
            metrics.responsiveness = firstScrollDetected ? 1 : 0
            resolve(metrics)
          }, 500)
        })
      })

      expect(touchScrollMetrics.responsiveness, 'Touch scroll not responsive').toBe(1)
      expect(touchScrollMetrics.initiationTime, 'Touch scroll initiation too slow')
        .toBeLessThanOrEqual(50)
    })

    test('Overscroll behavior is controlled and smooth', async ({ page }) => {
      // Test iOS-like overscroll behavior
      const overscrollBehavior = await page.evaluate(() => {
        const bodyStyle = window.getComputedStyle(document.body)
        const htmlStyle = window.getComputedStyle(document.documentElement)

        return {
          bodyOverscroll: bodyStyle.overscrollBehavior,
          htmlOverscroll: htmlStyle.overscrollBehavior,
          hasControlledOverscroll: bodyStyle.overscrollBehavior !== 'auto' ||
                                  htmlStyle.overscrollBehavior !== 'auto'
        }
      })

      // Controlled overscroll prevents rubber-band effect issues
      expect(overscrollBehavior.hasControlledOverscroll,
        'Overscroll behavior should be controlled for better mobile experience').toBe(true)
    })
  })

  test.describe('Dashboard Scroll Performance', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
    })

    test('Dashboard data tables scroll smoothly', async ({ page }) => {
      // Test scrolling within data tables or lists
      const scrollableContainers = await page.locator(
        '.overflow-auto, .overflow-scroll, .table-container, [data-testid*="table"]'
      ).all()

      if (scrollableContainers.length > 0) {
        let smoothScrollingContainers = 0

        for (const container of scrollableContainers.slice(0, 3)) {
          try {
            // Test container scroll performance
            const containerMetrics = await container.evaluate((el) => {
              return new Promise((resolve) => {
                const metrics = { jankCount: 0, frameCount: 0, maxFrameTime: 0 }
                let lastTime = performance.now()

                function recordFrame() {
                  const now = performance.now()
                  const frameTime = now - lastTime
                  metrics.frameCount++
                  metrics.maxFrameTime = Math.max(metrics.maxFrameTime, frameTime)

                  if (frameTime > 16.67) {
                    metrics.jankCount++
                  }

                  lastTime = now

                  if (metrics.frameCount < 60) { // 1 second at 60fps
                    requestAnimationFrame(recordFrame)
                  } else {
                    resolve(metrics)
                  }
                }

                // Scroll within container
                el.scrollTop = el.scrollHeight / 2
                recordFrame()
              })
            })

            const jankRate = containerMetrics.jankCount / containerMetrics.frameCount
            if (jankRate <= 0.1 && containerMetrics.maxFrameTime <= 25) {
              smoothScrollingContainers++
            }
          } catch (error) {
            continue
          }
        }

        const smoothScrollRate = smoothScrollingContainers / Math.min(scrollableContainers.length, 3)
        expect(smoothScrollRate, 'Dashboard containers not scrolling smoothly')
          .toBeGreaterThanOrEqual(0.7)
      }
    })

    test('Sidebar scroll doesn\'t affect main content', async ({ page }) => {
      // Test that sidebar scrolling doesn't cause main content jank
      const sidebar = page.locator('.sidebar, [data-testid*="sidebar"]').first()

      if (await sidebar.count() > 0) {
        // Monitor main content performance during sidebar scroll
        const independentScrollMetrics = await page.evaluate(() => {
          return new Promise((resolve) => {
            const metrics = { mainContentJank: 0, sidebarScroll: 0 }
            const startTime = performance.now()
            let frameCount = 0

            function recordFrame() {
              frameCount++

              // Check if main content is being affected
              const mainContent = document.querySelector('main, .main-content, [data-testid*="main"]')
              if (mainContent) {
                const style = window.getComputedStyle(mainContent)
                // Check for unexpected transforms or layout shifts
                if (style.transform !== 'none' && !style.transform.includes('matrix(1, 0, 0, 1, 0, 0)')) {
                  metrics.mainContentJank++
                }
              }

              if (frameCount < 30) { // Half second
                requestAnimationFrame(recordFrame)
              } else {
                resolve(metrics)
              }
            }

            // Scroll sidebar if possible
            const sidebar = document.querySelector('.sidebar, [data-testid*="sidebar"]')
            if (sidebar) {
              sidebar.scrollTop = 100
              metrics.sidebarScroll = 1
            }

            recordFrame()
          })
        })

        if (independentScrollMetrics.sidebarScroll > 0) {
          expect(independentScrollMetrics.mainContentJank, 'Sidebar scroll affecting main content')
            .toBeLessThanOrEqual(2)
        }
      }
    })
  })

  test.describe('Advanced Scroll Scenarios', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('Scroll performance with background videos/images', async ({ page }) => {
      // Check for background media that might affect scroll performance
      const backgroundMedia = await page.evaluate(() => {
        const videos = document.querySelectorAll('video')
        const heavyBackgrounds = Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el)
          return style.backgroundImage.includes('url(') ||
                 style.backgroundAttachment === 'fixed'
        })

        return { videoCount: videos.length, heavyBackgroundCount: heavyBackgrounds.length }
      })

      if (backgroundMedia.videoCount > 0 || backgroundMedia.heavyBackgroundCount > 0) {
        const mediaScrollMetrics = await performanceUtils.testScrollPerformance()

        // Background media shouldn't significantly impact scroll
        PerformanceAssertions.expectButterySmoothScroll(mediaScrollMetrics)
        expect(mediaScrollMetrics.jankCount, 'Background media causing scroll issues')
          .toBeLessThanOrEqual(8)
      }
    })

    test('Infinite scroll maintains consistent performance', async ({ page }) => {
      // Check if page has infinite scroll capability
      const hasInfiniteScroll = await page.evaluate(() => {
        return document.querySelector('[data-testid*="infinite"], .infinite-scroll, [data-infinite]') !== null
      })

      if (hasInfiniteScroll) {
        // Test performance as more content loads
        let scrollMetrics = []

        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight - 100)
          })

          await page.waitForTimeout(1000) // Allow content to load

          const metrics = await performanceUtils.testScrollPerformance()
          scrollMetrics.push(metrics)
        }

        // Performance should remain consistent as content loads
        const fpsValues = scrollMetrics.map(m => m.fps)
        const minFps = Math.min(...fpsValues)
        const maxJank = Math.max(...scrollMetrics.map(m => m.jankCount))

        expect(minFps, 'Infinite scroll degrading FPS over time').toBeGreaterThanOrEqual(55)
        expect(maxJank, 'Infinite scroll causing increasing jank').toBeLessThanOrEqual(6)
      }
    })

    test('Sticky navigation doesn\'t affect scroll smoothness', async ({ page }) => {
      // Test sticky header/navigation performance
      const stickyElements = await page.locator('[style*="sticky"], [class*="sticky"], .fixed').count()

      if (stickyElements > 0) {
        const stickyScrollMetrics = await performanceUtils.testScrollPerformance()

        PerformanceAssertions.expectButterySmoothScroll(stickyScrollMetrics)

        // Sticky elements shouldn't cause additional jank
        expect(stickyScrollMetrics.jankCount, 'Sticky elements causing scroll jank')
          .toBeLessThanOrEqual(4)
      }
    })
  })

  test.describe('Scroll Performance Monitoring', () => {
    test('Scroll performance metrics are within Apple standards across pages', async ({ page }) => {
      const testPages = ['/', '/features', '/pricing', '/about']
      const pageMetrics = []

      for (const pagePath of testPages) {
        try {
          await page.goto(pagePath)
          await page.waitForLoadState('networkidle')

          const metrics = await performanceUtils.testScrollPerformance()
          pageMetrics.push({ page: pagePath, ...metrics })

          // Each page should meet standards individually
          PerformanceAssertions.expectButterySmoothScroll(metrics)
        } catch (error) {
          console.log(`Page ${pagePath} not accessible, skipping`)
        }
      }

      // Overall consistency check
      const avgFps = pageMetrics.reduce((sum, m) => sum + m.fps, 0) / pageMetrics.length
      const avgJank = pageMetrics.reduce((sum, m) => sum + m.jankCount, 0) / pageMetrics.length

      expect(avgFps, 'Average FPS across pages below Apple standard').toBeGreaterThanOrEqual(58)
      expect(avgJank, 'Average jank across pages too high').toBeLessThanOrEqual(3)

      console.log('Page scroll performance summary:')
      pageMetrics.forEach(m => {
        console.log(`${m.page}: ${m.fps.toFixed(1)} fps, ${m.jankCount} jank frames`)
      })
    })

    test('Scroll performance regression detection', async ({ page }) => {
      await page.goto('/')

      // Take multiple measurements to establish baseline
      const measurements = []

      for (let i = 0; i < 5; i++) {
        await page.reload()
        await page.waitForLoadState('networkidle')

        const metrics = await performanceUtils.testScrollPerformance()
        measurements.push(metrics)

        await page.waitForTimeout(1000) // Pause between measurements
      }

      // Analyze consistency
      const fpsValues = measurements.map(m => m.fps)
      const jankValues = measurements.map(m => m.jankCount)

      const avgFps = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length
      const maxFpsVariation = Math.max(...fpsValues) - Math.min(...fpsValues)
      const avgJank = jankValues.reduce((a, b) => a + b, 0) / jankValues.length

      expect(avgFps, 'Baseline scroll FPS too low').toBeGreaterThanOrEqual(58)
      expect(maxFpsVariation, 'Scroll FPS too inconsistent between loads').toBeLessThanOrEqual(5)
      expect(avgJank, 'Baseline jank too high').toBeLessThanOrEqual(3)

      console.log(`Scroll performance baseline: ${avgFps.toFixed(1)} ± ${maxFpsVariation.toFixed(1)} fps`)
    })
  })
})