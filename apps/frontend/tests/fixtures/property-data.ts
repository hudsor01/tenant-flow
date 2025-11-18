/**
 * Property test fixtures for TanStack Query tests
 * Provides consistent test data for property CRUD operations and optimistic updates
 */

import type {
	Property,
	PropertyInsert,
	PropertyStatus,
	PropertyType
} from '@repo/shared/types/core'

export interface TestProperty extends PropertyInsert {
  id?: string
  created_at?: string
  updated_at?: string
}

/**
 * Base property data for creating test properties - matches actual Supabase schema
 */
export const basePropertyData: PropertyInsert = {
  name: 'Test Property',
  address_line1: '123 Test St',
  address_line2: null,
  city: 'Test City',
  state: 'TS',
  postal_code: '12345',
  country: 'USA',
  property_owner_id: 'test-owner-id',
  property_type: 'APARTMENT',
  status: 'ACTIVE',
  date_sold: null,
  sale_price: null
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
    address_line1: `${123 + Math.floor(Math.random() * 999)} Test Ave`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
      address_line1: `${123 + index} Test Street`,
    })
  )
}

/**
 * Property types for testing different scenarios
 */
export const property_types: PropertyType[] = [
  'APARTMENT',
  'SINGLE_FAMILY',
  'MULTI_UNIT',
  'TOWNHOUSE',
  'CONDO',
  'COMMERCIAL',
  'OTHER'
]

/**
 * Property statuses for testing filters
 */
export const propertyStatuses: PropertyStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'SOLD',
  'UNDER_CONTRACT'
]

/**
 * Large dataset for infinite scroll testing (simulates 100+ properties)
 */
export function createLargePropertyDataset(pageSize: number = 20, totalPages: number = 5): TestProperty[][] {
  const pages: TestProperty[][] = []

  for (let page = 0; page < totalPages; page++) {
    const pageData = Array.from({ length: pageSize }, (_, index) => {
      const globalIndex = page * pageSize + index + 1
      const propertyType =
        property_types[globalIndex % property_types.length] ?? 'APARTMENT'

      return createTestProperty({
        name: `Property ${globalIndex.toString().padStart(3, '0')}`,
        address_line1: `${1000 + globalIndex} Main Street`,
        property_type: propertyType as PropertyType
      })
    })
    pages.push(pageData)
  }

  return pages
}

/**
 * Properties with validation errors for error testing
 */
export const invalidPropertyData: Partial<PropertyInsert>[] = [
  { name: '', address_line1: '123 Test St' }, // Empty name
  { name: 'Test', address_line1: '' }, // Empty address
  { name: 'Test', address_line1: '123 Test St', city: '' }, // Empty city
  { name: 'Test', address_line1: '123 Test St', state: '' }, // Empty state
  { name: 'Test', address_line1: '123 Test St', postal_code: '' }, // Empty zip
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
