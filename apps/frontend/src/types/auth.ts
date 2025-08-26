export interface User {
	id: string
	email: string
	name?: string
	avatarUrl?: string
	role: 'TENANT' | 'LANDLORD' | 'ADMIN'
	emailVerified: boolean
	createdAt: string
	updatedAt: string
	supabaseId: string
	phone?: string | null
	bio?: string | null
	stripeCustomerId?: string | null
	organizationId?: string | null
}

export interface LoginCredentials {
	email: string
	password: string
}

export interface SignupCredentials {
	name: string
	email: string
	password: string
}

export interface AuthError {
	type: 'AUTH_ERROR' | 'VALIDATION_ERROR' | 'NETWORK_ERROR'
	message: string
	code?: string
}

export interface AuthSession {
	user: User
	session: {
		access_token: string
		refresh_token: string
		expires_at?: number
		user: unknown
	}
}

export interface AuthState {
	user: User | null
	loading: boolean
	error: AuthError | null
	isAuthenticated: boolean
}
