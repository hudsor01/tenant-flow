/**
 * TenantFlow Supabase Types - ULTRA-NATIVE
 *
 * Minimal extensions to generated Supabase types.
 * Use Database['public']['Tables']['TableName']['Row'] directly when possible.
 * Only create aliases for business logic extensions.
 */

import type { Database as GeneratedDatabase } from './supabase-generated.js'

// Re-export the generated database type
export type Database = GeneratedDatabase
export type { Json } from './supabase-generated.js'

// ONLY FOR BACKWARD COMPATIBILITY - prefer direct Database['public']['Tables'][T] usage
// These helpers exist only because removing them would break 100+ imports
export type Tables<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> =
	Database['public']['Enums'][T]

// LEGACY Type Aliases - DO NOT ADD MORE
// Existing code uses these, but new code should use Database['public']['Tables']['users']['Row'] directly

export type User = Database['public']['Tables']['users']['Row']
export type Property = Database['public']['Tables']['property']['Row']
export type Tenant = Database['public']['Tables']['tenant']['Row']
export type Lease = Database['public']['Tables']['lease']['Row']
export type Unit = Database['public']['Tables']['unit']['Row']
export type Subscription = Database['public']['Tables']['subscription']['Row']
export type Invoice = Database['public']['Tables']['invoice']['Row']
export type MaintenanceRequest =
	Database['public']['Tables']['maintenance_request']['Row']
export type Document = Database['public']['Tables']['document']['Row']
export type Activity = Database['public']['Tables']['activity']['Row']
// InAppNotification table doesn't exist in current schema
// export type TenantFlowNotification = Database['public']['Tables']['InAppNotification']['Row']
export type RentPayment = Database['public']['Tables']['rent_payment']['Row']
export type PaymentMethod =
	Database['public']['Tables']['payment_method']['Row']

// Insert type aliases - LEGACY
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type PropertyInsert = Database['public']['Tables']['property']['Insert']
export type TenantInsert = Database['public']['Tables']['tenant']['Insert']

// Custom JSON Metadata Types (Business Logic)

export interface TenantFlowUserMetadata {
	readonly preferences?: {
		readonly theme: 'light' | 'dark' | 'system'
		readonly notifications: {
			readonly email: boolean
			readonly sms: boolean
			readonly push: boolean
		}
		readonly dashboard: {
			readonly layout: 'grid' | 'list'
			readonly density: 'compact' | 'comfortable' | 'spacious'
		}
	}
	readonly onboarding?: {
		readonly completed: boolean
		readonly step: number
		readonly completedAt?: string
	}
	readonly analytics?: {
		readonly lastLogin?: string
		readonly loginCount?: number
		readonly ipAddress?: string
		readonly userAgent?: string
	}
	readonly [key: string]: unknown
}

export interface TenantFlowOrganizationSettings {
	readonly branding?: {
		readonly logo?: string
		readonly primaryColor?: string
		readonly accentColor?: string
	}
	readonly features?: {
		readonly maintenanceRequests: boolean
		readonly rentCollection: boolean
		readonly leaseManagement: boolean
		readonly reporting: boolean
	}
	readonly billing?: {
		readonly autoInvoicing: boolean
		readonly lateFees: {
			readonly enabled: boolean
			readonly amount?: number
			readonly type: 'fixed' | 'percentage'
		}
		readonly paymentMethods: readonly string[]
	}
	readonly [key: string]: unknown
}

export interface TenantFlowPropertyMetadata {
	readonly amenities?: readonly string[]
	readonly policies?: {
		readonly petPolicy?: string
		readonly smokingPolicy?: string
		readonly noisePolicy?: string
	}
	readonly utilities?: {
		readonly included?: readonly string[]
		readonly excluded?: readonly string[]
	}
	readonly [key: string]: unknown
}

// ULTRA-NATIVE: Import helpers directly from generated file
// Use: import type { Tables, TablesInsert, TablesUpdate } from './supabase-generated'

// Query Result Helpers (Official Supabase Pattern)

export type QueryResult<T> = T extends PromiseLike<infer U> ? U : never
export type QueryData<T> = T extends PromiseLike<{ data: infer U }> ? U : never
export type QueryError<T> =
	T extends PromiseLike<{ error: infer U }> ? U : never

// Example usage:
// const query = supabase.from('property').select(`id, name, unit(*)`)
// type PropertyWithUnits = QueryData<typeof query>

// ULTRA-NATIVE: No type aliases needed! Apps import directly:
// import type { Tables, TablesInsert } from '@repo/shared/types/supabase-generated'
// type User = Tables<'User'>
// type UserInsert = TablesInsert<'User'>

// Business Logic Helpers Only

// Type guards for runtime validation (business logic only)
export function isValidUser(entity: unknown): entity is User {
	return (
		typeof entity === 'object' &&
		entity !== null &&
		'id' in entity &&
		'email' in entity &&
		'createdAt' in entity
	)
}

export function isValidProperty(entity: unknown): entity is Property {
	return (
		typeof entity === 'object' &&
		entity !== null &&
		'id' in entity &&
		'name' in entity &&
		'address' in entity
	)
}
