/**
 * Main export file for @repo/shared package
 * Essential exports to resolve frontend TypeScript dependencies
 */

// ============================================================================
// Essential Types for Frontend
// ============================================================================

// Property Types
export type {
	Property,
	Unit,
	PropertyType,
	UnitStatus,
<<<<<<< HEAD
=======
	PropertyStats,
	UnitStats,
>>>>>>> origin/main
	CreatePropertyInput,
	UpdatePropertyInput
} from './types/properties'

// Property Relations
export type {
	PropertyWithUnits,
	PropertyWithDetails,
	PropertyWithUnitsAndLeases,
<<<<<<< HEAD
	TenantWithLeases,
	UnitWithDetails
} from './types/relations'

// Tenant Types
export type { Tenant, InvitationStatus } from './types/tenants'
=======
	TenantWithLeases
} from './types/relations'

// Tenant Types
export type { Tenant, TenantStats, InvitationStatus } from './types/tenants'
>>>>>>> origin/main

// Lease Types
export type { Lease, LeaseStatus } from './types/leases'

// Maintenance Types
export type {
	MaintenanceRequest,
<<<<<<< HEAD
	MaintenanceRequestWithDetails,
	Priority as MaintenancePriority,
	RequestStatus as MaintenanceStatus
} from './types/maintenance'
export {
	getPriorityColor,
	getPriorityLabel,
	getRequestStatusColor,
	getRequestStatusLabel
} from './types/maintenance'
=======
	Priority as MaintenancePriority,
	RequestStatus as MaintenanceStatus
} from './types/maintenance'
>>>>>>> origin/main

// API Input Types (all Create/Update inputs)
export type {
	CreateTenantInput,
	UpdateTenantInput,
	CreateLeaseInput,
	UpdateLeaseInput,
	CreateUnitInput,
	UpdateUnitInput,
	CreateMaintenanceInput,
	UpdateMaintenanceInput,
<<<<<<< HEAD
	UpdateUserProfileInput,
	UseLeaseFormProps
=======
	UpdateUserProfileInput
>>>>>>> origin/main
} from './types/api-inputs'

// Blog Types
export type { BlogArticleWithDetails } from './types/blog'
<<<<<<< HEAD

// Dashboard Stats
export type { DashboardStats } from './types/api'

// Activity Types
export type { ActivityItem, ActivityType } from './types/activity'

// Notification Types
export type { 
	NotificationRequest,
	NotificationResponse,
	NotificationData
} from './types/notifications'
export { NotificationType } from './types/notifications'

// Supabase Types
export type { Database } from './types/supabase-generated'

// Statistics Types (centralized)
export type {
	BaseStats,
	PropertyStats,
	TenantStats,
	UnitStats,
	LeaseStats,
	MaintenanceStats
} from './types/stats'

// Analytics Types
export type {
	PropertyMetric,
	PropertyTrend,
	PropertyAnalyticsSummary,
	PortfolioAnalytics
} from './types/analytics'

// Query Types
export type {
	MaintenanceQuery,
	PropertyQuery,
	LeaseQuery,
	TenantQuery,
	UnitQuery
} from './types/queries'

// Billing Types
export type {
	Invoice,
	PaymentMethod,
	Plan,
	SubStatus,
	UpdateSubscriptionParams,
	SubscriptionSyncResult
} from './types/billing'
export type {
	CreateCheckoutInput,
	SubscriptionUpdateParams,
	CreatePortalInput
} from './types/api-inputs'
export type { CheckoutResponse, PortalResponse } from './types/responses'
export type {
	PlanType,
	BillingPeriod,
	StripeSubscription,
	StripeSubscriptionData,
	StripeBillingInterval,
	BillingInterval,
	Subscription
} from './types/stripe'

// Auth Types
export type {
=======

// Dashboard Stats
export type { DashboardStats, ActivityItem } from './types/api'

// Analytics Types
export type {
	PropertyMetric,
	PropertyTrend,
	PropertyAnalyticsSummary,
	PortfolioAnalytics
} from './types/analytics'

// Query Types
export type {
	MaintenanceQuery,
	PropertyQuery,
	LeaseQuery,
	TenantQuery,
	UnitQuery
} from './types/queries'

// Billing Types
export type {
	Invoice,
	PaymentMethod,
	Plan,
	SubStatus,
	UpdateSubscriptionParams
} from './types/billing'
export type {
	CreateCheckoutInput,
	SubscriptionUpdateParams,
	CreatePortalInput
} from './types/api-inputs'
export type { CheckoutResponse, PortalResponse } from './types/responses'
export type {
	PlanType,
	BillingPeriod,
	StripeSubscription,
	StripeSubscriptionData,
	StripeBillingInterval,
	BillingInterval,
	Subscription
} from './types/stripe'

// Auth Types
export type {
>>>>>>> origin/main
	User,
	AuthUser,
	AuthError,
	AuthErrorCode,
	LoginCredentials,
<<<<<<< HEAD
	RegisterCredentials,
	AuthResponse,
	RefreshTokenRequest,
=======
>>>>>>> origin/main
	SignupCredentials,
	AuthSession,
	ValidatedUser,
	JwtPayload,
	UserRole,
	SupabaseJwtPayload
} from './types/auth'

<<<<<<< HEAD
// Utility Types - using native TypeScript features only
// WithRequired and WithOptional are now using native TypeScript patterns
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>
export type WithOptional<T, K extends keyof T> = Omit<T, K> &
	Partial<Pick<T, K>>

// Essential shared types
export interface LoadingState {
	isLoading: boolean
	error?: string | null
}

export interface PaginationMeta {
	page: number
	limit: number
	total: number
	totalPages: number
	hasNext: boolean
	hasPrev: boolean
}

export interface OffsetPaginationParams {
	offset?: number
	limit?: number
}

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

export interface FieldError {
	message: string
	type?: string
}

export type FormErrors<T> = {
	[K in keyof T]?: FieldError | string
}

// Error Response Types
export type {
	ErrorResponse,
	SuccessResponse,
	LoaderError,
	AppError,
	ValidationError,
	NetworkError,
	ServerError,
	BusinessError,
	FileUploadError,
	PaymentError,
	ErrorContext
=======
// Utility Types
export type {
	WithRequired,
	WithOptional,
	LoadingState,
	PaginationMeta,
	OffsetPaginationParams,
	DateRange,
	TimePeriod,
	FieldError,
	FormErrors
} from './types/utilities'

// Error Response Types
export type {
	ErrorResponse,
	SuccessResponse,
	LoaderError
>>>>>>> origin/main
} from './types/errors'

export type { ApiErrorResponse } from './types/responses'

export type { ControllerApiResponse } from './types/errors'

<<<<<<< HEAD
// Fastify Error Types
export type {
	FastifyErrorResponse,
	FastifyValidationErrorResponse,
	FastifyBusinessErrorResponse,
	FastifyErrorCode,
	BusinessErrorCode,
	ErrorLogContext,
	SecurityContext
} from './types/fastify-errors'

export {
	FASTIFY_ERROR_CODES,
	FASTIFY_ERROR_MESSAGES,
	BUSINESS_ERROR_CODES
} from './types/fastify-errors'

// Invoice Types
export type { CustomerInvoiceForm, InvoiceItemForm } from './types/invoice-lead'

// Lease Generator Types
export type {
	LeaseGeneratorForm,
	LeaseOutputFormat,
	LeaseFormData,
	LeaseTemplateData,
	StateLeaseRequirements
} from './types/lease-generator'
export { leaseFormSchema } from './types/lease-generator'

// Backend Types
export type { PerformanceMetrics, RequestContext } from './types/backend'

// Export specific constants needed
export { PLANS, PLAN_TYPE } from './constants/billing'

// Stripe Configuration (uses existing types)
export {
	STRIPE_PRICE_IDS,
	STRIPE_PRODUCT_IDS,
	getStripePriceId,
	getStripeProductId
} from './stripe/plans'
export { PROPERTY_TYPE, UNIT_STATUS } from './constants/properties'
export {
	PRIORITY,
	REQUEST_STATUS,
	MAINTENANCE_CATEGORY
} from './constants/maintenance'
export type {
	MaintenanceCategory,
	Priority,
	RequestStatus
} from './constants/maintenance'

// Utility functions removed - use native implementations directly

// ============================================================================
// Logger Types
// ============================================================================

export type {
	ILogger,
	LogContext,
	LogEntry,
	LoggerConfig,
	AnalyticsEvent
} from './types/logger'
export { LogLevel } from './types/logger'

// ============================================================================
// Session Types
// ============================================================================

export type {
	SessionData,
	TokenPair,
	SessionValidationResult,
	SessionActivity
} from './types/session'

// Domain Types - Removed DDD abstractions per KISS principle
// Use plain objects and native TypeScript features instead of domain patterns

// Simple ID types for type safety
export type Brand<T, TBrand> = T & { readonly __brand: TBrand }

export type UserId = Brand<string, 'UserId'>
export type PropertyId = Brand<string, 'PropertyId'>
export type UnitId = Brand<string, 'UnitId'>
export type TenantId = Brand<string, 'TenantId'>
export type LeaseId = Brand<string, 'LeaseId'>
export type MaintenanceRequestId = Brand<string, 'MaintenanceRequestId'>
export type OrganizationId = Brand<string, 'OrganizationId'>
export type DocumentId = Brand<string, 'DocumentId'>
export type FileId = Brand<string, 'FileId'>
export type ActivityId = Brand<string, 'ActivityId'>
export type NotificationId = Brand<string, 'NotificationId'>
export type ReminderLogId = Brand<string, 'ReminderLogId'>
export type BlogArticleId = Brand<string, 'BlogArticleId'>
export type CustomerInvoiceId = Brand<string, 'CustomerInvoiceId'>

// Helper functions for ID creation
export const createId = {
	user: (id: string): UserId => id as UserId,
	property: (id: string): PropertyId => id as PropertyId,
	unit: (id: string): UnitId => id as UnitId,
	tenant: (id: string): TenantId => id as TenantId,
	lease: (id: string): LeaseId => id as LeaseId,
	maintenanceRequest: (id: string): MaintenanceRequestId =>
		id as MaintenanceRequestId,
	organization: (id: string): OrganizationId => id as OrganizationId,
	document: (id: string): DocumentId => id as DocumentId,
	file: (id: string): FileId => id as FileId,
	activity: (id: string): ActivityId => id as ActivityId,
	notification: (id: string): NotificationId => id as NotificationId,
	reminderLog: (id: string): ReminderLogId => id as ReminderLogId,
	blogArticle: (id: string): BlogArticleId => id as BlogArticleId,
	customerInvoice: (id: string): CustomerInvoiceId => id as CustomerInvoiceId
}

// Simple result pattern - no complex abstractions
export interface Result<T = void> {
	success: boolean
	value?: T
	error?: string
	errors?: string[]
}

// Business rule validation type
export interface BusinessRule {
	name: string
	description: string
	isValid: boolean
	violationMessage?: string
}
=======
// Invoice Types
export type { CustomerInvoiceForm, InvoiceItemForm } from './types/invoice-lead'

// Lease Generator Types
export type {
	LeaseGeneratorForm,
	LeaseOutputFormat,
	LeaseFormData,
	LeaseTemplateData,
	StateLeaseRequirements
} from './types/lease-generator'
export { leaseFormSchema } from './types/lease-generator'

// Backend Types
export type { PerformanceMetrics, RequestContext } from './types/backend'

// Export specific constants needed
export { PLANS, PLAN_TYPE } from './constants/billing'
export { PROPERTY_TYPE, UNIT_STATUS } from './constants/properties'
export {
	PRIORITY,
	REQUEST_STATUS,
	MAINTENANCE_CATEGORY
} from './constants/maintenance'
export type {
	MaintenanceCategory,
	Priority,
	RequestStatus
} from './constants/maintenance'

// Export utility functions
export { getPropertyTypeLabel } from './utils/properties'
export { formatCurrency } from './utils/currency'

// ============================================================================
// Logger Types
// ============================================================================

export type {
	ILogger,
	LogContext,
	LogEntry,
	LoggerConfig,
	AnalyticsEvent
} from './types/logger'
export { LogLevel } from './types/logger'

// ============================================================================
// Session Types
// ============================================================================

export type {
	SessionData,
	TokenPair,
	SessionValidationResult,
	SessionActivity
} from './types/session'

// ============================================================================
// Domain Types
// ============================================================================

export type {
	ValueObject,
	Entity,
	AggregateRoot,
	DomainEvent,
	Repository,
	QueryRepository,
	Specification,
	Command,
	Query,
	CommandHandler,
	QueryHandler,
	DomainService,
	Factory,
	UnitOfWork,
	BusinessRule
} from './types/domain'

export {
	BaseValueObject,
	BaseEntity,
	BaseSpecification,
	Result,
	BusinessRuleValidationError,
	Money,
	Email,
	PhoneNumber,
	Address,
	DomainError,
	ValidationError,
	NotFoundError,
	ConflictError,
	UnauthorizedError,
	ForbiddenError,
	createId
} from './types/domain'

export type {
	Brand,
	UserId,
	PropertyId,
	UnitId,
	TenantId,
	LeaseId,
	MaintenanceRequestId,
	OrganizationId,
	DocumentId,
	FileId,
	ActivityId,
	NotificationId,
	ReminderLogId,
	BlogArticleId,
	CustomerInvoiceId
} from './types/domain'
>>>>>>> origin/main

// ============================================================================
// Type Aliases for Frontend Compatibility
// ============================================================================

export type { CreateCheckoutInput as CreateCheckoutSessionRequest } from './types/api-inputs'
export type { CheckoutResponse as CreateCheckoutSessionResponse } from './types/responses'
export type { SubStatus as SubscriptionStatus } from './types/billing'
<<<<<<< HEAD

// ============================================================================
// Simple utility functions (minimal, non-abstract)
// ============================================================================

// Simple currency formatter
export function formatCurrency(
	amount: number,
	options?: Intl.NumberFormatOptions
): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		...options
	}).format(amount)
}

// Simple property type label formatter
export function getPropertyTypeLabel(type: string): string {
	switch (type) {
		case 'single_family':
			return 'Single Family'
		case 'multi_family':
			return 'Multi Family'
		case 'condo':
			return 'Condo'
		case 'townhouse':
			return 'Townhouse'
		case 'apartment':
			return 'Apartment'
		case 'commercial':
			return 'Commercial'
		default:
			return (
				type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
			)
	}
}

// ============================================================================
// Validation Schemas
// ============================================================================

// Export all validation schemas for frontend/backend use
export * from './validation'

// ============================================================================
// No abstractions - Direct library usage only per CLAUDE.md
// ============================================================================
=======
>>>>>>> origin/main
