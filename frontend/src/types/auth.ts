import type { User as EntityUser } from './entities'

// Re-export User for auth context
export type User = EntityUser

// Auth state type for the application
export interface AuthState {
	user: User | null
	isLoading: boolean
	error: string | null
}
