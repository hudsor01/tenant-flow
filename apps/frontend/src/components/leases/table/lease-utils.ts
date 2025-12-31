import type {
	Lease,
	Tenant,
	Unit,
	Property,
	User
} from '@repo/shared/types/core'

/** Extended user type that may include computed fields from API response */
export interface UserWithExtras extends User {
	name?: string
}

/** Extended tenant type that may include nested user info from API response */
export interface TenantWithUser extends Tenant {
	user?: UserWithExtras
	User?: UserWithExtras
	name?: string
	first_name?: string | null
	last_name?: string | null
}

/** Extended unit type that includes property relation */
export interface UnitWithProperty extends Unit {
	property?: Property
}

/** Lease type with relations as returned by the API */
export interface LeaseWithNestedRelations extends Lease {
	tenant?: TenantWithUser
	unit?: UnitWithProperty
}

export type SortField =
	| 'tenant'
	| 'property'
	| 'startDate'
	| 'endDate'
	| 'rent'
	| 'status'

export type SortDirection = 'asc' | 'desc'

export interface LeaseDisplay {
	id: string
	tenantName: string
	propertyName: string
	unitNumber: string
	status: string
	startDate: string
	endDate: string
	rentAmount: number
	original: Lease
}

export function formatDate(dateString: string | null): string {
	if (!dateString) return 'N/A'
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	})
}

export function getStatusConfig(
	status: string
): { className: string; label: string } {
	const config: Record<string, { className: string; label: string }> = {
		draft: {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Draft'
		},
		pending_signature: {
			className:
				'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
			label: 'Pending'
		},
		active: {
			className:
				'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
			label: 'Active'
		},
		ended: {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Ended'
		},
		terminated: {
			className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
			label: 'Terminated'
		},
		expiring: {
			className:
				'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
			label: 'Expiring'
		}
	}

	return (
		config[status] ?? {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Draft'
		}
	)
}

export function transformLease(
	lease: LeaseWithNestedRelations
): LeaseDisplay {
	const tenant = lease.tenant
	const unit = lease.unit

	const tenantUser = tenant?.user ?? tenant?.User
	const tenantName =
		tenant?.name ||
		(tenant?.first_name || tenant?.last_name
			? `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
			: null) ||
		tenantUser?.full_name ||
		tenantUser?.name ||
		(tenantUser?.first_name || tenantUser?.last_name
			? `${tenantUser?.first_name ?? ''} ${tenantUser?.last_name ?? ''}`.trim()
			: null) ||
		'Unassigned'

	const endDate = lease.end_date ? new Date(lease.end_date) : null
	const now = new Date()
	const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
	const isExpiring =
		endDate &&
		endDate <= thirtyDaysFromNow &&
		endDate > now &&
		lease.lease_status === 'active'

	return {
		id: lease.id,
		tenantName,
		propertyName:
			unit?.property?.name || unit?.property?.address_line1 || 'No Property',
		unitNumber: unit?.unit_number || 'N/A',
		status: isExpiring ? 'expiring' : lease.lease_status,
		startDate: lease.start_date || '',
		endDate: lease.end_date || '',
		rentAmount: lease.rent_amount || 0,
		original: lease
	}
}
