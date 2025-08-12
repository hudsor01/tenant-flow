'use client';

import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';
import { logger } from '@/lib/logger'

interface WebVitalsMetric {
  name: string;
  value: number;
  delta: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
}

// Function to send metrics to analytics service
function sendToAnalytics(metric: WebVitalsMetric) {
  // In production, send to your analytics service
  if (process.env.NODE_ENV === 'development') {
    logger.info('Web Vitals:', { component: 'lib_monitoring_web_vitals.ts', data: metric });
  }

  // Example: Send to Google Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }

  // Example: Send to your own analytics
  if (typeof window !== 'undefined') {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        url: window.location.href,
        timestamp: Date.now(),
      }),
    }).catch(console.error);
  }
}

export function initWebVitals() {
  if (typeof window === 'undefined') return;

  // Core Web Vitals
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  
  // Other important metrics
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

// Performance observer for custom metrics
export function observePerformance() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  // Observe navigation timing
  const navigationObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming;
        
        // Custom metrics
        const metrics = {
          domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
          loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
          domInteractive: navEntry.domInteractive - (navEntry.startTime || 0),
          serverResponseTime: navEntry.responseEnd - navEntry.requestStart,
        };

        // Send custom metrics
        Object.entries(metrics).forEach(([name, value]) => {
          if (value > 0) {
            sendToAnalytics({
              name,
              value,
              delta: value,
              id: `nav-${Date.now()}`,
              rating: 'good', // You can implement rating logic
            });
          }
        });
      }
    });
  });

  navigationObserver.observe({ entryTypes: ['navigation'] });

  // Observe resource timing
  const resourceObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.entryType === 'resource') {
        const resourceEntry = entry as PerformanceResourceTiming;
        
        // Track large resources
        if (resourceEntry.transferSize > 100000) { // 100KB
          sendToAnalytics({
            name: 'large-resource',
            value: resourceEntry.transferSize,
            delta: resourceEntry.transferSize,
            id: `resource-${Date.now()}`,
            rating: 'needs-improvement',
          });
        }
      }
    });
  });

  resourceObserver.observe({ entryTypes: ['resource'] });
}

// Performance budget monitoring
export function checkPerformanceBudget() {
  if (typeof window === 'undefined') return;

  const budget = {
    maxImageSize: 500000, // 500KB
    maxJSSize: 1000000, // 1MB
    maxCSSSize: 100000, // 100KB
    maxTotalSize: 3000000, // 3MB
  };

  let totalSize = 0;
  const violations: string[] = [];

  // Check resource sizes
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  resources.forEach((resource) => {
    totalSize += resource.transferSize;

    if (resource.name.match(/\.(jpg|jpeg|png|webp|avif)$/i) && resource.transferSize > budget.maxImageSize) {
      violations.push(`Large image: ${resource.name} (${Math.round(resource.transferSize / 1000)}KB)`);
    }

    if (resource.name.match(/\.js$/i) && resource.transferSize > budget.maxJSSize) {
      violations.push(`Large JS: ${resource.name} (${Math.round(resource.transferSize / 1000)}KB)`);
    }

    if (resource.name.match(/\.css$/i) && resource.transferSize > budget.maxCSSSize) {
      violations.push(`Large CSS: ${resource.name} (${Math.round(resource.transferSize / 1000)}KB)`);
    }
  });

  if (totalSize > budget.maxTotalSize) {
    violations.push(`Total page size exceeds budget: ${Math.round(totalSize / 1000)}KB`);
  }

  if (violations.length > 0) {
    logger.warn('Performance Budget Violations:', { component: 'lib_monitoring_web_vitals.ts', data: violations });
    
    // Send to monitoring service
    sendToAnalytics({
      name: 'performance-budget-violation',
      value: violations.length,
      delta: violations.length,
      id: `budget-${Date.now()}`,
      rating: 'poor',
    });
  }
}