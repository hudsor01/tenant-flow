/**
 * CENTRALIZED STATUS TYPES - Single source of truth for all status enumerations
 *
 * Consolidates all duplicate status types, enums, and string literals from across the codebase
 * using TypeScript 5.9.2 performance patterns with const assertions and type inference.
 */

/**
 * USER ROLE ENUMERATION - Consolidated from multiple duplicate role definitions
 */
export const USER_ROLES = {
	OWNER: 'OWNER',
	MANAGER: 'MANAGER',
	TENANT: 'TENANT',
	ADMIN: 'ADMIN'
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

/**
 * PROPERTY STATUS ENUMERATION
 */
export const PROPERTY_STATUS = {
	ACTIVE: 'ACTIVE',
	INACTIVE: 'INACTIVE',
	UNDER_CONTRACT: 'UNDER_CONTRACT',
	SOLD: 'SOLD'
} as const

export type PropertyStatus =
	(typeof PROPERTY_STATUS)[keyof typeof PROPERTY_STATUS]

/**
 * PROPERTY TYPE ENUMERATION
 */
export const PROPERTY_TYPES = {
	SINGLE_FAMILY: 'SINGLE_FAMILY',
	MULTI_UNIT: 'MULTI_UNIT',
	APARTMENT: 'APARTMENT',
	COMMERCIAL: 'COMMERCIAL',
	CONDO: 'CONDO',
	TOWNHOUSE: 'TOWNHOUSE',
	OTHER: 'OTHER'
} as const

export type PropertyType = (typeof PROPERTY_TYPES)[keyof typeof PROPERTY_TYPES]

/**
 * UNIT STATUS ENUMERATION
 */
export const UNIT_STATUS = {
	VACANT: 'VACANT',
	OCCUPIED: 'OCCUPIED',
	MAINTENANCE: 'MAINTENANCE',
	RESERVED: 'RESERVED'
} as const

export type UnitStatus = (typeof UNIT_STATUS)[keyof typeof UNIT_STATUS]

/**
 * LEASE STATUS ENUMERATION
 */
export const LEASE_STATUS = {
	DRAFT: 'DRAFT',
	ACTIVE: 'ACTIVE',
	EXPIRED: 'EXPIRED',
	TERMINATED: 'TERMINATED'
} as const

export type LeaseStatus = (typeof LEASE_STATUS)[keyof typeof LEASE_STATUS]

/**
 * MAINTENANCE PRIORITY ENUMERATION
 */
export const MAINTENANCE_PRIORITY = {
	LOW: 'LOW',
	MEDIUM: 'MEDIUM',
	HIGH: 'HIGH',
	URGENT: 'URGENT'
} as const

export type MaintenancePriority =
	(typeof MAINTENANCE_PRIORITY)[keyof typeof MAINTENANCE_PRIORITY]

/**
 * MAINTENANCE STATUS ENUMERATION
 */
export const MAINTENANCE_STATUS = {
	OPEN: 'OPEN',
	IN_PROGRESS: 'IN_PROGRESS',
	COMPLETED: 'COMPLETED',
	CANCELED: 'CANCELED',
	ON_HOLD: 'ON_HOLD'
} as const

export type MaintenanceStatus =
	(typeof MAINTENANCE_STATUS)[keyof typeof MAINTENANCE_STATUS]

/**
 * MAINTENANCE CATEGORY ENUMERATION
 */
export const MAINTENANCE_CATEGORIES = {
	GENERAL: 'GENERAL',
	PLUMBING: 'PLUMBING',
	ELECTRICAL: 'ELECTRICAL',
	HVAC: 'HVAC',
	APPLIANCES: 'APPLIANCES',
	SAFETY: 'SAFETY',
	OTHER: 'OTHER'
} as const

export type MaintenanceCategory =
	(typeof MAINTENANCE_CATEGORIES)[keyof typeof MAINTENANCE_CATEGORIES]

/**
 * PAYMENT STATUS ENUMERATION
 */
export const PAYMENT_STATUS = {
	PENDING: 'PENDING',
	SUCCEEDED: 'SUCCEEDED',
	FAILED: 'FAILED',
	CANCELLED: 'CANCELLED',
	REQUIRES_ACTION: 'REQUIRES_ACTION',
	DUE: 'DUE',
	PAID: 'PAID',
	VOID: 'VOID'
} as const

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS]

/**
 * SUBSCRIPTION STATUS ENUMERATION
 */
export const SUBSCRIPTION_STATUS = {
	INCOMPLETE: 'incomplete',
	INCOMPLETE_EXPIRED: 'incomplete_expired',
	TRIALING: 'trialing',
	ACTIVE: 'active',
	PAST_DUE: 'past_due',
	CANCELED: 'canceled',
	UNPAID: 'unpaid',
	PAUSED: 'paused'
} as const

export type SubscriptionStatus =
	(typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS]

/**
 * TENANT STATUS ENUMERATION
 */
export const TENANT_STATUS = {
	ACTIVE: 'ACTIVE',
	INACTIVE: 'INACTIVE',
	EVICTED: 'EVICTED',
	PENDING: 'PENDING',
	MOVED_OUT: 'MOVED_OUT',
	ARCHIVED: 'ARCHIVED'
} as const

export type TenantStatus = (typeof TENANT_STATUS)[keyof typeof TENANT_STATUS]

/**
 * INVITATION STATUS ENUMERATION
 */
export const INVITATION_STATUS = {
	PENDING: 'PENDING',
	SENT: 'SENT',
	ACCEPTED: 'ACCEPTED',
	EXPIRED: 'EXPIRED',
	REVOKED: 'REVOKED'
} as const

export type InvitationStatus =
	(typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS]

/**
 * DOCUMENT TYPE ENUMERATION
 */
export const DOCUMENT_TYPES = {
	LEASE: 'LEASE',
	INVOICE: 'INVOICE',
	RECEIPT: 'RECEIPT',
	PROPERTY_PHOTO: 'PROPERTY_PHOTO',
	INSPECTION: 'INSPECTION',
	MAINTENANCE: 'MAINTENANCE',
	OTHER: 'OTHER'
} as const

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES]

/**
 * BLOG STATUS ENUMERATION
 */
export const BLOG_STATUS = {
	DRAFT: 'DRAFT',
	PUBLISHED: 'PUBLISHED',
	ARCHIVED: 'ARCHIVED',
	SCHEDULED: 'SCHEDULED'
} as const

export type BlogStatus = (typeof BLOG_STATUS)[keyof typeof BLOG_STATUS]

/**
 * BLOG CATEGORY ENUMERATION
 */
export const BLOG_CATEGORIES = {
	PROPERTY_MANAGEMENT: 'PROPERTY_MANAGEMENT',
	LEGAL_COMPLIANCE: 'LEGAL_COMPLIANCE',
	FINANCIAL_MANAGEMENT: 'FINANCIAL_MANAGEMENT',
	PROPERTY_MAINTENANCE: 'PROPERTY_MAINTENANCE',
	SOFTWARE_REVIEWS: 'SOFTWARE_REVIEWS',
	TENANT_RELATIONS: 'TENANT_RELATIONS',
	MARKETING: 'MARKETING',
	REAL_ESTATE_INVESTMENT: 'REAL_ESTATE_INVESTMENT',
	TAX_PLANNING: 'TAX_PLANNING',
	AUTOMATION: 'AUTOMATION'
} as const

export type BlogCategory =
	(typeof BLOG_CATEGORIES)[keyof typeof BLOG_CATEGORIES]

/**
 * REQUEST/ACTION STATUS ENUMERATION
 */
export const REQUEST_STATUS = {
	OPEN: 'OPEN',
	IN_PROGRESS: 'IN_PROGRESS',
	COMPLETED: 'COMPLETED',
	CANCELED: 'CANCELED',
	ON_HOLD: 'ON_HOLD',
	CLOSED: 'CLOSED'
} as const

export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS]

/**
 * LEASE TYPE ENUMERATION
 */
export const LEASE_TYPES = {
	FIXED_TERM: 'FIXED_TERM',
	MONTH_TO_MONTH: 'MONTH_TO_MONTH',
	WEEK_TO_WEEK: 'WEEK_TO_WEEK'
} as const

export type LeaseType = (typeof LEASE_TYPES)[keyof typeof LEASE_TYPES]

/**
 * LATE FEE TYPE ENUMERATION
 */
export const LATE_FEE_TYPES = {
	FIXED: 'FIXED',
	PERCENTAGE: 'PERCENTAGE'
} as const

export type LateFeeType = (typeof LATE_FEE_TYPES)[keyof typeof LATE_FEE_TYPES]

/**
 * REMINDER TYPES ENUMERATION
 */
export const REMINDER_TYPES = {
	RENT_REMINDER: 'RENT_REMINDER',
	LEASE_EXPIRATION: 'LEASE_EXPIRATION',
	MAINTENANCE_DUE: 'MAINTENANCE_DUE',
	PAYMENT_OVERDUE: 'PAYMENT_OVERDUE'
} as const

export type ReminderType = (typeof REMINDER_TYPES)[keyof typeof REMINDER_TYPES]

/**
 * REMINDER STATUS ENUMERATION
 */
export const REMINDER_STATUS = {
	PENDING: 'PENDING',
	SENT: 'SENT',
	FAILED: 'FAILED',
	DELIVERED: 'DELIVERED',
	OPENED: 'OPENED'
} as const

export type ReminderStatus =
	(typeof REMINDER_STATUS)[keyof typeof REMINDER_STATUS]

/**
 * CUSTOMER INVOICE STATUS ENUMERATION
 */
export const CUSTOMER_INVOICE_STATUS = {
	DRAFT: 'DRAFT',
	SENT: 'SENT',
	VIEWED: 'VIEWED',
	PAID: 'PAID',
	OVERDUE: 'OVERDUE',
	CANCELLED: 'CANCELLED'
} as const

export type CustomerInvoiceStatus =
	(typeof CUSTOMER_INVOICE_STATUS)[keyof typeof CUSTOMER_INVOICE_STATUS]

/**
 * RENT CHARGE STATUS ENUMERATION
 */
export const RENT_CHARGE_STATUS = {
	PENDING: 'PENDING',
	PAID: 'PAID',
	PARTIAL: 'PARTIAL',
	OVERDUE: 'OVERDUE',
	CANCELLED: 'CANCELLED'
} as const

export type RentChargeStatus =
	(typeof RENT_CHARGE_STATUS)[keyof typeof RENT_CHARGE_STATUS]

/**
 * PLAN TYPE ENUMERATION
 */
export const PLAN_TYPES = {
	FREETRIAL: 'FREETRIAL',
	STARTER: 'STARTER',
	GROWTH: 'GROWTH',
	TENANTFLOW_MAX: 'TENANTFLOW_MAX'
} as const

export type PlanType = (typeof PLAN_TYPES)[keyof typeof PLAN_TYPES]

/**
 * SUBSCRIPTION STATUS ENUMERATION (Alternative naming)
 */
export const SUB_STATUS = {
	ACTIVE: 'ACTIVE',
	TRIALING: 'TRIALING',
	PAST_DUE: 'PAST_DUE',
	CANCELED: 'CANCELED',
	UNPAID: 'UNPAID',
	INCOMPLETE: 'INCOMPLETE',
	INCOMPLETE_EXPIRED: 'INCOMPLETE_EXPIRED'
} as const

export type SubStatus = (typeof SUB_STATUS)[keyof typeof SUB_STATUS]

/**
 * ACTIVITY ENTITY TYPE ENUMERATION
 */
export const ACTIVITY_ENTITY_TYPES = {
	PROPERTY: 'PROPERTY',
	TENANT: 'TENANT',
	MAINTENANCE: 'MAINTENANCE',
	PAYMENT: 'PAYMENT',
	LEASE: 'LEASE',
	UNIT: 'UNIT'
} as const

export type ActivityEntityType =
	(typeof ACTIVITY_ENTITY_TYPES)[keyof typeof ACTIVITY_ENTITY_TYPES]

/**
 * NOTIFICATION TYPES ENUMERATION
 */
export const NOTIFICATION_TYPES = {
	MAINTENANCE: 'MAINTENANCE',
	LEASE: 'LEASE',
	PAYMENT: 'PAYMENT',
	SYSTEM: 'SYSTEM'
} as const

export type NotificationType =
	(typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES]

/**
 * PERMISSION TYPES ENUMERATION
 */
export const PERMISSION_TYPES = {
	CREATE: 'create',
	READ: 'read',
	UPDATE: 'update',
	DELETE: 'delete'
} as const

export type PermissionType =
	(typeof PERMISSION_TYPES)[keyof typeof PERMISSION_TYPES]

/**
 * ENTITY TYPES ENUMERATION
 */
export const ENTITY_TYPES = {
	PROPERTY: 'property',
	UNIT: 'unit',
	TENANT: 'tenant',
	LEASE: 'lease',
	MAINTENANCE: 'maintenance'
} as const

export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES]

/**
 * ACTION TYPES ENUMERATION
 */
export const ACTION_TYPES = {
	CREATE: 'create',
	UPDATE: 'update',
	DELETE: 'delete',
	VIEW: 'view'
} as const

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES]

/**
 * PERMISSION STRING UNION TYPE
 */
export type Permission = `${EntityType}:${ActionType}`

/**
 * STATUS STRING UNION TYPE
 */
export type Status = 'idle' | 'loading' | 'success' | 'error'

/**
 * UPLOAD STATUS STRING UNION TYPE
 */
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

/**
 * PROCESS STATUS STRING UNION TYPE
 */
export type ProcessStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * TIME PERIOD ENUMERATION
 */
export const TIME_PERIODS = {
	TODAY: 'today',
	YESTERDAY: 'yesterday',
	LAST7DAYS: 'last7days',
	LAST30DAYS: 'last30days',
	THIS_MONTH: 'thisMonth',
	LAST_MONTH: 'lastMonth',
	THIS_YEAR: 'thisYear',
	LAST_YEAR: 'lastYear',
	CUSTOM: 'custom'
} as const

export type TimePeriod = (typeof TIME_PERIODS)[keyof typeof TIME_PERIODS]

/**
 * SORT DIRECTIONS ENUMERATION
 */
export const SORT_DIRECTIONS = {
	ASC: 'asc',
	DESC: 'desc'
} as const

export type SortDirection =
	(typeof SORT_DIRECTIONS)[keyof typeof SORT_DIRECTIONS]

/**
 * HTTP METHODS ENUMERATION
 */
export const HTTP_METHODS = {
	GET: 'GET',
	POST: 'POST',
	PUT: 'PUT',
	PATCH: 'PATCH',
	DELETE: 'DELETE',
	HEAD: 'HEAD',
	OPTIONS: 'OPTIONS'
} as const

/**
 * CACHE INVALIDATION REASONS ENUMERATION
 */
export const CACHE_INVALIDATION_REASONS = {
	TTL_EXPIRED: 'ttl_expired',
	MANUAL: 'manual',
	CIRCUIT_BREAKER_OPENED: 'circuit_breaker_opened',
	MEMORY_PRESSURE: 'memory_pressure',
	TAG_INVALIDATION: 'tag_invalidation'
} as const

export type CacheInvalidationReason =
	(typeof CACHE_INVALIDATION_REASONS)[keyof typeof CACHE_INVALIDATION_REASONS]

/**
 * CACHEABLE ENTITY TYPES ENUMERATION
 */
export const CACHEABLE_ENTITY_TYPES = {
	PROPERTY: 'property',
	UNIT: 'unit',
	TENANT: 'tenant',
	LEASE: 'lease',
	MAINTENANCE: 'maintenance'
} as const

export type CacheableEntityType =
	(typeof CACHEABLE_ENTITY_TYPES)[keyof typeof CACHEABLE_ENTITY_TYPES]

/**
 * ERROR SEVERITY ENUMERATION
 */
export const ERROR_SEVERITIES = {
	LOW: 'low',
	MEDIUM: 'medium',
	HIGH: 'high',
	CRITICAL: 'critical'
} as const

export type ErrorSeverity =
	(typeof ERROR_SEVERITIES)[keyof typeof ERROR_SEVERITIES]

/**
 * SECURITY EVENT TYPES ENUMERATION
 */
export const SECURITY_EVENT_TYPES = {
	UNAUTHORIZED_ACCESS: 'unauthorized_access',
	RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
	SUSPICIOUS_PATTERN: 'suspicious_pattern',
	SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
	XSS_ATTEMPT: 'xss_attempt',
	CSRF_VIOLATION: 'csrf_violation',
	AUTHENTICATION_FAILURE: 'authentication_failure',
	AUTHORIZATION_FAILURE: 'authorization_failure',
	DATA_BREACH_ATTEMPT: 'data_breach_attempt',
	BRUTE_FORCE_ATTEMPT: 'brute_force_attempt',
	SESSION_HIJACK_ATTEMPT: 'session_hijack_attempt',
	API_ABUSE: 'api_abuse',
	MALFORMED_REQUEST: 'malformed_request',
	FILE_UPLOAD_VIOLATION: 'file_upload_violation',
	CORS_VIOLATION: 'cors_violation',
	MALICIOUS_REQUEST: 'malicious_request',
	SUSPICIOUS_ACTIVITY: 'suspicious_activity',
	ACCOUNT_TAKEOVER: 'account_takeover',
	AUTH_FAILURE: 'auth_failure'
} as const

export type SecurityEventType =
	(typeof SECURITY_EVENT_TYPES)[keyof typeof SECURITY_EVENT_TYPES]

/**
 * RESULT TYPE - Performance-optimized union type for success/failure patterns
 */
export type Result<T = void, E = string> =
	| { success: true; value: T; error?: never }
	| { success: false; error: E; value?: never }

/**
 * ASYNC RESULT TYPE - For asynchronous operations
 */
export type { AsyncResult } from '../types/api'
export type { ApiResponse } from '../types/api-contracts'
