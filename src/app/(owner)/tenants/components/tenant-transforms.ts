import type { TenantWithLeaseInfo } from '#types/core'
import type { LeaseStatus } from '#types/core'
import type {
	TenantItem,
	TenantSectionDetail
} from '#types/sections/tenants'

type TenantPaymentStatus = NonNullable<
	TenantSectionDetail['paymentHistory']
>[number]['status']

export function normalizePaymentStatus(
	status: string | null | undefined
): TenantPaymentStatus {
	const normalized = status?.toLowerCase()
	if (
		normalized === 'pending' ||
		normalized === 'processing' ||
		normalized === 'succeeded' ||
		normalized === 'failed' ||
		normalized === 'cancelled'
	) {
		return normalized
	}
	return 'processing'
}

/**
 * Transform API tenant data to design-os TenantItem format
 */
export function transformToTenantItem(
	tenant: TenantWithLeaseInfo,
	totalPaidByTenant?: Map<string, number>
): TenantItem {
	const displayName =
		tenant.name ||
		(tenant.first_name && tenant.last_name
			? `${tenant.first_name} ${tenant.last_name}`.trim()
			: tenant.first_name || tenant.last_name || 'Unknown')

	// Map API status to design-os LeaseStatus
	let leaseStatus: LeaseStatus | undefined
	if (tenant.lease_status) {
		const status = String(tenant.lease_status).toLowerCase()
		if (status === 'active') leaseStatus = 'active'
		else if (status === 'pending' || status === 'pending_signature')
			leaseStatus = 'pending_signature'
		else if (status === 'expired' || status === 'ended') leaseStatus = 'ended'
		else if (status === 'terminated') leaseStatus = 'terminated'
		else if (status === 'draft') leaseStatus = 'draft'
	}

	return {
		id: tenant.id,
		fullName: displayName,
		email: tenant.email ?? '',
		...(tenant.phone ? { phone: tenant.phone } : {}),
		...(tenant.property?.name ? { currentProperty: tenant.property.name } : {}),
		...(tenant.unit?.unit_number
			? { currentUnit: tenant.unit.unit_number }
			: {}),
		...(leaseStatus ? { leaseStatus } : {}),
		...(tenant.currentLease?.id ? { leaseId: tenant.currentLease.id } : {}),
		totalPaid: totalPaidByTenant?.get(tenant.id) ?? 0
	}
}

/**
 * Transform API tenant to design-os TenantSectionDetail format
 */
export function transformToTenantSectionDetail(
	tenant: TenantWithLeaseInfo,
	totalPaidByTenant?: Map<string, number>,
	paymentHistory?: TenantSectionDetail['paymentHistory']
): TenantSectionDetail {
	const base = transformToTenantItem(tenant, totalPaidByTenant)

	return {
		...base,
		...(tenant.emergency_contact_name
			? { emergencyContactName: tenant.emergency_contact_name }
			: {}),
		...(tenant.emergency_contact_phone
			? { emergencyContactPhone: tenant.emergency_contact_phone }
			: {}),
		...(tenant.emergency_contact_relationship
			? { emergencyContactRelationship: tenant.emergency_contact_relationship }
			: {}),
		identityVerified: tenant.identity_verified ?? false,
		createdAt: tenant.created_at ?? new Date().toISOString(),
		updatedAt: tenant.updated_at ?? new Date().toISOString(),
		...(paymentHistory ? { paymentHistory } : {}),
		...(tenant.currentLease
			? {
					currentLease: {
						id: tenant.currentLease.id,
						propertyName: tenant.property?.name ?? '',
						unitNumber: tenant.unit?.unit_number ?? '',
						startDate: tenant.currentLease.start_date,
						endDate: tenant.currentLease.end_date,
						rentAmount: (tenant.currentLease.rent_amount ?? 0) * 100, // Convert to cents
						autopayEnabled: tenant.currentLease.auto_pay_enabled ?? false
					}
				}
			: {})
	}
}
