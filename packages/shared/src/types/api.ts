
import type { Database } from './supabase.js'
import type { ControllerApiResponse as _ControllerApiResponse } from './errors.js'

export type { _ControllerApiResponse as ControllerApiResponse }

type Lease = Database['public']['Tables']['leases']['Row']
type Property = Database['public']['Tables']['properties']['Row']
type Unit = Database['public']['Tables']['units']['Row']
type Tenant = Database['public']['Tables']['tenants']['Row']

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

export type { RefreshTokenRequest } from './auth.js'

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

export interface UnitStatistics {
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

export interface LeaseStatistics {
	totalLeases: number
	activeLeases: number
	expiredLeases: number
	pendingLeases: number
	totalRentRoll: number
	// Additional properties needed by tests
	total: number
	active: number
}

export interface ExpiringLease extends Omit<Lease, 'end_date'> {
	rent_amount: number
	end_date: string
	unit: Unit & {
		property: Property
	}
	tenant: Tenant
	daysUntilExpiry: number
}

// Maintenance API types
export interface CreateMaintenanceDto {
	unit_id: string
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
	estimated_cost?: number
	actualCost?: number
	completed_at?: string
}

// Notification API types
export type {
	CreateNotificationDto,
	UpdateNotificationDto
} from './notifications.js'

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


export type { ActivityItem } from './activity.js'

export interface DashboardActivity {
	activities: {
		id: string
		type: 'properties' | 'tenants' | 'leases' | 'maintenance'
		action: 'created' | 'updated' | 'deleted'
		title: string
		description: string
		timestamp: string
		user_id: string
	}[]
}

// Invitation types
export interface InviteTenantDto {
	name: string
	email: string
	phone?: string
	emergency_contact?: string
	property_id: string
	unit_id: string
}

export interface InviteTenantData {
	name: string
	email: string
	phone?: string
	property_id: string
	unit_id?: string // Optional unit selection
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

export interface MaintenanceRequestApiResponse {
	// MaintenanceRequest fields
	id: string
	title: string
	description: string
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
	status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'ON_HOLD'
	category: string | null
	unit_id: string
	actualCost: number | null
	allowEntry: boolean
	assignedTo: string | null
	completed_at: string | null
	contactPhone: string | null
	created_at: string
	estimated_cost: number | null
	notes: string | null
	photos: string[] | null
	preferredDate: string | null
	requestedBy: string | null
	updated_at: string

	// Flattened Unit fields (joined from Unit table)
	unit_number: string
	unitBedrooms?: number
	unitBathrooms?: number
	unitRent?: number
	unitStatus?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'

	// Flattened Property fields (joined from Property table via Unit)
	property_id?: string
	propertyName?: string
	propertyAddress?: string
	propertyCity?: string
	propertyState?: string
	property_type?:
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
