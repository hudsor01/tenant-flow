// Export all types for the TenantFlow application
// This package contains ONLY types - no runtime code

// Import types needed for composite interfaces
import type { User } from './auth'
import type { Property, Unit } from './properties'
import type { Tenant } from './tenants'
import type { Priority, RequestStatus } from './maintenance'
import type { Notification } from './notifications'

// Auth types
export type { UserRole, User, AuthUser, AuthResponse, SupabaseJwtPayload } from './auth'

// Properties types  
export type { 
  PropertyType, 
  UnitStatus, 
  Property, 
  Unit, 
  Inspection, 
  Expense 
} from './properties'

// Leases types
export type { LeaseStatus, Lease, RentReminder } from './leases'

// Tenants types
export type { Tenant } from './tenants'

// Maintenance types
export type { Priority, RequestStatus, MaintenanceRequest } from './maintenance'

// Document types
export type { Document, DocumentType } from './documents'

// Error types
export type { AppError, PaymentError, BaseError, AuthError, ValidationError, NetworkError, ServerError, BusinessError, FileUploadError, ErrorContext } from './errors'

// Other types
export * from './blog'
export * from './invoices'
export * from './relations'
// Export specific types from api to avoid conflicts with relations
export type { TenantQuery } from './api'
// TRPC types are exported from main index via generated file
// RouterInputs and RouterOutputs still come from manual definition
export type { RouterInputs, RouterOutputs } from './trpc'
export * from './usage'

// Re-export specific notification types
export type { 
	Notification, 
	NotificationType,
	WebSocketMessage,
	WebSocketState,
	UseWebSocketOptions
} from './notifications'

// Additional types that frontend needs (temporary until proper type organization)
export interface BlogArticle {
  id: string
  title: string
  content: string
  excerpt?: string
  slug: string
  publishedAt: Date
  authorId: string
  tags: string[]
  isPublished: boolean
}

export interface BlogTag {
  id: string
  name: string
  slug: string
}

export interface CustomerInvoice {
  id: string
  customerId: string
  amount: number
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  currency: string
  dueDate: Date
  createdAt: Date
}

export interface CustomerInvoiceItem {
  id: string
  invoiceId: string
  description: string
  amount: number
  quantity: number
  unitAmount: number
}

// Note: PropertyWithDetails, UnitWithDetails, TenantWithDetails, and LeaseWithDetails
// are now exported from './relations' to avoid conflicting definitions

export interface MaintenanceWithDetails {
  id: string
  unitId: string
  title: string
  description: string
  category: string | null
  priority: Priority
  status: RequestStatus
  preferredDate: Date | null
  allowEntry: boolean
  contactPhone: string | null
  requestedBy: string | null
  notes: string | null
  photos: string[]
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
  assignedTo: string | null
  estimatedCost: number | null
  actualCost: number | null
  property: Property
  unit: Unit
  tenant: Tenant | null
  assignedUser: User | null
}

export interface NotificationWithDetails extends Notification {
  user: User
  property?: Property
  tenant?: Tenant
}

export interface PlanLimits {
  properties: number
  units: number
  tenants: number
  storage: number
  apiCalls: number
}

// Billing types
export type { 
  PlanType,
  BillingPeriod,
  SubStatus,
  Subscription, 
  Invoice, 
  Plan,
  UsageMetrics,
  BillingHistory,
  SubscriptionCreateRequest,
  SubscriptionCreateResponse,
  CustomerPortalRequest,
  CustomerPortalResponse,
  // Stripe-specific types
  CreateCheckoutSessionParams,
  CreatePortalSessionParams,
  SubscriptionData,
  WebhookEventHandler,
  WebhookEventType,
  PreviewInvoiceParams,
  UpdateSubscriptionParams,
  StripeWebhookEvent
} from './billing'

// Export Stripe constants
export { STRIPE_ERRORS } from './billing'

// Re-export all constants from the constants folder
export * from '../constants'

// Backend-specific types
export * from './backend'

// Frontend domain-specific types  
export * from './lease-generator'
export type {
  LeaseGeneratorForm,
  LeaseOutputFormat,
  LeaseGenerationResult,
  LeaseGeneratorUsage,
  LeaseFormData
} from './lease-generator'

