/**
 * @tenantflow/shared - Main export file
 * 
 * This file exports commonly used types and utilities from the shared package.
 * More specific exports are available through the package.json exports map.
 */

// ========================
// Core Entity Types
// ========================
export type {
  ValidatedUser,
  Context,
  AuthenticatedContext
} from './types/backend'

// ========================
// Activity Types
// ========================
export type {
  Activity,
  ActivityItem,
  ActivityFeed,
  ActivityQuery,
  ActivityType,
  ActivityStatus,
  ActivityPriority,
  ActivityMetadata,
  CreateActivityInput,
  UpdateActivityInput
} from './types/activity'

export type {
  User,
  UserRole,
  AuthUser
} from './types/auth'

export type {
  Property,
  Unit,
  PropertyType,
  UnitStatus,
  PropertyStats
} from './types/properties'

export type {
  Tenant,
  TenantStats
} from './types/tenants'

export type {
  Lease,
  LeaseStatus
} from './types/leases'

export type {
  MaintenanceRequest,
  Priority as MaintenancePriority,
  RequestStatus as MaintenanceStatus
} from './types/maintenance'

export type {
  Invoice
} from './types/billing'

// ========================
// Extended Types with Relations
// ========================
export type {
  PropertyWithDetails,
  UnitWithDetails,
  TenantWithDetails,
  LeaseWithDetails,
  MaintenanceWithDetails,
  NotificationWithDetails
} from './types/relations'

// ========================
// Query Types
// ========================
export type {
  PropertyQuery,
  TenantQuery,
  UnitQuery,
  LeaseQuery,
  MaintenanceQuery,
  NotificationQuery
} from './types/queries'

// ========================
// API Input Types
// ========================
export type {
  CreatePropertyInput,
  UpdatePropertyInput,
  CreateUnitInput,
  UpdateUnitInput,
  CreateTenantInput,
  UpdateTenantInput,
  CreateLeaseInput,
  UpdateLeaseInput,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  AuthCallbackInput,
  EnsureUserExistsInput,
  UpdateUserProfileInput
} from './types/api-inputs'

// ========================
// Billing & Plans
// ========================
export type {
  Plan,
  PlanType,
  Subscription,
  UsageMetrics,
  PaymentMethod
} from './types/billing'

export {
  PLAN_TYPE,
  STRIPE_ERRORS
} from './types/billing'

// ========================
// Invoice Types
// ========================
export type {
  CustomerInvoice,
  CustomerInvoiceItem
} from './types/invoices'

// ========================
// Lease Generator Types
// ========================
export type {
  LeaseFormData,
  LeaseGeneratorForm,
  LeaseOutputFormat,
  LeaseGenerationResult,
  LeaseGeneratorUsage
} from './types/lease-generator'

// ========================
// Notification Types
// ========================
export type {
  Notification,
  NotificationType,
  NotificationPriority,
  UseWebSocketOptions
} from './types/notifications'

// ========================
// Auth Types
// ========================
export type {
  AuthResponse,
  SupabaseJwtPayload
} from './types/auth'

// ========================
// WebSocket Types
// ========================
export type {
  WebSocketMessage
} from './types/websocket'

// ========================
// Constants
// ========================
export * from './constants'
export type { TenantStatus } from './constants/tenants'
export { TENANT_STATUS } from './constants/tenants'

// ========================
// Error Types
// ========================
export type {
  AppError,
  AuthError,
  ValidationError,
  NetworkError,
  ServerError,
  BusinessError,
  FileUploadError,
  PaymentError,
  ErrorResponse,
  SuccessResponse,
  ApiResponse,
  ErrorContext
} from './types/errors'

export type {
  StandardError,
  ErrorType,
  ErrorSeverity
} from './utils/errors'

// ========================
// Utilities
// ========================
export {
  getPlanById,
  calculateProratedAmount,
  calculateAnnualPrice,
  calculateAnnualSavings,
  SUBSCRIPTION_URLS
} from './utils/billing'

export {
  createStandardError,
  createValidationError,
  createNetworkError,
  createBusinessLogicError,
  classifyError,
  isRetryableError,
  getErrorLogLevel
} from './utils/errors'

// ========================
// Validation
// ========================
export * from './validation'