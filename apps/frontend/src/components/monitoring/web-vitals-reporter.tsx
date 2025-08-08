'use client';

import { useEffect } from 'react';
import { initWebVitals, observePerformance, checkPerformanceBudget } from '@/lib/monitoring/web-vitals';

export function WebVitalsReporter() {
  useEffect(() => {
    // Initialize Web Vitals tracking
    initWebVitals();
    
    // Start performance observation
    observePerformance();
    
    // Check performance budget on load
    checkPerformanceBudget();
    
    // Check performance budget periodically
    const budgetInterval = setInterval(checkPerformanceBudget, 30000); // Every 30 seconds
    
    return () => {
      clearInterval(budgetInterval);
    };
  }, []);

  // This component doesn't render anything
  return null;
}