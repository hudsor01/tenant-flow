#!/usr/bin/env node

/**
 * Production Performance Monitor
 * Monitors real-world performance metrics for TenantFlow frontend
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Performance thresholds for production monitoring
const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  LCP: 2500,    // Largest Contentful Paint (ms)
  FID: 100,     // First Input Delay (ms)  
  CLS: 0.1,     // Cumulative Layout Shift
  TTFB: 600,    // Time to First Byte (ms)
  FCP: 1800,    // First Contentful Paint (ms)
  
  // Custom metrics
  TTI: 3500,    // Time to Interactive (ms)
  TBT: 200,     // Total Blocking Time (ms)
  SI: 3000,     // Speed Index (ms)
  
  // Resource metrics
  BUNDLE_SIZE: 500,    // Initial JS bundle size (KB)
  CSS_SIZE: 50,        // Critical CSS size (KB)
  IMAGE_SIZE: 100,     // Largest image size (KB)
  
  // API performance
  API_RESPONSE: 300,   // API response time (ms)
  
  // Cache metrics
  CACHE_HIT_RATE: 0.8, // Minimum cache hit rate
}

class PerformanceMonitor {
  constructor() {
    this.baseURL = 'https://tenantflow.app'
    this.apiURL = 'https://api.tenantflow.app'
    this.endpoints = [
      '/',
      '/pricing',
      '/about',
      '/blog',
      '/auth/login',
      '/auth/signup'
    ]
    this.apiEndpoints = [
      '/api/health',
      '/api/meta/app-info',
      '/api/billing/plans'
    ]
    this.results = []
  }

  /**
   * Run comprehensive performance monitoring
   */
  async monitor() {
    console.log('🔍 Starting Production Performance Monitoring\n')
    console.log('═'.repeat(60))

    try {
      // Test core pages
      await this.testPagePerformance()
      
      // Test API performance
      await this.testAPIPerformance()
      
      // Test cache performance
      await this.testCachePerformance()
      
      // Test edge function performance
      await this.testEdgePerformance()
      
      // Generate report
      this.generateReport()
      
    } catch (error) {
      console.error('❌ Monitoring failed:', error.message)
      process.exit(1)
    }
  }

  /**
   * Test page performance metrics
   */
  async testPagePerformance() {
    console.log('📊 Testing Page Performance...')
    
    for (const endpoint of this.endpoints) {
      const url = `${this.baseURL}${endpoint}`
      const startTime = Date.now()
      
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'TenantFlow-Performance-Monitor/1.0'
          }
        })
        
        const endTime = Date.now()
        const responseTime = endTime - startTime
        
        const result = {
          type: 'page',
          url: endpoint,
          status: response.status,
          responseTime,
          headers: {
            cacheControl: response.headers.get('cache-control'),
            xVercelCache: response.headers.get('x-vercel-cache'),
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
          },
          performance: {
            ttfb: responseTime, // Simplified TTFB measurement
            isGood: responseTime < PERFORMANCE_THRESHOLDS.TTFB
          }
        }
        
        this.results.push(result)
        
        const status = result.performance.isGood ? '✅' : '⚠️'
        console.log(`${status} ${endpoint}: ${responseTime}ms (${response.status})`)
        
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.message}`)
        this.results.push({
          type: 'page',
          url: endpoint,
          error: error.message
        })
      }
    }
  }

  /**
   * Test API performance
   */
  async testAPIPerformance() {
    console.log('\n🔗 Testing API Performance...')
    
    for (const endpoint of this.apiEndpoints) {
      const url = `${this.apiURL}${endpoint}`
      const startTime = Date.now()
      
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'TenantFlow-Performance-Monitor/1.0'
          }
        })
        
        const endTime = Date.now()
        const responseTime = endTime - startTime
        
        const result = {
          type: 'api',
          url: endpoint,
          status: response.status,
          responseTime,
          headers: {
            cacheControl: response.headers.get('cache-control'),
            xEdgeCache: response.headers.get('x-edge-cache'),
            xResponseTime: response.headers.get('x-response-time')
          },
          performance: {
            isGood: responseTime < PERFORMANCE_THRESHOLDS.API_RESPONSE
          }
        }
        
        this.results.push(result)
        
        const status = result.performance.isGood ? '✅' : '⚠️'
        console.log(`${status} ${endpoint}: ${responseTime}ms (${response.status})`)
        
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.message}`)
        this.results.push({
          type: 'api',
          url: endpoint,
          error: error.message
        })
      }
    }
  }

  /**
   * Test cache performance
   */
  async testCachePerformance() {
    console.log('\n📦 Testing Cache Performance...')
    
    // Test cache hit rates by making multiple requests
    const testURL = `${this.baseURL}/`
    const cacheTests = []
    
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(testURL, {
          headers: {
            'User-Agent': 'TenantFlow-Cache-Test/1.0'
          }
        })
        
        cacheTests.push({
          attempt: i + 1,
          cacheStatus: response.headers.get('x-vercel-cache') || 'UNKNOWN',
          responseTime: Date.now()
        })
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        cacheTests.push({
          attempt: i + 1,
          error: error.message
        })
      }
    }
    
    const hitCount = cacheTests.filter(test => test.cacheStatus === 'HIT').length
    const hitRate = hitCount / cacheTests.length
    
    const cacheResult = {
      type: 'cache',
      url: '/',
      hitRate,
      tests: cacheTests,
      performance: {
        isGood: hitRate >= PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE
      }
    }
    
    this.results.push(cacheResult)
    
    const status = cacheResult.performance.isGood ? '✅' : '⚠️'
    console.log(`${status} Cache Hit Rate: ${(hitRate * 100).toFixed(1)}%`)
  }

  /**
   * Test edge function performance
   */
  async testEdgePerformance() {
    console.log('\n⚡ Testing Edge Function Performance...')
    
    const edgeURL = `${this.baseURL}/api/health`
    const edgeTests = []
    
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now()
      
      try {
        const response = await fetch(edgeURL, {
          headers: {
            'User-Agent': 'TenantFlow-Edge-Test/1.0'
          }
        })
        
        const endTime = Date.now()
        const responseTime = endTime - startTime
        
        edgeTests.push({
          attempt: i + 1,
          responseTime,
          status: response.status,
          region: response.headers.get('x-vercel-id') || 'unknown'
        })
        
      } catch (error) {
        edgeTests.push({
          attempt: i + 1,
          error: error.message
        })
      }
    }
    
    const avgResponseTime = edgeTests
      .filter(test => test.responseTime)
      .reduce((sum, test) => sum + test.responseTime, 0) / edgeTests.length
    
    const edgeResult = {
      type: 'edge',
      url: '/api/health',
      averageResponseTime: avgResponseTime,
      tests: edgeTests,
      performance: {
        isGood: avgResponseTime < PERFORMANCE_THRESHOLDS.API_RESPONSE
      }
    }
    
    this.results.push(edgeResult)
    
    const status = edgeResult.performance.isGood ? '✅' : '⚠️'
    console.log(`${status} Edge Functions: ${avgResponseTime.toFixed(0)}ms avg`)
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport() {
    console.log('\n📋 Performance Report')
    console.log('═'.repeat(60))
    
    // Summary statistics
    const pageResults = this.results.filter(r => r.type === 'page' && !r.error)
    const apiResults = this.results.filter(r => r.type === 'api' && !r.error)
    const cacheResults = this.results.filter(r => r.type === 'cache')
    const edgeResults = this.results.filter(r => r.type === 'edge')
    
    console.log(`📊 Pages Tested: ${pageResults.length}`)
    console.log(`🔗 API Endpoints Tested: ${apiResults.length}`)
    console.log(`📦 Cache Tests: ${cacheResults.length}`)
    console.log(`⚡ Edge Tests: ${edgeResults.length}`)
    
    // Performance summary
    const avgPageTime = pageResults.reduce((sum, r) => sum + r.responseTime, 0) / pageResults.length
    const avgAPITime = apiResults.reduce((sum, r) => sum + r.responseTime, 0) / apiResults.length
    
    console.log(`\n⏱️  Average Page Load: ${avgPageTime.toFixed(0)}ms`)
    console.log(`⏱️  Average API Response: ${avgAPITime.toFixed(0)}ms`)
    
    if (cacheResults.length > 0) {
      console.log(`📦 Cache Hit Rate: ${(cacheResults[0].hitRate * 100).toFixed(1)}%`)
    }
    
    // Issues and warnings
    const issues = this.results.filter(r => 
      (r.performance && !r.performance.isGood) || r.error
    )
    
    if (issues.length > 0) {
      console.log('\n⚠️  Performance Issues:')
      issues.forEach(issue => {
        if (issue.error) {
          console.log(`❌ ${issue.url}: ${issue.error}`)
        } else if (issue.type === 'page') {
          console.log(`⚠️  ${issue.url}: ${issue.responseTime}ms (> ${PERFORMANCE_THRESHOLDS.TTFB}ms)`)
        } else if (issue.type === 'api') {
          console.log(`⚠️  ${issue.url}: ${issue.responseTime}ms (> ${PERFORMANCE_THRESHOLDS.API_RESPONSE}ms)`)
        } else if (issue.type === 'cache') {
          console.log(`⚠️  Cache hit rate: ${(issue.hitRate * 100).toFixed(1)}% (< ${PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE * 100}%)`)
        }
      })
    } else {
      console.log('\n✅ All performance metrics within acceptable ranges!')
    }
    
    // Recommendations
    console.log('\n💡 Optimization Recommendations:')
    
    if (avgPageTime > PERFORMANCE_THRESHOLDS.TTFB) {
      console.log('📈 Consider implementing edge-side caching for faster page loads')
    }
    
    if (avgAPITime > PERFORMANCE_THRESHOLDS.API_RESPONSE) {
      console.log('🔧 Optimize API response times or implement request caching')
    }
    
    if (cacheResults.length > 0 && cacheResults[0].hitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE) {
      console.log('📦 Improve cache configuration for better hit rates')
    }
    
    // Save results to file
    const reportFile = path.join(__dirname, '../monitoring-results.json')
    fs.writeFileSync(reportFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        avgPageTime,
        avgAPITime,
        cacheHitRate: cacheResults.length > 0 ? cacheResults[0].hitRate : null,
        issuesFound: issues.length
      },
      results: this.results
    }, null, 2))
    
    console.log(`\n📄 Detailed results saved to: ${reportFile}`)
    console.log('═'.repeat(60))
    
    // Exit with appropriate code
    if (issues.length > 0) {
      console.log('❌ Performance monitoring detected issues')
      process.exit(1)
    } else {
      console.log('✅ Performance monitoring completed successfully')
    }
  }
}

// Run monitoring
const monitor = new PerformanceMonitor()
monitor.monitor().catch(console.error)