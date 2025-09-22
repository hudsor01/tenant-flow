/**
 * BACKEND DOMAIN TYPES
 *
 * Consolidated backend-specific types for controllers, services, and routing
 * Merged from: backend.ts, router.ts, database.ts, and other backend files
 */

import type { Request, Response } from 'express'
import type { Database } from './supabase-generated'

// =============================================================================
// BACKEND CONTEXT TYPES
// =============================================================================

export interface ValidatedUser {
	id: string
	email: string
	name: string | null
	phone: string | null
	bio: string | null
	avatarUrl: string | null
	role: string
	createdAt: Date
	updatedAt: Date
	emailVerified: boolean
	supabaseId: string
	stripeCustomerId: string | null
	organizationId: string | null | undefined
}

export interface Context {
	req: Request
	res: Response
	user?: ValidatedUser
}

export type AuthenticatedContext = Context & { user: ValidatedUser }

export interface RequestContext {
	requestId: string
	userId?: string
	organizationId?: string
	startTime: Date
	metadata: Record<string, unknown>
}

// =============================================================================
// SECURITY TYPES
// =============================================================================

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

// =============================================================================
// ROUTER OUTPUT TYPES (API Response Structures)
// =============================================================================

type MaintenanceRequest =
	Database['public']['Tables']['MaintenanceRequest']['Row']
type Property = Database['public']['Tables']['Property']['Row']
type Tenant = Database['public']['Tables']['Tenant']['Row']
type Unit = Database['public']['Tables']['Unit']['Row']
type Lease = Database['public']['Tables']['Lease']['Row']

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

// =============================================================================
// DATABASE OPTIMIZATION TYPES
// =============================================================================

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

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================
// Note: PerformanceMetrics interface moved to health.ts to resolve conflicts

export interface HealthCheckResponse {
	status: 'healthy' | 'unhealthy'
	timestamp: string
	version: string
	services: {
		database: 'up' | 'down'
		redis: 'up' | 'down'
		external: 'up' | 'down'
	}
	uptime: number
}

// =============================================================================
// DATABASE PERFORMANCE & HEALTH (Supabase / Postgres)
// =============================================================================

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

// =============================================================================
// HEALTH MONITORING TYPES
// =============================================================================

export interface ServiceHealth {
	healthy: boolean
	responseTime?: number
	lastCheck: string
	details?: Record<string, unknown>
}

export interface SystemHealth {
	status: 'healthy' | 'degraded' | 'unhealthy'
	timestamp: string
	services: {
		database: ServiceHealth
		stripe: ServiceHealth
		cache: ServiceHealth
	}
	performance: {
		uptime: number
		memory: {
			used: number
			free: number
			usagePercentage: number
			usagePercent: number
		}
		cpu: {
			user: number
			system: number
		}
	}
	cacheMetrics: {
		healthy: boolean
		hitRate?: number
		size?: number
	}
	version: string
	deployment: {
		environment: string
		region: string
		instance: string
	}
}

// =============================================================================
// CONFIG TYPES
// =============================================================================

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

// =============================================================================
// CACHE TYPES
// =============================================================================
// Cache types are exported from core.ts to avoid duplication

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

// =============================================================================
// SECURITY AUDIT TYPES
// =============================================================================

// Script-specific endpoint info for security audit
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

// Script-specific audit report
// Duplicate SecurityAuditReport removed - defined above with summary property

// =============================================================================
// ERROR BOUNDARY TYPES
// =============================================================================

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

// =============================================================================
// SECURITY MONITORING TYPES
// =============================================================================

export interface SecurityEvent {
	id: string
	timestamp: string
	type: SecurityEventType
	severity: 'low' | 'medium' | 'high' | 'critical'
	userId?: string
	ip?: string
	ipAddress?: string
	endpoint?: string
	details?: Record<string, unknown>
	resolved?: boolean
	resolutionTime?: Date
	metadata: Record<string, unknown>
	source?: string
	description?: string
	userAgent?: string
}

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

export interface SecurityMetrics {
	totalEvents: number
	criticalEvents: number
	unresolvedEvents: number
	averageResolutionTime: number
	eventsByType: Record<string, number>
	eventsBySeverity: Record<string, number>
	topThreateningIPs: Array<{ ip: string; count: number }>
	recentTrends: {
		lastHour: number
		last24Hours: number
		last7Days: number
	}
}

// =============================================================================
// SECURITY EXCEPTION FILTER TYPES
// =============================================================================

export interface ErrorResponse {
	statusCode: number
	message: string
	error?: string
	timestamp: string
	path: string
	requestId?: string
}

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

// =============================================================================
// STRIPE SUBSCRIPTION TYPES
// =============================================================================

export type StripeSubscriptionStatus =
	| 'ACTIVE'
	| 'CANCELED'
	| 'TRIALING'
	| 'PAST_DUE'
	| 'UNPAID'
	| 'INCOMPLETE'
	| 'INCOMPLETE_EXPIRED'

// Express migration complete
