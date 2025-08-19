'use client'

import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'

interface WebVitalsMetric {
	name: string
	value: number
	delta: number
	id: string
	rating: 'good' | 'needs-improvement' | 'poor'
}

interface ProductionMetric extends WebVitalsMetric {
	url: string
	timestamp: number
	userAgent?: string
	sessionId?: string
	userId?: string
}

// PRODUCTION: Optimized analytics function for enterprise monitoring
function sendToAnalytics(metric: WebVitalsMetric) {
	if (typeof window === 'undefined') return

	// Prepare production metric data
	const productionMetric: ProductionMetric = {
		...metric,
		url: window.location.href,
		timestamp: Date.now(),
		userAgent: navigator.userAgent,
		sessionId: getSessionId(),
		userId: getUserId()
	}

	// PRODUCTION: Send to PostHog (primary analytics)
	if (window.posthog && process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true') {
		window.posthog.capture('web_vital_measured', {
			metric_name: metric.name,
			metric_value: metric.value,
			metric_rating: metric.rating,
			page_url: window.location.pathname,
			...productionMetric
		})
	}

	// PRODUCTION: Send to Google Analytics (if configured)
	if (window.gtag && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
		window.gtag('event', metric.name, {
			event_category: 'Web Vitals',
			event_label: metric.id,
			value: Math.round(
				metric.name === 'CLS' ? metric.value * 1000 : metric.value
			),
			non_interaction: true,
			custom_map: {
				metric_rating: metric.rating,
				page_path: window.location.pathname
			}
		})
	}

	// PRODUCTION: Send to internal monitoring API (with retry logic)
	sendToInternalAPI(productionMetric)
}

// PRODUCTION: Helper functions for user/session tracking
function getSessionId(): string | undefined {
	try {
		return sessionStorage.getItem('session_id') || undefined
	} catch {
		return undefined
	}
}

function getUserId(): string | undefined {
	try {
		return localStorage.getItem('user_id') || undefined
	} catch {
		return undefined
	}
}

// PRODUCTION: Robust internal API with retry and batching
let metricsBuffer: ProductionMetric[] = []
let isFlushingMetrics = false

async function sendToInternalAPI(metric: ProductionMetric, retryCount = 0): Promise<void> {
	const _maxRetries = 3
	const batchSize = 10
	
	// Add to buffer
	metricsBuffer.push(metric)
	
	// Flush buffer when it reaches batch size or after delay
	if (metricsBuffer.length >= batchSize || retryCount > 0) {
		await flushMetricsBuffer(retryCount)
	} else {
		// Schedule flush after 5 seconds if not already scheduled
		if (!isFlushingMetrics) {
			setTimeout(() => flushMetricsBuffer(), 5000)
		}
	}
}

async function flushMetricsBuffer(retryCount = 0): Promise<void> {
	if (isFlushingMetrics || metricsBuffer.length === 0) return
	
	isFlushingMetrics = true
	const metricsToSend = [...metricsBuffer]
	metricsBuffer = []
	
	try {
		const response = await fetch('/api/analytics/web-vitals', {
			method: 'POST',
			headers: { 
				'Content-Type': 'application/json',
				'X-Requested-With': 'XMLHttpRequest'
			},
			body: JSON.stringify({
				metrics: metricsToSend,
				batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
			})
		})
		
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}
	} catch {
		// PRODUCTION: Retry logic with exponential backoff
		if (retryCount < 3 && metricsToSend.length > 0) {
			const backoffDelay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
			setTimeout(() => {
				// Re-add metrics to buffer for retry
				metricsBuffer.unshift(...metricsToSend)
				flushMetricsBuffer(retryCount + 1)
			}, backoffDelay)
		}
		// Silently fail after max retries to avoid disrupting user experience
	} finally {
		isFlushingMetrics = false
	}
}

// PRODUCTION: Initialize Web Vitals monitoring with optimizations
export function initWebVitals() {
	if (typeof window === 'undefined') return

	// Only initialize if analytics is enabled
	if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') return

	// Core Web Vitals (Google's key performance metrics)
	onCLS(sendToAnalytics)  // Cumulative Layout Shift
	onINP(sendToAnalytics)  // Interaction to Next Paint
	onLCP(sendToAnalytics)  // Largest Contentful Paint

	// Additional performance metrics
	onFCP(sendToAnalytics)  // First Contentful Paint
	onTTFB(sendToAnalytics) // Time to First Byte

	// PRODUCTION: Flush metrics before page unload
	window.addEventListener('beforeunload', () => {
		if (metricsBuffer.length > 0) {
			// Use sendBeacon for reliable delivery during page unload
			const data = JSON.stringify({
				metrics: metricsBuffer,
				batchId: `unload_${Date.now()}`
			})
			navigator.sendBeacon('/api/analytics/web-vitals', data)
		}
	})
}

// PRODUCTION: Advanced performance monitoring with intelligent thresholds
export function observePerformance() {
	if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return
	if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') return

	// PRODUCTION: Navigation timing with smart rating
	const navigationObserver = new PerformanceObserver(list => {
		const entries = list.getEntries()
		entries.forEach(entry => {
			if (entry.entryType === 'navigation') {
				const navEntry = entry as PerformanceNavigationTiming

				// Production-optimized metrics with proper rating logic
				const metrics = {
					domContentLoaded: {
						value: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
						thresholds: { good: 1500, poor: 2500 }
					},
					loadComplete: {
						value: navEntry.loadEventEnd - navEntry.loadEventStart,
						thresholds: { good: 2000, poor: 4000 }
					},
					domInteractive: {
						value: navEntry.domInteractive - (navEntry.startTime || 0),
						thresholds: { good: 1800, poor: 3000 }
					},
					serverResponseTime: {
						value: navEntry.responseEnd - navEntry.requestStart,
						thresholds: { good: 200, poor: 600 }
					}
				}

				// Send metrics with proper ratings
				Object.entries(metrics).forEach(([name, { value, thresholds }]) => {
					if (value > 0) {
						const rating = value <= thresholds.good ? 'good' 
							: value <= thresholds.poor ? 'needs-improvement' 
							: 'poor'

						sendToAnalytics({
							name,
							value,
							delta: value,
							id: `nav-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
							rating
						})
					}
				})
			}
		})
	})

	navigationObserver.observe({ entryTypes: ['navigation'] })

	// PRODUCTION: Resource monitoring with intelligent categorization
	const resourceObserver = new PerformanceObserver(list => {
		const entries = list.getEntries()
		entries.forEach(entry => {
			if (entry.entryType === 'resource') {
				const resourceEntry = entry as PerformanceResourceTiming
				const resourceUrl = resourceEntry.name

				// PRODUCTION: Track resources by type with appropriate thresholds
				const resourceType = getResourceType(resourceUrl)
				const size = resourceEntry.transferSize
				
				const thresholds = {
					'image': { warn: 500000, critical: 1000000 }, // 500KB/1MB
					'script': { warn: 200000, critical: 500000 },  // 200KB/500KB
					'style': { warn: 50000, critical: 100000 },    // 50KB/100KB
					'font': { warn: 100000, critical: 250000 },    // 100KB/250KB
					'other': { warn: 1000000, critical: 2000000 }  // 1MB/2MB
				}

				const threshold = thresholds[resourceType] || thresholds.other

				if (size > threshold.critical) {
					sendToAnalytics({
						name: 'critical-resource-size',
						value: size,
						delta: size,
						id: `resource-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
						rating: 'poor'
					})
				} else if (size > threshold.warn) {
					sendToAnalytics({
						name: 'large-resource-detected',
						value: size,
						delta: size,
						id: `resource-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
						rating: 'needs-improvement'
					})
				}

				// Track slow loading resources
				const loadTime = resourceEntry.responseEnd - resourceEntry.requestStart
				if (loadTime > 3000) { // 3 seconds
					sendToAnalytics({
						name: 'slow-resource-load',
						value: loadTime,
						delta: loadTime,
						id: `slow-resource-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
						rating: 'poor'
					})
				}
			}
		})
	})

	resourceObserver.observe({ entryTypes: ['resource'] })
}

// PRODUCTION: Helper function to categorize resources
function getResourceType(url: string): 'image' | 'script' | 'style' | 'font' | 'other' {
	if (/\.(jpg|jpeg|png|webp|avif|gif|svg)(\?|$)/i.test(url)) return 'image'
	if (/\.(js|mjs)(\?|$)/i.test(url)) return 'script'
	if (/\.css(\?|$)/i.test(url)) return 'style'
	if (/\.(woff|woff2|ttf|otf|eot)(\?|$)/i.test(url)) return 'font'
	return 'other'
}

// PRODUCTION: Comprehensive performance budget monitoring
export function checkPerformanceBudget() {
	if (typeof window === 'undefined') return
	if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') return

	// PRODUCTION: Stricter budget limits for optimal performance
	const budget = {
		maxImageSize: 300000,   // 300KB (reduced for production)
		maxJSSize: 500000,      // 500KB (reduced for production)
		maxCSSSize: 50000,      // 50KB (reduced for production)
		maxFontSize: 100000,    // 100KB per font
		maxTotalSize: 2000000,  // 2MB total (reduced for production)
		maxResourceCount: 50    // Maximum number of resources
	}

	let totalSize = 0
	let resourceCount = 0
	const violations: { type: string; resource: string; size: number }[] = []

	// PRODUCTION: Enhanced resource analysis
	const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
	
	resources.forEach(resource => {
		if (resource.transferSize > 0) {
			totalSize += resource.transferSize
			resourceCount++

			const resourceType = getResourceType(resource.name)
			const sizeKB = Math.round(resource.transferSize / 1000)

			// Check individual resource budgets
			switch (resourceType) {
				case 'image':
					if (resource.transferSize > budget.maxImageSize) {
						violations.push({
							type: 'Large Image',
							resource: resource.name,
							size: sizeKB
						})
					}
					break
				case 'script':
					if (resource.transferSize > budget.maxJSSize) {
						violations.push({
							type: 'Large JavaScript',
							resource: resource.name,
							size: sizeKB
						})
					}
					break
				case 'style':
					if (resource.transferSize > budget.maxCSSSize) {
						violations.push({
							type: 'Large CSS',
							resource: resource.name,
							size: sizeKB
						})
					}
					break
				case 'font':
					if (resource.transferSize > budget.maxFontSize) {
						violations.push({
							type: 'Large Font',
							resource: resource.name,
							size: sizeKB
						})
					}
					break
			}
		}
	})

	// Check total size budget
	if (totalSize > budget.maxTotalSize) {
		violations.push({
			type: 'Total Page Size',
			resource: 'All Resources',
			size: Math.round(totalSize / 1000)
		})
	}

	// Check resource count budget
	if (resourceCount > budget.maxResourceCount) {
		violations.push({
			type: 'Resource Count',
			resource: `${resourceCount} resources`,
			size: resourceCount
		})
	}

	// PRODUCTION: Send violations to monitoring
	if (violations.length > 0) {
		sendToAnalytics({
			name: 'performance-budget-violation',
			value: violations.length,
			delta: violations.length,
			id: `budget-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
			rating: 'poor'
		})

		// Also send detailed violation data
		violations.forEach((violation, index) => {
			sendToAnalytics({
				name: 'budget-violation-detail',
				value: violation.size,
				delta: violation.size,
				id: `violation-${Date.now()}-${index}`,
				rating: 'poor'
			})
		})
	}

	return {
		totalSize: Math.round(totalSize / 1000),
		resourceCount,
		violations,
		budgetStatus: violations.length === 0 ? 'passing' : 'failing'
	}
}
