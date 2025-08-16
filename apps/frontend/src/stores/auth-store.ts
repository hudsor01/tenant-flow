import { create } from 'zustand'

interface User {
	id: string
	email: string
	stripeCustomerId?: string
	organizationId?: string
}

interface AuthStore {
	user: User | null
	isAuthenticated: boolean
	isLoading: boolean
	setUser: (user: User | null) => void
	logout: () => void
}

export const useAuthStore = create<AuthStore>(set => ({
	user: null,
	isAuthenticated: false,
	isLoading: false,
	setUser: user => set({ user, isAuthenticated: !!user }),
	logout: () => set({ user: null, isAuthenticated: false })
}))
