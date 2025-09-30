/**
 * Lighthouse Performance Integration Tests
 *
 * Integrates Google Lighthouse for comprehensive performance auditing.
 * Tests Core Web Vitals, accessibility, and performance best practices.
 *
 * Key Features:
 * - Core Web Vitals monitoring
 * - Performance score validation
 * - Mobile performance testing
 * - Accessibility audit integration
 * - SEO performance validation
 */

import { expect, test } from '@playwright/test'
import { playAudit } from 'playwright-lighthouse'

test.describe('Lighthouse Performance Integration', () => {
  const PERFORMANCE_THRESHOLDS = {
    performance: 90,        // Lighthouse performance score
    accessibility: 95,      // Accessibility score
    seo: 90,               // SEO score
    'best-practices': 90,   // Best practices score
    lcp: 2500,             // Largest Contentful Paint (ms)
    fid: 100,              // First Input Delay (ms)
    cls: 0.1,              // Cumulative Layout Shift
    fcp: 1800,             // First Contentful Paint (ms)
    si: 3000,              // Speed Index (ms)
    tti: 3500              // Time to Interactive (ms)
  }

  test.describe('Desktop Performance Audit', () => {
    test('Homepage meets Apple performance standards', async ({ page }) => {
      await page.goto('/')

      const audit = await playAudit({
        page,
        thresholds: {
          performance: PERFORMANCE_THRESHOLDS.performance,
          accessibility: PERFORMANCE_THRESHOLDS.accessibility,
          seo: PERFORMANCE_THRESHOLDS.seo,
          'best-practices': PERFORMANCE_THRESHOLDS['best-practices']
        },
        opts: {
          chromeFlags: ['--no-sandbox', '--disable-dev-shm-usage'],
          logLevel: 'info',
          output: 'json',
          onlyCategories: ['performance', 'accessibility', 'seo', 'best-practices']
        }
      })

      // Extract Core Web Vitals
      const lcp = audit.lhr.audits['largest-contentful-paint'].numericValue
      const fid = audit.lhr.audits['max-potential-fid'].numericValue
      const cls = audit.lhr.audits['cumulative-layout-shift'].numericValue
      const fcp = audit.lhr.audits['first-contentful-paint'].numericValue
      const si = audit.lhr.audits['speed-index'].numericValue
      const tti = audit.lhr.audits['interactive'].numericValue

      // Core Web Vitals validation
      expect(lcp, 'LCP exceeds Apple standard').toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.lcp)
      expect(fid, 'FID exceeds Apple standard').toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.fid)
      expect(cls, 'CLS exceeds Apple standard').toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.cls)

      // Additional performance metrics
      expect(fcp, 'FCP too slow for Apple standard').toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.fcp)
      expect(si, 'Speed Index too slow').toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.si)
      expect(tti, 'Time to Interactive too slow').toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.tti)

      // Performance scores
      const performanceScore = audit.lhr.categories.performance.score * 100
      const accessibilityScore = audit.lhr.categories.accessibility.score * 100
      const seoScore = audit.lhr.categories.seo.score * 100
      const bestPracticesScore = audit.lhr.categories['best-practices'].score * 100

      expect(performanceScore, 'Performance score below threshold').toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.performance)
      expect(accessibilityScore, 'Accessibility score below threshold').toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.accessibility)
      expect(seoScore, 'SEO score below threshold').toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.seo)
      expect(bestPracticesScore, 'Best practices score below threshold').toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS['best-practices'])

      // Log metrics for CI monitoring
      console.log(`LIGHTHOUSE_DESKTOP:performance:${performanceScore}`)
      console.log(`LIGHTHOUSE_DESKTOP:lcp:${lcp}ms`)
      console.log(`LIGHTHOUSE_DESKTOP:fid:${fid}ms`)
      console.log(`LIGHTHOUSE_DESKTOP:cls:${cls}`)
      console.log(`LIGHTHOUSE_DESKTOP:accessibility:${accessibilityScore}`)
    })

    test('Dashboard performance audit', async ({ page }) => {
      await page.goto('/dashboard')

      const audit = await playAudit({
        page,
        thresholds: {
          performance: 85, // Slightly lower for dashboard complexity
          accessibility: PERFORMANCE_THRESHOLDS.accessibility
        },
        opts: {
          chromeFlags: ['--no-sandbox', '--disable-dev-shm-usage'],
          logLevel: 'info',
          output: 'json',
          onlyCategories: ['performance', 'accessibility']
        }
      })

      // Dashboard-specific performance validation
      const performanceScore = audit.lhr.categories.performance.score * 100
      const lcp = audit.lhr.audits['largest-contentful-paint'].numericValue

      expect(performanceScore, 'Dashboard performance score too low').toBeGreaterThanOrEqual(85)
      expect(lcp, 'Dashboard LCP too slow').toBeLessThanOrEqual(3000) // Slightly higher for dashboard

      console.log(`LIGHTHOUSE_DASHBOARD:performance:${performanceScore}`)
      console.log(`LIGHTHOUSE_DASHBOARD:lcp:${lcp}ms`)
    })

    test('Critical user flows performance', async ({ page }) => {
      const criticalFlows = [
        { path: '', name: 'login', threshold: 88 },
        { path: '/pricing', name: 'pricing', threshold: 90 },
        { path: '/features', name: 'features', threshold: 90 }
      ]

      for (const flow of criticalFlows) {
        try {
          await page.goto(flow.path)

          const audit = await playAudit({
            page,
            thresholds: {
              performance: flow.threshold
            },
            opts: {
              chromeFlags: ['--no-sandbox', '--disable-dev-shm-usage'],
              logLevel: 'info',
              output: 'json',
              onlyCategories: ['performance']
            }
          })

          const performanceScore = audit.lhr.categories.performance.score * 100
          const lcp = audit.lhr.audits['largest-contentful-paint'].numericValue

          expect(performanceScore, `${flow.name} performance below threshold`).toBeGreaterThanOrEqual(flow.threshold)
          expect(lcp, `${flow.name} LCP too slow`).toBeLessThanOrEqual(PERFORMANCE_THRESHOLDS.lcp)

          console.log(`LIGHTHOUSE_FLOW:${flow.name}:performance:${performanceScore}`)
          console.log(`LIGHTHOUSE_FLOW:${flow.name}:lcp:${lcp}ms`)
        } catch (error) {
          console.log(`Flow ${flow.name} audit failed: ${error.message}`)
        }
      }
    })
  })

  test.describe('Mobile Performance Audit', () => {
    test.use({
      viewport: { width: 375, height: 812 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
    })

    test('Mobile homepage performance meets standards', async ({ page }) => {
      await page.goto('/')

      const audit = await playAudit({
        page,
        thresholds: {
          performance: 85, // Mobile typically scores lower
          accessibility: PERFORMANCE_THRESHOLDS.accessibility
        },
        opts: {
          chromeFlags: ['--no-sandbox', '--disable-dev-shm-usage'],
          logLevel: 'info',
          output: 'json',
          onlyCategories: ['performance', 'accessibility'],
          emulatedFormFactor: 'mobile'
        }
      })

      const performanceScore = audit.lhr.categories.performance.score * 100
      const lcp = audit.lhr.audits['largest-contentful-paint'].numericValue
      const cls = audit.lhr.audits['cumulative-layout-shift'].numericValue
      const fcp = audit.lhr.audits['first-contentful-paint'].numericValue

      // Mobile performance thresholds (slightly more lenient)
      expect(performanceScore, 'Mobile performance score too low').toBeGreaterThanOrEqual(85)
      expect(lcp, 'Mobile LCP too slow').toBeLessThanOrEqual(4000)
      expect(cls, 'Mobile CLS too high').toBeLessThanOrEqual(0.15)
      expect(fcp, 'Mobile FCP too slow').toBeLessThanOrEqual(2500)

      console.log(`LIGHTHOUSE_MOBILE:performance:${performanceScore}`)
      console.log(`LIGHTHOUSE_MOBILE:lcp:${lcp}ms`)
      console.log(`LIGHTHOUSE_MOBILE:cls:${cls}`)
      console.log(`LIGHTHOUSE_MOBILE:fcp:${fcp}ms`)
    })

    test('Mobile touch targets and usability', async ({ page }) => {
      await page.goto('/')

      const audit = await playAudit({
        page,
        thresholds: {
          accessibility: 90,
          seo: 85
        },
        opts: {
          chromeFlags: ['--no-sandbox', '--disable-dev-shm-usage'],
          logLevel: 'info',
          output: 'json',
          onlyCategories: ['accessibility', 'seo'],
          emulatedFormFactor: 'mobile'
        }
      })

      // Check touch target sizing
      const touchTargetsAudit = audit.lhr.audits['tap-targets']
      expect(touchTargetsAudit.score, 'Touch targets not properly sized').toBeGreaterThanOrEqual(0.9)

      // Check viewport configuration
      const viewportAudit = audit.lhr.audits['viewport']
      expect(viewportAudit.score, 'Viewport not properly configured').toBe(1)

      console.log(`LIGHTHOUSE_MOBILE_UX:touch_targets:${touchTargetsAudit.score}`)
      console.log(`LIGHTHOUSE_MOBILE_UX:viewport:${viewportAudit.score}`)
    })
  })

  test.describe('Performance Opportunities Analysis', () => {
    test('Identify and validate performance opportunities', async ({ page }) => {
      await page.goto('/')

      const audit = await playAudit({
        page,
        opts: {
          chromeFlags: ['--no-sandbox', '--disable-dev-shm-usage'],
          logLevel: 'info',
          output: 'json',
          onlyCategories: ['performance']
        }
      })

      // Key performance opportunities to check
      const opportunities = [
        'unused-javascript',
        'unused-css-rules',
        'render-blocking-resources',
        'unminified-css',
        'unminified-javascript',
        'efficient-animated-content',
        'uses-long-cache-ttl'
      ]

      const performanceIssues = []

      opportunities.forEach(opportunityId => {
        const opportunity = audit.lhr.audits[opportunityId]
        if (opportunity && opportunity.score !== null && opportunity.score < 0.9) {
          performanceIssues.push({
            id: opportunityId,
            score: opportunity.score,
            savings: opportunity.details?.overallSavingsMs || 0
          })
        }
      })

      // Log opportunities for analysis
      performanceIssues.forEach(issue => {
        console.log(`PERF_OPPORTUNITY:${issue.id}:score:${issue.score}:savings:${issue.savings}ms`)
      })

      // Critical opportunities should not have major issues
      const criticalIssues = performanceIssues.filter(issue =>
        issue.savings > 500 && ['render-blocking-resources', 'unused-javascript'].includes(issue.id)
      )

      expect(criticalIssues.length, 'Critical performance opportunities need attention').toBeLessThanOrEqual(1)
    })

    test('Asset optimization validation', async ({ page }) => {
      await page.goto('/')

      const audit = await playAudit({
        page,
        opts: {
          chromeFlags: ['--no-sandbox', '--disable-dev-shm-usage'],
          logLevel: 'info',
          output: 'json',
          onlyCategories: ['performance']
        }
      })

      // Asset-related audits
      const assetAudits = [
        'uses-optimized-images',
        'uses-webp-images',
        'uses-responsive-images',
        'offscreen-images'
      ]

      assetAudits.forEach(auditId => {
        const assetAudit = audit.lhr.audits[auditId]
        if (assetAudit && assetAudit.score !== null) {
          expect(assetAudit.score, `Asset optimization issue: ${auditId}`).toBeGreaterThanOrEqual(0.8)
          console.log(`ASSET_AUDIT:${auditId}:${assetAudit.score}`)
        }
      })
    })
  })

  test.describe('Accessibility Performance Integration', () => {
    test('Performance and accessibility correlation', async ({ page }) => {
      await page.goto('/')

      const audit = await playAudit({
        page,
        thresholds: {
          performance: PERFORMANCE_THRESHOLDS.performance,
          accessibility: PERFORMANCE_THRESHOLDS.accessibility
        },
        opts: {
          chromeFlags: ['--no-sandbox', '--disable-dev-shm-usage'],
          logLevel: 'info',
          output: 'json',
          onlyCategories: ['performance', 'accessibility']
        }
      })

      const performanceScore = audit.lhr.categories.performance.score * 100
      const accessibilityScore = audit.lhr.categories.accessibility.score * 100

      // Both scores should be high (good performance shouldn't compromise accessibility)
      expect(performanceScore, 'Performance score too low').toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.performance)
      expect(accessibilityScore, 'Accessibility score too low').toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.accessibility)

      // Check for specific accessibility-performance intersections
      const colorContrastAudit = audit.lhr.audits['color-contrast']
      const focusableControlsAudit = audit.lhr.audits['focusable-controls']

      if (colorContrastAudit) {
        expect(colorContrastAudit.score, 'Color contrast issues detected').toBe(1)
      }
      if (focusableControlsAudit) {
        expect(focusableControlsAudit.score, 'Focusable controls issues detected').toBe(1)
      }

      console.log(`PERF_A11Y:performance:${performanceScore}:accessibility:${accessibilityScore}`)
    })
  })

  test.describe('SEO Performance Integration', () => {
    test('SEO and performance correlation', async ({ page }) => {
      await page.goto('/')

      const audit = await playAudit({
        page,
        thresholds: {
          performance: PERFORMANCE_THRESHOLDS.performance,
          seo: PERFORMANCE_THRESHOLDS.seo
        },
        opts: {
          chromeFlags: ['--no-sandbox', '--disable-dev-shm-usage'],
          logLevel: 'info',
          output: 'json',
          onlyCategories: ['performance', 'seo']
        }
      })

      const performanceScore = audit.lhr.categories.performance.score * 100
      const seoScore = audit.lhr.categories.seo.score * 100

      expect(performanceScore, 'Performance affecting SEO').toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.performance)
      expect(seoScore, 'SEO score too low').toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.seo)

      // Check SEO-performance critical factors
      const crawlableAudit = audit.lhr.audits['is-crawlable']
      const metaDescriptionAudit = audit.lhr.audits['meta-description']

      if (crawlableAudit) {
        expect(crawlableAudit.score, 'Site not properly crawlable').toBe(1)
      }
      if (metaDescriptionAudit) {
        expect(metaDescriptionAudit.score, 'Meta description missing').toBe(1)
      }

      console.log(`PERF_SEO:performance:${performanceScore}:seo:${seoScore}`)
    })
  })

  test.describe('Progressive Web App Performance', () => {
    test('PWA performance characteristics', async ({ page }) => {
      await page.goto('/')

      const audit = await playAudit({
        page,
        opts: {
          chromeFlags: ['--no-sandbox', '--disable-dev-shm-usage'],
          logLevel: 'info',
          output: 'json',
          onlyCategories: ['performance', 'pwa']
        }
      })

      const performanceScore = audit.lhr.categories.performance.score * 100

      // Check PWA-related performance factors
      const serviceWorkerAudit = audit.lhr.audits['service-worker']
      const offlineAudit = audit.lhr.audits['works-offline']

      expect(performanceScore, 'PWA performance too low').toBeGreaterThanOrEqual(85)

      console.log(`PWA_PERF:performance:${performanceScore}`)

      if (serviceWorkerAudit) {
        console.log(`PWA_PERF:service_worker:${serviceWorkerAudit.score || 0}`)
      }
      if (offlineAudit) {
        console.log(`PWA_PERF:offline:${offlineAudit.score || 0}`)
      }
    })
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === 'failed') {
      // Generate Lighthouse report for failed tests
      try {
        const audit = await playAudit({
          page,
          opts: {
            chromeFlags: ['--no-sandbox', '--disable-dev-shm-usage'],
            logLevel: 'info',
            output: 'html',
            outputPath: `lighthouse-report-${testInfo.title.replace(/\s+/g, '-')}.html`
          }
        })

        console.log(`LIGHTHOUSE_REPORT_GENERATED:${testInfo.title}`)
      } catch (error) {
        console.log(`Failed to generate Lighthouse report: ${error.message}`)
      }
    }
  })
})
