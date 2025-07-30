/**
 * Test Data Factories
 * 
 * Comprehensive data generation utilities for TenantFlow testing infrastructure.
 * These factories create realistic, consistent test data for all testing scenarios.
 */

import { PrismaClient } from '@prisma/client'
import { UserFactory } from './user.factory'
import { PropertyFactory } from './property.factory'
import { TenantFactory } from './tenant.factory'
import { LeaseFactory } from './lease.factory'
import { MaintenanceFactory } from './maintenance.factory'
import { StripeFactory } from './stripe.factory'

export class TestDataFactoryManager {
  private prisma: PrismaClient
  public readonly user: UserFactory
  public readonly property: PropertyFactory
  public readonly tenant: TenantFactory
  public readonly lease: LeaseFactory
  public readonly maintenance: MaintenanceFactory
  public readonly stripe: StripeFactory

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient()
    this.user = new UserFactory(this.prisma)
    this.property = new PropertyFactory(this.prisma)
    this.tenant = new TenantFactory(this.prisma)
    this.lease = new LeaseFactory(this.prisma)
    this.maintenance = new MaintenanceFactory(this.prisma)
    this.stripe = new StripeFactory(this.prisma)
  }

  /**
   * Create a complete property management scenario
   * Perfect for integration and E2E testing
   */
  async createCompleteScenario(options: {
    landlordCount?: number
    propertiesPerLandlord?: number
    unitsPerProperty?: number
    tenantsPerProperty?: number
    activeLeasePercentage?: number
    maintenanceRequestPercentage?: number
    subscriptionDistribution?: Record<string, number>
  } = {}): Promise<{
    landlords: any[]
    properties: any[]
    units: any[]
    tenants: any[]
    leases: any[]
    maintenanceRequests: any[]
    subscriptions: any[]
    summary: {
      totalUsers: number
      totalProperties: number
      totalUnits: number
      totalTenants: number
      totalLeases: number
      totalMaintenanceRequests: number
      occupancyRate: number
    }
  }> {
    const {
      landlordCount = 5,
      propertiesPerLandlord = 3,
      unitsPerProperty = 4,
      tenantsPerProperty = 3,
      activeLeasePercentage = 0.8,
      maintenanceRequestPercentage = 0.6,
      subscriptionDistribution = { FREE: 0.3, STARTER: 0.4, GROWTH: 0.25, ENTERPRISE: 0.05 }
    } = options

    console.log('🏗️  Creating complete property management scenario...')

    // Create landlords with subscriptions
    const landlords = []
    for (let i = 0; i < landlordCount; i++) {
      const planType = this.selectFromDistribution(subscriptionDistribution)
      const landlord = await this.user.createLandlord({
        hasSubscription: planType !== 'FREE',
        subscriptionPlan: planType as any,
        subscriptionStatus: 'ACTIVE'
      })
      landlords.push(landlord)
    }

    // Create properties and units
    const properties = []
    const units = []
    for (const landlord of landlords) {
      for (let i = 0; i < propertiesPerLandlord; i++) {
        const property = await this.property.createProperty({
          ownerId: landlord.id,
          withUnits: unitsPerProperty,
          hasImages: true
        })
        properties.push(property)
        if (property.units) {
          units.push(...property.units)
        }
      }
    }

    // Create tenants
    const tenants = []
    const totalTenantCount = properties.length * tenantsPerProperty
    for (let i = 0; i < totalTenantCount; i++) {
      const tenant = await this.tenant.createTenant({
        createUserAccount: true,
        hasDocuments: Math.random() < 0.7,
        emergencyContactInfo: Math.random() < 0.8
      })
      tenants.push(tenant)
    }

    // Create leases
    const leases = []
    const activeLeaseCount = Math.floor(units.length * activeLeasePercentage)
    
    for (let i = 0; i < activeLeaseCount; i++) {
      if (i < tenants.length) {
        const lease = await this.lease.createLease({
          unitId: units[i].id,
          tenantId: tenants[i].id,
          status: 'ACTIVE',
          withDocuments: true,
          withReminders: Math.random() < 0.5
        })
        leases.push(lease)
      }
    }

    // Create maintenance requests
    const maintenanceRequests = []
    const maintenanceCount = Math.floor(units.length * maintenanceRequestPercentage)
    
    for (let i = 0; i < maintenanceCount; i++) {
      const randomUnit = units[Math.floor(Math.random() * units.length)]
      const request = await this.maintenance.createMaintenanceRequest({
        unitId: randomUnit.id,
        withFiles: Math.random() < 0.6,
        withExpenses: Math.random() < 0.4
      })
      maintenanceRequests.push(request)
    }

    // Collect subscriptions
    const subscriptions = landlords
      .filter(landlord => landlord.subscription)
      .map(landlord => landlord.subscription)

    const summary = {
      totalUsers: landlords.length + tenants.length,
      totalProperties: properties.length,
      totalUnits: units.length,
      totalTenants: tenants.length,
      totalLeases: leases.length,
      totalMaintenanceRequests: maintenanceRequests.length,
      occupancyRate: Number((leases.length / units.length).toFixed(2))
    }

    console.log('✅ Complete scenario created:', summary)

    return {
      landlords,
      properties,
      units,
      tenants,
      leases,
      maintenanceRequests,
      subscriptions,
      summary
    }
  }

  /**
   * Create a realistic property portfolio for a single landlord
   */
  async createLandlordPortfolio(options: {
    portfolioSize?: 'small' | 'medium' | 'large'
    subscriptionPlan?: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE'
    includeMaintenanceHistory?: boolean
    includeFinancialData?: boolean
  } = {}): Promise<{
    landlord: any
    portfolio: any
    analytics: {
      totalProperties: number
      totalUnits: number
      occupiedUnits: number
      totalMonthlyRevenue: number
      averageRent: number
      maintenanceRequests: {
        total: number
        open: number
        overdue: number
      }
    }
  }> {
    const {
      portfolioSize = 'medium',
      subscriptionPlan = 'GROWTH',
      includeMaintenanceHistory = true,
      includeFinancialData = true
    } = options

    // Create landlord
    const landlord = await this.user.createLandlord({
      hasSubscription: subscriptionPlan !== 'FREE',
      subscriptionPlan: subscriptionPlan as any,
      subscriptionStatus: 'ACTIVE'
    })

    // Create property portfolio
    const portfolio = await this.property.createPropertyPortfolio(
      landlord.id,
      portfolioSize
    )

    // Add maintenance history if requested
    let maintenanceRequests: any[] = []
    if (includeMaintenanceHistory) {
      for (const property of portfolio.properties) {
        if (property.units) {
          for (const unit of property.units) {
            const requestCount = Math.floor(Math.random() * 3) + 1
            for (let i = 0; i < requestCount; i++) {
              const request = await this.maintenance.createMaintenanceRequest({
                unitId: unit.id,
                withFiles: Math.random() < 0.7,
                withExpenses: Math.random() < 0.5
              })
              maintenanceRequests.push(request)
            }
          }
        }
      }
    }

    // Calculate analytics
    const totalUnits = portfolio.totalUnits
    const occupiedUnits = Math.floor(totalUnits * portfolio.occupancyRate)
    const totalMonthlyRevenue = portfolio.properties.reduce((sum, property) => {
      return sum + (property.units?.reduce((unitSum: number, unit: any) => 
        unitSum + (unit.status === 'OCCUPIED' ? unit.rent : 0), 0) || 0)
    }, 0)
    const averageRent = totalMonthlyRevenue / Math.max(occupiedUnits, 1)

    const analytics = {
      totalProperties: portfolio.properties.length,
      totalUnits,
      occupiedUnits,
      totalMonthlyRevenue,
      averageRent: Math.round(averageRent),
      maintenanceRequests: {
        total: maintenanceRequests.length,
        open: maintenanceRequests.filter(r => r.status === 'OPEN').length,
        overdue: maintenanceRequests.filter(r => 
          r.status === 'OPEN' && 
          new Date(r.createdAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length
      }
    }

    return { landlord, portfolio, analytics }
  }

  /**
   * Create test data optimized for specific test types
   */
  async createForTestType(testType: 'unit' | 'integration' | 'e2e' | 'performance' | 'security'): Promise<any> {
    switch (testType) {
      case 'unit':
        return this.createUnitTestData()
      case 'integration':
        return this.createIntegrationTestData()
      case 'e2e':
        return this.createE2ETestData()
      case 'performance':
        return this.createPerformanceTestData()
      case 'security':
        return this.createSecurityTestData()
      default:
        throw new Error(`Unknown test type: ${testType}`)
    }
  }

  private async createUnitTestData() {
    // Minimal data for unit tests - just what's needed
    return {
      user: await this.user.createLandlord(),
      tenant: await this.tenant.createTenant(),
      mockData: {
        property: { id: 'test-property-1', name: 'Test Property' },
        unit: { id: 'test-unit-1', unitNumber: 'A1' },
        lease: { id: 'test-lease-1', rentAmount: 1200 }
      }
    }
  }

  private async createIntegrationTestData() {
    // Real database records for integration tests
    const landlord = await this.user.createLandlord({ hasSubscription: true })
    const property = await this.property.createProperty({
      ownerId: landlord.id,
      withUnits: 2
    })
    const tenant = await this.tenant.createTenant({ createUserAccount: true })
    
    return { landlord, property, tenant }
  }

  private async createE2ETestData() {
    // Complete user journeys for E2E tests
    return this.createCompleteScenario({
      landlordCount: 2,
      propertiesPerLandlord: 2,
      unitsPerProperty: 3,
      tenantsPerProperty: 2
    })
  }

  private async createPerformanceTestData() {
    // Large datasets for performance testing
    return this.createCompleteScenario({
      landlordCount: 20,
      propertiesPerLandlord: 10,
      unitsPerProperty: 8,
      tenantsPerProperty: 6
    })
  }

  private async createSecurityTestData() {
    // Data with various security scenarios
    const adminUser = await this.user.createAdmin()
    const landlord = await this.user.createLandlord()
    const tenant = await this.tenant.createTenant()
    
    return {
      adminUser,
      landlord,
      tenant,
      securityScenarios: {
        unauthorizedAccess: { userId: tenant.id, resourceType: 'property' },
        dataExfiltration: { userId: landlord.id, dataType: 'tenant_pii' },
        privilegeEscalation: { userId: tenant.id, targetRole: 'ADMIN' }
      }
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
    
    return Object.keys(distribution)[0] // Fallback
  }

  /**
   * Clean up all test data
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test data...')
    
    // Delete in reverse dependency order
    await this.prisma.webhookEvent.deleteMany()
    await this.prisma.invoice.deleteMany()
    await this.prisma.reminderLog.deleteMany()
    await this.prisma.expense.deleteMany()
    await this.prisma.file.deleteMany()
    await this.prisma.maintenanceRequest.deleteMany()
    await this.prisma.document.deleteMany()
    await this.prisma.lease.deleteMany()
    await this.prisma.tenant.deleteMany()
    await this.prisma.unit.deleteMany()
    await this.prisma.property.deleteMany()
    await this.prisma.subscription.deleteMany()
    await this.prisma.userFeatureAccess.deleteMany()
    await this.prisma.userPreferences.deleteMany()
    await this.prisma.user.deleteMany()
    
    console.log('✅ Test data cleanup completed')
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

// Export individual factories for direct use
export {
  UserFactory,
  PropertyFactory,
  TenantFactory,
  LeaseFactory,
  MaintenanceFactory,
  StripeFactory
}

// Export factory options types
export type {
  UserFactoryOptions,
  PropertyFactoryOptions,
  TenantFactoryOptions,
  LeaseFactoryOptions,
  MaintenanceFactoryOptions,
  StripeFactoryOptions
} from './user.factory'

// Create singleton instance for easy use
export const testDataFactory = new TestDataFactoryManager()