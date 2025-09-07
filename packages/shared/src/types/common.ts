/**
 * COMMON TYPES - Shared utilities and cross-cutting types
 * CONSOLIDATED from scattered utility types (including duplicate UploadStatus!)
 */

// =============================================================================
// GENERIC API PATTERNS
// =============================================================================

export interface ApiResponse<T = unknown> {
	data: T
	error?: string
	message?: string
	success?: boolean
}

export interface PaginationParams {
	page?: number
	limit?: number
	offset?: number
}

export interface SortParams {
	sort?: string
	order?: 'asc' | 'desc'
}

export interface SearchParams {
	search?: string
	query?: string
}

export interface QueryOptions
	extends PaginationParams,
		SortParams,
		SearchParams {}

// =============================================================================
// COMMON STATUS TYPES - CONSOLIDATED duplicates
// =============================================================================

// CONSOLIDATED from 2+ files that defined this
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export type ActionStatus = 'pending' | 'success' | 'error'

// =============================================================================
// DASHBOARD TYPES
// =============================================================================

export interface DashboardStats {
	totalProperties: number
	totalUnits: number
	totalTenants: number
	totalRevenue: number
	occupancyRate: number
	maintenanceRequests: number
}

export interface DashboardMetrics {
	revenue: {
		current: number
		previous: number
		change: number
	}
	occupancy: {
		current: number
		previous: number
		change: number
	}
	maintenance: {
		open: number
		completed: number
		avgResponseTime: number
	}
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export interface Notification {
	id: string
	user_id: string
	title: string
	message: string
	type: NotificationType
	priority: NotificationPriority
	read: boolean
	created_at: string
}

export type NotificationType = 'maintenance' | 'lease' | 'payment' | 'system'
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

// =============================================================================
// FILE UPLOAD TYPES
// =============================================================================

export interface FileUpload {
	file: File
	url?: string
	status: UploadStatus
	progress?: number
	error?: string
}

// =============================================================================
// VALIDATION & ERRORS
// =============================================================================

export interface ValidationError {
	field: string
	message: string
	code?: string
}

export interface ValidationResult {
	valid: boolean
	errors: ValidationError[]
}

export interface ErrorResponse {
	error: string
	message: string
	details?: Record<string, string | number | boolean | null>
	timestamp: string
}

// =============================================================================
// FORM TYPES
// =============================================================================

export interface FormState<T = unknown> {
	data: T
	errors: Record<string, string>
	isSubmitting: boolean
	isDirty: boolean
}

export interface FormField {
	name: string
	label: string
	type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox'
	required?: boolean
	placeholder?: string
	options?: { label: string; value: string }[]
}

// =============================================================================
// ADDITIONAL COMMON TYPES - MIGRATED from inline definitions
// =============================================================================

// Environment and configuration types
export interface RequiredEnvVars {
	DATABASE_URL: string
	SUPABASE_URL: string
	SUPABASE_ANON_KEY: string
	SUPABASE_SERVICE_ROLE_KEY: string
	JWT_SECRET: string
	STRIPE_SECRET_KEY: string
	RESEND_API_KEY: string
	NEXT_PUBLIC_SUPABASE_URL: string
	NEXT_PUBLIC_SUPABASE_ANON_KEY: string
	NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string
}

export interface EnvironmentConfig {
	nodeEnv: 'development' | 'production' | 'test'
	port: number
	corsOrigin: string | string[]
	rateLimitMax: number
	logLevel: 'error' | 'warn' | 'info' | 'debug'
	enableSwagger: boolean
	enableHealthCheck: boolean
}

// Date and formatting utilities
export interface DateFormatOptions {
	format?: 'short' | 'medium' | 'long' | 'full'
	includeTime?: boolean
	timezone?: string
	locale?: string
}

// Security configuration
export interface SecurityConfig {
	enableCSRF: boolean
	csrfCookieName: string
	sessionTimeout: number
	maxLoginAttempts: number
	lockoutDuration: number
	enableRateLimiting: boolean
	corsOptions: {
		origin: string | string[]
		credentials: boolean
		methods: string[]
	}
}

// Rate limiting and usage controls
export interface RateLimitOptions {
	windowMs: number
	max: number
	message?: string
	standardHeaders?: boolean
	legacyHeaders?: boolean
}

export interface UsageLimitOptions {
	resource: string
	limit: number
	period: 'minute' | 'hour' | 'day' | 'month'
	message?: string
}

// Serialization and data conversion
export interface SerializerMetrics {
	totalSerializations: number
	averageTime: number
	errorCount: number
	successCount: number
}

export interface DateSerializerOptions {
	format?: 'iso' | 'timestamp' | 'locale'
	timezone?: string
	includeTime?: boolean
}

export interface CurrencySerializerOptions {
	currency: string
	locale?: string
	minimumFractionDigits?: number
	maximumFractionDigits?: number
}

export interface CurrencyAmount {
	value: number
	currency: string
	formatted: string
}

// Request context and metadata
export interface RequestContext {
	requestId: string
	userId?: string
	organizationId?: string
	startTime: Date
	metadata: Record<string, unknown>
}

export interface ThrottlerRequest {
	ip: string
	url: string
	method: string
	timestamp: Date
}

// Health check and monitoring
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

export interface IndexRecommendation {
	table: string
	columns: string[]
	reason: string
	impact: 'high' | 'medium' | 'low'
}

export interface DatabaseOptimizationOptions {
	analyzeQueries: boolean
	recommendIndexes: boolean
	vacuumTables: boolean
	updateStatistics: boolean
}

// SEO and metadata
export interface SEOArticle {
	title: string
	description: string
	author: string
	publishedTime: string
	modifiedTime?: string
	section?: string
	tags?: string[]
}

export interface SEOData {
	title: string
	description: string
	canonical?: string
	image?: string
	type: 'website' | 'article' | 'product'
	article?: SEOArticle
}

// Layout and viewport
export interface Viewport {
	width: number
	height: number
	initialScale: number
	maximumScale: number
	userScalable: boolean
}

// Webpack and build configuration
import type { Configuration } from 'webpack'

export type WebpackConfig = Configuration

export interface WebpackContext {
	dev: boolean
	isServer: boolean
	buildId: string
	config: WebpackConfig
}

// Blog and content management
export interface BlogArticle {
	id: string
	title: string
	slug: string
	excerpt: string
	content: string
	author: {
		name: string
		avatar?: string
		bio?: string
	}
	publishedAt: string
	updatedAt: string
	tags: string[]
	category: string
	readingTime: number
	featured: boolean
}

export interface StateInfo {
	name: string
	abbreviation: string
	timezone: string
	legalRequirements?: {
		noticePeriod: number
		securityDepositLimit: number
		mandatoryDisclosures: string[]
	}
}

// Lease generation
export interface GenerateLeaseOptions {
	state: string
	leaseType: 'residential' | 'commercial'
	customClauses?: string[]
}

export interface LeaseGenerationResult {
	success: boolean
	leaseDocument: string
	templateUsed: string
	generatedAt: Date
}

// Error handling
export interface NodeError extends Error {
	code?: string
	errno?: number
	path?: string
	syscall?: string
}

// Window extensions removed - PostHog Window interface now defined in global.ts
// Use Window interface directly, which includes posthog?: PostHog from global.ts

// =============================================================================
// ENHANCED TENANT TYPES - From RPC functions
// =============================================================================

/**
 * Enhanced tenant response from get_user_tenants RPC function
 * Includes joined data from leases, units, and properties
 */
export interface TenantWithLeaseInfo {
	// Base tenant fields
	id: string
	name: string
	email: string
	phone: string | null
	avatarUrl: string | null
	emergencyContact: string | null
	createdAt: string
	updatedAt: string

	// Current lease information
	currentLease: {
		id: string
		startDate: string
		endDate: string
		rentAmount: number
		securityDeposit: number
		status: string
		terms: string | null
	} | null

	// Unit information
	unit: {
		id: string
		unitNumber: string
		bedrooms: number
		bathrooms: number
		squareFootage: number | null
	} | null

	// Property information
	property: {
		id: string
		name: string
		address: string
		city: string
		state: string
		zipCode: string
	} | null

	// Derived fields for UI display (calculated by DB)
	monthlyRent: number
	leaseStatus: string
	paymentStatus: string
	unitDisplay: string
	propertyDisplay: string
	leaseStart: string | null
	leaseEnd: string | null
}

/**
 * Tenant stats response from get_tenant_stats RPC function
 */
export interface TenantStatsResponse {
	totalTenants: number
	activeTenants: number
	currentPayments: number
	latePayments: number
	totalRent: number
	avgRent: number
	recentAdditions: number
	withContactInfo: number
}

/**
 * Financial overview response from get_financial_overview RPC function
 * All calculations done in database - no frontend business logic
 */
export interface FinancialOverviewResponse {
	chartData: Array<{
		month: string
		monthNumber: number
		scheduled: number
		expenses: number
		income: number
	}>
	summary: {
		totalIncome: number
		totalExpenses: number
		totalScheduled: number
		netIncome: number
	}
	year: number
}

/**
 * Expense summary response from get_expense_summary RPC function
 */
export interface ExpenseSummaryResponse {
	chartData: Array<{
		groceries: number
		transport: number
		other: number
		month: string
	}>
	summary: {
		totalExpenses: number
		maintenanceExpenses: number
		operationalExpenses: number
		monthlyAverage: number
	}
}

/**
 * Dashboard financial stats from get_dashboard_financial_stats RPC function
 */
export interface DashboardFinancialStats {
	totalRevenue: number
	monthlyRecurring: number
	occupancyRate: number
	activeLeases: number
	totalUnits: number
}

/**
 * Lease statistics response from get_lease_stats RPC function
 */
export interface LeaseStatsResponse {
	totalLeases: number
	activeLeases: number
	expiredLeases: number
	terminatedLeases: number
	totalMonthlyRent: number
	averageRent: number
	totalSecurityDeposits: number
}

// Type aliases
export type PlanId = string
export type Locale = 'en' | 'es' | 'fr' | 'de'
export type TexasLeaseData = unknown // Placeholder for lease form data
export type StripeEventObject = unknown
