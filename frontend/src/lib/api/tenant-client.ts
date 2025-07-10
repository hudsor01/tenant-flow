import type {
	CreateTenantDto,
	UpdateTenantDto,
	TenantStats,
	TenantWithDetails,
	FileUploadResponse
} from '../../types/api'
import type { TenantQuery } from '../../types/query-types'
import type { HttpClient } from './http-client'

export class TenantClient {
	constructor(private http: HttpClient) {}

	async getAll(query?: TenantQuery): Promise<TenantWithDetails[]> {
		const params = query ? this.buildQueryParams(query) : undefined
		return this.http.get<TenantWithDetails[]>('/tenants', params)
	}

	async getById(id: string): Promise<TenantWithDetails> {
		return this.http.get<TenantWithDetails>(`/tenants/${id}`)
	}

	async getStats(): Promise<TenantStats> {
		return this.http.get<TenantStats>('/tenants/stats')
	}

	async create(data: CreateTenantDto): Promise<TenantWithDetails> {
		return this.http.post<TenantWithDetails>('/tenants', data)
	}

	async update(id: string, data: UpdateTenantDto): Promise<TenantWithDetails> {
		return this.http.put<TenantWithDetails>(`/tenants/${id}`, data)
	}

	async delete(id: string): Promise<{ message: string }> {
		return this.http.delete<{ message: string }>(`/tenants/${id}`)
	}

	async uploadDocument(
		id: string,
		file: File,
		documentType: string
	): Promise<FileUploadResponse> {
		return this.http.uploadFile<FileUploadResponse>(
			`/tenants/${id}/upload-document`,
			file,
			{ documentType }
		)
	}

	async verifyInvitation(token: string): Promise<{
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
		} | null
		propertyOwner: {
			id: string
			name: string
			email: string
		}
		expiresAt: string
	}> {
		return this.http.get(`/tenants/invitation/${token}/verify`)
	}

	async acceptInvitation(
		token: string,
		data: {
			password: string
			userInfo: {
				id: string
				email: string
				name?: string
			}
		}
	): Promise<{
		success: boolean
		tenant: TenantWithDetails
		user: {
			id: string
			name: string
			email: string
		}
	}> {
		return this.http.post(`/tenants/invitation/${token}/accept`, data)
	}

	async invite(data: { 
		name: string; 
		email: string; 
		phone?: string; 
		propertyId?: string; 
		unitId?: string; 
	}): Promise<{ message: string; tenantId: string }> {
		return this.http.post('/tenants/invite', data)
	}

	async resendInvitation(tenantId: string): Promise<{ message: string }> {
		return this.http.post(`/tenants/${tenantId}/resend-invitation`, {})
	}

	async deleteInvitation(tenantId: string): Promise<{ message: string }> {
		return this.http.delete(`/tenants/${tenantId}/invitation`)
	}

	async getPendingInvitations(): Promise<TenantWithDetails[]> {
		return this.http.get('/tenants/pending-invitations')
	}

	// Utility method to build query parameters
	private buildQueryParams(params: Record<string, unknown>): Record<string, string> {
		const result: Record<string, string> = {}

		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				result[key] = String(value)
			}
		})

		return result
	}
}