import { useEffect } from 'react'
import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals'

interface WebVitalsData {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: string
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

function sendToAnalytics(metric: Metric) {
  const webVitalsData: WebVitalsData = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType
  }

  // Log to console in development
  if (import.meta.env.DEV) {
    console.group(`🔍 Web Vitals: ${metric.name}`)
    console.log(`Value: ${metric.value}ms`)
    console.log(`Rating: ${metric.rating}`)
    console.log(`Delta: ${metric.delta}ms`)
    console.log(`ID: ${metric.id}`)
    console.log(`Navigation: ${metric.navigationType}`)
    console.groupEnd()
  }

  // Send to analytics service (placeholder for real implementation)
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      custom_parameter_1: metric.rating,
      custom_parameter_2: metric.navigationType,
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
                console.group('🚀 Navigation Timing')
                console.log(`DNS Lookup: ${navEntry.domainLookupEnd - navEntry.domainLookupStart}ms`)
                console.log(`TCP Connection: ${navEntry.connectEnd - navEntry.connectStart}ms`)
                console.log(`Request Time: ${navEntry.responseStart - navEntry.requestStart}ms`)
                console.log(`Response Time: ${navEntry.responseEnd - navEntry.responseStart}ms`)
                console.log(`DOM Interactive: ${navEntry.domInteractive - navEntry.fetchStart}ms`)
                console.log(`DOM Complete: ${navEntry.domComplete - navEntry.fetchStart}ms`)
                console.log(`Load Complete: ${navEntry.loadEventEnd - navEntry.fetchStart}ms`)
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
        } catch (e) {
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
      }
    }
  }, [])

  // This component doesn't render anything
  return null
}

// Utility function to get current Web Vitals data from localStorage (dev only)
export function getWebVitalsData(): WebVitalsData[] {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return []
  
  try {
    return JSON.parse(localStorage.getItem('webVitals') || '[]')
  } catch {
    return []
  }
}

// Utility function to clear Web Vitals data (dev only)
export function clearWebVitalsData(): void {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return
  localStorage.removeItem('webVitals')
}

// Performance thresholds based on Core Web Vitals recommendations
export const WEB_VITALS_THRESHOLDS = {
  LCP: {
    good: 2500,
    needsImprovement: 4000
  },
  FID: {
    good: 100,
    needsImprovement: 300
  },
  CLS: {
    good: 0.1,
    needsImprovement: 0.25
  },
  FCP: {
    good: 1800,
    needsImprovement: 3000
  },
  TTFB: {
    good: 800,
    needsImprovement: 1800
  }
} as const

// Type declaration for gtag (Google Analytics)
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}