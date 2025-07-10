import type { ApiError } from '../../types/api'

// Environment configuration
export const getApiBaseUrl = (): string => {
	const baseUrl = import.meta.env.VITE_API_BASE_URL
	if (!baseUrl) {
		throw new Error('VITE_API_BASE_URL environment variable is not set')
	}
	return baseUrl.replace(/\/$/, '')
}

// Token management
export class TokenManager {
	private static readonly ACCESS_TOKEN_KEY = 'access_token'
	private static readonly REFRESH_TOKEN_KEY = 'refresh_token'

	static getAccessToken(): string | null {
		return localStorage.getItem(this.ACCESS_TOKEN_KEY)
	}

	static setAccessToken(token: string): void {
		localStorage.setItem(this.ACCESS_TOKEN_KEY, token)
	}

	static getRefreshToken(): string | null {
		return localStorage.getItem(this.REFRESH_TOKEN_KEY)
	}

	static setRefreshToken(token: string): void {
		localStorage.setItem(this.REFRESH_TOKEN_KEY, token)
	}

	static clearTokens(): void {
		localStorage.removeItem(this.ACCESS_TOKEN_KEY)
		localStorage.removeItem(this.REFRESH_TOKEN_KEY)
	}

	static setTokens(accessToken: string, refreshToken?: string): void {
		this.setAccessToken(accessToken)
		if (refreshToken) {
			this.setRefreshToken(refreshToken)
		}
	}
}

// Custom error class for API errors
export class ApiClientError extends Error {
	constructor(
		message: string,
		public statusCode: number,
		public data?: ApiError
	) {
		super(message)
		this.name = 'ApiClientError'
	}

	get isNetworkError(): boolean {
		return this.statusCode === 0
	}

	get isUnauthorized(): boolean {
		return this.statusCode === 401
	}

	get isForbidden(): boolean {
		return this.statusCode === 403
	}

	get isNotFound(): boolean {
		return this.statusCode === 404
	}

	get isValidationError(): boolean {
		return this.statusCode === 400
	}

	get isServerError(): boolean {
		return this.statusCode >= 500
	}
}