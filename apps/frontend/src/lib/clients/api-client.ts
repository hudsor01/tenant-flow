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
	private requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
	private retryDelays = [1000, 2000, 4000] // Exponential backoff

	constructor(options: ApiClientOptions = {}) {
		this.baseUrl = options.baseUrl || ''
		this.defaultHeaders = {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache',
			'Pragma': 'no-cache',
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

	/**
	 * Check if request can be cached
	 */
	private isCacheable(method: string, endpoint: string): boolean {
		return method === 'GET' && !endpoint.includes('/auth/') && !endpoint.includes('/realtime')
	}

	/**
	 * Get cache key for request
	 */
	private getCacheKey(url: string, options: RequestInit): string {
		return `${options.method || 'GET'}:${url}:${JSON.stringify(options.headers || {})}`
	}

	/**
	 * Get cached response if valid
	 */
	private getCachedResponse<T>(cacheKey: string): T | null {
		const cached = this.requestCache.get(cacheKey)
		if (cached && Date.now() - cached.timestamp < cached.ttl) {
			return cached.data
		}
		return null
	}

	/**
	 * Cache response with appropriate TTL
	 */
	private setCachedResponse<T>(cacheKey: string, data: T, endpoint: string): void {
		let ttl = 30000 // Default 30s

		// Adjust TTL based on endpoint type
		if (endpoint.includes('/properties') || endpoint.includes('/tenants')) {
			ttl = 60000 // 1 minute for property/tenant data
		} else if (endpoint.includes('/dashboard') || endpoint.includes('/reports')) {
			ttl = 300000 // 5 minutes for dashboard data
		} else if (endpoint.includes('/static') || endpoint.includes('/public')) {
			ttl = 3600000 // 1 hour for static content
		}

		this.requestCache.set(cacheKey, {
			data,
			timestamp: Date.now(),
			ttl
		})

		// Clean up old cache entries (keep only last 100)
		if (this.requestCache.size > 100) {
			const entries = Array.from(this.requestCache.entries())
			entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
			entries.slice(0, 50).forEach(([key]) => this.requestCache.delete(key))
		}
	}

	/**
	 * Retry request with exponential backoff
	 */
	private async retryRequest<T>(
		url: string,
		config: RequestInit,
		attempt: number = 0
	): Promise<T> {
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

			const response = await fetch(url, {
				...config,
				signal: controller.signal
			})

			clearTimeout(timeoutId)

			if (!response.ok) {
				// Retry on 5xx errors and specific 4xx errors
				if (response.status >= 500 || response.status === 429 || response.status === 408) {
					if (attempt < this.retryDelays.length) {
						await new Promise(resolve => setTimeout(resolve, this.retryDelays[attempt]))
						return this.retryRequest<T>(url, config, attempt + 1)
					}
				}
				throw new Error(`API Error: ${response.status} ${response.statusText}`)
			}

			const contentType = response.headers.get('content-type')
			if (contentType && contentType.includes('application/json')) {
				return response.json()
			}

			return response.text() as T
		} catch (error) {
			const errorName = error instanceof Error ? error.name : 'UnknownError'
			if (attempt < this.retryDelays.length && errorName !== 'AbortError') {
				await new Promise(resolve => setTimeout(resolve, this.retryDelays[attempt]))
				return this.retryRequest<T>(url, config, attempt + 1)
			}
			throw error
		}
	}

	private async request<T>(
		endpoint: string,
		options: RequestOptions = {}
	): Promise<T> {
		const { baseUrl, ...fetchOptions } = options
		const url = `${baseUrl || this.baseUrl}${endpoint}`
		const method = fetchOptions.method || 'GET'

		const config: RequestInit = {
			...fetchOptions,
			headers: {
				...this.defaultHeaders,
				...fetchOptions.headers
			}
		}

		// Add edge-specific headers for better caching
		if (method === 'GET') {
			config.headers = {
				...config.headers,
				'Accept': 'application/json',
				'Accept-Encoding': 'gzip, deflate, br',
			}
		}

		// Check cache for GET requests
		const cacheKey = this.getCacheKey(url, config)
		if (this.isCacheable(method, endpoint)) {
			const cached = this.getCachedResponse<T>(cacheKey)
			if (cached) {
				return cached
			}
		}

		try {
			const data = await this.retryRequest<T>(url, config)

			// Cache successful GET responses
			if (this.isCacheable(method, endpoint)) {
				this.setCachedResponse(cacheKey, data, endpoint)
			}

			return data
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
			console.error('API Request failed:', {
				url,
				method,
				error: errorMessage,
				endpoint
			})
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
	baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1'
})

// Export class for custom instances
export { ApiClient }