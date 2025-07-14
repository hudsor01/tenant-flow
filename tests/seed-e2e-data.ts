import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

/**
 * E2E Test Data Seeding Script
 * Creates deterministic test data for reliable E2E testing
 */
async function seedE2EData() {
  console.log('🌱 Seeding E2E test data...')
  
  try {
    // Clean existing data first
    await cleanupData()
    
    // Create test users
    const users = await createTestUsers()
    
    // Create test properties
    const properties = await createTestProperties(users)
    
    // Create test units
    const units = await createTestUnits(properties)
    
    // Create test tenants
    const tenants = await createTestTenants(users)
    
    // Create test leases
    const leases = await createTestLeases(properties, units, tenants)
    
    // Create test payments
    await createTestPayments(leases)
    
    // Create test maintenance requests
    await createTestMaintenanceRequests(properties, tenants)
    
    // Create test notifications
    await createTestNotifications(users)
    
    console.log('✅ E2E test data seeded successfully!')
    
  } catch (error) {
    console.error('❌ E2E test data seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function cleanupData() {
  // Delete in reverse order of dependencies
  await prisma.notification.deleteMany()
  await prisma.maintenanceRequest.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.lease.deleteMany()
  await prisma.tenant.deleteMany()
  await prisma.unit.deleteMany()
  await prisma.property.deleteMany()
  await prisma.user.deleteMany()
}

async function createTestUsers() {
  const hashedPassword = await bcrypt.hash('TestPassword123!', 10)
  
  const users = [
    {
      id: 'test-landlord-1',
      email: 'landlord@test.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Landlord',
      role: 'LANDLORD' as const,
      isEmailVerified: true,
      profile: {
        phone: '+1234567890',
        avatar: null
      }
    },
    {
      id: 'test-tenant-1', 
      email: 'tenant@test.com',
      password: hashedPassword,
      firstName: 'Jane',
      lastName: 'Tenant',
      role: 'TENANT' as const,
      isEmailVerified: true,
      profile: {
        phone: '+1234567891',
        avatar: null
      }
    },
    {
      id: 'test-tenant-2',
      email: 'tenant2@test.com', 
      password: hashedPassword,
      firstName: 'Bob',
      lastName: 'Tenant',
      role: 'TENANT' as const,
      isEmailVerified: true,
      profile: {
        phone: '+1234567892',
        avatar: null
      }
    }
  ]
  
  const createdUsers = []
  for (const userData of users) {
    const user = await prisma.user.create({
      data: {
        id: userData.id,
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        isEmailVerified: userData.isEmailVerified,
        profile: {
          create: userData.profile
        }
      }
    })
    createdUsers.push(user)
    console.log(`Created test user: ${user.email}`)
  }
  
  return createdUsers
}

async function createTestProperties(users: any[]) {
  const landlord = users.find(u => u.role === 'LANDLORD')
  
  const properties = [
    {
      id: 'test-property-1',
      name: 'Test Property 1',
      address: '123 Test Street',
      city: 'Test City',
      state: 'TX',
      zipCode: '12345',
      country: 'US',
      type: 'SINGLE_FAMILY' as const,
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1500,
      monthlyRent: 2000,
      description: 'Beautiful test property',
      ownerId: landlord.id
    },
    {
      id: 'test-property-2', 
      name: 'Test Property 2',
      address: '456 Test Avenue',
      city: 'Test City',
      state: 'TX', 
      zipCode: '12346',
      country: 'US',
      type: 'APARTMENT' as const,
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 1000,
      monthlyRent: 1500,
      description: 'Cozy test apartment',
      ownerId: landlord.id
    }
  ]
  
  const createdProperties = []
  for (const propertyData of properties) {
    const property = await prisma.property.create({
      data: propertyData
    })
    createdProperties.push(property)
    console.log(`Created test property: ${property.name}`)
  }
  
  return createdProperties
}

async function createTestUnits(properties: any[]) {
  const units = [
    {
      id: 'test-unit-1',
      name: 'Unit A',
      propertyId: properties[0].id,
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1500,
      monthlyRent: 2000,
      isAvailable: false
    },
    {
      id: 'test-unit-2',
      name: 'Unit B', 
      propertyId: properties[1].id,
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 1000,
      monthlyRent: 1500,
      isAvailable: true
    }
  ]
  
  const createdUnits = []
  for (const unitData of units) {
    const unit = await prisma.unit.create({
      data: unitData
    })
    createdUnits.push(unit)
    console.log(`Created test unit: ${unit.name}`)
  }
  
  return createdUnits
}

async function createTestTenants(users: any[]) {
  const tenantUsers = users.filter(u => u.role === 'TENANT')
  const landlord = users.find(u => u.role === 'LANDLORD')
  
  const tenants = [
    {
      id: 'test-tenant-1',
      userId: tenantUsers[0].id,
      landlordId: landlord.id,
      firstName: tenantUsers[0].firstName,
      lastName: tenantUsers[0].lastName,
      email: tenantUsers[0].email,
      phone: '+1234567891',
      status: 'ACTIVE' as const,
      emergencyContact: {
        name: 'Emergency Contact 1',
        phone: '+1234567899'
      }
    },
    {
      id: 'test-tenant-2',
      userId: tenantUsers[1].id,
      landlordId: landlord.id, 
      firstName: tenantUsers[1].firstName,
      lastName: tenantUsers[1].lastName,
      email: tenantUsers[1].email,
      phone: '+1234567892',
      status: 'ACTIVE' as const,
      emergencyContact: {
        name: 'Emergency Contact 2',
        phone: '+1234567898'
      }
    }
  ]
  
  const createdTenants = []
  for (const tenantData of tenants) {
    const tenant = await prisma.tenant.create({
      data: tenantData
    })
    createdTenants.push(tenant)
    console.log(`Created test tenant: ${tenant.email}`)
  }
  
  return createdTenants
}

async function createTestLeases(properties: any[], units: any[], tenants: any[]) {
  const startDate = new Date()
  const endDate = new Date()
  endDate.setFullYear(startDate.getFullYear() + 1)
  
  const leases = [
    {
      id: 'test-lease-1',
      propertyId: properties[0].id,
      unitId: units[0].id,
      tenantId: tenants[0].id,
      startDate,
      endDate,
      monthlyRent: 2000,
      securityDeposit: 2000,
      status: 'ACTIVE' as const,
      terms: 'Standard lease terms for testing'
    }
  ]
  
  const createdLeases = []
  for (const leaseData of leases) {
    const lease = await prisma.lease.create({
      data: leaseData
    })
    createdLeases.push(lease)
    console.log(`Created test lease: ${lease.id}`)
  }
  
  return createdLeases
}

async function createTestPayments(leases: any[]) {
  const payments = [
    {
      id: 'test-payment-1',
      leaseId: leases[0].id,
      amount: 2000,
      dueDate: new Date(),
      paidDate: new Date(),
      status: 'PAID' as const,
      type: 'RENT' as const,
      description: 'Monthly rent payment'
    },
    {
      id: 'test-payment-2',
      leaseId: leases[0].id,
      amount: 2000,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'PENDING' as const,
      type: 'RENT' as const,
      description: 'Next month rent payment'
    }
  ]
  
  for (const paymentData of payments) {
    const payment = await prisma.payment.create({
      data: paymentData
    })
    console.log(`Created test payment: ${payment.id}`)
  }
}

async function createTestMaintenanceRequests(properties: any[], tenants: any[]) {
  const requests = [
    {
      id: 'test-maintenance-1',
      propertyId: properties[0].id,
      tenantId: tenants[0].id,
      title: 'Leaky Faucet',
      description: 'Kitchen faucet is leaking',
      priority: 'MEDIUM' as const,
      status: 'OPEN' as const,
      category: 'PLUMBING' as const
    },
    {
      id: 'test-maintenance-2',
      propertyId: properties[0].id,
      tenantId: tenants[0].id,
      title: 'Broken Light',
      description: 'Bedroom light fixture not working',
      priority: 'LOW' as const,
      status: 'IN_PROGRESS' as const,
      category: 'ELECTRICAL' as const
    }
  ]
  
  for (const requestData of requests) {
    const request = await prisma.maintenanceRequest.create({
      data: requestData
    })
    console.log(`Created test maintenance request: ${request.title}`)
  }
}

async function createTestNotifications(users: any[]) {
  const notifications = [
    {
      id: 'test-notification-1',
      userId: users[0].id,
      title: 'Welcome to TenantFlow',
      message: 'Your account has been set up successfully',
      type: 'INFO' as const,
      isRead: false
    },
    {
      id: 'test-notification-2',
      userId: users[1].id,
      title: 'Payment Due',
      message: 'Your rent payment is due in 3 days',
      type: 'WARNING' as const,
      isRead: false
    }
  ]
  
  for (const notificationData of notifications) {
    const notification = await prisma.notification.create({
      data: notificationData
    })
    console.log(`Created test notification: ${notification.title}`)
  }
}

// Run the seeding
if (require.main === module) {
  seedE2EData()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { seedE2EData }