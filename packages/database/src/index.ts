// Database package now serves as a re-export of Supabase types from shared
// This maintains backward compatibility while removing Prisma dependency

import type { Database } from '@repo/shared/types/supabase-generated'

// Re-export all database types from shared Supabase types
export * from '@repo/shared/types/supabase-generated'
export type { Database } from '@repo/shared/types/supabase-generated'

// Export Prisma compatibility layer for gradual migration
export {
	PrismaClient,
	Prisma,
	PrismaClientKnownRequestError,
	PrismaClientUnknownRequestError,
	PrismaClientRustPanicError,
	PrismaClientInitializationError,
	PrismaClientValidationError,
	// Export enum values as constants
	UserRole,
	PropertyType,
	UnitStatus,
	LeaseStatus,
	Priority,
	RequestStatus,
	SubStatus,
	PlanType,
	DocumentType,
	ActivityEntityType,
	ReminderType,
	ReminderStatus,
	BlogCategory,
	BlogStatus,
	CustomerInvoiceStatus
} from './prisma-compat'

// Export type aliases for backward compatibility with existing code
export type User = Database['public']['Tables']['User']['Row']
export type Property = Database['public']['Tables']['Property']['Row']
export type Unit = Database['public']['Tables']['Unit']['Row']
export type Tenant = Database['public']['Tables']['Tenant']['Row']
export type Lease = Database['public']['Tables']['Lease']['Row']
export type MaintenanceRequest =
	Database['public']['Tables']['MaintenanceRequest']['Row']
export type Subscription = Database['public']['Tables']['Subscription']['Row']
export type Invoice = Database['public']['Tables']['Invoice']['Row']
export type Document = Database['public']['Tables']['Document']['Row']
export type File = Database['public']['Tables']['File']['Row']
export type Activity = Database['public']['Tables']['Activity']['Row']
export type BlogArticle = Database['public']['Tables']['BlogArticle']['Row']
export type BlogTag = Database['public']['Tables']['BlogTag']['Row']
export type CustomerInvoice =
	Database['public']['Tables']['CustomerInvoice']['Row']
export type CustomerInvoiceItem =
	Database['public']['Tables']['CustomerInvoiceItem']['Row']
export type PaymentFailure =
	Database['public']['Tables']['PaymentFailure']['Row']
export type UserPreferences =
	Database['public']['Tables']['UserPreferences']['Row']
export type UserFeatureAccess =
	Database['public']['Tables']['UserFeatureAccess']['Row']
export type UserSession = Database['public']['Tables']['UserSession']['Row']
export type ReminderLog = Database['public']['Tables']['ReminderLog']['Row']

// Export health check utilities
export { checkDatabaseConnection } from './health'
export type { DatabaseHealthResult } from './health'
