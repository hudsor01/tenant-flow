/**
 * @repo/shared - Main export file
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

// Export Role enum - moved inline to fix module resolution
export enum Role {
  OWNER = 'OWNER',
  TENANT = 'TENANT', 
  MANAGER = 'MANAGER'
}

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
  PropertyWithUnits,
  PropertyWithUnitsAndLeases,
  UnitWithDetails,
  TenantWithDetails,
  TenantWithLeases,
  LeaseWithDetails,
  LeaseWithRelations,
  MaintenanceWithDetails,
  MaintenanceRequestWithRelations,
  NotificationWithDetails,
  NotificationWithRelations,
  UnitWithProperty,
  UserWithProperties
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
// Property Input Types from properties module
export type {
  CreatePropertyInput,
  UpdatePropertyInput
} from './types/properties'

export type {
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
  ApiSubscriptionCreateResponse,
  PropertyCreateResponse,
  PropertyListResponse,
  PropertyStatsResponse,
  UnitCreateResponse,
  UnitListResponse,
  TenantCreateResponse,
  TenantListResponse,
  TenantStatsResponse,
  LeaseCreateResponse,
  LeaseListResponse,
  MaintenanceCreateResponse,
  MaintenanceListResponse,
  UsageMetricsResponse,
  ActivityFeedResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiPaginatedResponse
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
  ValidationError as SharedValidationError,
  NetworkError,
  ServerError,
  BusinessError,
  FileUploadError,
  PaymentError,
  ErrorResponse,
  SuccessResponse,
  ApiResponse as SharedApiResponse,
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
// Note: Database Types
// ========================
// Database types are now imported directly from @repo/database
// in each package that needs them. This avoids circular dependencies
// during build and follows proper dependency patterns.
//
// Import database types like this:
// import { User, Property, PrismaClient } from '@repo/database'

// ========================
// React 19 Action State Types
// ========================
export interface ActionState<TData = unknown> {
  success?: boolean
  loading?: boolean
  error?: string
  message?: string
  data?: TData
}

export type FormActionState<TData = unknown> = ActionState<TData> & {
  fieldErrors?: Record<string, string[]>
}

export interface OptimisticState<TData = unknown> {
  isSubmitting: boolean
  data?: TData
  message?: string
}

export interface AsyncFormHandler<TArgs extends unknown[] = unknown[]> {
  handler: (...args: TArgs) => void
  isPending: boolean
}

export interface AsyncClickHandler<TArgs extends unknown[] = unknown[]> {
  handler: (...args: TArgs) => void
  isPending: boolean
}

// Form action function type for React 19 useActionState
export type FormAction<TData = unknown> = (
  prevState: ActionState<TData>,
  formData: FormData
) => Promise<ActionState<TData>>

// Server action response type
export interface ServerActionResponse<TData = unknown> {
  success: boolean
  data?: TData
  error?: string
  message?: string
  redirect?: string
}

// ========================
// Common Frontend Utility Types
// ========================
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>

export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>

export type SharedDeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? SharedDeepPartial<T[P]> : T[P]
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncOperationState<TData = unknown, TError = Error> {
  data?: TData
  error?: TError
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
}

// ========================
// Enhanced Pagination Types
// ========================
export interface PaginationMeta {
  totalCount: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor?: string
  endCursor?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface CursorPaginationParams {
  first?: number
  after?: string
  last?: number
  before?: string
}

export interface OffsetPaginationParams {
  page?: number
  limit?: number
  offset?: number
}

// ========================
// Domain Event Types
// ========================
export interface DomainEvent<TPayload = unknown> {
  id: string
  type: string
  payload: TPayload
  timestamp: Date
  aggregateId: string
  aggregateType: string
  version: number
  metadata?: Record<string, unknown>
}

export type EventHandler<TEvent extends DomainEvent = DomainEvent> = (
  event: TEvent
) => Promise<void> | void

// ========================
// API Client Types
// ========================
export interface ApiClientConfig {
  baseURL: string
  timeout?: number
  headers?: Record<string, string>
  retryAttempts?: number
  retryDelay?: number
}

export interface ApiRequestConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  data?: unknown
  params?: Record<string, unknown>
  headers?: Record<string, string>
  timeout?: number
}

export interface ApiResponse<T = unknown> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
}

// ========================
// Domain-Driven Design Types
// ========================
export type {
  // Base patterns
  ValueObject,
  Entity,
  AggregateRoot,
  DomainEvent as SharedDomainEvent,
  Repository,
  QueryRepository,
  Specification,
  Command,
  Query,
  CommandHandler,
  QueryHandler,
  BusinessRule,
  DomainService,
  Factory,
  UnitOfWork,
  
  // Result pattern
  Result as DomainResult,
  Success,
  Failure,
  
  // Branded ID types
  Brand,
  UserId,
  PropertyId,
  UnitId,
  TenantId,
  LeaseId,
  MaintenanceRequestId,
  OrganizationId,
  DocumentId,
  FileId,
  ActivityId,
  NotificationId,
  ReminderLogId,
  BlogArticleId,
  CustomerInvoiceId
} from './types/domain'

export {
  // Classes and utilities
  BaseValueObject,
  BaseEntity,
  BaseSpecification,
  Result as DomainResultClass,
  Money,
  Email,
  PhoneNumber,
  Address,
  createId,
  
  // Domain exceptions
  DomainError,
  ValidationError as DomainValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  BusinessRuleValidationError
} from './types/domain'

// ========================
// Utility Types
// ========================
export type {
  // Type manipulation
  PartialBy,
  RequiredBy,
  NonNullable,
  DeepReadonly,
  DeepPartial as UtilityDeepPartial,
  KeysOfType,
  PickByType,
  OmitByType,
  ValueOf,
  ArrayElement,
  FunctionWithParams,
  PromiseReturnType,
  NonFunctionKeys,
  NonFunctionProps,
  
  // Conditional types
  IsArray,
  IsFunction,
  IsPromise,
  IsEqual,
  IsNever,
  
  // String manipulation
  CamelCase,
  SnakeCase,
  KebabCase,
  CamelCaseKeys,
  SnakeCaseKeys,
  
  // Object manipulation
  Merge,
  OptionalExcept,
  Diff,
  Intersection,
  Flatten,
  Nullable,
  OptionalNullable,
  
  // API types
  ApiResponse as UtilityApiResponse,
  PaginatedApiResponse,
  ApiErrorResponse,
  
  // Form and validation
  FieldError,
  FormErrors,
  ValidationResult,
  FormSubmissionState,
  
  // Event handlers
  EventHandler as UtilityEventHandler,
  AsyncEventHandler,
  ChangeHandler,
  ClickHandler,
  SubmitHandler,
  
  // Component props
  BaseProps,
  DisablableProps,
  LoadableProps,
  SizedProps,
  VariantProps,
  WithChildren,
  AsProps,
  
  // Store and state
  BaseState,
  DataState,
  ListState,
  StoreActions,
  
  // Configuration
  Environment,
  FeatureFlags,
  ApiConfig,
  DatabaseConfig,
  
  // Time and date
  TimeZone,
  DateRange,
  TimePeriod,
  
  // File and upload
  FileMetadata,
  UploadProgress,
  UploadStatus,
  FileUploadState,
  
  // Search and filter
  SortDirection,
  SortConfig,
  FilterValue,
  FilterOperator,
  FilterCondition,
  SearchConfig
} from './types/utilities'

// ========================
// Validation
// ========================
export * from './validation'