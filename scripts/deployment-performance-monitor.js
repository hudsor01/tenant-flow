#!/usr/bin/env node

/**
 * Deployment Performance Monitor
 * Monitors deployment performance, cache hit rates, and edge performance
 */

import { performance } from 'perf_hooks';
import fetch from 'node-fetch';

class DeploymentPerformanceMonitor {
  constructor() {
    this.baseUrl = process.env.DEPLOY_URL || 'https://tenantflow.app';
    this.apiBaseUrl = process.env.API_BASE_URL || 'https://api.tenantflow.app';
    this.regions = ['us-east-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1'];
  }

  /**
   * Test critical route performance
   */
  async testRoutePerformance() {
    const criticalRoutes = [
      '/',
      '/pricing',
      '/auth/login',
      '/dashboard',
      '/properties'
    ];

    const results = [];

    for (const route of criticalRoutes) {
      const start = performance.now();
      
      try {
        const response = await fetch(`${this.baseUrl}${route}`, {
          headers: {
            'User-Agent': 'TenantFlow-Performance-Monitor/1.0',
            'Accept': 'text/html,application/xhtml+xml',
            'Cache-Control': 'no-cache'
          }
        });

        const end = performance.now();
        const duration = Math.round(end - start);
        
        const cacheStatus = response.headers.get('x-vercel-cache') || 'UNKNOWN';
        const region = response.headers.get('x-vercel-id') || 'UNKNOWN';
        
        results.push({
          route,
          status: response.status,
          duration,
          cacheStatus,
          region,
          size: parseInt(response.headers.get('content-length') || '0'),
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        results.push({
          route,
          status: 'ERROR',
          duration: 0,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Test API endpoint performance
   */
  async testAPIPerformance() {
    const apiEndpoints = [
      '/api/health',
      '/api/v1/auth/me',
      '/api/v1/properties',
      '/api/v1/tenants'
    ];

    const results = [];

    for (const endpoint of apiEndpoints) {
      const start = performance.now();
      
      try {
        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
          headers: {
            'User-Agent': 'TenantFlow-Performance-Monitor/1.0',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        const end = performance.now();
        const duration = Math.round(end - start);
        
        results.push({
          endpoint,
          status: response.status,
          duration,
          size: parseInt(response.headers.get('content-length') || '0'),
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        results.push({
          endpoint,
          status: 'ERROR',
          duration: 0,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Test static asset performance
   */
  async testStaticAssetPerformance() {
    const staticAssets = [
      '/static/js/index.js',
      '/static/css/index.css',
      '/static/img/logo.png',
      '/manifest.json'
    ];

    const results = [];

    for (const asset of staticAssets) {
      const start = performance.now();
      
      try {
        const response = await fetch(`${this.baseUrl}${asset}`, {
          headers: {
            'User-Agent': 'TenantFlow-Performance-Monitor/1.0',
            'Cache-Control': 'no-cache'
          }
        });

        const end = performance.now();
        const duration = Math.round(end - start);
        
        const cacheControl = response.headers.get('cache-control') || 'UNKNOWN';
        const etag = response.headers.get('etag') || 'UNKNOWN';
        
        results.push({
          asset,
          status: response.status,
          duration,
          cacheControl,
          etag,
          size: parseInt(response.headers.get('content-length') || '0'),
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        results.push({
          asset,
          status: 'ERROR',
          duration: 0,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Test Core Web Vitals from different regions
   */
  async testWebVitals() {
    try {
      const response = await fetch(`${this.baseUrl}/api/web-vitals`, {
        headers: {
          'User-Agent': 'TenantFlow-Performance-Monitor/1.0'
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        return { error: 'Web Vitals endpoint not available' };
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Generate performance report
   */
  generateReport(routeResults, apiResults, assetResults, webVitals) {
    const report = {
      timestamp: new Date().toISOString(),
      deployment: {
        url: this.baseUrl,
        apiUrl: this.apiBaseUrl
      },
      performance: {
        routes: routeResults,
        api: apiResults,
        assets: assetResults,
        webVitals
      },
      summary: {
        totalTests: routeResults.length + apiResults.length + assetResults.length,
        averageResponseTime: this.calculateAverageResponseTime([
          ...routeResults,
          ...apiResults,
          ...assetResults
        ]),
        cacheHitRate: this.calculateCacheHitRate(routeResults),
        errorRate: this.calculateErrorRate([
          ...routeResults,
          ...apiResults,
          ...assetResults
        ])
      },
      recommendations: this.generateRecommendations([
        ...routeResults,
        ...apiResults,
        ...assetResults
      ])
    };

    return report;
  }

  calculateAverageResponseTime(results) {
    const validResults = results.filter(r => r.duration && r.duration > 0);
    if (validResults.length === 0) return 0;
    
    const total = validResults.reduce((sum, r) => sum + r.duration, 0);
    return Math.round(total / validResults.length);
  }

  calculateCacheHitRate(results) {
    const withCacheStatus = results.filter(r => r.cacheStatus);
    if (withCacheStatus.length === 0) return 0;
    
    const hits = withCacheStatus.filter(r => r.cacheStatus === 'HIT').length;
    return Math.round((hits / withCacheStatus.length) * 100);
  }

  calculateErrorRate(results) {
    const errors = results.filter(r => r.status === 'ERROR' || r.status >= 400).length;
    return Math.round((errors / results.length) * 100);
  }

  generateRecommendations(results) {
    const recommendations = [];
    
    // Check response times
    const slowResults = results.filter(r => r.duration > 2000);
    if (slowResults.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `${slowResults.length} resources have response times > 2s`,
        affected: slowResults.map(r => r.route || r.endpoint || r.asset)
      });
    }

    // Check cache hit rates
    const routeResults = results.filter(r => r.route);
    const cacheHitRate = this.calculateCacheHitRate(routeResults);
    if (cacheHitRate < 80) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        message: `Cache hit rate is ${cacheHitRate}%, should be >80%`,
        suggestion: 'Review cache headers and CDN configuration'
      });
    }

    // Check error rates
    const errorRate = this.calculateErrorRate(results);
    if (errorRate > 5) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: `Error rate is ${errorRate}%, should be <5%`,
        suggestion: 'Review failing endpoints and error handling'
      });
    }

    return recommendations;
  }

  /**
   * Run complete performance monitoring
   */
  async run() {
    console.log('🚀 Starting deployment performance monitoring...');
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`API URL: ${this.apiBaseUrl}`);

    const [routeResults, apiResults, assetResults, webVitals] = await Promise.all([
      this.testRoutePerformance(),
      this.testAPIPerformance(),
      this.testStaticAssetPerformance(),
      this.testWebVitals()
    ]);

    const report = this.generateReport(routeResults, apiResults, assetResults, webVitals);

    // Output results
    if (process.env.CI) {
      // In CI, output structured JSON for parsing
      console.log(JSON.stringify(report, null, 2));
    } else {
      // In local environment, output human-readable format
      this.printHumanReadableReport(report);
    }

    // Exit with error code if there are critical issues
    if (report.summary.errorRate > 10 || report.summary.averageResponseTime > 3000) {
      process.exit(1);
    }

    return report;
  }

  printHumanReadableReport(report) {
    console.log('\n📊 Performance Report');
    console.log('='.repeat(50));
    console.log(`⏱️  Average Response Time: ${report.summary.averageResponseTime}ms`);
    console.log(`💨 Cache Hit Rate: ${report.summary.cacheHitRate}%`);
    console.log(`❌ Error Rate: ${report.summary.errorRate}%`);

    if (report.recommendations.length > 0) {
      console.log('\n🔍 Recommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        if (rec.suggestion) {
          console.log(`   💡 ${rec.suggestion}`);
        }
      });
    } else {
      console.log('\n✅ All performance metrics are within acceptable ranges!');
    }

    console.log('\n📈 Detailed Results:');
    console.log('Routes:', report.performance.routes.length, 'tested');
    console.log('API Endpoints:', report.performance.api.length, 'tested');
    console.log('Static Assets:', report.performance.assets.length, 'tested');
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new DeploymentPerformanceMonitor();
  monitor.run().catch(error => {
    console.error('❌ Performance monitoring failed:', error);
    process.exit(1);
  });
}

export default DeploymentPerformanceMonitor;