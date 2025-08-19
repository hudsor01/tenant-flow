/**
 * Performance Validation for TenantFlow Frontend
 * Mobile-First Core Web Vitals optimization
 */

// Core Web Vitals thresholds (mobile-focused)
export const PERFORMANCE_THRESHOLDS = {
  // Largest Contentful Paint (LCP) - Good < 2.5s
  LCP_GOOD: 2500,
  LCP_NEEDS_IMPROVEMENT: 4000,
  
  // First Input Delay (FID) - Good < 100ms
  FID_GOOD: 100,
  FID_NEEDS_IMPROVEMENT: 300,
  
  // Cumulative Layout Shift (CLS) - Good < 0.1
  CLS_GOOD: 0.1,
  CLS_NEEDS_IMPROVEMENT: 0.25,
  
  // First Contentful Paint (FCP) - Good < 1.8s
  FCP_GOOD: 1800,
  FCP_NEEDS_IMPROVEMENT: 3000,
  
  // Time to Interactive (TTI) - Good < 3.8s
  TTI_GOOD: 3800,
  TTI_NEEDS_IMPROVEMENT: 7300,
} as const

export interface PerformanceMetric {
  name: string
  value: number
  threshold: number
  unit: string
  status: 'good' | 'needs-improvement' | 'poor'
}

export interface PerformanceReport {
  timestamp: Date
  url: string
  userAgent: string
  metrics: PerformanceMetric[]
  score: number
  recommendations: string[]
}

/**
 * Collect and analyze Core Web Vitals
 */
export function analyzePerformance(): Promise<PerformanceReport> {
  return new Promise((resolve) => {
    // Wait for page load completion
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => {
        setTimeout(() => resolve(collectMetrics()), 1000)
      })
    } else {
      setTimeout(() => resolve(collectMetrics()), 1000)
    }
  })
}

function collectMetrics(): PerformanceReport {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  const paint = performance.getEntriesByType('paint')
  
  const metrics: PerformanceMetric[] = []
  const recommendations: string[] = []

  // First Contentful Paint (FCP)
  const fcpEntry = paint.find(entry => entry.name === 'first-contentful-paint')
  if (fcpEntry) {
    const fcp = fcpEntry.startTime
    metrics.push({
      name: 'First Contentful Paint',
      value: fcp,
      threshold: PERFORMANCE_THRESHOLDS.FCP_GOOD,
      unit: 'ms',
      status: fcp <= PERFORMANCE_THRESHOLDS.FCP_GOOD ? 'good' : 
              fcp <= PERFORMANCE_THRESHOLDS.FCP_NEEDS_IMPROVEMENT ? 'needs-improvement' : 'poor'
    })
    
    if (fcp > PERFORMANCE_THRESHOLDS.FCP_GOOD) {
      recommendations.push('Optimize critical rendering path and reduce render-blocking resources')
    }
  }

  // Time to Interactive (estimated from DOM completion)
  const tti = navigation.domComplete - navigation.fetchStart
  metrics.push({
    name: 'Time to Interactive (estimated)',
    value: tti,
    threshold: PERFORMANCE_THRESHOLDS.TTI_GOOD,
    unit: 'ms',
    status: tti <= PERFORMANCE_THRESHOLDS.TTI_GOOD ? 'good' : 
            tti <= PERFORMANCE_THRESHOLDS.TTI_NEEDS_IMPROVEMENT ? 'needs-improvement' : 'poor'
  })

  if (tti > PERFORMANCE_THRESHOLDS.TTI_GOOD) {
    recommendations.push('Reduce JavaScript execution time and optimize React bundle size')
  }

  // Resource loading performance
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  const totalResourceTime = resources.reduce((sum, resource) => sum + resource.duration, 0)
  const avgResourceTime = totalResourceTime / resources.length

  if (avgResourceTime > 1000) {
    recommendations.push('Optimize asset loading with compression, CDN, and resource hints')
  }

  // Calculate overall score (0-100)
  const goodMetrics = metrics.filter(m => m.status === 'good').length
  const score = Math.round((goodMetrics / metrics.length) * 100)

  // Mobile-specific recommendations
  if (window.innerWidth <= 768) {
    recommendations.push('Ensure mobile-first optimizations are active')
    
    if (totalResourceTime > 5000) {
      recommendations.push('Consider implementing progressive loading for mobile connections')
    }
  }

  return {
    timestamp: new Date(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    metrics,
    score,
    recommendations: [...new Set(recommendations)] // Remove duplicates
  }
}

/**
 * Monitor performance continuously
 */
export function startPerformanceMonitoring() {
  // Only run in development or when explicitly enabled
  if (process.env.NODE_ENV !== 'development' && !localStorage.getItem('tenantflow-perf-monitor')) {
    return
  }

  console.log('🚀 TenantFlow Performance Monitor Started')
  
  // Initial analysis after page load
  analyzePerformance().then(report => {
    console.group('📊 Performance Report')
    console.log(`Overall Score: ${report.score}/100`)
    
    report.metrics.forEach(metric => {
      const emoji = metric.status === 'good' ? '✅' : metric.status === 'needs-improvement' ? '⚠️' : '❌'
      console.log(`${emoji} ${metric.name}: ${Math.round(metric.value)}${metric.unit} (threshold: ${metric.threshold}${metric.unit})`)
    })
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      report.recommendations.forEach(rec => console.log(`  • ${rec}`))
    }
    
    console.groupEnd()
  })

  // Monitor for layout shifts
  if ('LayoutShift' in window) {
    let cumulativeLayoutShift = 0
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
        if (!layoutShiftEntry.hadRecentInput && layoutShiftEntry.value) {
          cumulativeLayoutShift += layoutShiftEntry.value
        }
      }
      
      if (cumulativeLayoutShift > PERFORMANCE_THRESHOLDS.CLS_GOOD) {
        console.warn(`⚠️ High Cumulative Layout Shift detected: ${cumulativeLayoutShift.toFixed(3)}`)
      }
    })
    
    observer.observe({ entryTypes: ['layout-shift'] })
  }
}

/**
 * Helper to log performance for specific operations
 */
export function measureOperation<T>(name: string, operation: () => T): T {
  const start = performance.now()
  const result = operation()
  const duration = performance.now() - start
  
  if (duration > 16.67) { // More than one frame (60fps)
    console.warn(`⏱️ Slow operation detected: ${name} took ${duration.toFixed(2)}ms`)
  }
  
  return result
}

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitoring(componentName: string) {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      if (duration > 16.67) {
        console.warn(`⚠️ ${componentName} render took ${duration.toFixed(2)}ms`)
      }
    }
  }
  
  return () => {} // No-op in production
}