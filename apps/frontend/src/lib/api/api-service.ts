/**
 * Unified API Service
 * Consolidates all API operations into a single service class
 * Eliminates redundant layers and provides clean type safety
 */
import { apiClient } from '../api-client'
import type {
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
	UpdateUserProfileInput,
	CreatePortalInput,
	UpdateSubscriptionParams,
	Subscription,
	PaymentMethod,
	Invoice
} from '@repo/shared'

export class ApiService {
	// ========================
	// Authentication Endpoints
	// ========================

	static async login(data: { email: string; password: string }): Promise<{ access_token: string; user: AuthUser }> {
		return apiClient.post<{ access_token: string; user: AuthUser }>('/auth/login', data)
	}

	static async logout(): Promise<{ message: string }> {
		return apiClient.post<{ message: string }>('/auth/logout')
	}

	static async getCurrentUser(): Promise<User> {
		return apiClient.get<User>('/auth/me')
	}

	static async updateProfile(data: UpdateUserProfileInput): Promise<User> {
		return apiClient.put<User>('/auth/profile', data)
	}

	static async refreshToken(): Promise<{ access_token: string }> {
		return apiClient.post<{ access_token: string }>('/auth/refresh')
	}

	// ========================
	// Properties Endpoints
	// ========================

	static async getProperties(params?: PropertyQuery): Promise<Property[]> {
		return apiClient.get<Property[]>('/properties', { params })
	}

	static async getProperty(id: string): Promise<Property> {
		return apiClient.get<Property>(`/properties/${id}`)
	}

	static async createProperty(data: CreatePropertyInput): Promise<Property> {
		return apiClient.post<Property>('/properties', data)
	}

	static async updateProperty(id: string, data: UpdatePropertyInput): Promise<Property> {
		return apiClient.put<Property>(`/properties/${id}`, data)
	}

	static async deleteProperty(id: string): Promise<{ message: string }> {
		return apiClient.delete<{ message: string }>(`/properties/${id}`)
	}

	static async getPropertyStats(): Promise<{
		total: number
		occupied: number
		vacant: number
		occupancyRate: number
		totalMonthlyRent: number
		averageRent: number
	}> {
		return apiClient.get<{
			total: number
			occupied: number
			vacant: number
			occupancyRate: number
			totalMonthlyRent: number
			averageRent: number
		}>('/properties/stats')
	}

	static async uploadPropertyImage(id: string, formData: FormData): Promise<{ url: string }> {
		return apiClient.post<{ url: string }>(`/properties/${id}/upload-image`, formData, {
			headers: { 'Content-Type': 'multipart/form-data' }
		})
	}

	static async getPropertyUnits(propertyId: string): Promise<Unit[]> {
		return apiClient.get<Unit[]>(`/properties/${propertyId}/units`)
	}

	static async getPropertyTenants(propertyId: string): Promise<Tenant[]> {
		return apiClient.get<Tenant[]>(`/properties/${propertyId}/tenants`)
	}

	static async getPropertyLeases(propertyId: string): Promise<Lease[]> {
		return apiClient.get<Lease[]>(`/properties/${propertyId}/leases`)
	}

	static async getPropertyMaintenance(propertyId: string): Promise<MaintenanceRequest[]> {
		return apiClient.get<MaintenanceRequest[]>(`/properties/${propertyId}/maintenance`)
	}

	// ========================
	// Tenants Endpoints
	// ========================

	static async getTenants(params?: TenantQuery): Promise<Tenant[]> {
		return apiClient.get<Tenant[]>('/tenants', { params })
	}

	static async getTenant(id: string): Promise<Tenant> {
		return apiClient.get<Tenant>(`/tenants/${id}`)
	}

	static async createTenant(data: CreateTenantInput): Promise<Tenant> {
		return apiClient.post<Tenant>('/tenants', data)
	}

	static async updateTenant(id: string, data: UpdateTenantInput): Promise<Tenant> {
		return apiClient.put<Tenant>(`/tenants/${id}`, data)
	}

	static async deleteTenant(id: string): Promise<{ message: string }> {
		return apiClient.delete<{ message: string }>(`/tenants/${id}`)
	}

	static async getTenantStats(): Promise<{
		total: number
		active: number
		inactive: number
		pendingApplications: number
	}> {
		return apiClient.get<{
			total: number
			active: number
			inactive: number
			pendingApplications: number
		}>('/tenants/stats')
	}

	static async uploadTenantDocument(id: string, formData: FormData): Promise<{ url: string }> {
		return apiClient.post<{ url: string }>(`/tenants/${id}/documents`, formData, {
			headers: { 'Content-Type': 'multipart/form-data' }
		})
	}

	static async getTenantLeases(tenantId: string): Promise<Lease[]> {
		return apiClient.get<Lease[]>(`/tenants/${tenantId}/leases`)
	}

	static async getTenantPayments(tenantId: string): Promise<{ id: string; amount: number; date: string; status: string }[]> {
		return apiClient.get<{ id: string; amount: number; date: string; status: string }[]>(`/tenants/${tenantId}/payments`)
	}

	static async getTenantMaintenance(tenantId: string): Promise<MaintenanceRequest[]> {
		return apiClient.get<MaintenanceRequest[]>(`/tenants/${tenantId}/maintenance`)
	}

	static async getTenantDocuments(tenantId: string): Promise<Document[]> {
		return apiClient.get<Document[]>(`/tenants/${tenantId}/documents`)
	}

	static async inviteTenant(id: string, email: string): Promise<{ message: string }> {
		return apiClient.post<{ message: string }>(`/tenants/${id}/invite`, { email })
	}

	// ========================
	// Units Endpoints
	// ========================

	static async getUnits(params?: UnitQuery): Promise<Unit[]> {
		return apiClient.get<Unit[]>('/units', { params })
	}

	static async getUnit(id: string): Promise<Unit> {
		return apiClient.get<Unit>(`/units/${id}`)
	}

	static async createUnit(data: CreateUnitInput): Promise<Unit> {
		return apiClient.post<Unit>('/units', data)
	}

	static async updateUnit(id: string, data: UpdateUnitInput): Promise<Unit> {
		return apiClient.put<Unit>(`/units/${id}`, data)
	}

	static async deleteUnit(id: string): Promise<{ message: string }> {
		return apiClient.delete<{ message: string }>(`/units/${id}`)
	}

	static async updateUnitAvailability(id: string, isAvailable: boolean): Promise<Unit> {
		return apiClient.patch<Unit>(`/units/${id}/availability`, { isAvailable })
	}

	// ========================
	// Leases Endpoints
	// ========================

	static async getLeases(params?: LeaseQuery): Promise<Lease[]> {
		return apiClient.get<Lease[]>('/leases', { params })
	}

	static async getLease(id: string): Promise<Lease> {
		return apiClient.get<Lease>(`/leases/${id}`)
	}

	static async createLease(data: CreateLeaseInput): Promise<Lease> {
		return apiClient.post<Lease>('/leases', data)
	}

	static async updateLease(id: string, data: UpdateLeaseInput): Promise<Lease> {
		return apiClient.put<Lease>(`/leases/${id}`, data)
	}

	static async deleteLease(id: string): Promise<{ message: string }> {
		return apiClient.delete<{ message: string }>(`/leases/${id}`)
	}

	static async generateLeasePDF(id: string): Promise<{ url: string }> {
		return apiClient.post<{ url: string }>(`/leases/${id}/generate-pdf`)
	}

	static async uploadLeaseDocument(id: string, formData: FormData): Promise<{ url: string }> {
		return apiClient.post<{ url: string }>(`/leases/${id}/documents`, formData, {
			headers: { 'Content-Type': 'multipart/form-data' }
		})
	}

	static async activateLease(id: string): Promise<Lease> {
		return apiClient.post<Lease>(`/leases/${id}/activate`)
	}

	static async terminateLease(id: string, reason: string): Promise<Lease> {
		return apiClient.post<Lease>(`/leases/${id}/terminate`, { reason })
	}

	static async renewLease(id: string, data: { endDate: string; newRent?: number }): Promise<Lease> {
		return apiClient.post<Lease>(`/leases/${id}/renew`, data)
	}

	// ========================
	// Maintenance Endpoints
	// ========================

	static async getMaintenanceRequests(params?: MaintenanceQuery): Promise<MaintenanceRequest[]> {
		return apiClient.get<MaintenanceRequest[]>('/maintenance', { params })
	}

	static async getMaintenanceRequest(id: string): Promise<MaintenanceRequest> {
		return apiClient.get<MaintenanceRequest>(`/maintenance/${id}`)
	}

	static async createMaintenanceRequest(data: CreateMaintenanceInput): Promise<MaintenanceRequest> {
		return apiClient.post<MaintenanceRequest>('/maintenance', data)
	}

	static async updateMaintenanceRequest(id: string, data: UpdateMaintenanceInput): Promise<MaintenanceRequest> {
		return apiClient.put<MaintenanceRequest>(`/maintenance/${id}`, data)
	}

	static async deleteMaintenanceRequest(id: string): Promise<{ message: string }> {
		return apiClient.delete<{ message: string }>(`/maintenance/${id}`)
	}

	static async updateMaintenanceStatus(id: string, status: string): Promise<MaintenanceRequest> {
		return apiClient.patch<MaintenanceRequest>(`/maintenance/${id}/status`, { status })
	}

	static async assignMaintenanceVendor(id: string, vendorId: string): Promise<MaintenanceRequest> {
		return apiClient.post<MaintenanceRequest>(`/maintenance/${id}/assign`, { vendorId })
	}

	static async addMaintenanceComment(id: string, comment: string): Promise<{ message: string }> {
		return apiClient.post<{ message: string }>(`/maintenance/${id}/comments`, { comment })
	}

	static async uploadMaintenanceImage(id: string, formData: FormData): Promise<{ url: string }> {
		return apiClient.post<{ url: string }>(`/maintenance/${id}/images`, formData, {
			headers: { 'Content-Type': 'multipart/form-data' }
		})
	}

	// ========================
	// Billing/Stripe Endpoints
	// ========================

	static async createCheckoutSession(data: CreateCheckoutSessionRequest): Promise<{ sessionId: string; url: string }> {
		return apiClient.post<{ sessionId: string; url: string }>('/billing/create-checkout-session', data)
	}

	static async createPortalSession(data: CreatePortalInput): Promise<{ url: string }> {
		return apiClient.post<{ url: string }>('/billing/create-portal-session', data as Record<string, unknown>)
	}

	static async getSubscription(): Promise<Subscription> {
		return apiClient.get<Subscription>('/billing/subscription')
	}

	static async updateSubscription(params: UpdateSubscriptionParams): Promise<Subscription> {
		return apiClient.put<Subscription>('/billing/subscription', params as unknown as Record<string, unknown>)
	}

	static async cancelSubscription(): Promise<{ message: string }> {
		return apiClient.delete<{ message: string }>('/billing/subscription')
	}

	static async getPaymentMethods(): Promise<PaymentMethod[]> {
		return apiClient.get<PaymentMethod[]>('/billing/payment-methods')
	}

	static async addPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
		return apiClient.post<PaymentMethod>('/billing/payment-methods', { paymentMethodId })
	}

	static async setDefaultPaymentMethod(paymentMethodId: string): Promise<{ message: string }> {
		return apiClient.put<{ message: string }>('/billing/payment-methods/default', { paymentMethodId })
	}

	static async getInvoices(): Promise<Invoice[]> {
		return apiClient.get<Invoice[]>('/billing/invoices')
	}

	static async downloadInvoice(invoiceId: string): Promise<{ url: string }> {
		return apiClient.get<{ url: string }>(`/billing/invoices/${invoiceId}/download`)
	}

	static async getUsage(): Promise<{
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
		return apiClient.get<{
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

	// ========================
	// Dashboard Endpoints
	// ========================

	static async getDashboardOverview(): Promise<DashboardStats> {
		return apiClient.get<DashboardStats>('/dashboard/overview')
	}

	static async getRecentActivity(): Promise<ActivityItem[]> {
		return apiClient.get<ActivityItem[]>('/dashboard/activity')
	}

	static async getUpcomingTasks(): Promise<{ id: string; title: string; dueDate: string; priority: string }[]> {
		return apiClient.get<{ id: string; title: string; dueDate: string; priority: string }[]>('/dashboard/tasks')
	}

	static async getAlerts(): Promise<unknown[]> {
		return apiClient.get<unknown[]>('/dashboard/alerts')
	}
}