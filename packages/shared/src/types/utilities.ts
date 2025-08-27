/**
 * Shared Utility Types for TenantFlow
 *
 * Common TypeScript utility types that enhance type safety and developer experience
 * across both frontend and backend applications.
 */

// ========================
// Type Manipulation Utilities
// ========================

/**
 * Deep readonly for nested objects
 */
export type DeepReadonly<T> = {
	readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

/**
 * Deep partial for nested objects
 */
export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Extract keys from T where the value extends U
 */
export type KeysOfType<T, U> = {
	[K in keyof T]: T[K] extends U ? K : never
}[keyof T]

/**
 * Create a type that excludes functions from T
 */
export type NonFunctionKeys<T> = {
	[K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? never : K
}[keyof T]

export type NonFunctionProps<T> = Pick<T, NonFunctionKeys<T>>

// ========================
// String Manipulation Types
// ========================

/**
 * Convert string to camelCase type
 */
export type CamelCase<S extends string> =
	S extends `${infer P1}_${infer P2}${infer P3}`
		? `${P1}${Uppercase<P2>}${CamelCase<P3>}`
		: S

/**
 * Convert string to snake_case type
 */
export type SnakeCase<S extends string> = S extends `${infer T}${infer U}`
	? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${SnakeCase<U>}`
	: S

/**
 * Convert string to kebab-case type
 */
export type KebabCase<S extends string> = S extends `${infer T}${infer U}`
	? `${T extends Capitalize<T> ? '-' : ''}${Lowercase<T>}${KebabCase<U>}`
	: S


// Import API response types from consolidated source
import type {
	ApiSuccessResponse as _ApiSuccessResponse,
	ApiErrorResponse as _ApiErrorResponse,
	ApiPaginatedResponse
} from './responses'

/**
 * Standard API response wrapper - now uses consolidated types from errors.ts
 * Note: ApiResponse is exported from errors.ts to avoid conflicts
 */
// export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Paginated API response - now uses consolidated types
 */
export type PaginatedApiResponse<T = unknown> = ApiPaginatedResponse<T>

/**
 * API error response - now uses consolidated types from responses.ts
 */
export type { ApiErrorResponse } from './responses'

// ========================
// Form and Validation Types
// ========================

/**
 * Form field error type
 */
export interface FieldError {
	message: string
	type?: string
}

/**
 * Form errors object
 */
export type FormErrors<T> = {
	[K in keyof T]?: FieldError | string
}

/**
 * Form validation result
 */
export interface ValidationResult<T = unknown> {
	success: boolean
	data?: T
	errors?: FormErrors<T>
}

/**
 * Form submission state
 */
export interface FormSubmissionState {
	isSubmitting: boolean
	isSubmitted: boolean
	submitCount: number
}

// ========================
// Event and Handler Types
// ========================

/**
 * Generic event handler type
 */
export type EventHandler<T = Event> = (event: T) => void

// AsyncEventHandler moved to frontend-only.ts to avoid duplication
// Import from there when needed in frontend code

// ========================
// Component Prop Types
// ========================

/**
 * Base props that all components can extend
 */
export interface BaseProps {
	className?: string
	id?: string
	'data-testid'?: string
}

/**
 * Props for components that can be disabled
 */
export interface DisablableProps {
	disabled?: boolean
}

/**
 * Props for components with loading state
 */
export interface LoadableProps {
	loading?: boolean
}

/**
 * Props for components with size variants
 */
export interface SizedProps {
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * Props for components with variant styles
 */
export interface VariantProps<T extends string = string> {
	variant?: T
}

// Frontend-specific component props moved to frontend-only.ts
// Import from there when needed in frontend code

// ========================
// Store and State Types
// ========================

/**
 * Base state type for stores
 */
export interface BaseState {
	isLoading: boolean
	error: string | null
}

/**
 * Data state type for stores that manage data
 */
export type DataState<T> = BaseState & {
	data: T | null
	lastUpdated: Date | null
}

/**
 * List state type for stores that manage lists
 */
export type ListState<T> = BaseState & {
	items: T[]
	total: number
	page: number
	hasMore: boolean
}

/**
 * Store actions type
 */
export type StoreActions<T> = {
	[K in keyof T]: T[K] extends (...args: infer Args) => infer Return
		? (...args: Args) => Return
		: never
}

// ========================
// Configuration Types
// ========================

/**
 * Environment configuration
 */
export type Environment = 'development' | 'staging' | 'production' | 'test'

/**
 * API configuration
 */
export interface ApiConfig {
	baseUrl: string
	timeout: number
	retryAttempts: number
	retryDelay: number
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
	url: string
	maxConnections: number
	connectionTimeout: number
	queryTimeout: number
}

// ========================
// Time and Date Types
// ========================

/**
 * Date range type
 */
export interface DateRange {
	start: Date
	end: Date
}

/**
 * Time period presets
 */
export type TimePeriod =
	| 'today'
	| 'yesterday'
	| 'last7days'
	| 'last30days'
	| 'thisMonth'
	| 'lastMonth'
	| 'thisYear'
	| 'lastYear'
	| 'custom'

// ========================
// File and Upload Types
// ========================

/**
 * File metadata
 */
export interface FileMetadata {
	name: string
	size: number
	type: string
	lastModified: number
}

/**
 * Upload progress
 */
export interface UploadProgress {
	loaded: number
	total: number
	percentage: number
}

/**
 * Upload status
 */
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

// File upload state with File API moved to frontend-only.ts
// Backend-compatible upload types remain here

// ========================
// Result Pattern Types
// ========================

/**
 * Standard result pattern for service layer operations
 */
export interface Result<T = void> {
	success: boolean
	value?: T
	error?: string
	errors?: string[]
}

/**
 * Business rule validation type
 */
export interface BusinessRule {
	name: string
	description: string
	isValid: boolean
	violationMessage?: string
}

/**
 * Utility types for common patterns
 */
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>
export type WithOptional<T, K extends keyof T> = Omit<T, K> &
	Partial<Pick<T, K>>

/**
 * Loading state type
 */
export interface LoadingState {
	isLoading: boolean
	error?: string | null
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
	page: number
	limit: number
	total: number
	totalPages: number
	hasNext: boolean
	hasPrev: boolean
}

/**
 * Offset-based pagination parameters
 */
export interface OffsetPaginationParams {
	offset?: number
	limit?: number
}

// ========================
// Search and Filter Types
// ========================

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Sort configuration
 */
export interface SortConfig<T extends string = string> {
	field: T
	direction: SortDirection
}

/**
 * Filter value types
 */
export type FilterValue = string | number | boolean | Date | null

/**
 * Filter operator
 */
export type FilterOperator =
	| 'eq' // equals
	| 'ne' // not equals
	| 'gt' // greater than
	| 'gte' // greater than or equal
	| 'lt' // less than
	| 'lte' // less than or equal
	| 'in' // in array
	| 'nin' // not in array
	| 'like' // string contains
	| 'ilike' // case insensitive string contains
	| 'regex' // regex match

/**
 * Filter condition
 */
export interface FilterCondition {
	field: string
	operator: FilterOperator
	value: FilterValue | FilterValue[]
}

/**
 * Search and filter configuration
 */
export interface SearchConfig<T extends string = string> {
	query?: string
	filters?: FilterCondition[]
	sort?: SortConfig<T>[]
	page?: number
	limit?: number
}
