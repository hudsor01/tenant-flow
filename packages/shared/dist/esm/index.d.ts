/**
 * @repo/shared - Main export file
 *
 * This file exports commonly used types and utilities from the shared package.
 * More specific exports are available through the package.json exports map.
 */
export type { ValidatedUser, Context, AuthenticatedContext, RequestContext, PerformanceMetrics } from './types/backend';
export type { Activity, ActivityItem, ActivityFeed, ActivityQuery, ActivityType, ActivityStatus, ActivityPriority, ActivityMetadata, CreateActivityInput, UpdateActivityInput } from './types/activity';
export type { User, UserRole, AuthUser } from './types/auth';
export { USER_ROLE } from './constants/auth';
import './types/global';
export type { Property, Unit, PropertyType, UnitStatus, PropertyStats, PropertyEntitlements } from './types/properties';
export type { Tenant, TenantStats, CurrentLeaseInfo } from './types/tenants';
export type { Lease, LeaseStatus, LeaseTemplateData, StateLeaseRequirements } from './types/leases';
export type { MaintenanceRequest, Priority as MaintenancePriority, RequestStatus as MaintenanceStatus } from './types/maintenance';
export type { Document, DocumentType, File, FileUploadProgress, FileUploadOptions, FileUploadResult } from './types/files';
export type { ReminderLog, ReminderType as ReminderTypeInterface, ReminderStatus as ReminderStatusInterface } from './types/reminders';
export { getReminderTypeLabel, getReminderStatusLabel, getReminderStatusColor } from './types/reminders';
export type { Invoice as BillingInvoice } from './types/billing';
export type { PropertyWithDetails, PropertyWithUnits, PropertyWithUnitsAndLeases, UnitWithDetails, TenantWithDetails, TenantWithLeases, LeaseWithDetails, LeaseWithRelations, MaintenanceWithDetails, MaintenanceRequestWithRelations, NotificationWithDetails, NotificationWithRelations, UnitWithProperty, UserWithProperties } from './types/relations';
export type { PropertyQuery, TenantQuery, UnitQuery, LeaseQuery, MaintenanceQuery, NotificationQuery } from './types/queries';
export type { CreatePropertyInput, UpdatePropertyInput } from './types/properties';
export type { CreateUnitInput, UpdateUnitInput, CreateTenantInput, UpdateTenantInput, CreateLeaseInput, UpdateLeaseInput, CreateMaintenanceInput, UpdateMaintenanceInput, RegisterInput, LoginInput, RefreshTokenInput, ForgotPasswordInput, ResetPasswordInput, ChangePasswordInput, AuthCallbackInput, EnsureUserExistsInput, UpdateUserProfileInput, PropertyFormData, CheckoutParams, TrialParams, DirectSubscriptionParams, SubscriptionUpdateParams, PropertyQueryInput, UsePropertyFormDataProps, CreateCheckoutInput, CreatePortalInput } from './types/api-inputs';
export type { CheckoutResponse, PortalResponse, TrialResponse, ApiSubscriptionCreateResponse, PropertyCreateResponse, PropertyListResponse, PropertyStatsResponse, UnitCreateResponse, UnitListResponse, TenantCreateResponse, TenantListResponse, TenantStatsResponse, LeaseCreateResponse, LeaseListResponse, MaintenanceCreateResponse, MaintenanceListResponse, UsageMetricsResponse, ActivityFeedResponse, ApiSuccessResponse, ApiErrorResponse, ApiPaginatedResponse } from './types/responses';
export type { DashboardStats } from './types/api';
export type { PlanType, BillingPeriod, SubscriptionStatus, UserSubscription, PlanConfig, UsageMetrics, PaymentMethod, Invoice, StripeConfig, StripeEnvironmentConfig, StripePlanPriceIds, StripeErrorCode, StripeErrorCategory, StripeErrorSeverity, StandardizedStripeError, StripeRetryConfig, ClientSafeStripeError, CreateCheckoutSessionParams, CreatePortalSessionParams, UpdateSubscriptionParams, PreviewInvoiceParams, CreateSubscriptionRequest, CreateSubscriptionResponse, WebhookEventType, StripeWebhookEvent, WebhookEventHandlers, StripeApiResponse, StripeSuccessResponse, StripeErrorResponse, StripeElementEvent, StripeCardElementEvent, StripePaymentElementEvent, StripeElementEventCallback, StripeCardElementEventCallback, StripePaymentElementEventCallback } from './types/stripe';
export type { BillingInterval, CreateCheckoutSessionRequest, CreateCheckoutSessionResponse, CreatePortalSessionRequest, CreatePortalSessionResponse, PricingComponentProps, PricingCardProps } from './types/stripe-pricing';
export { calculateYearlySavings, getStripeErrorMessage, validatePricingPlan } from './types/stripe-pricing';
export { PLAN_TYPES, BILLING_PERIODS, SUBSCRIPTION_STATUSES, STRIPE_API_VERSIONS, STRIPE_ERROR_CODES, STRIPE_DECLINE_CODES, STRIPE_ERROR_CATEGORIES, STRIPE_ERROR_SEVERITIES, WEBHOOK_EVENT_TYPES, DEFAULT_STRIPE_RETRY_CONFIG, ERROR_CATEGORY_MAPPING, ERROR_SEVERITY_MAPPING, RETRYABLE_ERROR_CODES } from './types/stripe';
export type { ExecuteContext, RetryConfig, ExecuteParams, AsyncWrapParams } from './types/stripe-error-handler';
export { StripeTypeGuards, isPlanType, isBillingPeriod, isSubscriptionStatus, isWebhookEventType, isStripeErrorCode, isStandardizedStripeError, isStripeWebhookEvent, isPaymentMethod, isUserSubscription, isPlanConfig, isStripeConfig, isRetryableError as isStripeRetryableError, isCardError, isRateLimitError, isInfrastructureError, isConfigurationError, isCriticalError, isStripeId, isStripeCustomerId, isStripeSubscriptionId, isStripePriceId } from './types/stripe-guards';
export { StripeUtils, generateErrorId, getErrorCategory, getErrorSeverity, calculateRetryDelay, toClientSafeError, createStandardizedError, generateUserMessage, getPlanTypeFromPriceId, getBillingPeriodFromPriceId, formatPrice as formatStripePrice, calculateAnnualSavings as calculateStripeAnnualSavings, getPlanDisplayName, isActiveSubscription, isInGracePeriod, getSubscriptionStatusDisplay, getDaysUntilExpiry, getTrialDaysRemaining, sanitizeMetadata, generateIdempotencyKey } from './types/stripe-utils';
export type { Plan, Subscription, UserPlan, SubscriptionData, DetailedUsageMetrics, PlanLimits, LimitChecks, UsageData, LocalSubscriptionData, EnhancedUserPlan, TrialConfig, ProductTierConfig, SubscriptionChangePreview } from './types/billing';
export { PLAN_TYPE, STRIPE_ERRORS, getPlanTypeLabel } from './types/billing';
export { PRODUCT_TIERS, getProductTier, getStripePriceId, hasTrial, getTrialConfig, checkPlanLimits, getRecommendedUpgrade, calculateAnnualSavings } from './config/pricing';
export type { CustomerInvoice, CustomerInvoiceItem } from './types/invoices';
export type { CustomerInvoiceForm, InvoiceItemForm } from './types/invoice-lead';
export type { AnalyticsEventData } from './types/analytics';
export type { BlogArticle, BlogArticleWithDetails, BlogArticleListItem, BlogArticleInput, BlogTag, BlogTagInput, BlogFilters, BlogPagination, BlogAnalytics, BlogSEOData, BlogCategory, BlogStatus } from './types/blog';
export type { LeaseFormData, LeaseGeneratorForm, LeaseOutputFormat, LeaseGenerationResult, LeaseGeneratorUsage } from './types/lease-generator';
export { leaseFormSchema } from './types/lease-generator';
export type { Notification, NotificationType, NotificationPriority, UseWebSocketOptions } from './types/notifications';
export type { AuthResponse, SupabaseJwtPayload } from './types/auth';
export type { WebSocketMessage } from './types/websocket';
export * from './constants';
export type { TenantStatus } from './constants/tenants';
export { TENANT_STATUS } from './constants/tenants';
export type { ReminderType, ReminderStatus } from './constants/reminders';
export { REMINDER_TYPE, REMINDER_STATUS } from './constants/reminders';
export { SecurityEventType, SecurityEventSeverity as SecuritySeverity, SecurityEventSeverity } from './types/security';
export type { SecurityEvent, SecurityAuditLog, SecurityMetrics, ComplianceStatus } from './types/security';
export type { RLSPolicy, RLSTableStatus, RLSPolicyInfo, RLSAuditReport, RLSTestResult, RLSTestSuite, RLSTableConfig, TenantIsolationTest } from './types/rls';
export type { SessionData, TokenPair } from './types/session';
export type { EmailOptions, SendEmailResponse } from './types/email';
export type { LogEntry, LoggerConfig, ILogger, LogContext, AnalyticsEvent } from './types/logger';
export { LogLevel } from './types/logger';
export type { AppError, AuthError, ValidationError as SharedValidationError, NetworkError, ServerError, BusinessError, FileUploadError, PaymentError, ErrorResponse, SuccessResponse, ApiResponse as SharedApiResponse, ControllerApiResponse, ErrorContext } from './types/errors';
export type { StandardError, ErrorType, ErrorSeverity } from './utils';
export { calculateProratedAmount, calculateAnnualPrice, SUBSCRIPTION_URLS } from './utils';
export { formatCurrency, formatPrice, formatCompactCurrency, formatPercentage, formatNumber, formatCurrencyChange, formatPercentageChange, getDashboardCurrency, getDashboardPercentage, getCollectionRateStatus, getIntervalSuffix, formatPriceFromCents, formatPriceWithInterval } from './utils';
export type { BillingInterval as CurrencyBillingInterval, CurrencyCode, CurrencyFormatOptions, PriceFormatOptions } from './utils';
export { createStandardError, createValidationError, createNetworkError, createBusinessLogicError, classifyError, isRetryableError, getErrorLogLevel, ERROR_TYPES } from './utils';
export { createQueryAdapter, createMutationAdapter, createResponseAdapter, validateApiParams, validateEnumValue, safeParseNumber, safeParseDate, mergeApiParams, createApiCall, isValidQueryParam, isValidMutationData, TypeAdapterError, handleAdapterError } from './utils';
export interface ActionState<TData = unknown> {
    success?: boolean;
    loading?: boolean;
    error?: string;
    message?: string;
    data?: TData;
}
export type FormActionState<TData = unknown> = ActionState<TData> & {
    fieldErrors?: Record<string, string[]>;
};
export interface OptimisticState<TData = unknown> {
    isSubmitting: boolean;
    data?: TData;
    message?: string;
}
export interface AsyncFormHandler<TArgs extends unknown[] = unknown[]> {
    handler: (...args: TArgs) => void;
    isPending: boolean;
}
export interface AsyncClickHandler<TArgs extends unknown[] = unknown[]> {
    handler: (...args: TArgs) => void;
    isPending: boolean;
}
export type FormAction<TData = unknown> = (prevState: ActionState<TData>, formData: FormData) => Promise<ActionState<TData>>;
export interface ServerActionResponse<TData = unknown> {
    success: boolean;
    data?: TData;
    error?: string;
    message?: string;
    redirect?: string;
}
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
export type SharedDeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? SharedDeepPartial<T[P]> : T[P];
};
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export interface AsyncOperationState<TData = unknown, TError = Error> {
    data?: TData;
    error?: TError;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
}
export interface PaginationMeta {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}
export interface CursorPaginationParams {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
}
export interface OffsetPaginationParams {
    page?: number;
    limit?: number;
    offset?: number;
}
export interface DomainEvent<TPayload = unknown> {
    id: string;
    type: string;
    payload: TPayload;
    timestamp: Date;
    aggregateId: string;
    aggregateType: string;
    version: number;
    metadata?: Record<string, unknown>;
}
export type EventHandler<TEvent extends DomainEvent = DomainEvent> = (event: TEvent) => Promise<void> | void;
export interface ApiClientConfig {
    baseURL: string;
    timeout?: number;
    headers?: Record<string, string>;
    retryAttempts?: number;
    retryDelay?: number;
}
export interface ApiRequestConfig {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    data?: unknown;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
    timeout?: number;
}
export interface ApiResponse<T = unknown> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
}
export type { ValueObject, Entity, AggregateRoot, DomainEvent as SharedDomainEvent, Repository, QueryRepository, Specification, Command, Query, CommandHandler, QueryHandler, BusinessRule, DomainService, Factory, UnitOfWork, Result, Result as DomainResult, Success, Failure, Brand, UserId, PropertyId, UnitId, TenantId, LeaseId, MaintenanceRequestId, OrganizationId, DocumentId, FileId, ActivityId, NotificationId, ReminderLogId, BlogArticleId, CustomerInvoiceId } from './types/domain';
export { BaseValueObject, BaseEntity, BaseSpecification, Result as DomainResultClass, Money, Email, PhoneNumber, Address, createId, DomainError, ValidationError, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError, BusinessRuleValidationError } from './types/domain';
export type { PartialBy, RequiredBy, NonNullable, DeepReadonly, DeepPartial as UtilityDeepPartial, KeysOfType, PickByType, OmitByType, ValueOf, ArrayElement, FunctionWithParams, PromiseReturnType, NonFunctionKeys, NonFunctionProps, IsArray, IsFunction, IsPromise, IsEqual, IsNever, CamelCase, SnakeCase, KebabCase, CamelCaseKeys, SnakeCaseKeys, Merge, OptionalExcept, Diff, Intersection, Flatten, Nullable, OptionalNullable, ApiResponse as UtilityApiResponse, PaginatedApiResponse, FieldError, FormErrors, ValidationResult, FormSubmissionState, EventHandler as UtilityEventHandler, AsyncEventHandler, BaseProps, DisablableProps, LoadableProps, SizedProps, VariantProps, BaseState, DataState, ListState, StoreActions, Environment, FeatureFlags, ApiConfig, DatabaseConfig, DateRange, TimePeriod, FileMetadata, UploadProgress, UploadStatus, SortDirection, SortConfig, FilterValue, FilterOperator, FilterCondition, SearchConfig } from './types/utilities';
export type { ChangeHandler, ClickHandler, SubmitHandler, WithChildren, AsProps, FileUploadState } from './types/frontend-only';
export type { RouterContext, EnhancedRouterContext, UserContext, LoaderError, EnhancedError, LoaderParams, LoaderFunction } from './types/router-context';
export * from './utils';
export * from './validation';
//# sourceMappingURL=index.d.ts.map