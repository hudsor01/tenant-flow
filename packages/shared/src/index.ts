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

// Frontend Logging - Direct Pino usage (no wrappers)
export { logger } from './lib/frontend-logger'

// Supabase Client - Typed client instances
export { supabaseClient, supabaseAdmin, getCurrentUser, getCurrentSession, signOut } from './lib/supabase-client'

// ============================================================================
// DIRECT SUPABASE IMPORT - Use this everywhere instead of re-exports
// ============================================================================

// Import Database and Constants - direct from Supabase types
export type { 
	Database, 
	Tables, 
	TablesInsert, 
	TablesUpdate, 
	Enums 
} from './types/supabase-generated'
export { Constants } from './types/supabase-generated'

// Import types for creating derived types
import type { Tables } from './types/supabase-generated'
import { Constants as ImportedConstants } from './types/supabase-generated'

// Native Supabase table types - ULTRA-NATIVE pattern
export type Lease = Tables<'Lease'>
export type Tenant = Tables<'Tenant'> 
export type Property = Tables<'Property'>
export type Unit = Tables<'Unit'>
export type Payment = Tables<'RentPayment'>

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
	MaintenanceRequestUpdate,
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

// Export auth types including User from supabase.ts
export type { 
	User,
	Subscription,
	Invoice,
	MaintenanceRequest,
	Document,
	Activity,
	TenantFlowNotification,
	RentPayment,
	PaymentMethod,
	UserInsert,
	PropertyInsert,
	TenantInsert
} from './types/supabase'

export type { 
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

// ============================================================================
// ULTRA-NATIVE: Import Supabase types directly from generated source
// ============================================================================
// 
// Apps should import directly from generated types:
//
// import type { Tables, TablesInsert, Database } from '@repo/shared/types/supabase-generated'  
// type User = Tables<'User'>
// type Property = Tables<'Property'>
// type UserInsert = TablesInsert<'User'>
//
// This eliminates unnecessary re-export layers and follows native patterns
// ============================================================================

// Export dashboard stats types
export type {
	BaseStats,
	PropertyStats,
	TenantStats,
	UnitStats,
	LeaseStats,
	MaintenanceStats,
	DashboardStats
} from './types/stats'

// Export activity types
export type { ActivityType } from './types/activity'

// Export blog types
export type { BlogArticleWithDetails } from './types/blog'

// Export invoice types
export type { CustomerInvoiceForm } from './types/invoices'

// Export Stripe types (PaymentMethod exported above from supabase types)

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

// Subscription now exported above from supabase.ts

// Export frontend types - CONSOLIDATED THEME SYSTEM
export type {
	CalendarEvent,
	UseModalReturn,
	Theme,
	ThemeContextType,
	SidebarContextType,
	IconProps,
	FormFieldError,
	FormState,
	DashboardStat,
	MapMarker,
	MapConfig,
	ChartDataPoint,
	ChartConfig,
	UIPreferences,
	UserSession,
	RecentActivity,
	AppNotification,
	// Comprehensive theme system exports
	ThemeMode,
	ThemeColors,
	ThemeRadius,
	ThemeColorStateParams,
	ThemeProviderProps,
	ThemeCSSVariables,
	ThemePreset,
	ThemePresetValue,
	// Layout preference exports
	SidebarVariant,
	SidebarCollapsible,
	ContentLayout
} from './types/frontend'

// Export theme constants and options
export {
	THEME_MODE_OPTIONS,
	THEME_MODE_VALUES,
	THEME_PRESET_OPTIONS,
	THEME_PRESET_VALUES,
	SIDEBAR_VARIANT_OPTIONS,
	SIDEBAR_VARIANT_VALUES,
	SIDEBAR_COLLAPSIBLE_OPTIONS,
	SIDEBAR_COLLAPSIBLE_VALUES,
	CONTENT_LAYOUT_OPTIONS,
	CONTENT_LAYOUT_VALUES
} from './types/frontend'

// Export UI extension types
export type {
	LeaseUIExtended,
	TenantUIExtended,
	PaymentUIExtended,
	InvoiceUIExtended,
	PaymentUIStatus
} from './types/ui-extensions'

export {
	mapPaymentStatusToUI,
	mapLeaseStatusToUI
} from './types/ui-extensions'

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

// Export lease generator types
export type {
	USState,
	PropertyType,
	LeaseTermType,
	LeaseFormData,
	StateLeaseRequirements,
	GeneratedLease,
	UserLeaseHistory,
	LeaseGenerationPricing,
	LeaseGenerationResponse,
	LeaseValidationResponse
} from './types/lease-generator.types'

// Export CSP configuration utilities (unified CSP/CORS alignment)
export {
	generateCSPDirectives,
	cspDirectivesToString,
	getProductionCSP,
	getDevelopmentCSP,
	getCSPString,
	CSP_DOMAINS
} from './security/csp-config'

// Export CORS configuration utilities (aligned with CSP)
export {
	getCORSOrigins,
	getCORSOriginsForEnv,
	getCORSConfig,
	APP_DOMAINS
} from './security/cors-config'

// ============================================================================
// STOP - No more type duplications allowed beyond this point  
// ============================================================================