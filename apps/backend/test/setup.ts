/**
 * Jest Test Setup - Phase 0 Test Infrastructure
 *
 * This setup file:
 * - Loads test environment variables from .env.test.local
 * - Configures test timeouts
 * - Sets up global test utilities
 * - Initializes mock data
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load test environment variables from both project root and backend-specific
const projectRootEnvPath = path.resolve(__dirname, '../../.env.test.local')
const backendEnvPath = path.resolve(__dirname, '../.env.test.local')

// Load project root first (base config)
dotenv.config({ path: projectRootEnvPath })

// Load backend-specific second (overrides)
const envResult = dotenv.config({ path: backendEnvPath })

if (envResult.error) {
  console.warn(`⚠️  Could not load backend .env.test.local: ${envResult.error.message}`)
  console.warn('   Tests will use project root environment variables')
}

// CRITICAL FIX: Ensure SUPABASE_URL is set for config validation
// The config schema expects SUPABASE_URL but Doppler provides NEXT_PUBLIC_SUPABASE_URL
// Set SUPABASE_URL = NEXT_PUBLIC_SUPABASE_URL if not already set
if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (process.env.DEBUG) {
    console.log(`   Using NEXT_PUBLIC_SUPABASE_URL for SUPABASE_URL: ${process.env.SUPABASE_URL}`)
  }
}

// Similarly, ensure SUPABASE_PUBLISHABLE_KEY is set
if (!process.env.SUPABASE_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  process.env.SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (process.env.DEBUG) {
    console.log(`   Using NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for SUPABASE_PUBLISHABLE_KEY`)
  }
}

// Global test configuration
jest.setTimeout(10000) // 10 second timeout for all tests

// Suppress console logs during tests (unless DEBUG is set)
if (!process.env.DEBUG) {
  global.console.log = jest.fn()
  global.console.debug = jest.fn()
  global.console.info = jest.fn()
}

// Keep error and warn logs visible
global.console.error = jest.fn()
global.console.warn = jest.fn()

// Setup global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      /**
       * Test helper to create a mock Supabase client
       */
      createMockSupabaseClient: () => any
      /**
       * Test helper to create a mock authenticated request
       */
      createMockRequest: (userId?: string) => any
      /**
       * Test helper to cleanup after tests
       */
      testCleanup: () => void
    }
  }
}

// Example global test helper (can be expanded)
global.testCleanup = () => {
  jest.clearAllMocks()
}

// Log test environment setup
const testEnv = process.env.NODE_ENV || 'test'
// Prefer NEXT_PUBLIC_SUPABASE_URL for integration tests (real Supabase URL)
// This matches the pattern used in test/integration/rls/setup.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'not configured'

if (process.env.DEBUG) {
  console.log(`✓ Jest test setup initialized`)
  console.log(`  Environment: ${testEnv}`)
  console.log(`  Supabase URL: ${supabaseUrl}`)
  console.log(`  Database: ${process.env.DATABASE_URL ? '✓ configured' : '✗ not configured'}`)
}

// Export test utilities
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  }) as `${string}-${string}-${string}-${string}-${string}`
}

export const generateId = () => Math.random().toString(36).substring(7)

export const createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
})

// Ensure test database is accessible (optional check)
if (process.env.VERIFY_DB_CONNECTION === 'true') {
  const { execSync } = require('child_process')
  try {
    execSync(
      `PGPASSWORD=${process.env.DB_PASSWORD} psql -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -c "SELECT 1"`,
      { stdio: 'ignore' }
    )
    if (process.env.DEBUG) {
      console.log(`  Database: ✓ connection verified`)
    }
  } catch {
    console.warn(
      `⚠️  Could not verify database connection. Make sure Supabase is running:\n   supabase start`
    )
  }
}
