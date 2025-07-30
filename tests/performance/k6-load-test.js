import http from 'k6/http'
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'
import { Rate } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const loginSuccessRate = new Rate('login_success')
const propertyCreationRate = new Rate('property_creation_success')

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '5m', target: 200 },  // Spike to 200 users
    { duration: '10m', target: 100 }, // Back to 100 users
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
    errors: ['rate<0.1'],             // Custom error rate under 10%
  },
}

// Test data
const users = new SharedArray('users', function () {
  return JSON.parse(open('./test-users.json'))
})

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002'

// Helper functions
function authenticate(email, password) {
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: email,
    password: password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })

  const success = check(res, {
    'login successful': (r) => r.status === 200,
    'received auth token': (r) => r.json('token') !== undefined,
  })

  loginSuccessRate.add(success)

  if (!success) {
    errorRate.add(1)
    return null
  }

  return res.json('token')
}

function createHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

// Test scenarios
export function setup() {
  // Create test data if needed
  console.log('Setting up test data...')
  
  // Verify API is accessible
  const res = http.get(`${BASE_URL}/api/v1/health`)
  check(res, {
    'API is healthy': (r) => r.status === 200,
  })
  
  return { startTime: new Date() }
}

export default function () {
  // Select random user
  const user = users[Math.floor(Math.random() * users.length)]
  
  // Scenario 1: User login
  const token = authenticate(user.email, user.password)
  if (!token) {
    return
  }
  
  const headers = createHeaders(token)
  
  // Scenario 2: View dashboard
  const dashboardRes = http.get(`${BASE_URL}/api/v1/dashboard/stats`, { headers })
  check(dashboardRes, {
    'dashboard loaded': (r) => r.status === 200,
  }) || errorRate.add(1)
  
  sleep(1)
  
  // Scenario 3: List properties
  const propertiesRes = http.get(`${BASE_URL}/api/v1/properties`, { headers })
  const properties = check(propertiesRes, {
    'properties listed': (r) => r.status === 200,
    'properties array returned': (r) => Array.isArray(r.json()),
  }) ? propertiesRes.json() : []
  
  !properties && errorRate.add(1)
  
  sleep(1)
  
  // Scenario 4: Create property (10% of requests)
  if (Math.random() < 0.1) {
    const propertyData = {
      name: `Load Test Property ${Date.now()}`,
      address: '123 Test Street',
      city: 'Test City',
      state: 'TX',
      zipCode: '12345',
      propertyType: 'SINGLE_FAMILY',
    }
    
    const createRes = http.post(
      `${BASE_URL}/api/v1/properties`,
      JSON.stringify(propertyData),
      { headers }
    )
    
    const created = check(createRes, {
      'property created': (r) => r.status === 201,
      'property has ID': (r) => r.json('id') !== undefined,
    })
    
    propertyCreationRate.add(created)
    !created && errorRate.add(1)
    
    // If created, view the property
    if (created) {
      const propertyId = createRes.json('id')
      sleep(1)
      
      const propertyRes = http.get(`${BASE_URL}/api/v1/properties/${propertyId}`, { headers })
      check(propertyRes, {
        'property retrieved': (r) => r.status === 200,
      }) || errorRate.add(1)
    }
  }
  
  // Scenario 5: View units for a property (if properties exist)
  if (properties.length > 0) {
    const randomProperty = properties[Math.floor(Math.random() * properties.length)]
    const unitsRes = http.get(`${BASE_URL}/api/v1/properties/${randomProperty.id}/units`, { headers })
    check(unitsRes, {
      'units listed': (r) => r.status === 200,
    }) || errorRate.add(1)
  }
  
  sleep(2)
  
  // Scenario 6: Search properties
  const searchRes = http.get(`${BASE_URL}/api/v1/properties?search=test`, { headers })
  check(searchRes, {
    'search completed': (r) => r.status === 200,
  }) || errorRate.add(1)
  
  sleep(1)
  
  // Scenario 7: View maintenance requests
  const maintenanceRes = http.get(`${BASE_URL}/api/v1/maintenance`, { headers })
  check(maintenanceRes, {
    'maintenance requests listed': (r) => r.status === 200,
  }) || errorRate.add(1)
  
  sleep(2)
}

export function teardown(data) {
  // Clean up test data if needed
  console.log('Test completed. Started at:', data.startTime)
  
  // Could make API calls to clean up test properties
}

// Custom scenario for testing specific endpoints
export function stripeWebhookScenario() {
  const webhookPayload = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_' + Date.now(),
        amount_total: 5000,
        customer: 'cus_test_' + Date.now(),
      }
    }
  }
  
  const res = http.post(
    `${BASE_URL}/api/v1/stripe/webhook`,
    JSON.stringify(webhookPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature',
      }
    }
  )
  
  check(res, {
    'webhook processed': (r) => r.status === 200,
  }) || errorRate.add(1)
}

// Stress test for database connections
export function databaseStressTest() {
  const token = authenticate('stress@test.com', 'password123')
  if (!token) return
  
  const headers = createHeaders(token)
  
  // Rapid fire requests to test connection pooling
  for (let i = 0; i < 10; i++) {
    http.get(`${BASE_URL}/api/v1/properties`, { headers })
  }
}