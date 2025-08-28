/**
 * DASHBOARD TYPES - All dashboard and analytics-related interfaces
 * CONSOLIDATED from scattered dashboard and analytics definitions
 */

// =============================================================================
// DASHBOARD DATA TYPES - MIGRATED from inline definitions
// =============================================================================

export interface DashboardActivity {
	id: string
	type: 'property' | 'tenant' | 'lease' | 'maintenance' | 'payment'
	title: string
	description: string
	timestamp: Date
	userId: string
	metadata?: Record<string, unknown>
}

export interface UpcomingTask {
	id: string
	title: string
	description: string
	dueDate: Date
	priority: 'LOW' | 'MEDIUM' | 'HIGH'
	type: 'maintenance' | 'lease_renewal' | 'payment' | 'inspection'
	relatedId?: string
}

export interface RecentActivity {
	id: string
	type: string
	description: string
	timestamp: Date
	entityType: 'property' | 'tenant' | 'lease' | 'maintenance'
	entityId: string
}

// Raw dashboard stats types (from backend aggregations)
export type RawPropertyStats = Partial<{
	totalProperties: number
	activeProperties: number
	vacantUnits: number
	totalMonthlyRent: number
	total: number
}>

export type RawTenantStats = Partial<{
	totalTenants: number
	activeTenants: number
	pendingInvitations: number
	total: number
}>

// =============================================================================
// ANALYTICS TYPES - MIGRATED from inline definitions
// =============================================================================

export interface AnalyticsProperties {
	[key: string]: string | number | boolean | Date | undefined
	page?: string
	section?: string
	action?: string
	value?: number
}

export interface UseAnalyticsOptions {
	disabled?: boolean
	debug?: boolean
}

export type EssentialAnalyticsEvent =
	| 'page_view'
	| 'property_created'
	| 'tenant_added'
	| 'lease_signed'
	| 'maintenance_requested'
	| 'payment_processed'
	| 'subscription_upgraded'
	| 'user_registered'
	| 'login_successful'
	| 'error_occurred'

export type UseAnalyticsReturn = {
	track: (event: string, properties?: AnalyticsProperties) => void
	identify: (userId: string, properties?: AnalyticsProperties) => void
	page: (name?: string, properties?: AnalyticsProperties) => void
	isReady: boolean
}

// =============================================================================
// FORM ANALYTICS TYPES
// =============================================================================

export interface UseFormAnalyticsOptions {
	formName: string
	trackValidation?: boolean
	trackTimeToComplete?: boolean
}