import type { User } from './entities'

// Re-export User type and UserRole for convenience
export type { User, UserRole } from './entities'

// Auth state type for the application
export interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
}