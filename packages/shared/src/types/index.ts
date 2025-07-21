// Export all types for the TenantFlow application
// This package contains ONLY types - no runtime code

// Import base types for use in extended interfaces
import type { User } from './auth'
import type { Property, Unit } from './properties'
import type { Lease } from './leases'
import type { Tenant } from './tenants'
import type { MaintenanceRequest, Priority, RequestStatus } from './maintenance'
import type { Document } from './documents'
import type { Notification } from './notifications'

// Auth types
export type { UserRole, User, AuthUser, AuthResponse, SupabaseJwtPayload } from './auth'
export { getUserRoleLabel, getUserRoleColor } from './auth'

// Properties types  
export type { 
  PropertyType, 
  UnitStatus, 
  Property, 
  Unit, 
  Inspection, 
  Expense 
} from './properties'
export { getPropertyTypeLabel, getUnitStatusLabel, getUnitStatusColor } from './properties'

// Leases types
export type { LeaseStatus, Lease, RentReminder } from './leases'
export { getLeaseStatusLabel, getLeaseStatusColor } from './leases'

// Tenants types
export type { Tenant } from './tenants'

// Maintenance types
export type { Priority, RequestStatus, MaintenanceRequest } from './maintenance'
export { getPriorityLabel, getPriorityColor, getRequestStatusLabel, getRequestStatusColor } from './maintenance'

// Document types
export type { Document, DocumentType } from './documents'
export { DOCUMENT_TYPE, DOCUMENT_TYPE_OPTIONS } from './documents'

// Error types
export type { AppError, PaymentError, BaseError, AuthError, ValidationError, NetworkError, ServerError, BusinessError, FileUploadError } from './errors'

// Other types
export * from './blog'
export * from './invoices'
export * from './relations'
export type { AppRouter, RouterInputs, RouterOutputs } from './trpc'
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

export interface PropertyWithDetails extends Property {
  units: UnitWithDetails[]
  owner: User
  totalUnits: number
  occupiedUnits: number
  monthlyRevenue: number
}

export interface UnitWithDetails extends Unit {
  property: Property
  tenant: TenantWithDetails | null
  lease: LeaseWithDetails | null
  maintenanceRequests: MaintenanceWithDetails[]
}

export interface TenantWithDetails extends Tenant {
  units: UnitWithDetails[]
  leases: LeaseWithDetails[]
  maintenanceRequests: MaintenanceWithDetails[]
}

export interface LeaseWithDetails extends Lease {
  property: Property
  unit: Unit
  tenant: Tenant
  documents: Document[]
}

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
  CustomerPortalResponse
} from './billing'
export { getPlanTypeLabel } from './billing'

// Billing constants
export { 
  PLAN_TYPE, 
  PLAN_TYPE_OPTIONS, 
  BILLING_PERIOD, 
  BILLING_PERIOD_OPTIONS, 
  SUB_STATUS, 
  SUB_STATUS_OPTIONS 
} from '../constants/billing'

// Re-export all constants from the constants folder
export * from '../constants'