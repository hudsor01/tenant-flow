/**
 * BACKEND DOMAIN TYPES
 *
 * Consolidated backend-specific types for controllers, services, and routing
 * Merged from: backend.ts, router.ts, database.ts, and other backend files
 */

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
