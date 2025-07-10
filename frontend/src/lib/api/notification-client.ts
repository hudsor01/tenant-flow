import type {
	CreateNotificationDto,
	UpdateNotificationDto,
	NotificationWithDetails
} from '../../types/api'
import type { NotificationQuery } from '../../types/query-types'
import type { HttpClient } from './http-client'

export class NotificationClient {
	constructor(private http: HttpClient) {}

	async getAll(query?: NotificationQuery): Promise<NotificationWithDetails[]> {
		const params = query ? this.buildQueryParams(query) : undefined
		return this.http.get<NotificationWithDetails[]>('/notifications', params)
	}

	async getById(id: string): Promise<NotificationWithDetails> {
		return this.http.get<NotificationWithDetails>(`/notifications/${id}`)
	}

	async getStats(): Promise<{ total: number; unread: number }> {
		return this.http.get<{ total: number; unread: number }>('/notifications/stats')
	}

	async getUnreadCount(): Promise<number> {
		const stats = await this.getStats()
		return stats.unread
	}

	async create(data: CreateNotificationDto): Promise<NotificationWithDetails> {
		return this.http.post<NotificationWithDetails>('/notifications', data)
	}

	async update(id: string, data: UpdateNotificationDto): Promise<NotificationWithDetails> {
		return this.http.put<NotificationWithDetails>(`/notifications/${id}`, data)
	}

	async markAsRead(id: string): Promise<NotificationWithDetails> {
		return this.http.put<NotificationWithDetails>(`/notifications/${id}/mark-read`)
	}

	async delete(id: string): Promise<{ message: string }> {
		return this.http.delete<{ message: string }>(`/notifications/${id}`)
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