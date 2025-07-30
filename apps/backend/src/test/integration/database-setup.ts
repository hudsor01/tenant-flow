import { PrismaService } from '../../prisma/prisma.service'

export class DatabaseSetup {
  private static prisma: PrismaService

  static init(prisma: PrismaService) {
    this.prisma = prisma
  }

  /**
   * Clean all test data from the database
   * Called before and after each test suite
   */
  static async cleanAll(): Promise<void> {
    if (!this.prisma) {
      throw new Error('DatabaseSetup not initialized. Call init() first.')
    }

    // Delete in reverse dependency order to avoid foreign key constraint violations
    const deleteOperations = [
      'maintenanceRequest',
      'lease',
      'tenant',
      'unit', 
      'property',
      'user',
      'webhookEvent',
      'subscription',
      'subscriptionUsage',
      'reminderLog'
    ] as const

    for (const table of deleteOperations) {
      try {
        if (this.prisma[table] && typeof this.prisma[table].deleteMany === 'function') {
          await this.prisma[table].deleteMany({})
        }
      } catch (error) {
        console.warn(`Warning: Could not clean table ${table}:`, error.message)
      }
    }
  }

  /**
   * Reset auto-increment sequences (PostgreSQL specific)
   */
  static async resetSequences(): Promise<void> {
    if (!this.prisma) return

    try {
      // PostgreSQL: Reset sequences for tables with auto-increment IDs
      const tables = [
        'users',
        'properties', 
        'units',
        'tenants',
        'leases',
        'maintenance_requests',
        'webhook_events',
        'subscriptions'
      ]

      for (const table of tables) {
        try {
          await this.prisma.$executeRaw`
            SELECT setval(pg_get_serial_sequence('${table}', 'id'), 1, false)
          `
        } catch (error) {
          // Ignore errors for tables without sequences
        }
      }
    } catch (error) {
      console.warn('Could not reset sequences:', error.message)
    }
  }

  /**
   * Seed minimal required data for tests
   */
  static async seedMinimalData(): Promise<void> {
    if (!this.prisma) return

    // This can be used to seed any data that all tests need
    // For now, we'll keep it empty as tests create their own data
  }

  /**
   * Check database connection
   */
  static async checkConnection(): Promise<boolean> {
    if (!this.prisma) return false

    try {
      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('Database connection check failed:', error.message)
      return false
    }
  }

  /**
   * Get database statistics for debugging
   */
  static async getStats(): Promise<Record<string, number>> {
    if (!this.prisma) return {}

    try {
      const [
        userCount,
        propertyCount,
        unitCount,
        tenantCount,
        leaseCount,
        maintenanceCount
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.property.count(),
        this.prisma.unit.count(),
        this.prisma.tenant.count(),
        this.prisma.lease.count(),
        this.prisma.maintenanceRequest.count()
      ])

      return {
        users: userCount,
        properties: propertyCount,
        units: unitCount,
        tenants: tenantCount,
        leases: leaseCount,
        maintenance: maintenanceCount
      }
    } catch (error) {
      console.error('Could not get database stats:', error.message)
      return {}
    }
  }

  /**
   * Safely delete a specific user and all related data
   */
  static async cleanUserData(userId: string): Promise<void> {
    if (!this.prisma) return

    try {
      // Delete user's data in dependency order
      await this.prisma.maintenanceRequest.deleteMany({
        where: {
          unit: {
            property: {
              ownerId: userId
            }
          }
        }
      })

      await this.prisma.lease.deleteMany({
        where: {
          unit: {
            property: {
              ownerId: userId
            }
          }
        }
      })

      await this.prisma.tenant.deleteMany({
        where: { ownerId: userId }
      })

      await this.prisma.unit.deleteMany({
        where: {
          property: {
            ownerId: userId
          }
        }
      })

      await this.prisma.property.deleteMany({
        where: { ownerId: userId }
      })

      await this.prisma.user.delete({
        where: { id: userId }
      })
    } catch (error) {
      console.warn(`Could not clean user data for ${userId}:`, error.message)
    }
  }

  /**
   * Transaction wrapper for test operations
   */
  static async withTransaction<T>(
    operation: (prisma: PrismaService) => Promise<T>
  ): Promise<T> {
    if (!this.prisma) {
      throw new Error('DatabaseSetup not initialized')
    }

    return await this.prisma.$transaction(async (tx) => {
      return await operation(tx as PrismaService)
    })
  }

  /**
   * Verify database is in clean state
   */
  static async verifyCleanState(): Promise<boolean> {
    const stats = await this.getStats()
    const totalRecords = Object.values(stats).reduce((sum, count) => sum + count, 0)
    
    if (totalRecords > 0) {
      console.warn('Database not in clean state:', stats)
      return false
    }
    
    return true
  }
}