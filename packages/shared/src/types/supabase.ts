/**
 * TenantFlow Official Supabase Types
 *
 * Clean, branded type definitions for all Supabase database entities.
 * This file serves as the single source of truth for database types,
 * eliminating duplication and ensuring type safety across the application.
 *
 * Generated from Supabase CLI and transformed into TenantFlow official types.
 */

import type { Database as DatabaseGenerated, Json } from './supabase-generated'

// ========================
// Enhanced Database Type with Custom JSON Schemas
// ========================

// Define custom JSON types for metadata fields
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

// Use the generated Database type directly
// When accessing JSON fields, cast them to the specific metadata types
export type Database = DatabaseGenerated

// Re-export Json type
export type { Json }

// ========================
// Type Shortcuts (Supabase Best Practices)
// ========================

// Helper type to extract table types from enhanced Database
type TablesType = Database['public']['Tables']
type EnumsType = Database['public']['Enums']
type TableRow<T extends keyof TablesType> = TablesType[T]['Row']
type TableInsert<T extends keyof TablesType> = TablesType[T]['Insert']
type TableUpdate<T extends keyof TablesType> = TablesType[T]['Update']

// Shorthand types for easy access (Supabase best practices)
export type Tables<T extends keyof TablesType> = TableRow<T>
export type TablesInsert<T extends keyof TablesType> = TableInsert<T>
export type TablesUpdate<T extends keyof TablesType> = TableUpdate<T>
export type Enums<T extends keyof EnumsType> = Database['public']['Enums'][T]

// ========================
// Query Result Types (for complex queries)
// ========================

// Helper types for query results - enables type-safe complex queries
export type QueryResult<T> = T extends PromiseLike<infer U> ? U : never
export type QueryData<T> = T extends PromiseLike<{ data: infer U }> ? U : never
export type QueryError<T> = T extends PromiseLike<{ error: infer U }> ? U : never

// Example usage:
// const query = supabase.from('properties').select(`
//   id, name, 
//   units(id, unitNumber),
//   organization(name)
// `)
// type PropertiesWithUnits = QueryData<typeof query>

// Common TenantFlow metadata pattern
export type TenantFlowMetadata = Readonly<Record<string, string | number | boolean | null>>;

// Base interface for all TenantFlow entities
export interface TenantFlowEntity {
  readonly id: string
  readonly createdAt: string
  readonly updatedAt?: string
}

// ========================
// Core Business Entities
// ========================

// User Management
export interface TenantFlowUser extends TenantFlowEntity {
  readonly email: string
  readonly name?: string | null
  readonly role: 'ADMIN' | 'USER' | 'MANAGER'
  readonly isActive: boolean
  readonly lastSignIn?: string | null
  readonly metadata?: TenantFlowMetadata
}

export interface CreateTenantFlowUserParams {
  readonly email: string
  readonly name?: string
  readonly role?: 'ADMIN' | 'USER' | 'MANAGER'
  readonly isActive?: boolean
  readonly metadata?: TenantFlowMetadata
}

export interface UpdateTenantFlowUserParams {
  readonly email?: string
  readonly name?: string
  readonly role?: 'ADMIN' | 'USER' | 'MANAGER'
  readonly isActive?: boolean
  readonly metadata?: TenantFlowMetadata
}

// Organization Management
export interface TenantFlowOrganization extends TenantFlowEntity {
  readonly name: string
  readonly ownerId: string
  readonly planType: 'FREETRIAL' | 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'
  readonly isActive: boolean
  readonly settings?: TenantFlowMetadata
}

export interface CreateTenantFlowOrganizationParams {
  readonly name: string
  readonly ownerId: string
  readonly planType?: 'FREETRIAL' | 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'
  readonly isActive?: boolean
  readonly settings?: TenantFlowMetadata
}

// Property Management
export interface TenantFlowProperty extends TenantFlowEntity {
  readonly name: string
  readonly address: string
  readonly city: string
  readonly state: string
  readonly zipCode: string
  readonly propertyType: 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED_USE'
  readonly unitsCount?: number | null
  readonly organizationId: string
  readonly managerId?: string | null
  readonly isActive: boolean
  readonly metadata?: TenantFlowMetadata
}

export interface CreateTenantFlowPropertyParams {
  readonly name: string
  readonly address: string
  readonly city: string
  readonly state: string
  readonly zipCode: string
  readonly propertyType: 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED_USE'
  readonly unitsCount?: number
  readonly organizationId: string
  readonly managerId?: string
  readonly isActive?: boolean
  readonly metadata?: TenantFlowMetadata
}

// Unit Management
export interface TenantFlowUnit extends TenantFlowEntity {
  readonly unitNumber: string
  readonly propertyId: string
  readonly bedrooms?: number | null
  readonly bathrooms?: number | null
  readonly squareFeet?: number | null
  readonly monthlyRent?: number | null
  readonly status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'UNAVAILABLE'
  readonly isActive: boolean
  readonly metadata?: TenantFlowMetadata
}

// Tenant Management
export interface TenantFlowTenant extends TenantFlowEntity {
  readonly firstName: string
  readonly lastName: string
  readonly email: string
  readonly phone?: string | null
  readonly dateOfBirth?: string | null
  readonly organizationId: string
  readonly currentLeaseId?: string | null
  readonly isActive: boolean
  readonly metadata?: TenantFlowMetadata
}

// Lease Management
export interface TenantFlowLease extends TenantFlowEntity {
  readonly unitId: string
  readonly tenantId: string
  readonly organizationId: string
  readonly startDate: string
  readonly endDate: string
  readonly monthlyRent: number
  readonly securityDeposit?: number | null
  readonly status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
  readonly leaseTerms?: string | null
  readonly isActive: boolean
  readonly metadata?: TenantFlowMetadata
}

// ========================
// Financial Entities
// ========================

// Subscription Management
export interface TenantFlowSubscription extends TenantFlowEntity {
  readonly userId: string
  readonly organizationId?: string | null
  readonly planType: 'FREETRIAL' | 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'
  readonly status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIALING' | 'INCOMPLETE'
  readonly stripeCustomerId?: string | null
  readonly stripeSubscriptionId?: string | null
  readonly stripePriceId?: string | null
  readonly currentPeriodStart?: string | null
  readonly currentPeriodEnd?: string | null
  readonly trialEnd?: string | null
  readonly cancelledAt?: string | null
  readonly metadata?: TenantFlowMetadata
}

// Payment Management
export interface TenantFlowPayment extends TenantFlowEntity {
  readonly amount: number
  readonly currency: string
  readonly status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  readonly paymentMethod: 'CARD' | 'BANK_TRANSFER' | 'CHECK' | 'CASH'
  readonly stripePaymentIntentId?: string | null
  readonly organizationId: string
  readonly tenantId?: string | null
  readonly leaseId?: string | null
  readonly description?: string | null
  readonly paidAt?: string | null
  readonly metadata?: TenantFlowMetadata
}

// Invoice Management
export interface TenantFlowInvoice extends TenantFlowEntity {
  readonly invoiceNumber: string
  readonly amount: number
  readonly currency: string
  readonly dueDate: string
  readonly status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  readonly organizationId: string
  readonly tenantId?: string | null
  readonly leaseId?: string | null
  readonly stripeInvoiceId?: string | null
  readonly paidAt?: string | null
  readonly description?: string | null
  readonly metadata?: TenantFlowMetadata
}

// ========================
// Operational Entities
// ========================

// Maintenance Requests
export interface TenantFlowMaintenanceRequest extends TenantFlowEntity {
  readonly title: string
  readonly description: string
  readonly priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  readonly status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  readonly unitId: string
  readonly tenantId: string
  readonly organizationId: string
  readonly assignedTo?: string | null
  readonly estimatedCost?: number | null
  readonly actualCost?: number | null
  readonly completedAt?: string | null
  readonly metadata?: TenantFlowMetadata
}

// Document Management
export interface TenantFlowDocument extends TenantFlowEntity {
  readonly name: string
  readonly type: 'LEASE' | 'INVOICE' | 'RECEIPT' | 'MAINTENANCE' | 'OTHER'
  readonly url: string
  readonly sizeBytes?: number | null
  readonly organizationId: string
  readonly entityId?: string | null // Can relate to property, tenant, lease, etc.
  readonly entityType?: string | null
  readonly uploadedBy: string
  readonly isActive: boolean
  readonly metadata?: TenantFlowMetadata
}

// Activity Logging
export interface TenantFlowActivity extends TenantFlowEntity {
  readonly action: string
  readonly entityType: string
  readonly entityId: string
  readonly organizationId: string
  readonly userId: string
  readonly description?: string | null
  readonly changes?: TenantFlowMetadata
  readonly ipAddress?: string | null
  readonly userAgent?: string | null
}

// ========================
// Notification System
// ========================

export interface TenantFlowNotification extends TenantFlowEntity {
  readonly title: string
  readonly message: string
  readonly type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  readonly userId: string
  readonly organizationId?: string | null
  readonly entityId?: string | null
  readonly entityType?: string | null
  readonly isRead: boolean
  readonly readAt?: string | null
  readonly expiresAt?: string | null
  readonly metadata?: TenantFlowMetadata
}

// ========================
// Raw Generated Types (Re-exports)
// ========================

// The Database type is already exported above, so we just need the raw table types
export type RawTablesType = Database['public']['Tables']
export type RawTableRow<T extends keyof RawTablesType> = TableRow<T>
export type RawTableInsert<T extends keyof RawTablesType> = TableInsert<T>
export type RawTableUpdate<T extends keyof RawTablesType> = TableUpdate<T>

// ========================
// Type Utilities
// ========================

// Helper to get create params for any entity
export type CreateParams<T> = T extends TenantFlowUser ? CreateTenantFlowUserParams
  : T extends TenantFlowOrganization ? CreateTenantFlowOrganizationParams  
  : T extends TenantFlowProperty ? CreateTenantFlowPropertyParams
  : never

// Helper to get update params for any entity
export type UpdateParams<T> = T extends TenantFlowUser ? UpdateTenantFlowUserParams
  : never

// Helper to extract entity types
export type TenantFlowEntityType = 
  | TenantFlowUser
  | TenantFlowOrganization  
  | TenantFlowProperty
  | TenantFlowUnit
  | TenantFlowTenant
  | TenantFlowLease
  | TenantFlowSubscription
  | TenantFlowPayment
  | TenantFlowInvoice
  | TenantFlowMaintenanceRequest
  | TenantFlowDocument
  | TenantFlowActivity
  | TenantFlowNotification

// ========================
// Validation Functions  
// ========================

/**
 * Type guards for runtime type checking
 */
export function isTenantFlowUser(entity: unknown): entity is TenantFlowUser {
  return entity !== null && typeof entity === 'object' && 
         'email' in entity && typeof entity.email === 'string' && 
         'role' in entity && ['ADMIN', 'USER', 'MANAGER'].includes(entity.role as string)
}

export function isTenantFlowProperty(entity: unknown): entity is TenantFlowProperty {
  return entity !== null && typeof entity === 'object' && 
         'name' in entity && typeof entity.name === 'string' && 
         'address' in entity && typeof entity.address === 'string' &&
         'propertyType' in entity && ['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE'].includes(entity.propertyType as string)
}

/**
 * Validate TenantFlow entity has required fields
 */
export function validateTenantFlowEntity(entity: unknown): entity is TenantFlowEntity {
  return entity !== null && typeof entity === 'object' && 
         'id' in entity && typeof entity.id === 'string' && 
         'createdAt' in entity && typeof entity.createdAt === 'string'
}
