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

// Export auth types
export type { 
	User, 
	UserRole, 
	ValidatedUser, 
	AuthServiceValidatedUser, 
	SupabaseUser,
	AuthUser
} from './types/auth'

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
	UnitWithDetails,
	UnitWithProperty,
	MaintenanceRequestWithRelations,
	LeaseWithDetails,
	LeaseWithRelations
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

// Export API response types
export type { ControllerApiResponse, MaintenanceRequestApiResponse } from './types/api'

// Export webhook types for Stripe integration
export type {
	StripeWebhookEventType,
	WebhookNotification,
	WebhookProcessorFunction
} from './types/webhook'

// ============================================================================
// STOP - No more type duplications allowed beyond this point  
// ============================================================================