/**
 * Test Data - Native Object Literals
 * Simple default test objects using native TypeScript.
 * NO FACTORIES, NO BUILDERS - Just plain objects you can spread/override.
 *
 * Following ULTRA-NATIVE principles from CLAUDE.md:
 * - No factories, builders, or custom abstractions
 * - Use native TypeScript Partial<T> for overrides
 * - Direct object creation with spread operators
 */

import type { Lease, Property, Tenant, User } from '@repo/shared/types/core'

/**
 * Default Tenant - Use with spread operator for overrides
 *
 * @example
 * // Use as-is
 * const tenant = DEFAULT_TENANT
 *
 * @example
 * // Override specific fields with native spread
 * const customTenant: Tenant = {
 *   ...DEFAULT_TENANT,
 *   name: 'Jane Doe',
 *   email: 'jane@example.com'
 * }
 */
export const DEFAULT_TENANT: Tenant = {
	id: 'tenant-1',
	user_id: 'user-1',
	date_of_birth: null,
	emergency_contact_name: null,
	emergency_contact_phone: null,
	emergency_contact_relationship: null,
	identity_verified: null,
	ssn_last_four: null,
	stripe_customer_id: 'cus_test_tenant',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
}

/**
 * Default User - Use with spread operator for overrides
 *
 * @example
 * const admin: User = {
 *   ...DEFAULT_USER,
 *   user_type: 'ADMIN',
 *   email: 'admin@example.com'
 * }
 */
export const DEFAULT_USER: User = {
	id: 'user-1',
	email: 'user@example.com',
	full_name: 'Test User',
	first_name: 'Test',
	last_name: 'User',
	phone: '(555) 123-4567',
	user_type: 'OWNER',
	stripe_customer_id: 'cus_test123',
	status: 'active',
	avatar_url: null,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	identity_verified_at: null,
	identity_verification_status: null,
	identity_verification_session_id: null,
	identity_verification_data: null,
	identity_verification_error: null,
	connected_account_id: null,
	onboarding_completed_at: null,
	onboarding_status: 'not_started'
}

/**
 * Default Property - Use with spread operator for overrides
 *
 * @example
 * const apartment: Property = {
 *   ...DEFAULT_PROPERTY,
 *   property_type: 'APARTMENT',
 *   units: 50
 * }
 */
export const DEFAULT_PROPERTY: Property = {
	id: 'property-1',
	property_owner_id: 'user-1',
	name: 'Test Property',
	address_line1: '123 Main St',
	address_line2: null,
	city: 'San Francisco',
	state: 'CA',
	postal_code: '94102',
	country: 'USA',
	property_type: 'APARTMENT',
	status: 'ACTIVE',
	date_sold: null,
	sale_price: null,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
}

/**
 * Default Lease - Use with spread operator for overrides
 *
 * @example
 * const expiredLease: Lease = {
 *   ...DEFAULT_LEASE,
 *   status: 'EXPIRED',
 *   end_date: '2023-12-31'
 * }
 */
export const DEFAULT_LEASE: Lease = {
	id: 'lease-1',
	unit_id: 'unit-1',
	primary_tenant_id: 'tenant-1',
	property_owner_id: 'user-1',
	start_date: '2024-01-01',
	end_date: '2024-12-31',
	rent_amount: 1500,
	rent_currency: 'USD',
	security_deposit: 1500,
	lease_status: 'ACTIVE',
	payment_day: 1,
	stripe_subscription_id: null,
	auto_pay_enabled: null,
	grace_period_days: null,
	late_fee_amount: null,
	late_fee_days: null,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
}

/**
 * Default Unit - Use with spread operator for overrides
 *
 * @example
 * const unit: Unit = {
 *   ...DEFAULT_UNIT,
 *   name: 'Apt 2B',
 *   status: 'OCCUPIED'
 * }
 */
export const DEFAULT_UNIT = {
	id: 'unit-1',
	property_id: 'property-1',
	name: 'Apt 101',
	bedrooms: 2,
	bathrooms: 1,
	square_feet: 850,
	status: 'AVAILABLE' as const,
	rent_amount: 1500,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
}

/**
 * Default Maintenance Request - Use with spread operator for overrides
 *
 * @example
 * const urgentRequest = {
 *   ...DEFAULT_MAINTENANCE_REQUEST,
 *   priority: 'URGENT',
 *   status: 'IN_PROGRESS'
 * }
 */
export const DEFAULT_MAINTENANCE_REQUEST = {
	id: 'maintenance-1',
	description: 'Kitchen faucet has been dripping for the past week',
	status: 'OPEN' as const,
	priority: 'MEDIUM' as const,
	category: 'PLUMBING' as const,
	unit_id: 'unit-1',
	tenant_id: 'tenant-1',
	property_owner_id: 'user-1',
	requested_by: 'user-1',
	assigned_to: null,
	estimated_cost: 150,
	actual_cost: null,
	scheduled_date: null,
	completed_at: null,
	inspector_id: null,
	inspection_date: null,
	inspection_findings: null,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	property: {
		name: 'Test Property'
	},
	unit: {
		name: 'Apt 101'
	},
	assignedTo: null
}
