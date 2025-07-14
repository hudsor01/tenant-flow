import { FullConfig } from '@playwright/test'
import { execSync } from 'child_process'

/**
 * Global teardown that runs after all tests
 * Handles cleanup of test data and test environment
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test environment teardown...')
  
  try {
    // 1. Clean up test database
    console.log('🗑️ Cleaning up test database...')
    await cleanupTestDatabase()
    
    // 2. Clean up uploaded files
    console.log('📁 Cleaning up test files...')
    await cleanupTestFiles()
    
    // 3. Reset any external service states
    console.log('🔄 Resetting external services...')
    await resetExternalServices()
    
    console.log('✅ E2E test environment teardown complete!')
    
  } catch (error) {
    console.error('❌ E2E test environment teardown failed:', error)
    // Don't throw - teardown should be best effort
  }
}

async function cleanupTestDatabase() {
  try {
    // Clean up test data but keep schema
    execSync('cd apps/backend && npx tsx tests/cleanup-e2e-data.ts', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }
    })
  } catch (error) {
    console.error('Database cleanup failed:', error)
  }
}

async function cleanupTestFiles() {
  try {
    // Remove test uploads directory
    execSync('rm -rf apps/backend/uploads/test-*', { stdio: 'inherit' })
    execSync('rm -rf apps/frontend/public/test-uploads/*', { stdio: 'inherit' })
  } catch (error) {
    console.error('File cleanup failed:', error)
  }
}

async function resetExternalServices() {
  // Clean up any external service state (Stripe test data, etc.)
  // This is a placeholder for future external service cleanup
  console.log('External services reset (placeholder)')
}

export default globalTeardown