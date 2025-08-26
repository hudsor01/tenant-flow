/**
 * Jest setup file for backend tests
 * This file runs before all tests
 */

// Suppress console warnings in tests unless VERBOSE is set
if (!process.env.VERBOSE) {
  console.warn = jest.fn()
}

// Set test environment
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.SUPABASE_URL = 'https://test.supabase.co'

// Global test timeout
jest.setTimeout(15000)

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})