/**
 * Unified API Client for TenantFlow Backend
 * Single client with all API methods and consistent response handling
 */
import axios, {
	type AxiosInstance,
	type AxiosResponse,
	type AxiosError,
	type AxiosRequestConfig
} from 'axios'
import { logger } from '@/lib/logger'
import { config } from './config'
import { getSession } from './supabase/client'
import type { 
	ControllerApiResponse,
	Property,
	Tenant,
	Unit,
	Lease,
	MaintenanceRequest,
	User,
	AuthUser,
	DocumentEntity as Document,
	DashboardStats,
	ActivityItem,
	CreatePropertyInput,
	UpdatePropertyInput,
	PropertyQuery,
	CreateTenantInput,
	UpdateTenantInput,
	TenantQuery,
	CreateUnitInput,
	UpdateUnitInput,
	UnitQuery,
	CreateLeaseInput,
	UpdateLeaseInput,
	LeaseQuery,
	CreateMaintenanceInput,
	UpdateMaintenanceInput,
	MaintenanceQuery,
	CreateCheckoutSessionRequest,
	CreateCheckoutSessionResponse,
	UpdateUserProfileInput,
	CreatePortalInput,
	UpdateSubscriptionParams,
	Subscription,
	PaymentMethod,
	Invoice
} from '@repo/shared'

export interface ApiError {
	message: string
	code?: string
	details?: Record<string, unknown>
	timestamp?: string
}

class ApiClient {
	// Allow dynamic property access for backward compatibility
	[x: string]: unknown
	private readonly client: AxiosInstance

	constructor() {
		this.client = axios.create({
			baseURL: config.api.baseURL,
			timeout: config.api.timeout || 30000,
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			withCredentials: true,
			validateStatus: status => status < 500
		})

		this.setupInterceptors()
	}

	private setupInterceptors() {
		// Request interceptor for authentication
		this.client.interceptors.request.use(
			async config => {
				try {
					const { session } = await getSession()
					if (session?.access_token) {
						config.headers.Authorization = `Bearer ${session.access_token}`
					}
				} catch (error) {
					logger.warn('[API] Failed to add authentication:', {
						component: 'lib_api_client.ts',
						data: error
					})
				}
				return config
			},
			error => {
				// Ensure the rejection reason is always an Error
				if (error instanceof Error) {
					return Promise.reject(error)
				}
				return Promise.reject(
					new Error(
						typeof error === 'string'
							? error
							: JSON.stringify(error)
					)
				)
			}
		)

		// Response interceptor for error handling
		this.client.interceptors.response.use(
			response => response,
			async (error: AxiosError) => {
				if (error.response?.status === 401) {
					// Handle authentication errors
					logger.warn(
						'[API] Authentication error - redirecting to login',
						{ component: 'lib_api_client.ts' }
					)
					window.location.href = '/login'
				}
				return Promise.reject(error)
			}
		)
	}

	private async makeRequest<T>(
		method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
		url: string,
		data?: Record<string, unknown> | FormData,
		config?: AxiosRequestConfig
	): Promise<T> {
		try {
			const response: AxiosResponse<ControllerApiResponse<T>> = await this.client.request({
				method,
				url,
				data,
				...config
			})

			// Extract data from backend's ControllerApiResponse format
			const backendResponse = response.data as ControllerApiResponse<T>
			
			if (backendResponse && typeof backendResponse === 'object' && 'success' in backendResponse) {
				if (!backendResponse.success) {
					throw new Error(backendResponse.message || 'Request failed')
				}
				if (backendResponse.data === undefined) {
					throw new Error('Response data is missing from successful request')
				}
				return backendResponse.data
			}

			// Should not reach here with current backend implementation
			throw new Error('Invalid response format from backend')
		} catch (error: unknown) {
			const axiosError = error as AxiosError
			const responseData = axiosError.response?.data as ControllerApiResponse<unknown> | undefined

			const apiError: ApiError = {
				message:
					(responseData?.message as string) ||
					axiosError.message ||
					'Request failed',
				code: responseData?.statusCode?.toString() || axiosError.code,
				details: responseData as unknown as Record<string, unknown>,
				timestamp: new Date().toISOString()
			}

			throw apiError
		}
	}

	// HTTP Methods
	async get<T>(
		url: string,
		config?: AxiosRequestConfig
	): Promise<T> {
		return this.makeRequest<T>('GET', url, undefined, config)
	}

	async post<T>(
		url: string,
		data?: Record<string, unknown> | FormData,
		config?: AxiosRequestConfig
	): Promise<T> {
		return this.makeRequest<T>('POST', url, data, config)
	}

	async put<T>(
		url: string,
		data?: Record<string, unknown> | FormData,
		config?: AxiosRequestConfig
	): Promise<T> {
		return this.makeRequest<T>('PUT', url, data, config)
	}

	async patch<T>(
		url: string,
		data?: Record<string, unknown> | FormData,
		config?: AxiosRequestConfig
	): Promise<T> {
		return this.makeRequest<T>('PATCH', url, data, config)
	}

	async delete<T>(
		url: string,
		config?: AxiosRequestConfig
	): Promise<T> {
		return this.makeRequest<T>('DELETE', url, undefined, config)
	}

	// Health check method
	async healthCheck(): Promise<{ status: string; timestamp: string }> {
		return this.get<{ status: string; timestamp: string }>('/health')
	}

	// ========================
	// Authentication Endpoints
	// ========================

	async login(data: { email: string; password: string }): Promise<{ access_token: string; user: AuthUser }> {
		return this.post<{ access_token: string; user: AuthUser }>('/auth/login', data)
	}

	async logout(): Promise<{ message: string }> {
		return this.post<{ message: string }>('/auth/logout')
	}

	async getCurrentUser(): Promise<User> {
		return this.get<User>('/auth/me')
	}

	async updateProfile(data: UpdateUserProfileInput): Promise<User> {
		return this.put<User>('/auth/profile', data)
	}

	async refreshToken(): Promise<{ access_token: string }> {
		return this.post<{ access_token: string }>('/auth/refresh')
	}

	// ========================
	// Properties Endpoints
	// ========================

	async getProperties(params?: PropertyQuery): Promise<Property[]> {
		return this.get<Property[]>('/properties', { params })
	}

	async getProperty(id: string): Promise<Property> {
		return this.get<Property>(`/properties/${id}`)
	}

	async createProperty(data: CreatePropertyInput): Promise<Property> {
		return this.post<Property>('/properties', data)
	}

	async updateProperty(id: string, data: UpdatePropertyInput): Promise<Property> {
		return this.put<Property>(`/properties/${id}`, data)
	}

	async deleteProperty(id: string): Promise<{ message: string }> {
		return this.delete<{ message: string }>(`/properties/${id}`)
	}

	async getPropertyStats(): Promise<{
		total: number
		occupied: number
		vacant: number
		occupancyRate: number
		totalMonthlyRent: number
		averageRent: number
	}> {
		return this.get<{
			total: number
			occupied: number
			vacant: number
			occupancyRate: number
			totalMonthlyRent: number
			averageRent: number
		}>('/properties/stats')
	}

	async uploadPropertyImage(id: string, formData: FormData): Promise<{ url: string }> {
		return this.post<{ url: string }>(`/properties/${id}/upload-image`, formData, {
			headers: { 'Content-Type': 'multipart/form-data' }
		})
	}

	async getPropertyUnits(propertyId: string): Promise<Unit[]> {
		return this.get<Unit[]>(`/properties/${propertyId}/units`)
	}

	async getPropertyWithMetrics(id: string): Promise<Property & {
		occupancyRate: number
		totalRevenue: number
		vacancyCount: number
	}> {
		return this.get<Property & {
			occupancyRate: number
			totalRevenue: number
			vacancyCount: number
		}>(`/properties/${id}/metrics`)
	}

	async getPropertyOccupancyRate(id: string): Promise<{ occupancyRate: number }> {
		return this.get<{ occupancyRate: number }>(`/properties/${id}/occupancy-rate`)
	}

	async getPropertyRevenue(id: string): Promise<{ totalRevenue: number }> {
		return this.get<{ totalRevenue: number }>(`/properties/${id}/revenue`)
	}

	async getPropertyTenants(propertyId: string): Promise<Tenant[]> {
		return this.get<Tenant[]>(`/properties/${propertyId}/tenants`)
	}

	async getPropertyLeases(propertyId: string): Promise<Lease[]> {
		return this.get<Lease[]>(`/properties/${propertyId}/leases`)
	}

	async getPropertyMaintenance(propertyId: string): Promise<MaintenanceRequest[]> {
		return this.get<MaintenanceRequest[]>(`/properties/${propertyId}/maintenance`)
	}

	// ========================
	// Tenants Endpoints
	// ========================

	async getTenants(params?: TenantQuery): Promise<Tenant[]> {
		return this.get<Tenant[]>('/tenants', { params })
	}

	async getTenant(id: string): Promise<Tenant> {
		return this.get<Tenant>(`/tenants/${id}`)
	}

	async createTenant(data: CreateTenantInput): Promise<Tenant> {
		return this.post<Tenant>('/tenants', data)
	}

	async updateTenant(id: string, data: UpdateTenantInput): Promise<Tenant> {
		return this.put<Tenant>(`/tenants/${id}`, data)
	}

	async deleteTenant(id: string): Promise<{ message: string }> {
		return this.delete<{ message: string }>(`/tenants/${id}`)
	}

	async getTenantStats(): Promise<{
		total: number
		active: number
		inactive: number
		pendingApplications: number
	}> {
		return this.get<{
			total: number
			active: number
			inactive: number
			pendingApplications: number
		}>('/tenants/stats')
	}

	async uploadTenantDocument(id: string, formData: FormData): Promise<{ url: string }> {
		return this.post<{ url: string }>(`/tenants/${id}/documents`, formData, {
			headers: { 'Content-Type': 'multipart/form-data' }
		})
	}

	async getTenantLeases(tenantId: string): Promise<Lease[]> {
		return this.get<Lease[]>(`/tenants/${tenantId}/leases`)
	}

	async getTenantPayments(tenantId: string): Promise<{ id: string; amount: number; date: string; status: string }[]> {
		return this.get<{ id: string; amount: number; date: string; status: string }[]>(`/tenants/${tenantId}/payments`)
	}

	async getTenantMaintenance(tenantId: string): Promise<MaintenanceRequest[]> {
		return this.get<MaintenanceRequest[]>(`/tenants/${tenantId}/maintenance`)
	}

	async getTenantDocuments(tenantId: string): Promise<Document[]> {
		return this.get<Document[]>(`/tenants/${tenantId}/documents`)
	}

	async inviteTenant(id: string, email: string): Promise<{ message: string }> {
		return this.post<{ message: string }>(`/tenants/${id}/invite`, { email })
	}

	// ========================
	// Units Endpoints
	// ========================

	async getUnits(params?: UnitQuery): Promise<Unit[]> {
		return this.get<Unit[]>('/units', { params })
	}

	async getUnit(id: string): Promise<Unit> {
		return this.get<Unit>(`/units/${id}`)
	}

	async createUnit(data: CreateUnitInput): Promise<Unit> {
		return this.post<Unit>('/units', data)
	}

	async updateUnit(id: string, data: UpdateUnitInput): Promise<Unit> {
		return this.put<Unit>(`/units/${id}`, data)
	}

	async deleteUnit(id: string): Promise<{ message: string }> {
		return this.delete<{ message: string }>(`/units/${id}`)
	}

	async updateUnitAvailability(id: string, isAvailable: boolean): Promise<Unit> {
		return this.patch<Unit>(`/units/${id}/availability`, { isAvailable })
	}

	// ========================
	// Leases Endpoints
	// ========================

	async getLeases(params?: LeaseQuery): Promise<Lease[]> {
		return this.get<Lease[]>('/leases', { params })
	}

	async getLease(id: string): Promise<Lease> {
		return this.get<Lease>(`/leases/${id}`)
	}

	async createLease(data: CreateLeaseInput): Promise<Lease> {
		return this.post<Lease>('/leases', data)
	}

	async updateLease(id: string, data: UpdateLeaseInput): Promise<Lease> {
		return this.put<Lease>(`/leases/${id}`, data)
	}

	async deleteLease(id: string): Promise<{ message: string }> {
		return this.delete<{ message: string }>(`/leases/${id}`)
	}

	async getLeaseStats(): Promise<{
		total: number
		active: number
		expired: number
		expiringSoon: number
		totalMonthlyRent: number
	}> {
		return this.get<{
			total: number
			active: number
			expired: number
			expiringSoon: number
			totalMonthlyRent: number
		}>('/leases/stats')
	}

	async generateLeasePDF(id: string): Promise<{ url: string }> {
		return this.post<{ url: string }>(`/leases/${id}/generate-pdf`)
	}

	async uploadLeaseDocument(id: string, formData: FormData): Promise<{ url: string }> {
		return this.post<{ url: string }>(`/leases/${id}/documents`, formData, {
			headers: { 'Content-Type': 'multipart/form-data' }
		})
	}

	async activateLease(id: string): Promise<Lease> {
		return this.post<Lease>(`/leases/${id}/activate`)
	}

	async terminateLease(id: string, reason: string): Promise<Lease> {
		return this.post<Lease>(`/leases/${id}/terminate`, { reason })
	}

	async renewLease(id: string, data: { endDate: string; newRent?: number }): Promise<Lease> {
		return this.post<Lease>(`/leases/${id}/renew`, data)
	}

	// ========================
	// Maintenance Endpoints
	// ========================

	async getMaintenanceRequests(params?: MaintenanceQuery): Promise<MaintenanceRequest[]> {
		return this.get<MaintenanceRequest[]>('/maintenance', { params })
	}

	async getMaintenanceRequest(id: string): Promise<MaintenanceRequest> {
		return this.get<MaintenanceRequest>(`/maintenance/${id}`)
	}

	async createMaintenanceRequest(data: CreateMaintenanceInput): Promise<MaintenanceRequest> {
		return this.post<MaintenanceRequest>('/maintenance', data)
	}

	async updateMaintenanceRequest(id: string, data: UpdateMaintenanceInput): Promise<MaintenanceRequest> {
		return this.put<MaintenanceRequest>(`/maintenance/${id}`, data)
	}

	async deleteMaintenanceRequest(id: string): Promise<{ message: string }> {
		return this.delete<{ message: string }>(`/maintenance/${id}`)
	}

	async updateMaintenanceStatus(id: string, status: string): Promise<MaintenanceRequest> {
		return this.patch<MaintenanceRequest>(`/maintenance/${id}/status`, { status })
	}

	async assignMaintenanceVendor(id: string, vendorId: string): Promise<MaintenanceRequest> {
		return this.post<MaintenanceRequest>(`/maintenance/${id}/assign`, { vendorId })
	}

	async addMaintenanceComment(id: string, comment: string): Promise<{ message: string }> {
		return this.post<{ message: string }>(`/maintenance/${id}/comments`, { comment })
	}

	async uploadMaintenanceImage(id: string, formData: FormData): Promise<{ url: string }> {
		return this.post<{ url: string }>(`/maintenance/${id}/images`, formData, {
			headers: { 'Content-Type': 'multipart/form-data' }
		})
	}

	// ========================
	// Billing/Stripe Endpoints
	// ========================

	async createCheckoutSession(data: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> {
		return this.post<CreateCheckoutSessionResponse>('/billing/create-checkout-session', data)
	}

	async createPortalSession(data: CreatePortalInput): Promise<{ url: string }> {
		return this.post<{ url: string }>('/stripe/portal', data as Record<string, unknown>)
	}

	async getSubscription(): Promise<Subscription> {
		return this.get<Subscription>('/stripe/subscription')
	}

	async updateSubscription(params: UpdateSubscriptionParams): Promise<Subscription> {
		return this.put<Subscription>('/stripe/subscription', params as unknown as Record<string, unknown>)
	}

	async cancelSubscription(): Promise<{ message: string }> {
		return this.delete<{ message: string }>('/stripe/subscription')
	}

	async getPaymentMethods(): Promise<PaymentMethod[]> {
		return this.get<PaymentMethod[]>('/stripe/payment-methods')
	}

	async addPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
		return this.post<PaymentMethod>('/billing/payment-methods', { paymentMethodId })
	}

	async setDefaultPaymentMethod(paymentMethodId: string): Promise<{ message: string }> {
		return this.put<{ message: string }>('/billing/payment-methods/default', { paymentMethodId })
	}

	async getInvoices(): Promise<Invoice[]> {
		return this.get<Invoice[]>('/billing/invoices')
	}

	async downloadInvoice(invoiceId: string): Promise<{ url: string }> {
		return this.get<{ url: string }>(`/billing/invoices/${invoiceId}/download`)
	}

	async getUsage(): Promise<{
		properties: number
		tenants: number
		leases: number
		maintenanceRequests: number
		limits: {
			properties: number
			tenants: number
			leases: number
			maintenanceRequests: number
		}
	}> {
		return this.get<{
			properties: number
			tenants: number
			leases: number
			maintenanceRequests: number
			limits: {
				properties: number
				tenants: number
				leases: number
				maintenanceRequests: number
			}
		}>('/billing/usage')
	}

	async getPricingPlans(): Promise<unknown> {
		return this.get<unknown>('/billing/pricing-plans')
	}

	async retryPayment(invoiceId: string): Promise<{ success: boolean }> {
		return this.post<{ success: boolean }>(`/billing/invoices/${invoiceId}/retry`)
	}

	// ========================
	// Dashboard Endpoints
	// ========================

	async getDashboardOverview(): Promise<DashboardStats> {
		return this.get<DashboardStats>('/dashboard/overview')
	}

	async getRecentActivity(): Promise<ActivityItem[]> {
		return this.get<ActivityItem[]>('/dashboard/activity')
	}

	async getUpcomingTasks(): Promise<{ id: string; title: string; dueDate: string; priority: string }[]> {
		return this.get<{ id: string; title: string; dueDate: string; priority: string }[]>('/dashboard/tasks')
	}

	async getAlerts(): Promise<unknown[]> {
		return this.get<unknown[]>('/dashboard/alerts')
	}

	// Helper method to create cancellable requests
	createCancellableRequest() {
		const controller = new AbortController()
		return {
			signal: controller.signal,
			cancel: () => controller.abort()
		}
	}
}

// Export singleton instance
export const apiClient = new ApiClient()

// Backward compatibility: Export as ApiService for existing imports
export const ApiService = apiClient

export default apiClient

// Export type for cancellable requests
export type CancellableRequest = ReturnType<
	ApiClient['createCancellableRequest']
>
