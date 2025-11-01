// File: packages/shared/api.ts
// Purpose: Shared API DTOs and response types for frontend and backend.

import type { Database } from './supabase-generated.js'
import type { User } from './supabase.js'
type Lease = Database['public']['Tables']['lease']['Row']
type Property = Database['public']['Tables']['property']['Row']
type Unit = Database['public']['Tables']['unit']['Row']
type Tenant = Database['public']['Tables']['tenant']['Row']
// MaintenanceRequest type available if needed: Database['public']['Tables']['maintenance_request']['Row']
import type { ControllerApiResponse as _ControllerApiResponse } from './errors.js'

export type { _ControllerApiResponse as ControllerApiResponse }
// Response types moved to core.ts - using ApiResponse pattern instead

// Note: Core types (User, Lease, Property, etc.) are exported from their own files
// Note: Error types are exported from errors.ts
// Note: Response types are exported from responses.ts
// This file contains only API-specific types to avoid re-export conflicts

// Note: ApiResponse types moved to responses.ts to avoid conflicts

export interface ApiError {
	message: string
	statusCode: number
	error?: string
}

// Frontend API client types (consolidated from apps/frontend/src/lib/api-client.ts)
export interface FrontendApiError {
	message: string
	code?: string
	details?: Record<string, unknown>
	timestamp?: string
}

export interface RequestConfig {
	params?: Record<string, string | number | boolean | string[] | undefined>
	headers?: Record<string, string>
	signal?: AbortSignal
}

// Authentication types
export interface AuthCredentials {
	email: string
	password: string
}

export interface RegisterData extends AuthCredentials {
	name: string
	confirmPassword: string
}

// Note: AuthResponse is defined in auth.ts

export type { RefreshTokenRequest } from './auth'

// User API types
export type UserProfileResponse = User

export interface UpdateUserProfileDto {
	name?: string | null
	phone?: string | null
	bio?: string | null
	avatarUrl?: string | null
}

// Alternative naming for consistency with frontend
export interface UpdateUserProfileInput {
	name?: string | null
	phone?: string | null
	bio?: string | null
	avatarUrl?: string | null
	fullName?: string | null
	company?: string | null
}

// Note: Property, Tenant, Unit, and Lease input types are defined in api-inputs.ts
// Import them from there instead

// Import from api-inputs.ts for consistent type usage
import type {
	CreateLeaseInput,
	CreatePropertyInput,
	CreateTenantInput,
	CreateUnitInput,
	UpdateLeaseInput,
	UpdatePropertyInput,
	UpdateTenantInput,
	UpdateUnitInput
} from './api-inputs.js'

// Direct re-exports - use Input types consistently
export type {
	CreateLeaseInput,
	CreatePropertyInput,
	CreateTenantInput,
	CreateUnitInput,
	UpdateLeaseInput,
	UpdatePropertyInput,
	UpdateTenantInput,
	UpdateUnitInput
}

export interface UnitStats {
	totalUnits: number
	availableUnits: number
	occupiedUnits: number
	maintenanceUnits: number
	averageRent: number
	// Additional properties needed by tests
	total: number
	occupied: number
	vacant: number
	occupancyRate: number
}

export interface LeaseStats {
	totalLeases: number
	activeLeases: number
	expiredLeases: number
	pendingLeases: number
	totalRentRoll: number
	// Additional properties needed by tests
	total: number
	active: number
}

export interface ExpiringLease extends Omit<Lease, 'endDate'> {
	rentAmount: number
	endDate: string
	unit: Unit & {
		property: Property
	}
	tenant: Tenant
	daysUntilExpiry: number
}

// Maintenance API types
export interface CreateMaintenanceDto {
	unitId: string
	title: string
	description: string
	priority?: string
	status?: string
}

export interface UpdateMaintenanceDto {
	title?: string
	description?: string
	priority?: string
	status?: string
	assignedTo?: string
	estimatedCost?: number
	actualCost?: number
	completedAt?: string
}

// Notification API types
export type {
	CreateNotificationDto,
	UpdateNotificationDto
} from './notifications'

// File upload types
export interface FileUploadResponse {
	url: string
	path: string
	filename: string
	size: number
	mimeType: string
}

// Query parameters for API calls - using comprehensive query types from queries.ts
export type {
	LeaseQuery,
	MaintenanceQuery,
	NotificationQuery,
	PropertyQuery,
	TenantQuery,
	UnitQuery
} from './queries.js'

// Note: *WithDetails types are defined in relations.ts to avoid circular imports

// DashboardStats moved to core.ts to follow single source of truth architecture

export type { ActivityItem } from './activity'

export interface DashboardActivity {
	activities: {
		id: string
		type: 'property' | 'tenant' | 'lease' | 'maintenance'
		action: 'created' | 'updated' | 'deleted'
		title: string
		description: string
		timestamp: string
		userId: string
	}[]
}

// Invitation types
export interface InviteTenantDto {
	name: string
	email: string
	phone?: string
	emergencyContact?: string
	propertyId: string
	unitId: string
}

export interface InviteTenantData {
	name: string
	email: string
	phone?: string
	propertyId: string
	unitId?: string // Optional unit selection
}

export interface InvitationResponse {
	success: boolean
	message: string
	invitation?: {
		id: string
		token: string
		expiresAt: string
	}
}

// Subscription & Billing API Types

// Subscription request types
export interface CreateSubscriptionRequest {
	planId: string
	billingPeriod: string
	userId?: string
	userEmail?: string
	userName?: string
	createAccount?: boolean
	paymentMethodCollection?: 'always' | 'if_required'
}

export interface CreateSubscriptionWithSignupRequest {
	planId: string
	billingPeriod: string
	userEmail: string
	userName: string
	createAccount: boolean
	paymentMethodCollection?: 'always' | 'if_required'
}

export interface StartTrialRequest {
	planId?: string // Optional plan ID if trial is plan-specific
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

// Subscription response types moved to responses.ts for consolidation
// These are now imported and re-exported above

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

// ADDITIONAL API TYPES - MIGRATED from inline definitions

export interface WebhookClientOptions {
	baseUrl: string
	apiKey?: string
	timeout?: number
	retries?: number
}

export interface ValidationOptions {
	strict?: boolean
	stripUnknown?: boolean
	allowUnknown?: boolean
}

// Server Action and Form State types (React 19 patterns)
export interface ServerActionState {
	success: boolean
	error?: string
	message?: string
	data?: unknown
}

export interface UseServerActionOptions<T extends ServerActionState> {
	onSuccess?: (data: T) => void
	onError?: (error: string) => void
	resetOnSuccess?: boolean
}

export type ActionResult<T = void> =
	| { success: true; data: T; error?: never }
	| { success: false; error: string; data?: never }

// Form state management
export interface FormState {
	success: boolean
	error?: string
	message?: string
	errors?: Record<string, string>
}

export interface UseActionStateFormOptions<T = Record<string, unknown>> {
	resetOnSuccess?: boolean
	validateOnChange?: boolean
	onSuccess?: (data: T) => void
	onError?: (errors: Record<string, string>) => void
}

export interface UseActionStateFormReturn {
	formState: FormState
	isSubmitting: boolean
	register: (name: string) => { name: string }
	handleSubmit: (
		action: (prevState: FormState, formData: FormData) => Promise<FormState>
	) => (formData: FormData) => void
	reset: () => void
}

// Error handling types
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ErrorType =
	| 'VALIDATION_ERROR'
	| 'NETWORK_ERROR'
	| 'AUTHENTICATION_ERROR'
	| 'AUTHORIZATION_ERROR'
	| 'NOT_FOUND_ERROR'
	| 'CONFLICT_ERROR'
	| 'RATE_LIMIT_ERROR'
	| 'INTERNAL_ERROR'
	| 'EXTERNAL_SERVICE_ERROR'
	| 'UNKNOWN_ERROR'

export interface ExtendedAppError extends Error {
	code: ErrorType
	severity: ErrorSeverity
	context?: Record<string, unknown>
	userMessage?: string
	retryable?: boolean
	timestamp?: Date
}

export type AsyncResult<T> =
	| { success: true; data: T; error?: never }
	| { success: false; error: ExtendedAppError; data?: never }

// API client loading states
export interface UseApiCallOptions<TData = unknown> {
	onSuccess?: (data: TData) => void
	onError?: (error: Error) => void
	enabled?: boolean
	staleTime?: number
}

export interface UseLoadingStateOptions {
	initialLoading?: boolean
	timeout?: number
}

// ============================================================================
// RPC API RESPONSE TYPES - Match actual flattened database query responses
// ============================================================================

// MaintenanceRequest with flattened joined data (from get_user_maintenance RPC)
export interface MaintenanceRequestApiResponse {
	// MaintenanceRequest fields
	id: string
	title: string
	description: string
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
	status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'ON_HOLD'
	category: string | null
	unitId: string
	actualCost: number | null
	allowEntry: boolean
	assignedTo: string | null
	completedAt: string | null
	contactPhone: string | null
	createdAt: string
	estimatedCost: number | null
	notes: string | null
	photos: string[] | null
	preferredDate: string | null
	requestedBy: string | null
	updatedAt: string

	// Flattened Unit fields (joined from Unit table)
	unitNumber: string
	unitBedrooms?: number
	unitBathrooms?: number
	unitRent?: number
	unitStatus?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'

	// Flattened Property fields (joined from Property table via Unit)
	propertyId?: string
	propertyName?: string
	propertyAddress?: string
	propertyCity?: string
	propertyState?: string
	propertyType?:
		| 'SINGLE_FAMILY'
		| 'MULTI_UNIT'
		| 'APARTMENT'
		| 'COMMERCIAL'
		| 'CONDO'
		| 'TOWNHOUSE'
		| 'OTHER'

	// Flattened Tenant fields (optional, joined when available)
	tenantName?: string
	tenantEmail?: string
	tenantPhone?: string
}
