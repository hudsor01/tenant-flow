/**
 * API Client for making HTTP requests
 * Basic fetch wrapper with error handling
 */

import type { User } from '@tenantflow/shared/types/auth'

interface ApiClientOptions {
	baseUrl?: string
	headers?: Record<string, string>
}

interface RequestOptions extends RequestInit {
	baseUrl?: string
}

// Auth API types
interface AuthLoginRequest {
	email: string
	password: string
}

interface AuthRegisterRequest {
	email: string
	password: string
	name: string
	confirmPassword: string
}

interface AuthResponse {
	user: User
	access_token?: string
	refresh_token?: string
}

// Tenant API types
interface TenantInvitationData {
	id?: string
	tenant: {
		id: string
		name: string
		email: string
		phone?: string
	}
	property: {
		id: string
		name: string
		address: string
		city: string
		state: string
		zipCode?: string
	}
	unit?: {
		id: string
		unitNumber: string
	}
	propertyOwner: {
		name: string
		email: string
		phone?: string
	}
	expiresAt: string
}

interface AcceptInvitationRequest {
	password: string
	userInfo: {
		id: string
		email: string
		name: string
	}
}

interface AcceptInvitationResponse {
	success: boolean
	message?: string
}

class ApiClient {
	private baseUrl: string
	private defaultHeaders: Record<string, string>

	constructor(options: ApiClientOptions = {}) {
		this.baseUrl = options.baseUrl || ''
		this.defaultHeaders = {
			'Content-Type': 'application/json',
			...options.headers
		}
	}

	// Auth API methods
	auth = {
		login: async (data: AuthLoginRequest): Promise<AuthResponse> => {
			return this.post<AuthResponse>('/auth/login', data)
		},

		register: async (data: AuthRegisterRequest): Promise<AuthResponse> => {
			return this.post<AuthResponse>('/auth/register', data)
		},

		logout: async (): Promise<void> => {
			return this.post<void>('/auth/logout')
		},

		refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
			return this.post<AuthResponse>('/auth/refresh', { refreshToken })
		},

		me: async (): Promise<AuthResponse['user']> => {
			return this.get<AuthResponse['user']>('/auth/me')
		}
	}

	// Tenants API methods
	tenants = {
		verifyInvitation: async (token: string): Promise<TenantInvitationData> => {
			return this.get<TenantInvitationData>(`/tenants/invitations/verify?token=${token}`)
		},

		acceptInvitation: async (token: string, data: AcceptInvitationRequest): Promise<AcceptInvitationResponse> => {
			return this.post<AcceptInvitationResponse>(`/tenants/invitations/accept?token=${token}`, data)
		}
	}

	private async request<T>(
		endpoint: string,
		options: RequestOptions = {}
	): Promise<T> {
		const { baseUrl, ...fetchOptions } = options
		const url = `${baseUrl || this.baseUrl}${endpoint}`

		const config: RequestInit = {
			...fetchOptions,
			headers: {
				...this.defaultHeaders,
				...fetchOptions.headers
			}
		}

		try {
			const response = await fetch(url, config)

			if (!response.ok) {
				throw new Error(`API Error: ${response.status} ${response.statusText}`)
			}

			const contentType = response.headers.get('content-type')
			if (contentType && contentType.includes('application/json')) {
				return response.json()
			}

			return response.text() as T
		} catch (error) {
			console.error('API Request failed:', error)
			throw error
		}
	}

	async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
		return this.request<T>(endpoint, { ...options, method: 'GET' })
	}

	async post<T>(
		endpoint: string,
		data?: Record<string, string | number | boolean | null> | string | AuthLoginRequest | AuthRegisterRequest | AcceptInvitationRequest,
		options?: RequestOptions
	): Promise<T> {
		return this.request<T>(endpoint, {
			...options,
			method: 'POST',
			body: data ? JSON.stringify(data) : undefined
		})
	}

	async put<T>(
		endpoint: string,
		data?: Record<string, string | number | boolean | null> | string,
		options?: RequestOptions
	): Promise<T> {
		return this.request<T>(endpoint, {
			...options,
			method: 'PUT',
			body: data ? JSON.stringify(data) : undefined
		})
	}

	async patch<T>(
		endpoint: string,
		data?: Record<string, string | number | boolean | null> | string,
		options?: RequestOptions
	): Promise<T> {
		return this.request<T>(endpoint, {
			...options,
			method: 'PATCH',
			body: data ? JSON.stringify(data) : undefined
		})
	}

	async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
		return this.request<T>(endpoint, { ...options, method: 'DELETE' })
	}
}

// Export singleton instance
export const apiClient = new ApiClient({
	baseUrl: import.meta.env.VITE_API_URL || '/api'
})

// Export class for custom instances
export { ApiClient }