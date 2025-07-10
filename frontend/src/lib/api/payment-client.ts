import type {
	CreatePaymentDto,
	UpdatePaymentDto,
	PaymentAnalyticsData,
	PaymentWithDetails
} from '../../types/api'
import type { PaymentQuery } from '../../types/query-types'
import type { HttpClient } from './http-client'

export class PaymentClient {
	constructor(private http: HttpClient) {}

	async getAll(query?: PaymentQuery): Promise<PaymentWithDetails[]> {
		const params = query ? this.buildQueryParams(query) : undefined
		return this.http.get<PaymentWithDetails[]>('/payments', params)
	}

	async getById(id: string): Promise<PaymentWithDetails> {
		return this.http.get<PaymentWithDetails>(`/payments/${id}`)
	}

	async getStats(): Promise<PaymentAnalyticsData> {
		return this.http.get<PaymentAnalyticsData>('/payments/stats')
	}

	async create(data: CreatePaymentDto): Promise<PaymentWithDetails> {
		return this.http.post<PaymentWithDetails>('/payments', data)
	}

	async update(id: string, data: UpdatePaymentDto): Promise<PaymentWithDetails> {
		return this.http.put<PaymentWithDetails>(`/payments/${id}`, data)
	}

	async delete(id: string): Promise<{ message: string }> {
		return this.http.delete<{ message: string }>(`/payments/${id}`)
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