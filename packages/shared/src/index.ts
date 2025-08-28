/**
 * Main export file for @repo/shared package
 * NO TYPE DUPLICATION - Import directly from Supabase
 */

// ============================================================================
// Utilities Only - No Type Re-exports
// ============================================================================
export {
	toCamelCase,
	toSnakeCase,
	keysToCamelCase,
	keysToSnakeCase
} from './utils/case-conversion'

// API Client - Native fetch utilities
export { apiClient, get, post, put, del } from './utils/api-client'
export type { FetchResponse } from './utils/api-client'

// ============================================================================
// DIRECT SUPABASE IMPORT - Use this everywhere instead of re-exports
// ============================================================================

// Import Database and Constants - direct from Supabase types
export type { Database } from './types/supabase-generated'
export { Constants } from './types/supabase-generated'

// Import constants for creating derived types
import { Constants as ImportedConstants } from './types/supabase-generated'

// Export enum constants for easier usage
export const PRIORITY = ImportedConstants.public.Enums.Priority
export type Priority = typeof PRIORITY[number]

export const UNIT_STATUS = ImportedConstants.public.Enums.UnitStatus
export type UnitStatus = typeof UNIT_STATUS[number]

// ============================================================================
// Utility Functions Only
// ============================================================================

export { formatCurrency } from './utils/currency'
export {
	getPriorityLabel,
	getPriorityColor,
	getRequestStatusLabel,
	getRequestStatusColor
} from './utils/maintenance'

// Stripe utilities
export { getPriceId, getAllPlans, formatPrice, getAnnualSavings } from './stripe/config'
export type { PlanType, BillingPeriod } from './types/stripe'

// ============================================================================
// Constants (if any exist)
// ============================================================================

// Export security permissions enum
export { Permission } from './types/security'

// Export billing constants
export { PLAN_TYPE, PLAN_TYPE_OPTIONS, PLANS } from './constants/billing'

// Export error types for backend
export type { 
	BusinessErrorCode, 
	FastifyErrorResponse, 
	FastifyBusinessErrorResponse,
	ErrorLogContext 
} from './types/fastify-errors'

// Export error types for frontend
export type {
	AppError,
	AuthError,
	ValidationError,
	NetworkError,
	ServerError,
	BusinessError,
	FileUploadError,
	PaymentError,
	ErrorContext
} from './types/errors'

// Export logger types
export type {
	ILogger,
	LogContext,
	AnalyticsEvent,
	LogEntry,
	LoggerConfig
} from './types/logger'

// Export maintenance constants and types from validation
export { 
	maintenancePrioritySchema,
	maintenanceStatusSchema,
	maintenanceCategorySchema 
} from './validation/maintenance'

export type { 
	MaintenanceRequestInput,
	MaintenanceRequest,
	MaintenanceRequestUpdate,
	MaintenanceStats,
	MaintenancePriorityValidation,
	MaintenanceStatusValidation,
	MaintenanceCategoryValidation,
	MaintenanceRequestFormData,
	MaintenanceRequestFormOutput
} from './validation/maintenance'

// Export form schema for use in components
export { maintenanceRequestFormSchema } from './validation/maintenance'

// Export maintenance category constants
export const MAINTENANCE_CATEGORY = {
	GENERAL: 'GENERAL',
	PLUMBING: 'PLUMBING', 
	ELECTRICAL: 'ELECTRICAL',
	HVAC: 'HVAC',
	APPLIANCES: 'APPLIANCES',
	SAFETY: 'SAFETY',
	OTHER: 'OTHER'
} as const

export type MaintenanceCategory = keyof typeof MAINTENANCE_CATEGORY

// Export unit validation types
export type {
	UnitInput,
	UnitUpdate,
	UnitQuery,
	UnitFormData,
	UnitFormOutput
} from './validation/units'

// Export unit schemas for components
export { unitInputSchema, unitUpdateSchema, unitQuerySchema, unitStatusSchema, unitFormSchema } from './validation/units'

// Export property validation types
export type {
	PropertyInput,
	PropertyUpdate,
	PropertyQuery
} from './validation/properties'

// Export property schemas for components
export { propertyInputSchema, propertyUpdateSchema, propertyQuerySchema, propertyStatusSchema } from './validation/properties'

// Export lease validation types
export type {
	CreateLeaseInput,
	UpdateLeaseInput,
	LeaseInput,
	LeaseQuery
} from './validation/leases'

// Export tenant validation types
export type {
	TenantInput,
	TenantQuery
} from './validation/tenants'

// Import types for aliases
import type { UnitInput, UnitUpdate } from './validation/units'
import type { PropertyInput, PropertyUpdate } from './validation/properties'
import type { TenantInput, TenantUpdate } from './validation/tenants'
import type { MaintenanceRequestInput, MaintenanceRequestUpdate } from './validation/maintenance'

// Create aliases for frontend compatibility
export type CreateUnitRequest = UnitInput
export type CreateUnitInput = UnitInput
export type CreatePropertyInput = PropertyInput
export type UpdatePropertyInput = PropertyUpdate
export type CreateTenantInput = TenantInput
export type UpdateTenantInput = TenantUpdate
export type CreateMaintenanceInput = MaintenanceRequestInput
export type UpdateMaintenanceInput = MaintenanceRequestUpdate
export type UpdateUnitInput = UnitUpdate

// Export auth types
export type { 
	User, 
	UserRole, 
	ValidatedUser, 
	AuthServiceValidatedUser, 
	SupabaseUser,
	AuthUser,
	LoginCredentials,
	RegisterCredentials,
	AuthResponse,
	RefreshTokenRequest,
	AuthFormState
} from './types/auth'

// Export auth constants for runtime usage
export { USER_ROLE, USER_ROLE_OPTIONS } from './constants/auth'

// Export database entity types
export type { 
	Property, 
	Tenant, 
	Lease, 
	Unit, 
	PropertyInsert,
	TenantInsert,
	LeaseInsert,
	UnitInsert
} from './types/database'

// Export dashboard stats types for frontend/backend sharing
export type {
	PropertyStats,
	TenantStats,
	UnitStats,
	LeaseStats,
	DashboardStats,
	ActivityItem
} from './types/dashboard-stats'

// Export activity types
export type { ActivityType } from './types/activity'

// Export blog types
export type { BlogArticleWithDetails } from './types/blog'

// Export invoice types
export type { CustomerInvoiceForm } from './types/invoices'

// Export Stripe types
export type { PaymentMethod } from './types/stripe'

// Export relation types that frontend needs
export type { 
	PropertyWithUnits,
	PropertyWithDetails,
	PropertyWithFullDetails,
	PropertySummary,
	PropertyFormData,
	PropertyStatsExtended,
	PropertySearchResult,
	PropertyFilters,
	UnitWithDetails,
	UnitWithProperty,
	MaintenanceRequestWithRelations,
	MaintenanceRequestWithDetails,
	LeaseWithDetails,
	LeaseWithRelations,
	TenantWithLeases,
	TenantWithDetails
} from './types/relations'

// Export notification types (use Database enums instead of custom types)
export { NotificationType } from './types/notifications'
export type {
	NotificationData,
	NotificationResponse,
	MaintenanceNotificationData
} from './types/notifications'

// Export Subscription type from database
export type { Subscription } from './types/database'

// Export frontend store and UI types
export type {
	AppNotification,
	RecentActivity,
	UIPreferences,
	UserSession,
	AppState,
	NotificationLevel,
	Theme
} from './types/frontend'

// Export frontend utility types
export type {
	NavItem,
	TabItem,
	BreadcrumbItem
} from './types/frontend-utils'

// Export UI component props
export type {
	EnhancedElementsProviderProps,
	UnitFormProps,
	FormState,
	FormErrors
} from './types/ui'

// Export API response types
export type { 
	ControllerApiResponse, 
	MaintenanceRequestApiResponse,
	UpdateUserProfileInput
} from './types/api'

// Export webhook types for Stripe integration
export type {
	StripeWebhookEventType,
	StripeWebhookEvent,
	WebhookNotification,
	WebhookProcessorFunction,
	StripeWebhookProcessor
} from './types/webhook'

// Export analytics types
export type { TenantFlowEvent } from './types/analytics'


// ============================================================================
// STOP - No more type duplications allowed beyond this point  
// ============================================================================