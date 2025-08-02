#!/usr/bin/env node

/**
 * Performance Monitoring Dashboard for TenantFlow
 * 
 * Comprehensive infrastructure monitoring system that tracks:
 * - Railway deployment pipeline performance
 * - Vercel frontend build optimization
 * - Edge cache performance and hit rates
 * - Docker build time improvements
 * - Database connection pooling metrics
 * - Core Web Vitals and real user metrics
 * 
 * Designed to work independently of backend deduplication process
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync, exec } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

class PerformanceMonitoringDashboard {
  constructor() {
    this.metricsDir = join(projectRoot, 'monitoring-data')
    this.buildMetricsFile = join(this.metricsDir, 'build-metrics.json')
    this.deploymentMetricsFile = join(this.metricsDir, 'deployment-metrics.json')
    this.performanceMetricsFile = join(this.metricsDir, 'performance-metrics.json')
    this.edgeCacheMetricsFile = join(this.metricsDir, 'edge-cache-metrics.json')
    
    this.ensureDirectoryExists()
    this.initializeMetrics()
  }

  ensureDirectoryExists() {
    if (!existsSync(this.metricsDir)) {
      mkdirSync(this.metricsDir, { recursive: true })
    }
  }

  initializeMetrics() {
    const defaultMetrics = {
      buildMetrics: {
        timestamp: Date.now(),
        railwayBuildTimes: [],
        vercelBuildTimes: [],
        dockerBuildTimes: [],
        turboBuildTimes: [],
        optimizations: []
      },
      deploymentMetrics: {
        timestamp: Date.now(),
        railwayDeployments: [],
        vercelDeployments: [],
        healthCheckTimes: [],
        uptime: []
      },
      performanceMetrics: {
        timestamp: Date.now(),
        coreWebVitals: [],
        apiResponseTimes: [],
        databaseQueryTimes: [],
        edgeCacheHitRates: []
      },
      edgeCacheMetrics: {
        timestamp: Date.now(),
        cacheHitRates: [],
        cacheMissRates: [],
        edgeResponseTimes: [],
        regionPerformance: {}
      }
    }

    // Initialize files if they don't exist
    if (!existsSync(this.buildMetricsFile)) {
      this.saveMetrics(this.buildMetricsFile, defaultMetrics.buildMetrics)
    }
    if (!existsSync(this.deploymentMetricsFile)) {
      this.saveMetrics(this.deploymentMetricsFile, defaultMetrics.deploymentMetrics)
    }
    if (!existsSync(this.performanceMetricsFile)) {
      this.saveMetrics(this.performanceMetricsFile, defaultMetrics.performanceMetrics)
    }
    if (!existsSync(this.edgeCacheMetricsFile)) {
      this.saveMetrics(this.edgeCacheMetricsFile, defaultMetrics.edgeCacheMetrics)
    }
  }

  loadMetrics(filePath) {
    try {
      return JSON.parse(readFileSync(filePath, 'utf8'))
    } catch (error) {
      console.warn(`Failed to load metrics from ${filePath}:`, error.message)
      return {}
    }
  }

  saveMetrics(filePath, metrics) {
    try {
      writeFileSync(filePath, JSON.stringify(metrics, null, 2))
    } catch (error) {
      console.error(`Failed to save metrics to ${filePath}:`, error.message)
    }
  }

  /**
   * Track Railway deployment performance
   */
  async trackRailwayDeployment() {
    console.log('📊 Tracking Railway deployment performance...')
    
    const startTime = Date.now()
    const deploymentData = {
      timestamp: startTime,
      type: 'railway',
      status: 'started',
      buildTime: null,
      deployTime: null,
      healthCheckTime: null,
      totalTime: null
    }

    try {
      // Check Railway service status
      const railwayStatus = await this.checkRailwayStatus()
      console.log('Railway Status:', railwayStatus)

      // Measure health check response time
      const healthCheckStart = Date.now()
      const healthCheck = await this.checkHealthEndpoint('https://api.tenantflow.app/health')
      const healthCheckTime = Date.now() - healthCheckStart

      deploymentData.healthCheckTime = healthCheckTime
      deploymentData.healthCheckStatus = healthCheck.status
      deploymentData.totalTime = Date.now() - startTime
      deploymentData.status = 'completed'

      // Load and update deployment metrics
      const metrics = this.loadMetrics(this.deploymentMetricsFile)
      metrics.railwayDeployments = metrics.railwayDeployments || []
      metrics.railwayDeployments.push(deploymentData)
      
      // Keep only last 100 deployments
      if (metrics.railwayDeployments.length > 100) {
        metrics.railwayDeployments = metrics.railwayDeployments.slice(-100)
      }
      
      metrics.timestamp = Date.now()
      this.saveMetrics(this.deploymentMetricsFile, metrics)

      console.log(`✅ Railway deployment tracked: ${deploymentData.totalTime}ms total, ${healthCheckTime}ms health check`)
      
    } catch (error) {
      deploymentData.status = 'failed'
      deploymentData.error = error.message
      console.error('❌ Railway deployment tracking failed:', error.message)
    }

    return deploymentData
  }

  /**
   * Track Vercel frontend build performance
   */
  async trackVercelBuild() {
    console.log('📊 Tracking Vercel build performance...')
    
    const startTime = Date.now()
    const buildData = {
      timestamp: startTime,
      type: 'vercel',
      status: 'started',
      buildTime: null,
      bundleSize: null,
      optimizations: []
    }

    try {
      // Run frontend build and measure time
      console.log('Building frontend...')
      const buildStart = Date.now()
      
      exec('cd apps/frontend && npm run build', { 
        cwd: projectRoot,
        timeout: 300000 // 5 minutes timeout
      }, (error, stdout, stderr) => {
        const buildTime = Date.now() - buildStart
        buildData.buildTime = buildTime

        if (error) {
          buildData.status = 'failed'
          buildData.error = error.message
          console.error('❌ Vercel build failed:', error.message)
          return
        }

        // Analyze bundle size
        try {
          const distPath = join(projectRoot, 'apps/frontend/dist')
          const bundleAnalysis = this.analyzeBundleSize(distPath)
          buildData.bundleSize = bundleAnalysis
          
          // Check for optimization opportunities
          buildData.optimizations = this.identifyOptimizations(bundleAnalysis)
          
          buildData.status = 'completed'
          buildData.totalTime = Date.now() - startTime

          // Save metrics
          const metrics = this.loadMetrics(this.buildMetricsFile)
          metrics.vercelBuildTimes = metrics.vercelBuildTimes || []
          metrics.vercelBuildTimes.push(buildData)
          
          if (metrics.vercelBuildTimes.length > 100) {
            metrics.vercelBuildTimes = metrics.vercelBuildTimes.slice(-100)
          }
          
          metrics.timestamp = Date.now()
          this.saveMetrics(this.buildMetricsFile, metrics)

          console.log(`✅ Vercel build tracked: ${buildTime}ms, bundle: ${this.formatBytes(bundleAnalysis.totalSize)}`)
          
        } catch (analysisError) {
          console.warn('⚠️ Bundle analysis failed:', analysisError.message)
        }
      })
      
    } catch (error) {
      buildData.status = 'failed'
      buildData.error = error.message
      console.error('❌ Vercel build tracking failed:', error.message)
    }

    return buildData
  }

  /**
   * Track Docker build performance
   */
  async trackDockerBuild() {
    console.log('📊 Tracking Docker build performance...')
    
    const startTime = Date.now()
    const buildData = {
      timestamp: startTime,
      type: 'docker',
      status: 'started',
      buildTime: null,
      imageSize: null,
      cacheHits: 0,
      layers: 0
    }

    try {
      // Build Docker image and capture metrics
      console.log('Building Docker image...')
      const buildStart = Date.now()
      
      const dockerCommand = 'docker build --progress=plain -t tenantflow-test .'
      const buildOutput = execSync(dockerCommand, { 
        cwd: projectRoot, 
        encoding: 'utf8',
        timeout: 600000 // 10 minutes timeout
      })
      
      const buildTime = Date.now() - buildStart
      buildData.buildTime = buildTime

      // Parse Docker build output for cache hits and layers
      const cacheHits = (buildOutput.match(/CACHED/g) || []).length
      const layers = (buildOutput.match(/\[[0-9]+\/[0-9]+\]/g) || []).length
      
      buildData.cacheHits = cacheHits
      buildData.layers = layers

      // Get image size
      try {
        const imageSizeOutput = execSync('docker image ls tenantflow-test --format "{{.Size}}"', { encoding: 'utf8' })
        buildData.imageSize = imageSizeOutput.trim()
      } catch (sizeError) {
        console.warn('Could not get image size:', sizeError.message)
      }

      buildData.status = 'completed'
      buildData.totalTime = Date.now() - startTime

      // Save metrics
      const metrics = this.loadMetrics(this.buildMetricsFile)
      metrics.dockerBuildTimes = metrics.dockerBuildTimes || []
      metrics.dockerBuildTimes.push(buildData)
      
      if (metrics.dockerBuildTimes.length > 100) {
        metrics.dockerBuildTimes = metrics.dockerBuildTimes.slice(-100)
      }
      
      metrics.timestamp = Date.now()
      this.saveMetrics(this.buildMetricsFile, metrics)

      console.log(`✅ Docker build tracked: ${buildTime}ms, ${cacheHits} cache hits, size: ${buildData.imageSize}`)
      
    } catch (error) {
      buildData.status = 'failed'
      buildData.error = error.message
      console.error('❌ Docker build tracking failed:', error.message)
    }

    return buildData
  }

  /**
   * Track Turbo build cache performance
   */
  async trackTurboBuild() {
    console.log('📊 Tracking Turbo build cache performance...')
    
    const startTime = Date.now()
    const buildData = {
      timestamp: startTime,
      type: 'turbo',
      status: 'started',
      buildTime: null,
      cacheHits: 0,
      cacheMisses: 0,
      packagesBuilt: 0
    }

    try {
      console.log('Running Turbo build...')
      const buildStart = Date.now()
      
      const turboCommand = 'npx turbo run build --summarize'
      const buildOutput = execSync(turboCommand, { 
        cwd: projectRoot, 
        encoding: 'utf8',
        timeout: 300000 // 5 minutes timeout
      })
      
      const buildTime = Date.now() - buildStart
      buildData.buildTime = buildTime

      // Parse Turbo output for cache metrics
      const cacheHits = (buildOutput.match(/cache hit/gi) || []).length
      const cacheMisses = (buildOutput.match(/cache miss/gi) || []).length
      const packagesBuilt = (buildOutput.match(/Tasks:/g) || []).length
      
      buildData.cacheHits = cacheHits
      buildData.cacheMisses = cacheMisses
      buildData.packagesBuilt = packagesBuilt
      buildData.cacheHitRate = cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses)) * 100 : 0

      buildData.status = 'completed'
      buildData.totalTime = Date.now() - startTime

      // Save metrics
      const metrics = this.loadMetrics(this.buildMetricsFile)
      metrics.turboBuildTimes = metrics.turboBuildTimes || []
      metrics.turboBuildTimes.push(buildData)
      
      if (metrics.turboBuildTimes.length > 100) {
        metrics.turboBuildTimes = metrics.turboBuildTimes.slice(-100)
      }
      
      metrics.timestamp = Date.now()
      this.saveMetrics(this.buildMetricsFile, metrics)

      console.log(`✅ Turbo build tracked: ${buildTime}ms, ${buildData.cacheHitRate.toFixed(1)}% cache hit rate`)
      
    } catch (error) {
      buildData.status = 'failed'
      buildData.error = error.message
      console.error('❌ Turbo build tracking failed:', error.message)
    }

    return buildData
  }

  /**
   * Monitor edge cache performance
   */
  async trackEdgeCachePerformance() {
    console.log('📊 Tracking Edge cache performance...')
    
    const cacheData = {
      timestamp: Date.now(),
      tests: []
    }

    const testUrls = [
      { url: 'https://tenantflow.app/', type: 'html', expectCached: false },
      { url: 'https://tenantflow.app/static/js/index.js', type: 'js', expectCached: true },
      { url: 'https://tenantflow.app/static/css/index.css', type: 'css', expectCached: true },
      { url: 'https://tenantflow.app/pricing', type: 'html', expectCached: true },
      { url: 'https://tenantflow.app/blog', type: 'html', expectCached: true }
    ]

    for (const testCase of testUrls) {
      try {
        const startTime = Date.now()
        
        // Make request and check cache headers
        const response = await fetch(testCase.url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'TenantFlow-Performance-Monitor/1.0'
          }
        })
        
        const responseTime = Date.now() - startTime
        const cacheStatus = response.headers.get('x-vercel-cache') || 'unknown'
        const cacheControl = response.headers.get('cache-control') || ''
        const age = response.headers.get('age') || '0'
        
        const testResult = {
          url: testCase.url,
          type: testCase.type,
          responseTime,
          cacheStatus,
          cacheControl,
          age: parseInt(age),
          isCacheHit: cacheStatus === 'HIT',
          expectCached: testCase.expectCached,
          performanceGrade: this.calculatePerformanceGrade(responseTime, cacheStatus, testCase.expectCached)
        }
        
        cacheData.tests.push(testResult)
        console.log(`${testResult.performanceGrade} ${testCase.url}: ${responseTime}ms, cache: ${cacheStatus}`)
        
      } catch (error) {
        console.error(`❌ Cache test failed for ${testCase.url}:`, error.message)
        cacheData.tests.push({
          url: testCase.url,
          type: testCase.type,
          error: error.message,
          performanceGrade: '❌'
        })
      }
    }

    // Calculate overall cache performance
    const hitRate = cacheData.tests.filter(t => t.isCacheHit).length / cacheData.tests.length * 100
    const avgResponseTime = cacheData.tests.reduce((sum, t) => sum + (t.responseTime || 0), 0) / cacheData.tests.length
    
    cacheData.summary = {
      hitRate,
      avgResponseTime,
      totalTests: cacheData.tests.length,
      successfulTests: cacheData.tests.filter(t => !t.error).length
    }

    // Save metrics
    const metrics = this.loadMetrics(this.edgeCacheMetricsFile)
    metrics.cacheHitRates = metrics.cacheHitRates || []
    metrics.cacheHitRates.push({
      timestamp: Date.now(),
      hitRate,
      avgResponseTime,
      details: cacheData
    })
    
    if (metrics.cacheHitRates.length > 100) {
      metrics.cacheHitRates = metrics.cacheHitRates.slice(-100)
    }
    
    metrics.timestamp = Date.now()
    this.saveMetrics(this.edgeCacheMetricsFile, metrics)

    console.log(`✅ Edge cache tracking completed: ${hitRate.toFixed(1)}% hit rate, ${avgResponseTime.toFixed(0)}ms avg response`)
    
    return cacheData
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport() {
    console.log('📊 Generating comprehensive performance report...')
    
    const buildMetrics = this.loadMetrics(this.buildMetricsFile)
    const deploymentMetrics = this.loadMetrics(this.deploymentMetricsFile)
    const performanceMetrics = this.loadMetrics(this.performanceMetricsFile)
    const edgeCacheMetrics = this.loadMetrics(this.edgeCacheMetricsFile)

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        buildPerformance: this.analyzeBuildPerformance(buildMetrics),
        deploymentPerformance: this.analyzeDeploymentPerformance(deploymentMetrics),
        edgeCachePerformance: this.analyzeEdgeCachePerformance(edgeCacheMetrics),
        recommendations: []
      },
      metrics: {
        buildMetrics,
        deploymentMetrics,
        performanceMetrics,
        edgeCacheMetrics
      }
    }

    // Generate recommendations
    report.summary.recommendations = this.generateRecommendations(report.summary)

    // Save report
    const reportPath = join(this.metricsDir, 'performance-report.json')
    this.saveMetrics(reportPath, report)

    // Generate HTML report
    this.generateHTMLReport(report)

    console.log('✅ Performance report generated')
    console.log('📄 Report saved to:', reportPath)
    console.log('🌐 HTML report available at:', join(this.metricsDir, 'performance-report.html'))

    return report
  }

  /**
   * Utility functions
   */
  async checkRailwayStatus() {
    try {
      const response = await fetch('https://api.tenantflow.app/health', {
        timeout: 10000
      })
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        statusCode: response.status,
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      }
    }
  }

  async checkHealthEndpoint(url) {
    const startTime = Date.now()
    try {
      const response = await fetch(url, { timeout: 10000 })
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        statusCode: response.status,
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        responseTime: Date.now() - startTime
      }
    }
  }

  analyzeBundleSize(distPath) {
    try {
      const stats = execSync(`find "${distPath}" -name "*.js" -o -name "*.css" | xargs wc -c`, { encoding: 'utf8' })
      const lines = stats.trim().split('\n')
      const totalLine = lines[lines.length - 1]
      const totalSize = parseInt(totalLine.split(' ')[0])
      
      return {
        totalSize,
        fileCount: lines.length - 1,
        avgFileSize: totalSize / (lines.length - 1)
      }
    } catch (error) {
      console.warn('Bundle size analysis failed:', error.message)
      return { totalSize: 0, fileCount: 0, avgFileSize: 0 }
    }
  }

  identifyOptimizations(bundleAnalysis) {
    const optimizations = []
    
    if (bundleAnalysis.totalSize > 2000000) { // 2MB
      optimizations.push('Consider more aggressive code splitting')
    }
    
    if (bundleAnalysis.avgFileSize > 500000) { // 500KB
      optimizations.push('Individual bundle chunks are large - implement dynamic imports')
    }
    
    return optimizations
  }

  calculatePerformanceGrade(responseTime, cacheStatus, expectCached) {
    if (expectCached && cacheStatus === 'HIT' && responseTime < 100) return '🟢'
    if (!expectCached && responseTime < 200) return '🟢'
    if (responseTime < 500) return '🟡'
    return '🔴'
  }

  analyzeBuildPerformance(metrics) {
    const summary = {}
    
    if (metrics.vercelBuildTimes?.length > 0) {
      const recent = metrics.vercelBuildTimes.slice(-10)
      summary.vercel = {
        avgBuildTime: recent.reduce((sum, b) => sum + (b.buildTime || 0), 0) / recent.length,
        recentBuilds: recent.length,
        trend: this.calculateTrend(recent.map(b => b.buildTime || 0))
      }
    }
    
    if (metrics.dockerBuildTimes?.length > 0) {
      const recent = metrics.dockerBuildTimes.slice(-10)
      summary.docker = {
        avgBuildTime: recent.reduce((sum, b) => sum + (b.buildTime || 0), 0) / recent.length,
        avgCacheHitRate: recent.reduce((sum, b) => sum + (b.cacheHits || 0), 0) / recent.length,
        recentBuilds: recent.length
      }
    }
    
    if (metrics.turboBuildTimes?.length > 0) {
      const recent = metrics.turboBuildTimes.slice(-10)
      summary.turbo = {
        avgBuildTime: recent.reduce((sum, b) => sum + (b.buildTime || 0), 0) / recent.length,
        avgCacheHitRate: recent.reduce((sum, b) => sum + (b.cacheHitRate || 0), 0) / recent.length,
        recentBuilds: recent.length
      }
    }
    
    return summary
  }

  analyzeDeploymentPerformance(metrics) {
    const summary = {}
    
    if (metrics.railwayDeployments?.length > 0) {
      const recent = metrics.railwayDeployments.slice(-10)
      const successful = recent.filter(d => d.status === 'completed')
      summary.railway = {
        avgHealthCheckTime: successful.reduce((sum, d) => sum + (d.healthCheckTime || 0), 0) / successful.length,
        successRate: (successful.length / recent.length) * 100,
        recentDeployments: recent.length
      }
    }
    
    return summary
  }

  analyzeEdgeCachePerformance(metrics) {
    if (!metrics.cacheHitRates?.length) return {}
    
    const recent = metrics.cacheHitRates.slice(-10)
    return {
      avgHitRate: recent.reduce((sum, c) => sum + (c.hitRate || 0), 0) / recent.length,
      avgResponseTime: recent.reduce((sum, c) => sum + (c.avgResponseTime || 0), 0) / recent.length,
      recentTests: recent.length
    }
  }

  generateRecommendations(summary) {
    const recommendations = []
    
    // Build performance recommendations
    if (summary.buildPerformance?.vercel?.avgBuildTime > 120000) {
      recommendations.push({
        type: 'build',
        priority: 'high',
        title: 'Optimize Vercel build time',
        description: `Average build time is ${Math.round(summary.buildPerformance.vercel.avgBuildTime / 1000)}s. Consider optimizing dependencies and build process.`
      })
    }
    
    if (summary.buildPerformance?.turbo?.avgCacheHitRate < 70) {
      recommendations.push({
        type: 'build',
        priority: 'medium',
        title: 'Improve Turbo cache hit rate',
        description: `Cache hit rate is ${summary.buildPerformance.turbo.avgCacheHitRate.toFixed(1)}%. Review cache keys and build configuration.`
      })
    }
    
    // Edge cache recommendations
    if (summary.edgeCachePerformance?.avgHitRate < 80) {
      recommendations.push({
        type: 'cache',
        priority: 'high',
        title: 'Improve edge cache hit rate',
        description: `Cache hit rate is ${summary.edgeCachePerformance.avgHitRate.toFixed(1)}%. Review cache headers and TTL settings.`
      })
    }
    
    // Deployment recommendations
    if (summary.deploymentPerformance?.railway?.avgHealthCheckTime > 2000) {
      recommendations.push({
        type: 'deployment',
        priority: 'medium',
        title: 'Optimize health check performance',
        description: `Health checks are averaging ${summary.deploymentPerformance.railway.avgHealthCheckTime}ms. Consider optimizing the health endpoint.`
      })
    }
    
    return recommendations
  }

  generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TenantFlow Performance Monitor</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 10px; }
        .timestamp { color: #666; font-size: 14px; margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; }
        .metric-title { font-weight: 600; margin-bottom: 10px; color: #333; }
        .metric-value { font-size: 24px; font-weight: 700; color: #007bff; margin-bottom: 5px; }
        .metric-subtitle { font-size: 12px; color: #666; }
        .recommendations { margin-top: 30px; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin-bottom: 10px; border-radius: 4px; }
        .recommendation.high { border-color: #e74c3c; background: #fdf2f2; }
        .recommendation.medium { border-color: #f39c12; background: #fef9e7; }
        .rec-title { font-weight: 600; margin-bottom: 5px; }
        .rec-description { font-size: 14px; color: #555; }
        .status { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
        .status.healthy { background: #d4edda; color: #155724; }
        .status.warning { background: #fff3cd; color: #856404; }
        .status.error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 TenantFlow Performance Monitor</h1>
        <div class="timestamp">Generated: ${report.generatedAt}</div>
        
        <div class="metrics-grid">
            ${this.generateMetricCards(report.summary)}
        </div>
        
        <div class="recommendations">
            <h2>📋 Recommendations</h2>
            ${report.summary.recommendations.map(rec => `
                <div class="recommendation ${rec.priority}">
                    <div class="rec-title">${rec.title}</div>
                    <div class="rec-description">${rec.description}</div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`
    
    const htmlPath = join(this.metricsDir, 'performance-report.html')
    writeFileSync(htmlPath, html)
  }

  generateMetricCards(summary) {
    const cards = []
    
    if (summary.buildPerformance?.vercel) {
      cards.push(`
        <div class="metric-card">
            <div class="metric-title">Vercel Build Performance</div>
            <div class="metric-value">${Math.round(summary.buildPerformance.vercel.avgBuildTime / 1000)}s</div>
            <div class="metric-subtitle">Average build time (last 10 builds)</div>
        </div>
      `)
    }
    
    if (summary.buildPerformance?.turbo) {
      cards.push(`
        <div class="metric-card">
            <div class="metric-title">Turbo Cache Performance</div>
            <div class="metric-value">${summary.buildPerformance.turbo.avgCacheHitRate.toFixed(1)}%</div>
            <div class="metric-subtitle">Cache hit rate</div>
        </div>
      `)
    }
    
    if (summary.edgeCachePerformance) {
      cards.push(`
        <div class="metric-card">
            <div class="metric-title">Edge Cache Performance</div>
            <div class="metric-value">${summary.edgeCachePerformance.avgHitRate.toFixed(1)}%</div>
            <div class="metric-subtitle">Hit rate, ${Math.round(summary.edgeCachePerformance.avgResponseTime)}ms avg response</div>
        </div>
      `)
    }
    
    if (summary.deploymentPerformance?.railway) {
      cards.push(`
        <div class="metric-card">
            <div class="metric-title">Railway Deployment</div>
            <div class="metric-value">${summary.deploymentPerformance.railway.successRate.toFixed(1)}%</div>
            <div class="metric-subtitle">Success rate, ${Math.round(summary.deploymentPerformance.railway.avgHealthCheckTime)}ms health checks</div>
        </div>
      `)
    }
    
    return cards.join('')
  }

  calculateTrend(values) {
    if (values.length < 2) return 'insufficient-data'
    
    const recent = values.slice(-3)
    const older = values.slice(-6, -3)
    
    if (older.length === 0) return 'insufficient-data'
    
    const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length
    const olderAvg = older.reduce((sum, v) => sum + v, 0) / older.length
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100
    
    if (change > 10) return 'improving'
    if (change < -10) return 'degrading'
    return 'stable'
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Main monitoring command
   */
  async runFullMonitoring() {
    console.log('🚀 Starting comprehensive performance monitoring...\n')
    
    try {
      // Run all monitoring tasks
      await Promise.all([
        this.trackRailwayDeployment(),
        this.trackEdgeCachePerformance()
      ])
      
      // Run build monitoring (sequential to avoid resource conflicts)
      await this.trackTurboBuild()
      await this.trackDockerBuild()
      
      // Generate report
      const report = this.generatePerformanceReport()
      
      console.log('\n✅ Comprehensive performance monitoring completed!')
      console.log(`📊 Report available at: ${join(this.metricsDir, 'performance-report.html')}`)
      
      // Output key metrics to console
      this.printSummaryToConsole(report.summary)
      
    } catch (error) {
      console.error('❌ Performance monitoring failed:', error.message)
      process.exit(1)
    }
  }

  printSummaryToConsole(summary) {
    console.log('\n📊 PERFORMANCE SUMMARY')
    console.log('='.repeat(50))
    
    if (summary.buildPerformance?.vercel) {
      console.log(`🏗️  Vercel Build: ${Math.round(summary.buildPerformance.vercel.avgBuildTime / 1000)}s avg`)
    }
    
    if (summary.buildPerformance?.turbo) {
      console.log(`⚡ Turbo Cache: ${summary.buildPerformance.turbo.avgCacheHitRate.toFixed(1)}% hit rate`)
    }
    
    if (summary.edgeCachePerformance) {
      console.log(`🌐 Edge Cache: ${summary.edgeCachePerformance.avgHitRate.toFixed(1)}% hit rate, ${Math.round(summary.edgeCachePerformance.avgResponseTime)}ms avg`)
    }
    
    if (summary.deploymentPerformance?.railway) {
      console.log(`🚀 Railway: ${summary.deploymentPerformance.railway.successRate.toFixed(1)}% success rate`)
    }
    
    if (summary.recommendations.length > 0) {
      console.log('\n🔧 TOP RECOMMENDATIONS:')
      summary.recommendations.slice(0, 3).forEach(rec => {
        console.log(`   ${rec.priority === 'high' ? '🔴' : '🟡'} ${rec.title}`)
      })
    }
    
    console.log('='.repeat(50))
  }
}

// CLI handling
const args = process.argv.slice(2)
const command = args[0] || 'full'

const monitor = new PerformanceMonitoringDashboard()

switch (command) {
  case 'railway':
    monitor.trackRailwayDeployment()
    break
  case 'vercel':
    monitor.trackVercelBuild()
    break
  case 'docker':
    monitor.trackDockerBuild()
    break
  case 'turbo':
    monitor.trackTurboBuild()
    break
  case 'cache':
    monitor.trackEdgeCachePerformance()
    break
  case 'report':
    monitor.generatePerformanceReport()
    break
  case 'full':
  default:
    monitor.runFullMonitoring()
    break
}