#!/usr/bin/env tsx

/**
 * User-Specific Test Data Seeding Script
 * 
 * Creates comprehensive user data including landlords, tenants, managers, and admins
 * with realistic subscription distribution and feature access configurations.
 */

import { TestDataFactoryManager } from './factories'
import { Logger } from './utils/logger'
import { getCurrentConfig } from './environments/config'

interface UserSeedOptions {
  landlordCount?: number
  tenantCount?: number
  managerCount?: number
  adminCount?: number
  subscriptionDistribution?: Record<string, number>
  verbose?: boolean
}

class UserSeeder {
  private factory: TestDataFactoryManager
  private logger: Logger
  private config: any

  constructor(options: UserSeedOptions = {}) {
    this.factory = new TestDataFactoryManager()
    this.logger = new Logger({ level: options.verbose ? 4 : 2 })
    this.config = getCurrentConfig()
  }

  async seed(options: UserSeedOptions = {}): Promise<{
    landlords: any[]
    tenants: any[]
    managers: any[]
    admins: any[]
    summary: any
  }> {
    const {
      landlordCount = 10,
      tenantCount = 20,
      managerCount = 3,
      adminCount = 2,
      subscriptionDistribution = {
        FREE: 0.3,
        STARTER: 0.4,
        GROWTH: 0.25,
        ENTERPRISE: 0.05
      }
    } = options

    this.logger.info('👥 Starting user data seeding...')

    try {
      // Clean existing user data
      await this.cleanUserData()

      // Create landlords with realistic subscription distribution
      const landlords = await this.createLandlords(landlordCount, subscriptionDistribution)
      
      // Create tenants
      const tenants = await this.createTenants(tenantCount)
      
      // Create managers
      const managers = await this.createManagers(managerCount)
      
      // Create admin users
      const admins = await this.createAdmins(adminCount)

      const summary = {
        totalUsers: landlords.length + tenants.length + managers.length + admins.length,
        landlords: landlords.length,
        tenants: tenants.length,
        managers: managers.length,
        admins: admins.length,
        subscriptionBreakdown: this.analyzeSubscriptions(landlords)
      }

      this.logger.success('✅ User seeding completed!')
      this.logger.info('📊 Summary:', summary)

      return { landlords, tenants, managers, admins, summary }

    } finally {
      await this.factory.disconnect()
    }
  }

  private async cleanUserData(): Promise<void> {
    this.logger.info('🧹 Cleaning existing user data...')
    
    // Delete user-related data in dependency order
    await this.factory.prisma.reminderLog.deleteMany()
    await this.factory.prisma.userAccessLog.deleteMany()
    await this.factory.prisma.notificationLog.deleteMany()
    await this.factory.prisma.activity.deleteMany()
    await this.factory.prisma.invoice.deleteMany()
    await this.factory.prisma.subscription.deleteMany()
    await this.factory.prisma.userFeatureAccess.deleteMany()
    await this.factory.prisma.userPreferences.deleteMany()
    await this.factory.prisma.userSession.deleteMany()
    await this.factory.prisma.user.deleteMany()
    
    this.logger.success('✅ User data cleaned')
  }

  private async createLandlords(count: number, distribution: Record<string, number>): Promise<any[]> {
    this.logger.info(`👨‍💼 Creating ${count} landlords...`)
    
    const landlords = []
    const progress = this.logger.startProgress(count, 'Creating landlords')

    for (let i = 0; i < count; i++) {
      const planType = this.selectFromDistribution(distribution)
      
      const landlord = await this.factory.user.createLandlord({
        hasSubscription: planType !== 'FREE',
        subscriptionPlan: planType as any,
        subscriptionStatus: this.selectSubscriptionStatus(planType),
        profile: {
          completeName: true,
          hasPhone: Math.random() < 0.9,
          hasBio: Math.random() < 0.3,
          hasAvatar: Math.random() < 0.6
        }
      })

      // Add some activity logs for active users
      if (Math.random() < 0.7) {
        await this.createUserActivity(landlord.id, 'OWNER')
      }

      landlords.push(landlord)
      progress.increment()
    }

    progress.complete()
    return landlords
  }

  private async createTenants(count: number): Promise<any[]> {
    this.logger.info(`🏠 Creating ${count} tenants...`)
    
    const tenants = []
    const progress = this.logger.startProgress(count, 'Creating tenants')

    for (let i = 0; i < count; i++) {
      const tenant = await this.factory.tenant.createTenant({
        createUserAccount: Math.random() < 0.8, // 80% have user accounts
        hasDocuments: Math.random() < 0.6,
        emergencyContactInfo: Math.random() < 0.85
      })

      // Create some activity for tenants with user accounts
      if (tenant.user && Math.random() < 0.5) {
        await this.createUserActivity(tenant.user.id, 'TENANT')
      }

      tenants.push(tenant)
      progress.increment()
    }

    progress.complete()
    return tenants
  }

  private async createManagers(count: number): Promise<any[]> {
    this.logger.info(`👔 Creating ${count} managers...`)
    
    const managers = []

    for (let i = 0; i < count; i++) {
      const manager = await this.factory.user.createManager({
        hasSubscription: true,
        subscriptionPlan: 'GROWTH', // Managers typically have growth plans
        subscriptionStatus: 'ACTIVE',
        profile: {
          completeName: true,
          hasPhone: true,
          hasBio: true,
          hasAvatar: Math.random() < 0.8
        }
      })

      // Managers are typically active users
      await this.createUserActivity(manager.id, 'MANAGER')
      
      managers.push(manager)
    }

    return managers
  }

  private async createAdmins(count: number): Promise<any[]> {
    this.logger.info(`🔧 Creating ${count} admin users...`)
    
    const admins = []

    for (let i = 0; i < count; i++) {
      const admin = await this.factory.user.createAdmin({
        profile: {
          completeName: true,
          hasPhone: true,
          hasBio: true,
          hasAvatar: true
        }
      })

      // Create extensive activity for admin users
      await this.createUserActivity(admin.id, 'ADMIN', 15)
      
      admins.push(admin)
    }

    return admins
  }

  private async createUserActivity(userId: string, role: string, count: number = 5): Promise<void> {
    const activities = this.getActivitiesByRole(role)
    
    for (let i = 0; i < count; i++) {
      const activity = activities[Math.floor(Math.random() * activities.length)]
      
      await this.factory.prisma.activity.create({
        data: {
          userId,
          action: activity.action,
          entityType: activity.entityType,
          entityId: `fake-${activity.entityType}-${Math.random().toString(36).substr(2, 9)}`,
          entityName: activity.entityName,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random within last 30 days
        }
      })
    }
  }

  private getActivitiesByRole(role: string) {
    const activities = {
      OWNER: [
        { action: 'created', entityType: 'property' as const, entityName: 'New Property' },
        { action: 'updated', entityType: 'property' as const, entityName: 'Property Details' },
        { action: 'created', entityType: 'unit' as const, entityName: 'Unit A1' },
        { action: 'viewed', entityType: 'tenant' as const, entityName: 'Tenant Profile' },
        { action: 'approved', entityType: 'maintenance' as const, entityName: 'Maintenance Request' },
        { action: 'processed', entityType: 'payment' as const, entityName: 'Rent Payment' }
      ],
      TENANT: [
        { action: 'submitted', entityType: 'maintenance' as const, entityName: 'Maintenance Request' },
        { action: 'uploaded', entityType: 'lease' as const, entityName: 'Lease Document' },
        { action: 'viewed', entityType: 'property' as const, entityName: 'Property Information' },
        { action: 'updated', entityType: 'tenant' as const, entityName: 'Profile Information' }
      ],
      MANAGER: [
        { action: 'managed', entityType: 'property' as const, entityName: 'Property Portfolio' },
        { action: 'assigned', entityType: 'maintenance' as const, entityName: 'Maintenance Task' },
        { action: 'reviewed', entityType: 'tenant' as const, entityName: 'Tenant Application' },
        { action: 'generated', entityType: 'lease' as const, entityName: 'Lease Agreement' }
      ],
      ADMIN: [
        { action: 'administered', entityType: 'property' as const, entityName: 'System Property' },
        { action: 'monitored', entityType: 'maintenance' as const, entityName: 'System Maintenance' },
        { action: 'audited', entityType: 'tenant' as const, entityName: 'User Account' },
        { action: 'configured', entityType: 'payment' as const, entityName: 'Payment System' },
        { action: 'managed', entityType: 'unit' as const, entityName: 'System Unit' },
        { action: 'reviewed', entityType: 'lease' as const, entityName: 'System Lease' }
      ]
    }

    return activities[role as keyof typeof activities] || activities.OWNER
  }

  private selectFromDistribution(distribution: Record<string, number>): string {
    const random = Math.random()
    let cumulative = 0
    
    for (const [key, probability] of Object.entries(distribution)) {
      cumulative += probability
      if (random <= cumulative) {
        return key
      }
    }
    
    return Object.keys(distribution)[0] // Fallback
  }

  private selectSubscriptionStatus(planType: string): 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' {
    if (planType === 'FREE') return 'ACTIVE'
    
    const random = Math.random()
    if (random < 0.8) return 'ACTIVE'
    if (random < 0.9) return 'TRIALING'
    if (random < 0.95) return 'PAST_DUE'
    return 'CANCELED'
  }

  private analyzeSubscriptions(landlords: any[]): Record<string, number> {
    const breakdown = { FREE: 0, STARTER: 0, GROWTH: 0, ENTERPRISE: 0 }
    
    landlords.forEach(landlord => {
      if (landlord.subscription) {
        const plan = landlord.subscription.planType
        if (plan in breakdown) {
          breakdown[plan as keyof typeof breakdown]++
        }
      } else {
        breakdown.FREE++
      }
    })
    
    return breakdown
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  const options: UserSeedOptions = {}

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    switch (arg) {
      case '--landlords':
        options.landlordCount = parseInt(args[++i])
        break
      case '--tenants':
        options.tenantCount = parseInt(args[++i])
        break
      case '--managers':
        options.managerCount = parseInt(args[++i])
        break
      case '--admins':
        options.adminCount = parseInt(args[++i])
        break
      case '--verbose':
        options.verbose = true
        break
      case '--help':
      case '-h':
        console.log(`
Usage: tsx seed-users.ts [options]

Options:
  --landlords <count>    Number of landlords to create (default: 10)
  --tenants <count>      Number of tenants to create (default: 20)
  --managers <count>     Number of managers to create (default: 3)
  --admins <count>       Number of admin users to create (default: 2)
  --verbose              Enable verbose logging
  -h, --help             Show this help message

Examples:
  tsx seed-users.ts --landlords 15 --tenants 30
  tsx seed-users.ts --verbose
`)
        process.exit(0)
    }
  }

  const seeder = new UserSeeder(options)
  await seeder.seed(options)
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { UserSeeder, UserSeedOptions }