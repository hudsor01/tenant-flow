// Auth Store Types
import type { User } from '@tenantflow/shared'

// Auth Store Types
export interface AuthStore {
	user: User | null
	isLoading: boolean
	error: string | null
	hasSessionExpired: boolean
	setUser: (user: User | null) => void
	setLoading: (isLoading: boolean) => void
	setError: (error: string | null) => void
	signIn: (email: string, password: string) => Promise<void>
	signUp: (email: string, password: string, name: string) => Promise<void>
	signOut: () => Promise<void>
	checkSession: () => Promise<void>
	updateProfile: (updates: Partial<User>) => Promise<void>
	getCurrentUser: () => Promise<User | null>
	resetSessionCheck: () => void
	resetCircuitBreaker: () => void
}

// Circuit breaker for profile lookup failures
export interface SessionCheckState {
	lastFailTime: number
	failureCount: number
	isCircuitOpen: boolean
}
