/**
 * Property test fixtures for TanStack Query tests
 * Provides consistent test data for property CRUD operations and optimistic updates
 */

import type { Database } from '@repo/shared'

type Property = Database['public']['Tables']['Property']['Row']
type InsertProperty = Database['public']['Tables']['Property']['Insert']
type PropertyType = Database['public']['Enums']['PropertyType']
type PropertyStatus = Database['public']['Enums']['PropertyStatus']

export interface TestProperty extends Omit<Property, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Base property data for creating test properties
 */
export const basePropertyData: InsertProperty = {
  name: 'Test Property',
  address: '123 Test St',
  city: 'Test City',
  state: 'TS',
  zipCode: '12345',
  ownerId: 'test-owner-id',
  propertyType: 'APARTMENT' as PropertyType
}

/**
 * Generate a unique property for testing with optional overrides
 */
export function createTestProperty(overrides: Partial<TestProperty> = {}): TestProperty {
  const timestamp = Date.now()
  const id = `test-property-${timestamp}`
  
  return {
    ...basePropertyData,
    id,
    name: `Test Property ${timestamp}`,
    address: `${123 + Math.floor(Math.random() * 999)} Test Ave`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

/**
 * Generate multiple test properties for infinite scroll testing
 */
export function createTestProperties(count: number): TestProperty[] {
  return Array.from({ length: count }, (_, index) => 
    createTestProperty({
      name: `Test Property ${index + 1}`,
      address: `${123 + index} Test Street`,
    })
  )
}

/**
 * Property types for testing different scenarios
 */
export const propertyTypes: PropertyType[] = [
  'APARTMENT',
  'MULTI_UNIT', 
  'SINGLE_FAMILY',
  'TOWNHOUSE',
  'CONDO'
]

/**
 * Property statuses for testing filters
 */
export const propertyStatuses: PropertyStatus[] = [
  'ACTIVE',
  'UNDER_CONTRACT',
  'SOLD'
]

/**
 * Large dataset for infinite scroll testing (simulates 100+ properties)
 */
export function createLargePropertyDataset(pageSize: number = 20, totalPages: number = 5): TestProperty[][] {
  const pages: TestProperty[][] = []
  
  for (let page = 0; page < totalPages; page++) {
    const pageData = Array.from({ length: pageSize }, (_, index) => {
      const globalIndex = page * pageSize + index + 1
      return createTestProperty({
        name: `Property ${globalIndex.toString().padStart(3, '0')}`,
        address: `${1000 + globalIndex} Main Street`,
        propertyType: propertyTypes[globalIndex % propertyTypes.length]
      })
    })
    pages.push(pageData)
  }
  
  return pages
}

/**
 * Properties with validation errors for error testing
 */
export const invalidPropertyData: Partial<InsertProperty>[] = [
  { name: '', address: '123 Test St' }, // Empty name
  { name: 'Test', address: '' }, // Empty address
  { name: 'Test', address: '123 Test St', city: '' }, // Empty city
  { name: 'Test', address: '123 Test St', state: '' }, // Empty state
  { name: 'Test', address: '123 Test St', zipCode: '' }, // Empty zip
]

/**
 * Network simulation delays for testing different conditions
 */
export const networkDelays = {
  fast: 100,
  normal: 500,
  slow: 2000,
  timeout: 10000
} as const

/**
 * Mock API responses for different scenarios
 */
export const mockApiResponses = {
  success: (data: any) => ({ data, success: true }),
  error: (message: string = 'API Error') => ({ 
    error: { message, status: 500 },
    success: false 
  }),
  networkError: () => ({ 
    error: { message: 'Network Error', status: 0 },
    success: false 
  }),
  validationError: (field: string) => ({
    error: { message: `Validation failed for ${field}`, status: 422 },
    success: false
  })
} as const
