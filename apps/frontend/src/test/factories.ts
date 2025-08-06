/**
 * Test Data Factories
 * Generate realistic test data for all entities
 */

import { faker } from '@faker-js/faker'
import type { 
  TestProperty, 
  TestTenant, 
  TestLease, 
  TestMaintenanceRequest, 
  TestPayment 
} from './test-database'

// Property factory
export const createPropertyFactory = (overrides: Partial<TestProperty> = {}): Omit<TestProperty, 'id' | 'created_at' | 'updated_at'> => {
  const bedrooms = faker.number.int({ min: 1, max: 5 })
  const bathrooms = faker.number.float({ min: 1, max: 3, fractionDigits: 1 })
  const squareFeet = faker.number.int({ min: 500, max: 3000 })
  const rentAmount = faker.number.int({ min: 800, max: 4000 })

  return {
    name: faker.location.streetAddress(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zip_code: faker.location.zipCode(),
    property_type: faker.helpers.arrayElement(['single_family', 'apartment', 'condo', 'townhouse']),
    bedrooms,
    bathrooms,
    square_feet: squareFeet,
    rent_amount: rentAmount,
    status: faker.helpers.arrayElement(['available', 'occupied', 'maintenance']),
    owner_id: 'test-owner-123',
    ...overrides
  }
}

// Tenant factory
export const createTenantFactory = (overrides: Partial<TestTenant> = {}): Omit<TestTenant, 'id' | 'created_at' | 'updated_at'> => {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const email = faker.internet.email({ firstName, lastName })
  
  return {
    first_name: firstName,
    last_name: lastName,
    email,
    phone: faker.phone.number(),
    date_of_birth: faker.date.past({ years: 30, refDate: new Date('2000-01-01') }).toISOString().split('T')[0],
    emergency_contact_name: faker.person.fullName(),
    emergency_contact_phone: faker.phone.number(),
    property_id: undefined,
    unit_id: undefined,
    lease_start_date: undefined,
    lease_end_date: undefined,
    monthly_rent: undefined,
    security_deposit: undefined,
    status: faker.helpers.arrayElement(['active', 'inactive', 'pending']),
    owner_id: 'test-owner-123',
    ...overrides
  }
}

// Lease factory
export const createLeaseFactory = (overrides: Partial<TestLease> = {}): Omit<TestLease, 'id' | 'created_at' | 'updated_at'> => {
  const startDate = faker.date.recent({ days: 30 })
  const endDate = new Date(startDate)
  endDate.setFullYear(endDate.getFullYear() + 1) // 1 year lease

  const monthlyRent = faker.number.int({ min: 800, max: 4000 })
  const securityDeposit = monthlyRent * faker.number.float({ min: 1, max: 2 })

  return {
    property_id: 'test-property-123',
    tenant_id: 'test-tenant-123',
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    monthly_rent: monthlyRent,
    security_deposit: Math.round(securityDeposit),
    lease_terms: {
      pets_allowed: faker.datatype.boolean(),
      smoking_allowed: false,
      utilities_included: faker.helpers.arrayElements(['water', 'electricity', 'gas', 'internet'], { min: 0, max: 4 }),
      parking_spaces: faker.number.int({ min: 0, max: 3 }),
      late_fee: faker.number.int({ min: 25, max: 100 }),
      grace_period_days: faker.number.int({ min: 3, max: 10 })
    },
    status: faker.helpers.arrayElement(['active', 'expired', 'terminated', 'pending']),
    owner_id: 'test-owner-123',
    ...overrides
  }
}

// Maintenance request factory
export const createMaintenanceRequestFactory = (overrides: Partial<TestMaintenanceRequest> = {}): Omit<TestMaintenanceRequest, 'id' | 'created_at' | 'updated_at'> => {
  const categories = ['plumbing', 'electrical', 'hvac', 'appliance', 'other'] as const
  const priorities = ['low', 'medium', 'high', 'urgent'] as const
  const statuses = ['pending', 'in_progress', 'completed', 'cancelled'] as const

  const category = faker.helpers.arrayElement(categories)
  const priority = faker.helpers.arrayElement(priorities)
  const status = faker.helpers.arrayElement(statuses)

  // Generate realistic titles and descriptions based on category
  const titlesByCategory = {
    plumbing: ['Leaky faucet', 'Clogged drain', 'Running toilet', 'Low water pressure', 'Pipe burst'],
    electrical: ['Outlet not working', 'Light switch broken', 'Circuit breaker tripping', 'Flickering lights'],
    hvac: ['AC not cooling', 'Heater not working', 'Strange noises from HVAC', 'Thermostat issues'],
    appliance: ['Refrigerator not cooling', 'Washer not draining', 'Dishwasher leaking', 'Oven not heating'],
    other: ['Door lock broken', 'Window won\'t close', 'Ceiling stain', 'Pest control needed']
  }

  const title = faker.helpers.arrayElement(titlesByCategory[category])
  const description = `${title}. ${faker.lorem.sentences(2)}`

  return {
    property_id: 'test-property-123',
    tenant_id: faker.datatype.boolean() ? 'test-tenant-123' : undefined,
    title,
    description,
    priority,
    status,
    category,
    estimated_cost: status !== 'pending' ? faker.number.int({ min: 50, max: 2000 }) : undefined,
    actual_cost: status === 'completed' ? faker.number.int({ min: 50, max: 2000 }) : undefined,
    scheduled_date: ['in_progress', 'completed'].includes(status) 
      ? faker.date.future({ days: 30 }).toISOString().split('T')[0] 
      : undefined,
    completed_date: status === 'completed' 
      ? faker.date.recent({ days: 7 }).toISOString().split('T')[0] 
      : undefined,
    owner_id: 'test-owner-123',
    ...overrides
  }
}

// Payment factory
export const createPaymentFactory = (overrides: Partial<TestPayment> = {}): Omit<TestPayment, 'id' | 'created_at' | 'updated_at'> => {
  const amount = faker.number.int({ min: 800, max: 4000 })
  const dueDate = faker.date.recent({ days: 30 })
  const paymentDate = faker.date.between({ 
    from: new Date(dueDate.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days before due
    to: new Date(dueDate.getTime() + 10 * 24 * 60 * 60 * 1000)  // 10 days after due
  })

  return {
    tenant_id: 'test-tenant-123',
    property_id: 'test-property-123',
    lease_id: 'test-lease-123',
    amount,
    payment_date: paymentDate.toISOString().split('T')[0],
    due_date: dueDate.toISOString().split('T')[0],
    payment_method: faker.helpers.arrayElement(['bank_transfer', 'credit_card', 'check', 'cash']),
    status: faker.helpers.arrayElement(['pending', 'completed', 'failed', 'refunded']),
    transaction_id: faker.string.alphanumeric(20),
    notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    owner_id: 'test-owner-123',
    ...overrides
  }
}

// Batch factory utilities
export const createMultipleProperties = (count: number, overrides: Partial<TestProperty> = {}): Omit<TestProperty, 'id' | 'created_at' | 'updated_at'>[] => {
  return Array.from({ length: count }, () => createPropertyFactory(overrides))
}

export const createMultipleTenants = (count: number, overrides: Partial<TestTenant> = {}): Omit<TestTenant, 'id' | 'created_at' | 'updated_at'>[] => {
  return Array.from({ length: count }, () => createTenantFactory(overrides))
}

export const createMultipleLeases = (count: number, overrides: Partial<TestLease> = {}): Omit<TestLease, 'id' | 'created_at' | 'updated_at'>[] => {
  return Array.from({ length: count }, () => createLeaseFactory(overrides))
}

export const createMultipleMaintenanceRequests = (count: number, overrides: Partial<TestMaintenanceRequest> = {}): Omit<TestMaintenanceRequest, 'id' | 'created_at' | 'updated_at'>[] => {
  return Array.from({ length: count }, () => createMaintenanceRequestFactory(overrides))
}

export const createMultiplePayments = (count: number, overrides: Partial<TestPayment> = {}): Omit<TestPayment, 'id' | 'created_at' | 'updated_at'>[] => {
  return Array.from({ length: count }, () => createPaymentFactory(overrides))
}

// Realistic scenario factories
export const createPropertyWithTenants = (tenantCount = 2) => {
  const property = createPropertyFactory({ status: 'occupied' })
  const tenants = createMultipleTenants(tenantCount, { 
    status: 'active',
    monthly_rent: property.rent_amount / tenantCount
  })
  
  return { property, tenants }
}

export const createCompleteLeaseScenario = () => {
  const property = createPropertyFactory({ status: 'occupied' })
  const tenant = createTenantFactory({ status: 'active' })
  const lease = createLeaseFactory({
    monthly_rent: property.rent_amount,
    status: 'active'
  })
  const payments = createMultiplePayments(3, {
    amount: property.rent_amount,
    status: 'completed'
  })
  const maintenance = createMultipleMaintenanceRequests(2, {
    status: 'completed'
  })

  return { property, tenant, lease, payments, maintenance }
}

export const createMaintenanceWorkflow = () => {
  const property = createPropertyFactory()
  const tenant = createTenantFactory()
  const maintenanceRequests = [
    createMaintenanceRequestFactory({ priority: 'urgent', status: 'pending' }),
    createMaintenanceRequestFactory({ priority: 'high', status: 'in_progress' }),
    createMaintenanceRequestFactory({ priority: 'medium', status: 'completed' })
  ]

  return { property, tenant, maintenanceRequests }
}

// User factory for authentication tests
export const createUserFactory = (overrides: Record<string, unknown> = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  user_metadata: {
    full_name: faker.person.fullName(),
    avatar_url: faker.image.avatar()
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides
})

// Session factory
export const createSessionFactory = (user = createUserFactory()) => ({
  access_token: faker.string.alphanumeric(40),
  refresh_token: faker.string.alphanumeric(40),
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user
})