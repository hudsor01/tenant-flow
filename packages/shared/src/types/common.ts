/**
 * Common types shared between frontend and backend
 * These types are fundamental to the application and used across services
 */

// ============================================================================
// API Response Types - Consolidated in responses.ts
// ============================================================================

import type {
	ApiSuccessResponse as _ApiSuccessResponse,
	ApiErrorResponse as _ApiErrorResponse,
	ApiPaginatedResponse
} from './responses'

// Type aliases for backwards compatibility
// Note: ApiResponse is exported from errors.ts to avoid conflicts
// export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// ControllerApiResponse is now defined in errors.ts to avoid conflicts
// Import it from there: import type { ControllerApiResponse } from './errors'

export type PaginatedResponse<T> = ApiPaginatedResponse<T>

// ============================================================================
// Query Types
// ============================================================================

export interface QueryOptions {
	limit?: number
	offset?: number
	orderBy?: string
	orderDirection?: 'asc' | 'desc'
	search?: string
}

export interface LeaseQueryOptions extends QueryOptions {
	status?: LeaseStatus
	unitId?: string
	tenantId?: string
	startDateFrom?: string
	startDateTo?: string
	endDateFrom?: string
	endDateTo?: string
}

export interface PropertyQueryOptions extends QueryOptions {
	propertyType?: PropertyType
	city?: string
	state?: string
	hasUnits?: boolean
}

export interface TenantQueryOptions extends QueryOptions {
	hasActiveLease?: boolean
	propertyId?: string
}

// ============================================================================
// File & Document Types (Backend specific)
// ============================================================================

export interface BackendFileUploadResult {
	url: string
	filename: string
	size: number
	mimeType: string
	message: string
}

export interface PDFGenerationResult extends BackendFileUploadResult {
	buffer?: Buffer
	pages?: number
}

export interface DocumentMetadata {
	filename: string
	mimeType: string
	size: number
	uploadedAt: string
	uploadedBy: string
}

// ============================================================================
// Enum Types (if not already in shared)
// ============================================================================

export type LeaseStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
export type PropertyType =
	| 'SINGLE_FAMILY'
	| 'MULTI_UNIT'
	| 'APARTMENT'
	| 'COMMERCIAL'
export type MaintenanceStatus =
	| 'PENDING'
	| 'IN_PROGRESS'
	| 'COMPLETED'
	| 'CANCELED'
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'

// ============================================================================
// Error Types
// ============================================================================

export interface AppError extends Error {
	code: string
	statusCode: number
	details?: Record<string, unknown>
}

export interface ValidationError extends AppError {
	fields?: Record<string, string[]>
}

// ============================================================================
// Event Types
// ============================================================================

export interface BaseEvent {
	id: string
	type: string
	timestamp: Date
	userId?: string
	metadata?: Record<string, unknown>
}

export interface SubscriptionEvent extends BaseEvent {
	type:
		| 'subscription.created'
		| 'subscription.updated'
		| 'subscription.canceled'
	subscriptionId: string
	customerId: string
	planId?: string
	status?: string
}

export interface PaymentEvent extends BaseEvent {
	type: 'payment.succeeded' | 'payment.failed' | 'payment.refunded'
	paymentId: string
	amount: number
	currency: string
}

// ============================================================================
// Utility Types
// ============================================================================

export type AsyncFunction = (...args: unknown[]) => Promise<unknown>

export type DecoratorMetadata = Record<string, unknown>

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
	T,
	Exclude<keyof T, Keys>
> &
	{
		[K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
	}[Keys]

// ============================================================================
// With Relations Types
// ============================================================================

export interface WithId {
	id: string
}

export interface WithTimestamps {
	createdAt: Date | string
	updatedAt: Date | string
}

export interface WithSoftDelete extends WithTimestamps {
	deletedAt?: Date | string | null
}

export interface WithOwner {
	userId: string
	organizationId?: string
}

// ============================================================================
// Entity Base Types
// ============================================================================

export interface BaseEntity extends WithId, WithTimestamps {}
export interface OwnedEntity extends BaseEntity, WithOwner {}
export interface SoftDeleteEntity extends BaseEntity, WithSoftDelete {}
