/**
 * Test user constants for E2E testing
 * These correspond to the users created in the seed script
 */
export const TestUser = {
  LANDLORD: {
    id: 'test-landlord-1',
    email: 'landlord@test.com',
    password: 'TestPassword123!',
    name: 'John Landlord',
    role: 'OWNER'
  },
  TENANT_1: {
    id: 'test-tenant-1',
    email: 'tenant@test.com', 
    password: 'TestPassword123!',
    name: 'Jane Tenant',
    role: 'TENANT'
  },
  TENANT_2: {
    id: 'test-tenant-2',
    email: 'tenant2@test.com',
    password: 'TestPassword123!', 
    name: 'Bob Tenant',
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
      unitNumber: 'Unit A',
      bedrooms: 3,
      bathrooms: 2,
      rent: 2000
    },
    UNIT_2: {
      id: 'test-unit-2',
      unitNumber: 'Unit B',
      bedrooms: 2,
      bathrooms: 1, 
      rent: 1500
    }
  },
  TENANTS: {
    TENANT_1: {
      id: 'test-tenant-1',
      name: 'Jane Tenant',
      email: 'tenant@test.com',
      phone: '+1234567891'
    },
    TENANT_2: {
      id: 'test-tenant-2',
      name: 'Bob Tenant', 
      email: 'tenant2@test.com',
      phone: '+1234567892'
    }
  },
  LEASES: {
    LEASE_1: {
      id: 'test-lease-1',
      rentAmount: 2000,
      securityDeposit: 2000,
      status: 'ACTIVE'
    }
  }
} as const