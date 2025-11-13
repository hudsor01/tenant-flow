/**
 * BACKEND DOMAIN TYPES
 *
 * Consolidated backend-specific types for controllers, services, and routing
 * Merged from: backend.ts, router.ts, database.ts, and other backend files
 */

import type { Database } from './supabase-generated.js'
import type { Request, Response } from 'express'
import type { HttpMethod } from './core.js'
import type { ServiceHealth } from './health.js'

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


export interface Context {
	req: Request
	res: Response
	user?: Database['public']['Tables']['users']['Row']
}

export type AuthenticatedContext = Context & { user: Database['public']['Tables']['users']['Row'] }

export interface RequestContext {
	requestId: string
	userId?: string
	organizationId?: string
	startTime: Date
	metadata: Record<string, unknown>
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

// Note: PerformanceMetrics interface moved to health.ts to resolve conflicts

export type { HealthCheckResponse } from './health.js'

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
	supabaseKey: string
	jwtSecret: string
	publishableKey: string
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
export type { SecurityEvent } from './security.js'

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

// SECURITY EXCEPTION FILTER TYPES

export type { ErrorResponse } from './errors.js'

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

// Authenticated request with user attached
export interface AuthenticatedRequest extends Request {
	user: Database['public']['Tables']['users']['Row']
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


// REGISTERED ROUTE SCHEMA

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

// EXPRESS PERFORMANCE SERIALIZER

export interface SerializerMetrics {
	dateSerializationCount: number
	currencySerializationCount: number
	totalSerializations: number
	avgSerializationTime: number
}
