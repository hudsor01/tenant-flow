/**
 * Native API Client with React 19 use() Hook Support
 * OVERWRITTEN: Eliminates Axios dependency and complex interceptor patterns
 * + Includes runtime response validation with Zod schemas
 * + React 19 use() hook promise streaming for components
 */
import { config } from './config'
import { getSession } from './supabase/client'
import type { FrontendApiError as ApiError, RequestConfig, ValidationOptions } from '@repo/shared/types/api'
import type { ZodTypeAny } from 'zod'
import type { ControllerApiResponse } from '@repo/shared/types/errors'


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
        // Ensure we always append to base path (e.g., /api/v1), even if path starts with '/'
        const base = new URL(this.baseURL)
        const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`
        const relPath = path.replace(/^\/+/, '') // drop leading slashes
        base.pathname = `${basePath}${relPath}`

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        value.forEach(v => base.searchParams.append(key, String(v)))
                    } else {
                        base.searchParams.append(key, String(value))
                    }
                }
            })
        }
        return base.toString()
    }

	private async makeRequest<T>(
		method: string,
		path: string,
		data?: unknown,
		config?: RequestConfig,
		retryCount = 0
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
				let errorData: ControllerApiResponse | undefined

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
				throw new Error(`API Error: ${apiError.message}`)
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

			throw error
		}
	}

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

	// eslint-disable-next-line anti-duplication/no-duplicate-function-implementations
	async put<T>(
		path: string,
		data?: unknown,
		config?: RequestConfig
	): Promise<T> {
		return this.makeRequest<T>('PUT', path, data, config)
	}

	// eslint-disable-next-line anti-duplication/no-duplicate-function-implementations  
	async patch<T>(
		path: string,
		data?: unknown,
		config?: RequestConfig
	): Promise<T> {
		return this.makeRequest<T>('PATCH', path, data, config)
	}

	// eslint-disable-next-line anti-duplication/no-duplicate-function-implementations
	async delete<T>(path: string, config?: RequestConfig): Promise<T> {
		return this.makeRequest<T>('DELETE', path, undefined, config)
	}

	// Standard methods already return promises compatible with React 19 use() hook
	// No separate promise methods needed - use get(), post(), put(), delete() directly

	// Consolidated validation method - DRY principle
	private async makeValidatedRequest<T>(
		method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
		path: string,
		schema: ZodTypeAny,
		schemaName: string,
		data?: unknown,
		config?: RequestConfig
	): Promise<T> {
		const responseData = await this.makeRequest<T>(method, path, data, config)
		// Direct Zod validation - no abstraction
		const result = schema.safeParse(responseData)
		if (!result.success) {
			throw new Error(`Validation failed for ${schemaName}: ${result.error.message}`)
		}
		return result.data as T
	}

	// Validated API methods with Zod schema validation
	async getValidated<T>(
		path: string,
		schema: ZodTypeAny,
		schemaName: string,
		config?: RequestConfig,
		_validationOptions?: ValidationOptions
	): Promise<T> {
		return this.makeValidatedRequest<T>('GET', path, schema, schemaName, undefined, config)
	}

	// Generic validated request method - DRY principle
	private createValidatedMethod<T>(method: 'POST' | 'PUT' | 'PATCH') {
		return (
			path: string,
			schema: ZodTypeAny,
			schemaName: string,
			data?: Record<string, unknown> | FormData,
			config?: RequestConfig,
			_validationOptions?: ValidationOptions
		): Promise<T> => {
			return this.makeValidatedRequest<T>(method, path, schema, schemaName, data, config)
		}
	}

	async postValidated<T>(
		path: string,
		schema: ZodTypeAny,
		schemaName: string,
		data?: Record<string, unknown> | FormData,
		config?: RequestConfig,
		_validationOptions?: ValidationOptions
	): Promise<T> {
		return this.createValidatedMethod<T>('POST')(path, schema, schemaName, data, config, _validationOptions)
	}

	async putValidated<T>(
		path: string,
		schema: ZodTypeAny,
		schemaName: string,
		data?: Record<string, unknown> | FormData,
		config?: RequestConfig,
		_validationOptions?: ValidationOptions
	): Promise<T> {
		return this.createValidatedMethod<T>('PUT')(path, schema, schemaName, data, config, _validationOptions)
	}

	async patchValidated<T>(
		path: string,
		schema: ZodTypeAny,
		schemaName: string,
		data?: Record<string, unknown> | FormData,
		config?: RequestConfig,
		_validationOptions?: ValidationOptions
	): Promise<T> {
		return this.createValidatedMethod<T>('PATCH')(path, schema, schemaName, data, config, _validationOptions)
	}

	async deleteValidated<T>(
		path: string,
		schema: ZodTypeAny,
		schemaName: string,
		config?: RequestConfig,
		_validationOptions?: ValidationOptions
	): Promise<T> {
		return this.makeValidatedRequest<T>('DELETE', path, schema, schemaName, undefined, config)
	}

	async healthCheck(): Promise<{ status: string; timestamp: string }> {
		return this.get<{ status: string; timestamp: string }>('/health')
	}

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
}

// Export singleton instance
export const apiClient = new SimpleApiClient()
export default apiClient

// Convenience exports for backward compatibility
export const get = apiClient.get.bind(apiClient)
export const post = apiClient.post.bind(apiClient)
export const put = apiClient.put.bind(apiClient)
export const del = apiClient.delete.bind(apiClient)
