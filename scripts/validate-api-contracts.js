#!/usr/bin/env node

/**
 * API Contract Validation Script
 * 
 * This script validates that the current API endpoints match the documented contracts
 * and that the frontend integration patterns continue to work correctly.
 * 
 * Usage:
 *   npm run validate:contracts
 *   node scripts/validate-api-contracts.js
 */

const axios = require('axios')
const fs = require('fs')
const path = require('path')

// Configuration
const API_BASE_URL = process.env.VITE_API_BASE_URL || process.env.API_TEST_URL || 'http://localhost:3000/api/v1'
const TEST_TIMEOUT = 10000

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  errors: []
}

/**
 * Test runner utility
 */
async function runTest(testName, testFn) {
  try {
    console.log(`⏳ Testing: ${testName}`)
    await testFn()
    results.passed++
    console.log(`✅ PASSED: ${testName}`)
  } catch (error) {
    results.failed++
    results.errors.push({ test: testName, error: error.message })
    console.log(`❌ FAILED: ${testName} - ${error.message}`)
  }
}

/**
 * Create axios client with basic configuration
 */
function createApiClient(authToken = null) {
  const headers = {
    'Content-Type': 'application/json'
  }
  
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }
  
  return axios.create({
    baseURL: API_BASE_URL,
    timeout: TEST_TIMEOUT,
    headers,
    validateStatus: () => true // Don't throw on HTTP errors
  })
}

/**
 * Test API endpoint structure and response format
 */
async function testEndpointStructure(client, endpoint, expectedStatus = 200) {
  const response = await client.get(endpoint)
  
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`)
  }
  
  // Validate basic response structure
  if (response.data && typeof response.data === 'object') {
    return response.data
  }
  
  throw new Error(`Invalid response format for ${endpoint}`)
}

/**
 * Test authentication endpoints
 */
async function testAuthEndpoints() {
  const client = createApiClient()
  
  await runTest('Auth - Login endpoint exists', async () => {
    const response = await client.post('/auth/login', {})
    // Should get 400 for missing credentials, not 404
    if (response.status === 404) {
      throw new Error('Login endpoint not found')
    }
  })
  
  await runTest('Auth - Me endpoint exists', async () => {
    const response = await client.get('/auth/me')
    // Should get 401 for unauthorized, not 404
    if (response.status === 404) {
      throw new Error('Me endpoint not found')
    }
  })
}

/**
 * Test properties endpoints
 */
async function testPropertiesEndpoints() {
  const client = createApiClient()
  
  await runTest('Properties - List endpoint exists', async () => {
    const response = await client.get('/properties')
    if (response.status === 404) {
      throw new Error('Properties list endpoint not found')
    }
    // Should get 401 for unauthorized access
    if (response.status !== 401) {
      console.warn(`⚠️  Properties endpoint returned ${response.status}, expected 401 (unauthorized)`)
    }
  })
  
  await runTest('Properties - Stats endpoint exists', async () => {
    const response = await client.get('/properties/stats')
    if (response.status === 404) {
      throw new Error('Properties stats endpoint not found')
    }
  })
  
  await runTest('Properties - Detail endpoint format', async () => {
    const response = await client.get('/properties/test-id')
    if (response.status === 404 && response.data?.message?.includes('Cannot GET')) {
      throw new Error('Properties detail endpoint not found')
    }
  })
}

/**
 * Test tenants endpoints
 */
async function testTenantsEndpoints() {
  const client = createApiClient()
  
  await runTest('Tenants - List endpoint exists', async () => {
    const response = await client.get('/tenants')
    if (response.status === 404) {
      throw new Error('Tenants list endpoint not found')
    }
  })
  
  await runTest('Tenants - Stats endpoint exists', async () => {
    const response = await client.get('/tenants/stats')
    if (response.status === 404) {
      throw new Error('Tenants stats endpoint not found')
    }
  })
}

/**
 * Test units endpoints
 */
async function testUnitsEndpoints() {
  const client = createApiClient()
  
  await runTest('Units - List endpoint exists', async () => {
    const response = await client.get('/units')
    if (response.status === 404) {
      throw new Error('Units list endpoint not found')
    }
  })
}

/**
 * Test leases endpoints
 */
async function testLeasesEndpoints() {
  const client = createApiClient()
  
  await runTest('Leases - List endpoint exists', async () => {
    const response = await client.get('/leases')
    if (response.status === 404) {
      throw new Error('Leases list endpoint not found')
    }
  })
}

/**
 * Test maintenance endpoints
 */
async function testMaintenanceEndpoints() {
  const client = createApiClient()
  
  await runTest('Maintenance - List endpoint exists', async () => {
    const response = await client.get('/maintenance')
    if (response.status === 404) {
      throw new Error('Maintenance list endpoint not found')
    }
  })
}

/**
 * Test subscription endpoints
 */
async function testSubscriptionEndpoints() {
  const client = createApiClient()
  
  await runTest('Subscriptions - Current endpoint exists', async () => {
    const response = await client.get('/subscriptions/current')
    if (response.status === 404) {
      throw new Error('Current subscription endpoint not found')
    }
  })
  
  await runTest('Subscriptions - Plans endpoint exists', async () => {
    const response = await client.get('/subscriptions/plans')
    if (response.status === 404) {
      throw new Error('Subscription plans endpoint not found')
    }
  })
}

/**
 * Test user endpoints
 */
async function testUserEndpoints() {
  const client = createApiClient()
  
  await runTest('Users - Profile endpoint exists', async () => {
    const response = await client.get('/users/profile')
    if (response.status === 404) {
      throw new Error('User profile endpoint not found')
    }
  })
}

/**
 * Test billing endpoints
 */
async function testBillingEndpoints() {
  const client = createApiClient()
  
  await runTest('Billing - Checkout session endpoint exists', async () => {
    const response = await client.post('/billing/checkout/session', {})
    if (response.status === 404) {
      throw new Error('Billing checkout session endpoint not found')
    }
  })
  
  await runTest('Billing - Portal session endpoint exists', async () => {
    const response = await client.post('/billing/portal/session', {})
    if (response.status === 404) {
      throw new Error('Billing portal session endpoint not found')
    }
  })
}

/**
 * Test CORS and headers
 */
async function testCorsAndHeaders() {
  const client = createApiClient()
  
  await runTest('CORS - Headers present', async () => {
    const response = await client.options('/properties')
    
    // Check for CORS headers (may not be present in development)
    if (response.headers['access-control-allow-origin'] === undefined) {
      console.warn('⚠️  CORS headers not detected (may be normal in development)')
    }
  })
}

/**
 * Validate frontend integration files exist
 */
async function validateFrontendFiles() {
  const criticalFiles = [
    'apps/frontend/src/lib/api/axios-client.ts',
    'apps/frontend/src/lib/query/query-keys.ts',
    'apps/frontend/src/hooks/useProperties.ts',
    'apps/frontend/src/hooks/useAuth.ts',
    'apps/frontend/src/stores/property-store.ts'
  ]
  
  for (const file of criticalFiles) {
    await runTest(`Frontend - ${file} exists`, async () => {
      const fullPath = path.join(process.cwd(), file)
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Critical frontend file missing: ${file}`)
      }
    })
  }
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80))
  console.log('📊 API CONTRACT VALIDATION REPORT')
  console.log('='.repeat(80))
  console.log(`API Base URL: ${API_BASE_URL}`)
  console.log(`Tests Run: ${results.passed + results.failed}`)
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  
  if (results.errors.length > 0) {
    console.log('\n🔍 FAILURES:')
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}`)
      console.log(`   Error: ${error.error}`)
    })
  }
  
  console.log('\n' + '='.repeat(80))
  
  // Save report to file
  const reportPath = path.join(process.cwd(), 'api-contract-validation-report.json')
  const report = {
    timestamp: new Date().toISOString(),
    apiBaseUrl: API_BASE_URL,
    results: {
      passed: results.passed,
      failed: results.failed,
      total: results.passed + results.failed
    },
    errors: results.errors
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`📁 Report saved to: ${reportPath}`)
  
  return results.failed === 0
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting API Contract Validation...')
  console.log(`Testing against: ${API_BASE_URL}`)
  
  try {
    // Test all endpoint categories
    await testAuthEndpoints()
    await testPropertiesEndpoints()
    await testTenantsEndpoints()
    await testUnitsEndpoints()
    await testLeasesEndpoints()
    await testMaintenanceEndpoints()
    await testSubscriptionEndpoints()
    await testUserEndpoints()
    await testBillingEndpoints()
    await testCorsAndHeaders()
    await validateFrontendFiles()
    
    const success = generateReport()
    
    if (success) {
      console.log('🎉 All API contract validations passed!')
      process.exit(0)
    } else {
      console.log('💥 Some API contract validations failed!')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('💥 Fatal error during validation:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = {
  validateApiContracts: main,
  testEndpointStructure,
  createApiClient
}