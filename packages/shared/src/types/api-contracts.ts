/**
 * CENTRALIZED API CONTRACTS - Single source of truth for all API request/response types
 *
 * Consolidates all duplicate Request/Response/Error interfaces from across the codebase
 * using TypeScript 5.9.2 performance patterns with const assertions and type inference.
 */

import type { Database, Json } from './supabase.js'
import type {
	PropertyType,
	PropertyStatus,
	UnitStatus,
	LeaseStatus,
	MaintenanceCategory,
	MaintenancePriority,
	RequestStatus,
	SubscriptionStatus
} from '../constants/status-types.js'


export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const API_TIMEOUT = 60000; // 60 seconds

export const DEFAULT_RETRY_ATTEMPTS = 3;
export const DEFAULT_RETRY_DELAY = 1000; // 1 second
export const MAX_RETRY_DELAY = 10000; // 10 seconds

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
		user_type: string
	}
	token: string
}

export interface AuthError {
	code: string
	message: string
	field?: string
}

export interface CreatePropertyRequest {
	name: string
	address_line1: string
	address_line2?: string | null
	city: string
	state: string
	postal_code: string
	country?: string
	property_type: PropertyType
	description?: string
}

export interface UpdatePropertyRequest {
	name?: string
	address_line1?: string
	address_line2?: string | null
	city?: string
	state?: string
	postal_code?: string
	country?: string
	property_type?: PropertyType
	status?: PropertyStatus
}

export interface PropertyQueryRequest {
	search?: string
	property_type?: PropertyType
	city?: string
	state?: string
	minRent?: number
	maxRent?: number
	bedrooms?: number
	bathrooms?: number
	status?: PropertyStatus
	sortBy?: 'name' | 'address' | 'unitCount' | 'created_at' | 'rent'
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
		postal_code: string
		property_type: string
		status: string
		created_at: string
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
		postal_code: string
		property_type: string
		description: string | null
		imageUrl: string | null
		status: string
		owner_id: string
		created_at: string
		updated_at: string
	}
	units?: Array<{
		id: string
		unit_number: string
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

export type CreatePropertyInput = Database['public']['Tables']['properties']['Insert']
export type UpdatePropertyInput = Database['public']['Tables']['properties']['Update']

export interface TenantPaymentRecord {
	id: string
	amount: number
	currency: string | null
	status: string
	description: string | null
	receiptEmail: string | null
	metadata: Json | null
	created_at: string | null
}

export interface TenantPaymentHistoryResponse {
	payments: TenantPaymentRecord[]
}

export interface OwnerPaymentSummaryResponse {
	lateFeeTotal: number
	unpaidTotal: number
	unpaidCount: number
	tenantCount: number
}

export interface SendPaymentReminderRequest {
	tenant_id: string
	message?: string
}

export interface SendPaymentReminderResponse {
	success: true
	tenant_id: string
	notificationId: string
	message: string
}


export interface CreateUnitRequest {
	property_id: string
	unit_number: string
	bedrooms?: number
	bathrooms?: number
	square_feet?: number
	rent?: number
	status?: UnitStatus
}

export interface UpdateUnitRequest {
	unit_number?: string
	bedrooms?: number
	bathrooms?: number
	square_feet?: number
	rent?: number
	status?: UnitStatus
}

export interface UnitQueryRequest {
	property_id?: string
	status?: UnitStatus
	minRent?: number
	maxRent?: number
	bedrooms?: number
	bathrooms?: number
	sortBy?:
		| 'unit_number'
		| 'rent'
		| 'square_feet'
		| 'bedrooms'
		| 'bathrooms'
		| 'created_at'
	sortOrder?: 'asc' | 'desc'
	page?: number
	limit?: number
}

export interface UnitListResponse {
	units: Array<{
		id: string
		unit_number: string
		property_id: string
		bedrooms: number
		bathrooms: number
		square_feet: number | null
		rent: number
		status: string
		created_at: string
		updated_at: string
	}>
	total: number
	page: number
	limit: number
}

export interface UnitDetailResponse {
	unit: {
		id: string
		unit_number: string
		property_id: string
		bedrooms: number
		bathrooms: number
		square_feet: number | null
		rent: number
		status: string
		created_at: string
		updated_at: string
	}
	property?: {
		name: string
		address: string
		city: string
		state: string
		postal_code: string
	}
	currentTenant?: {
		id: string
		name: string
		email: string
	}
	currentLease?: {
		id: string
		start_date: string
		end_date: string | null
		rent_amount: number
		status: string
	}
}


export interface CreateTenantRequest {
	stripe_customer_id: string
	date_of_birth?: string
	ssn_last_four?: string
	emergency_contact_name?: string
	emergency_contact_phone?: string
	emergency_contact_relationship?: string
}

export interface UpdateTenantRequest {
	stripe_customer_id?: string
	date_of_birth?: string
	ssn_last_four?: string
	emergency_contact_name?: string
	emergency_contact_phone?: string
	emergency_contact_relationship?: string
}

export type TenantInput = CreateTenantRequest
export type TenantUpdate = UpdateTenantRequest

export interface TenantQueryRequest {
	search?: string
	email?: string
	phone?: string
	property_id?: string
	sortBy?: 'first_name' | 'last_name' | 'email' | 'created_at'
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
		emergency_contact: string | null
		avatarUrl: string | null
		created_at: string
		updated_at: string
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
		emergency_contact: string | null
		avatarUrl: string | null
		created_at: string
		updated_at: string
	}
	leases?: Array<{
		id: string
		start_date: string
		end_date: string | null
		rent_amount: number
		status: string
	}>
	currentLease?: {
		id: string
		start_date: string
		end_date: string | null
		rent_amount: number
		status: string
	}
	unit?: {
		id: string
		unit_number: string
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
		postal_code: string
	}
}


export interface CreateLeaseRequest {
	tenant: {
		email: string
		first_name: string
		last_name: string
		phone?: string
	}
	unit_id: string
	start_date: string
	end_date: string
	rent_amount: number
	security_deposit: number
	paymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'YEARLY'
	status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
	terms?: string
}

export interface UpdateLeaseRequest {
	start_date?: string
	end_date?: string
	rent_amount?: number
	security_deposit?: number
	paymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'YEARLY'
	status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
	terms?: string
}

export interface LeaseQueryRequest {
	tenant_id?: string
	unit_id?: string
	property_id?: string
	status?: LeaseStatus
	sortBy?: 'start_date' | 'end_date' | 'rent_amount' | 'created_at'
	sortOrder?: 'asc' | 'desc'
	page?: number
	limit?: number
}

export interface LeaseListResponse {
	leases: Array<{
		id: string
		tenant_id: string
		unit_id: string
		start_date: string
		end_date: string | null
		rent_amount: number
		security_deposit: number
		status: string
		terms: string | null
		created_at: string
		updated_at: string
	}>
	total: number
	page: number
	limit: number
}

export interface LeaseDetailResponse {
	lease: {
		id: string
		tenant_id: string
		unit_id: string
		property_id: string | null
		start_date: string
		end_date: string | null
		rent_amount: number
		security_deposit: number
		status: string
		terms: string | null
		created_at: string
		updated_at: string
	}
	tenant?: {
		id: string
		name: string
		email: string
		phone: string | null
	}
	unit?: {
		id: string
		unit_number: string
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
		postal_code: string
	}
}


export interface CreateMaintenanceRequest {
	unit_id: string
	tenant_id?: string
	description: string
	priority?: MaintenancePriority
	category?: MaintenanceCategory
	allowEntry?: boolean
	contactPhone?: string
	estimated_cost?: number
	photos?: string[]
	notes?: string
	scheduledDate?: string
}

export interface UpdateMaintenanceRequest {
	description?: string
	priority?: MaintenancePriority
	category?: MaintenanceCategory
	status?: RequestStatus
	scheduledDate?: string
	completedDate?: string
	estimated_cost?: number
	actualCost?: number
	notes?: string
	allowEntry?: boolean
	contactPhone?: string
}

export interface MaintenanceQueryRequest {
	unit_id?: string
	property_id?: string
	status?: RequestStatus
	priority?: MaintenancePriority
	category?: MaintenanceCategory
	sortBy?: 'created_at' | 'scheduledDate' | 'priority' | 'status'
	sortOrder?: 'asc' | 'desc'
	page?: number
	limit?: number
}

export interface MaintenanceListResponse {
	requests: Array<{
		id: string
		description: string
		priority: string
		status: string
		category: string | null
		unit_id: string
		estimated_cost: number | null
		actualCost: number | null
		allowEntry: boolean
		contactPhone: string | null
		notes: string | null
		photos: string[] | null
		created_at: string
		updated_at: string
	}>
	total: number
	page: number
	limit: number
}

export interface MaintenanceDetailResponse {
	request: {
		id: string
		description: string
		priority: string
		status: string
		category: string | null
		unit_id: string
		estimated_cost: number | null
		actualCost: number | null
		allowEntry: boolean
		contactPhone: string | null
		notes: string | null
		photos: string[] | null
		created_at: string
		updated_at: string
	}
	unit?: {
		id: string
		unit_number: string
		property_id: string
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


export interface CreateRentSubscriptionRequest {
	leaseId: string
	paymentMethodId: string
	amount: number
	currency?: string
	billingDayOfMonth: number
}

export type CreateSubscriptionRequest = CreateRentSubscriptionRequest

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
	amount?: number
	billingDayOfMonth?: number
	paymentMethodId?: string
}

export interface RentSubscriptionResponse {
	id: string
	leaseId: string
	tenantId: string
	ownerId: string
	stripeSubscriptionId: string
	stripeCustomerId: string
	paymentMethodId: string
	amount: number
	currency: string
	billingDayOfMonth: number
	nextChargeDate: string | null
	status: SubscriptionStatus
	platformFeePercentage: number
	pausedAt: string | null
	canceledAt: string | null
	createdAt: string
	updatedAt: string
}

export interface SubscriptionActionResponse {
	success: true
	subscription: RentSubscriptionResponse
	message: string
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
		created_at: string
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
	emergency_contact?: string
	property_id: string
	unit_id: string
}

export interface InviteTenantDto {
	name: string
	email: string
	phone?: string
	emergency_contact?: string
	property_id: string
	unit_id: string
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
		totalrent_amount: number
		averageRent: number
		totalsecurity_deposits: number
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
	user_id: string
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
	user_id?: string
	reason: string
	message: string
	timestamp: string
}

// AUTHORIZATION ERROR CONTRACTS
export interface AuthorizationError {
	user_id: string
	resource: string
	operation: string
	requireduser_type: string
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
