/**
 * Query Result Types
 *
 * Type definitions for Supabase nested query results.
 * These types represent the shape of data returned from complex
 * SELECT queries with relationship joins.
 *
 * Usage: Cast Supabase query results to these types for type safety.
 *
 * @example
 * ```typescript
 * import type { OverduePaymentResult } from '@repo/shared/types/query-results'
 *
 * const { data } = await client.from('rent_payments').select(`...`)
 * const payments = data as OverduePaymentResult[]
 * ```
 */

// ============================================================================
// SHARED NESTED TYPES
// ============================================================================

/** User with only name/contact fields */
export interface UserBasic {
	id: string
	first_name: string | null
	last_name: string | null
	email: string | null
	phone?: string | null
}

/** Property with essential fields */
export interface PropertyBasic {
	id: string
	name: string
}

/** Unit with property relationship */
export interface UnitWithPropertyResult {
	id: string
	unit_number: string | null
	property_id: string
	properties: PropertyBasic | null
}

/** Tenant with user info for payment queries */
export interface TenantForPayment {
	id: string
	user_id: string
	stripe_customer_id: string | null
	users: UserBasic | null
}

// ============================================================================
// PAYMENT ANALYTICS TYPES (payment-analytics.service.ts)
// ============================================================================

/** Lease with tenant info for upcoming payments */
export interface LeaseWithTenantAndUnit {
	id: string
	rent_amount: number | null
	start_date: string | null
	end_date: string | null
	lease_status: string
	primary_tenant_id: string | null
	unit_id: string | null
	units: UnitWithPropertyResult | null
	tenants: TenantForPayment | null
}

/** Payment for overdue list */
export interface OverduePaymentResult {
	id: string
	amount: number
	due_date: string
	late_fee_amount: number | null
	tenant_id: string
	lease_id: string
	tenants: {
		id: string
		user_id: string
		users: UserBasic | null
	} | null
	leases: {
		id: string
		unit_id: string
		units: {
			id: string
			unit_number: string | null
			property_id: string
			properties: { id: string; name: string } | null
		} | null
	} | null
}

/** Payment for CSV export */
export interface PaymentForExport {
	id: string
	amount: number
	status: string
	due_date: string
	paid_date: string | null
	payment_method_type: string | null
	late_fee_amount: number | null
	created_at: string | null
	tenant_id: string
	lease_id: string
	tenants: {
		users: {
			first_name: string | null
			last_name: string | null
			email: string | null
		} | null
	} | null
	leases: {
		units: {
			unit_number: string | null
			properties: { name: string } | null
		} | null
	} | null
}

// ============================================================================
// TENANT QUERY TYPES (tenant-lease-query.service.ts)
// ============================================================================

/** Tenant invitation with tenant data */
export interface InvitationWithTenant {
	accepted_by_user_id: string
	tenant: {
		id: string
		user_id: string
		emergency_contact_name: string | null
		emergency_contact_phone: string | null
		emergency_contact_relationship: string | null
		identity_verified: boolean | null
		created_at: string | null
		updated_at: string | null
		lease_tenants: Array<{
			tenant_id: string
			lease: {
				id: string
				lease_status: string
			} | null
		}> | null
	} | null
}

/** Extended lease with unit details for tenant queries */
export interface LeaseWithUnitDetails {
	id: string
	start_date: string
	end_date: string
	lease_status: string
	rent_amount: number
	security_deposit: number
	unit: {
		id: string
		unit_number: string
		bedrooms: number
		bathrooms: number
		square_feet: number
		property: {
			id: string
			name: string
			address_line1: string
			address_line2: string | null
			city: string
			state: string
			postal_code: string
			owner_user_id: string
		} | null
	} | null
}

/** Tenant with user info for lease queries */
export interface TenantWithUserDetails {
	id: string
	user_id: string
	emergency_contact_name: string | null
	emergency_contact_phone: string | null
	emergency_contact_relationship: string | null
	identity_verified: boolean | null
	created_at: string | null
	updated_at: string | null
	user: {
		first_name: string | null
		last_name: string | null
		email: string | null
		phone: string | null
	} | null
}

/** Result from lease_tenants join query */
export interface LeaseTenantQueryResult {
	tenant_id: string
	lease_id: string
	tenant: TenantWithUserDetails | null
	lease: LeaseWithUnitDetails | null
}
