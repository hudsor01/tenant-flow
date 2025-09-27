/**
 * @repo/shared - Modern TypeScript 5.9.2 Consolidated Package
 *
 * ULTRA-NATIVE: Direct Supabase types + essential utilities only
 * NO LEGACY COMPATIBILITY - All code must migrate to modern patterns
 */

// PRIMARY EXPORT: Modern TypeScript 5.9.2 Core Types
// All types exported via types/index.ts which includes core types
export * from './types/index.js'

// ESSENTIAL UTILITIES (No Wrappers)
// Browser-only API client (Supabase SSR) - Frontend specific
export { apiClient } from './utils/api-client.js'

export { createLogger, logger } from './lib/frontend-logger.js'
export {
	getCurrentSession,
	getCurrentUser,
	getSupabaseAdmin,
	getSupabaseAdminInstance,
	getSupabaseClientInstance,
	signOut,
	supabaseClient
} from './lib/supabase-client.js'

export { getCORSConfig } from './security/cors-config.js'
export { getCSPString } from './security/csp-config.js'
export { getAllPlans, getPriceId } from './stripe/config.js'
export { formatCurrency } from './utils/currency.js'

// PRICING CONFIGURATION (Static Only)
export * from './config/pricing.js'

export {
	keysToCamelCase,
	keysToSnakeCase,
	toCamelCase,
	toSnakeCase
} from './utils/case-conversion.js'

export {
	getPriorityColor,
	getPriorityLabel,
	getRequestStatusColor,
	getRequestStatusLabel
} from './utils/maintenance.js'

// ESSENTIAL DOMAIN CONSTANTS
export { USER_ROLE } from './constants/auth.js'
export { PLANS, PLAN_TYPE } from './constants/billing.js'
export type { Permission } from './types/security.js'

// Lease Generator Types (for PDF generation feature)
export type {
	LeaseFormData as LeaseGeneratorFormData,
	StateLeaseRequirements
} from './types/lease-generator.types.js'

export {
	ANIMATION_DURATIONS,
	ANIMATION_EASINGS,
	BORDER_RADIUS_SCALE,
	BREAKPOINTS,
	COMPONENT_PRESETS,
	COMPONENT_SIZES,
	CONTAINER_SIZES,
	FONT_FAMILIES,
	SEMANTIC_COLORS,
	SHADOW_SCALE,
	SPACING_SCALE,
	TYPOGRAPHY_SCALE,
	Z_INDEX_SCALE
} from './constants/design-system.js'

export type {
	AnimationDuration,
	AnimationEasing,
	BorderRadiusSize,
	Breakpoint,
	ComponentSize,
	TypographyVariant as DesignSystemTypographyVariant,
	ShadowSize,
	SpacingSize,
	ZIndexLevel
} from './constants/design-system.js'

// TYPOGRAPHY TOKEN BRIDGE
export {
	SEMANTIC_TYPOGRAPHY,
	TOKEN_TO_TAILWIND_MAP,
	TYPOGRAPHY_SCALE_MIGRATION,
	TYPOGRAPHY_TOKENS,
	getSemanticTypography,
	getTypographyClassName,
	getTypographyClasses,
	getTypographyToken,
	migrateTypographyScale
} from './constants/typography-tokens.js'

export type {
	SemanticTypographyVariant,
	TypographyProps,
	TypographyVariant
} from './constants/typography-tokens.js'

// MOTION SYSTEM - PROFESSIONAL INTERACTIONS
export {
	MOTION_CSS_VARS,
	MOTION_DURATIONS,
	MOTION_EASINGS,
	MOTION_GLASS,
	MOTION_PRESETS,
	MOTION_RADIUS,
	MOTION_SHADOWS,
	MOTION_TOUCH_TARGETS,
	MOTION_TRANSFORMS
} from './constants/motion-tokens.js'

export type {
	MotionDuration,
	MotionEasing,
	MotionGlass,
	MotionPreset,
	MotionRadius,
	MotionShadow,
	MotionTouchTarget,
	MotionTransform
} from './constants/motion-tokens.js'

// DESIGN SYSTEM COLORS - DASHBOARD ANALYTICS
export {
	ACCESSIBLE_COLOR_PAIRS,
	CHART_GRADIENTS,
	CHART_PALETTES,
	PROPERTY_ANALYTICS_COLORS,
	SYSTEM_COLORS
} from './constants/chart-colors.js'

export type {
	ChartGradient,
	ChartPalette,
	PropertyAnalyticsColorCategory,
	SystemColor
} from './constants/chart-colors.js'

export const MAINTENANCE_CATEGORY = {
	GENERAL: 'GENERAL',
	PLUMBING: 'PLUMBING',
	ELECTRICAL: 'ELECTRICAL',
	HVAC: 'HVAC',
	APPLIANCES: 'APPLIANCES',
	SAFETY: 'SAFETY',
	OTHER: 'OTHER'
} as const

// ESSENTIAL VALIDATION (Domain-Specific Only)
export {
	emailSchema,
	nonNegativeNumberSchema,
	positiveNumberSchema,
	requiredDescription,
	requiredString,
	requiredTitle,
	uuidSchema
} from './validation/common.js'
export { unitStatusSchema } from './validation/units.js'

// BACKEND TYPES (Required for Controllers/Services)
export type {
	AuthFormState,
	AuthResponse,
	AuthState,
	GoogleOAuthUser,
	LoginCredentials,
	RefreshTokenRequest,
	RegisterCredentials,
	SupabaseWebhookEvent,
	UserRole,
	authUser
} from './types/auth.js'

export type { MaintenanceNotificationData } from './types/notifications.js'
export type { PropertyWithUnits } from './types/relations.js'
export type { BillingPeriod, PlanType } from './types/stripe.js'

// FRONTEND TYPES
export * from './types/frontend.js'

// VALIDATION SCHEMAS
export { loginZodSchema, registerZodSchema } from './validation/auth.js'
export {
	leaseInputSchema,
	leaseRenewalSchema,
	leaseTerminationSchema,
	leaseUpdateSchema,
	type CreateLeaseInput,
	type LeaseFormData,
	type LeaseRenewalData,
	type LeaseTerminationData,
	type UpdateLeaseInput
} from './validation/leases.js'
export {
	maintenanceRequestFormSchema,
	maintenanceRequestInputSchema,
	maintenanceRequestUpdateSchema,
	type MaintenanceRequestFormData,
	type MaintenanceRequestInput,
	type MaintenanceRequestUpdate
} from './validation/maintenance.js'
export {
	propertyFormSchema,
	propertyInputSchema,
	propertyUpdateSchema,
	type PropertyFormData,
	type PropertyInput,
	type PropertyUpdate
} from './validation/properties.js'
export {
	tenantFormSchema,
	tenantInputSchema,
	tenantUpdateSchema,
	type TenantFormData,
	type TenantInput,
	type TenantUpdate
} from './validation/tenants.js'
export {
	transformUnitFormData,
	unitFormSchema,
	unitInputSchema,
	unitUpdateSchema,
	type TransformedUnitData,
	type UnitFormData,
	type UnitInput,
	type UnitUpdate
} from './validation/units.js'
