/**
 * Test user constants for E2E testing
 * These correspond to the users created in the seed script
 */
export const TestUser = {
  LANDLORD: {
    id: 'test-landlord-1',
    email: 'landlord@test.com',
    password: 'TestPassword123!',
    firstName: 'John',
    lastName: 'Landlord',
    role: 'LANDLORD'
  },
  TENANT_1: {
    id: 'test-tenant-1',
    email: 'tenant@test.com', 
    password: 'TestPassword123!',
    firstName: 'Jane',
    lastName: 'Tenant',
    role: 'TENANT'
  },
  TENANT_2: {
    id: 'test-tenant-2',
    email: 'tenant2@test.com',
    password: 'TestPassword123!', 
    firstName: 'Bob',
    lastName: 'Tenant',
    role: 'TENANT'
  }
} as const

export const TestData = {
  PROPERTIES: {
    PROPERTY_1: {
      id: 'test-property-1',
      name: 'Test Property 1',
      address: '123 Test Street',
      city: 'Test City',
      state: 'TX',
      zipCode: '12345'
    },
    PROPERTY_2: {
      id: 'test-property-2',
      name: 'Test Property 2', 
      address: '456 Test Avenue',
      city: 'Test City',
      state: 'TX',
      zipCode: '12346'
    }
  },
  UNITS: {
    UNIT_1: {
      id: 'test-unit-1',
      name: 'Unit A',
      bedrooms: 3,
      bathrooms: 2,
      monthlyRent: 2000
    },
    UNIT_2: {
      id: 'test-unit-2',
      name: 'Unit B',
      bedrooms: 2,
      bathrooms: 1, 
      monthlyRent: 1500
    }
  },
  TENANTS: {
    TENANT_1: {
      id: 'test-tenant-1',
      firstName: 'Jane',
      lastName: 'Tenant',
      email: 'tenant@test.com',
      phone: '+1234567891'
    },
    TENANT_2: {
      id: 'test-tenant-2',
      firstName: 'Bob',
      lastName: 'Tenant', 
      email: 'tenant2@test.com',
      phone: '+1234567892'
    }
  },
  LEASES: {
    LEASE_1: {
      id: 'test-lease-1',
      monthlyRent: 2000,
      securityDeposit: 2000,
      status: 'ACTIVE'
    }
  }
} as const