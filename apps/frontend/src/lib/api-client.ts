/**
 * Simplified API Client for TenantFlow Backend
 * Basic implementation for build compatibility
 */
import axios, {
	type AxiosInstance,
	type AxiosResponse,
	type AxiosError,
	type AxiosRequestConfig
} from 'axios'
import { logger } from '@/lib/logger'
import { config } from './config'
import { getSession } from './supabase/client'
import type { ControllerApiResponse } from '@repo/shared'



export interface ApiError {
	message: string
	code?: string
	details?: Record<string, unknown>
	timestamp?: string
}

class ApiClient {
	private readonly client: AxiosInstance

	constructor() {
		this.client = axios.create({
			baseURL: config.api.baseURL,
			timeout: config.api.timeout || 30000,
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			withCredentials: true,
			validateStatus: status => status < 500
		})

		this.setupInterceptors()
	}

	private setupInterceptors() {
		// Request interceptor for authentication
		this.client.interceptors.request.use(
			async config => {
				try {
					const { session } = await getSession()
					if (session?.access_token) {
						config.headers.Authorization = `Bearer ${session.access_token}`
					}
				} catch (error) {
					logger.warn('[API] Failed to add authentication:', {
						component: 'lib_api_client.ts',
						data: error
					})
				}
				return config
			},
			error => {
				// Ensure the rejection reason is always an Error
				if (error instanceof Error) {
					return Promise.reject(error)
				}
				return Promise.reject(
					new Error(
						typeof error === 'string'
							? error
							: JSON.stringify(error)
					)
				)
			}
		)

		// Response interceptor for error handling
		this.client.interceptors.response.use(
			response => response,
			async (error: AxiosError) => {
				if (error.response?.status === 401) {
					// Handle authentication errors
					logger.warn(
						'[API] Authentication error - redirecting to login',
						{ component: 'lib_api_client.ts' }
					)
					window.location.href = '/login'
				}
				return Promise.reject(error)
			}
		)
	}

	private async makeRequest<T>(
		method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
		url: string,
		data?: Record<string, unknown> | FormData,
		config?: AxiosRequestConfig
	): Promise<T> {
		try {
			const response: AxiosResponse<ControllerApiResponse<T>> = await this.client.request({
				method,
				url,
				data,
				...config
			})

			// Extract data from backend's ControllerApiResponse format
			const backendResponse = response.data as ControllerApiResponse<T>
			
			if (backendResponse && typeof backendResponse === 'object' && 'success' in backendResponse) {
				if (!backendResponse.success) {
					throw new Error(backendResponse.message || 'Request failed')
				}
				if (backendResponse.data === undefined) {
					throw new Error('Response data is missing from successful request')
				}
				return backendResponse.data
			}

			// Should not reach here with current backend implementation
			throw new Error('Invalid response format from backend')
		} catch (error: unknown) {
			const axiosError = error as AxiosError
			const responseData = axiosError.response?.data as ControllerApiResponse<unknown> | undefined

			const apiError: ApiError = {
				message:
					(responseData?.message as string) ||
					axiosError.message ||
					'Request failed',
				code: responseData?.statusCode?.toString() || axiosError.code,
				details: responseData as unknown as Record<string, unknown>,
				timestamp: new Date().toISOString()
			}

			throw apiError
		}
	}

	// HTTP Methods
	async get<T>(
		url: string,
		config?: AxiosRequestConfig
	): Promise<T> {
		return this.makeRequest<T>('GET', url, undefined, config)
	}

	async post<T>(
		url: string,
		data?: Record<string, unknown> | FormData,
		config?: AxiosRequestConfig
	): Promise<T> {
		return this.makeRequest<T>('POST', url, data, config)
	}

	async put<T>(
		url: string,
		data?: Record<string, unknown> | FormData,
		config?: AxiosRequestConfig
	): Promise<T> {
		return this.makeRequest<T>('PUT', url, data, config)
	}

	async patch<T>(
		url: string,
		data?: Record<string, unknown> | FormData,
		config?: AxiosRequestConfig
	): Promise<T> {
		return this.makeRequest<T>('PATCH', url, data, config)
	}

	async delete<T>(
		url: string,
		config?: AxiosRequestConfig
	): Promise<T> {
		return this.makeRequest<T>('DELETE', url, undefined, config)
	}

	// Health check method
	async healthCheck(): Promise<{ status: string; timestamp: string }> {
		return this.get<{ status: string; timestamp: string }>('/health')
	}

	// Helper method to create cancellable requests
	createCancellableRequest() {
		const controller = new AbortController()
		return {
			signal: controller.signal,
			cancel: () => controller.abort()
		}
	}
}

// Export singleton instance
export const apiClient = new ApiClient()
export default apiClient

// Export type for cancellable requests
export type CancellableRequest = ReturnType<
	ApiClient['createCancellableRequest']
>


