'use client'

import { useAuthStateListener, useIsAuthenticated } from '@/hooks/api/use-auth'
import type { Session } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import React, { createContext, useContext } from 'react'

// Auth context for derived state access
interface AuthContextType {
	isAuthenticated: boolean
	isLoading: boolean
	session: Session | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthStoreProvider = ({
	children
}: {
	children: ReactNode
}) => {
	// Set up auth state listener (replaces useEffect)
	useAuthStateListener()

	// Get auth state from TanStack Query
	const authState = useIsAuthenticated()

	return (
		<AuthContext.Provider value={authState}>
			{children}
		</AuthContext.Provider>
	)
}

// Hook to access auth state (replaces useAuthStore)
export function useAuth() {
	const context = useContext(AuthContext)

	if (!context) {
		throw new Error('useAuth must be used within AuthStoreProvider')
	}

	return context
}

// Legacy compatibility hook (use useAuth instead)
interface LegacyAuthState {
	isLoading: boolean
	session: Session | null
	isAuthenticated: boolean
	setSession: () => void
	setLoading: () => void
}

export function useAuthStore<T>(selector: (state: LegacyAuthState) => T): T {
	const { isAuthenticated, isLoading, session } = useAuth()

	// Mock the old store structure for compatibility
	const mockState: LegacyAuthState = {
		isLoading,
		session,
		isAuthenticated,
		setSession: () => {}, // No-op, handled by TanStack Query
		setLoading: () => {} // No-op, handled by TanStack Query
	}

	return selector(mockState)
}
