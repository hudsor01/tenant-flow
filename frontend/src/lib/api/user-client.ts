import type {
	UserProfileResponse,
	UpdateUserProfileDto
} from '../../types/api'
import type { HttpClient } from './http-client'

export class UserClient {
	constructor(private http: HttpClient) {}

	async me(): Promise<UserProfileResponse> {
		return this.http.get<UserProfileResponse>('/users/me')
	}

	async updateProfile(data: UpdateUserProfileDto): Promise<UserProfileResponse> {
		return this.http.put<UserProfileResponse>('/users/profile', data)
	}

	async checkExists(id: string): Promise<{ exists: boolean }> {
		return this.http.get<{ exists: boolean }>(`/users/${id}/exists`)
	}

	async ensureExists(data: {
		authUser: {
			id: string
			email: string
			user_metadata?: {
				name?: string
				full_name?: string
			}
		}
		options?: {
			role?: 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN'
			name?: string
			maxRetries?: number
			retryDelayMs?: number
		}
	}): Promise<{
		success: boolean
		userId?: string
		error?: string
		action?: string
		details?: Record<string, unknown>
	}> {
		return this.http.post('/users/ensure-exists', data)
	}

	async verifyCreation(id: string): Promise<{ verified: boolean }> {
		return this.http.post<{ verified: boolean }>(`/users/${id}/verify`, {})
	}
}