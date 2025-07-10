import type { AuthCredentials, RegisterData, AuthResponse } from '../../types/api'
import type { HttpClient } from './http-client'
import { TokenManager } from './base-client'

export class AuthClient {
	constructor(private http: HttpClient) {}

	async login(credentials: AuthCredentials): Promise<AuthResponse> {
		const response = await this.http.post<AuthResponse>(
			'/auth/login',
			credentials
		)
		if (response.access_token) {
			TokenManager.setTokens(
				response.access_token,
				response.refresh_token
			)
		}
		return response
	}

	async register(data: RegisterData): Promise<AuthResponse> {
		const response = await this.http.post<AuthResponse>(
			'/auth/register',
			data
		)
		if (response.access_token) {
			TokenManager.setTokens(
				response.access_token,
				response.refresh_token
			)
		}
		return response
	}

	async refresh(refreshToken: string): Promise<AuthResponse> {
		const response = await this.http.post<AuthResponse>(
			'/auth/refresh',
			{
				refresh_token: refreshToken
			}
		)
		if (response.access_token) {
			TokenManager.setTokens(
				response.access_token,
				response.refresh_token
			)
		}
		return response
	}

	logout(): void {
		TokenManager.clearTokens()
	}

	getToken(): string | null {
		return TokenManager.getAccessToken()
	}

	isAuthenticated(): boolean {
		return !!TokenManager.getAccessToken()
	}

	async resendVerification(data: { email: string; redirectTo?: string }): Promise<void> {
		await this.http.post('/auth/resend-verification', data)
	}
}