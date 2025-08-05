import { useEffect } from 'react'
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'
import type { Metric } from 'web-vitals'

// Extended metric interface that includes additional properties available in web-vitals
interface ExtendedMetric extends Metric {
  rating?: 'good' | 'needs-improvement' | 'poor'
  navigationType?: 'navigate' | 'reload' | 'back_forward' | 'prerender'
}

interface WebVitalsData {
  name: string
  value: number
  rating?: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType?: string
}

/**
 * Web Vitals Monitor Component
 * 
 * Monitors Core Web Vitals performance metrics and reports them
 * for performance baseline tracking and regression detection.
 * 
 * Metrics tracked:
 * - LCP (Largest Contentful Paint): Loading performance
 * - FID (First Input Delay): Interactivity
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FCP (First Contentful Paint): Loading performance
 * - TTFB (Time to First Byte): Server response time
 */

// Type guard to check if metric has extended properties
function isExtendedMetric(metric: Metric): metric is ExtendedMetric {
  return 'rating' in metric || 'navigationType' in metric
}

function sendToAnalytics(metric: Metric) {
  const extendedMetric = isExtendedMetric(metric) ? metric : metric as ExtendedMetric
  
  const webVitalsData: WebVitalsData = {
    name: metric.name,
    value: metric.value,
    rating: extendedMetric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: extendedMetric.navigationType
  }

  // Log to console in development
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.group(`🔍 Web Vitals: ${metric.name}`)
    // eslint-disable-next-line no-console
    console.info(`Value: ${metric.value}ms`)
    // eslint-disable-next-line no-console
    console.info(`Rating: ${extendedMetric.rating}`)
    // eslint-disable-next-line no-console
    console.info(`Delta: ${metric.delta}ms`)
    // eslint-disable-next-line no-console
    console.info(`ID: ${metric.id}`)
    // eslint-disable-next-line no-console
    console.info(`Navigation: ${extendedMetric.navigationType}`)
    // eslint-disable-next-line no-console
    console.groupEnd()
  }

  // Send to analytics service (placeholder for real implementation)
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      custom_parameter_1: extendedMetric.rating,
      custom_parameter_2: extendedMetric.navigationType,
      non_interaction: true
    })
  }

  // Store in localStorage for debugging (development only)
  if (import.meta.env.DEV) {
    const existingData = JSON.parse(localStorage.getItem('webVitals') || '[]')
    existingData.push({
      ...webVitalsData,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    })
    
    // Keep only last 50 entries
    if (existingData.length > 50) {
      existingData.splice(0, existingData.length - 50)
    }
    
    localStorage.setItem('webVitals', JSON.stringify(existingData))
  }

  // Send to custom analytics endpoint (if configured)
  if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
    fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'web-vitals',
        data: webVitalsData,
        meta: {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }
      })
    }).catch(error => {
      console.warn('Failed to send web vitals to analytics:', error)
    })
  }
}

export function WebVitalsMonitor() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    // Get all Core Web Vitals
    getCLS(sendToAnalytics)
    getFID(sendToAnalytics)
    getFCP(sendToAnalytics)
    getLCP(sendToAnalytics)
    getTTFB(sendToAnalytics)

    // Performance observer for additional metrics
    if ('PerformanceObserver' in window) {
      try {
        // Monitor navigation timing
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming
              
              if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.group('🚀 Navigation Timing')
                // eslint-disable-next-line no-console
                console.info(`DNS Lookup: ${navEntry.domainLookupEnd - navEntry.domainLookupStart}ms`)
                // eslint-disable-next-line no-console
                console.info(`TCP Connection: ${navEntry.connectEnd - navEntry.connectStart}ms`)
                // eslint-disable-next-line no-console
                console.info(`Request Time: ${navEntry.responseStart - navEntry.requestStart}ms`)
                // eslint-disable-next-line no-console
                console.info(`Response Time: ${navEntry.responseEnd - navEntry.responseStart}ms`)
                // eslint-disable-next-line no-console
                console.info(`DOM Interactive: ${navEntry.domInteractive - navEntry.fetchStart}ms`)
                // eslint-disable-next-line no-console
                console.info(`DOM Complete: ${navEntry.domComplete - navEntry.fetchStart}ms`)
                // eslint-disable-next-line no-console
                console.info(`Load Complete: ${navEntry.loadEventEnd - navEntry.fetchStart}ms`)
                // eslint-disable-next-line no-console
                console.groupEnd()
              }
            }
          }
        })
        
        navObserver.observe({ entryTypes: ['navigation'] })

        // Monitor resource timing for critical resources
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const resourceEntry = entry as PerformanceResourceTiming
            
            // Log slow resources in development
            if (import.meta.env.DEV && resourceEntry.duration > 1000) {
              console.warn(`🐌 Slow Resource: ${resourceEntry.name} took ${resourceEntry.duration}ms`)
            }
          }
        })
        
        resourceObserver.observe({ entryTypes: ['resource'] })

        // Monitor long tasks
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (import.meta.env.DEV) {
              console.warn(`⚠️ Long Task: ${entry.duration}ms at ${entry.startTime}ms`)
            }
          }
        })
        
        try {
          longTaskObserver.observe({ entryTypes: ['longtask'] })
        } catch (_e) {
          // longtask not supported in all browsers
        }

        // Cleanup observers
        return () => {
          navObserver.disconnect()
          resourceObserver.disconnect()
          longTaskObserver.disconnect()
        }
      } catch (error) {
        console.warn('Performance observers not fully supported:', error)
        return undefined
      }
    }
    
    return undefined
  }, [])

  // This component doesn't render anything
  return null
}



// Type declaration for gtag (Google Analytics)
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}