/**
 * Memory Monitoring and Leak Detection Utilities
 * Provides tools to monitor memory usage and detect potential leaks
 */

// Type definitions for Performance Memory API
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

declare global {
  interface Performance {
    memory?: PerformanceMemory;
  }
  
  interface Window {
    gc?: () => void;
  }
}

interface MemoryInfo {
  used: number;
  total: number;
  limit: number;
  timestamp: number;
}

class MemoryMonitor {
  private samples: MemoryInfo[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private readonly maxSamples = 50; // Keep last 50 samples
  private readonly warningThreshold = 100; // MB
  private readonly criticalThreshold = 500; // MB

  /**
   * Start monitoring memory usage
   */
  start(intervalMs: number = 10000): void {
    if (typeof window === 'undefined' || !this.isMemoryAPIAvailable()) {
      console.warn('Memory monitoring not available in this environment');
      return;
    }

    this.stop(); // Stop any existing monitoring

    this.intervalId = setInterval(() => {
      this.recordSample();
    }, intervalMs);

    console.log('Memory monitoring started');
  }

  /**
   * Stop monitoring memory usage
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Memory monitoring stopped');
    }
  }

  /**
   * Record a memory usage sample
   */
  private recordSample(): void {
    if (!this.isMemoryAPIAvailable()) return;

    const memory = performance.memory!;
    const sample: MemoryInfo = {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      timestamp: Date.now()
    };

    this.samples.push(sample);

    // Keep only the last N samples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    this.checkForMemoryLeaks(sample);
  }

  /**
   * Check for potential memory leaks
   */
  private checkForMemoryLeaks(currentSample: MemoryInfo): void {
    // Warning threshold
    if (currentSample.used > this.warningThreshold) {
      console.warn(`⚠️ High memory usage: ${currentSample.used}MB`);
    }

    // Critical threshold
    if (currentSample.used > this.criticalThreshold) {
      console.error(`🚨 Critical memory usage: ${currentSample.used}MB`);
      this.logMemoryReport();
    }

    // Check for consistent growth (potential leak)
    if (this.samples.length >= 10) {
      const recentSamples = this.samples.slice(-10);
      const growthTrend = this.calculateGrowthTrend(recentSamples);
      
      if (growthTrend > 2) { // Growing by more than 2MB per sample
        console.warn(`📈 Potential memory leak detected (growth: ${growthTrend.toFixed(2)}MB/sample)`);
      }
    }
  }

  /**
   * Calculate memory growth trend
   */
  private calculateGrowthTrend(samples: MemoryInfo[]): number {
    if (samples.length < 2) return 0;

    const first = samples[0].used;
    const last = samples[samples.length - 1].used;
    const growth = last - first;
    
    return growth / samples.length;
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): MemoryInfo | null {
    if (!this.isMemoryAPIAvailable()) return null;

    const memory = performance.memory!;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      timestamp: Date.now()
    };
  }

  /**
   * Log detailed memory report
   */
  logMemoryReport(): void {
    const current = this.getCurrentMemoryUsage();
    if (!current) return;

    console.group('📊 Memory Usage Report');
    console.log(`Used: ${current.used}MB`);
    console.log(`Total: ${current.total}MB`);
    console.log(`Limit: ${current.limit}MB`);
    console.log(`Usage: ${((current.used / current.limit) * 100).toFixed(1)}%`);
    
    if (this.samples.length > 1) {
      const trend = this.calculateGrowthTrend(this.samples);
      console.log(`Growth Trend: ${trend.toFixed(2)}MB per sample`);
    }
    
    console.groupEnd();
  }

  /**
   * Check if Memory API is available
   */
  private isMemoryAPIAvailable(): boolean {
    return typeof window !== 'undefined' && 
           'performance' in window && 
           !!performance.memory;
  }

  /**
   * Force garbage collection (development only)
   */
  forceGC(): void {
    if (typeof window !== 'undefined' && window.gc) {
      console.log('🗑️ Forcing garbage collection...');
      window.gc();
    } else {
      console.warn('Garbage collection not available (add --expose-gc flag in development)');
    }
  }
}

// Singleton instance
export const memoryMonitor = new MemoryMonitor();

/**
 * React hook for memory monitoring
 */
export function useMemoryMonitor(enabled: boolean = true) {
  React.useEffect(() => {
    if (enabled && process.env.NODE_ENV === 'development') {
      memoryMonitor.start(5000); // Check every 5 seconds in development
      
      return () => {
        memoryMonitor.stop();
      };
    }
  }, [enabled]);

  return {
    getCurrentUsage: () => memoryMonitor.getCurrentMemoryUsage(),
    logReport: () => memoryMonitor.logMemoryReport(),
    forceGC: () => memoryMonitor.forceGC()
  };
}

import React from 'react';
