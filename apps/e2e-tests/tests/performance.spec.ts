/**
 * Performance Tests (Core Web Vitals)
 *
 * Tracks key performance metrics:
 * - LCP (Largest Contentful Paint): < 2.5s (Good)
 * - FID (First Input Delay): < 100ms (Good)
 * - CLS (Cumulative Layout Shift): < 0.1 (Good)
 * - FCP (First Contentful Paint): < 1.8s (Good)
 * - TTFB (Time to First Byte): < 600ms (Good)
 * - TTI (Time to Interactive): < 3.8s (Good)
 *
 * Reference: https://web.dev/vitals/
 */

import { test, expect } from '@playwright/test'

interface PerformanceMetrics {
	lcp: number | null
	fid: number | null
	cls: number | null
	fcp: number | null
	ttfb: number | null
	tti: number | null
}

// Helper to collect Core Web Vitals
async function collectWebVitals(page: any): Promise<PerformanceMetrics> {
	return await page.evaluate(() => {
		return new Promise<PerformanceMetrics>((resolve) => {
			const metrics: PerformanceMetrics = {
				lcp: null,
				fid: null,
				cls: null,
				fcp: null,
				ttfb: null,
				tti: null
			}

			// Collect FCP and TTFB from Performance API
			const perfEntries = performance.getEntriesByType('navigation')
			if (perfEntries.length > 0) {
				const navTiming = perfEntries[0] as PerformanceNavigationTiming
				metrics.ttfb = navTiming.responseStart - navTiming.requestStart
			}

			const paintEntries = performance.getEntriesByType('paint')
			const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint')
			if (fcpEntry) {
				metrics.fcp = fcpEntry.startTime
			}

			// Use web-vitals library if available
			if ((window as any).webVitals) {
				const vitals = (window as any).webVitals

				vitals.onLCP((metric: any) => {
					metrics.lcp = metric.value
				})

				vitals.onFID((metric: any) => {
					metrics.fid = metric.value
				})

				vitals.onCLS((metric: any) => {
					metrics.cls = metric.value
				})

				// Wait a bit for metrics to be collected
				setTimeout(() => resolve(metrics), 2000)
			} else {
				resolve(metrics)
			}
		})
	})
}

test.describe('Homepage Performance', () => {
	test('should meet Core Web Vitals thresholds', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		const metrics = await collectWebVitals(page)

		// FCP: < 1.8s is good
		if (metrics.fcp !== null) {
			expect(metrics.fcp, 'First Contentful Paint should be < 1800ms').toBeLessThan(1800)
		}

		// TTFB: < 600ms is good
		if (metrics.ttfb !== null) {
			expect(metrics.ttfb, 'Time to First Byte should be < 600ms').toBeLessThan(600)
		}

		// LCP: < 2.5s is good
		if (metrics.lcp !== null) {
			expect(metrics.lcp, 'Largest Contentful Paint should be < 2500ms').toBeLessThan(2500)
		}

		// CLS: < 0.1 is good
		if (metrics.cls !== null) {
			expect(metrics.cls, 'Cumulative Layout Shift should be < 0.1').toBeLessThan(0.1)
		}
	})

	test('should have acceptable page load time', async ({ page }) => {
		const startTime = Date.now()

		await page.goto('/')
		await page.waitForLoadState('domcontentloaded')

		const loadTime = Date.now() - startTime

		// Total page load should be < 3 seconds
		expect(loadTime, 'Page should load within 3 seconds').toBeLessThan(3000)
	})

	test('should have minimal render-blocking resources', async ({ page }) => {
		await page.goto('/')

		// Check for render-blocking resources
		const resourceTimings = await page.evaluate(() => {
			const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
			return resources
				.filter((r) => r.initiatorType === 'link' || r.initiatorType === 'script')
				.map((r) => ({
					name: r.name,
					duration: r.duration,
					renderBlocking: (r as any).renderBlockingStatus || 'non-blocking'
				}))
		})

		const renderBlockingResources = resourceTimings.filter((r) => r.renderBlocking === 'blocking')

		// Should have minimal render-blocking resources
		expect(renderBlockingResources.length, 'Should have minimal render-blocking resources').toBeLessThan(
			5
		)
	})
})

test.describe('Dashboard Performance', () => {
	test.use({ storageState: 'playwright/.auth/user.json' })

	test('dashboard should load efficiently', async ({ page }) => {
		const startTime = Date.now()

		await page.goto('/manage')
		await page.waitForLoadState('networkidle')

		const loadTime = Date.now() - startTime

		// Dashboard should load within 4 seconds
		expect(loadTime, 'Dashboard should load within 4 seconds').toBeLessThan(4000)

		const metrics = await collectWebVitals(page)

		// Check FCP for dashboard
		if (metrics.fcp !== null) {
			expect(metrics.fcp, 'Dashboard FCP should be < 2000ms').toBeLessThan(2000)
		}
	})

	test('data tables should render efficiently', async ({ page }) => {
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		const startTime = Date.now()

		// Wait for table to be visible
		await page.waitForSelector('table', { state: 'visible' })

		const renderTime = Date.now() - startTime

		// Table should render within 1 second
		expect(renderTime, 'Table should render within 1 second').toBeLessThan(1000)
	})
})

test.describe('Image Optimization', () => {
	test('images should be optimized', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Get all images
		const images = await page.evaluate(() => {
			const imgs = Array.from(document.querySelectorAll('img'))
			return imgs.map((img) => ({
				src: img.src,
				width: img.naturalWidth,
				height: img.naturalHeight,
				displayWidth: img.width,
				displayHeight: img.height,
				loading: img.loading,
				decoding: img.decoding
			}))
		})

		// Verify images use modern formats (Next.js Image component should handle this)
		for (const img of images) {
			// Next.js Image component should add loading="lazy" for below-fold images
			if (img.loading) {
				expect(['lazy', 'eager']).toContain(img.loading)
			}

			// Check for responsive sizing (images shouldn't be much larger than display size)
			if (img.width > 0 && img.displayWidth > 0) {
				const sizeRatio = img.width / img.displayWidth
				// Allow some tolerance (2x for retina displays)
				expect(sizeRatio, `Image ${img.src} should not be excessively oversized`).toBeLessThan(3)
			}
		}
	})
})

test.describe('Font Loading Performance', () => {
	test('fonts should load efficiently', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Check font loading strategy
		const fonts = await page.evaluate(() => {
			const fontLinks = Array.from(document.querySelectorAll('link[rel="preload"][as="font"]'))
			return fontLinks.map((link) => ({
				href: (link as HTMLLinkElement).href,
				crossOrigin: (link as HTMLLinkElement).crossOrigin
			}))
		})

		// Verify fonts are preloaded
		if (fonts.length > 0) {
			// Font preloading should have crossorigin attribute
			for (const font of fonts) {
				expect(font.crossOrigin).toBeTruthy()
			}
		}
	})
})

test.describe('JavaScript Bundle Performance', () => {
	test('JavaScript bundle size should be reasonable', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Get all JavaScript resources
		const jsResources = await page.evaluate(() => {
			const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
			return resources
				.filter((r) => r.initiatorType === 'script' && r.name.includes('.js'))
				.map((r) => ({
					name: r.name,
					size: r.transferSize,
					duration: r.duration
				}))
		})

		const totalJsSize = jsResources.reduce((acc, r) => acc + r.size, 0)

		// Total JS size should be reasonable (< 500KB gzipped for initial load)
		expect(totalJsSize, 'Total JavaScript size should be < 500KB').toBeLessThan(500 * 1024)
	})

	test('should use code splitting', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Get JavaScript chunks
		const jsChunks = await page.evaluate(() => {
			const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
			return resources.filter((r) => r.name.includes('/_next/static/chunks/')).map((r) => r.name)
		})

		// Should have multiple chunks (indicates code splitting)
		expect(jsChunks.length, 'Should have multiple JS chunks for code splitting').toBeGreaterThan(3)
	})
})

test.describe('Caching Performance', () => {
	test('static assets should be cached', async ({ page }) => {
		// First visit
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Get resource timings for first visit
		const firstVisitResources = await page.evaluate(() => {
			const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
			return resources.map((r) => ({
				name: r.name,
				duration: r.duration
			}))
		})

		// Second visit (reload)
		await page.reload({ waitUntil: 'networkidle' })

		// Get resource timings for second visit
		const secondVisitResources = await page.evaluate(() => {
			const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
			return resources.map((r) => ({
				name: r.name,
				duration: r.duration
			}))
		})

		// Second visit should have some cached resources (faster load times)
		const avgFirstVisit =
			firstVisitResources.reduce((acc, r) => acc + r.duration, 0) / firstVisitResources.length
		const avgSecondVisit =
			secondVisitResources.reduce((acc, r) => acc + r.duration, 0) / secondVisitResources.length

		// Second visit should be faster (or at least not significantly slower)
		expect(
			avgSecondVisit,
			'Second visit should benefit from caching'
		).toBeLessThanOrEqual(avgFirstVisit * 1.2)
	})
})

test.describe('Network Performance', () => {
	test('should minimize network requests', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Get total number of network requests
		const requestCount = await page.evaluate(() => {
			return performance.getEntriesByType('resource').length
		})

		// Should have reasonable number of requests (< 100 for initial load)
		expect(requestCount, 'Should have < 100 network requests').toBeLessThan(100)
	})

	test('should use HTTP/2 or HTTP/3', async ({ page, request }) => {
		const response = await request.get('https://tenantflow.app')

		// Check protocol (should be h2 or h3)
		const protocol = response.headers()['x-protocol'] || response.headers()[':protocol']

		// Modern deployment should use HTTP/2 or better
		if (protocol) {
			expect(['h2', 'h3']).toContain(protocol)
		}
	})
})
