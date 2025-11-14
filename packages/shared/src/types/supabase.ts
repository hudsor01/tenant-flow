/**
 * TenantFlow Supabase Types - ULTRA-NATIVE
 *
 * Minimal extensions to generated Supabase types.
 * Use Database['public']['Tables']['TableName']['Row'] directly when possible.
 * Only create aliases for business logic extensions.
 */

import type { Database as GeneratedDatabase } from './supabase-generated.js'
export type Database = GeneratedDatabase
export type { Json } from './supabase-generated.js'
export type Tables<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Update']

export type User = Database['public']['Tables']['users']['Row']
export type Property = Database['public']['Tables']['property']['Row']
export type Tenant = Database['public']['Tables']['tenant']['Row']
export type Lease = Database['public']['Tables']['lease']['Row']
export type Unit = Database['public']['Tables']['unit']['Row']
export type MaintenanceRequest =
	Database['public']['Tables']['maintenance_request']['Row']
export type Document = Database['public']['Tables']['document']['Row']