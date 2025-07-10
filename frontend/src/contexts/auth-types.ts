import { createContext } from 'react'
import type { User } from '@/types/entities'

/**
 * Authentication context type definition
 * Defines the interface for authentication state and methods
 * Used by both NestJS and potential future auth providers
 */
export interface AuthContextType {
	// User state
	user: User | null
	isLoading: boolean
	error: string | null
	
	// Token state
	accessToken: string | null
	token: string | null // Alias for WebSocket compatibility
	
	// Authentication methods
	signUp: (email: string, password: string, name: string) => Promise<void>
	signIn: (email: string, password: string) => Promise<void>
	signInWithGoogle: () => Promise<void>
	signOut: () => Promise<void>
	
	// User profile methods
	updateProfile: (updates: Partial<User>) => Promise<void>
	refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)