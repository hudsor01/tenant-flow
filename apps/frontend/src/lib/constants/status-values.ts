/**
 * Status value constants for consistent type-safe status handling
 * Maps to database enum values
 */

export const PROPERTY_STATUS = {
	ACTIVE: 'ACTIVE',
	INACTIVE: 'INACTIVE'
} as const

export const LEASE_STATUS = {
	ACTIVE: 'ACTIVE',
	DRAFT: 'DRAFT',
	EXPIRED: 'EXPIRED',
	TERMINATED: 'TERMINATED'
} as const

export const UNIT_STATUS = {
	VACANT: 'VACANT',
	OCCUPIED: 'OCCUPIED',
	MAINTENANCE: 'MAINTENANCE',
	RESERVED: 'RESERVED'
} as const

export const MAINTENANCE_STATUS = {
	PENDING: 'PENDING',
	IN_PROGRESS: 'IN_PROGRESS',
	COMPLETED: 'COMPLETED',
	CANCELLED: 'CANCELLED'
} as const

export const TENANT_STATUS = {
	ACTIVE: 'ACTIVE',
	INACTIVE: 'INACTIVE',
	PENDING: 'PENDING'
} as const

/**
 * Display labels for status values
 */
export const PROPERTY_STATUS_LABELS: Record<
	keyof typeof PROPERTY_STATUS,
	string
> = {
	ACTIVE: 'Active',
	INACTIVE: 'Inactive'
}

export const LEASE_STATUS_LABELS: Record<keyof typeof LEASE_STATUS, string> = {
	ACTIVE: 'Active',
	DRAFT: 'Draft',
	EXPIRED: 'Expired',
	TERMINATED: 'Terminated'
}

export const UNIT_STATUS_LABELS: Record<keyof typeof UNIT_STATUS, string> = {
	VACANT: 'Vacant',
	OCCUPIED: 'Occupied',
	MAINTENANCE: 'Maintenance',
	RESERVED: 'Reserved'
}

export const MAINTENANCE_STATUS_LABELS: Record<
	keyof typeof MAINTENANCE_STATUS,
	string
> = {
	PENDING: 'Pending',
	IN_PROGRESS: 'In Progress',
	COMPLETED: 'Completed',
	CANCELLED: 'Cancelled'
}

export const TENANT_STATUS_LABELS: Record<
	keyof typeof TENANT_STATUS,
	string
> = {
	ACTIVE: 'Active',
	INACTIVE: 'Inactive',
	PENDING: 'Pending'
}

export const MAINTENANCE_CATEGORY = {
	GENERAL: 'GENERAL',
	PLUMBING: 'PLUMBING',
	ELECTRICAL: 'ELECTRICAL',
	HVAC: 'HVAC',
	APPLIANCES: 'APPLIANCES',
	SAFETY: 'SAFETY',
	OTHER: 'OTHER'
} as const

export const MAINTENANCE_CATEGORY_LABELS: Record<
	keyof typeof MAINTENANCE_CATEGORY,
	string
> = {
	GENERAL: 'General',
	PLUMBING: 'Plumbing',
	ELECTRICAL: 'Electrical',
	HVAC: 'HVAC',
	APPLIANCES: 'Appliances',
	SAFETY: 'Safety',
	OTHER: 'Other'
}

/**
 * Maintenance category options for forms
 * Provides value/label pairs for select dropdowns
 */
export const MAINTENANCE_CATEGORY_OPTIONS = Object.entries(
	MAINTENANCE_CATEGORY_LABELS
).map(([value, label]) => ({ value, label }))
