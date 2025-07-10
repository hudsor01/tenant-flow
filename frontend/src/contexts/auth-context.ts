import { createContext } from 'react'
import type { User } from '@/types/entities'

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