/**
 * Property Test Data Fixtures
 * Provides property-specific test data factories for TanStack Query E2E tests
 *
 * Note: This file complements test-data.ts with property-specific utilities
 * needed by the TanStack Query cache/error/optimistic update tests.
 */

import { faker } from '@faker-js/faker'

export interface TestProperty {
	id: string
	name: string
	address: string
	city: string
	state: string
	postal_code: string
	property_type: string
	units: number
	description?: string
	yearBuilt?: number
	created_at: string
	updated_at: string
}

/**
 * Base property data with sensible defaults
 */
export const basePropertyData: Omit<TestProperty, 'id' | 'created_at' | 'updated_at'> = {
	name: 'Test Property',
	address: '123 Test Street',
	city: 'Test City',
	state: 'CA',
	postal_code: '90210',
	property_type: 'apartment',
	units: 10,
	description: 'A test property for E2E testing'
}

/**
 * Network delay constants for testing loading states
 */
export const networkDelays = {
	fast: 100,
	normal: 500,
	slow: 2000,
	timeout: 30000
} as const

/**
 * Create a single test property with optional overrides
 */
export function createTestProperty(overrides?: Partial<Omit<TestProperty, 'id' | 'created_at' | 'updated_at'>>): TestProperty {
	const now = new Date().toISOString()

	return {
		id: faker.string.uuid(),
		...basePropertyData,
		name: overrides?.name ?? `${faker.location.streetAddress()} Apartments`,
		address: overrides?.address ?? faker.location.streetAddress(),
		city: overrides?.city ?? faker.location.city(),
		state: overrides?.state ?? faker.location.state({ abbreviated: true }),
		postal_code: overrides?.postal_code ?? faker.location.zipCode('#####'),
		property_type: overrides?.property_type ?? faker.helpers.arrayElement(['apartment', 'house', 'condo', 'townhouse']),
		units: overrides?.units ?? faker.number.int({ min: 4, max: 24 }),
		description: overrides?.description ?? faker.lorem.paragraph(),
		yearBuilt: overrides?.yearBuilt ?? faker.number.int({ min: 1950, max: 2024 }),
		created_at: now,
		updated_at: now,
		...overrides
	}
}

/**
 * Create multiple test properties
 */
export function createTestProperties(count: number, overrides?: Partial<Omit<TestProperty, 'id' | 'created_at' | 'updated_at'>>): TestProperty[] {
	return Array.from({ length: count }, (_, index) =>
		createTestProperty({
			name: `Test Property ${index + 1}`,
			...overrides
		})
	)
}

/**
 * Create a large dataset for infinite scrolling tests
 * Generates properties in batches to simulate paginated data
 */
export function createLargePropertyDataset(totalCount: number, pageSize: number = 20): TestProperty[][] {
	const pages: TestProperty[][] = []
	const pageCount = Math.ceil(totalCount / pageSize)

	for (let page = 0; page < pageCount; page++) {
		const itemsInPage = Math.min(pageSize, totalCount - page * pageSize)
		pages.push(
			createTestProperties(itemsInPage, {
				name: `Page ${page + 1} Property`
			}).map((prop, idx) => ({
				...prop,
				name: `Property ${page * pageSize + idx + 1}`
			}))
		)
	}

	return pages
}
