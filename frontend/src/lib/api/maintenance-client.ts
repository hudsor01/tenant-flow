import type {
	CreateMaintenanceDto,
	UpdateMaintenanceDto,
	MaintenanceWithDetails
} from '../../types/api'
import type { MaintenanceQuery } from '../../types/query-types'
import type { HttpClient } from './http-client'

export class MaintenanceClient {
	constructor(private http: HttpClient) {}

	async getAll(query?: MaintenanceQuery): Promise<MaintenanceWithDetails[]> {
		const params = query ? this.buildQueryParams(query) : undefined
		return this.http.get<MaintenanceWithDetails[]>('/maintenance', params)
	}

	async getById(id: string): Promise<MaintenanceWithDetails> {
		return this.http.get<MaintenanceWithDetails>(`/maintenance/${id}`)
	}

	async getStats(): Promise<{
		total: number
		open: number
		inProgress: number
		completed: number
	}> {
		return this.http.get<{
			total: number
			open: number
			inProgress: number
			completed: number
		}>('/maintenance/stats')
	}

	async create(data: CreateMaintenanceDto): Promise<MaintenanceWithDetails> {
		return this.http.post<MaintenanceWithDetails>('/maintenance', data)
	}

	async update(id: string, data: UpdateMaintenanceDto): Promise<MaintenanceWithDetails> {
		return this.http.put<MaintenanceWithDetails>(`/maintenance/${id}`, data)
	}

	async delete(id: string): Promise<{ message: string }> {
		return this.http.delete<{ message: string }>(`/maintenance/${id}`)
	}

	async sendNotification(data: {
		type: 'new_request' | 'status_update' | 'emergency_alert'
		maintenanceRequestId: string
		recipientEmail: string
		recipientName: string
		recipientRole: 'owner' | 'tenant'
		actionUrl?: string
	}): Promise<{
		emailId: string
		sentAt: string
		type: string
	}> {
		return this.http.post('/maintenance/notifications', data)
	}

	async logNotification(data: {
		type: 'maintenance_notification'
		recipientEmail: string
		recipientName: string
		subject: string
		maintenanceRequestId: string
		notificationType: string
		status: 'sent' | 'failed'
	}): Promise<{
		id: string
		type: string
		recipientEmail: string
		recipientName: string
		subject: string
		maintenanceRequestId: string
		notificationType: string
		sentAt: string
		status: string
	}> {
		return this.http.post('/maintenance/notifications/log', data)
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