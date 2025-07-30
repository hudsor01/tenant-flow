import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { AppModule } from '../../app.module'
import { PrismaService } from '../../prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import * as jwt from 'jsonwebtoken'
import { UserRole } from '@tenantflow/shared/types/auth'
import type { User, Property, Unit, Tenant, Lease, MaintenanceRequest } from '@prisma/client'

export interface TestUser {
  id: string
  email: string
  name: string
  role: UserRole
  supabaseId: string
}

export interface TestContext {
  app: INestApplication
  prisma: PrismaService
  testUser: TestUser
  property: Property
  unit: Unit
  tenant: Tenant
  lease: Lease
  maintenanceRequest: MaintenanceRequest
}

export class IntegrationTestUtils {
  private static app: INestApplication
  private static prisma: PrismaService
  private static moduleRef: TestingModule

  static async setupApp(): Promise<INestApplication> {
    if (this.app) return this.app

    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    })

    // Override configuration for test environment
    this.moduleRef = await moduleBuilder.compile()

    this.app = this.moduleRef.createNestApplication(new FastifyAdapter())
    this.prisma = this.app.get(PrismaService)

    // Configure test environment
    await this.app.init()
    await this.app.getHttpAdapter().getInstance().ready()

    return this.app
  }

  static async teardownApp(): Promise<void> {
    if (this.app) {
      await this.app.close()
      this.app = null
    }
    if (this.moduleRef) {
      await this.moduleRef.close()
      this.moduleRef = null
    }
  }

  static async cleanDatabase(): Promise<void> {
    if (!this.prisma) return

    // Clean in reverse dependency order to avoid foreign key constraints
    await this.prisma.maintenanceRequest.deleteMany()
    await this.prisma.lease.deleteMany()
    await this.prisma.tenant.deleteMany()
    await this.prisma.unit.deleteMany()
    await this.prisma.property.deleteMany()
    await this.prisma.user.deleteMany()
    await this.prisma.webhookEvent.deleteMany()
    await this.prisma.subscription.deleteMany()
  }

  static generateJwtToken(user: Partial<TestUser> = {}): string {
    const testUser = {
      id: user.id || 'test-user-id',
      email: user.email || 'test@tenantflow.app',
      name: user.name || 'Test User',
      role: user.role || 'OWNER' as UserRole,
      supabaseId: user.supabaseId || 'test-supabase-id',
      ...user
    }

    return jwt.sign(
      {
        sub: testUser.supabaseId,
        email: testUser.email,
        user_metadata: {
          name: testUser.name,
          full_name: testUser.name
        },
        role: testUser.role,
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://test.supabase.co/auth/v1'
      },
      'test-jwt-secret'
    )
  }

  static async createTestUser(overrides: Partial<User> = {}): Promise<User> {
    const userData = {
      id: 'test-user-id',
      email: 'test@tenantflow.app',
      name: 'Test User',
      role: 'OWNER' as UserRole,
      supabaseId: 'test-supabase-id',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      phone: null,
      bio: null,
      avatarUrl: null,
      ...overrides
    }

    return await this.prisma.user.create({
      data: userData
    })
  }

  static async createTestProperty(userId: string, overrides: Partial<Property> = {}): Promise<Property> {
    const propertyData = {
      id: 'test-property-id',
      name: 'Test Property',
      address: '123 Test St',
      city: 'Test City',
      state: 'TX',
      zipCode: '12345',
      description: 'Test property description',
      propertyType: 'SINGLE_FAMILY',
      imageUrl: null,
      ownerId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }

    return await this.prisma.property.create({
      data: propertyData
    })
  }

  static async createTestUnit(propertyId: string, overrides: Partial<Unit> = {}): Promise<Unit> {
    const unitData = {
      id: 'test-unit-id',
      propertyId,
      unitNumber: 'Unit 101',
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 800,
      monthlyRent: 1200,
      securityDeposit: 1200,
      description: 'Test unit',
      status: 'AVAILABLE',
      amenities: ['Air Conditioning', 'Dishwasher'],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastInspectionDate: null,
      ...overrides
    }

    return await this.prisma.unit.create({
      data: unitData
    })
  }

  static async createTestTenant(userId: string, overrides: Partial<Tenant> = {}): Promise<Tenant> {
    const tenantData = {
      id: 'test-tenant-id',
      name: 'Test Tenant',
      email: 'tenant@test.com',
      phone: '555-0123',
      emergencyContact: 'Emergency Contact',
      emergencyPhone: '555-0124',
      moveInDate: new Date(),
      moveOutDate: null,
      notes: 'Test tenant notes',
      ownerId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }

    return await this.prisma.tenant.create({
      data: tenantData
    })
  }

  static async createTestLease(
    unitId: string,
    tenantId: string,
    overrides: Partial<Lease> = {}
  ): Promise<Lease> {
    const leaseData = {
      id: 'test-lease-id',
      unitId,
      tenantId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      rentAmount: 1200,
      securityDeposit: 1200,
      status: 'ACTIVE',
      lateFeeDays: 5,
      lateFeeAmount: 50,
      leaseTerms: 'Standard lease terms',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }

    return await this.prisma.lease.create({
      data: leaseData
    })
  }

  static async createTestMaintenanceRequest(
    unitId: string,
    overrides: Partial<MaintenanceRequest> = {}
  ): Promise<MaintenanceRequest> {
    const maintenanceData = {
      id: 'test-maintenance-id',
      unitId,
      title: 'Test Maintenance Request',
      description: 'Test maintenance description',
      category: 'PLUMBING',
      priority: 'MEDIUM',
      status: 'OPEN',
      requestedBy: 'Test Tenant',
      contactPhone: '555-0123',
      allowEntry: true,
      photos: [],
      notes: null,
      assignedTo: null,
      estimatedCost: null,
      actualCost: null,
      preferredDate: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    }

    return await this.prisma.maintenanceRequest.create({
      data: maintenanceData
    })
  }

  static async createFullTestContext(userOverrides?: Partial<User>): Promise<TestContext> {
    const app = await this.setupApp()
    const prisma = this.prisma

    // Create test user
    const testUser = await this.createTestUser(userOverrides)

    // Create test property
    const property = await this.createTestProperty(testUser.id)

    // Create test unit
    const unit = await this.createTestUnit(property.id)

    // Create test tenant
    const tenant = await this.createTestTenant(testUser.id)

    // Create test lease
    const lease = await this.createTestLease(unit.id, tenant.id)

    // Create test maintenance request
    const maintenanceRequest = await this.createTestMaintenanceRequest(unit.id)

    return {
      app,
      prisma,
      testUser: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role as UserRole,
        supabaseId: testUser.supabaseId
      },
      property,
      unit,
      tenant,
      lease,
      maintenanceRequest
    }
  }

  static getAuthHeader(user?: Partial<TestUser>): { Authorization: string } {
    const token = this.generateJwtToken(user)
    return { Authorization: `Bearer ${token}` }
  }

  static mockStripeWebhookHeaders(payload: string): Record<string, string> {
    return {
      'stripe-signature': 'test-signature',
      'content-type': 'application/json'
    }
  }

  static createMockStripeEvent(type: string, data: any = {}) {
    return {
      id: 'evt_test_webhook',
      object: 'event',
      created: Math.floor(Date.now() / 1000),
      type,
      data: {
        object: data
      },
      livemode: false,
      pending_webhooks: 0,
      request: {
        id: 'req_test',
        idempotency_key: null
      }
    }
  }

  static async waitForAsyncOperations(ms = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Test data factories
export const TestData = {
  createPropertyPayload: (overrides: any = {}) => ({
    name: 'Test Property',
    address: '123 Test Street',
    city: 'Test City',
    state: 'TX',
    zipCode: '12345',
    description: 'A test property',
    propertyType: 'SINGLE_FAMILY',
    ...overrides
  }),

  createUnitPayload: (propertyId: string, overrides: any = {}) => ({
    propertyId,
    unitNumber: 'Unit 101',
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 800,
    monthlyRent: 1200,
    securityDeposit: 1200,
    description: 'A test unit',
    amenities: ['Air Conditioning'],
    ...overrides
  }),

  createTenantPayload: (overrides: any = {}) => ({
    name: 'Test Tenant',
    email: 'tenant@test.com',
    phone: '555-0123',
    emergencyContact: 'Emergency Contact',
    emergencyPhone: '555-0124',
    moveInDate: new Date().toISOString(),
    notes: 'Test notes',
    ...overrides
  }),

  createLeasePayload: (unitId: string, tenantId: string, overrides: any = {}) => ({
    unitId,
    tenantId,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    rentAmount: 1200,
    securityDeposit: 1200,
    lateFeeDays: 5,
    lateFeeAmount: 50,
    leaseTerms: 'Standard terms',
    ...overrides
  }),

  createMaintenancePayload: (unitId: string, overrides: any = {}) => ({
    unitId,
    title: 'Test Maintenance Request',
    description: 'Test description',
    category: 'PLUMBING',
    priority: 'MEDIUM',
    status: 'OPEN',
    requestedBy: 'Test Tenant',
    contactPhone: '555-0123',
    allowEntry: true,
    ...overrides
  })
}