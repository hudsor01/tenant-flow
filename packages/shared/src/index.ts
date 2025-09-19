/**
 * @repo/shared - Modern TypeScript 5.9.2 Consolidated Package
 *
 * ULTRA-NATIVE: Direct Supabase types + essential utilities only
 * NO LEGACY COMPATIBILITY - All code must migrate to modern patterns
 */

// PRIMARY EXPORT: Modern TypeScript 5.9.2 Core Types
// All types exported via types/index.ts which includes core types
export * from './types'

// ESSENTIAL UTILITIES (No Wrappers)
// Browser-only API client (Supabase SSR) - Frontend specific
export { apiClient } from './utils/api-client'

export { logger } from './lib/frontend-logger'
export {
	getCurrentSession,
	getCurrentUser,
	getSupabaseAdmin,
	getSupabaseAdminInstance,
	getSupabaseClientInstance,
	signOut,
	supabaseClient
} from './lib/supabase-client'

export { getCORSConfig } from './security/cors-config'
export { getCSPString } from './security/csp-config'
export {
	formatPrice,
	getAllPlans,
	getAnnualSavings,
	getPriceId
} from './stripe/config'
export { formatCurrency } from './utils/currency'

// PRICING CONFIGURATION (Static + Dynamic)
export {
	FrontendPricingService,
	calculateAnnualSavings as calculateAnnualSavingsPercentage,
	dynamicPlanToPricingConfig,
	findPlanByPriceId,
	formatPrice as formatDynamicPrice,
	getPriceIdForPlan,
	type DynamicPlan,
	type DynamicPricingConfig,
	type DynamicPricingService,
	type UseDynamicPricingReturn
} from './config/dynamic-pricing'
export * from './config/pricing'

export {
	keysToCamelCase,
	keysToSnakeCase,
	toCamelCase,
	toSnakeCase
} from './utils/case-conversion'

export {
	getPriorityColor,
	getPriorityLabel,
	getRequestStatusColor,
	getRequestStatusLabel
} from './utils/maintenance'

export {
	cn,
	cssVar,
	extractTailwindClasses,
	generateTailwindTheme,
	getColorVariantClasses,
	getTailwindColor,
	isValidTailwindClass,
	responsive
} from './utils/tailwind'

export type { ClassValue, TailwindBreakpoint } from './utils/tailwind'

// ESSENTIAL DOMAIN CONSTANTS
export { USER_ROLE } from './constants/auth'
export { PLANS, PLAN_TYPE } from './constants/billing'
export { Permission } from './types/security'

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
} from './constants/design-system'

export type {
	AnimationDuration,
	AnimationEasing,
	BorderRadiusSize,
	Breakpoint,
	ComponentSize,
	ShadowSize,
	SpacingSize,
	TypographyVariant,
	ZIndexLevel
} from './constants/design-system'

// APPLE MOTION SYSTEM - OBSESSION-WORTHY INTERACTIONS
export {
	APPLE_CSS_VARS,
	APPLE_DURATIONS,
	APPLE_EASINGS,
	APPLE_GLASS,
	APPLE_MOTION_PRESETS,
	APPLE_RADIUS,
	APPLE_SHADOWS,
	APPLE_TOUCH_TARGETS,
	APPLE_TRANSFORMS
} from './constants/motion-system'

export type {
	AppleDuration,
	AppleEasing,
	AppleGlass,
	AppleMotionPreset,
	AppleRadius,
	AppleShadow,
	AppleTouchTarget,
	AppleTransform
} from './constants/motion-system'

// APPLE COLOR SYSTEM - EXACT PALETTE FOR DASHBOARD ANALYTICS
export {
	APPLE_ACCESSIBLE_PAIRS,
	APPLE_CHART_PALETTES,
	APPLE_GRADIENTS,
	APPLE_SYSTEM_COLORS,
	PROPERTY_ANALYTICS_COLORS
} from './constants/apple-colors'

export type {
	AppleChartPalette,
	AppleGradient,
	AppleSystemColor,
	PropertyAnalyticsColorCategory
} from './constants/apple-colors'

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
export type {
	LeaseFormData,
	StateLeaseRequirements
} from './types/lease-generator.types'
export {
	emailSchema,
	nonNegativeNumberSchema,
	positiveNumberSchema,
	requiredDescription,
	requiredString,
	requiredTitle,
	uuidSchema
} from './validation/common'
export { unitStatusSchema } from './validation/units'

// BACKEND TYPES (Required for Controllers/Services)
export type {
	AuthFormState,
	AuthResponse,
	AuthServiceValidatedUser,
	AuthState,
	AuthUser,
	LoginCredentials,
	RefreshTokenRequest,
	RegisterCredentials,
	SupabaseUser,
	SupabaseWebhookEvent,
	UserRole,
	ValidatedUser
} from './types/auth'

export type {
	BusinessErrorCode,
	ErrorLogContext,
	FastifyBusinessErrorResponse,
	FastifyErrorResponse
} from './types/fastify-errors'

export type { MaintenanceNotificationData } from './types/notifications'
export type { PropertyWithUnits } from './types/relations'
export type { BillingPeriod, PlanType } from './types/stripe'

// FRONTEND TYPES
export * from './types/frontend'

// VALIDATION SCHEMAS
export { loginZodSchema, registerZodSchema } from './validation/auth'
