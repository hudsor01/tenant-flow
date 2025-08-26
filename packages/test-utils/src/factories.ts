/**
 * Test data factories
 */

// Mock user factory
export const createMockUser = (overrides = {}) => ({
  id: 'user_test123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User'
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

// Mock property factory
export const createMockProperty = (overrides = {}) => ({
  id: 'prop_test123',
  name: 'Test Property',
  address: '123 Test St',
  city: 'Test City',
  state: 'TS',
  zipCode: '12345',
  propertyType: 'apartment' as const,
  bedrooms: 2,
  bathrooms: 1.5,
  squareFootage: 1200,
  rent: 2500,
  deposit: 2500,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
})

// Mock tenant factory
export const createMockTenant = (overrides = {}) => ({
  id: 'tenant_test123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '555-0123',
  dateOfBirth: '1990-01-01',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
})