// Re-export all entity types from Prisma-generated types
// This ensures compatibility with existing imports while using Prisma as the source of truth

// Re-export all entity types from generated database types
import type { Database } from './supabase-generated'

// Core entity types
export type User = Database['public']['Tables']['User']['Row']
export type Property = Database['public']['Tables']['Property']['Row']
export type Unit = Database['public']['Tables']['Unit']['Row']
export type Tenant = Database['public']['Tables']['Tenant']['Row']
export type Lease = Database['public']['Tables']['Lease']['Row']
export type Payment = Database['public']['Tables']['Payment']['Row']
export type MaintenanceRequest = Database['public']['Tables']['MaintenanceRequest']['Row']
export type Notification = Database['public']['Tables']['Notification']['Row']

// Placeholder types for not yet implemented database tables
export interface Expense {
	id: string
	amount: number
	category: string
	description?: string
	date: string
	propertyId: string
	createdAt: string
	updatedAt: string
}

// Note: The following table types are not yet implemented in the database:
// Document, Subscription, Invoice, Inspection, CustomerInvoice, CustomerInvoiceItem

// Enum types
export type UserRole = Database['public']['Enums']['UserRole']
export type PropertyType = Database['public']['Enums']['PropertyType']
export type UnitStatus = Database['public']['Enums']['UnitStatus']
export type LeaseStatus = Database['public']['Enums']['LeaseStatus']
export type PaymentType = Database['public']['Enums']['PaymentType']
export type PaymentStatus = Database['public']['Enums']['PaymentStatus']
export type InvitationStatus = Database['public']['Enums']['InvitationStatus']
export type Priority = Database['public']['Enums']['Priority']
export type RequestStatus = Database['public']['Enums']['RequestStatus']
export type NotificationType = Database['public']['Enums']['NotificationType']
export type NotificationPriority = Database['public']['Enums']['NotificationPriority']
export type DocumentType = Database['public']['Enums']['DocumentType']

// Extended types with relationships - these are re-exported from api.ts
export type {
	PropertyWithDetails,
	TenantWithDetails,
	UnitWithDetails,
	LeaseWithDetails,
	PaymentWithDetails,
	MaintenanceWithDetails,
	NotificationWithDetails
} from './api'
