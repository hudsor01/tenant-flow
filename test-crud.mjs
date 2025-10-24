#!/usr/bin/env node
/**
 * CRUD Operations Test Script
 * Tests all backend CRUD endpoints for Properties, Tenants, Leases, Units, and Maintenance
 */

const BASE_URL = 'http://localhost:4600/api/v1'

// Test auth credentials (use env vars or fallback)
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-id'
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

async function testEndpoint(method, path, body = null, expectedStatus = 200) {
  const url = `${BASE_URL}${path}`

  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)
    const data = await response.json().catch(() => null)

    const success = response.status === expectedStatus
    const icon = success ? '✓' : '✗'
    const statusColor = success ? colors.green : colors.red

    log(`${icon} ${method} ${path} - ${response.status}`, statusColor)

    if (!success) {
      log(`   Expected: ${expectedStatus}, Got: ${response.status}`, colors.yellow)
      if (data) {
        log(`   Response: ${JSON.stringify(data, null, 2)}`, colors.yellow)
      }
    }

    return { success, status: response.status, data }
  } catch (error) {
    log(`✗ ${method} ${path} - ERROR: ${error.message}`, colors.red)
    return { success: false, error: error.message }
  }
}

async function testHealth() {
  log('\n=== HEALTH CHECK ===', colors.blue)
  await testEndpoint('GET', '/health/../health', null, 200)
}

async function testProperties() {
  log('\n=== PROPERTIES CRUD ===', colors.blue)

  // List (should work without auth for now since we're testing locally)
  const listResult = await testEndpoint('GET', '/properties?limit=10')

  // Create (requires auth)
  const createData = {
    name: 'Test Property',
    property_type: 'RESIDENTIAL',
    address: '123 Test St',
    city: 'Test City',
    state: 'CA',
    zip_code: '12345',
    country: 'USA'
  }

  const createResult = await testEndpoint('POST', '/properties', createData, 201)

  if (createResult.data?.id) {
    const propertyId = createResult.data.id

    // Read single
    await testEndpoint('GET', `/properties/${propertyId}`)

    // Update
    const updateData = {
      name: 'Updated Test Property',
      property_type: 'COMMERCIAL'
    }
    await testEndpoint('PUT', `/properties/${propertyId}`, updateData)

    // Delete
    await testEndpoint('DELETE', `/properties/${propertyId}`)
  }
}

async function testTenants() {
  log('\n=== TENANTS CRUD ===', colors.blue)

  // List
  await testEndpoint('GET', '/tenants?limit=10')

  // Create
  const createData = {
    first_name: 'John',
    last_name: 'Doe',
    email: `test-${Date.now()}@example.com`,
    phone: '555-0123'
  }

  const createResult = await testEndpoint('POST', '/tenants', createData, 201)

  if (createResult.data?.id) {
    const tenantId = createResult.data.id

    // Read single
    await testEndpoint('GET', `/tenants/${tenantId}`)

    // Update
    const updateData = {
      first_name: 'Jane',
      phone: '555-9999'
    }
    await testEndpoint('PUT', `/tenants/${tenantId}`, updateData)

    // Delete
    await testEndpoint('DELETE', `/tenants/${tenantId}`)
  }
}

async function testLeases() {
  log('\n=== LEASES CRUD ===', colors.blue)

  // List
  await testEndpoint('GET', '/leases?limit=10')

  // Note: Creating a lease requires valid property_id, unit_id, and tenant_id
  // We'll just test the list endpoint for now
  log('  (Skipping create/update/delete - requires valid foreign keys)', colors.yellow)
}

async function testUnits() {
  log('\n=== UNITS CRUD ===', colors.blue)

  // List
  await testEndpoint('GET', '/units?limit=10')

  // Note: Creating a unit requires valid property_id
  log('  (Skipping create/update/delete - requires valid property_id)', colors.yellow)
}

async function testMaintenance() {
  log('\n=== MAINTENANCE CRUD ===', colors.blue)

  // List
  await testEndpoint('GET', '/maintenance?limit=10')

  // Note: Creating a maintenance request requires valid property_id
  log('  (Skipping create/update/delete - requires valid property_id)', colors.yellow)
}

async function main() {
  log('╔════════════════════════════════════════╗', colors.blue)
  log('║    CRUD Operations Test Suite         ║', colors.blue)
  log('╚════════════════════════════════════════╝', colors.blue)
  log(`\nTesting against: ${BASE_URL}`)

  await testHealth()
  await testProperties()
  await testTenants()
  await testLeases()
  await testUnits()
  await testMaintenance()

  log('\n=== TEST SUITE COMPLETE ===\n', colors.blue)
}

main().catch(err => {
  log(`\nFatal error: ${err.message}`, colors.red)
  process.exit(1)
})
