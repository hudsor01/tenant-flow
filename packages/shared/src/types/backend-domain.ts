/**
 * BACKEND DOMAIN TYPES
 *
 * Consolidated backend-specific types for controllers, services, and routing
 * Merged from: backend.ts, router.ts, database.ts, and other backend files
 */

import type { Request, Response } from 'express'
import type { ServiceHealth } from './health.js'
import type { Database } from './supabase-generated.js'

// NOTE: Removed re-exports. Import directly from primary sources:
// - Auth types: '@repo/shared/types/auth'
// - Health types: '@repo/shared/types/health'
// - Stripe types: '@repo/shared/types/stripe'

export interface TypeProvider {
	output: Record<string, unknown>
	input: Record<string, unknown>
}

export interface ExpressTypeProvider extends TypeProvider {
	output: Record<string, unknown>
	input: Record<string, unknown>
	serializer?: {
		fromArray: (array: unknown[]) => unknown
		fromObject: (object: Record<string, unknown>) => unknown
	}
}

export interface JSONSchema {
	type?: string | string[]
	properties?: Record<string, JSONSchema>
	required?: string[]
	additionalProperties?: boolean | JSONSchema
	items?: JSONSchema
	enum?: unknown[]
	format?: string
	pattern?: string
	minimum?: number
	maximum?: number
	minLength?: number
	maxLength?: number
	description?: string
	oneOf?: JSONSchema[]
	anyOf?: JSONSchema[]
	allOf?: JSONSchema[]
	$ref?: string
	examples?: unknown[]
	default?: unknown
}

// BACKEND CONTEXT TYPES

// Application user type from public.users table (not auth.users)
export type authUser = Database['public']['Tables']['users']['Row']

export interface Context {
	req: Request
	res: Response
	user?: authUser
}

export type AuthenticatedContext = Context & { user: authUser }

export interface RequestContext {
	requestId: string
	userId?: string
	organizationId?: string
	startTime: Date
	metadata: Record<string, unknown>
}

export interface UserProfileResponse {
	id: string
	email: string
	name: string
	company?: string
	phone?: string
	bio?: string
	avatarUrl?: string
	emailVerified: boolean
	createdAt: string
	updatedAt: string
}

// PROPERTY MANAGEMENT REQUEST TYPES

// Property types
export interface CreatePropertyRequest {
	name: string
	address: string
	city: string
	state: string
	zipCode: string
	unitCount?: number
	description?: string
	type?:
		| 'SINGLE_FAMILY'
		| 'MULTI_UNIT'
		| 'APARTMENT'
		| 'CONDO'
		| 'TOWNHOUSE'
		| 'COMMERCIAL'
	propertyType?:
		| 'SINGLE_FAMILY'
		| 'MULTI_UNIT'
		| 'APARTMENT'
		| 'CONDO'
		| 'TOWNHOUSE'
		| 'COMMERCIAL'
	amenities?: string[]
	imageUrl?: string
}

export interface UpdatePropertyRequest {
	name?: string
	address?: string
	city?: string
	state?: string
	zipCode?: string
	unitCount?: number
	description?: string
	type?:
		| 'SINGLE_FAMILY'
		| 'MULTI_UNIT'
		| 'APARTMENT'
		| 'CONDO'
		| 'TOWNHOUSE'
		| 'COMMERCIAL'
	propertyType?:
		| 'SINGLE_FAMILY'
		| 'MULTI_UNIT'
		| 'APARTMENT'
		| 'CONDO'
		| 'TOWNHOUSE'
		| 'COMMERCIAL'
	amenities?: string[]
	imageUrl?: string

	// Optional version for optimistic locking from frontend inline edits
	version?: number
}

export interface PropertyQueryRequest {
	search?: string
	type?:
		| 'SINGLE_FAMILY'
		| 'MULTI_UNIT'
		| 'APARTMENT'
		| 'CONDO'
		| 'TOWNHOUSE'
		| 'COMMERCIAL'
	city?: string
	state?: string
	limit?: number
	offset?: number
	sortBy?: 'name' | 'address' | 'unitCount' | 'createdAt'
	sortOrder?: 'asc' | 'desc'
}

/**
 * Lease input for service layer operations
 * Centralized type to avoid inline definitions
 */
export interface LeaseInput {
	tenantId: string
	unitId: string
	startDate: string
	endDate: string
	rentAmount: number
	securityDeposit?: number
	status: Database['public']['Enums']['LeaseStatus']
}

// Unit types
export interface CreateUnitRequest {
	propertyId: string
	unitNumber: string
	bedrooms?: number
	bathrooms?: number
	squareFeet?: number
	rentAmount?: number
	isAvailable?: boolean
	rent?: number
	status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
}

export interface UpdateUnitRequest {
	unitNumber?: string
	bedrooms?: number
	bathrooms?: number
	squareFeet?: number
	rentAmount?: number
	isAvailable?: boolean
	rent?: number
	status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
}

export interface UnitQueryRequest {
	propertyId?: string
	isAvailable?: boolean
	minRent?: number
	maxRent?: number
	bedrooms?: number
	bathrooms?: number
	sortBy?:
		| 'unitNumber'
		| 'rentAmount'
		| 'squareFeet'
		| 'bedrooms'
		| 'bathrooms'
		| 'createdAt'
	sortOrder?: 'asc' | 'desc'
	pageSize?: number
	page?: number
	status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
}

// Lease types
export interface CreateLeaseRequest {
	tenant: {
		email: string
		firstName: string
		lastName: string
	}
	unitId: string
	startDate: string
	endDate: string
	monthlyRent: number
	securityDeposit: number
	paymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'YEARLY'
	status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
}

export interface UpdateLeaseRequest {
	startDate?: string
	endDate?: string
	monthlyRent?: number
	securityDeposit?: number
	paymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'YEARLY'
	status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
}

export interface LeaseQueryRequest {
	tenantId?: string
	unitId?: string
	propertyId?: string
	status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
	limit?: number
	offset?: number
	sortBy?: 'startDate' | 'endDate' | 'monthlyRent' | 'createdAt'
	sortOrder?: 'asc' | 'desc'
}

// MaintenanceCategory from database enums (Database already imported above)
type MaintenanceCategory = Database['public']['Enums']['MaintenanceCategory']

export interface CreateMaintenanceRequest {
	unitId: string
	title: string
	description: string
	priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
	category?: MaintenanceCategory
	scheduledDate?: string
	estimatedCost?: number
	photos?: string[]
	allowEntry?: boolean
	contactPhone?: string
	notes?: string | null
}

export interface UpdateMaintenanceRequest {
	title?: string
	description?: string
	priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
	category?: MaintenanceCategory
	status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
	scheduledDate?: string
	completedDate?: string
	estimatedCost?: number
	actualCost?: number
	notes?: string
	allowEntry?: boolean
	contactPhone?: string
}

export interface MaintenanceQueryRequest {
	unitId?: string
	propertyId?: string
	status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
	priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
	category?: MaintenanceCategory
	limit?: number
	offset?: number
	sortBy?: 'createdAt' | 'scheduledDate' | 'priority' | 'status'
	sortOrder?: 'asc' | 'desc'
}

// Tenant types
export interface CreateTenantRequest {
	firstName?: string
	lastName?: string
	email: string
	phone?: string
	dateOfBirth?: string
	ssn?: string
	name?: string
	emergencyContact?: string
	avatarUrl?: string
}

/**
 * ✅ NEW: Complete tenant invitation with lease (Industry Standard - Phase 3.1)
 * Creates tenant + lease + sends Supabase Auth invitation in one atomic operation
 */
export interface InviteTenantWithLeaseRequest {
	tenantData: {
		email: string
		firstName: string
		lastName: string
		phone?: string
	}
	leaseData: {
		propertyId: string
		unitId?: string
		rentAmount: number
		securityDeposit: number
		startDate: string
		endDate: string
	}
}

export interface InviteTenantWithLeaseResponse {
	success: boolean
	tenantId: string
	leaseId: string
	authUserId: string
	message: string
}

export interface UpdateTenantRequest {
	firstName?: string
	lastName?: string
	email?: string
	phone?: string
	dateOfBirth?: string
	name?: string
	emergencyContact?: string
}

export interface TenantQueryRequest {
	search?: string
	email?: string
	phone?: string
	limit?: number
	offset?: number
	sortBy?: 'firstName' | 'lastName' | 'email' | 'createdAt'
}

// SECURITY TYPES

export interface SanitizationConfig {
	enabled: boolean
	maxDepth: number
	maxStringLength: number
	maxArrayLength: number
	maxObjectKeys: number
	allowHTML: boolean
	strictMode: boolean
}

export interface ThreatPattern {
	name: string
	pattern: RegExp
	severity: 'low' | 'medium' | 'high'
	block: boolean
}

export interface SecurityHeadersConfig {
	csp: {
		enabled: boolean
		reportOnly: boolean
		reportUri?: string
	}
	hsts: {
		enabled: boolean
		maxAge: number
		includeSubDomains: boolean
		preload: boolean
	}
	frameOptions: 'DENY' | 'SAMEORIGIN'
	contentTypeOptions: boolean
	xssProtection: boolean
	referrerPolicy: string
	permissionsPolicy: Record<string, string[]>
}

// ROUTER OUTPUT TYPES (API Response Structures)

type MaintenanceRequest =
	Database['public']['Tables']['maintenance_request']['Row']
type Property = Database['public']['Tables']['property']['Row']
type Tenant = Database['public']['Tables']['tenant']['Row']
type Unit = Database['public']['Tables']['unit']['Row']
type Lease = Database['public']['Tables']['lease']['Row']

// Maintenance router outputs
export interface MaintenanceRequestListOutput {
	requests: MaintenanceRequest[]
	total: number
	page: number
	limit: number
}

export interface MaintenanceRequestDetailOutput {
	request: MaintenanceRequest
}

// Property router outputs
export interface PropertyListOutput {
	properties: Property[]
	total: number
	page: number
	limit: number
}

export interface PropertyDetailOutput {
	property: Property
	units?: Unit[]
	tenants?: Tenant[]
}

// Tenant router outputs
export interface TenantListOutput {
	tenants: Tenant[]
	total: number
	page: number
	limit: number
}

export interface TenantDetailOutput {
	tenant: Tenant
	leases?: Lease[]
	currentLease?: Lease
}

// Unit router outputs
export interface UnitListOutput {
	units: Unit[]
	total: number
	page: number
	limit: number
}

export interface UnitDetailOutput {
	unit: Unit
	property?: Property
	currentTenant?: Tenant
	currentLease?: Lease
}

// Lease router outputs
export interface LeaseListOutput {
	leases: Lease[]
	total: number
	page: number
	limit: number
}

export interface LeaseDetailOutput {
	lease: Lease
	tenant?: Tenant
	unit?: Unit
	property?: Property
}

// DATABASE OPTIMIZATION TYPES

export interface DatabaseOptimizationOptions {
	analyzeQueries: boolean
	recommendIndexes: boolean
	vacuumTables: boolean
	updateStatistics: boolean
}

export interface IndexRecommendation {
	table: string
	columns: string[]
	reason: string
	impact: 'high' | 'medium' | 'low'
}

export interface QueryPerformanceMetric {
	query: string
	executionTime: number
	rowsReturned: number
	tablesUsed: string[]
}

// PERFORMANCE MONITORING

// Note: PerformanceMetrics interface moved to health.ts to resolve conflicts

export type { HealthCheckResponse } from './health'

// DATABASE PERFORMANCE & HEALTH (Supabase / Postgres)

// Row describing index usage metrics (derived from pg_stat_* views or RPC)
export interface DbIndexUsageRow {
	schemaname: string
	tablename: string
	indexname: string
	scans: number
	tuples_read: number
	tuples_fetched: number
	size: string
}

// Row describing slow query statistics (typically from pg_stat_statements)
export interface DbSlowQueryRow {
	query: string
	calls: number
	total_time: number
	mean_time: number
	rows: number
	hit_percent: number
}

// Aggregated, normalized DB health metrics returned by backend
export interface DbHealthMetrics {
	connections: number
	cache_hit_ratio: number
	table_sizes: { table_name: string; size: string; row_count: number }[]
	index_sizes: { index_name: string; size: string; table_name: string }[]
}

// Overview payload shape produced by performance RPCs (optional sections)
export interface DbPerformanceOverview {
	index_usage?: unknown
	slow_queries?: unknown
	health?: unknown
	[k: string]: unknown
}

// HEALTH MONITORING TYPES
// Import from '@repo/shared/types/health' instead

// CONFIG TYPES

export interface AppConfig {
	port: number
	host: string
	env: 'development' | 'production' | 'test'
	apiVersion: string
	corsOrigins: string[]
}

export interface DatabaseConfig {
	url: string
	poolMin: number
	poolMax: number
	ssl: boolean
}

export interface SupabaseConfig {
	url: string
	serviceRoleKey: string
	jwtSecret: string
	anonKey: string
}

export interface StripeConfig {
	secretKey: string
	webhookSecret: string
	publishableKey?: string
}

export interface FullConfig {
	app: AppConfig
	database: DatabaseConfig
	supabase: SupabaseConfig
	stripe: StripeConfig
}

// Security audit types
export interface EndpointAudit {
	controller: string
	method: string
	path: string
	httpMethod: string
	isPublic: boolean
	requiredRoles: string[]
	adminOnly: boolean
	hasRateLimit: boolean
	securityRisk: 'low' | 'medium' | 'high' | 'critical'
	recommendations: string[]
	description?: string
}

export interface SecurityAuditReport {
	timestamp: string
	totalEndpoints: number
	publicEndpoints: number
	protectedEndpoints: number
	highRiskEndpoints: number
	criticalRiskEndpoints: number
	endpoints: EndpointAudit[]
	summary: {
		publicEndpointsRatio: number
		authenticationCoverage: number
		rateLimitCoverage: number
		adminAccessPoints: number
		overallRisk: 'low' | 'medium' | 'high' | 'critical'
		recommendations: string[]
	}
}

export type CacheInvalidationReason =
	| 'ttl_expired'
	| 'manual'
	| 'circuit_breaker_opened'
	| 'memory_pressure'
	| 'tag_invalidation'

export type CacheableEntityType =
	| 'property'
	| 'unit'
	| 'tenant'
	| 'lease'
	| 'maintenance'

export interface EndpointInfo {
	controller: string
	method: string
	path: string
	httpMethod: string
	filePath?: string
	line?: number
}

// Script-specific audit result
export interface EndpointAudit {
	controller: string
	method: string
	path: string
	httpMethod: string
	isPublic: boolean
	requiredRoles: string[]
	adminOnly: boolean
	hasRateLimit: boolean
	securityRisk: 'low' | 'medium' | 'high' | 'critical'
	recommendations: string[]
	description?: string
}

// ERROR BOUNDARY TYPES

export interface CircuitState {
	isOpen: boolean
	failureCount: number
	lastFailureTime: number
	lastSuccessTime: number
	nextAttemptTime: number
}

export interface ServiceMetrics {
	totalRequests: number
	successCount: number
	failureCount: number
	avgResponseTime: number
	lastError?: string
	lastErrorTime?: number
}

// SECURITY MONITORING TYPES
export type { SecurityEvent } from './security'

export type SecurityEventType =
	| 'unauthorized_access'
	| 'rate_limit_exceeded'
	| 'suspicious_pattern'
	| 'sql_injection_attempt'
	| 'xss_attempt'
	| 'csrf_violation'
	| 'authentication_failure'
	| 'authorization_failure'
	| 'data_breach_attempt'
	| 'brute_force_attempt'
	| 'session_hijack_attempt'
	| 'api_abuse'
	| 'malformed_request'
	| 'file_upload_violation'
	| 'cors_violation'
	| 'malicious_request'
	| 'suspicious_activity'
	| 'account_takeover'
	| 'auth_failure'

// SecurityMetrics moved to security.ts to eliminate duplication

// SECURITY EXCEPTION FILTER TYPES

export type { ErrorResponse } from './errors'

export interface SecurityErrorContext {
	ip: string
	userAgent?: string
	userId?: string
	endpoint: string
	method: string
	timestamp: string
	errorType: string
	statusCode: number
}

// STRIPE SUBSCRIPTION TYPES

export type StripeSubscriptionStatus =
	| 'ACTIVE'
	| 'CANCELED'
	| 'TRIALING'
	| 'PAST_DUE'
	| 'UNPAID'
	| 'INCOMPLETE'
	| 'INCOMPLETE_EXPIRED'

// EXPRESS REQUEST TYPES - CONSOLIDATED FROM APPS

// Authenticated request with user attached
export interface AuthenticatedRequest extends Request {
	user: authUser
	startTime?: number
	id?: string
}

// Raw request body for webhooks
export interface RawBodyRequest extends Request {
	rawBody?: Buffer
}

// Combined authenticated request with raw body support
export interface AuthenticatedRawRequest extends AuthenticatedRequest {
	rawBody?: Buffer
}

// Organization-scoped request
export interface OrganizationRequest extends AuthenticatedRequest {
	organizationId: string
}

// Request with timing information
export interface TimedRequest extends Request {
	startTime: number
	duration?: number
	id?: string
}

// Security context for request monitoring
export interface SecurityContextRequest extends Request {
	securityContext?: {
		riskLevel: 'low' | 'medium' | 'high'
		threatIndicators: string[]
		blockRequests: boolean
	}
}

// Request with user attached - Re-export from auth.ts (primary source)
export type { RequestWithUser, ThrottlerRequest } from './auth.js'

// Rate limiting interfaces
export interface RateLimitWindow {
	requests: number
	resetTime: number
}

export interface RateLimitConfig {
	windowMs: number
	maxRequests: number
	keyGenerator?: (req: Request) => string
	skipSuccessfulRequests?: boolean
	skipFailedRequests?: boolean
}

// Removed duplicate - JSONSchema already defined above

// Removed duplicate TypeProvider and ExpressTypeProvider - already defined above

// REQUEST TIMING AND PERFORMANCE

export interface RequestWithTiming extends Request {
	startTime?: number
	id?: string
}

// Renamed from PerformanceMetrics to avoid conflict with health.ts endpoint metrics
export interface SystemPerformanceMetrics {
	uptime: number
	memory: {
		used: number
		free: number
		usagePercentage: number
	}
	cpu: {
		user: number
		system: number
	}
	requests: {
		total: number
		successful: number
		failed: number
		avgResponseTime: number
	}
}

export interface CircuitBreakerStatus {
	timestamp: string
	services: Record<string, ServiceHealth>
	overall: 'healthy' | 'degraded' | 'unhealthy'
}

// STRIPE WEBHOOK AND BILLING TYPES

export interface BackendCreatePaymentIntentRequest {
	amount: number
	tenantId: string
}

export interface EmbeddedCheckoutRequest {
	priceId?: string // Required for payment/subscription, not needed for setup
	domain: string
}

export interface CreateBillingPortalRequest {
	customerId: string
	returnUrl: string
}

export interface VerifyCheckoutSessionRequest {
	sessionId: string
}

// SUBSCRIPTION EVENT TYPES

export interface BaseSubscriptionEvent {
	userId: string
	subscriptionId: string
	timestamp?: Date
}

export interface SubscriptionCreatedEvent extends BaseSubscriptionEvent {
	planType: string
	status?: string
}

export interface SubscriptionUpdatedEvent extends BaseSubscriptionEvent {
	previousStatus?: string
	newStatus?: string
	planType?: string
}

export interface SubscriptionCanceledEvent extends BaseSubscriptionEvent {
	canceledAt?: Date
	cancelationReason?: string
}

export interface TrialWillEndEvent extends BaseSubscriptionEvent {
	trialEndDate: Date
	planType: string
}

export interface PaymentFailedEvent extends BaseSubscriptionEvent {
	paymentIntentId: string
	error: string
	attemptCount?: number
}

export interface PaymentSucceededEvent extends BaseSubscriptionEvent {
	paymentIntentId: string
	amount: number
	currency?: string
}

// REGISTERED ROUTE SCHEMA

export type HttpMethod =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'PATCH'
	| 'DELETE'
	| 'HEAD'
	| 'OPTIONS'

export interface RegisteredRouteSchema {
	method: HttpMethod
	path: string
	controller: string
	handler: string
	isPublic: boolean
	requiredRoles?: string[]
	schema?: JSONSchema
}

// EXPRESS ROUTER INTERFACES

export interface ExpressRoute {
	path: string
	methods: Record<string, boolean>
}

export interface ExpressLayer {
	route?: ExpressRoute
	path?: string
	name?: string
}

export interface ExpressRouter {
	stack: ExpressLayer[]
}

// VALIDATION AND ENV TYPES

export interface RequiredEnvVars {
	DATABASE_URL: string
	DIRECT_URL: string
	SUPABASE_URL: string
	SERVICE_ROLE_KEY: string
	SUPABASE_PUBLISHABLE_KEY: string
	NEXTAUTH_SECRET: string
	NEXTAUTH_URL: string
}

export interface ValidationResult {
	success: boolean
	message: string
	data?: unknown
	errors?: string[]
}

// MINIMAL BILLING TYPES

export interface PaymentNotificationData {
	subscriptionId: string
	customerId: string
	amount?: number
	status?: string
}

export interface MinimalSubscription {
	id: string
	customer: string | { id: string }
	status: string
	current_period_end?: number
}

export interface MinimalInvoice {
	id: string
	subscriptionId: string
	customerId: string
	amount?: number
	status?: string
}

// EXPRESS PERFORMANCE SERIALIZER

export interface SerializerMetrics {
	dateSerializationCount: number
	currencySerializationCount: number
	totalSerializations: number
	avgSerializationTime: number
}

// Express migration complete
