import type {
	Subscription,
	Plan,
	UsageMetrics,
	SubscriptionCreateRequest,
	SubscriptionCreateResponse,
	CustomerPortalRequest,
	CustomerPortalResponse
} from '../../types/subscription'
import type { HttpClient } from './http-client'

export class SubscriptionClient {
	constructor(private http: HttpClient) {}

	async getCurrent(): Promise<Subscription | null> {
		return this.http.get<Subscription | null>('/subscriptions/current')
	}

	async getUsage(): Promise<UsageMetrics> {
		return this.http.get<UsageMetrics>('/subscriptions/usage')
	}

	async getPlans(): Promise<Plan[]> {
		return this.http.get<Plan[]>('/subscriptions/plans')
	}

	async getPlan(planId: string): Promise<Plan> {
		return this.http.get<Plan>(`/subscriptions/plans/${planId}`)
	}

	async create(data: SubscriptionCreateRequest): Promise<SubscriptionCreateResponse> {
		return this.http.post<SubscriptionCreateResponse>('/subscriptions', data)
	}

	async update(subscriptionId: string, updates: { planId?: string; billingPeriod?: 'monthly' | 'annual' }): Promise<Subscription> {
		return this.http.patch<Subscription>(`/subscriptions/${subscriptionId}`, updates)
	}

	async cancel(): Promise<{ message: string }> {
		return this.http.delete<{ message: string }>('/subscriptions/current')
	}

	async createPortal(data: CustomerPortalRequest): Promise<CustomerPortalResponse> {
		return this.http.post<CustomerPortalResponse>('/subscriptions/portal', data)
	}

	async createPortalSession(data: CustomerPortalRequest): Promise<CustomerPortalResponse> {
		return this.http.post<CustomerPortalResponse>('/subscriptions/portal', data)
	}

	async linkToUser(data: {
		userId: string
		userEmail: string
		subscriptionId?: string | null
		sessionId?: string | null
	}): Promise<{ success: boolean }> {
		return this.http.post<{ success: boolean }>('/subscriptions/link', data)
	}
}