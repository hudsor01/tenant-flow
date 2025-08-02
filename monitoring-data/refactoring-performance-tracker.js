#!/usr/bin/env node

/**
 * URGENT: Refactoring Performance Tracker
 * 
 * Real-time monitoring of TenantFlow consolidation refactoring
 * Tracks build errors, fix progress, and performance metrics
 */

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

class RefactoringPerformanceTracker {
  constructor() {
    this.startTime = Date.now()
    this.metrics = {
      timestamp: this.startTime,
      buildErrors: [],
      fixes: [],
      typeErrors: 0,
      buildTime: null,
      status: 'in-progress'
    }
    
    console.log('🚨 URGENT: Starting refactoring performance monitoring...')
    this.trackBuildStatus()
  }

  trackBuildStatus() {
    console.log('📊 Checking current build status...')
    
    try {
      // Quick TypeScript check
      const tsResult = execSync('cd /Users/richard/Developer/tenant-flow/apps/backend && npx tsc --noEmit --pretty', 
        { encoding: 'utf8', timeout: 30000 })
      
      this.metrics.typeErrors = 0
      this.metrics.status = 'typescript-clean'
      console.log('✅ TypeScript compilation: CLEAN')
      
    } catch (error) {
      const errorOutput = error.message || error.stdout || error.stderr || ''
      const errorCount = (errorOutput.match(/error TS\d+:/g) || []).length
      
      this.metrics.typeErrors = errorCount
      this.metrics.buildErrors.push({
        timestamp: Date.now(),
        type: 'typescript',
        count: errorCount,
        details: errorOutput.slice(0, 1000) // First 1000 chars
      })
      
      console.log(`❌ TypeScript errors found: ${errorCount}`)
      
      // Extract specific error types
      if (errorOutput.includes('does not satisfy the constraint')) {
        console.log('🔴 CRITICAL: Repository constraint violations detected')
      }
      if (errorOutput.includes('must have an \'override\' modifier')) {
        console.log('🔴 CRITICAL: Missing override modifiers')
      }
      if (errorOutput.includes('is private and only accessible')) {
        console.log('🔴 CRITICAL: Private member access violations')
      }
    }

    // Try a quick build test
    try {
      console.log('📊 Testing build performance...')
      const buildStart = Date.now()
      
      execSync('cd /Users/richard/Developer/tenant-flow/apps/backend && npm run build', 
        { encoding: 'utf8', timeout: 60000 })
      
      const buildTime = Date.now() - buildStart
      this.metrics.buildTime = buildTime
      this.metrics.status = 'build-success'
      
      console.log(`✅ Build completed: ${buildTime}ms`)
      
    } catch (error) {
      this.metrics.status = 'build-failed'
      console.log('❌ Build failed - critical refactoring issues remain')
    }

    this.saveMetrics()
    this.generateReport()
  }

  recordFix(description) {
    this.metrics.fixes.push({
      timestamp: Date.now(),
      description,
      elapsedTime: Date.now() - this.startTime
    })
    
    console.log(`🔧 Fix applied: ${description}`)
    this.saveMetrics()
  }

  saveMetrics() {
    const metricsPath = '/Users/richard/Developer/tenant-flow/monitoring-data/refactoring-metrics.json'
    writeFileSync(metricsPath, JSON.stringify(this.metrics, null, 2))
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      status: this.metrics.status,
      issues: {
        typeErrors: this.metrics.typeErrors,
        buildErrors: this.metrics.buildErrors.length
      },
      progress: {
        fixes: this.metrics.fixes.length,
        lastFix: this.metrics.fixes[this.metrics.fixes.length - 1]?.description || 'None'
      },
      recommendations: this.generateRecommendations()
    }

    console.log('\n📊 REFACTORING PERFORMANCE REPORT')
    console.log('='.repeat(50))
    console.log(`Status: ${report.status}`)
    console.log(`Duration: ${Math.round(report.duration / 1000)}s`)
    console.log(`Type Errors: ${report.issues.typeErrors}`)
    console.log(`Fixes Applied: ${report.progress.fixes}`)
    
    if (report.recommendations.length > 0) {
      console.log('\n🔧 URGENT ACTIONS NEEDED:')
      report.recommendations.forEach(rec => console.log(`   🔴 ${rec}`))
    }
    
    console.log('='.repeat(50))

    // Save HTML report
    const htmlReport = this.generateHTMLReport(report)
    writeFileSync('/Users/richard/Developer/tenant-flow/monitoring-data/refactoring-report.html', htmlReport)
    
    return report
  }

  generateRecommendations() {
    const recommendations = []
    
    if (this.metrics.typeErrors > 0) {
      recommendations.push('Fix TypeScript compilation errors immediately')
    }
    
    if (this.metrics.status === 'build-failed') {
      recommendations.push('Resolve build failures blocking deployment')
    }
    
    if (this.metrics.buildErrors.some(e => e.details.includes('constraint'))) {
      recommendations.push('Fix repository inheritance and constraints')
    }
    
    if (this.metrics.buildErrors.some(e => e.details.includes('override'))) {
      recommendations.push('Add missing override modifiers to methods')
    }
    
    return recommendations
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>TenantFlow Refactoring Performance Monitor</title>
    <style>
        body { font-family: monospace; margin: 20px; background: #1a1a1a; color: #00ff00; }
        .container { max-width: 1000px; margin: 0 auto; }
        .status { font-size: 24px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .metric { background: #333; padding: 15px; border-radius: 5px; }
        .error { color: #ff4444; }
        .success { color: #44ff44; }
        .warning { color: #ffaa44; }
        .recommendations { background: #ff4444; color: white; padding: 15px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚨 URGENT: TenantFlow Refactoring Monitor</h1>
        <div class="status ${report.status.includes('success') ? 'success' : 'error'}">
            Status: ${report.status.toUpperCase()}
        </div>
        
        <div class="metrics">
            <div class="metric">
                <h3>Duration</h3>
                <div>${Math.round(report.duration / 1000)}s</div>
            </div>
            <div class="metric">
                <h3>Type Errors</h3>
                <div class="${report.issues.typeErrors > 0 ? 'error' : 'success'}">${report.issues.typeErrors}</div>
            </div>
            <div class="metric">
                <h3>Fixes Applied</h3>
                <div>${report.progress.fixes}</div>
            </div>
            <div class="metric">
                <h3>Build Errors</h3>
                <div class="${report.issues.buildErrors > 0 ? 'error' : 'success'}">${report.issues.buildErrors}</div>
            </div>
        </div>
        
        ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h3>URGENT ACTIONS REQUIRED:</h3>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        <div style="margin-top: 30px; font-size: 12px; color: #666;">
            Generated: ${report.timestamp}
        </div>
    </div>
</body>
</html>`
  }
}

// Global instance for recording fixes
global.refactoringTracker = new RefactoringPerformanceTracker()

// Export function to record fixes
export function recordFix(description) {
  if (global.refactoringTracker) {
    global.refactoringTracker.recordFix(description)
  }
}
