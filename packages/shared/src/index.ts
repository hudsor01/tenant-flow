/**
 * @repo/shared - Modern TypeScript 5.9.2 Consolidated Package
 * 
 * ULTRA-NATIVE: Direct Supabase types + essential utilities only
 * NO LEGACY COMPATIBILITY - All code must migrate to modern patterns
 */

// ============================================================================
// PRIMARY EXPORT: Modern TypeScript 5.9.2 Core Types
// ============================================================================
export * from './types/core'
export * from './types'

// ============================================================================
// ESSENTIAL UTILITIES (No Wrappers)
// ============================================================================
// NOTE: Browser-only API client is intentionally NOT re-exported from the root
// to avoid pulling '@supabase/ssr' into Node backends. Frontend apps should
// import from './utils/api-client' directly when needed.

export { supabaseClient, supabaseAdmin, getCurrentUser, getCurrentSession, signOut } from './lib/supabase-client'
export { logger } from './lib/frontend-logger'

export { formatCurrency } from './utils/currency'
export { getCORSConfig } from './security/cors-config'
export { getPriceId, getAllPlans, formatPrice, getAnnualSavings } from './stripe/config'

// ============================================================================
// PRICING CONFIGURATION (Static + Dynamic)
// ============================================================================
export * from './config/pricing'
export { 
  calculateAnnualSavings as calculateAnnualSavingsPercentage,
  formatPrice as formatDynamicPrice,
  findPlanByPriceId,
  getPriceIdForPlan,
  type DynamicPricingConfig,
  type DynamicPlan,
  type DynamicPricingService,
  FrontendPricingService,
  dynamicPlanToPricingConfig
} from './config/dynamic-pricing'

export {
  toCamelCase,
  toSnakeCase,
  keysToCamelCase,
  keysToSnakeCase
} from './utils/case-conversion'

export {
  getPriorityLabel,
  getPriorityColor,
  getRequestStatusLabel,
  getRequestStatusColor
} from './utils/maintenance'

export {
  cn,
  getTailwindColor,
  getColorVariantClasses,
  responsive,
  cssVar,
  generateTailwindTheme,
  isValidTailwindClass,
  extractTailwindClasses
} from './utils/tailwind'

export type { ClassValue, TailwindBreakpoint } from './utils/tailwind'

// ============================================================================
// ESSENTIAL DOMAIN CONSTANTS
// ============================================================================
export { Permission } from './types/security'
export { PLAN_TYPE, PLANS } from './constants/billing'
export { USER_ROLE } from './constants/auth'

export {
  FONT_FAMILIES,
  TYPOGRAPHY_SCALE,
  SPACING_SCALE,
  SEMANTIC_COLORS,
  COMPONENT_SIZES,
  BORDER_RADIUS_SCALE,
  SHADOW_SCALE,
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  BREAKPOINTS,
  CONTAINER_SIZES,
  Z_INDEX_SCALE,
  COMPONENT_PRESETS
} from './constants/design-system'

export type {
  SpacingSize,
  TypographyVariant,
  ComponentSize,
  BorderRadiusSize,
  ShadowSize,
  AnimationDuration,
  AnimationEasing,
  Breakpoint,
  ZIndexLevel
} from './constants/design-system'

// ============================================================================
// APPLE MOTION SYSTEM - OBSESSION-WORTHY INTERACTIONS
// ============================================================================
export {
  APPLE_EASINGS,
  APPLE_DURATIONS,
  APPLE_TOUCH_TARGETS,
  APPLE_TRANSFORMS,
  APPLE_SHADOWS,
  APPLE_RADIUS,
  APPLE_GLASS,
  APPLE_MOTION_PRESETS,
  APPLE_CSS_VARS
} from './constants/motion-system'

export type {
  AppleEasing,
  AppleDuration,
  AppleTouchTarget,
  AppleTransform,
  AppleShadow,
  AppleRadius,
  AppleGlass,
  AppleMotionPreset
} from './constants/motion-system'

export const MAINTENANCE_CATEGORY = {
  GENERAL: 'GENERAL',
  PLUMBING: 'PLUMBING', 
  ELECTRICAL: 'ELECTRICAL',
  HVAC: 'HVAC',
  APPLIANCES: 'APPLIANCES',
  SAFETY: 'SAFETY',
  OTHER: 'OTHER'
} as const

// ============================================================================
// ESSENTIAL VALIDATION (Domain-Specific Only)
// ============================================================================
export { emailSchema, requiredString, positiveNumberSchema, nonNegativeNumberSchema } from './validation/common'
export { unitStatusSchema } from './validation/units'
export type { LeaseFormData } from './types/lease-generator.types'

// ============================================================================
// BACKEND TYPES (Required for Controllers/Services)
// ============================================================================
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

export type { 
  BusinessErrorCode, 
  FastifyErrorResponse, 
  FastifyBusinessErrorResponse,
  ErrorLogContext 
} from './types/fastify-errors'

export type { PlanType, BillingPeriod } from './types/stripe'
export type { MaintenanceNotificationData } from './types/notifications'
export type { PropertyWithUnits } from './types/relations'
export type { ThemeColors, ThemeRadius, SVGPatternProps } from './types/frontend'

// ============================================================================
// MIGRATION NOTE: All legacy aliases removed
// 
// OLD → NEW:
// - ApiResponse → use native Result<T, E> pattern
// - PaginationParams → use Pagination interface
// - StandardApiResponse → use ApiResponse<T>
// - LoadingState/ActionStatus → use Status type
// - CreateInput/UpdateInput → use native Omit<T, 'id'> patterns
// ============================================================================
