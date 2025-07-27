/**
 * Shared package main exports
 * Runtime constants, types, and utility functions for TenantFlow
 */

// Export all utilities (includes runtime error functions)
export * from './utils'

// Export types except for conflicting error types
export type { 
  UserRole, User, AuthUser, AuthResponse, SupabaseJwtPayload,
  PropertyType, UnitStatus, Property, Unit, Inspection, Expense,
  LeaseStatus, LeaseType, Lease, RentReminder,
  Tenant,
  Priority, RequestStatus, MaintenanceRequest,
  Document, DocumentType,
  AppError, PaymentError, BaseError, AuthError, ServerError, BusinessError, FileUploadError, ErrorContext,
  TenantQuery,
  Notification, NotificationType, WebSocketMessage, WebSocketState, UseWebSocketOptions,
  BlogArticle, BlogTag, CustomerInvoice, CustomerInvoiceItem,
  MaintenanceWithDetails, NotificationWithDetails, PlanLimits,
  PlanType, BillingPeriod, SubStatus, Subscription, Invoice, Plan,
  UsageMetrics, BillingHistory, SubscriptionCreateRequest, SubscriptionCreateResponse,
  CustomerPortalRequest, CustomerPortalResponse,
  CreateCheckoutSessionParams, CreatePortalSessionParams, SubscriptionData,
  WebhookEventHandler, WebhookEventType, PreviewInvoiceParams, UpdateSubscriptionParams,
  StripeWebhookEvent,
  LeaseGeneratorForm, LeaseOutputFormat, LeaseGenerationResult, LeaseGeneratorUsage, LeaseFormData
} from './types'

// Export constants 
export * from './constants'
export { LEASE_TYPE } from './constants/leases'

// Export remaining types
export * from './types/blog'
export * from './types/invoices'  
export * from './types/relations'
export * from './types/usage'
export * from './types/backend'
export { STRIPE_ERRORS } from './types/billing'

// Export all validation schemas
export * from './validation'

// Export lease generator schema
export { leaseFormSchema } from './types/lease-generator'

// Hono RPC input types for production implementation
import type { PropertyType } from './constants/properties'
import type { Priority, RequestStatus } from './types/maintenance'

export type CreatePropertyInput = {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  description?: string
  propertyType?: PropertyType
}

export type UpdatePropertyInput = {
  id: string
  name?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  description?: string
  propertyType?: PropertyType
  imageUrl?: string
}

export type PropertyQueryInput = {
  propertyType?: PropertyType
  status?: string
  search?: string
  limit?: string
  offset?: string
}

// Maintenance input types
export type CreateMaintenanceInput = {
  unitId: string
  title: string
  description: string
  category: string
  priority?: Priority
  preferredDate?: string
  allowEntry?: boolean
  contactPhone?: string
  photos?: string[]
}

export type UpdateMaintenanceInput = {
  id: string
  title?: string
  description?: string
  category?: string
  priority?: Priority
  status?: RequestStatus
  preferredDate?: string
  allowEntry?: boolean
  contactPhone?: string
  assignedTo?: string
  estimatedCost?: number
  actualCost?: number
  completedAt?: string
  notes?: string
  photos?: string[]
}

// Subscription input types
export type CreateSubscriptionInput = {
  planId: string
  paymentMethodId?: string
}

export type UpdateSubscriptionInput = {
  planId?: string
  quantity?: number
  proration_behavior?: 'create_prorations' | 'none' | 'always_invoice'
}

export type CreateCheckoutInput = {
  planId: string
  successUrl?: string
  cancelUrl?: string
}

// Lease input types
export type CreateLeaseInput = {
  unitId: string
  tenantId: string
  startDate: string
  endDate: string
  rentAmount: number
  securityDeposit?: number
  lateFeeDays?: number
  lateFeeAmount?: number
  leaseTerms?: string
}

export type UpdateLeaseInput = {
  id: string
  startDate?: string
  endDate?: string
  rentAmount?: number
  securityDeposit?: number
  lateFeeDays?: number
  lateFeeAmount?: number
  leaseTerms?: string
  status?: string
}

// Unit input types
export type CreateUnitInput = {
  propertyId: string
  unitNumber: string
  bedrooms: number
  bathrooms: number
  squareFeet?: number
  monthlyRent: number
  securityDeposit?: number
  description?: string
  amenities?: string[]
}

export type UpdateUnitInput = {
  id: string
  unitNumber?: string
  bedrooms?: number
  bathrooms?: number
  squareFeet?: number
  monthlyRent?: number
  securityDeposit?: number
  description?: string
  amenities?: string[]
  status?: string
}

// Tenant input types
export type CreateTenantInput = {
  name: string
  email: string
  phone?: string
  emergencyContact?: string
  emergencyPhone?: string
  moveInDate?: string
  notes?: string
}

export type UpdateTenantInput = {
  id: string
  name?: string
  email?: string
  phone?: string
  emergencyContact?: string
  emergencyPhone?: string
  moveInDate?: string
  moveOutDate?: string
  notes?: string
}