#!/usr/bin/env node

/**
 * Refactoring Impact Monitor
 * 
 * Continuously monitors API contracts and frontend compatibility
 * during backend service refactoring. Alerts on breaking changes.
 * 
 * Usage:
 *   npm run monitor:refactoring
 *   node scripts/monitor-refactoring-impact.js
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

// Configuration
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://api.tenantflow.app/api/v1'
const STAGING_API_URL = process.env.VITE_STAGING_API_URL || 'https://staging-api.tenantflow.app/api/v1'
const MONITOR_INTERVAL = process.env.MONITOR_INTERVAL || 30000 // 30 seconds
const MAX_RETRIES = 3
const ALERT_THRESHOLD = 5 // failures before alert

// Monitoring state
const monitoringState = {
  consecutiveFailures: {},
  lastSuccessfulTest: {},
  alerts: [],
  startTime: new Date(),
  totalTests: 0,
  totalFailures: 0
}

/**
 * Create API client for testing
 */
function createApiClient(baseUrl, timeout = 10000) {
  return axios.create({
    baseURL: baseUrl,
    timeout,
    headers: {
      'Content-Type': 'application/json'
    },
    validateStatus: () => true
  })
}

/**
 * Log with timestamp
 */
function log(level, message, data = null) {
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`
  
  console.log(logEntry)
  
  if (data) {
    console.log(JSON.stringify(data, null, 2))
  }
  
  // Append to log file
  const logPath = path.join(process.cwd(), 'refactoring-monitor.log')
  fs.appendFileSync(logPath, logEntry + '\n')
}

/**
 * Test endpoint availability and response format
 */
async function testEndpoint(client, endpoint, expectedStatus = [200, 401, 403]) {
  try {
    const response = await client.get(endpoint)
    
    if (!Array.isArray(expectedStatus)) {
      expectedStatus = [expectedStatus]
    }
    
    if (!expectedStatus.includes(response.status)) {
      throw new Error(`Unexpected status ${response.status} for ${endpoint}`)
    }
    
    // Validate response structure for successful requests
    if (response.status === 200 && response.data) {
      if (typeof response.data !== 'object') {
        throw new Error(`Invalid response format for ${endpoint}`)
      }
    }
    
    return {
      success: true,
      status: response.status,
      responseTime: response.headers['x-response-time'] || 'unknown'
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new Error(`Service unavailable: ${endpoint}`)
    }
    
    throw error
  }
}

/**
 * Compare API responses between production and staging
 */
async function compareApiResponses(endpoint) {
  const prodClient = createApiClient(API_BASE_URL)
  const stagingClient = createApiClient(STAGING_API_URL)
  
  try {
    const [prodResponse, stagingResponse] = await Promise.allSettled([
      prodClient.get(endpoint),
      stagingClient.get(endpoint)
    ])
    
    const comparison = {
      endpoint,
      production: {
        status: prodResponse.status === 'fulfilled' ? prodResponse.value.status : 'error',
        available: prodResponse.status === 'fulfilled'
      },
      staging: {
        status: stagingResponse.status === 'fulfilled' ? stagingResponse.value.status : 'error',
        available: stagingResponse.status === 'fulfilled'
      },
      compatible: false
    }
    
    // Check compatibility
    if (comparison.production.available && comparison.staging.available) {
      const prodData = prodResponse.value.data
      const stagingData = stagingResponse.value.data
      
      // Basic structure comparison
      comparison.compatible = (
        prodResponse.value.status === stagingResponse.value.status &&
        typeof prodData === typeof stagingData
      )
      
      // For successful responses, check data structure
      if (comparison.production.status === 200 && comparison.staging.status === 200) {
        comparison.dataStructureMatch = compareDataStructure(prodData, stagingData)
      }
    }
    
    return comparison
    
  } catch (error) {
    log('error', `Failed to compare API responses for ${endpoint}`, { error: error.message })
    return {
      endpoint,
      production: { status: 'error', available: false },
      staging: { status: 'error', available: false },
      compatible: false,
      error: error.message
    }
  }
}

/**
 * Compare data structure between responses
 */
function compareDataStructure(prod, staging) {
  if (typeof prod !== typeof staging) {
    return false
  }
  
  if (Array.isArray(prod) !== Array.isArray(staging)) {
    return false
  }
  
  if (typeof prod === 'object' && prod !== null && staging !== null) {
    const prodKeys = Object.keys(prod).sort()
    const stagingKeys = Object.keys(staging).sort()
    
    // Check if all production keys exist in staging
    return prodKeys.every(key => stagingKeys.includes(key))
  }
  
  return true
}

/**
 * Test critical endpoints
 */
async function testCriticalEndpoints() {
  const criticalEndpoints = [
    '/properties',
    '/properties/stats',
    '/tenants',
    '/tenants/stats',
    '/units',
    '/leases',
    '/maintenance',
    '/auth/me',
    '/subscriptions/current',
    '/users/profile'
  ]
  
  const results = {
    passed: 0,
    failed: 0,
    comparisons: []
  }
  
  for (const endpoint of criticalEndpoints) {
    try {
      monitoringState.totalTests++
      
      // Test production endpoint
      const prodClient = createApiClient(API_BASE_URL)
      await testEndpoint(prodClient, endpoint)
      
      // Compare with staging if available
      if (STAGING_API_URL !== API_BASE_URL) {
        const comparison = await compareApiResponses(endpoint)
        results.comparisons.push(comparison)
        
        if (!comparison.compatible) {
          throw new Error(`API contract mismatch: ${endpoint}`)
        }
      }
      
      results.passed++
      monitoringState.consecutiveFailures[endpoint] = 0
      monitoringState.lastSuccessfulTest[endpoint] = new Date()
      
    } catch (error) {
      results.failed++
      monitoringState.totalFailures++
      monitoringState.consecutiveFailures[endpoint] = 
        (monitoringState.consecutiveFailures[endpoint] || 0) + 1
      
      log('error', `Endpoint test failed: ${endpoint}`, { error: error.message })
      
      // Check if we need to alert
      if (monitoringState.consecutiveFailures[endpoint] >= ALERT_THRESHOLD) {
        createAlert('critical', `Endpoint ${endpoint} has failed ${monitoringState.consecutiveFailures[endpoint]} consecutive times`)
      }
    }
  }
  
  return results
}

/**
 * Test frontend integration files
 */
async function testFrontendIntegration() {
  const { testFrontendIntegration } = require('./test-frontend-integration.js')
  
  try {
    const success = await testFrontendIntegration()
    
    if (!success) {
      createAlert('warning', 'Frontend integration tests detected issues')
    }
    
    return success
    
  } catch (error) {
    log('error', 'Frontend integration test failed', { error: error.message })
    createAlert('critical', 'Frontend integration tests failed to run')
    return false
  }
}

/**
 * Create alert
 */
function createAlert(severity, message, data = null) {
  const alert = {
    timestamp: new Date().toISOString(),
    severity,
    message,
    data
  }
  
  monitoringState.alerts.push(alert)
  
  log(severity, `ALERT: ${message}`, data)
  
  // Save alert to file for external monitoring
  const alertsPath = path.join(process.cwd(), 'refactoring-alerts.json')
  fs.writeFileSync(alertsPath, JSON.stringify(monitoringState.alerts, null, 2))
}

/**
 * Generate monitoring report
 */
function generateMonitoringReport() {
  const runtime = new Date() - monitoringState.startTime
  const uptime = Math.floor(runtime / 1000)
  
  const report = {
    timestamp: new Date().toISOString(),
    uptime: `${uptime} seconds`,
    statistics: {
      totalTests: monitoringState.totalTests,
      totalFailures: monitoringState.totalFailures,
      successRate: monitoringState.totalTests > 0 
        ? ((monitoringState.totalTests - monitoringState.totalFailures) / monitoringState.totalTests * 100).toFixed(2) + '%'
        : '0%'
    },
    consecutiveFailures: monitoringState.consecutiveFailures,
    lastSuccessfulTests: monitoringState.lastSuccessfulTest,
    alerts: {
      total: monitoringState.alerts.length,
      critical: monitoringState.alerts.filter(a => a.severity === 'critical').length,
      warning: monitoringState.alerts.filter(a => a.severity === 'warning').length
    },
    recommendations: []
  }
  
  // Add recommendations based on current state
  if (report.statistics.totalFailures > 0) {
    report.recommendations.push('Review failed endpoints and investigate backend changes')
  }
  
  if (Object.values(monitoringState.consecutiveFailures).some(count => count >= 3)) {
    report.recommendations.push('Consider rolling back recent changes or investigating service issues')
  }
  
  if (monitoringState.alerts.filter(a => a.severity === 'critical').length > 0) {
    report.recommendations.push('Immediate attention required - critical system issues detected')
  }
  
  return report
}

/**
 * Main monitoring loop
 */
async function monitoringLoop() {
  log('info', 'Starting monitoring cycle...')
  
  try {
    // Test API endpoints
    const endpointResults = await testCriticalEndpoints()
    
    // Test frontend integration periodically (every 5th cycle)
    if (monitoringState.totalTests % 50 === 0) {
      await testFrontendIntegration()
    }
    
    // Log current status
    log('info', 'Monitoring cycle completed', {
      endpointsPassed: endpointResults.passed,
      endpointsFailed: endpointResults.failed,
      totalAlerts: monitoringState.alerts.length
    })
    
    // Generate and save report
    const report = generateMonitoringReport()
    const reportPath = path.join(process.cwd(), 'refactoring-monitoring-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    // Check if we should continue monitoring
    const criticalAlerts = monitoringState.alerts.filter(a => a.severity === 'critical').length
    if (criticalAlerts >= 10) {
      log('critical', 'Too many critical alerts - stopping monitoring')
      createAlert('critical', 'Monitoring stopped due to excessive critical alerts')
      return false
    }
    
    return true
    
  } catch (error) {
    log('error', 'Monitoring cycle failed', { error: error.message })
    createAlert('critical', 'Monitoring system error', { error: error.message })
    return false
  }
}

/**
 * Handle graceful shutdown
 */
function setupShutdownHandlers() {
  process.on('SIGINT', () => {
    log('info', 'Shutting down monitoring...')
    
    const finalReport = generateMonitoringReport()
    console.log('\n' + '='.repeat(80))
    console.log('📊 FINAL MONITORING REPORT')
    console.log('='.repeat(80))
    console.log(`Runtime: ${finalReport.uptime}`)
    console.log(`Total Tests: ${finalReport.statistics.totalTests}`)
    console.log(`Success Rate: ${finalReport.statistics.successRate}`)
    console.log(`Total Alerts: ${finalReport.alerts.total}`)
    console.log(`Critical Alerts: ${finalReport.alerts.critical}`)
    
    if (finalReport.recommendations.length > 0) {
      console.log('\n🔍 RECOMMENDATIONS:')
      finalReport.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`)
      })
    }
    
    console.log('\n📁 Final report saved to: refactoring-monitoring-report.json')
    process.exit(0)
  })
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Starting Refactoring Impact Monitor...')
  console.log(`Production API: ${API_BASE_URL}`)
  if (STAGING_API_URL !== API_BASE_URL) {
    console.log(`Staging API: ${STAGING_API_URL}`)
  }
  console.log(`Monitor Interval: ${MONITOR_INTERVAL}ms`)
  console.log('Press Ctrl+C to stop monitoring\n')
  
  setupShutdownHandlers()
  
  // Initial test
  const initialResults = await testCriticalEndpoints()
  log('info', 'Initial test completed', {
    passed: initialResults.passed,
    failed: initialResults.failed
  })
  
  // Start monitoring loop
  const monitoringTimer = setInterval(async () => {
    const shouldContinue = await monitoringLoop()
    
    if (!shouldContinue) {
      clearInterval(monitoringTimer)
      process.exit(1)
    }
  }, MONITOR_INTERVAL)
  
  // Keep process alive
  process.stdin.resume()
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message)
    process.exit(1)
  })
}

module.exports = {
  monitorRefactoringImpact: main,
  testCriticalEndpoints,
  compareApiResponses
}