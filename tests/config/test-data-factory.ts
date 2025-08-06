import { PrismaClient, User, Property, Unit, Tenant, Lease, MaintenanceRequest, Subscription } from '@repo/database'
import { faker } from '@faker-js/faker'

/**
 * Enhanced Test Data Factory
 * Provides deterministic and configurable test data creation
 */
export class TestDataFactory {
  private static prisma = new PrismaClient()

  // User Factories
  static async createLandlord(overrides: Partial<User> = {}): Promise<User> {
    const defaultData = {
      id: faker.string.uuid(),
      email: faker.internet.email().toLowerCase(),
      name: faker.person.fullName(),
      role: 'OWNER' as const,
      phone: faker.phone.number(),
      bio: faker.lorem.sentence(),
      avatarUrl: faker.image.avatar(),
      emailVerified: true,
      supabaseId: faker.string.uuid(),
      stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`
    }

    return await this.prisma.user.create({
      data: { ...defaultData, ...overrides }
    })
  }

  static async createTenant(overrides: Partial<User> = {}): Promise<User> {
    const defaultData = {
      id: faker.string.uuid(),
      email: faker.internet.email().toLowerCase(),
      name: faker.person.fullName(),
      role: 'TENANT' as const,
      phone: faker.phone.number(),
      bio: faker.lorem.sentence(),
      avatarUrl: faker.image.avatar(),
      emailVerified: true,
      supabaseId: faker.string.uuid(),
      stripeCustomerId: null
    }

    return await this.prisma.user.create({
      data: { ...defaultData, ...overrides }
    })
  }

  static async createAdmin(overrides: Partial<User> = {}): Promise<User> {
    const defaultData = {
      id: faker.string.uuid(),
      email: faker.internet.email().toLowerCase(),
      name: faker.person.fullName(),
      role: 'ADMIN' as const,
      phone: faker.phone.number(),
      bio: 'System Administrator',
      avatarUrl: faker.image.avatar(),
      emailVerified: true,
      supabaseId: faker.string.uuid(),
      stripeCustomerId: null
    }

    return await this.prisma.user.create({
      data: { ...defaultData, ...overrides }
    })
  }

  // Property Factories
  static async createProperty(landlordId: string, overrides: Partial<Property> = {}): Promise<Property> {
    const defaultData = {
      id: faker.string.uuid(),
      name: faker.company.name() + ' Property',
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode(),
      country: 'US',
      type: faker.helpers.arrayElement(['SINGLE_FAMILY', 'APARTMENT', 'CONDO', 'TOWNHOUSE'] as const),
      bedrooms: faker.number.int({ min: 1, max: 5 }),
      bathrooms: faker.number.int({ min: 1, max: 3 }),
      squareFeet: faker.number.int({ min: 500, max: 3000 }),
      monthlyRent: faker.number.int({ min: 800, max: 5000 }),
      description: faker.lorem.paragraph(),
      ownerId: landlordId,
      amenities: faker.helpers.arrayElements([
        'Pool', 'Gym', 'Parking', 'Laundry', 'Balcony', 'Garden'
      ], { min: 1, max: 4 }),
      images: [faker.image.url(), faker.image.url()]
    }

    return await this.prisma.property.create({
      data: { ...defaultData, ...overrides }
    })
  }

  // Unit Factories
  static async createUnit(propertyId: string, overrides: Partial<Unit> = {}): Promise<Unit> {
    const defaultData = {
      id: faker.string.uuid(),
      unitNumber: faker.string.alphanumeric(3).toUpperCase(),
      propertyId,
      bedrooms: faker.number.int({ min: 1, max: 4 }),
      bathrooms: faker.number.int({ min: 1, max: 3 }),
      squareFeet: faker.number.int({ min: 500, max: 2000 }),
      rent: faker.number.int({ min: 800, max: 4000 }),
      status: faker.helpers.arrayElement(['VACANT', 'OCCUPIED', 'MAINTENANCE'] as const),
      description: faker.lorem.sentence(),
      amenities: faker.helpers.arrayElements([
        'Balcony', 'In-unit Laundry', 'Dishwasher', 'Air Conditioning'
      ], { min: 0, max: 3 })
    }

    return await this.prisma.unit.create({
      data: { ...defaultData, ...overrides }
    })
  }

  // Tenant Profile Factories
  static async createTenantProfile(userId: string, invitedBy: string, overrides: Partial<Tenant> = {}): Promise<Tenant> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found for tenant profile')

    const defaultData = {
      id: faker.string.uuid(),
      userId,
      invitedBy,
      name: user.name || faker.person.fullName(),
      email: user.email,
      phone: user.phone || faker.phone.number(),
      invitationStatus: faker.helpers.arrayElement(['PENDING', 'ACCEPTED', 'DECLINED'] as const),
      emergencyContact: `${faker.person.fullName()}: ${faker.phone.number()}`,
      acceptedAt: faker.helpers.arrayElement([new Date(), null])
    }

    return await this.prisma.tenant.create({
      data: { ...defaultData, ...overrides }
    })
  }

  // Lease Factories
  static async createLease(unitId: string, tenantId: string, overrides: Partial<Lease> = {}): Promise<Lease> {
    const startDate = faker.date.future()
    const endDate = new Date(startDate)
    endDate.setFullYear(startDate.getFullYear() + 1)

    const defaultData = {
      id: faker.string.uuid(),
      unitId,
      tenantId,
      startDate,
      endDate,
      rentAmount: faker.number.int({ min: 800, max: 4000 }),
      securityDeposit: faker.number.int({ min: 800, max: 4000 }),
      status: faker.helpers.arrayElement(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'] as const),
      terms: faker.lorem.paragraphs(3),
      signedAt: faker.helpers.arrayElement([new Date(), null])
    }

    return await this.prisma.lease.create({
      data: { ...defaultData, ...overrides }
    })
  }

  // Maintenance Request Factories
  static async createMaintenanceRequest(unitId: string, overrides: Partial<MaintenanceRequest> = {}): Promise<MaintenanceRequest> {
    const defaultData = {
      id: faker.string.uuid(),
      unitId,
      title: faker.helpers.arrayElement([
        'Leaky Faucet', 'Broken Light', 'AC Not Working', 'Clogged Drain',
        'Paint Touch-up', 'Door Lock Issue', 'Window Repair'
      ]),
      description: faker.lorem.paragraph(),
      priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const),
      status: faker.helpers.arrayElement(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const),
      reportedBy: faker.string.uuid(),
      assignedTo: faker.helpers.arrayElement([faker.string.uuid(), null]),
      images: faker.helpers.arrayElements([
        faker.image.url(), faker.image.url(), faker.image.url()
      ], { min: 0, max: 3 }),
      estimatedCost: faker.number.int({ min: 50, max: 2000 }),
      actualCost: faker.helpers.arrayElement([
        faker.number.int({ min: 50, max: 2000 }), null
      ])
    }

    return await this.prisma.maintenanceRequest.create({
      data: { ...defaultData, ...overrides }
    })
  }

  // Subscription Factories
  static async createSubscription(userId: string, overrides: Partial<Subscription> = {}): Promise<Subscription> {
    const defaultData = {
      id: faker.string.uuid(),
      userId,
      stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
      stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
      stripePriceId: `price_${faker.string.alphanumeric(14)}`,
      status: faker.helpers.arrayElement([
        'active', 'canceled', 'incomplete', 'incomplete_expired',
        'past_due', 'trialing', 'unpaid'
      ] as const),
      currentPeriodStart: faker.date.recent(),
      currentPeriodEnd: faker.date.future(),
      cancelAtPeriodEnd: false,
      trialStart: faker.helpers.arrayElement([faker.date.recent(), null]),
      trialEnd: faker.helpers.arrayElement([faker.date.future(), null])
    }

    return await this.prisma.subscription.create({
      data: { ...defaultData, ...overrides }
    })
  }

  // Batch Creation Methods
  static async createCompletePropertySetup(landlordId: string, options: {
    propertyCount?: number
    unitsPerProperty?: number
    tenantCount?: number
    activeLeases?: number
  } = {}): Promise<{
    properties: Property[]
    units: Unit[]
    tenants: Tenant[]
    leases: Lease[]
  }> {
    const {
      propertyCount = 2,
      unitsPerProperty = 3,
      tenantCount = 4,
      activeLeases = 2
    } = options

    // Create properties
    const properties = await Promise.all(
      Array.from({ length: propertyCount }, () =>
        this.createProperty(landlordId)
      )
    )

    // Create units for each property
    const units = await Promise.all(
      properties.flatMap(property =>
        Array.from({ length: unitsPerProperty }, () =>
          this.createUnit(property.id)
        )
      )
    )

    // Create tenant users and profiles
    const tenantUsers = await Promise.all(
      Array.from({ length: tenantCount }, () => this.createTenant())
    )

    const tenants = await Promise.all(
      tenantUsers.map(user =>
        this.createTenantProfile(user.id, landlordId, { invitationStatus: 'ACCEPTED' })
      )
    )

    // Create active leases
    const leases = await Promise.all(
      Array.from({ length: activeLeases }, (_, index) =>
        this.createLease(
          units[index % units.length].id,
          tenants[index % tenants.length].id,
          { status: 'ACTIVE' }
        )
      )
    )

    return { properties, units, tenants, leases }
  }

  // Test Data Cleanup
  static async cleanup(): Promise<void> {
    await this.prisma.maintenanceRequest.deleteMany()
    await this.prisma.lease.deleteMany()
    await this.prisma.tenant.deleteMany()
    await this.prisma.unit.deleteMany()
    await this.prisma.property.deleteMany()
    await this.prisma.subscription.deleteMany()
    await this.prisma.user.deleteMany()
  }

  // Stripe Test Data
  static getStripeTestData() {
    return {
      testCards: {
        visa: '4242424242424242',
        visaDebit: '4000056655665556',
        mastercard: '5555555555554444',
        declined: '4000000000000002',
        insufficientFunds: '4000000000009995',
        processingError: '4000000000000119',
        expiredCard: '4000000000000069'
      },
      testCustomers: {
        validCustomer: 'cus_test_valid',
        invalidCustomer: 'cus_test_invalid'
      },
      testPrices: {
        starterMonthly: 'price_starter_monthly',
        professionalMonthly: 'price_professional_monthly',
        tenantflow_maxMonthly: 'price_tenantflow_max_monthly'
      }
    }
  }

  // Performance Test Data
  static async createPerformanceTestData(scale: 'small' | 'medium' | 'large' = 'medium'): Promise<void> {
    const scales = {
      small: { users: 10, properties: 20, units: 60, leases: 40 },
      medium: { users: 100, properties: 200, units: 600, leases: 400 },
      large: { users: 1000, properties: 2000, units: 6000, leases: 4000 }
    }

    const config = scales[scale]

    // Create landlords
    const landlords = await Promise.all(
      Array.from({ length: Math.floor(config.users * 0.3) }, () => this.createLandlord())
    )

    // Create tenants
    const tenantUsers = await Promise.all(
      Array.from({ length: Math.floor(config.users * 0.7) }, () => this.createTenant())
    )

    // Distribute properties among landlords
    const properties = await Promise.all(
      Array.from({ length: config.properties }, (_, index) =>
        this.createProperty(landlords[index % landlords.length].id)
      )
    )

    // Create units
    const units = await Promise.all(
      Array.from({ length: config.units }, (_, index) =>
        this.createUnit(properties[index % properties.length].id)
      )
    )

    // Create tenant profiles
    const tenants = await Promise.all(
      tenantUsers.map((user, index) =>
        this.createTenantProfile(
          user.id,
          landlords[index % landlords.length].id,
          { invitationStatus: 'ACCEPTED' }
        )
      )
    )

    // Create leases
    await Promise.all(
      Array.from({ length: config.leases }, (_, index) =>
        this.createLease(
          units[index % units.length].id,
          tenants[index % tenants.length].id,
          { status: 'ACTIVE' }
        )
      )
    )

    console.log(`Created performance test data at ${scale} scale:`)
    console.log(`- ${landlords.length} landlords`)
    console.log(`- ${tenantUsers.length} tenant users`)
    console.log(`- ${properties.length} properties`)
    console.log(`- ${units.length} units`)
    console.log(`- ${config.leases} leases`)
  }

  static async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

// Export specific test scenarios
export const TestScenarios = {
  // Basic MVP scenarios
  landlordWithProperties: async () => {
    const landlord = await TestDataFactory.createLandlord()
    const setup = await TestDataFactory.createCompletePropertySetup(landlord.id, {
      propertyCount: 2,
      unitsPerProperty: 2,
      tenantCount: 3,
      activeLeases: 2
    })
    return { landlord, ...setup }
  },

  // Stripe integration scenarios
  subscribedLandlord: async () => {
    const landlord = await TestDataFactory.createLandlord()
    const subscription = await TestDataFactory.createSubscription(landlord.id, {
      status: 'active'
    })
    return { landlord, subscription }
  },

  // Maintenance scenarios
  propertyWithMaintenanceRequests: async () => {
    const landlord = await TestDataFactory.createLandlord()
    const property = await TestDataFactory.createProperty(landlord.id)
    const unit = await TestDataFactory.createUnit(property.id)

    const requests = await Promise.all([
      TestDataFactory.createMaintenanceRequest(unit.id, { priority: 'URGENT', status: 'OPEN' }),
      TestDataFactory.createMaintenanceRequest(unit.id, { priority: 'HIGH', status: 'IN_PROGRESS' }),
      TestDataFactory.createMaintenanceRequest(unit.id, { priority: 'MEDIUM', status: 'COMPLETED' })
    ])

    return { landlord, property, unit, requests }
  }
}
