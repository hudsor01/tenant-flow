/**
 * CENTRALIZED API CONTRACTS - Single source of truth for all API request/response types
 *
 * Consolidates all duplicate Request/Response/Error interfaces from across the codebase
 * using TypeScript 5.9.2 performance patterns with const assertions and type inference.
 */

import type { Database } from './supabase-generated.js'

// PAGINATION CONSTANTS
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

// TIMEOUT CONSTANTS (in milliseconds)
export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const API_TIMEOUT = 60000; // 60 seconds

// RETRY CONSTANTS
export const DEFAULT_RETRY_ATTEMPTS = 3;
export const DEFAULT_RETRY_DELAY = 1000; // 1 second
export const MAX_RETRY_DELAY = 10000; // 10 seconds

// DATABASE TYPE ALIASES
export type AuthUser = Database['public']['Tables']['users']['Row']

// USER AUTHENTICATION CONTRACTS
export interface LoginRequest {
	email: string
	password: string
	rememberMe?: boolean
}

export interface RegisterRequest {
	email: string
	password: string
	name: string
	confirmPassword: string
}

export interface ForgotPasswordRequest {
	email: string
}

export interface ResetPasswordRequest {
	password: string
	token: string
}

export interface ChangePasswordRequest {
	currentPassword: string
	newPassword: string
}

export interface RefreshTokenRequest {
	refreshToken: string
}

export interface AuthResponse {
	user: {
		id: string
		email: string
		name: string
		role: string
	}
	token: string
}

export interface AuthError {
	code: string
	message: string
	field?: string
}

// PROPERTY API CONTRACTS
export interface CreatePropertyRequest {
	name: string
	address: string
	city: string
	state: string
	zipCode: string
	propertyType: Database['public']['Enums']['PropertyType']
	description?: string
	imageUrl?: string
	unitCount?: number
	amenities?: string[]
}

export interface UpdatePropertyRequest {
	name?: string
	address?: string
	city?: string
	state?: string
	zipCode?: string
	propertyType?: Database['public']['Enums']['PropertyType']
	description?: string
	imageUrl?: string
	status?: Database['public']['Enums']['PropertyStatus']
	unitCount?: number
	amenities?: string[]
}

export interface PropertyQueryRequest {
	search?: string
	propertyType?: Database['public']['Enums']['PropertyType']
	city?: string
	state?: string
	minRent?: number
	maxRent?: number
	bedrooms?: number
	bathrooms?: number
	status?: Database['public']['Enums']['PropertyStatus']
	sortBy?: 'name' | 'address' | 'unitCount' | 'createdAt' | 'rent'
	sortOrder?: 'asc' | 'desc'
	page?: number
	limit?: number
}

export interface PropertyListResponse {
	properties: Array<{
		id: string
		name: string
		address: string
		city: string
		state: string
		zipCode: string
		propertyType: string
		status: string
		createdAt: string
	}>
	total: number
	page: number
	limit: number
}

export interface PropertyDetailResponse {
	property: {
		id: string
		name: string
		address: string
		city: string
		state: string
		zipCode: string
		propertyType: string
		description: string | null
		imageUrl: string | null
		status: string
		ownerId: string
		createdAt: string
		updatedAt: string
	}
	units?: Array<{
		id: string
		unitNumber: string
		bedrooms: number
		bathrooms: number
		rent: number
		status: string
	}>
	tenants?: Array<{
		id: string
		name: string
		email: string
	}>
}

export type CreatePropertyInput = Database['public']['Tables']['property']['Insert']
export type UpdatePropertyInput = Database['public']['Tables']['property']['Update']

// UNIT API CONTRACTS
export interface CreateUnitRequest {
	propertyId: string
	unitNumber: string
	bedrooms?: number
	bathrooms?: number
	squareFeet?: number
	rent?: number
	status?: Database['public']['Enums']['UnitStatus']
}

export interface UpdateUnitRequest {
	unitNumber?: string
	bedrooms?: number
	bathrooms?: number
	squareFeet?: number
	rent?: number
	status?: Database['public']['Enums']['UnitStatus']
}

export interface UnitQueryRequest {
	propertyId?: string
	status?: Database['public']['Enums']['UnitStatus']
	minRent?: number
	maxRent?: number
	bedrooms?: number
	bathrooms?: number
	sortBy?:
		| 'unitNumber'
		| 'rent'
		| 'squareFeet'
		| 'bedrooms'
		| 'bathrooms'
		| 'createdAt'
	sortOrder?: 'asc' | 'desc'
	page?: number
	limit?: number
}

export interface UnitListResponse {
	units: Array<{
		id: string
		unitNumber: string
		propertyId: string
		bedrooms: number
		bathrooms: number
		squareFeet: number | null
		rent: number
		status: string
		createdAt: string
		updatedAt: string
	}>
	total: number
	page: number
	limit: number
}

export interface UnitDetailResponse {
	unit: {
		id: string
		unitNumber: string
		propertyId: string
		bedrooms: number
		bathrooms: number
		squareFeet: number | null
		rent: number
		status: string
		createdAt: string
		updatedAt: string
	}
	property?: {
		name: string
		address: string
		city: string
		state: string
		zipCode: string
	}
	currentTenant?: {
		id: string
		name: string
		email: string
	}
	currentLease?: {
		id: string
		startDate: string
		endDate: string | null
		rentAmount: number
		status: string
	}
}

// TENANT API CONTRACTS
export interface CreateTenantRequest {
	firstName?: string
	lastName?: string
	email: string
	phone?: string
	emergencyContact?: string
	name?: string
	avatarUrl?: string
}

export interface UpdateTenantRequest {
	firstName?: string
	lastName?: string
	email?: string
	phone?: string
	emergencyContact?: string
	name?: string
	avatarUrl?: string
}

// Type aliases for backward compatibility with frontend hooks
export type TenantInput = CreateTenantRequest
export type TenantUpdate = UpdateTenantRequest

export interface TenantQueryRequest {
	search?: string
	email?: string
	phone?: string
	propertyId?: string
	sortBy?: 'firstName' | 'lastName' | 'email' | 'createdAt'
	sortOrder?: 'asc' | 'desc'
	page?: number
	limit?: number
}

export interface TenantListResponse {
	tenants: Array<{
		id: string
		name: string
		email: string
		phone: string | null
		emergencyContact: string | null
		avatarUrl: string | null
		createdAt: string
		updatedAt: string
	}>
	total: number
	page: number
	limit: number
}

export interface TenantDetailResponse {
	tenant: {
		id: string
		name: string
		email: string
		phone: string | null
		emergencyContact: string | null
		avatarUrl: string | null
		createdAt: string
		updatedAt: string
	}
	leases?: Array<{
		id: string
		startDate: string
		endDate: string | null
		rentAmount: number
		status: string
	}>
	currentLease?: {
		id: string
		startDate: string
		endDate: string | null
		rentAmount: number
		status: string
	}
	unit?: {
		id: string
		unitNumber: string
		bedrooms: number
		bathrooms: number
		squareFootage: number | null
	}
	property?: {
		id: string
		name: string
		address: string
		city: string
		state: string
		zipCode: string
	}
}

// LEASE API CONTRACTS
export interface CreateLeaseRequest {
	tenant: {
		email: string
		firstName: string
		lastName: string
		phone?: string
	}
	unitId: string
	startDate: string
	endDate: string
	monthlyRent: number
	securityDeposit: number
	paymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'YEARLY'
	status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
	terms?: string
}

export interface UpdateLeaseRequest {
	startDate?: string
	endDate?: string
	monthlyRent?: number
	securityDeposit?: number
	paymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'YEARLY'
	status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
	terms?: string
}

export interface LeaseQueryRequest {
	tenantId?: string
	unitId?: string
	propertyId?: string
	status?: Database['public']['Enums']['LeaseStatus']
	sortBy?: 'startDate' | 'endDate' | 'monthlyRent' | 'createdAt'
	sortOrder?: 'asc' | 'desc'
	page?: number
	limit?: number
}

export interface LeaseListResponse {
	leases: Array<{
		id: string
		tenantId: string
		unitId: string
		startDate: string
		endDate: string | null
		monthlyRent: number
		securityDeposit: number
		status: string
		terms: string | null
		createdAt: string
		updatedAt: string
	}>
	total: number
	page: number
	limit: number
}

export interface LeaseDetailResponse {
	lease: {
		id: string
		tenantId: string
		unitId: string
		propertyId: string | null
		startDate: string
		endDate: string | null
		monthlyRent: number
		securityDeposit: number
		status: string
		terms: string | null
		createdAt: string
		updatedAt: string
	}
	tenant?: {
		id: string
		name: string
		email: string
		phone: string | null
	}
	unit?: {
		id: string
		unitNumber: string
		bedrooms: number
		bathrooms: number
		rent: number
	}
	property?: {
		id: string
		name: string
		address: string
		city: string
		state: string
		zipCode: string
	}
}

// MAINTENANCE API CONTRACTS
export interface CreateMaintenanceRequest {
	unitId: string
	title: string
	description: string
	priority?: Database['public']['Enums']['Priority']
	category?: Database['public']['Enums']['MaintenanceCategory']
	allowEntry?: boolean
	contactPhone?: string
	estimatedCost?: number
	photos?: string[]
	notes?: string
	scheduledDate?: string
}

export interface UpdateMaintenanceRequest {
	title?: string
	description?: string
	priority?: Database['public']['Enums']['Priority']
	category?: Database['public']['Enums']['MaintenanceCategory']
	status?: Database['public']['Enums']['RequestStatus']
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
	status?: Database['public']['Enums']['RequestStatus']
	priority?: Database['public']['Enums']['Priority']
	category?: Database['public']['Enums']['MaintenanceCategory']
	sortBy?: 'createdAt' | 'scheduledDate' | 'priority' | 'status'
	sortOrder?: 'asc' | 'desc'
	page?: number
	limit?: number
}

export interface MaintenanceListResponse {
	requests: Array<{
		id: string
		title: string
		description: string
		priority: string
		status: string
		category: string | null
		unitId: string
		estimatedCost: number | null
		actualCost: number | null
		allowEntry: boolean
		contactPhone: string | null
		notes: string | null
		photos: string[] | null
		createdAt: string
		updatedAt: string
	}>
	total: number
	page: number
	limit: number
}

export interface MaintenanceDetailResponse {
	request: {
		id: string
		title: string
		description: string
		priority: string
		status: string
		category: string | null
		unitId: string
		estimatedCost: number | null
		actualCost: number | null
		allowEntry: boolean
		contactPhone: string | null
		notes: string | null
		photos: string[] | null
		createdAt: string
		updatedAt: string
	}
	unit?: {
		id: string
		unitNumber: string
		propertyId: string
		rent: number
	}
	property?: {
		id: string
		name: string
		address: string
	}
	assignedTo?: {
		id: string
		name: string
	}
}

// SUBSCRIPTION & BILLING CONTRACTS
export interface CreateSubscriptionRequest {
	planId: string
	billingPeriod: 'monthly' | 'annual'
	userId?: string
	userEmail?: string
	userName?: string
	createAccount?: boolean
	paymentMethodCollection?: 'always' | 'if_required'
}

export interface CreateSubscriptionWithSignupRequest {
	planId: string
	billingPeriod: 'monthly' | 'annual'
	userEmail: string
	userName: string
	createAccount: boolean
	paymentMethodCollection?: 'always' | 'if_required'
}

export interface StartTrialRequest {
	planId?: string
}

export interface CreatePortalSessionRequest {
	customerId?: string
	returnUrl?: string
}

export interface CancelSubscriptionRequest {
	subscriptionId: string
}

export interface UpdateSubscriptionRequest {
	subscriptionId: string
	planId?: string
	billingPeriod?: string
}

export interface CreateSubscriptionWithSignupResponse {
	subscriptionId: string
	status: string
	clientSecret?: string | null
	setupIntentId?: string
	trialEnd?: number | null
	user: {
		id: string
		email: string
		fullName: string
	}
	accessToken: string
	refreshToken: string
}

// ERROR RESPONSE CONTRACTS
export interface ErrorResponse {
	success: false
	error: string
	details?: Record<string, unknown>
}

export interface ValidationErrorResponse extends ErrorResponse {
	validationErrors: Record<string, string[]>
}

export interface BusinessErrorResponse extends ErrorResponse {
	code: string
	reason: string
}

// SUCCESS RESPONSE CONTRACTS
export interface SuccessResponse<T = void> {
	success: true
	data?: T
	message?: string
}

export interface ApiResponse<T = unknown> {
	success: boolean
	data?: T
	error?: string
	message?: string
}

// FILE UPLOAD CONTRACTS
export interface FileUploadRequest {
	file: string // base64 encoded
	filename: string
	contentType: string
	folder?: string
}

export interface FileUploadResponse {
	url: string
	path: string
	filename: string
	size: number
	mimeType: string
}

// NOTIFICATION CONTRACTS
export interface CreateNotificationRequest {
	type: string
	title: string
	message: string
	recipientId: string
	priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}

export interface UpdateNotificationRequest {
	title?: string
	message?: string
	read?: boolean
	priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}

export interface NotificationListResponse {
	notifications: Array<{
		id: string
		title: string
		message: string
		type: string
		priority: string
		read: boolean
		createdAt: string
	}>
	total: number
	page: number
	limit: number
}

// HEALTH CHECK CONTRACTS
export interface HealthCheckResponse {
	status: 'ok' | 'unhealthy'
	timestamp: string
	services: {
		database: boolean
		cache: boolean
		storage: boolean
		externalServices: Record<string, boolean>
	}
}

// INVITATION CONTRACTS
export interface InviteTenantRequest {
	name: string
	email: string
	phone?: string
	emergencyContact?: string
	propertyId: string
	unitId: string
}

export interface InviteTenantResponse {
	success: boolean
	message: string
	invitation?: {
		id: string
		token: string
		expiresAt: string
	}
}

// CONTACT FORM CONTRACTS
export interface ContactFormRequest {
	name: string
	email: string
	subject: string
	message: string
	phone?: string
	type?: 'sales' | 'support' | 'general'
}

export interface ContactFormResponse {
	success: boolean
	message: string
}

// FINANCIAL ANALYTICS CONTRACTS
export interface FinancialAnalyticsResponse {
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

export interface ExpenseSummaryResponse {
	categories: Array<{
		category: string
		amount: number
		percentage: number
	}>
	total: number
	period: string
}

// MAINTENANCE ANALYTICS CONTRACTS
export interface MaintenanceAnalyticsResponse {
	categoryBreakdown: Record<string, number>
	statusBreakdown: Record<string, number>
	completionRate: number
	avgResponseTime: number
	avgSatisfaction: number
	totalCost: number
}

// LEASE ANALYTICS CONTRACTS
export interface LeaseAnalyticsResponse {
	metrics: {
		totalLeases: number
		activeLeases: number
		expiredLeases: number
		terminatedLeases: number
		totalMonthlyRent: number
		averageRent: number
		totalSecurityDeposits: number
		expiringLeases: number
	}
}

// OCCUPANCY ANALYTICS CONTRACTS
export interface OccupancyAnalyticsResponse {
	metrics: {
		totalUnits: number
		occupiedUnits: number
		vacantUnits: number
		occupancyRate: number
		moveIns: number
		moveOuts: number
		trend: 'up' | 'down' | 'stable'
		changePercentage: number
	}
}

// STANDALONE ERROR CONTRACTS (for error boundaries and exception handling)
export interface StandaloneError {
	name: string
	message: string
	stack?: string
	code?: string
	status?: number
	severity?: 'low' | 'medium' | 'high' | 'critical'
	context?: Record<string, unknown>
	timestamp: string
}

export interface ErrorBoundaryState {
	hasError: boolean
	error?: StandaloneError
}

export interface ErrorContext {
	componentStack?: string
	errorInfo?: Record<string, unknown>
	operation?: string
}

// COMMON API RESULT PATTERNS
export type ApiResult<T = void> =
	| { success: true; data: T; error?: never }
	| { success: false; error: string; data?: never }

export type AsyncApiResult<T = void> = Promise<ApiResult<T>>

// REQUEST/RESPONSE UTILITY TYPES
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions {
	method: RequestMethod
	headers?: Record<string, string>
	body?: unknown
	signal?: AbortSignal
	timeout?: number
	retries?: number
}

export interface HttpResponse<T = unknown> {
	data: T
	status: number
	headers: Record<string, string>
}

// API CLIENT CONFIGURATION
export interface ApiClientConfig {
	baseUrl: string
	timeout?: number
	retryAttempts?: number
	retryDelay?: number
	defaultHeaders?: Record<string, string>
	interceptors?: {
		request?: (request: RequestOptions) => RequestOptions
		response?: (response: HttpResponse) => HttpResponse
	}
}

// VALIDATION ERROR CONTRACTS
export interface ValidationError {
	field: string
	code: string
	message: string
	value?: unknown
}

export interface ValidationResponse {
	success: boolean
	errors?: ValidationError[]
	warnings?: ValidationError[]
}

// BUSINESS LOGIC ERROR CONTRACTS
export interface BusinessRuleError {
	rule: string
	entity: string
	operation: string
	message: string
	details?: Record<string, unknown>
	timestamp: string
}

// PERMISSION ERROR CONTRACTS
export interface PermissionError {
	resource: string
	action: string
	userId: string
	requiredPermission: string
	message: string
	timestamp: string
}

// RATE LIMIT ERROR CONTRACTS
export interface RateLimitError {
	limit: number
	window: number
	resetTime: number
	message: string
	timestamp: string
}

// DATABASE ERROR CONTRACTS
export interface DatabaseError {
	query: string
	parameters?: unknown[]
	driverError?: unknown
	message: string
	code: string
	timestamp: string
}

// EXTERNAL SERVICE ERROR CONTRACTS
export interface ExternalServiceError {
	service: string
	endpoint: string
	statusCode?: number
	response?: unknown
	message: string
	timestamp: string
}

// PAYMENT ERROR CONTRACTS
export interface PaymentError {
	paymentIntentId: string
	errorCode: string
	errorMessage: string
	amount: number
	currency: string
	message: string
	timestamp: string
}

// FILE UPLOAD ERROR CONTRACTS
export interface FileUploadError {
	filename: string
	fileSize: number
	mimeType: string
	errorCode: string
	message: string
	timestamp: string
}

// AUTHENTICATION ERROR CONTRACTS
export interface AuthenticationError {
	token?: string
	userId?: string
	reason: string
	message: string
	timestamp: string
}

// AUTHORIZATION ERROR CONTRACTS
export interface AuthorizationError {
	userId: string
	resource: string
	operation: string
	requiredRole: string
	message: string
	timestamp: string
}

// NOT FOUND ERROR CONTRACTS
export interface NotFoundError {
	resource: string
	resourceId: string
	message: string
	timestamp: string
}

// CONFLICT ERROR CONTRACTS
export interface ConflictError {
	resource: string
	field: string
	value: string
	message: string
	timestamp: string
}

// INTERNAL ERROR CONTRACTS
export interface InternalError {
	operation: string
	errorCode: string
	details?: Record<string, unknown>
	message: string
	timestamp: string
}

// NETWORK ERROR CONTRACTS
export interface NetworkError {
	url: string
	method: string
	statusCode?: number
	message: string
	timestamp: string
}

// TIMEOUT ERROR CONTRACTS
export interface TimeoutError {
	operation: string
	timeout: number
	message: string
	timestamp: string
}

// VALIDATION ERROR CONTRACTS
export interface InputValidationError {
	field: string
	expected: string
	actual: unknown
	message: string
	timestamp: string
}

// GENERIC ERROR CONTRACTS
export interface GenericError {
	type: string
	message: string
	details?: Record<string, unknown>
	timestamp: string
}
