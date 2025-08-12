import { useEffect } from 'react'
import { logger } from '@/lib/logger'
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'
import { logger } from '@/lib/logger'
import type { Metric } from 'web-vitals'
import { logger } from '@/lib/logger'

// Extended metric interface that includes additional properties available in web-vitals
interface ExtendedMetric extends Omit<Metric, 'rating' | 'navigationType'> {
  rating?: 'good' | 'needs-improvement' | 'poor'
  navigationType?: 'navigate' | 'reload' | 'back-forward' | 'prerender' | 'back-forward-cache' | 'restore'
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
function isExtendedMetric(metric: Metric): boolean {
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
  if (process.env.DEV) {
    const devLogger = {
      group: console.warn.bind(console),
      info: console.warn.bind(console),
      groupEnd: console.warn.bind(console)
    }
    
    devLogger.group(`🔍 Web Vitals: ${metric.name}`)
    devLogger.info(`Value: ${metric.value}ms`)
    devLogger.info(`Rating: ${extendedMetric.rating}`)
    devLogger.info(`Delta: ${metric.delta}ms`)
    devLogger.info(`ID: ${metric.id}`)
    devLogger.info(`Navigation: ${extendedMetric.navigationType}`)
    devLogger.groupEnd()
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
  if (process.env.DEV) {
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
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
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
      logger.warn('Failed to send web vitals to analytics:', { component: 'components_analytics_web_vitals_monitor.tsx', data: error })
    })
  }
}

export function WebVitalsMonitor() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    // Get all Core Web Vitals
    onCLS(sendToAnalytics)
    onINP(sendToAnalytics)
    onFCP(sendToAnalytics)
    onLCP(sendToAnalytics)
    onTTFB(sendToAnalytics)

    // Performance observer for additional metrics
    if ('PerformanceObserver' in window) {
      try {
        // Monitor navigation timing
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming
              
              if (process.env.DEV) {
                const navLogger = {
                  group: console.warn.bind(console),
                  info: console.warn.bind(console),
                  groupEnd: console.warn.bind(console)
                }
                
                navLogger.group('🚀 Navigation Timing')
                navLogger.info(`DNS Lookup: ${navEntry.domainLookupEnd - navEntry.domainLookupStart}ms`)
                navLogger.info(`TCP Connection: ${navEntry.connectEnd - navEntry.connectStart}ms`)
                navLogger.info(`Request Time: ${navEntry.responseStart - navEntry.requestStart}ms`)
                navLogger.info(`Response Time: ${navEntry.responseEnd - navEntry.responseStart}ms`)
                navLogger.info(`DOM Interactive: ${navEntry.domInteractive - navEntry.fetchStart}ms`)
                navLogger.info(`DOM Complete: ${navEntry.domComplete - navEntry.fetchStart}ms`)
                navLogger.info(`Load Complete: ${navEntry.loadEventEnd - navEntry.fetchStart}ms`)
                navLogger.groupEnd()
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
            if (process.env.DEV && resourceEntry.duration > 1000) {
              logger.warn(`🐌 Slow Resource: ${resourceEntry.name} took ${resourceEntry.duration}ms`, { component: "components_analytics_web_vitals_monitor.tsx" })
            }
          }
        })
        
        resourceObserver.observe({ entryTypes: ['resource'] })

        // Monitor long tasks
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (process.env.DEV) {
              logger.warn(`⚠️ Long Task: ${entry.duration}ms at ${entry.startTime}ms`, { component: "components_analytics_web_vitals_monitor.tsx" })
            }
          }
        })
        
        try {
          longTaskObserver.observe({ entryTypes: ['longtask'] })
        } catch {
          // longtask not supported in all browsers, ignore error
        }

        // Cleanup observers
        return () => {
          navObserver.disconnect()
          resourceObserver.disconnect()
          longTaskObserver.disconnect()
        }
      } catch (error) {
        logger.warn('Performance observers not fully supported:', { component: 'components_analytics_web_vitals_monitor.tsx', data: error })
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