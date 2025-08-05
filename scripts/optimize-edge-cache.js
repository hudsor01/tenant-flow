#!/usr/bin/env node

/**
 * Edge Cache Optimization Script
 * Optimizes Vercel Edge Network cache configuration for maximum performance
 */

import fetch from 'node-fetch';

class EdgeCacheOptimizer {
  constructor() {
    this.baseUrl = process.env.DEPLOY_URL || 'https://tenantflow.app';
    this.vercelToken = process.env.VERCEL_TOKEN;
    this.regions = ['iad1', 'sfo1', 'lhr1', 'fra1', 'sin1', 'hnd1'];
  }

  /**
   * Warm critical routes across all edge regions
   */
  async warmCriticalRoutes() {
    const criticalRoutes = [
      '/',
      '/pricing',
      '/about',
      '/contact',
      '/auth/login',
      '/auth/signup',
      '/dashboard',
      '/properties',
      '/tenants',
      '/maintenance'
    ];

    console.log('🌍 Warming critical routes across edge regions...');
    
    const results = [];
    
    for (const route of criticalRoutes) {
      const routeResults = [];
      
      // Test from multiple regions by using different user agents
      for (const region of this.regions) {
        try {
          const start = Date.now();
          const response = await fetch(`${this.baseUrl}${route}`, {
            headers: {
              'User-Agent': `TenantFlow-EdgeWarmer/${region}`,
              'Cache-Control': 'no-cache',
              'X-Vercel-Region': region,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br'
            }
          });
          
          const duration = Date.now() - start;
          const cacheStatus = response.headers.get('x-vercel-cache');
          const actualRegion = response.headers.get('x-vercel-id');
          
          routeResults.push({
            region,
            status: response.status,
            duration,
            cacheStatus,
            actualRegion,
            success: response.ok
          });
          
          // Small delay to prevent overwhelming the edge network
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          routeResults.push({
            region,
            status: 'ERROR',
            error: error.message,
            success: false
          });
        }
      }
      
      results.push({
        route,
        regions: routeResults,
        summary: {
          successRate: Math.round((routeResults.filter(r => r.success).length / routeResults.length) * 100),
          averageDuration: Math.round(routeResults.reduce((sum, r) => sum + (r.duration || 0), 0) / routeResults.length),
          cacheHitRate: Math.round((routeResults.filter(r => r.cacheStatus === 'HIT').length / routeResults.length) * 100)
        }
      });
    }

    return results;
  }

  /**
   * Prefetch static assets to edge cache
   */
  async prefetchStaticAssets() {
    console.log('📦 Prefetching static assets...');
    
    const staticAssets = [
      '/static/js/react-vendor.js',
      '/static/js/router-vendor.js',
      '/static/js/ui-vendor.js',
      '/static/css/index.css',
      '/static/img/logo.png',
      '/static/fonts/inter.woff2',
      '/manifest.json',
      '/favicon.ico'
    ];

    const results = [];

    for (const asset of staticAssets) {
      try {
        const start = Date.now();
        const response = await fetch(`${this.baseUrl}${asset}`, {
          headers: {
            'User-Agent': 'TenantFlow-AssetPreloader/1.0',
            'Cache-Control': 'max-age=0',
            'Accept': '*/*'
          }
        });

        const duration = Date.now() - start;
        const cacheStatus = response.headers.get('x-vercel-cache');
        const cacheControl = response.headers.get('cache-control');
        
        results.push({
          asset,
          status: response.status,
          duration,
          cacheStatus,
          cacheControl,
          size: parseInt(response.headers.get('content-length') || '0'),
          success: response.ok
        });

      } catch (error) {
        results.push({
          asset,
          status: 'ERROR',
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }

  /**
   * Optimize cache headers for better edge performance
   */
  generateOptimalCacheHeaders() {
    return {
      // HTML pages - short cache with revalidation
      'text/html': {
        'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
        'Vary': 'Accept-Encoding, Accept'
      },
      
      // Static JS/CSS - immutable with long cache
      'application/javascript': {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept-Encoding'
      },
      
      'text/css': {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept-Encoding'
      },

      // Images - long cache with conditional requests
      'image/*': {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept'
      },

      // Fonts - very long cache (rarely change)
      'font/*': {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      },

      // API responses - conditional caching
      'application/json': {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        'Vary': 'Accept, Authorization'
      },

      // Service Worker - no cache (needs to be fresh)
      'service-worker': {
        'Cache-Control': 'public, max-age=0, must-revalidate'
      }
    };
  }

  /**
   * Test edge network latency from multiple regions
   */
  async testEdgeLatency() {
    console.log('🌐 Testing edge network latency...');
    
    const testEndpoint = `${this.baseUrl}/api/ping`;
    const results = [];

    for (const region of this.regions) {
      const regionResults = [];
      
      // Run multiple tests per region for accuracy
      for (let i = 0; i < 3; i++) {
        try {
          const start = Date.now();
          const response = await fetch(testEndpoint, {
            headers: {
              'User-Agent': `TenantFlow-LatencyTest/${region}`,
              'X-Vercel-Region': region
            }
          });
          
          const duration = Date.now() - start;
          const actualRegion = response.headers.get('x-vercel-id');
          
          regionResults.push({
            attempt: i + 1,
            duration,
            actualRegion,
            success: response.ok
          });
          
        } catch (error) {
          regionResults.push({
            attempt: i + 1,
            duration: 0,
            error: error.message,
            success: false
          });
        }
        
        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const successfulResults = regionResults.filter(r => r.success);
      const averageLatency = successfulResults.length > 0 
        ? Math.round(successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length)
        : 0;
      
      results.push({
        region,
        attempts: regionResults,
        averageLatency,
        successRate: Math.round((successfulResults.length / regionResults.length) * 100)
      });
    }

    return results;
  }

  /**
   * Purge specific cache entries if needed
   */
  async purgeCache(patterns = []) {
    if (!this.vercelToken) {
      console.log('⚠️  No Vercel token provided, skipping cache purge');
      return { skipped: true };
    }

    console.log('🗑️  Purging cache entries...');
    
    const defaultPatterns = [
      '/api/*',
      '/dashboard*',
      '/properties*'
    ];
    
    const purgePatterns = patterns.length > 0 ? patterns : defaultPatterns;
    
    try {
      const response = await fetch('https://api.vercel.com/v1/purge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: purgePatterns
        })
      });

      if (response.ok) {
        return {
          success: true,
          patterns: purgePatterns,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate optimization report
   */
  generateOptimizationReport(warmingResults, assetResults, latencyResults, purgeResults) {
    const report = {
      timestamp: new Date().toISOString(),
      deployment: {
        url: this.baseUrl,
        regions: this.regions
      },
      optimization: {
        routeWarming: warmingResults,
        assetPrefetch: assetResults,
        edgeLatency: latencyResults,
        cachePurge: purgeResults
      },
      summary: {
        totalRoutesTested: warmingResults.length,
        averageCacheHitRate: Math.round(
          warmingResults.reduce((sum, r) => sum + r.summary.cacheHitRate, 0) / warmingResults.length
        ),
        averageEdgeLatency: Math.round(
          latencyResults.reduce((sum, r) => sum + r.averageLatency, 0) / latencyResults.length
        ),
        assetPrefetchSuccessRate: Math.round(
          (assetResults.filter(r => r.success).length / assetResults.length) * 100
        )
      },
      recommendations: this.generateCacheRecommendations(warmingResults, assetResults, latencyResults)
    };

    return report;
  }

  generateCacheRecommendations(warmingResults, assetResults, latencyResults) {
    const recommendations = [];

    // Check cache hit rates
    const lowCacheHitRoutes = warmingResults.filter(r => r.summary.cacheHitRate < 70);
    if (lowCacheHitRoutes.length > 0) {
      recommendations.push({
        type: 'cache-optimization',
        priority: 'high',
        message: `${lowCacheHitRoutes.length} routes have low cache hit rates (<70%)`,
        affected: lowCacheHitRoutes.map(r => r.route),
        suggestion: 'Review cache headers and implement stale-while-revalidate strategy'
      });
    }

    // Check edge latency
    const highLatencyRegions = latencyResults.filter(r => r.averageLatency > 500);
    if (highLatencyRegions.length > 0) {
      recommendations.push({
        type: 'edge-performance',
        priority: 'medium',
        message: `${highLatencyRegions.length} regions have high latency (>500ms)`,
        affected: highLatencyRegions.map(r => r.region),
        suggestion: 'Consider additional edge regions or origin optimization'
      });
    }

    // Check asset loading
    const failedAssets = assetResults.filter(r => !r.success);
    if (failedAssets.length > 0) {
      recommendations.push({
        type: 'asset-optimization',
        priority: 'high',
        message: `${failedAssets.length} static assets failed to load`,
        affected: failedAssets.map(r => r.asset),
        suggestion: 'Review asset paths and ensure proper CDN distribution'
      });
    }

    return recommendations;
  }

  /**
   * Run complete edge cache optimization
   */
  async run() {
    console.log('🚀 Starting edge cache optimization...');
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Regions: ${this.regions.join(', ')}`);

    const [warmingResults, assetResults, latencyResults, purgeResults] = await Promise.all([
      this.warmCriticalRoutes(),
      this.prefetchStaticAssets(),
      this.testEdgeLatency(),
      this.purgeCache()
    ]);

    const report = this.generateOptimizationReport(
      warmingResults,
      assetResults,
      latencyResults,
      purgeResults
    );

    // Output results
    if (process.env.CI) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      this.printOptimizationReport(report);
    }

    return report;
  }

  printOptimizationReport(report) {
    console.log('\n🎯 Edge Cache Optimization Report');
    console.log('='.repeat(50));
    console.log(`💨 Average Cache Hit Rate: ${report.summary.averageCacheHitRate}%`);
    console.log(`⚡ Average Edge Latency: ${report.summary.averageEdgeLatency}ms`);
    console.log(`📦 Asset Prefetch Success: ${report.summary.assetPrefetchSuccessRate}%`);

    if (report.recommendations.length > 0) {
      console.log('\n🔍 Optimization Recommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        console.log(`   💡 ${rec.suggestion}`);
      });
    } else {
      console.log('\n✅ Edge cache is optimally configured!');
    }

    console.log('\nOptimal Cache Headers:');
    const headers = this.generateOptimalCacheHeaders();
    Object.entries(headers).forEach(([type, headerConfig]) => {
      console.log(`${type}:`);
      Object.entries(headerConfig).forEach(([header, value]) => {
        console.log(`  ${header}: ${value}`);
      });
    });
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new EdgeCacheOptimizer();
  optimizer.run().catch(error => {
    console.error('❌ Edge cache optimization failed:', error);
    process.exit(1);
  });
}

export default EdgeCacheOptimizer;