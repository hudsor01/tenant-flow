import { FullConfig } from '@playwright/test'
import { execSync } from 'child_process'
import dotenv from 'dotenv'

/**
 * Global setup that runs before all tests
 * Handles database seeding, environment setup, and test user creation
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test environment setup...')
  
  // Load environment variables
  dotenv.config({ path: '.env.test' })
  dotenv.config({ path: 'apps/backend/.env.test' })
  dotenv.config({ path: 'apps/frontend/.env.local.test' })
  
  try {
    // 1. Ensure backend database is ready
    console.log('📊 Setting up test database...')
    await setupTestDatabase()
    
    // 2. Seed test data
    console.log('🌱 Seeding test data...')
    await seedTestData()
    
    // 3. Create test users with proper authentication
    console.log('👤 Creating test users...')
    await createTestUsers()
    
    // 4. Verify services are healthy
    console.log('🏥 Checking service health...')
    await verifyServiceHealth()
    
    console.log('✅ E2E test environment setup complete!')
    
  } catch (error) {
    console.error('❌ E2E test environment setup failed:', error)
    throw error
  }
}

async function setupTestDatabase() {
  try {
    // Reset and migrate test database
    execSync('cd apps/backend && npx prisma migrate reset --force --skip-seed', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }
    })
    
    execSync('cd apps/backend && npx prisma migrate deploy', {
      stdio: 'inherit', 
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }
    })
    
    execSync('cd apps/backend && npx prisma generate', {
      stdio: 'inherit'
    })
    
  } catch (error) {
    console.error('Database setup failed:', error)
    throw error
  }
}

async function seedTestData() {
  try {
    // Run custom seed script for E2E tests
    execSync('cd apps/backend && npx tsx tests/seed-e2e-data.ts', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }
    })
  } catch (error) {
    console.error('Test data seeding failed:', error)
    throw error
  }
}

async function createTestUsers() {
  // Test users will be created via the seeding script
  // This function can be used for additional user setup if needed
  console.log('Test users created via seeding script')
}

async function verifyServiceHealth() {
  const maxRetries = 10
  const retryDelay = 2000
  
  // Check frontend health
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://tenantflow.app')
      if (response.ok) {
        console.log('✅ Frontend service is healthy')
        break
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error('Frontend service failed to start')
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }
  
  // Check backend health
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://tenantflow.app/health')
      if (response.ok) {
        console.log('✅ Backend service is healthy')
        break
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error('Backend service failed to start')
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }
}

export default globalSetup