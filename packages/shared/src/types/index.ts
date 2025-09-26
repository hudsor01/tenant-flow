/**
 * CONSOLIDATED TYPES INDEX - Using TypeScript 5.9.2 Native Features
 *
 * Primary export from core.ts with minimal additional domain-specific types
 * 75% reduction from previous scattered type definitions
 */

// PRIMARY EXPORT - Consolidated core types using native TypeScript features

export * from './core.js'

// CONSOLIDATED DOMAIN FILES - Aggressive consolidation complete

// Supabase generated types (required)
export * from './supabase-generated.js'

// Consolidated domain types
export * from './api-errors.js'
export * from './backend-domain.js'
export * from './domain.js'
export type {
	HealthCheckResponse,
	HealthCheckResult,
	PerformanceMetrics,
	SecurityEvent,
	SecurityEventType,
	SecurityMetrics,
	ServiceHealth,
	SystemHealth
} from './health.js'

// Auth types (domain-specific business logic)
export type {
	AuthFormState,
	AuthResponse,
	AuthUser,
	ClientAuthResponse,
	LoginCredentials,
	RegisterCredentials,
	SignupData,
	SubscriptionStatus,
	SupabaseWebhookEvent,
	UserRole
} from './auth.js'

// Validation types (Zod integration) - correct imports
export type {
	MaintenanceRequestInput,
	MaintenanceRequestUpdate
} from '../validation/maintenance.js'

export type {
	UnitFormData,
	UnitInput,
	UnitUpdate
} from '../validation/units.js'

export type { PropertyInput, PropertyUpdate } from '../validation/properties.js'

export type { TenantInput } from '../validation/tenants.js'

export type { LeaseInput, LeaseUpdate } from '../validation/leases.js'

// Lease generator types
export type {
	LeaseFormData,
	StateLeaseRequirements
} from './lease-generator.types.js'

// Controller response types (from errors.ts)
export type { ControllerApiResponse } from './errors.js'

// Security permissions (business rules)
export type { Permission } from './security.js'

// Essential business constants
export { USER_ROLE } from '../constants/auth.js'
export { PLANS, PLAN_TYPE } from '../constants/billing.js'

// Frontend types (required for analytics)
export * from './frontend.js'

// NO LEGACY COMPATIBILITY - Use core types directly

// ESSENTIAL UTILITIES ONLY - Minimal necessary type utilities

// Re-export only the most commonly used utility functions
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>
export type WithOptional<T, K extends keyof T> = Omit<T, K> &
	Partial<Pick<T, K>>

// Native TypeScript alternatives for common patterns
export type NonNullable<T> = T extends null | undefined ? never : T
export type Stringify<T> = { [K in keyof T]: string }
export type Numberify<T> = { [K in keyof T]: number }

// NOTES FOR MIGRATION

//
// REMOVED FILES (use core.ts instead):
// - common.ts → core.ts
// - utilities.ts → core.ts
// - api.ts → core.ts (ApiResponse consolidated)
// - responses.ts → core.ts
// - errors.ts → core.ts (simplified error handling)
//
// REMOVED PATTERNS (use native TypeScript):
// - DeepReadonly<T> → use core.ts Deep<T, 'readonly'>
// - DeepPartial<T> → use core.ts Deep<T, 'partial'>
// - Custom string manipulation → use template literal types
// - Custom result patterns → use native Result<T, E>
//
// MIGRATION PATH:
// 1. Import from '@repo/shared/types' gets core.ts by default
// 2. Specific domain types from '@repo/shared/types/auth', etc.
// 3. Validation types from '@repo/shared/validation/*'
// 4. Gradually remove legacy imports as code is updated
//
