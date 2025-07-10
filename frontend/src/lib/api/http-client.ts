import type { ApiError, AuthResponse } from '../../types/api'
import { getApiBaseUrl, TokenManager, ApiClientError } from './base-client'

// HTTP client with error handling and authentication
export class HttpClient {
	private baseUrl: string

	constructor() {
		this.baseUrl = getApiBaseUrl()
	}

	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`
		const token = TokenManager.getAccessToken()

		const headers: HeadersInit = {
			'Content-Type': 'application/json',
			...options.headers
		}

		const hasAuthHeader =
			options.headers &&
			((typeof options.headers === 'object' &&
				!Array.isArray(options.headers) &&
				'Authorization' in options.headers) ||
				(options.headers instanceof Headers &&
					options.headers.has('Authorization')))
		if (token && !hasAuthHeader) {
			;(headers as Record<string, string>)['Authorization'] =
				`Bearer ${token}`
		}

		const config: RequestInit = {
			...options,
			headers
		}
		try {
			let response = await fetch(url, config)

			// Handle 401 (Unauthorized) - attempt token refresh
			if (response.status === 401 && token) {
				const refreshed = await this.tryRefreshToken()
				if (refreshed) {
					;(headers as Record<string, string>)['Authorization'] =
						`Bearer ${TokenManager.getAccessToken()}`
					response = await fetch(url, { ...config, headers })
				} else {
					// If refresh failed, clear tokens and throw error
					TokenManager.clearTokens()
					throw new ApiClientError('Unauthorized', 401)
				}
			}

			return this.handleResponse<T>(response)
		} catch (error: unknown) {
			throw this.handleNetworkError(error)
		}
	}

	private async handleResponse<T>(response: Response): Promise<T> {
		const contentType = response.headers.get('content-type')
		const isJson = contentType?.includes('application/json')

		if (!response.ok) {
			let errorData: ApiError

			if (isJson) {
				errorData = await response.json()
			} else {
				errorData = {
					message: response.statusText || 'An error occurred',
					statusCode: response.status
				}
			}

			throw new ApiClientError(
				errorData.message || 'API request failed',
				response.status,
				errorData
			)
		}

		if (isJson) {
			return response.json()
		}

		// For non-JSON responses (like file downloads)
		return response as unknown as T
	}

	private handleNetworkError(error: unknown): ApiClientError {
		if (
			error instanceof TypeError &&
			error.message &&
			error.message.includes('fetch')
		) {
			return new ApiClientError(
				'Network error - please check your connection',
				0
			)
		}

		if (error instanceof ApiClientError) {
			return error
		}

		return new ApiClientError(
			error instanceof Error ? error.message : 'Unknown error occurred',
			0
		)
	}

	private async tryRefreshToken(): Promise<boolean> {
		const refreshToken = TokenManager.getRefreshToken()
		if (!refreshToken) {
			TokenManager.clearTokens()
			return false
		}

		try {
			const response = await fetch(`${this.baseUrl}/auth/refresh`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ refresh_token: refreshToken })
			})

			if (response.ok) {
				const data: AuthResponse = await response.json()
				TokenManager.setTokens(data.access_token, data.refresh_token)
				return true
			}
		} catch (error) {
			console.error('Token refresh failed:', error)
		}

		TokenManager.clearTokens()
		return false
	}

	async get<T>(
		endpoint: string,
		params?: Record<string, string>
	): Promise<T> {
		const url = params
			? `${endpoint}?${new URLSearchParams(params).toString()}`
			: endpoint

		return this.request<T>(url, {
			method: 'GET'
		})
	}

	async post<T>(endpoint: string, data?: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'POST',
			body: data ? JSON.stringify(data) : undefined
		})
	}

	async put<T>(endpoint: string, data?: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'PUT',
			body: data ? JSON.stringify(data) : undefined
		})
	}

	async delete<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'DELETE'
		})
	}

	async patch<T>(endpoint: string, data?: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'PATCH',
			body: data ? JSON.stringify(data) : undefined
		})
	}

	async uploadFile<T>(
		endpoint: string,
		file: File,
		additionalData?: Record<string, string>
	): Promise<T> {
		const formData = new FormData()
		formData.append('file', file)

		if (additionalData) {
			Object.entries(additionalData).forEach(([key, value]) => {
				formData.append(key, value)
			})
		}

		const token = TokenManager.getAccessToken()
		const headers: HeadersInit = {}

		if (token) {
			headers['Authorization'] = `Bearer ${token}`
		}

		return this.request<T>(endpoint, {
			method: 'POST',
			body: formData,
			headers
		})
	}
}