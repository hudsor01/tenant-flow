#!/usr/bin/env tsx

/**
 * Master Test Data Seeding Script
 * 
 * This script orchestrates the creation of comprehensive test data for TenantFlow.
 * It supports different environments, data volumes, and test scenarios.
 */

import { PrismaClient } from '@prisma/client'
import { TestDataFactoryManager } from './factories'
import { config } from './environments/config'
import { Logger } from './utils/logger'
import { PerformanceMonitor } from './utils/performance-monitor'

interface SeedOptions {
  environment?: 'development' | 'testing' | 'ci' | 'local'
  volume?: 'small' | 'medium' | 'large' | 'xl'
  scenarios?: string[]
  skipCleanup?: boolean
  verbose?: boolean
  dryRun?: boolean
}

class MasterSeeder {
  private prisma: PrismaClient
  private factory: TestDataFactoryManager
  private logger: Logger
  private monitor: PerformanceMonitor
  private config: any

  constructor(options: SeedOptions = {}) {
    this.prisma = new PrismaClient()
    this.factory = new TestDataFactoryManager(this.prisma)
    this.logger = new Logger(options.verbose)
    this.monitor = new PerformanceMonitor()
    this.config = config[options.environment || 'development']
  }

  async execute(options: SeedOptions = {}): Promise<void> {
    const startTime = Date.now()
    this.logger.info('🌱 Starting master test data seeding...')
    this.monitor.start('total_seeding')

    try {
      // Validate environment
      await this.validateEnvironment()

      // Clean existing data unless skipped
      if (!options.skipCleanup) {
        await this.cleanupExistingData()
      }

      // Get seeding configuration
      const seedConfig = this.getSeedingConfiguration(options)
      this.logger.info(`📊 Seeding configuration:`, seedConfig)

      if (options.dryRun) {
        this.logger.info('🔍 DRY RUN - No data will be created')
        return
      }

      // Execute seeding phases
      await this.seedCoreData(seedConfig)
      await this.seedRelationalData(seedConfig)
      await this.seedComplexScenarios(seedConfig)
      await this.seedTestSpecificData(options.scenarios || [])

      // Generate summary report
      const summary = await this.generateSummary()
      this.logger.success('✅ Master seeding completed successfully!')
      this.logger.info('📋 Seeding Summary:', summary)

    } catch (error) {
      this.logger.error('❌ Seeding failed:', error)
      throw error
    } finally {
      const duration = Date.now() - startTime
      this.monitor.end('total_seeding')
      this.logger.info(`⏱️  Total execution time: ${duration}ms`)
      await this.factory.disconnect()
    }
  }

  private async validateEnvironment(): Promise<void> {
    this.logger.info('🔍 Validating environment...')
    
    // Check database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`
      this.logger.success('✅ Database connection successful')
    } catch (error) {
      throw new Error(`Database connection failed: ${error}`)
    }

    // Check for production environment
    if (process.env.NODE_ENV === 'production') {
      throw new Error('❌ Cannot run seeding in production environment')
    }

    // Verify test database
    const dbUrl = process.env.DATABASE_URL || ''
    if (!dbUrl.includes('test') && !dbUrl.includes('dev') && !dbUrl.includes('local')) {
      this.logger.warn('⚠️  Database URL does not appear to be a test database')
      if (!process.env.FORCE_SEED) {
        throw new Error('Set FORCE_SEED=true to proceed with non-test database')
      }
    }
  }

  private async cleanupExistingData(): Promise<void> {
    this.logger.info('🧹 Cleaning existing test data...')
    this.monitor.start('cleanup')
    
    await this.factory.cleanup()
    
    this.monitor.end('cleanup')
    this.logger.success('✅ Cleanup completed')
  }

  private getSeedingConfiguration(options: SeedOptions) {
    const volumeConfigs = {
      small: {
        landlords: 3,
        propertiesPerLandlord: 2,
        unitsPerProperty: 2,
        tenantsPerProperty: 1,
        maintenancePercentage: 0.3,
        stripeCustomers: 2
      },
      medium: {
        landlords: 8,
        propertiesPerLandlord: 3,
        unitsPerProperty: 4,
        tenantsPerProperty: 3,
        maintenancePercentage: 0.5,
        stripeCustomers: 6
      },
      large: {
        landlords: 20,
        propertiesPerLandlord: 5,
        unitsPerProperty: 6,
        tenantsPerProperty: 4,
        maintenancePercentage: 0.7,
        stripeCustomers: 15
      },
      xl: {
        landlords: 50,
        propertiesPerLandlord: 8,
        unitsPerProperty: 10,
        tenantsPerProperty: 7,
        maintenancePercentage: 0.8,
        stripeCustomers: 40
      }
    }

    const volume = options.volume || this.config.defaultVolume || 'medium'
    return {
      ...volumeConfigs[volume],
      ...this.config.overrides,
      environment: options.environment || 'development'
    }
  }

  private async seedCoreData(config: any): Promise<void> {
    this.logger.info('👥 Seeding core user data...')
    this.monitor.start('core_data')

    // Create landlords with different subscription tiers
    const subscriptionDistribution = {
      FREE: 0.3,
      STARTER: 0.4,
      GROWTH: 0.25,
      ENTERPRISE: 0.05
    }

    const landlords = []
    for (let i = 0; i < config.landlords; i++) {
      const planType = this.selectFromDistribution(subscriptionDistribution)
      const landlord = await this.factory.user.createLandlord({
        hasSubscription: planType !== 'FREE',
        subscriptionPlan: planType as any,
        subscriptionStatus: this.selectSubscriptionStatus()
      })
      landlords.push(landlord)
      
      if ((i + 1) % 5 === 0) {
        this.logger.info(`   Created ${i + 1}/${config.landlords} landlords`)
      }
    }

    // Store landlords for next phase
    (this as any).seededLandlords = landlords

    this.monitor.end('core_data')
    this.logger.success(`✅ Created ${landlords.length} landlords with subscriptions`)
  }

  private async seedRelationalData(config: any): Promise<void> {
    this.logger.info('🏢 Seeding properties, units, and tenants...')
    this.monitor.start('relational_data')

    const landlords = (this as any).seededLandlords
    const allProperties = []
    const allUnits = []
    const allTenants = []

    for (const landlord of landlords) {
      // Create properties for each landlord
      for (let i = 0; i < config.propertiesPerLandlord; i++) {
        const property = await this.factory.property.createProperty({
          ownerId: landlord.id,
          withUnits: config.unitsPerProperty,
          hasImages: true,
          propertyType: this.selectPropertyType()
        })
        allProperties.push(property)
        
        if (property.units) {
          allUnits.push(...property.units)
        }
      }

      // Create tenants
      const tenantCount = config.propertiesPerLandlord * config.tenantsPerProperty
      for (let i = 0; i < tenantCount; i++) {
        const tenant = await this.factory.tenant.createTenant({
          createUserAccount: Math.random() < 0.8,
          hasDocuments: Math.random() < 0.7,
          emergencyContactInfo: Math.random() < 0.85
        })
        allTenants.push(tenant)
      }
    }

    // Store for next phase
    (this as any).seededProperties = allProperties;
    (this as any).seededUnits = allUnits;
    (this as any).seededTenants = allTenants

    this.monitor.end('relational_data')
    this.logger.success(`✅ Created ${allProperties.length} properties, ${allUnits.length} units, ${allTenants.length} tenants`)
  }

  private async seedComplexScenarios(config: any): Promise<void> {
    this.logger.info('🔗 Creating leases and maintenance requests...')
    this.monitor.start('complex_scenarios')

    const units = (this as any).seededUnits
    const tenants = (this as any).seededTenants
    const allLeases = []
    const allMaintenanceRequests = []

    // Create leases (80% occupancy rate)
    const leaseCount = Math.floor(units.length * 0.8)
    for (let i = 0; i < leaseCount && i < tenants.length; i++) {
      const lease = await this.factory.lease.createLease({
        unitId: units[i].id,
        tenantId: tenants[i].id,
        status: this.selectLeaseStatus(),
        withDocuments: Math.random() < 0.8,
        withReminders: Math.random() < 0.6
      })
      allLeases.push(lease)
    }

    // Create maintenance requests
    const maintenanceCount = Math.floor(units.length * config.maintenancePercentage)
    for (let i = 0; i < maintenanceCount; i++) {
      const randomUnit = units[Math.floor(Math.random() * units.length)]
      const request = await this.factory.maintenance.createMaintenanceRequest({
        unitId: randomUnit.id,
        withFiles: Math.random() < 0.6,
        withExpenses: Math.random() < 0.4
      })
      allMaintenanceRequests.push(request)
    }

    this.monitor.end('complex_scenarios')
    this.logger.success(`✅ Created ${allLeases.length} leases, ${allMaintenanceRequests.length} maintenance requests`)
  }

  private async seedTestSpecificData(scenarios: string[]): Promise<void> {
    if (scenarios.length === 0) return

    this.logger.info('🧪 Creating test-specific scenarios...')
    this.monitor.start('test_scenarios')

    for (const scenario of scenarios) {
      await this.createTestScenario(scenario)
    }

    this.monitor.end('test_scenarios')
    this.logger.success(`✅ Created ${scenarios.length} test scenarios`)
  }

  private async createTestScenario(scenario: string): Promise<void> {
    switch (scenario) {
      case 'payment_failures':
        await this.createPaymentFailureScenarios()
        break
      case 'lease_expirations':
        await this.createLeaseExpirationScenarios()
        break
      case 'emergency_maintenance':
        await this.createEmergencyMaintenanceScenarios()
        break
      case 'subscription_lifecycle':
        await this.createSubscriptionLifecycleScenarios()
        break
      default:
        this.logger.warn(`Unknown scenario: ${scenario}`)
    }
  }

  private async createPaymentFailureScenarios(): Promise<void> {
    const landlords = (this as any).seededLandlords.slice(0, 3)
    
    for (const landlord of landlords) {
      await this.factory.stripe.createPaymentFailureScenario(landlord.id)
    }
    
    this.logger.info('   Created payment failure scenarios')
  }

  private async createLeaseExpirationScenarios(): Promise<void> {
    await this.factory.lease.createExpiringLeases(5)
    this.logger.info('   Created lease expiration scenarios')
  }

  private async createEmergencyMaintenanceScenarios(): Promise<void> {
    const units = (this as any).seededUnits.slice(0, 3)
    
    for (const unit of units) {
      await this.factory.maintenance.createEmergencyScenario(unit.id)
    }
    
    this.logger.info('   Created emergency maintenance scenarios')
  }

  private async createSubscriptionLifecycleScenarios(): Promise<void> {
    const landlords = (this as any).seededLandlords.slice(0, 2)
    
    for (const landlord of landlords) {
      await this.factory.stripe.createSubscriptionLifecycle(landlord.id)
    }
    
    this.logger.info('   Created subscription lifecycle scenarios')
  }

  private async generateSummary(): Promise<any> {
    const counts = await Promise.all([
      this.prisma.user.count(),
      this.prisma.property.count(),
      this.prisma.unit.count(),
      this.prisma.tenant.count(),
      this.prisma.lease.count(),
      this.prisma.maintenanceRequest.count(),
      this.prisma.subscription.count(),
      this.prisma.invoice.count(),
      this.prisma.webhookEvent.count()
    ])

    return {
      users: counts[0],
      properties: counts[1],
      units: counts[2],
      tenants: counts[3],
      leases: counts[4],
      maintenanceRequests: counts[5],
      subscriptions: counts[6],
      invoices: counts[7],
      webhookEvents: counts[8],
      occupancyRate: counts[4] > 0 && counts[2] > 0 ? (counts[4] / counts[2] * 100).toFixed(1) + '%' : '0%',
      performanceMetrics: this.monitor.getMetrics()
    }
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
    
    return Object.keys(distribution)[0]
  }

  private selectSubscriptionStatus(): 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' {
    const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED']
    return statuses[Math.floor(Math.random() * statuses.length)] as any
  }

  private selectPropertyType(): 'SINGLE_FAMILY' | 'MULTI_UNIT' | 'APARTMENT' | 'COMMERCIAL' {
    const types = ['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL']
    const weights = [0.4, 0.3, 0.25, 0.05] // Weighted distribution
    
    const random = Math.random()
    let cumulative = 0
    
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i]
      if (random <= cumulative) {
        return types[i] as any
      }
    }
    
    return 'SINGLE_FAMILY'
  }

  private selectLeaseStatus(): 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' {
    const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'DRAFT', 'EXPIRED', 'TERMINATED']
    return statuses[Math.floor(Math.random() * statuses.length)] as any
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  const options: SeedOptions = {}

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    switch (arg) {
      case '--environment':
      case '-e':
        options.environment = args[++i] as any
        break
      case '--volume':
      case '-v':
        options.volume = args[++i] as any
        break
      case '--scenarios':
      case '-s':
        options.scenarios = args[++i].split(',')
        break
      case '--skip-cleanup':
        options.skipCleanup = true
        break
      case '--verbose':
        options.verbose = true
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--help':
      case '-h':
        console.log(`
Usage: tsx seed-all.ts [options]

Options:
  -e, --environment <env>    Target environment (development|testing|ci|local)
  -v, --volume <size>        Data volume (small|medium|large|xl)
  -s, --scenarios <list>     Comma-separated test scenarios
  --skip-cleanup             Skip cleaning existing data
  --verbose                  Enable verbose logging
  --dry-run                  Show what would be done without executing
  -h, --help                 Show this help message

Examples:
  tsx seed-all.ts --environment testing --volume medium
  tsx seed-all.ts --scenarios payment_failures,lease_expirations
  tsx seed-all.ts --volume large --verbose
`)
        process.exit(0)
    }
  }

  const seeder = new MasterSeeder(options)
  await seeder.execute(options)
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { MasterSeeder, SeedOptions }