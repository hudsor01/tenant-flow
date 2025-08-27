/**
 * Main export file for @repo/shared package
 * Essential exports to resolve frontend TypeScript dependencies
 */

// ============================================================================
// Utilities
// ============================================================================
export {
	toCamelCase,
	toSnakeCase,
	keysToCamelCase,
	keysToSnakeCase
} from './utils/case-conversion'

// ============================================================================
// CENTRALIZED DOMAIN TYPES - All primary business entities
// ============================================================================

// Property Types - CONSOLIDATED from 15+ scattered definitions
export type {
	Property,
	PropertyStatus,
	PropertyStats,
	PropertyWithUnits,
	CreatePropertyRequest,
	UpdatePropertyRequest,
	PropertyQueryRequest,
	PropertyFormData,
	PropertyFormProps
} from './types/properties'

// Unit Types - CONSOLIDATED from scattered definitions  
export type {
	Unit,
	UnitStatus,
	UnitWithProperty,
	UnitWithLease,
	UnitStats,
	CreateUnitRequest,
	UpdateUnitRequest,
	UnitQueryRequest,
	UnitFormData,
	UnitFormProps
} from './types/units'

// Tenant Types - CONSOLIDATED from 8+ scattered definitions
export type {
	Tenant,
	TenantStatus,
	TenantWithLeases,
	TenantStats,
	TenantInvitation,
	InvitationStatus,
	CreateTenantRequest,
	UpdateTenantRequest,
	TenantQueryRequest,
	TenantFormData,
	TenantFormProps,
	CreateInvitationRequest
} from './types/tenants'

// Lease Types - CONSOLIDATED from 10+ definitions (including 4x duplicate LeaseStatus!)
export type {
	Lease,
	LeaseStatus,
	LeaseType,
	LeaseWithRelations,
	LeaseStats,
	CreateLeaseRequest,
	UpdateLeaseRequest,
	LeaseQueryRequest,
	LeaseFormData,
	LeaseFormProps
} from './types/leases'

// Maintenance Types - CONSOLIDATED from 10+ definitions (including 6x duplicate Priority!)
export type {
	MaintenanceRequest,
	Priority,
	MaintenanceStatus,
	MaintenanceWithRelations,
	MaintenanceStats,
	MaintenanceNotificationPayload,
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest,
	MaintenanceQueryRequest,
	MaintenanceFormData,
	MaintenanceFormProps
} from './types/maintenance'

// Billing Types - CONSOLIDATED from 20+ scattered Stripe/billing definitions + new types
export type {
	Subscription,
	SubscriptionStatus,
	BillingInterval,
	BillingPlan,
	PlanWithUIMapping,
	UsageLimits,
	BillingUsage,
	PaymentMethod,
	Invoice,
	InvoiceStatus,
	CreateCheckoutRequest,
	CreateEmbeddedCheckoutRequest,
	CreatePortalRequest,
	CheckoutResponse,
	PortalResponse,
	SubscriptionStatusResponse,
	StripeWebhookEvent,
	StripeWebhookEventType,
	StripeErrorType,
	PaymentSuccessEmailProps,
	PaymentFailedEmailProps,
	SubscriptionCanceledEmailProps,
	UserFormData,
	WebhookNotification,
	WebhookProcessor,
	WebhookProcessorFunction,
	PaymentNotificationData,
	AuthenticatedUser,
	MinimalInvoice,
	MinimalSubscription,
	// Newly migrated billing types
	CreateSubscriptionDto,
	BillingFormState,
	StripeInvoiceWithSubscription,
	StripeSubscriptionWithPeriods,
	BaseSubscriptionEvent,
	SubscriptionCreatedEvent,
	SubscriptionUpdatedEvent,
	SubscriptionCanceledEvent,
	TrialWillEndEvent,
	PaymentFailedEvent,
	PaymentSucceededEvent
} from './types/billing'

// Export billing enums
export { SubscriptionEventType } from './types/billing'

// Additional properties exports from newly migrated types
export type {
	PropertyWithRelations
} from './types/properties'

// Additional tenants exports from newly migrated types
export type {
	TenantWithRelations,
	TenantStatsResult
} from './types/tenants'

// Additional leases exports from newly migrated types
export type {
	LeaseQueryOptions,
	LeaseTemplate,
	LeaseWithEnhancedData,
	LeaseFormOptions
} from './types/leases'

// Additional maintenance exports from newly migrated types
export type {
	MaintenanceRequestEmailProps
} from './types/maintenance'

// Additional units exports from newly migrated types
export type {
	UnitFormState
} from './types/units'

// Contact Types - NEW migrated types
export type {
	ContactFormRequest,
	ContactFormResponse
} from './types/contact'

// Dashboard Types - NEW migrated types
export type {
	DashboardActivity,
	UpcomingTask,
	RawPropertyStats,
	RawTenantStats,
	AnalyticsProperties,
	UseAnalyticsOptions,
	EssentialAnalyticsEvent,
	UseAnalyticsReturn,
	UseFormAnalyticsOptions
} from './types/dashboard'

// Email Template Types
export type {
	Day7DemoInvitationProps,
	PaymentReminderEmailProps,
	PropertyTipsEmailProps,
	Day3EducationEmailProps,
	TenantInvitationEmailProps,
	ReEngagementEmailProps,
	WelcomeEmailProps,
	LeaseExpirationAlertEmailProps,
	EmailConfirmationProps,
	FeatureAnnouncementEmailProps,
	ReminderType,
	TipCategory,
	SeasonalFocus,
	TipData,
	SeasonalTipsData,
	ReminderData
} from './types/emails'

// Common Types - CONSOLIDATED from scattered utility types
export type {
	ApiResponse,
	PaginationParams,
	SortParams,
	SearchParams,
	QueryOptions,
	UploadStatus,
	LoadingState,
	ActionStatus,
	DashboardStats,
	DashboardMetrics,
	Notification,
	NotificationPriority,
	FileUpload,
	// StorageUploadResult - exported from storage.ts instead
	// ValidationError - already exported from domain types below
	FormState,  // Now exporting FormState for frontend usage
	ValidationResult,
	ErrorResponse,
	FormField
} from './types/common'

// Notification Types
export type { 
	NotificationRequest, 
	NotificationResponse, 
	NotificationData,
	GetNotificationOptions,
	CreateNotificationRequest
} from './types/notifications'

// Maintenance notification types already exported above from maintenance.ts
export { NotificationType } from './types/notifications'

// LEGACY COMPATIBILITY - Keep some old exports during transition
export type { Database } from './types/supabase-generated'
export type { BlogArticleWithDetails } from './types/blog'  
export type { ActivityItem, ActivityType } from './types/activity'

// Legacy API Input Types - will be phased out for new Request types above
export type {
	CreateTenantInput,
	UpdateTenantInput,
	CreateLeaseInput,
	UpdateLeaseInput,
	CreateUnitInput,
	UpdateUnitInput,
	CreateMaintenanceInput,
	UpdateMaintenanceInput,
	UpdateUserProfileInput,
	UseLeaseFormProps
} from './types/api-inputs'

// Legacy Billing - will be phased out
export type {
	CreateCheckoutInput,
	SubscriptionUpdateParams,
	CreatePortalInput
} from './types/api-inputs'

// Legacy Analytics & Query Types - will be consolidated into domain files
export type {
	PropertyMetric,
	PropertyTrend,
	PropertyAnalyticsSummary,
	PortfolioAnalytics
} from './types/analytics'

export type {
	MaintenanceQuery,
	PropertyQuery,
	LeaseQuery,
	TenantQuery,
	UnitQuery
} from './types/queries'

// Auth Types - CONSOLIDATED + new migrated types
export type {
	User,
	AuthUser,
	AuthError,
	AuthErrorCode,
	LoginCredentials,
	RegisterCredentials,
	AuthResponse,
	RefreshTokenRequest,
	SignupCredentials,
	AuthSession,
	ValidatedUser,
	JwtPayload,
	SupabaseJwtPayload,
	SupabaseUser,
	AuthServiceValidatedUser,
	LoginFormData,
	SignupFormData,
	ForgotPasswordFormData,
	ResetPasswordFormData,
	UpdatePasswordFormData,
	ProfileFormData,
	ContactFormData,
	// Newly migrated auth types
	LoginRequest,
	RegisterRequest,
	ForgotPasswordRequest,
	ResetPasswordRequest,
	ChangePasswordRequest,
	AuthenticatedRequest,
	RequestWithUser,
	AuthContextType,
	SecurityValidationResult,
	AuthContext
} from './types/auth'

// Export auth enums and types  
export { Permission } from './types/auth'
export type { UserRole } from './types/auth'

// Storage Types
export type {
	StorageUploadResult,
	FileUploadOptions,
	StorageEntityType,
	StorageFileType
} from './types/storage'

// Utility Types - using native TypeScript features only
// WithRequired and WithOptional are now using native TypeScript patterns
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>
export type WithOptional<T, K extends keyof T> = Omit<T, K> &
	Partial<Pick<T, K>>

// Essential shared types - LoadingState now imported from common.ts above

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

// Error Response Types - ErrorResponse now in common.ts above
export type {
	// ErrorResponse, // DUPLICATE - now exported from common.ts
	SuccessResponse,
	LoaderError,
	AppError,
	NetworkError,
	ServerError,
	BusinessError,
	FileUploadError,
	PaymentError,
	ErrorContext
} from './types/errors'

export type { ApiErrorResponse } from './types/responses'

export type { ControllerApiResponse } from './types/errors'

// API Client Types - CONSOLIDATED from frontend api-client.ts + newly migrated
export type {
	FrontendApiError,
	RequestConfig,
	// Newly migrated API types
	WebhookClientOptions,
	ServerActionState,
	UseServerActionOptions,
	ActionResult,
	FormState,
	UseActionStateFormOptions,
	ErrorSeverity,
	ErrorType,
	ExtendedAppError,
	AsyncResult,
	UseApiCallOptions,
	UseLoadingStateOptions,
	ValidationOptions
} from './types/api'

// UI Component Types - CONSOLIDATED from frontend components + newly migrated
export type {
	BaseProps,
	ModalProps,
	FormProps,
	TableProps,
	StatsCardProps,
	EnhancedElementsProviderProps,
	ChartDataPoint,
	MiniBarChartProps,
	SparklineProps,
	LineChartProps,
	BarChartProps,
	PieChartProps,
	AreaChartProps,
	CustomTooltipProps,
	BaseModalProps,
	UpgradePromptModalProps,
	BaseFormModalProps,
	EmailModalProps,
	EmailData,
	ConfirmationModalProps,
	FormModalProps,
	NavigationLinkProps,
	NavigationGroupProps,
	TabNavigationProps,
	MobileNavigationProps,
	PropertyCardProps,
	TenantCardProps,
	LeaseCardProps,
	CategorySelectorProps,
	InvoiceItem,
	InvoiceDetailsProps,
	InvoiceActionsProps,
	InvoiceItemsSectionProps,
	ClientInfoSectionProps,
	BlogContentSectionProps,
	BlogSidebarProps,
	LoadingSkeletonProps,
	EmptyStateProps,
	GoogleSignupButtonProps,
	SafeHTMLProps,
	LocalBusinessSchemaProps,
	// Newly migrated UI types (only including ones that actually exist)
	ButtonVariant,
	MutationLoadingProps,
	CommandItem,
	SidebarToggleProps
} from './types/ui'

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
	// LeaseFormData - already exported from leases above
	LeaseTemplateData,
	StateLeaseRequirements
} from './types/lease-generator'
export { leaseFormSchema } from './types/lease-generator'

// Backend Types
export type { PerformanceMetrics, RequestContext } from './types/backend'

// Export specific constants needed
export { PLANS, PLAN_TYPE } from './constants/billing'
export type { PlanType } from './constants/billing'
export type { BillingPeriod } from './types/stripe'
// BillingInterval - already exported from billing types above
export { PROPERTY_TYPE, UNIT_STATUS } from './constants/properties'
export type { PropertyType } from './constants/properties'
export {
	PRIORITY,
	REQUEST_STATUS,
	MAINTENANCE_CATEGORY
} from './constants/maintenance'
export type {
	MaintenanceCategory,
	// Priority - already exported from maintenance types above
	RequestStatus,
	Priority as MaintenancePriority
} from './constants/maintenance'

// Export utility functions
export { getPropertyTypeLabel } from './utils/properties'
export { formatCurrency } from './utils/currency'
export {
	getPriorityLabel,
	getPriorityColor,
	getRequestStatusLabel,
	getRequestStatusColor
} from './utils/maintenance'

// Export Stripe configuration functions
export { getPriceId, getAllPlans, formatPrice, getAnnualSavings } from './stripe/config'

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
// SubscriptionStatus - already exported from billing types above

// ============================================================================
// Validation Schemas
// ============================================================================

// Export all validation schemas for frontend/backend use
export * from './validation'

// ============================================================================
// Frontend-Specific Types - CONSOLIDATED from frontend app-store and contexts + newly migrated  
// ============================================================================

export type {
	// App Store types
	NotificationLevel,
	Theme,
	AppNotification,
	RecentActivity,
	UIPreferences,
	UserSession,
	AppState,
	LocalAppState,
	// Hook types
	OptimisticAction,
	OptimisticState,
	OptimisticConfig,
	UsePropertyFormServerProps,
	// Context types (aliased to avoid conflicts with auth.ts)
	AuthContextType as FrontendAuthContextType,
	// Config types
	FrontendConfig,
	// Provider types
	ReactQueryProviderProps,
	// Webpack types (frontend-specific versions)
	WebpackConfig as FrontendWebpackConfig,
	WebpackContext as FrontendWebpackContext,
	// Form state (non-duplicate ones)
	UseActionStateFormOptions as FrontendUseActionStateFormOptions,
	UseActionStateFormReturn as FrontendUseActionStateFormReturn,
	MutationLoadingOptions,
	MutationState,
	// Subscription management
	SubscriptionManagementResult,
	UpgradeRequest,
	DowngradeRequest,
	CancelRequest,
	CheckoutRequest,
	SubscriptionManagementHook,
	// Profile and auth (non-duplicate ones)
	ProfileData,
	PasswordFormData,
	ProfileFormData as FrontendProfileFormData,
	SignupData,
	UseSignupOptions,
	SignupFormState,
	// Property management
	PropertyDeletionConfig,
	PropertyFormServerHookReturn,
	// Query sync
	QuerySyncOptions
} from './types/frontend'

// ============================================================================
// NEW MIGRATED TYPES - Additional exports for types migrated in Phase 2
// ============================================================================

// Database & Environment Types - NEWLY MIGRATED
export type {
	RequiredEnvVars,
	DatabaseOptimizationOptions,
	EnvironmentConfig
} from './types/database'

// Auth Guard & Request Types - NEWLY MIGRATED (additional ones not already exported above)
export type {
	ThrottlerRequest,
	SupabaseWebhookEvent
} from './types/auth'

// ============================================================================
// No abstractions - Direct library usage only per CLAUDE.md
// ============================================================================
