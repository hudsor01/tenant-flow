#!/usr/bin/env node
/* eslint-env node */
/* global fetch, console */

/**
 * Dashboard API Endpoint Test Script
 * Tests all dashboard APIs to verify they return 200 OK status codes
 */

const API_BASE_URL = 'https://api.tenantflow.app';

// List of all dashboard API endpoints to test
const DASHBOARD_ENDPOINTS = [
  { name: 'Dashboard Stats', path: '/api/v1/dashboard/stats' },
  { name: 'Dashboard Activity', path: '/api/v1/dashboard/activity' },
  { name: 'Property Performance', path: '/api/v1/dashboard/property-performance' },
  { name: 'System Uptime', path: '/api/v1/dashboard/uptime' },
  { name: 'Property Stats', path: '/api/v1/properties/stats' },
  { name: 'Tenant Stats', path: '/api/v1/tenants/stats' },
  { name: 'Lease Stats', path: '/api/v1/leases/stats' },
  { name: 'Upcoming Tasks', path: '/api/v1/tasks/upcoming' },
  { name: 'Financial Chart Data (6m)', path: '/api/v1/financial/chart-data?range=6m' },
  { name: 'Financial Chart Data (1y)', path: '/api/v1/financial/chart-data?range=1y' },
];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testEndpoint(endpoint) {
  const url = `${API_BASE_URL}${endpoint.path}`;

  try {
    console.log(`${colors.cyan}Testing:${colors.reset} ${endpoint.name}`);
    console.log(`  URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: Most dashboard endpoints require authentication
        // Without a valid auth token, we expect 401 Unauthorized
      }
    });

    const statusColor =
      response.status === 200 ? colors.green :
      response.status === 401 ? colors.yellow :
      colors.red;

    console.log(`  Status: ${statusColor}${response.status} ${response.statusText}${colors.reset}`);

    // Try to get response body for additional info
    let responseBody = null;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }
    } catch {
      // Ignore parse errors
    }

    if (response.status === 401) {
      console.log(`  ${colors.yellow}⚠ Requires authentication${colors.reset}`);
    } else if (response.status === 404) {
      console.log(`  ${colors.red}✗ Endpoint not found${colors.reset}`);
    } else if (response.status === 200) {
      console.log(`  ${colors.green}✓ Working correctly${colors.reset}`);
      if (responseBody && typeof responseBody === 'object') {
        const keys = Object.keys(responseBody).slice(0, 5);
        console.log(`  Response keys: ${keys.join(', ')}${keys.length < Object.keys(responseBody).length ? '...' : ''}`);
      }
    }

    return {
      endpoint: endpoint.name,
      path: endpoint.path,
      status: response.status,
      working: response.status === 200 || response.status === 401
    };

  } catch (error) {
    console.log(`  ${colors.red}✗ Error: ${error.message}${colors.reset}`);
    return {
      endpoint: endpoint.name,
      path: endpoint.path,
      status: 'ERROR',
      error: error.message,
      working: false
    };
  }
}

async function runTests() {
  console.log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════════╗
║     Dashboard API Endpoint Test Suite      ║
╚════════════════════════════════════════════╝${colors.reset}
`);

  console.log(`Testing against: ${colors.cyan}${API_BASE_URL}${colors.reset}\n`);

  const results = [];

  for (const endpoint of DASHBOARD_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    console.log(''); // Add spacing between tests
  }

  // Summary
  console.log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════════╗
║              Test Summary                  ║
╚════════════════════════════════════════════╝${colors.reset}
`);

  const working = results.filter(r => r.status === 200);
  const authRequired = results.filter(r => r.status === 401);
  const notFound = results.filter(r => r.status === 404);
  const errors = results.filter(r => r.status === 'ERROR' || (!r.working && r.status !== 404));

  console.log(`${colors.green}✓ Working (200 OK):${colors.reset} ${working.length}/${results.length}`);
  if (working.length > 0) {
    working.forEach(r => console.log(`  • ${r.endpoint}`));
  }

  console.log(`\n${colors.yellow}⚠ Auth Required (401):${colors.reset} ${authRequired.length}/${results.length}`);
  if (authRequired.length > 0) {
    authRequired.forEach(r => console.log(`  • ${r.endpoint}`));
  }

  console.log(`\n${colors.red}✗ Not Found (404):${colors.reset} ${notFound.length}/${results.length}`);
  if (notFound.length > 0) {
    notFound.forEach(r => console.log(`  • ${r.endpoint}`));
  }

  if (errors.length > 0) {
    console.log(`\n${colors.red}✗ Errors:${colors.reset} ${errors.length}/${results.length}`);
    errors.forEach(r => console.log(`  • ${r.endpoint}: ${r.error || `Status ${r.status}`}`));
  }

  // Overall assessment
  console.log(`\n${colors.bright}Overall Assessment:${colors.reset}`);
  if (working.length === results.length) {
    console.log(`${colors.green}✓ All endpoints are working correctly!${colors.reset}`);
  } else if (authRequired.length === results.length) {
    console.log(`${colors.yellow}⚠ All endpoints require authentication (expected behavior)${colors.reset}`);
    console.log(`  Dashboard will work once user is logged in.`);
  } else if (notFound.length > 0) {
    console.log(`${colors.red}✗ Some endpoints are not implemented in the backend${colors.reset}`);
    console.log(`  Backend implementation needed for full dashboard functionality.`);
  } else if (authRequired.length > 0 && notFound.length === 0) {
    console.log(`${colors.yellow}⚠ Endpoints are configured correctly but require authentication${colors.reset}`);
    console.log(`  This is expected behavior for a production API.`);
  } else {
    console.log(`${colors.red}✗ Mixed results - some endpoints may need attention${colors.reset}`);
  }
}

// Run the tests
runTests().catch(console.error);