import type {
	CreatePropertyDto,
	UpdatePropertyDto,
	PropertyStats,
	PropertyWithDetails,
	CreateUnitDto,
	UpdateUnitDto,
	UnitStats,
	UnitWithDetails,
	CreateLeaseDto,
	UpdateLeaseDto,
	LeaseStats,
	LeaseWithDetails,
	ExpiringLease,
	FileUploadResponse
} from '../../types/api'
import type {
	PropertyQuery,
	UnitQuery,
	LeaseQuery
} from '../../types/query-types'
import type { HttpClient } from './http-client'

export class PropertyClient {
	constructor(private http: HttpClient) {}

	// Properties endpoints
	properties = {
		getAll: async (query?: PropertyQuery): Promise<PropertyWithDetails[]> => {
			const params = query ? this.buildQueryParams(query) : undefined
			return this.http.get<PropertyWithDetails[]>('/properties', params)
		},

		getById: async (id: string): Promise<PropertyWithDetails> => {
			return this.http.get<PropertyWithDetails>(`/properties/${id}`)
		},

		getStats: async (): Promise<PropertyStats> => {
			return this.http.get<PropertyStats>('/properties/stats')
		},

		create: async (data: CreatePropertyDto): Promise<PropertyWithDetails> => {
			return this.http.post<PropertyWithDetails>('/properties', data)
		},

		update: async (
			id: string,
			data: UpdatePropertyDto
		): Promise<PropertyWithDetails> => {
			return this.http.put<PropertyWithDetails>(`/properties/${id}`, data)
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.http.delete<{ message: string }>(`/properties/${id}`)
		},

		uploadImage: async (
			id: string,
			file: File
		): Promise<FileUploadResponse> => {
			return this.http.uploadFile<FileUploadResponse>(
				`/properties/${id}/upload-image`,
				file
			)
		}
	}

	// Units endpoints
	units = {
		getAll: async (query?: UnitQuery): Promise<UnitWithDetails[]> => {
			const params = query ? this.buildQueryParams(query) : undefined
			return this.http.get<UnitWithDetails[]>('/units', params)
		},

		getById: async (id: string): Promise<UnitWithDetails> => {
			return this.http.get<UnitWithDetails>(`/units/${id}`)
		},

		getStats: async (): Promise<UnitStats> => {
			return this.http.get<UnitStats>('/units/stats')
		},

		create: async (data: CreateUnitDto): Promise<UnitWithDetails> => {
			return this.http.post<UnitWithDetails>('/units', data)
		},

		update: async (
			id: string,
			data: UpdateUnitDto
		): Promise<UnitWithDetails> => {
			return this.http.put<UnitWithDetails>(`/units/${id}`, data)
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.http.delete<{ message: string }>(`/units/${id}`)
		}
	}

	// Leases endpoints
	leases = {
		getAll: async (query?: LeaseQuery): Promise<LeaseWithDetails[]> => {
			const params = query ? this.buildQueryParams(query) : undefined
			return this.http.get<LeaseWithDetails[]>('/leases', params)
		},

		getById: async (id: string): Promise<LeaseWithDetails> => {
			return this.http.get<LeaseWithDetails>(`/leases/${id}`)
		},

		getStats: async (): Promise<LeaseStats> => {
			return this.http.get<LeaseStats>('/leases/stats')
		},

		getExpiring: async (days = 30): Promise<ExpiringLease[]> => {
			return this.http.get<ExpiringLease[]>('/leases/expiring', {
				days: days.toString()
			})
		},

		create: async (data: CreateLeaseDto): Promise<LeaseWithDetails> => {
			return this.http.post<LeaseWithDetails>('/leases', data)
		},

		update: async (
			id: string,
			data: UpdateLeaseDto
		): Promise<LeaseWithDetails> => {
			return this.http.put<LeaseWithDetails>(`/leases/${id}`, data)
		},

		delete: async (id: string): Promise<{ message: string }> => {
			return this.http.delete<{ message: string }>(`/leases/${id}`)
		},

		getRentReminders: async (): Promise<{
			reminders: {
				id: string
				leaseId: string
				tenantId: string
				propertyName: string
				tenantName: string
				tenantEmail: string
				rentAmount: number
				dueDate: string
				reminderType: 'upcoming' | 'due' | 'overdue'
				daysToDue: number
				status: 'pending' | 'sent' | 'paid'
				createdAt: string
			}[]
			stats: {
				totalReminders: number
				upcomingReminders: number
				dueToday: number
				overdue: number
				totalRentAmount: number
				overdueAmount: number
			}
		}> => {
			return this.http.get('/leases/rent-reminders')
		},

		sendRentReminder: async (
			reminderId: string
		): Promise<{
			id: string
			status: 'sent'
			sentAt: string
		}> => {
			return this.http.post(`/leases/rent-reminders/${reminderId}/send`)
		},

		sendBulkRentReminders: async (
			reminderIds: string[]
		): Promise<{
			successful: number
			failed: number
			total: number
			results: {
				id: string
				status: 'sent'
				sentAt: string
			}[]
		}> => {
			return this.http.post('/leases/rent-reminders/send-bulk', {
				reminderIds
			})
		}
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