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
	userId: 'user-1',
	name: 'John Doe',
	firstName: 'John',
	lastName: 'Doe',
	email: 'john.doe@example.com',
	phone: '(555) 123-4567',
	emergencyContact: 'Jane Doe - (555) 987-6543',
	avatarUrl: null,
	status: 'ACTIVE',
	move_out_date: null,
	move_out_reason: null,
	archived_at: null,
	invitation_status: 'PENDING',
	invitation_token: null,
	invitation_sent_at: null,
	invitation_accepted_at: null,
	invitation_expires_at: null,
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z'
}

/**
 * Default User - Use with spread operator for overrides
 *
 * @example
 * const admin: User = {
 *   ...DEFAULT_USER,
 *   role: 'ADMIN',
 *   email: 'admin@example.com'
 * }
 */
export const DEFAULT_USER: User = {
	id: 'user-1',
	supabaseId: 'supabase-user-1',
	email: 'user@example.com',
	firstName: 'Test',
	lastName: 'User',
	name: 'Test User',
	phone: '(555) 123-4567',
	role: 'OWNER',
	stripeCustomerId: 'cus_test123',
	stripeAccountId: null,
	subscriptionTier: 'GROWTH',
	subscription_status: 'active',
	avatarUrl: null,
	bio: null,
	orgId: null,
	profileComplete: true,
	lastLoginAt: null,
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z'
}

/**
 * Default Property - Use with spread operator for overrides
 *
 * @example
 * const apartment: Property = {
 *   ...DEFAULT_PROPERTY,
 *   propertyType: 'APARTMENT',
 *   units: 50
 * }
 */
export const DEFAULT_PROPERTY: Property = {
	id: 'property-1',
	ownerId: 'user-1',
	name: 'Test Property',
	address: '123 Main St',
	city: 'San Francisco',
	state: 'CA',
	zipCode: '94102',
	propertyType: 'APARTMENT',
	status: 'ACTIVE',
	description: null,
	imageUrl: null,
	date_sold: null,
	sale_price: null,
	sale_notes: null,
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z'
}

/**
 * Default Lease - Use with spread operator for overrides
 *
 * @example
 * const expiredLease: Lease = {
 *   ...DEFAULT_LEASE,
 *   status: 'EXPIRED',
 *   endDate: '2023-12-31'
 * }
 */
export const DEFAULT_LEASE: Lease = {
	id: 'lease-1',
	propertyId: 'property-1',
	unitId: 'unit-1',
	tenantId: 'tenant-1',
	startDate: '2024-01-01',
	endDate: '2024-12-31',
	rentAmount: 1500,
	monthlyRent: 1500,
	securityDeposit: 1500,
	status: 'ACTIVE',
	terms: null,
	gracePeriodDays: null,
	lateFeeAmount: null,
	lateFeePercentage: null,
	createdAt: '2024-01-01T00:00:00Z',
	updatedAt: '2024-01-01T00:00:00Z'
}
