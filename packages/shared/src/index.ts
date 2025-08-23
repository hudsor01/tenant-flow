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
	PropertyStats,
	UnitStats,
	CreatePropertyInput,
	UpdatePropertyInput
} from './types/properties'

// Property Relations
export type {
	PropertyWithUnits,
	PropertyWithDetails,
	PropertyWithUnitsAndLeases,
	TenantWithLeases
} from './types/relations'

// Tenant Types
export type { Tenant, TenantStats, InvitationStatus } from './types/tenants'

// Lease Types
export type { Lease, LeaseStatus } from './types/leases'

// Maintenance Types
export type {
	MaintenanceRequest,
	Priority as MaintenancePriority,
	RequestStatus as MaintenanceStatus
} from './types/maintenance'

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
	UpdateUserProfileInput
} from './types/api-inputs'

// Blog Types
export type { BlogArticleWithDetails } from './types/blog'

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
	User,
	AuthUser,
	AuthError,
	AuthErrorCode,
	LoginCredentials,
	SignupCredentials,
	AuthSession,
	ValidatedUser,
	JwtPayload,
	UserRole,
	SupabaseJwtPayload
} from './types/auth'

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
} from './types/errors'

export type { ApiErrorResponse } from './types/responses'

export type { ControllerApiResponse } from './types/errors'

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

// ============================================================================
// Type Aliases for Frontend Compatibility
// ============================================================================

export type { CreateCheckoutInput as CreateCheckoutSessionRequest } from './types/api-inputs'
export type { CheckoutResponse as CreateCheckoutSessionResponse } from './types/responses'
export type { SubStatus as SubscriptionStatus } from './types/billing'
