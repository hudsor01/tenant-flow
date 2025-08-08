/**
 * API Connection Test Suite
 * Verify React Query hooks work with backend endpoints
 */
import { apiClient } from './api-client'

interface EndpointTest {
  name: string
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  expectedAuthRequired: boolean
}

const API_ENDPOINTS: EndpointTest[] = [
  // Core Entity Endpoints (these have /api/v1 prefix in backend)
  { name: 'Properties List', endpoint: '/properties', method: 'GET', expectedAuthRequired: true },
  { name: 'Properties Create', endpoint: '/properties', method: 'POST', expectedAuthRequired: true },
  { name: 'Tenants List', endpoint: '/tenants', method: 'GET', expectedAuthRequired: true },
  { name: 'Tenants Create', endpoint: '/tenants', method: 'POST', expectedAuthRequired: true },
  { name: 'Leases List', endpoint: '/leases', method: 'GET', expectedAuthRequired: true },
  { name: 'Leases Create', endpoint: '/leases', method: 'POST', expectedAuthRequired: true },
  { name: 'Units List', endpoint: '/units', method: 'GET', expectedAuthRequired: true },
  { name: 'Units Create', endpoint: '/units', method: 'POST', expectedAuthRequired: true },
  { name: 'Maintenance List', endpoint: '/maintenance-requests', method: 'GET', expectedAuthRequired: true },
  { name: 'Maintenance Create', endpoint: '/maintenance-requests', method: 'POST', expectedAuthRequired: true },
  
  // Billing/Stripe Endpoints
  { name: 'Subscription Info', endpoint: '/stripe/subscription', method: 'GET', expectedAuthRequired: true },
  { name: 'Create Checkout', endpoint: '/stripe/create-checkout-session', method: 'POST', expectedAuthRequired: true },
  { name: 'Payment Methods', endpoint: '/stripe/payment-methods', method: 'GET', expectedAuthRequired: true },
  
  // Health Check (excluded from /api/v1 prefix, should not require auth)
  { name: 'Health Check', endpoint: '/health', method: 'GET', expectedAuthRequired: false },
]

export async function testApiConnections(): Promise<{
  passed: number
  failed: number
  results: Array<{
    endpoint: string
    status: 'PASS' | 'FAIL' | 'SKIP'
    response?: string
    error?: string
  }>
}> {
  const results: Array<{
    endpoint: string
    status: 'PASS' | 'FAIL' | 'SKIP'
    response?: string
    error?: string
  }> = []

  let passed = 0
  let failed = 0

  console.log('🧪 Testing API connections...\n')

  for (const test of API_ENDPOINTS) {
    try {
      let response
      const testData = { test: true }
      
      switch (test.method) {
        case 'GET':
          response = await apiClient.get(test.endpoint)
          break
        case 'POST':
          response = await apiClient.post(test.endpoint, testData)
          break
        case 'PUT':
          response = await apiClient.put(test.endpoint, testData)
          break
        case 'DELETE':
          response = await apiClient.delete(test.endpoint)
          break
      }

      // For auth-required endpoints, we expect 401 without auth
      if (test.expectedAuthRequired) {
        // If we get here without an error, something's wrong with auth
        if (response.success) {
          results.push({
            endpoint: `${test.method} ${test.endpoint}`,
            status: 'FAIL',
            error: 'Expected auth error but got success response'
          })
          failed++
        } else {
          results.push({
            endpoint: `${test.method} ${test.endpoint}`,
            status: 'PASS',
            response: 'Correctly requires authentication'
          })
          passed++
        }
      } else {
        // Health endpoint should work without auth
        if (response.success) {
          results.push({
            endpoint: `${test.method} ${test.endpoint}`,
            status: 'PASS',
            response: `Success: ${JSON.stringify(response.data).substring(0, 100)}`
          })
          passed++
        } else {
          results.push({
            endpoint: `${test.method} ${test.endpoint}`,
            status: 'FAIL',
            error: 'Health endpoint should not require auth'
          })
          failed++
        }
      }

    } catch (error) {
      const apiError = error as { message: string, code?: string }
      
      if (test.expectedAuthRequired && apiError.message?.includes('authentication')) {
        results.push({
          endpoint: `${test.method} ${test.endpoint}`,
          status: 'PASS',
          response: 'Correctly requires authentication'
        })
        passed++
      } else {
        results.push({
          endpoint: `${test.method} ${test.endpoint}`,
          status: 'FAIL',
          error: apiError.message || 'Unknown error'
        })
        failed++
      }
    }
  }

  return { passed, failed, results }
}

export async function verifyReactQueryEndpoints(): Promise<void> {
  console.log('🔍 Verifying React Query endpoints match backend API...\n')
  
  const results = await testApiConnections()
  
  console.log('📊 API Connection Test Results:')
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%\n`)
  
  // Log detailed results
  results.results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌'
    console.log(`${icon} ${result.endpoint}`)
    if (result.response) {
      console.log(`   Response: ${result.response}`)
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  })
  
  if (results.failed > 0) {
    console.log('\n⚠️  Some endpoints failed. This may indicate:')
    console.log('   - API endpoints have changed in the backend')
    console.log('   - Backend is not running or unreachable')
    console.log('   - Authentication requirements have changed')
  } else {
    console.log('\n🎉 All API endpoints are responding correctly!')
    console.log('✅ React Query hooks should work smoothly with the backend')
  }
}

// Export for use in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as typeof window & { testApiConnections: typeof verifyReactQueryEndpoints }).testApiConnections = verifyReactQueryEndpoints
  console.log('💡 Run window.testApiConnections() in browser console to test API connections')
}