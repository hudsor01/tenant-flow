import type { User } from './entities'

// Auth state type for the application
export interface AuthState {
	user: User | null
	isLoading: boolean
	error: string | null
}
