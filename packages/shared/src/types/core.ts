/**
 * CORE TYPES - Lean shared types
 * Only exports types that are actually used across the codebase.
 */

import type { DashboardActivity, ActivityItem as ActivityItemType } from './activity.js'
import type {
	Tables,
	TablesInsert,
	TablesUpdate,
	Database
} from './supabase.js'
import type {
	CacheEntry as CacheEntryType,
	CacheStats as CacheStatsType,
	DashboardFinancialStats as DashboardFinancialStatsType,
	DashboardStats as DashboardStatsType,
	LeaseStats as LeaseStatsType,
	MaintenanceAnalyticsData as MaintenanceAnalyticsDataType,
	MaintenanceStats as MaintenanceStatsType,
	PropertyStats as PropertyStatsType,
	TenantStats as TenantStatsType,
	TenantSummary as TenantSummaryType,
	UnitStats as UnitStatsType,
	UserStats as UserStatsType
} from './stats.js'
import type { ExpenseSummaryResponse as ExpenseSummaryResponseType } from './analytics.js'

// Activity item alias for use across the app
export type ActivityItem = ActivityItemType

// ============================================================================
// DB ENUM TYPE EXPORTS - Direct references to supabase.ts
// ============================================================================

export type LeaseStatus = Database['public']['Enums']['lease_status']
export type UnitStatus = Database['public']['Enums']['unit_status']
export type PaymentStatus = Database['public']['Enums']['payment_status']
export type MaintenanceStatus =
	Database['public']['Enums']['maintenance_status']
export type MaintenancePriority =
	Database['public']['Enums']['maintenance_priority']
export type PropertyStatus = Database['public']['Enums']['property_status']
export type NotificationType = Database['public']['Enums']['notification_type']
export type InvitationType = Database['public']['Enums']['invitation_type']
export type StripeSubscriptionStatus =
	Database['public']['Enums']['stripe_subscription_status']

// Import app-only types that are NOT DB enums
import type {
	ActivityEntityType as ActivityEntityTypeFromConstants,
	MaintenanceCategory as MaintenanceCategoryFromConstants,
	PropertyType as PropertyTypeFromConstants
} from '../constants/status-types.js'

export type ApiResponse<T = unknown> =
	| { success: true; data: T; error?: never }
	| { success: false; error: string; data?: never }

export interface StripeSessionStatusResponse {
	status: string
	payment_intent_id: string | null
	payment_status: string | null
	payment_intent_status: string | null
}

export interface CreateCheckoutSessionRequest {
	productName: string
	tenantId: string
	domain: string
	description?: string
	isSubscription?: boolean
	priceId: string
	customerEmail?: string
}

export interface CreateConnectedPaymentRequest {
	amount: number
	tenantId: string
	connectedAccountId: string
	platformFee?: number
	propertyOwnerAccount?: string
	propertyId?: string
}

export interface Pagination {
	page?: number
	limit?: number
	offset?: number
	total?: number
	hasMore?: boolean
}

// ============================================================================
// DB TABLE TYPE ALIASES - Only the ones actually used
// ============================================================================

export type User = Tables<'users'>
export type Property = Tables<'properties'>
export type Unit = Tables<'units'>
export type Tenant = Tables<'tenants'>
export type Lease = Tables<'leases'>
export type MaintenanceRequest = Tables<'maintenance_requests'>
export type RentPayment = Tables<'rent_payments'>
export type ExpenseRecord = Tables<'expenses'>
export type ConnectedAccount = Tables<'stripe_connected_accounts'>
export type PropertyInsert = TablesInsert<'properties'>

export type TenantInput = TablesInsert<'tenants'>
export type TenantUpdate = Partial<TenantInput>

// Insert/Update types - only export what's actually used
export type UserInsert = TablesInsert<'users'>
export type UserUpdate = TablesUpdate<'users'>
export type MaintenanceRequestUpdate = TablesUpdate<'maintenance_requests'>

// ============================================================================
// EXTENDED TYPES - With relations/computed fields
// ============================================================================

export type LeaseWithExtras = Lease & {
	version?: number
	tenant_id?: string
	property_id?: string
	status?: string
	terms?: string
	unit?: {
		id: string
		unit_number: string | null
		property_id: string
	}
	tenant?: {
		id: string
		user_id: string
		name?: string
		email?: string
	}
	property?: {
		id: string
		name: string
		address_line1: string
	}
	signed_at?: string | null
}

export type MaintenanceRequestWithExtras = MaintenanceRequest & {
	version?: number
	property_id?: string
	category?: string
	title?: string
	photos?: string[]
	preferredDate?: string
}

export type TenantWithExtras = Tenant & {
	name?: string
	email?: string
	phone?: string | null
	first_name?: string | null
	last_name?: string | null
	auth_user_id?: string
	invitation_status?: string
	invitation_sent_at?: string | null
	status?: string
	move_out_date?: string | null
}

// Re-export app-only types from constants
export type MaintenanceCategory = MaintenanceCategoryFromConstants
export type PropertyType = PropertyTypeFromConstants
export type ActivityEntityType = ActivityEntityTypeFromConstants

export type UnitRowWithRelations =
	Database['public']['Tables']['units']['Row'] & {
		property?: {
			name: string
			address: string
		}
		tenant?: {
			name: string
			email: string
			phone?: string
		} | null
		lease?: {
			start_date: string
			end_date: string | null
			rent_amount: number
			status: LeaseStatus
		} | null
		marketValue?: number
		lastUpdated?: string
	}

// NOTE: Import Tables, TablesInsert, TablesUpdate, Enums directly from './supabase.js'
// Do NOT re-export here to avoid circular dependencies

export type HttpMethod =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'PATCH'
	| 'DELETE'
	| 'HEAD'
	| 'OPTIONS'

export type EntityType =
	| 'properties'
	| 'units'
	| 'tenants'
	| 'leases'
	| 'maintenance'
export type ActionType = 'create' | 'update' | 'delete' | 'view'
export type Permission = `${EntityType}:${ActionType}`

// Stats types from stats.ts
export type PropertyStats = PropertyStatsType
export type TenantStats = TenantStatsType
export type TenantSummary = TenantSummaryType
export type UnitStats = UnitStatsType
export type LeaseStats = LeaseStatsType
export type MaintenanceStats = MaintenanceStatsType
export type MaintenanceAnalyticsData = MaintenanceAnalyticsDataType
export type DashboardStats = DashboardStatsType
export type DashboardFinancialStats = DashboardFinancialStatsType
export type CacheStats = CacheStatsType
export type CacheEntry = CacheEntryType
export type UserStats = UserStatsType

export interface FinancialOverviewResponse {
	chartData: Array<{
		month: string
		monthNumber: number
		scheduled: number
		expenses: number
		income: number
	}>
	summary: {
		totalIncome: number
		totalExpenses: number
		totalScheduled: number
		netIncome: number
	}
	year: number
}

export type ExpenseSummaryResponse = ExpenseSummaryResponseType

export interface LeaseStatsResponse {
	totalLeases: number
	activeLeases: number
	expiredLeases: number
	terminatedLeases: number
	totalMonthlyRent: number
	averageRent: number
	totalsecurity_deposits: number
	expiringLeases: number
}

export interface TenantWithLeaseInfo {
	id: string
	user_id: string
	created_at: string | null
	date_of_birth: string | null
	emergency_contact_name: string | null
	emergency_contact_phone: string | null
	emergency_contact_relationship: string | null
	identity_verified: boolean | null
	ssn_last_four: string | null
	stripe_customer_id: string | null
	updated_at: string | null
	name?: string
	email?: string
	phone?: string | null
	first_name?: string | null
	last_name?: string | null
	currentLease?: {
		id: string
		start_date: string
		end_date: string | null
		rent_amount: number
		security_deposit: number
		status: string
		primary_tenant_id: string
		unit_id: string
	} | null
	leases?: Array<{
		id: string
		start_date: string
		end_date: string | null
		rent_amount: number
		status: string
		property?: {
			address_line1: string
		}
	}>
	unit?: {
		id: string
		unit_number: string | null
		bedrooms: number | null
		bathrooms: number | null
		square_feet: number | null
		rent_amount: number
	} | null
	property?: {
		id: string
		name: string
		address_line1: string
		address_line2?: string | null
		city: string
		state: string
		postal_code: string
	} | null
	monthlyRent?: number
	lease_status?: string
	paymentStatus?: string | null
	unitDisplay?: string
	propertyDisplay?: string
	leaseStart?: string | null
	leaseEnd?: string | null
}

export interface PropertyPerformance {
	property: string
	property_id: string
	totalUnits: number
	occupiedUnits: number
	vacantUnits: number
	occupancyRate: number
	revenue: number
	monthlyRevenue: number
	potentialRevenue: number
	address_line1: string
	property_type: string
	status: 'NO_UNITS' | 'vacant' | 'FULL' | 'PARTIAL'
	trend: 'up' | 'down' | 'stable'
	trendPercentage: number
}

export interface PropertyPerformanceResponse {
	properties: PropertyPerformance[]
}

export interface SystemUptime {
	uptime: string
	uptimePercentage: number
	sla: string
	slaStatus: 'excellent' | 'good' | 'acceptable' | 'poor'
	status: 'operational' | 'degraded' | 'outage'
	lastIncident: string | null
	responseTime: number
	timestamp: string
}

export interface DashboardMetricsResponse {
	totalProperties: number
	totalUnits: number
	totalTenants: number
	totalLeases: number
	occupancyRate: number
	monthlyRevenue: number
	maintenanceRequests: number
	timestamp: string
}

export interface DashboardSummaryResponse {
	overview: {
		properties: number
		units: number
		tenants: number
		occupancyRate: number
	}
	revenue: {
		monthly: number
		yearly: number
		growth: number
	}
	maintenance: {
		open: number
		inProgress: number
		avgResolutionTime: number
	}
	recentActivity: DashboardActivity[]
	topPerformingProperties: PropertyPerformance[]
	timestamp: string
}

export interface FinancialMetrics {
	revenue: number
	expenses: number
	netIncome: number
	profitMargin: number
	period: string
}

export interface PropertyFinancialMetrics {
	propertyId: string
	propertyName: string
	revenue: number
	expenses: number
	netIncome: number
	roi: number
	period: string
}

export interface DashboardSummary {
	totalRevenue: number
	totalExpenses: number
	netIncome: number
	propertyCount: number
	occupancyRate: number
	avgRoi: number
}

export interface MaintenanceMetrics {
	totalCost: number
	avgCost: number
	totalRequests: number
	emergencyCount: number
	highPriorityCount: number
	completedRequests: number
	pendingRequests: number
	averageResolutionTime: number
}

export interface MaintenanceCostSummary {
	totalCost: number
	avgCost: number
	totalRequests: number
	emergencyCount: number
	highPriorityCount: number
}

export interface MaintenancePerformance {
	propertyId: string
	propertyName: string
	totalRequests: number
	completedRequests: number
	pendingRequests: number
	averageResolutionTime: number
	totalCost: number
	emergencyRequests: number
}

export type FormProgressData = {
	email?: string
	name?: string
	firstName?: string
	lastName?: string
	company?: string
	phone?: string
	subject?: string
	message?: string
	type?: string
	password?: string
	confirmPassword?: string
}

export type PaymentMethodType = 'card' | 'us_bank_account'

export interface PaymentMethodResponse {
	id: string
	tenantId: string
	stripePaymentMethodId: string
	type: PaymentMethodType
	last4: string | null
	brand: string | null
	bankName: string | null
	isDefault: boolean
	createdAt: string
}

export type SubscriptionStatus =
	| 'incomplete'
	| 'incomplete_expired'
	| 'trialing'
	| 'active'
	| 'past_due'
	| 'canceled'
	| 'unpaid'
	| 'paused'

export interface UpdateSubscriptionRequest {
	amount?: number
	paymentMethodId?: string
	billingDayOfMonth?: number
}

export interface TenantNotificationPreferences {
	pushNotifications?: boolean
	emailNotifications?: boolean
	smsNotifications?: boolean
	leaseNotifications?: boolean
	maintenanceNotifications?: boolean
	paymentReminders?: boolean
	rentalApplications?: boolean
	propertyNotices?: boolean
	[key: string]: boolean | undefined
}

// WithVersion types for optimistic locking
export type LeaseWithVersion = Lease & { version?: number }
export type MaintenanceRequestWithVersion = MaintenanceRequest & {
	version?: number
}
export type PropertyWithVersion = Property & { version?: number }
export type UnitWithVersion = Unit & { version?: number }
export type TenantWithLeaseInfoWithVersion = TenantWithLeaseInfo & {
	version?: number
}
export type PaymentMethodResponseWithVersion = PaymentMethodResponse & {
	version?: number
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

export type SearchResultType = 'properties' | 'tenants' | 'units' | 'leases'

export interface SearchResult {
	id: string
	type: SearchResultType
	name: string
	description?: string
	metadata?: Record<string, unknown>
}
