/**
 * Performance Monitoring for Edge Deployment
 * Tracks Core Web Vitals and provides optimization insights
 */

interface PerformanceMetrics {
  ttfb: number
  fcp: number
  lcp: number
  fid: number
  cls: number
  tbt: number
  speed_index: number
  navigation_type: string
  connection_type: string
  timestamp: number
}

interface ResourceTiming {
  name: string
  duration: number
  transferSize: number
  encodedBodySize: number
  startTime: number
  responseEnd: number
}

class EdgePerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {}
  private resourceTimings: ResourceTiming[] = []
  private observer?: PerformanceObserver

  constructor() {
    this.initializeObserver()
    this.trackNavigationTiming()
    this.trackResourceTiming()
    this.trackUserTiming()
  }

  /**
   * Initialize Performance Observer for Core Web Vitals
   */
  private initializeObserver() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    try {
      this.observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          switch (entry.entryType) {
            case 'navigation':
              this.handleNavigationEntry(entry as PerformanceNavigationTiming)
              break
            case 'paint':
              this.handlePaintEntry(entry as PerformancePaintTiming)
              break
            case 'largest-contentful-paint':
              this.handleLCPEntry(entry as PerformanceEntry & { startTime: number })
              break
            case 'first-input':
              this.handleFIDEntry(entry as PerformanceEntry & { processingStart: number; startTime: number })
              break
            case 'layout-shift':
              this.handleCLSEntry(entry as PerformanceEntry & { value: number; hadRecentInput: boolean })
              break
            case 'resource':
              this.handleResourceEntry(entry as PerformanceResourceTiming)
              break
          }
        })
      })

      // Observe all relevant entry types
      const entryTypes = [
        'navigation',
        'paint',
        'largest-contentful-paint',
        'first-input',
        'layout-shift',
        'resource'
      ]

      entryTypes.forEach(type => {
        try {
          this.observer?.observe({ type, buffered: true })
        } catch {
          // Some browsers don't support all entry types
          console.warn(`Performance observer type '${type}' not supported`)
        }
      })
    } catch (error) {
      console.warn('Performance Observer not supported:', error)
    }
  }

  private handleNavigationEntry(entry: PerformanceNavigationTiming) {
    this.metrics.ttfb = entry.responseStart - entry.requestStart
    this.metrics.navigation_type = this.getNavigationType(Number(entry.type))
    
    // Estimate connection type
    const connection = (navigator as Navigator & { 
      connection?: { effectiveType: string }; 
      mozConnection?: { effectiveType: string }; 
      webkitConnection?: { effectiveType: string }; 
    }).connection || (navigator as unknown as { mozConnection?: { effectiveType: string } }).mozConnection || (navigator as unknown as { webkitConnection?: { effectiveType: string } }).webkitConnection
    this.metrics.connection_type = connection ? connection.effectiveType : 'unknown'
  }

  private handlePaintEntry(entry: PerformancePaintTiming) {
    if (entry.name === 'first-contentful-paint') {
      this.metrics.fcp = entry.startTime
    }
  }

  private handleLCPEntry(entry: PerformanceEntry & { startTime: number }) {
    this.metrics.lcp = entry.startTime
  }

  private handleFIDEntry(entry: PerformanceEntry & { processingStart: number; startTime: number }) {
    this.metrics.fid = entry.processingStart - entry.startTime
  }

  private handleCLSEntry(entry: PerformanceEntry & { value: number; hadRecentInput: boolean }) {
    // Accumulate CLS score
    if (!entry.hadRecentInput) {
      this.metrics.cls = (this.metrics.cls || 0) + entry.value
    }
  }

  private handleResourceEntry(entry: PerformanceResourceTiming) {
    // Track critical resources
    if (this.isCriticalResource(entry.name)) {
      this.resourceTimings.push({
        name: entry.name,
        duration: entry.duration,
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        startTime: entry.startTime,
        responseEnd: entry.responseEnd
      })
    }
  }

  private isCriticalResource(name: string): boolean {
    return name.includes('/static/js/') || 
           name.includes('/static/css/') || 
           name.includes('react-vendor') ||
           name.includes('router-vendor') ||
           name.includes('ui-vendor')
  }

  private getNavigationType(type: number): string {
    switch (type) {
      case 0: return 'navigate'
      case 1: return 'reload'
      case 2: return 'back_forward'
      default: return 'unknown'
    }
  }

  /**
   * Track navigation timing manually for older browsers
   */
  private trackNavigationTiming() {
    if (typeof window === 'undefined') return

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation && !this.metrics.ttfb) {
          this.handleNavigationEntry(navigation)
        }
        this.calculateAdditionalMetrics()
      }, 0)
    })
  }

  /**
   * Track resource timing for bundle analysis
   */
  private trackResourceTiming() {
    if (typeof window === 'undefined') return

    // Track initial page load resources
    window.addEventListener('load', () => {
      setTimeout(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        resources.forEach(resource => this.handleResourceEntry(resource))
      }, 1000)
    })
  }

  /**
   * Track custom user timing marks
   */
  private trackUserTiming() {
    // Mark key application lifecycle events
    performance.mark('app-start')
    
    // Mark when React hydration completes
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        performance.mark('app-loaded')
        performance.measure('app-load-time', 'app-start', 'app-loaded')
      })
    }
  }

  private calculateAdditionalMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (!navigation) return

    // Calculate Total Blocking Time (TBT) approximation
    const longTasks = performance.getEntriesByType('longtask') as PerformanceEntry[] & { duration: number }[]
    this.metrics.tbt = longTasks.reduce((tbt, task) => {
      return tbt + Math.max(0, task.duration - 50)
    }, 0)
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      ...this.metrics,
      timestamp: Date.now()
    } as PerformanceMetrics
  }

  /**
   * Get resource timing analysis
   */
  getResourceAnalysis() {
    const analysis = {
      totalResources: this.resourceTimings.length,
      totalTransferSize: this.resourceTimings.reduce((sum, r) => sum + r.transferSize, 0),
      slowestResources: this.resourceTimings
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5),
      largestResources: this.resourceTimings
        .sort((a, b) => b.transferSize - a.transferSize)
        .slice(0, 5),
      cacheableResources: this.resourceTimings.filter(r => 
        r.name.includes('/static/') || r.name.includes('immutable')
      ).length
    }

    return analysis
  }

  /**
   * Generate performance score based on Core Web Vitals
   */
  getPerformanceScore(): { score: number; details: Record<string, unknown> } {
    const metrics = this.getMetrics()
    let score = 100
    const details: Record<string, unknown> = {}

    // TTFB scoring (good: <800ms, needs improvement: 800-1800ms, poor: >1800ms)
    if (metrics.ttfb) {
      if (metrics.ttfb > 1800) {
        score -= 20
        details.ttfb = 'poor'
      } else if (metrics.ttfb > 800) {
        score -= 10
        details.ttfb = 'needs-improvement'
      } else {
        details.ttfb = 'good'
      }
    }

    // FCP scoring (good: <1.8s, needs improvement: 1.8-3s, poor: >3s)
    if (metrics.fcp) {
      if (metrics.fcp > 3000) {
        score -= 15
        details.fcp = 'poor'
      } else if (metrics.fcp > 1800) {
        score -= 8
        details.fcp = 'needs-improvement'
      } else {
        details.fcp = 'good'
      }
    }

    // LCP scoring (good: <2.5s, needs improvement: 2.5-4s, poor: >4s)
    if (metrics.lcp) {
      if (metrics.lcp > 4000) {
        score -= 25
        details.lcp = 'poor'
      } else if (metrics.lcp > 2500) {
        score -= 12
        details.lcp = 'needs-improvement'
      } else {
        details.lcp = 'good'
      }
    }

    // FID scoring (good: <100ms, needs improvement: 100-300ms, poor: >300ms)
    if (metrics.fid) {
      if (metrics.fid > 300) {
        score -= 20
        details.fid = 'poor'
      } else if (metrics.fid > 100) {
        score -= 10
        details.fid = 'needs-improvement'
      } else {
        details.fid = 'good'
      }
    }

    // CLS scoring (good: <0.1, needs improvement: 0.1-0.25, poor: >0.25)
    if (metrics.cls !== undefined) {
      if (metrics.cls > 0.25) {
        score -= 20
        details.cls = 'poor'
      } else if (metrics.cls > 0.1) {
        score -= 10
        details.cls = 'needs-improvement'
      } else {
        details.cls = 'good'
      }
    }

    return { score: Math.max(0, score), details }
  }

  /**
   * Generate optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const metrics = this.getMetrics()
    const recommendations: string[] = []

    if (metrics.ttfb && metrics.ttfb > 800) {
      recommendations.push('Optimize server response time (TTFB)')
      recommendations.push('Consider using Vercel Edge Functions')
      recommendations.push('Implement better API caching strategies')
    }

    if (metrics.fcp && metrics.fcp > 1800) {
      recommendations.push('Optimize critical rendering path')
      recommendations.push('Preload critical fonts and assets')
      recommendations.push('Minimize render-blocking resources')
    }

    if (metrics.lcp && metrics.lcp > 2500) {
      recommendations.push('Optimize Largest Contentful Paint element')
      recommendations.push('Compress and optimize images')
      recommendations.push('Use next-gen image formats (WebP, AVIF)')
    }

    if (metrics.fid && metrics.fid > 100) {
      recommendations.push('Reduce JavaScript execution time')
      recommendations.push('Implement better code splitting')
      recommendations.push('Use React concurrent features')
    }

    if (metrics.cls && metrics.cls > 0.1) {
      recommendations.push('Reserve space for dynamic content')
      recommendations.push('Avoid inserting content above existing content')
      recommendations.push('Use aspect-ratio CSS for images and videos')
    }

    const resourceAnalysis = this.getResourceAnalysis()
    if (resourceAnalysis.totalTransferSize > 1000000) { // 1MB
      recommendations.push('Reduce total JavaScript bundle size')
      recommendations.push('Implement more aggressive code splitting')
    }

    return recommendations
  }

  /**
   * Send metrics to analytics
   */
  reportMetrics() {
    if (typeof window === 'undefined') return

    const metrics = this.getMetrics()
    const score = this.getPerformanceScore()
    const resourceAnalysis = this.getResourceAnalysis()

    // Report to Vercel Analytics
    if (window.va) {
      window.va('event', {
        ttfb: metrics.ttfb,
        fcp: metrics.fcp,
        lcp: metrics.lcp,
        fid: metrics.fid,
        cls: metrics.cls,
        score: score.score
      })
    }

    // Report to PostHog if available
    if (window.posthog) {
      window.posthog.capture('performance_metrics', {
        ...metrics,
        performance_score: score.score,
        total_resources: resourceAnalysis.totalResources,
        total_transfer_size: resourceAnalysis.totalTransferSize
      })
    }

    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.warn('🚀 Performance Metrics')
      console.warn('Metrics:', metrics)
      console.warn('Performance Score:', score)
      console.warn('Recommendations:', this.getOptimizationRecommendations())
    }
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observer?.disconnect()
  }
}

// Export singleton instance
export const performanceMonitor = new EdgePerformanceMonitor()

// Auto-report metrics after page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.reportMetrics()
    }, 5000) // Wait 5s for all metrics to be collected
  })
}

// Declare global types for analytics
declare global {
  interface Window {
    va?: (event: 'beforeSend' | 'event' | 'pageview', properties?: unknown) => void
    posthog?: {
      capture: (event: string, data: Record<string, unknown>) => void
    }
  }
}