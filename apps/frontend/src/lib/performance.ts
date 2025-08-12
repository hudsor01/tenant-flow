/**
 * Performance monitoring and web vitals tracking
 * Optimized for Vercel deployment with comprehensive metrics
 */

// Web Vitals tracking
export function trackWebVitals() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    // Core Web Vitals observer
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          // Track LCP
          logger.info('LCP:', { component: 'lib_performance.ts', data: entry.startTime });
          if (process.env.NODE_ENV === 'production') {
            // Send to analytics
            trackMetric('LCP', entry.startTime);
          }
        }
        
        if (entry.entryType === 'first-input') {
          // Track FID
          const fidEntry = entry as PerformanceEventTiming;
          logger.info('FID:', { component: 'lib_performance.ts', data: fidEntry.processingStart - fidEntry.startTime });
          if (process.env.NODE_ENV === 'production') {
            trackMetric('FID', fidEntry.processingStart - fidEntry.startTime);
          }
        }
        
        if (entry.entryType === 'layout-shift') {
          // Track CLS
          const clsEntry = entry as LayoutShift;
          if (!clsEntry.hadRecentInput) {
            logger.info('CLS:', { component: 'lib_performance.ts', data: clsEntry.value });
            if (process.env.NODE_ENV === 'production') {
              trackMetric('CLS', clsEntry.value);
            }
          }
        }
      }
    });

    // Observe different entry types
    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    
    // Track TTFB
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      logger.info('TTFB:', { component: 'lib_performance.ts', data: ttfb });
      if (process.env.NODE_ENV === 'production') {
        trackMetric('TTFB', ttfb);
      }
    }
  }
}

// Bundle size tracking
export function trackBundleSize() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const entries = performance.getEntriesByType('resource');
    let totalJSSize = 0;
    let totalCSSSize = 0;
    
    entries.forEach((entry) => {
      if (entry.name.includes('.js')) {
        totalJSSize += (entry as PerformanceResourceTiming).transferSize || 0;
      }
      if (entry.name.includes('.css')) {
        totalCSSSize += (entry as PerformanceResourceTiming).transferSize || 0;
      }
    });
    
    logger.info('Bundle sizes:', { component: 'lib_performance.ts', data: { js: totalJSSize, css: totalCSSSize } });
    
    if (process.env.NODE_ENV === 'production') {
      trackMetric('BundleSize_JS', totalJSSize);
      trackMetric('BundleSize_CSS', totalCSSSize);
    }
  }
}

// Extended Performance interface for memory tracking
interface ExtendedPerformance extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

// Layout Shift interface
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

// Memory usage tracking
export function trackMemoryUsage() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const extendedPerformance = performance as ExtendedPerformance;
    if (extendedPerformance.memory) {
      const memory = extendedPerformance.memory;
      console.info('Memory usage:', {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      });
      
      if (process.env.NODE_ENV === 'production') {
        trackMetric('Memory_Used', memory.usedJSHeapSize);
        trackMetric('Memory_Total', memory.totalJSHeapSize);
      }
    }
  }
}

// Generic metric tracking function
function trackMetric(name: string, value: number) {
  // Integration with Vercel Analytics or your preferred analytics service
  if (typeof window !== 'undefined' && window.va) {
    window.va('track', name, { value });
  }
  
  // Alternative: send to your custom analytics endpoint
  fetch('/api/analytics/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metric: name, value, timestamp: Date.now() }),
  }).catch(() => {
    // Silently fail to avoid impacting user experience
  });
}

// Page load performance tracker
export function trackPageLoad(pageName: string) {
  if (typeof window !== 'undefined') {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      console.info(`Page load time for ${pageName}:`, loadTime);
      
      if (process.env.NODE_ENV === 'production') {
        trackMetric(`PageLoad_${pageName}`, loadTime);
      }
    };
  }
  
  return () => {};
}

// Initialize performance monitoring
export function initPerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    // Track web vitals
    trackWebVitals();
    
    // Track bundle sizes after load
    window.addEventListener('load', () => {
      setTimeout(() => {
        trackBundleSize();
        trackMemoryUsage();
      }, 1000);
    });
    
    // Track route changes for SPA metrics
    window.addEventListener('beforeunload', () => {
      trackMemoryUsage();
    });
  }
}

// Types for analytics integration
declare global {
  interface Window {
    va?: (event: string, name: string, data?: Record<string, unknown>) => void;
  }
}