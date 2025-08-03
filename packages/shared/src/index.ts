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

// Export Role enum from the dedicated role file
export { Role } from './types/role'

export type {
  Property,
  Unit,
  PropertyType,
  UnitStatus,
  PropertyStats,
  PropertyEntitlements
} from './types/properties'

export type {
  Tenant,
  TenantStats,
  CurrentLeaseInfo
} from './types/tenants'

export type {
  Lease,
  LeaseStatus,
  LeaseTemplateData,
  StateLeaseRequirements
} from './types/leases'

export type {
  MaintenanceRequest,
  Priority as MaintenancePriority,
  RequestStatus as MaintenanceStatus
} from './types/maintenance'

export type {
  Document,
  DocumentType,
  File,
  FileUploadProgress,
  FileUploadOptions,
  FileUploadResult
} from './types/files'

export type {
  ReminderLog,
  ReminderType as ReminderTypeInterface,
  ReminderStatus as ReminderStatusInterface
} from './types/reminders'

export {
  getReminderTypeLabel,
  getReminderStatusLabel,
  getReminderStatusColor
} from './types/reminders'

export type {
  Invoice as BillingInvoice
} from './types/billing'

// ========================
// Extended Types with Relations
// ========================
export type {
  PropertyWithDetails,
  PropertyWithUnitsAndLeases,
  UnitWithDetails,
  TenantWithDetails,
  TenantWithLeases,
  LeaseWithDetails,
  MaintenanceWithDetails,
  MaintenanceRequestWithRelations,
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
  UpdateUserProfileInput,
  PropertyFormData,
  CheckoutParams,
  TrialParams,
  DirectSubscriptionParams,
  SubscriptionUpdateParams,
  PropertyQueryInput,
  UsePropertyFormDataProps,
  CreateCheckoutInput,
  CreatePortalInput
} from './types/api-inputs'

// ========================
// API Response Types
// ========================
export type {
  CheckoutResponse,
  PortalResponse,
  TrialResponse,
  ApiSubscriptionCreateResponse
} from './types/responses'

// ========================
// Stripe & Billing Types (Unified)
// ========================
export type {
  // Core types
  PlanType,
  BillingPeriod, 
  SubscriptionStatus,
  UserSubscription,
  PlanConfig,
  UsageMetrics,
  PaymentMethod,
  Invoice,
  
  // Configuration
  StripeConfig,
  StripeEnvironmentConfig,
  StripePlanPriceIds,
  
  // Error handling
  StripeErrorCode,
  StripeErrorCategory,
  StripeErrorSeverity,
  StandardizedStripeError,
  StripeRetryConfig,
  ClientSafeStripeError,
  
  // API types
  CreateCheckoutSessionParams,
  CreatePortalSessionParams,
  UpdateSubscriptionParams,
  PreviewInvoiceParams,
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  
  // Webhook types
  WebhookEventType,
  StripeWebhookEvent,
  WebhookEventHandlers,
  
  // Response types
  StripeApiResponse,
  StripeSuccessResponse,
  StripeErrorResponse,
  
  // Frontend integration
  StripeElementEvent,
  StripeCardElementEvent,
  StripePaymentElementEvent,
  StripeElementEventCallback,
  StripeCardElementEventCallback,
  StripePaymentElementEventCallback
} from './types/stripe'

// ========================
// New Stripe Pricing Types
// ========================
export type {
  PricingPlan,
  BillingInterval,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionRequest,
  CreatePortalSessionResponse,
  UserSubscription as StripeUserSubscription,
  PricingComponentProps,
  PricingCardProps,
  StripeError
} from './types/stripe-pricing'

export {
  formatPrice,
  calculateYearlySavings,
  getStripeErrorMessage,
  validatePricingPlan
} from './types/stripe-pricing'

export {
  // Constants
  PLAN_TYPES,
  BILLING_PERIODS,
  SUBSCRIPTION_STATUSES,
  STRIPE_API_VERSIONS,
  STRIPE_ERROR_CODES,
  STRIPE_DECLINE_CODES,
  STRIPE_ERROR_CATEGORIES,
  STRIPE_ERROR_SEVERITIES,
  WEBHOOK_EVENT_TYPES,
  DEFAULT_STRIPE_RETRY_CONFIG,
  ERROR_CATEGORY_MAPPING,
  ERROR_SEVERITY_MAPPING,
  RETRYABLE_ERROR_CODES
} from './types/stripe'

// ========================
// Stripe Error Handler Types  
// ========================
export type {
  ExecuteContext,
  RetryConfig,
  ExecuteParams,
  AsyncWrapParams
} from './types/stripe-error-handler'

// ========================
// Stripe Type Guards
// ========================
export {
  StripeTypeGuards,
  // Individual guards for tree-shaking
  isPlanType,
  isBillingPeriod,
  isSubscriptionStatus,
  isWebhookEventType,
  isStripeErrorCode,
  isStandardizedStripeError,
  isStripeWebhookEvent,
  isPaymentMethod,
  isUserSubscription,
  isPlanConfig,
  isStripeConfig,
  isRetryableError as isStripeRetryableError,
  isCardError,
  isRateLimitError,
  isInfrastructureError,
  isConfigurationError,
  isCriticalError,
  isStripeId,
  isStripeCustomerId,
  isStripeSubscriptionId,
  isStripePriceId
} from './types/stripe-guards'

// ========================
// Stripe Utilities
// ========================
export {
  StripeUtils,
  // Individual utilities for tree-shaking
  generateErrorId,
  getErrorCategory,
  getErrorSeverity,
  calculateRetryDelay,
  toClientSafeError,
  createStandardizedError,
  generateUserMessage,
  getPlanTypeFromPriceId,
  getBillingPeriodFromPriceId,
  formatPrice as formatLegacyPrice,
  calculateAnnualSavings as calculateStripeAnnualSavings,
  getPlanDisplayName,
  isActiveSubscription,
  isInGracePeriod,
  getSubscriptionStatusDisplay,
  getDaysUntilExpiry,
  getTrialDaysRemaining,
  validateStripeConfig,
  sanitizeMetadata,
  generateIdempotencyKey
} from './types/stripe-utils'

// ========================
// Legacy Billing Types (Deprecated)
// ========================
export type {
  Plan,
  PlanType as LegacyPlanType,
  Subscription as LegacySubscription,
  UsageMetrics as LegacyUsageMetrics,
  PaymentMethod as LegacyPaymentMethod,
  UserPlan,
  SubscriptionData,
  DetailedUsageMetrics,
  PlanLimits,
  LimitChecks,
  UsageData,
  LocalSubscriptionData,
  EnhancedUserPlan
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

export type {
  CustomerInvoiceForm,
  InvoiceItemForm
} from './types/invoice-lead'

// ========================
// Analytics Types
// ========================
export type {
  AnalyticsEventData
} from './types/analytics'

// ========================
// Blog Types
// ========================
export type {
  BlogArticle,
  BlogArticleWithDetails,
  BlogArticleListItem,
  BlogArticleInput,
  BlogTag,
  BlogTagInput,
  BlogFilters,
  BlogPagination,
  BlogAnalytics,
  BlogSEOData,
  BlogCategory,
  BlogStatus
} from './types/blog'

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

export {
  leaseFormSchema
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

// ========================
// Pricing Plans
// ========================
export {
  PRICING_PLANS,
  getPlanById,
  getRecommendedPlan,
  getFreePlan,
  getPaidPlans,
  validatePricingPlans,
  PLAN_IDS
} from './constants/pricing-plans'

export type { PlanId } from './constants/pricing-plans'
export type { TenantStatus } from './constants/tenants'
export { TENANT_STATUS } from './constants/tenants'
export type { ReminderType, ReminderStatus } from './constants/reminders'
export { REMINDER_TYPE, REMINDER_STATUS } from './constants/reminders'

// ========================
// Security Types
// ========================
export {
  SecurityEventType,
  SecurityEventSeverity as SecuritySeverity,
  SecurityEventSeverity
} from './types/security'

export type {
  SecurityEvent,
  SecurityAuditLog,
  SecurityMetrics
} from './types/security'

// ========================
// Session Types
// ========================
export type {
  SessionData,
  TokenPair
} from './types/session'

// ========================
// Email Types
// ========================
export type {
  EmailOptions,
  SendEmailResponse
} from './types/email'

// ========================
// Logger Types
// ========================
export type {
  LogEntry,
  LoggerConfig
} from './types/logger'

// Export LogLevel const object
export { LogLevel } from './types/logger'

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
  getPlanById as getLegacyPlanById,
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
  getErrorLogLevel,
  ERROR_TYPES
} from './utils/errors'

// ========================
// Validation
// ========================
export * from './validation'