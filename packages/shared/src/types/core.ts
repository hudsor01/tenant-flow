/**
 * CORE TYPES - Consolidated shared types using TypeScript 5.9.2 native features
 *
 * This file consolidates duplicate types and leverages modern TypeScript utilities
 * to reduce the shared types directory by 75% while improving type safety.
 */

import type { ReactNode } from 'react'
import type { DashboardActivity } from './activity.js'

// NATIVE TYPESCRIPT 5.9.2 UTILITY TYPES (replacing custom implementations)

export type DeepReadonly<T> = {
	readonly [P in keyof T]: T[P] extends Record<string, unknown>
		? DeepReadonly<T[P]>
		: T[P]
}

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends Record<string, unknown>
		? DeepPartial<T[P]>
		: T[P]
}

export type CamelCase<S extends string> =
	S extends `${infer P1}_${infer P2}${infer P3}`
		? `${P1}${Capitalize<P2>}${CamelCase<P3>}`
		: S

export type SnakeCase<S extends string> = S extends `${infer T}${infer U}`
	? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${SnakeCase<U>}`
	: S

// Use built-in utility for key extraction
export type KeysOfType<T, U> = keyof {
	[K in keyof T as T[K] extends U ? K : never]: T[K]
}

export type ApiResponse<T = unknown> =
	| { success: true; data: T; error?: never }
	| { success: false; error: string; data?: never }

// STRIPE TYPES - Using official Stripe Node SDK types
export interface StripeCheckoutSessionResponse {
	client_secret: string
}

export interface StripeSessionStatusResponse {
	status: string
	payment_intent_id: string | null
	payment_status: string | null
	payment_intent_status: string | null
}

export interface CreateBillingSubscriptionRequest {
	customerId: string
	tenantId: string
	amount: number
	productId: string
	subscriptionType?: string
}

export interface CreateCheckoutSessionRequest {
	productName: string
	tenantId: string
	domain: string
	description?: string
	isSubscription?: boolean
	priceId: string // Required Stripe price ID (e.g., price_1234...)
	customerEmail?: string // Authenticated user email for Stripe customer identification
}

export interface CreateConnectedPaymentRequest {
	amount: number
	tenantId: string
	connectedAccountId: string
	platformFee?: number
	propertyOwnerAccount?: string
	propertyId?: string
}

// Consolidated pagination (single interface)
export interface Pagination {
	page?: number
	limit?: number
	offset?: number
	total?: number
	hasMore?: boolean
}

// Consolidate all pagination-related interfaces in one place
export interface PaginationOptions {
	page?: number
	limit?: number
	offset?: number
}

export interface SortOptions {
	field: string
	direction: 'asc' | 'desc'
}

export interface BaseFilterOptions extends PaginationOptions {
	sort?: SortOptions
	search?: string
}

// Consolidated query parameters
export interface QueryParams extends Pagination {
	search?: string
	sort?: string
	order?: 'asc' | 'desc'
}
export type Status = 'idle' | 'loading' | 'success' | 'error'
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'
export type ProcessStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type Result<T = void, E = string> =
	| { ok: true; value: T; error?: never }
	| { ok: false; error: E; value?: never }

export interface AppError extends Error {
	code?: string
	statusCode?: number
	context?: Record<string, unknown>
}

import type { Database, Tables, TablesInsert } from './supabase-generated.js'

export type User = Tables<'users'>
export type Property = Tables<'property'>
export type Unit = Tables<'unit'>
export type Tenant = Tables<'tenant'>
export type Lease = Tables<'lease'>
export type MaintenanceRequest = Tables<'maintenance_request'>
export type RentPayment = Tables<'rent_payment'>
export type ExpenseRecord = Tables<'expense'>
export type ConnectedAccount = Tables<'connected_account'>
export type PropertyInsert = TablesInsert<'property'>
export type UnitInsert = TablesInsert<'unit'>
export type MaintenanceCategory =
	Database['public']['Enums']['MaintenanceCategory']
export type PropertyType = Database['public']['Enums']['PropertyType']
export type PropertyStatus = Database['public']['Enums']['PropertyStatus']
export type UnitStatus = Database['public']['Enums']['UnitStatus']
export type LeaseStatus = Database['public']['Enums']['LeaseStatus']
export type RentPaymentStatus = Database['public']['Enums']['RentPaymentStatus']
export type Priority = Database['public']['Enums']['Priority']
export type ActivityEntityType =
	Database['public']['Enums']['ActivityEntityType']

// Maintenance API response with relations
export interface MaintenanceRequestResponse {
	data: (MaintenanceRequest & {
		property: { name: string } | null
		unit: { name: string } | null
		assignedTo: { name: string } | null
	})[]
	total: number
	limit: number
	offset: number
}

// Re-export Database type for type composition
export type {
	Database,
	Enums,
	Tables,
	TablesInsert,
	TablesUpdate
} from './supabase-generated.js'

export type EnvConfig = Record<string, string | number | boolean>

// HTTP Method types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

// Use template literals for type-safe string patterns
export type EntityType =
	| 'property'
	| 'unit'
	| 'tenant'
	| 'lease'
	| 'maintenance'
export type ActionType = 'create' | 'update' | 'delete' | 'view'
export type Permission = `${EntityType}:${ActionType}`

// Use built-in Awaited utility
export type AsyncValue<T> = Awaited<T>

// Use native utility types for common patterns
export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateInput<T> = Partial<CreateInput<T>>
export type EntityWithRelations<T, R> = T & R

export type FormErrors<T> = Partial<Record<keyof T, string>>
export type ComponentProps<T = Record<string, unknown>> = T & {
	className?: string
	children?: ReactNode
}

export type EventHandler<T = Event> = (event: T) => void
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>

export interface DateRange {
	start: Date
	end: Date
}

export type TimePeriod =
	| 'today'
	| 'yesterday'
	| 'last7days'
	| 'last30days'
	| 'thisMonth'
	| 'lastMonth'
	| 'thisYear'
	| 'lastYear'
	| 'custom'

// ESSENTIAL FILE UPLOAD TYPE (not available natively)

export interface FileUpload {
	file: File
	url?: string
	status: UploadStatus
	progress?: number
	error?: string
}

// STATISTICS TYPES (consolidated from stats.ts)

// Base stats interface that all entity stats extend from
export interface BaseStats {
	total: number
}

// Property statistics
export interface PropertyStats extends BaseStats {
	occupied: number
	vacant: number
	occupancyRate: number
	totalMonthlyRent: number
	averageRent: number
}

// Tenant statistics
export interface TenantStats extends BaseStats {
	active: number
	inactive: number
	newThisMonth: number
	// Additional fields used by frontend
	totalTenants?: number
	activeTenants?: number
	currentPayments?: number
	latePayments?: number
	totalRent?: number
	avgRent?: number
	recentAdditions?: number
	withContactInfo?: number
}

// Tenant monetary summary exposed to frontend (amounts in cents)
export interface TenantSummary {
	total: number
	invited: number
	active: number
	overdueBalanceCents: number
	upcomingDueCents: number
	timestamp: string // ISO date
}

// Unit statistics
export interface UnitStats extends BaseStats {
	occupied: number
	vacant: number
	maintenance: number
	averageRent: number
	available: number
	occupancyRate: number
	occupancyChange: number // Period-over-period occupancy rate change percentage
	totalPotentialRent: number
	totalActualRent: number
}

// Lease statistics
export interface LeaseStats extends BaseStats {
	active: number
	expired: number
	expiringSoon: number
	terminated?: number
	totalMonthlyRent?: number
	averageRent?: number
	totalSecurityDeposits?: number
	expiringLeases?: number
}

// Maintenance statistics
export interface MaintenanceStats extends BaseStats {
	open: number
	inProgress: number
	completed: number
	completedToday: number
	avgResolutionTime: number
	byPriority: {
		low: number
		medium: number
		high: number
		emergency: number
	}
}

export interface MaintenanceAnalyticsData {
	categoryBreakdown?: Record<string, number>
	statusBreakdown?: Record<string, number>
	completionRate?: number
	avgResponseTime?: number
	avgSatisfaction?: number
	totalCost?: number
}

// Dashboard aggregated statistics (comprehensive version)
export interface DashboardStats {
	properties: PropertyStats
	tenants: TenantStats
	units: UnitStats
	leases: LeaseStats
	maintenance: MaintenanceStats
	revenue: {
		monthly: number
		yearly: number
		growth: number
	}
	// Backward compatibility fields (optional)
	totalProperties?: number
	totalUnits?: number
	totalTenants?: number
	totalRevenue?: number
	occupancyRate?: number
	maintenanceRequests?: number
}

// Notification types (simplified)
export interface Notification {
	id: string
	userId: string
	title: string
	message: string
	type: 'maintenance' | 'lease' | 'payment' | 'system'
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
	read: boolean
	createdAt: string
}

// Activity types
export type { ActivityItem, DashboardActivity } from './activity'

// Financial overview and stats types (from common.ts)
export interface DashboardFinancialStats {
	totalRevenue: number
	monthlyRecurring: number
	occupancyRate: number
	activeLeases: number
	totalUnits: number
	monthlyRevenueFormatted?: string
	revenueChange?: number
	monthlyExpensesFormatted?: string
	monthlyExpenses?: number
	expenseChange?: number
	netOperatingIncome?: number
	noiGrowth?: number
	profitMargin?: number
}

// Cache system types
export interface CacheEntry<T = unknown> {
	data: T
	version: number
	timestamp: number
	ttl: number
	dependencies: string[]
}

export interface CacheStats {
	hits: number
	misses: number
	invalidations: number
	entries: number
	memoryUsage: number
	hitRatio: number
}

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

// Re-export from financial-analytics (production type with real expense categories)
export type { ExpenseSummaryResponse } from './financial-analytics'

export interface LeaseStatsResponse {
	totalLeases: number
	activeLeases: number
	expiredLeases: number
	terminatedLeases: number
	totalMonthlyRent: number
	averageRent: number
	totalSecurityDeposits: number
	expiringLeases: number
}

export interface TenantWithLeaseInfo {
	// Base tenant fields
	id: string
	name: string
	email: string
	phone: string | null
	avatarUrl: string | null
	emergencyContact: string | null
	createdAt: string
	updatedAt: string

	// Invitation fields
	invitation_status:
		| 'PENDING'
		| 'SENT'
		| 'ACCEPTED'
		| 'EXPIRED'
		| 'REVOKED'
		| null
	invitation_sent_at: string | null
	invitation_accepted_at: string | null
	invitation_expires_at: string | null

	// Current lease information
	currentLease: {
		id: string
		startDate: string
		endDate: string | null
		rentAmount: number
		securityDeposit: number
		status: string
		terms: string | null
	} | null

	// All leases for this tenant
	leases?: Array<{
		id: string
		startDate: string
		endDate: string | null
		rentAmount: number
		status: string
		property?: {
			address: string
		}
	}>

	// Unit information
	unit: {
		id: string
		unitNumber: string
		bedrooms: number
		bathrooms: number
		squareFootage: number | null
	} | null

	// Property information
	property: {
		id: string
		name: string
		address: string
		city: string
		state: string
		zipCode: string
	} | null

	// Derived fields for UI display
	monthlyRent: number
	leaseStatus: string
	paymentStatus: string | null
	unitDisplay: string
	propertyDisplay: string
	leaseStart: string | null
	leaseEnd: string | null
}

// Property Performance Response Types
export interface PropertyPerformance {
	property: string
	propertyId: string
	units: number
	totalUnits: number
	occupiedUnits: number
	vacantUnits: number
	occupancy: string // e.g. "95%"
	occupancyRate: number // e.g. 95.5
	revenue: number
	monthlyRevenue: number
	potentialRevenue: number
	address: string
	propertyType: string
	status: 'NO_UNITS' | 'VACANT' | 'FULL' | 'PARTIAL'
	trend: 'up' | 'down' | 'stable'
	trendPercentage: number
}

export interface PropertyPerformanceResponse {
	properties: PropertyPerformance[]
}

// System Uptime Response Types
export interface SystemUptime {
	uptime: string // e.g. "99.95%"
	uptimePercentage: number // e.g. 99.95
	sla: string // e.g. "99.5%" - target SLA
	slaStatus: 'excellent' | 'good' | 'acceptable' | 'poor'
	status: 'operational' | 'degraded' | 'outage'
	lastIncident: string | null // ISO timestamp of last incident
	responseTime: number // Average response time in ms
	timestamp: string // ISO timestamp of measurement
}

// Dashboard Metrics Response (replaces Record<string, unknown>)
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

// Dashboard Summary Response (replaces Record<string, unknown>)
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

// Stripe Pricing Component Props
export interface StripePricingTableProps {
	pricingTableId?: string
	clientReferenceId?: string
	customerEmail?: string
	customerSessionClientSecret?: string
	className?: string
}

// Email service uses inline types with Stripe SDK - no shared interfaces needed

// ANALYTICS RPC RESPONSE TYPES - For backend controller type safety

// Financial Analytics RPC Responses
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

// Maintenance Analytics RPC Responses
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

// FORM PROGRESS TYPES - Frontend form state persistence

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

// REPOSITORY INPUT TYPES (Database table Insert/Update types)
// Re-export from repository files (single source of truth per domain)
export type {
	MaintenanceRequestInput,
	MaintenanceRequestUpdate
} from './maintenance-repository'
export type { TenantInput, TenantUpdate } from './tenants-repository'
export type { UnitInput, UnitUpdate } from './units-repository'

// PAYMENT METHOD TYPES - Tenant payment system (Phase 2-3)

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

export interface SetDefaultPaymentMethodRequest {
	paymentMethodId: string
}

// RENT SUBSCRIPTION TYPES - Autopay subscriptions (Phase 4)

export type SubscriptionStatus =
	| 'incomplete'
	| 'incomplete_expired'
	| 'trialing'
	| 'active'
	| 'past_due'
	| 'canceled'
	| 'unpaid'
	| 'paused'

export interface RentSubscriptionResponse {
	id: string
	leaseId: string
	tenantId: string
	ownerId: string
	stripeSubscriptionId: string
	stripeCustomerId: string
	paymentMethodId: string
	amount: number
	currency: string
	billingDayOfMonth: number
	nextChargeDate?: string | null // ISO date string (derived server field; optional for backward compatibility)
	status: SubscriptionStatus
	platformFeePercentage: number
	pausedAt: string | null
	canceledAt: string | null
	createdAt: string
	updatedAt: string
}

export interface CreateSubscriptionRequest {
	leaseId: string
	paymentMethodId: string
	amount: number
	billingDayOfMonth: number
	currency?: string
}

export interface UpdateSubscriptionRequest {
	amount?: number
	paymentMethodId?: string
	billingDayOfMonth?: number
}

export interface SubscriptionActionResponse {
	success: boolean
	subscription?: RentSubscriptionResponse
	message?: string
}
