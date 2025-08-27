/**
 * FRONTEND-SPECIFIC TYPES
 * Types that are specific to the frontend application state, stores, and components
 * CONSOLIDATED from frontend app-store.ts and other frontend-only files
 */

// Import types we reference
import type { AuthUser } from './auth'

// =============================================================================
// APP STORE TYPES - CONSOLIDATED from frontend app-store.ts
// =============================================================================

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error'
export type Theme = 'light' | 'dark' | 'system'

export interface AppNotification {
	id: string
	level: NotificationLevel
	title: string
	message: string
	timestamp: Date
	read: boolean
	autoHide?: boolean
	duration?: number
}

export interface RecentActivity {
	id: string
	type: string
	description: string
	timestamp: Date
	userId?: string
	resourceId?: string
	resourceType?: string
}

export interface UIPreferences {
	theme: Theme
	sidebarOpen: boolean
	compactMode: boolean
	showWelcome: boolean
	language: string
	timezone: string
}

export interface UserSession {
	user: AuthUser | null
	isAuthenticated: boolean
	lastActivity: Date | null
	sessionExpiry: Date | null
}

export interface AppState {
	// UI State
	notifications: AppNotification[]
	recentActivity: RecentActivity[]
	preferences: UIPreferences
	session: UserSession
	
	// Loading states
	isLoading: boolean
	error: string | null
	
	// Modal/dialog states
	activeModal: string | null
	modalData: unknown
}

// =============================================================================
// FRONTEND HOOK TYPES - CONSOLIDATED from frontend hooks
// =============================================================================

export interface OptimisticAction<T> {
	id: string
	type: 'create' | 'update' | 'delete'
	data: T
	timestamp: Date
	status: 'pending' | 'success' | 'error'
}

export interface UsePropertyFormServerProps {
	onSuccess?: () => void
	onError?: (error: string) => void
	initialData?: unknown
}

// =============================================================================
// CONTEXT TYPES - CONSOLIDATED from frontend contexts
// =============================================================================

export interface AuthContextType {
	user: AuthUser | null
	isLoading: boolean
	signIn: (email: string, password: string) => Promise<void>
	signOut: () => Promise<void>
	refreshSession: () => Promise<void>
}

// =============================================================================
// FRONTEND CONFIG TYPES - CONSOLIDATED from frontend config
// =============================================================================

export interface FrontendConfig {
	apiUrl: string
	supabaseUrl: string
	supabaseAnonKey: string
	stripePublishableKey: string
	posthogKey?: string
	isProd: boolean
	isDev: boolean
}

// =============================================================================
// PROVIDER TYPES - CONSOLIDATED from frontend providers
// =============================================================================

export interface ReactQueryProviderProps {
	children: React.ReactNode
}

// =============================================================================
// ADDITIONAL FRONTEND TYPES - MIGRATED from inline definitions
// =============================================================================

// MIGRATED from apps/frontend/next.config.ts
export interface WebpackConfig {
	ignoreWarnings?: {
		module: RegExp
		message: RegExp
	}[]
	resolve?: {
		fallback?: Record<string, boolean>
	}
	plugins?: unknown[]
}

export interface WebpackContext {
	dev: boolean
	isServer: boolean
}

// MIGRATED from apps/frontend/scripts/validate-env.ts
export interface ValidationError {
	variable: string
	error: string
	severity: 'error' | 'warning'
}

export interface ValidationResult {
	valid: boolean
	errors: ValidationError[]
	warnings: ValidationError[]
}

// MIGRATED from apps/frontend/scripts/auth-health-check.ts
export interface HealthCheckResponse {
	status: 'healthy' | 'unhealthy'
	timestamp: string
	environment: string
	checks: {
		supabase_url: boolean
		supabase_key: boolean
	}
	error?: string
}

export interface LocalAppState extends AppState {
	// Extended local state properties if needed
}

// Optimistic state management (React 19 patterns)
export interface OptimisticState<T extends { id: string }> {
	items: T[]
	pendingActions: OptimisticAction<T>[]
}

export interface OptimisticConfig<T> {
	addOptimistic: (action: OptimisticAction<T>) => void
	removeOptimistic: (id: string) => void
}

// Form state management
export interface UseActionStateFormOptions<T = any> {
	resetOnSuccess?: boolean
	validateOnChange?: boolean
	onSuccess?: (data: T) => void
	onError?: (errors: Record<string, string>) => void
}

export interface UseActionStateFormReturn {
	formState: FormState
	isSubmitting: boolean
	register: (name: string) => { name: string }
	handleSubmit: (action: (prevState: FormState, formData: FormData) => Promise<FormState>) => (formData: FormData) => void
	reset: () => void
}

interface FormState {
	success: boolean
	error?: string
	message?: string
	errors?: Record<string, string>
}

// Mutation loading states
export interface MutationLoadingOptions<TData = unknown, TError = Error, TVariables = void> {
	onSuccess?: (data: TData, variables: TVariables) => void
	onError?: (error: TError, variables: TVariables) => void
	onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void
}

export interface MutationState<TData = unknown> {
	data?: TData
	error: Error | null
	isIdle: boolean
	isLoading: boolean
	isError: boolean
	isSuccess: boolean
}

// Subscription management
export interface SubscriptionManagementResult {
	isLoading: boolean
	error: string | null
	success: boolean
}

export interface UpgradeRequest extends Record<string, unknown> {
	planId: string
	billingPeriod?: 'monthly' | 'yearly'
}

export interface DowngradeRequest extends Record<string, unknown> {
	planId: string
	confirmDowngrade: boolean
}

export interface CancelRequest extends Record<string, unknown> {
	reason?: string
	feedback?: string
}

export interface CheckoutRequest extends Record<string, unknown> {
	planId: string
	billingPeriod: 'monthly' | 'yearly'
}

export interface SubscriptionManagementHook {
	upgrade: (request: UpgradeRequest) => Promise<SubscriptionManagementResult>
	downgrade: (request: DowngradeRequest) => Promise<SubscriptionManagementResult>
	cancel: (request: CancelRequest) => Promise<SubscriptionManagementResult>
	createCheckout: (request: CheckoutRequest) => Promise<SubscriptionManagementResult>
}

// Profile and user data
export interface ProfileData {
	[key: string]: string | undefined
	name: string
	email: string
	phone?: string
	company?: string
	address?: string
	avatar?: string
}

export interface PasswordFormData {
	currentPassword: string
	newPassword: string
	confirmPassword: string
}

export type ProfileFormData = ProfileData

// Signup and authentication
export interface SignupData {
	email: string
	password: string
	fullName: string
	companyName?: string
}

export interface UseSignupOptions {
	onSuccess?: (data: unknown) => void
	onError?: (error: string) => void
	redirectTo?: string
}

export interface SignupFormState {
	step: number
	data: Partial<SignupData>
	isLoading: boolean
	error: string | null
}

// Property form management
export interface PropertyDeletionConfig {
	confirmationRequired: boolean
	cascadeDelete: boolean
	archiveInstead?: boolean
}

export interface PropertyFormServerHookReturn {
	handleSubmit: (data: unknown) => Promise<void>
	isLoading: boolean
	error: string | null
}

// Query sync utilities
export interface QuerySyncOptions {
	queryKey: string[]
	syncInterval?: number
	enabled?: boolean
}