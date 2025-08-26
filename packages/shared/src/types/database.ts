/**
 * Database and Entity Types
 * Shared database types that can be used by both frontend and backend
 */

import type { Database } from './supabase-generated'

// ============================================================================
// Database Table Types
// ============================================================================

export type Tables = Database['public']['Tables']
export type User = Tables['User']['Row']
export type Property = Tables['Property']['Row']
export type Tenant = Tables['Tenant']['Row']
export type Lease = Tables['Lease']['Row']
export type Unit = Tables['Unit']['Row']
export type Subscription = Tables['Subscription']['Row']
export type MaintenanceRequest = Tables['MaintenanceRequest']['Row']
export type Document = Tables['Document']['Row']

// Insert types
export type UserInsert = Tables['User']['Insert']
export type PropertyInsert = Tables['Property']['Insert']
export type TenantInsert = Tables['Tenant']['Insert']
export type LeaseInsert = Tables['Lease']['Insert']
export type UnitInsert = Tables['Unit']['Insert']
export type SubscriptionInsert = Tables['Subscription']['Insert']
export type MaintenanceRequestInsert = Tables['MaintenanceRequest']['Insert']
export type DocumentInsert = Tables['Document']['Insert']

// Update types
export type UserUpdate = Tables['User']['Update']
export type PropertyUpdate = Tables['Property']['Update']
export type TenantUpdate = Tables['Tenant']['Update']
export type LeaseUpdate = Tables['Lease']['Update']
export type UnitUpdate = Tables['Unit']['Update']
export type SubscriptionUpdate = Tables['Subscription']['Update']
export type MaintenanceRequestUpdate = Tables['MaintenanceRequest']['Update']
export type DocumentUpdate = Tables['Document']['Update']

// Repository interface removed - use native Supabase client methods directly

// ============================================================================
// Utility Types for Database Operations
// ============================================================================

export type Nullable<T> = T | null | undefined

export type DatabaseRow<T extends keyof Tables> = Tables[T]['Row']
export type DatabaseInsert<T extends keyof Tables> = Tables[T]['Insert']
export type DatabaseUpdate<T extends keyof Tables> = Tables[T]['Update']
