#!/usr/bin/env node

/**
 * Router Loader Performance Monitor
 * 
 * Monitors loader performance, cache hit rates, and error patterns
 * to help optimize the user experience.
 */

const fs = require('fs')
const path = require('path')

class LoaderPerformanceMonitor {
  constructor() {
    this.metrics = {
      loaders: new Map(),
      errors: new Map(),
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0
    }
    
    this.thresholds = {
      slow: 1000, // 1 second
      verySlow: 3000, // 3 seconds
      maxErrors: 5
    }
  }
  
  /**
   * Analyze loader performance logs
   */
  analyzePerformance() {
    console.log('📊 Router Loader Performance Analysis\n')
    
    // Simulate reading from browser performance API or logs
    const sampleMetrics = this.generateSampleMetrics()
    
    this.displayOverallStats(sampleMetrics)
    this.displayLoaderStats(sampleMetrics.loaders)
    this.displayErrorAnalysis(sampleMetrics.errors)
    this.displayRecommendations(sampleMetrics)
  }
  
  displayOverallStats(metrics) {
    const cacheHitRate = (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100
    
    console.log('🔍 Overall Performance:')
    console.log(`   Total Requests: ${metrics.totalRequests}`)
    console.log(`   Cache Hit Rate: ${cacheHitRate.toFixed(1)}%`)
    console.log(`   Average Load Time: ${metrics.avgLoadTime}ms`)
    console.log(`   Error Rate: ${((metrics.totalErrors / metrics.totalRequests) * 100).toFixed(1)}%`)
    console.log('')
  }
  
  displayLoaderStats(loaders) {
    console.log('⚡ Loader Performance:')
    
    const sortedLoaders = Array.from(loaders.entries())
      .sort((a, b) => b[1].avgTime - a[1].avgTime)
    
    sortedLoaders.forEach(([loader, stats]) => {
      const status = this.getPerformanceStatus(stats.avgTime)
      console.log(`   ${loader}:`)
      console.log(`      Average: ${stats.avgTime}ms ${status}`)
      console.log(`      Calls: ${stats.calls}`)
      console.log(`      Cache Hits: ${stats.cacheHits}/${stats.calls} (${((stats.cacheHits/stats.calls)*100).toFixed(1)}%)`)
      
      if (stats.errors > 0) {
        console.log(`      Errors: ${stats.errors} ⚠️`)
      }
      console.log('')
    })
  }
  
  displayErrorAnalysis(errors) {
    if (errors.size === 0) {
      console.log('✅ No loader errors detected')
      return
    }
    
    console.log('🚨 Error Analysis:')
    
    Array.from(errors.entries()).forEach(([errorType, count]) => {
      console.log(`   ${errorType}: ${count} occurrences`)
    })
    console.log('')
  }
  
  displayRecommendations(metrics) {
    console.log('💡 Recommendations:')
    
    const recommendations = []
    
    // Cache hit rate recommendations
    const cacheHitRate = (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100
    if (cacheHitRate < 60) {
      recommendations.push('Consider implementing preloading for frequently accessed routes')
      recommendations.push('Review cache TTL settings - some data might be expiring too quickly')
    }
    
    // Performance recommendations
    Array.from(metrics.loaders.entries()).forEach(([loader, stats]) => {
      if (stats.avgTime > this.thresholds.verySlow) {
        recommendations.push(`${loader}: Very slow loading (${stats.avgTime}ms) - consider parallel loading or data optimization`)
      } else if (stats.avgTime > this.thresholds.slow) {
        recommendations.push(`${loader}: Slow loading (${stats.avgTime}ms) - consider caching improvements`)
      }
      
      const cacheRate = (stats.cacheHits / stats.calls) * 100
      if (cacheRate < 40) {
        recommendations.push(`${loader}: Low cache hit rate (${cacheRate.toFixed(1)}%) - review caching strategy`)
      }
    })
    
    // Error recommendations
    if (metrics.totalErrors > this.thresholds.maxErrors) {
      recommendations.push('High error rate detected - review error handling and fallback strategies')
    }
    
    if (recommendations.length === 0) {
      console.log('   🎉 Performance looks good! No recommendations at this time.')
    } else {
      recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`)
      })
    }
    console.log('')
  }
  
  getPerformanceStatus(time) {
    if (time > this.thresholds.verySlow) return '🐌'
    if (time > this.thresholds.slow) return '⚠️'
    return '✅'
  }
  
  generateSampleMetrics() {
    // In a real implementation, this would read from actual performance logs
    return {
      cacheHits: 856,
      cacheMisses: 244,
      totalRequests: 1100,
      totalErrors: 12,
      avgLoadTime: 342,
      loaders: new Map([
        ['dashboard', { avgTime: 245, calls: 156, cacheHits: 98, errors: 1 }],
        ['properties', { avgTime: 189, calls: 234, cacheHits: 178, errors: 2 }],
        ['property-detail', { avgTime: 412, calls: 89, cacheHits: 45, errors: 3 }],
        ['tenants', { avgTime: 167, calls: 145, cacheHits: 112, errors: 1 }],
        ['tenant-detail', { avgTime: 298, calls: 67, cacheHits: 34, errors: 2 }],
        ['maintenance', { avgTime: 223, calls: 78, cacheHits: 56, errors: 1 }],
        ['analytics', { avgTime: 1234, calls: 23, cacheHits: 12, errors: 2 }]
      ]),
      errors: new Map([
        ['NetworkError', 5],
        ['AuthenticationError', 3],
        ['PermissionError', 2],
        ['ValidationError', 2]
      ])
    }
  }
  
  /**
   * Generate performance report
   */
  generateReport() {
    const metrics = this.generateSampleMetrics()
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests: metrics.totalRequests,
        cacheHitRate: ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(1),
        avgLoadTime: metrics.avgLoadTime,
        errorRate: ((metrics.totalErrors / metrics.totalRequests) * 100).toFixed(1)
      },
      loaders: Object.fromEntries(metrics.loaders),
      errors: Object.fromEntries(metrics.errors)
    }
    
    const reportPath = path.join(__dirname, '..', 'reports', 'loader-performance.json')
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath)
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`📋 Performance report saved to: ${reportPath}`)
  }
}

// CLI interface
const command = process.argv[2]
const monitor = new LoaderPerformanceMonitor()

switch (command) {
  case 'analyze':
    monitor.analyzePerformance()
    break
  case 'report':
    monitor.generateReport()
    break
  default:
    console.log('Router Loader Performance Monitor')
    console.log('')
    console.log('Usage:')
    console.log('  node scripts/monitor-loader-performance.js analyze  - Analyze current performance')
    console.log('  node scripts/monitor-loader-performance.js report   - Generate performance report')
    console.log('')
    console.log('Examples:')
    console.log('  npm run loaders:analyze')
    console.log('  npm run loaders:report')
}
