import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * E2E Test Data Cleanup Script
 * Removes test data after E2E test runs
 */
async function cleanupE2EData() {
  console.log('🧹 Cleaning up E2E test data...')
  
  try {
    // Delete test data in reverse order of dependencies
    await prisma.notification.deleteMany({
      where: {
        id: {
          startsWith: 'test-'
        }
      }
    })
    
    await prisma.maintenanceRequest.deleteMany({
      where: {
        id: {
          startsWith: 'test-'
        }
      }
    })
    
    await prisma.payment.deleteMany({
      where: {
        id: {
          startsWith: 'test-'
        }
      }
    })
    
    await prisma.lease.deleteMany({
      where: {
        id: {
          startsWith: 'test-'
        }
      }
    })
    
    await prisma.tenant.deleteMany({
      where: {
        id: {
          startsWith: 'test-'
        }
      }
    })
    
    await prisma.unit.deleteMany({
      where: {
        id: {
          startsWith: 'test-'
        }
      }
    })
    
    await prisma.property.deleteMany({
      where: {
        id: {
          startsWith: 'test-'
        }
      }
    })
    
    await prisma.user.deleteMany({
      where: {
        id: {
          startsWith: 'test-'
        }
      }
    })
    
    console.log('✅ E2E test data cleanup completed!')
    
  } catch (error) {
    console.error('❌ E2E test data cleanup failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupE2EData()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { cleanupE2EData }