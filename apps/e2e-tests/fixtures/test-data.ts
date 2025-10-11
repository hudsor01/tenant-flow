/**
 * Test Data Fixtures and Factories
 * Official Playwright pattern for reusable test data
 * Based on: https://playwright.dev/docs/test-fixtures
 *
 * Factories create realistic test data with sensible defaults
 * while allowing per-test customization.
 */

import { faker } from '@faker-js/faker'
import type { LeaseInput, PropertyInput, TenantInput } from '@repo/shared'

/**
 * Tenant Factory
 * Creates realistic tenant data with unique identifiers
 */
export const createTenant = (overrides?: Partial<TenantInput>): TenantInput => {
	const firstName = faker.person.firstName()
	const lastName = faker.person.lastName()

	return {
		firstName,
		lastName,
		email: faker.internet
			.email({
				firstName: firstName.toLowerCase(),
				lastName: lastName.toLowerCase()
			})
			.toLowerCase(),
		phone: faker.phone.number(),
		emergencyContact: `${faker.person.fullName()} - ${faker.phone.number()}`,
		avatarUrl: null,
		userId: null,
		...overrides
	}
}

/**
 * Property Factory
 * Creates realistic property data
 */
export const createProperty = (
	overrides?: Partial<PropertyInput>
): PropertyInput => {
	return {
		name: `${faker.location.streetAddress()} Apartments`,
		address: faker.location.streetAddress(),
		city: faker.location.city(),
		state: faker.location.state({ abbreviated: true }),
		zipCode: faker.location.zipCode('#####'),
		propertyType: faker.helpers.arrayElement([
			'apartment',
			'house',
			'condo',
			'townhouse'
		]),
		units: faker.number.int({ min: 4, max: 24 }),
		description: faker.lorem.paragraph(),
		yearBuilt: faker.number.int({ min: 1950, max: 2024 }),
		...overrides
	}
}

/**
 * Lease Factory
 * Creates realistic lease agreements
 */
export const createLease = (overrides?: Partial<LeaseInput>): LeaseInput => {
	const startDate = faker.date.soon({ days: 30 })
	const endDate = new Date(startDate)
	endDate.setFullYear(endDate.getFullYear() + 1) // 1 year lease

	return {
		tenantId: '', // Must be provided
		propertyId: '', // Must be provided
		unitId: '', // Must be provided
		startDate: startDate.toISOString(),
		endDate: endDate.toISOString(),
		monthlyRent: faker.number.int({ min: 800, max: 3000 }),
		securityDeposit: faker.number.int({ min: 800, max: 3000 }),
		status: 'active',
		...overrides
	}
}

/**
 * Unique Test Identifiers
 * Helps avoid conflicts when tests run in parallel
 */
export const generateTestId = (prefix: string = 'test'): string => {
	return `${prefix}-${Date.now()}-${faker.string.alphanumeric(6)}`
}

/**
 * Test Email Generator
 * Creates emails that can be traced back to tests
 */
export const generateTestEmail = (username?: string): string => {
	const user = username || faker.internet.username().toLowerCase()
	const timestamp = Date.now()
	return `test-${user}-${timestamp}@tenantflow.test`
}

/**
 * Preset Test Data
 * Common test scenarios with realistic data
 */
export const presets = {
	/**
	 * New tenant moving in next month
	 */
	newTenant: (): TenantInput =>
		createTenant({
			email: generateTestEmail('new-tenant'),
			emergencyContact: 'Emergency Contact - (555) 911-0000'
		}),

	/**
	 * Tenant with existing lease
	 */
	activeTenant: (): TenantInput =>
		createTenant({
			email: generateTestEmail('active-tenant')
		}),

	/**
	 * Tenant moving out
	 */
	leavingTenant: (): TenantInput =>
		createTenant({
			email: generateTestEmail('leaving-tenant')
		}),

	/**
	 * Small apartment complex
	 */
	smallProperty: (): PropertyInput =>
		createProperty({
			name: 'Parkview Apartments',
			units: 8,
			propertyType: 'apartment'
		}),

	/**
	 * Large apartment complex
	 */
	largeProperty: (): PropertyInput =>
		createProperty({
			name: 'Downtown Tower',
			units: 120,
			propertyType: 'apartment'
		}),

	/**
	 * Single family home
	 */
	singleFamily: (): PropertyInput =>
		createProperty({
			name: faker.location.streetAddress(),
			units: 1,
			propertyType: 'house'
		}),

	/**
	 * Standard 1-year lease
	 */
	standardLease: (
		tenantId: string,
		propertyId: string,
		unitId: string
	): LeaseInput =>
		createLease({
			tenantId,
			propertyId,
			unitId,
			monthlyRent: 1500,
			securityDeposit: 1500,
			status: 'active'
		}),

	/**
	 * Month-to-month lease
	 */
	monthToMonth: (
		tenantId: string,
		propertyId: string,
		unitId: string
	): LeaseInput => {
		const startDate = new Date()
		const endDate = new Date(startDate)
		endDate.setMonth(endDate.getMonth() + 1)

		return createLease({
			tenantId,
			propertyId,
			unitId,
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
			monthlyRent: 1200,
			securityDeposit: 600,
			status: 'active'
		})
	}
}

/**
 * Batch Data Creation
 * Create multiple test entities at once
 */
export const batch = {
	tenants: (count: number, overrides?: Partial<TenantInput>): TenantInput[] =>
		Array.from({ length: count }, () => createTenant(overrides)),

	properties: (
		count: number,
		overrides?: Partial<PropertyInput>
	): PropertyInput[] =>
		Array.from({ length: count }, () => createProperty(overrides))
}

/**
 * Realistic Test Scenarios
 * Common user stories with full data setup
 */
export const scenarios = {
	/**
	 * New tenant application workflow
	 */
	newApplication: () => ({
		tenant: presets.newTenant(),
		property: presets.smallProperty(),
		moveInDate: faker.date.soon({ days: 30 }).toISOString()
	}),

	/**
	 * Lease renewal workflow
	 */
	leaseRenewal: () => ({
		tenant: presets.activeTenant(),
		property: presets.smallProperty(),
		currentLease: {
			monthlyRent: 1500,
			securityDeposit: 1500
		},
		renewalTerms: {
			monthlyRent: 1550, // 3.3% increase
			securityDeposit: 1500
		}
	}),

	/**
	 * Multi-tenant property setup
	 */
	propertyWithTenants: (tenantCount: number = 5) => ({
		property: presets.largeProperty(),
		tenants: batch.tenants(tenantCount)
	})
}
