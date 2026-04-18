/**
 * Tenant Row Mapper
 * Maps raw PostgREST tenant rows (with user and lease_tenants joins)
 * to the TenantWithLeaseInfo shape expected by the frontend.
 *
 * Extracted from tenant-keys.ts for maintainability.
 */

import type { TenantWithLeaseInfo } from '#types/core'

export interface TenantPostgrestRow {
	id: string
	user_id: string | null
	owner_user_id: string | null
	first_name: string | null
	last_name: string | null
	name: string | null
	email: string | null
	phone: string | null
	status: string | null
	created_at: string | null
	updated_at: string | null
	date_of_birth: string | null
	emergency_contact_name: string | null
	emergency_contact_phone: string | null
	emergency_contact_relationship: string | null
	identity_verified: boolean | null
	ssn_last_four: string | null
	users?: {
		id: string
		email: string
		first_name: string | null
		last_name: string | null
		full_name: string
		phone: string | null
		status: string
	} | null
	lease_tenants?: Array<{
		lease_id: string
		is_primary: boolean | null
		leases: {
			id: string
			lease_status: string
			start_date: string
			end_date: string
			rent_amount: number
			security_deposit: number
			unit_id: string
			primary_tenant_id: string
			owner_user_id: string
			units: {
				id: string
				unit_number: string | null
				bedrooms: number | null
				bathrooms: number | null
				square_feet: number | null
				rent_amount: number
				property_id: string
				properties: {
					id: string
					name: string
					address_line1: string
					address_line2: string | null
					city: string
					state: string
					postal_code: string
				} | null
			} | null
		} | null
	}>
}

export function mapTenantRow(row: TenantPostgrestRow): TenantWithLeaseInfo {
	const user = row.users ?? null
	const leaseRows = row.lease_tenants ?? []

	// Find the primary/active lease (prefer active, fallback to first)
	const primaryLeaseTenant =
		leaseRows.find(lt => lt.is_primary) ?? leaseRows[0]
	const activeLease = primaryLeaseTenant?.leases ?? null
	const activeUnit = activeLease?.units ?? null
	const activeProperty = activeUnit?.properties ?? null

	// Prefer tenant's own contact fields; fall back to linked user's fields
	// (landlord-managed tenants have no user_id, so user will be null).
	const displayFirstName = row.first_name ?? user?.first_name ?? null
	const displayLastName = row.last_name ?? user?.last_name ?? null
	const displayPhone = row.phone ?? user?.phone ?? null
	const displayEmail = row.email ?? user?.email ?? null
	const displayName =
		row.name ??
		user?.full_name ??
		(displayFirstName || displayLastName
			? `${displayFirstName ?? ''} ${displayLastName ?? ''}`.trim()
			: null)

	// Build base fields (required fields only, no optional undefined assignments)
	const base = {
		id: row.id,
		user_id: row.user_id,
		owner_user_id: row.owner_user_id,
		status: row.status ?? 'active',
		created_at: row.created_at,
		updated_at: row.updated_at,
		date_of_birth: row.date_of_birth,
		emergency_contact_name: row.emergency_contact_name,
		emergency_contact_phone: row.emergency_contact_phone,
		emergency_contact_relationship: row.emergency_contact_relationship,
		identity_verified: row.identity_verified,
		ssn_last_four: row.ssn_last_four,
		phone: displayPhone,
		first_name: displayFirstName,
		last_name: displayLastName,
		currentLease: activeLease
			? {
					id: activeLease.id,
					start_date: activeLease.start_date,
					end_date: activeLease.end_date,
					rent_amount: activeLease.rent_amount,
					security_deposit: activeLease.security_deposit,
					status: activeLease.lease_status,
					primary_tenant_id: activeLease.primary_tenant_id,
					unit_id: activeLease.unit_id
				}
			: null,
		leases: leaseRows
			.filter(lt => lt.leases !== null)
			.map(lt => {
				const leaseProperty = lt.leases!.units?.properties
				return {
					id: lt.leases!.id,
					start_date: lt.leases!.start_date,
					end_date: lt.leases!.end_date as string | null,
					rent_amount: lt.leases!.rent_amount,
					status: lt.leases!.lease_status,
					...(leaseProperty
						? {
								property: {
									address_line1: leaseProperty.address_line1
								}
							}
						: {})
				}
			}),
		unit: activeUnit
			? {
					id: activeUnit.id,
					unit_number: activeUnit.unit_number,
					bedrooms: activeUnit.bedrooms,
					bathrooms: activeUnit.bathrooms,
					square_feet: activeUnit.square_feet,
					rent_amount: activeUnit.rent_amount
				}
			: null,
		property: activeProperty
			? {
					id: activeProperty.id,
					name: activeProperty.name,
					address_line1: activeProperty.address_line1,
					address_line2: activeProperty.address_line2 ?? null,
					city: activeProperty.city,
					state: activeProperty.state,
					postal_code: activeProperty.postal_code
				}
			: null
	}

	// Always include name/email as nullable, per TenantWithLeaseInfo shape.
	return {
		...base,
		name: displayName,
		email: displayEmail,
		...(activeLease ? { monthlyRent: activeLease.rent_amount } : {}),
		...(activeLease ? { lease_status: activeLease.lease_status } : {}),
		...(activeUnit?.unit_number
			? { unitDisplay: activeUnit.unit_number }
			: {}),
		...(activeProperty ? { propertyDisplay: activeProperty.name } : {})
	} as TenantWithLeaseInfo
}
