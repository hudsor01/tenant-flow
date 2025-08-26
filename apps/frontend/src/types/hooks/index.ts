/**
 * Hook return types and interfaces
 * Centralizes all custom hook type definitions
 */

import type {
	PaginationParams,
	SortParams,
	ErrorResponse,
	MaybePromise
} from '../core/common'
import type { Property } from '@repo/shared'
import type { Tenant } from '@repo/shared'
import type { User, AuthSession, LoginCredentials, SignupCredentials } from '../auth'

// ============================================
// API Hook Return Types
// ============================================

/**
 * Base API hook state
 */
export interface BaseApiHookState<TData = unknown, TError = ErrorResponse> {
	data: TData | null
	error: TError | null
	loading: boolean
	refetch: () => Promise<void>
}

/**
 * List API hook state
 */
export interface ListApiHookState<TItem = unknown, TError = ErrorResponse>
	extends BaseApiHookState<TItem[], TError> {
	totalCount: number
	hasMore: boolean
	loadMore: () => Promise<void>
}

/**
 * Paginated API hook state
 */
export interface PaginatedApiHookState<TItem = unknown, TError = ErrorResponse>
	extends BaseApiHookState<TItem[], TError> {
	pagination: PaginationParams
	totalPages: number
	hasNext: boolean
	hasPrev: boolean
	goToPage: (page: number) => void
	nextPage: () => void
	prevPage: () => void
}

/**
 * Mutation hook state
 */
export interface MutationHookState<
	TData = unknown,
	TVariables = unknown,
	TError = ErrorResponse
> {
	data: TData | null
	error: TError | null
	loading: boolean
	mutate: (variables: TVariables) => Promise<TData>
	reset: () => void
}

/**
 * Optimistic mutation hook state
 */
export interface OptimisticMutationHookState<
	TData = unknown,
	TVariables = unknown,
	TError = ErrorResponse
> extends MutationHookState<TData, TVariables, TError> {
	optimisticData: TData | null
	rollback: () => void
}

// ============================================
// Entity Hook Types
// ============================================

/**
 * Properties hook return type
 */
export interface UsePropertiesReturn extends PaginatedApiHookState {
	properties: unknown[]
	createProperty: (data: unknown) => Promise<unknown>
	updateProperty: (id: string, data: unknown) => Promise<unknown>
	deleteProperty: (id: string) => Promise<void>
	filters: unknown
	setFilters: (filters: unknown) => void
	sorting: SortParams
	setSorting: (sorting: SortParams) => void
}

/**
 * Property hook return type (single)
 */
export interface UsePropertyReturn extends BaseApiHookState {
	property: Property | null
	updateProperty: (data: Partial<Property>) => Promise<Property>
	deleteProperty: () => Promise<void>
}

/**
 * Tenants hook return type
 */
export interface UseTenantsReturn extends PaginatedApiHookState {
	tenants: Tenant[]
	createTenant: (data: Partial<Tenant>) => Promise<Tenant>
	updateTenant: (id: string, data: Partial<Tenant>) => Promise<Tenant>
	deleteTenant: (id: string) => Promise<void>
	filters: TenantFilters
	setFilters: (filters: TenantFilters) => void
	sorting: SortParams
	setSorting: (sorting: SortParams) => void
}

// ============================================
// Filter Types
// ============================================

export interface TenantFilters {
	search?: string
	status?: string
	invitationStatus?: string
}

/**
 * Units hook return type
 */
export interface UseUnitsReturn extends PaginatedApiHookState {
	units: unknown[]
	createUnit: (data: unknown) => Promise<unknown>
	updateUnit: (id: string, data: unknown) => Promise<unknown>
	deleteUnit: (id: string) => Promise<void>
	propertyId?: string
}

/**
 * Leases hook return type
 */
export interface UseLeasesReturn extends PaginatedApiHookState {
	leases: unknown[]
	createLease: (data: unknown) => Promise<unknown>
	updateLease: (id: string, data: unknown) => Promise<unknown>
	deleteLease: (id: string) => Promise<void>
	filters: unknown
	setFilters: (filters: unknown) => void
}

/**
 * Maintenance requests hook return type
 */
export interface UseMaintenanceRequestsReturn extends PaginatedApiHookState {
	requests: unknown[]
	createRequest: (data: unknown) => Promise<unknown>
	updateRequest: (id: string, data: unknown) => Promise<unknown>
	deleteRequest: (id: string) => Promise<void>
	filters: unknown
	setFilters: (filters: unknown) => void
}

// ============================================
// Auth Hook Types
// ============================================

/**
 * Auth hook return type
 */
export interface UseAuthReturn {
	user: User | null
	session: AuthSession | null
	loading: boolean
	isAuthenticated: boolean
	signIn: (credentials: LoginCredentials) => Promise<User>
	signUp: (credentials: SignupCredentials) => Promise<User>
	signOut: () => Promise<void>
	resetPassword: (email: string) => Promise<void>
	updatePassword: (password: string) => Promise<void>
	refreshSession: () => Promise<void>
}

/**
 * Permission hook return type
 */
export interface UsePermissionsReturn {
	permissions: string[]
	hasPermission: (permission: string) => boolean
	hasAnyPermission: (permissions: string[]) => boolean
	hasAllPermissions: (permissions: string[]) => boolean
	loading: boolean
}

// ============================================
// UI State Hook Types
// ============================================

/**
 * Modal hook return type
 */
export interface UseModalReturn {
	isOpen: boolean
	open: () => void
	close: () => void
	toggle: () => void
}

/**
 * Modal with data hook return type
 */
export interface UseModalWithDataReturn<T> extends UseModalReturn {
	data: T | null
	setData: (data: T | null) => void
	openWith: (data: T) => void
}

/**
 * Disclosure hook return type
 */
export interface UseDisclosureReturn {
	isOpen: boolean
	open: () => void
	close: () => void
	toggle: () => void
	onOpen: () => void
	onClose: () => void
	onToggle: () => void
}

/**
 * Boolean toggle hook return type
 */
export interface UseToggleReturn {
	value: boolean
	toggle: () => void
	setTrue: () => void
	setFalse: () => void
	setValue: (_value: boolean) => void
}

/**
 * Counter hook return type
 */
export interface UseCounterReturn {
	count: number
	increment: () => void
	decrement: () => void
	reset: () => void
	set: (_value: number) => void
}

// ============================================
// Form Hook Types
// ============================================

/**
 * Form hook return type
 */
export interface UseFormReturn<TData = unknown> {
	values: TData
	errors: Record<string, string>
	touched: Record<string, boolean>
	isValid: boolean
	isDirty: boolean
	isSubmitting: boolean
	setValue: (field: keyof TData, value: unknown) => void
	setError: (field: keyof TData, error: string) => void
	clearError: (field: keyof TData) => void
	clearErrors: () => void
	reset: (values?: Partial<TData>) => void
	submit: () => Promise<void>
	handleSubmit: (
		onSubmit: (values: TData) => MaybePromise<void>
	) => (event?: React.FormEvent) => Promise<void>
}

/**
 * Field hook return type
 */
export interface UseFieldReturn<T = unknown> {
	value: T
	error: string | null
	touched: boolean
	setValue: (_value: T) => void
	setError: (_error: string) => void
	clearError: () => void
	onFocus: () => void
	onBlur: () => void
	onChange: (_value: T) => void
}

// ============================================
// Data Management Hook Types
// ============================================

/**
 * Local storage hook return type
 */
export interface UseLocalStorageReturn<T> {
	value: T
	setValue: (_value: T | ((prev: T) => T)) => void
	removeValue: () => void
}

/**
 * Session storage hook return type
 */
export interface UseSessionStorageReturn<T> {
	value: T
	setValue: (_value: T | ((prev: T) => T)) => void
	removeValue: () => void
}

/**
 * Debounced value hook return type
 */
export interface UseDebouncedValueReturn<T> {
	debouncedValue: T
	cancel: () => void
	flush: () => void
}

/**
 * Previous value hook return type
 */
export interface UsePreviousReturn<T> {
	previous: T | undefined
}

/**
 * Copy to clipboard hook return type
 */
export interface UseCopyToClipboardReturn {
	copy: (text: string) => Promise<boolean>
	copied: boolean
	error: Error | null
}

// ============================================
// Media/Device Hook Types
// ============================================

/**
 * Media query hook return type
 */
export interface UseMediaQueryReturn {
	matches: boolean
	loading: boolean
}

/**
 * Window size hook return type
 */
export interface UseWindowSizeReturn {
	width: number | undefined
	height: number | undefined
}

/**
 * Element size hook return type
 */
export interface UseElementSizeReturn {
	ref: React.RefObject<HTMLElement>
	width: number
	height: number
}

/**
 * Intersection observer hook return type
 */
export interface UseIntersectionObserverReturn {
	ref: React.RefObject<HTMLElement>
	isIntersecting: boolean
	entry: IntersectionObserverEntry | null
}

// ============================================
// Event Hook Types
// ============================================

/**
 * Click outside hook return type
 */
export interface UseClickOutsideReturn {
	ref: React.RefObject<HTMLElement>
}

/**
 * Escape key hook return type
 */
export interface UseEscapeKeyReturn {
	ref?: React.RefObject<HTMLElement>
}

/**
 * Keyboard shortcut hook return type
 */
export interface UseKeyboardShortcutReturn {
	ref?: React.RefObject<HTMLElement>
}

/**
 * Mouse position hook return type
 */
export interface UseMousePositionReturn {
	x: number
	y: number
}

// ============================================
// Performance Hook Types
// ============================================

/**
 * Throttled callback hook return type
 */
export interface UseThrottledCallbackReturn<
	T extends (...args: unknown[]) => unknown
> {
	throttledCallback: T
	cancel: () => void
	flush: () => void
}

/**
 * Debounced callback hook return type
 */
export interface UseDebouncedCallbackReturn<
	T extends (...args: unknown[]) => unknown
> {
	debouncedCallback: T
	cancel: () => void
	flush: () => void
}

/**
 * Async state hook return type
 */
export interface UseAsyncReturn<T, E = Error> {
	data: T | null
	error: E | null
	loading: boolean
	execute: (...args: unknown[]) => Promise<T>
	reset: () => void
}
