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
	const first_name = faker.person.firstName()
	const last_name = faker.person.lastName()

	return {
		first_name,
		last_name,
		email: faker.internet
			.email({
				first_name: first_name.toLowerCase(),
				last_name: last_name.toLowerCase()
			})
			.toLowerCase(),
		phone: faker.phone.number(),
		emergency_contact: `${faker.person.fullName()} - ${faker.phone.number()}`,
		avatarUrl: null,
		user_id: null,
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
		postal_code: faker.location.postal_code('#####'),
		property_type: faker.helpers.arrayElement([
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
	const start_date = faker.date.soon({ days: 30 })
	const end_date = new Date(start_date)
	end_date.setFullYear(end_date.getFullYear() + 1) // 1 year lease

	return {
		tenant_id: '', // Must be provided
		property_id: '', // Must be provided
		unit_id: '', // Must be provided
		start_date: start_date.toISOString(),
		end_date: end_date.toISOString(),
		rent_amount: faker.number.int({ min: 800, max: 3000 }),
		security_deposit: faker.number.int({ min: 800, max: 3000 }),
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
			emergency_contact: 'Emergency Contact - (555) 911-0000'
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
			property_type: 'apartment'
		}),

	/**
	 * Large apartment complex
	 */
	largeProperty: (): PropertyInput =>
		createProperty({
			name: 'Downtown Tower',
			units: 120,
			property_type: 'apartment'
		}),

	/**
	 * Single family home
	 */
	singleFamily: (): PropertyInput =>
		createProperty({
			name: faker.location.streetAddress(),
			units: 1,
			property_type: 'house'
		}),

	/**
	 * Standard 1-year lease
	 */
	standardLease: (
		tenant_id: string,
		property_id: string,
		unit_id: string
	): LeaseInput =>
		createLease({
			tenant_id,
			property_id,
			unit_id,
			rent_amount: 1500,
			security_deposit: 1500,
			status: 'active'
		}),

	/**
	 * Month-to-month lease
	 */
	monthToMonth: (
		tenant_id: string,
		property_id: string,
		unit_id: string
	): LeaseInput => {
		const start_date = new Date()
		const end_date = new Date(start_date)
		end_date.setMonth(end_date.getMonth() + 1)

		return createLease({
			tenant_id,
			property_id,
			unit_id,
			start_date: start_date.toISOString(),
			end_date: end_date.toISOString(),
			rent_amount: 1200,
			security_deposit: 600,
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
			rent_amount: 1500,
			security_deposit: 1500
		},
		renewalTerms: {
			rent_amount: 1550, // 3.3% increase
			security_deposit: 1500
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
