// Export all types for the TenantFlow application
// Export individual files selectively to avoid conflicts

// Auth types
export type { UserRole, User, AuthUser, AuthResponse, SupabaseJwtPayload } from './auth'
export { USER_ROLE, USER_ROLE_OPTIONS, getUserRoleLabel, getUserRoleColor } from './auth'

// Properties types  
export type { PropertyType, UnitStatus } from './properties'
export { PROPERTY_TYPE, PROPERTY_TYPE_OPTIONS, UNIT_STATUS, UNIT_STATUS_OPTIONS } from './properties'

// Leases types
export type { LeaseStatus } from './leases'
export { LEASE_STATUS, LEASE_STATUS_OPTIONS } from './leases'

// Tenants types
export type { InvitationStatus } from './tenants'
export { INVITATION_STATUS, INVITATION_STATUS_OPTIONS } from './tenants'

// Maintenance types
export type { Priority, RequestStatus } from './maintenance'
export { PRIORITY, PRIORITY_OPTIONS, REQUEST_STATUS, REQUEST_STATUS_OPTIONS } from './maintenance'

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
export type BlogArticle = any
export type BlogTag = any
export type CustomerInvoice = any
export type CustomerInvoiceItem = any
export type PropertyWithDetails = any
export type UnitWithDetails = any
export type TenantWithDetails = any
export type LeaseWithDetails = any
export type MaintenanceWithDetails = any
export type NotificationWithDetails = any
export type PlanLimits = any

// Billing types
export type { 
  PlanType, 
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
export { PLAN_TYPE, PLAN_TYPE_OPTIONS, getPlanTypeLabel } from './billing'