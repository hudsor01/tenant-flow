// File: packages/shared/api.ts
// Purpose: Shared API DTOs and response types for frontend and backend.

import type { User } from './auth'
import type { Lease } from './leases'
import type { Property, Unit, PropertyStats } from './properties'
import type { Tenant, TenantStats } from './tenants'
import type { MaintenanceRequest as _MaintenanceRequest } from './maintenance'
import type { NotificationData as _NotificationData } from './notifications'
import type {
	AppError as _AppError,
	AuthError as _AuthError,
	ValidationError as _ValidationError,
	NetworkError as _NetworkError,
	ServerError as _ServerError,
	BusinessError as _BusinessError,
	FileUploadError as _FileUploadError,
	PaymentError as _PaymentError,
	ErrorResponse as _ErrorResponse,
	SuccessResponse as _SuccessResponse,
	ApiResponse as _CentralizedApiResponse,
	ControllerApiResponse as _ControllerApiResponse
} from './errors'
import type {
	CheckoutResponse as _CheckoutResponse,
	PortalResponse as _CreatePortalSessionResponse,
	TrialResponse as _StartTrialResponse,
	ApiSubscriptionCreateResponse as _CreateSubscriptionResponse,
	SubscriptionUpdateResponse as _UpdateSubscriptionResponse,
	SubscriptionCancelResponse as _CancelSubscriptionResponse
} from './responses'

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

export interface RefreshTokenRequest {
	refresh_token: string
}

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
}

// Note: Property, Tenant, Unit, and Lease input types are defined in api-inputs.ts
// Import them from there instead

// Import from api-inputs.ts for consistent type usage
import type {
	CreatePropertyInput,
	UpdatePropertyInput,
	CreateTenantInput,
	UpdateTenantInput,
	CreateUnitInput,
	UpdateUnitInput,
	CreateLeaseInput,
	UpdateLeaseInput
} from './api-inputs'

// Direct re-exports - use Input types consistently
export type {
	CreatePropertyInput,
	UpdatePropertyInput,
	CreateTenantInput,
	UpdateTenantInput,
	CreateUnitInput,
	UpdateUnitInput,
	CreateLeaseInput,
	UpdateLeaseInput
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
export interface CreateNotificationDto {
	title: string
	message: string
	type: string
	priority: string
	userId: string
	propertyId?: string
	tenantId?: string
	leaseId?: string
	maintenanceId?: string
	actionUrl?: string
	data?: Record<string, unknown>
}

export interface UpdateNotificationDto {
	read?: boolean
}

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
	PropertyQuery,
	TenantQuery,
	UnitQuery,
	LeaseQuery,
	MaintenanceQuery,
	NotificationQuery
} from './queries'

// Note: *WithDetails types are defined in relations.ts to avoid circular imports

// Dashboard statistics
export interface DashboardStats {
	properties: PropertyStats
	tenants: TenantStats
	units: UnitStats
	leases: LeaseStats
	maintenanceRequests: {
		total: number
		open: number
		inProgress: number
		completed: number
	}
	notifications: {
		total: number
		unread: number
	}
	// Additional properties needed by tests
	revenue: {
		total: number
		monthly: number
		collected: number
	}
}

// Dashboard activity item for recent activity feed
export interface ActivityItem {
	id: string
	type: 'property' | 'tenant' | 'lease' | 'maintenance' | 'payment'
	title: string
	description: string
	timestamp: Date
	entityId?: string
	entityType?: string
	userId?: string
	metadata?: Record<string, unknown>
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

// ========================
// Subscription & Billing API Types
// ========================

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
