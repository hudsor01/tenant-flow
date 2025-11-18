import type { RequestStatus } from '../constants/status-types.js'
/**
 * Query types for API filtering and pagination
 * These are domain types shared between frontend and backend
 */


/**
 * Base query interface with common pagination params
 * Supports both offset-based (backend) and page-based (frontend) pagination
 */
export interface BaseQuery
	extends Record<string, string | number | boolean | string[] | undefined> {
	limit?: number
	offset?: number
	page?: number
	search?: string
	sortBy?: string
	sortOrder?: 'asc' | 'desc'
}

/**
 * Property query parameters
 */
export interface PropertyQuery extends BaseQuery {
	property_type?: string
	type?: string // Alias for property_type for frontend compatibility
	status?: string
	owner_id?: string
	city?: string
	state?: string
	zipCode?: string
}

/**
 * Lease query parameters
 */
export interface LeaseQuery extends BaseQuery {
	tenantId?: string
	unitId?: string
	propertyId?: string
	status?: string
	start_date?: string
	end_date?: string
	includeExpired?: boolean
	expiring?: string // Number of days for expiring leases filter
}

/**
 * Maintenance query parameters
 */
export interface MaintenanceQuery extends BaseQuery {
	status?: RequestStatus
	propertyId?: string
	unitId?: string
	tenantId?: string
	priority?: string
	category?: string
	assignedTo?: string
	dateFrom?: string
	dateTo?: string
}

/**
 * Unit query parameters
 */
export interface UnitQuery extends BaseQuery {
	propertyId?: string
	status?: string
	type?: string
	bedroomsMin?: number
	bedroomsMax?: number
	bathroomsMin?: number
	bathroomsMax?: number
	rentMin?: number
	rentMax?: number
}

/**
 * Tenant query parameters
 */
export interface TenantQuery extends BaseQuery {
	propertyId?: string
	unitId?: string
	lease_status?: string
	status?: string // Alias for lease_status for frontend compatibility
	moveInDateFrom?: string
	moveInDateTo?: string
	email?: string
	phone?: string
}

/**
 * Notification query parameters
 */
export interface NotificationQuery extends BaseQuery {
	userId?: string
	type?: string
	priority?: string
	read?: boolean
	dateFrom?: string
	dateTo?: string
}

/**
 * Activity query parameters (extends from activity types)
 */
export interface ActivityQueryParams extends BaseQuery {
	type?: string
	since?: string
	userId?: string
	entityType?: string
	entityId?: string
}

/**
 * Analytics query parameters
 */
export interface AnalyticsQueryParams extends BaseQuery {
	propertyId?: string
	owner_id?: string
	start_date?: string
	end_date?: string
	metricTypes?: string[]
	includeAlerts?: boolean
	includeTrends?: boolean
	groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year'
}

/**
 * Pagination response wrapper
 */
export interface PaginatedResponse<T> {
	data: T[]
	total: number
	limit: number
	offset: number
	hasMore: boolean
}
