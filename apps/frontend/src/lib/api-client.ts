/**
 * Simplified API Client using native fetch
 * Eliminates Axios dependency and complex interceptor patterns
 * Includes runtime response validation with Zod schemas
 */
import { config } from './config'
import { getSession } from './supabase/client'
import type { ControllerApiResponse } from '@repo/shared'
import {
	ResponseValidator,
	type ValidationOptions
} from './api/response-validator'
<<<<<<< HEAD
import type { ZodTypeAny } from 'zod'
=======
import type { ZodSchema } from 'zod'
>>>>>>> origin/main

// Type-safe URLSearchParams utility
export function createSearchParams(params: Record<string, unknown>): string {
	const searchParams = new URLSearchParams()

	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== '') {
			// Handle arrays by joining with comma
			if (Array.isArray(value)) {
				const filteredArray = value.filter(
					v => v !== undefined && v !== null && v !== ''
				)
				if (filteredArray.length > 0) {
					searchParams.append(key, filteredArray.join(','))
				}
			} else {
				searchParams.append(key, String(value))
			}
		}
	})

	return searchParams.toString()
}

export interface ApiError {
	message: string
	code?: string
	details?: Record<string, unknown>
	timestamp?: string
}

export interface RequestConfig {
	params?: Record<string, string | number | boolean | string[] | undefined>
	headers?: Record<string, string>
	signal?: AbortSignal
}

class SimpleApiClient {
	private baseURL: string
	private timeout: number

	constructor() {
		this.baseURL = config.api.baseURL
		this.timeout = config.api.timeout ?? 30000
	}

	private async getAuthHeaders(): Promise<Record<string, string>> {
		try {
			const { session } = await getSession()
			return session?.access_token
				? { Authorization: `Bearer ${session.access_token}` }
				: {}
		} catch {
			return {}
		}
	}

	private buildURL(
		path: string,
		params?: Record<
			string,
			string | number | boolean | string[] | undefined
		>
	): string {
		const url = new URL(path, this.baseURL)
		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					if (Array.isArray(value)) {
						value.forEach(v =>
							url.searchParams.append(key, String(v))
						)
					} else {
						url.searchParams.append(key, String(value))
					}
				}
			})
		}
		return url.toString()
	}

	private async makeRequest<T>(
		method: string,
		path: string,
		data?: unknown,
<<<<<<< HEAD
		config?: RequestConfig,
		retryCount = 0
=======
		config?: RequestConfig
>>>>>>> origin/main
	): Promise<T> {
		const authHeaders = await this.getAuthHeaders()
		const isFormData = data instanceof FormData

		const headers: Record<string, string> = {
			Accept: 'application/json',
			...authHeaders,
			...config?.headers
		}

		if (!isFormData) {
			headers['Content-Type'] = 'application/json'
		}

		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), this.timeout)

		try {
			const response = await fetch(this.buildURL(path, config?.params), {
				method,
				headers,
				body: isFormData
					? data
					: data
						? JSON.stringify(data)
						: undefined,
				credentials: 'include',
				signal: config?.signal || controller.signal
			})

			clearTimeout(timeoutId)

			if (response.status === 401) {
				window.location.href = '/login'
				throw new Error('Authentication required')
			}

			if (!response.ok) {
				const errorText = await response.text()
<<<<<<< HEAD
				let errorData: ControllerApiResponse | undefined
=======
				let errorData: ControllerApiResponse<unknown> | undefined
>>>>>>> origin/main

				try {
					errorData = JSON.parse(errorText)
				} catch {
					// Not JSON, use text as message
				}

				const apiError: ApiError = {
					message:
						errorData?.message ||
						`Request failed: ${response.status}`,
					code: response.status.toString(),
					details: errorData ? { ...errorData } : undefined,
					timestamp: new Date().toISOString()
				}
<<<<<<< HEAD
				throw new Error(`API Error: ${apiError.message}`)
=======
				throw apiError
>>>>>>> origin/main
			}

			const responseData: ControllerApiResponse<T> = await response.json()

			if (
				responseData &&
				typeof responseData === 'object' &&
				'success' in responseData
			) {
				if (!responseData.success) {
					throw new Error(responseData.message || 'Request failed')
				}
				if (responseData.data === undefined) {
					throw new Error(
						'Response data is missing from successful request'
					)
				}
				return responseData.data
			}

			throw new Error('Invalid response format from backend')
		} catch (error: unknown) {
			clearTimeout(timeoutId)

			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error('Request timeout')
			}

<<<<<<< HEAD
			// Retry logic for network errors in production
			if (
				retryCount < (this.config?.retries ?? 3) &&
				this.shouldRetry(error)
			) {
				const delay =
					(this.config?.retryDelay ?? 1000) * Math.pow(2, retryCount)
				await new Promise(resolve => setTimeout(resolve, delay))
				return this.makeRequest(
					method,
					path,
					data,
					config,
					retryCount + 1
				)
			}

=======
>>>>>>> origin/main
			throw error
		}
	}

<<<<<<< HEAD
	private shouldRetry(error: unknown): boolean {
		if (!(error instanceof Error)) return false

		// Retry on network errors, timeouts, and 5xx server errors
		return (
			error.name === 'AbortError' ||
			error.message.includes('fetch') ||
			error.message.includes('network') ||
			error.message.includes('500') ||
			error.message.includes('502') ||
			error.message.includes('503') ||
			error.message.includes('504')
		)
	}

	private get config() {
		return {
			retries: config.api.retries,
			retryDelay: config.api.retryDelay
		}
	}

=======
>>>>>>> origin/main
	async get<T>(path: string, config?: RequestConfig): Promise<T> {
		return this.makeRequest<T>('GET', path, undefined, config)
	}

	async post<T>(
		path: string,
		data?: unknown,
		config?: RequestConfig
	): Promise<T> {
		return this.makeRequest<T>('POST', path, data, config)
	}

	async put<T>(
		path: string,
		data?: unknown,
		config?: RequestConfig
	): Promise<T> {
		return this.makeRequest<T>('PUT', path, data, config)
	}

	async patch<T>(
		path: string,
		data?: unknown,
		config?: RequestConfig
	): Promise<T> {
		return this.makeRequest<T>('PATCH', path, data, config)
	}

	async delete<T>(path: string, config?: RequestConfig): Promise<T> {
		return this.makeRequest<T>('DELETE', path, undefined, config)
	}

	// Validated API methods with Zod schema validation
	async getValidated<T>(
		path: string,
<<<<<<< HEAD
		schema: ZodTypeAny,
=======
		schema: ZodSchema<T>,
>>>>>>> origin/main
		schemaName: string,
		config?: RequestConfig,
		validationOptions?: ValidationOptions
	): Promise<T> {
		const data = await this.makeRequest<T>('GET', path, undefined, config)
		return ResponseValidator.validate(
			schema,
			data,
			schemaName,
			validationOptions
		)
	}

	async postValidated<T>(
		path: string,
<<<<<<< HEAD
		schema: ZodTypeAny,
=======
		schema: ZodSchema<T>,
>>>>>>> origin/main
		schemaName: string,
		data?: Record<string, unknown> | FormData,
		config?: RequestConfig,
		validationOptions?: ValidationOptions
	): Promise<T> {
		const responseData = await this.makeRequest<T>(
			'POST',
			path,
			data,
			config
		)
		return ResponseValidator.validate(
			schema,
			responseData,
			schemaName,
			validationOptions
		)
	}

	async putValidated<T>(
		path: string,
<<<<<<< HEAD
		schema: ZodTypeAny,
=======
		schema: ZodSchema<T>,
>>>>>>> origin/main
		schemaName: string,
		data?: Record<string, unknown> | FormData,
		config?: RequestConfig,
		validationOptions?: ValidationOptions
	): Promise<T> {
		const responseData = await this.makeRequest<T>(
			'PUT',
			path,
			data,
			config
		)
		return ResponseValidator.validate(
			schema,
			responseData,
			schemaName,
			validationOptions
		)
	}

	async patchValidated<T>(
		path: string,
<<<<<<< HEAD
		schema: ZodTypeAny,
=======
		schema: ZodSchema<T>,
>>>>>>> origin/main
		schemaName: string,
		data?: Record<string, unknown> | FormData,
		config?: RequestConfig,
		validationOptions?: ValidationOptions
	): Promise<T> {
		const responseData = await this.makeRequest<T>(
			'PATCH',
			path,
			data,
			config
		)
		return ResponseValidator.validate(
			schema,
			responseData,
			schemaName,
			validationOptions
		)
	}

	async deleteValidated<T>(
		path: string,
<<<<<<< HEAD
		schema: ZodTypeAny,
=======
		schema: ZodSchema<T>,
>>>>>>> origin/main
		schemaName: string,
		config?: RequestConfig,
		validationOptions?: ValidationOptions
	): Promise<T> {
		const responseData = await this.makeRequest<T>(
			'DELETE',
			path,
			undefined,
			config
		)
		return ResponseValidator.validate(
			schema,
			responseData,
			schemaName,
			validationOptions
		)
	}

	async healthCheck(): Promise<{ status: string; timestamp: string }> {
		return this.get<{ status: string; timestamp: string }>('/health')
	}
<<<<<<< HEAD

	// Enhanced health check with connectivity validation
	async validateConnectivity(): Promise<{
		api: { status: 'connected' | 'error'; response?: unknown; error?: string }
		config: { baseURL: string; timeout: number }
	}> {
		const result: {
			api: { status: 'connected' | 'error'; response?: unknown; error?: string }
			config: { baseURL: string; timeout: number }
		} = {
			api: { status: 'error', error: 'Unknown error' },
			config: {
				baseURL: this.baseURL,
				timeout: this.timeout
			}
		}

		try {
			const response = await this.healthCheck()
			result.api = {
				status: 'connected',
				response
			}
		} catch (error) {
			result.api = {
				status: 'error',
				error:
					error instanceof Error ? error.message : 'Connection failed'
			}
		}

		return result
	}
=======
>>>>>>> origin/main
}

// Export singleton instance
export const apiClient = new SimpleApiClient()
export default apiClient
