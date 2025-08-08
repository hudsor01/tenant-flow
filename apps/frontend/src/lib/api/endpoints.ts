/**
 * API Endpoints Configuration
 * Complete API client with all endpoints from the NestJS backend
 */
import { apiClient } from '../api-client';
import type {
  Property,
  Tenant,
  Unit,
  Lease,
  MaintenanceRequest,
  Document,
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
} from '@repo/shared';

// Organization types (to be moved to @repo/shared later)

interface UpdateOrganizationInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
}

interface OrganizationSettings {
  allowTenantPortal: boolean;
  enableMaintenanceRequests: boolean;
  enableOnlinePayments: boolean;
  autoSendRentReminders: boolean;
  rentDueDay: number;
  lateFeeDays: number;
  lateFeeAmount?: number;
  currency: string;
  timezone: string;
}

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  categories: {
    maintenance: boolean;
    leases: boolean;
    general: boolean;
  };
}

// Type-safe API endpoints matching NestJS backend
export const api = {
  // Auth endpoints
  auth: {
    login: (data: { email: string; password: string }) =>
      apiClient.post('/auth/login', data as Record<string, unknown>),
    logout: () =>
      apiClient.post('/auth/logout'),
    me: () =>
      apiClient.get('/auth/me'),
    updateProfile: (data: UpdateUserProfileInput) =>
      apiClient.put('/auth/profile', data as Record<string, unknown>),
    refreshToken: () =>
      apiClient.post('/auth/refresh'),
  },

  // Properties endpoints
  properties: {
    list: (params?: PropertyQuery) =>
      apiClient.get<Property[]>('/properties', { params }),
    get: (id: string) =>
      apiClient.get<Property>(`/properties/${id}`),
    create: (data: CreatePropertyInput) =>
      apiClient.post<Property>('/properties', data as unknown as Record<string, unknown>),
    update: (id: string, data: UpdatePropertyInput) =>
      apiClient.put<Property>(`/properties/${id}`, data as Record<string, unknown>),
    delete: (id: string) =>
      apiClient.delete<{ message: string }>(`/properties/${id}`),
    stats: () =>
      apiClient.get<{
        total: number;
        occupied: number;
        vacant: number;
        occupancyRate: number;
        totalMonthlyRent: number;
        averageRent: number;
      }>('/properties/stats'),
    uploadImage: (id: string, formData: FormData) =>
      apiClient.post<{ url: string }>(`/properties/${id}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    // Property units
    getUnits: (propertyId: string) =>
      apiClient.get<Unit[]>(`/properties/${propertyId}/units`),
    // Property tenants
    getTenants: (propertyId: string) =>
      apiClient.get<Tenant[]>(`/properties/${propertyId}/tenants`),
    // Property leases
    getLeases: (propertyId: string) =>
      apiClient.get<Lease[]>(`/properties/${propertyId}/leases`),
    // Property maintenance
    getMaintenance: (propertyId: string) =>
      apiClient.get<MaintenanceRequest[]>(`/properties/${propertyId}/maintenance`),
  },

  // Tenants endpoints
  tenants: {
    list: (params?: TenantQuery) =>
      apiClient.get<Tenant[]>('/tenants', { params }),
    get: (id: string) =>
      apiClient.get<Tenant>(`/tenants/${id}`),
    create: (data: CreateTenantInput) =>
      apiClient.post<Tenant>('/tenants', data as Record<string, unknown>),
    update: (id: string, data: UpdateTenantInput) =>
      apiClient.put<Tenant>(`/tenants/${id}`, data as Record<string, unknown>),
    delete: (id: string) =>
      apiClient.delete<{ message: string }>(`/tenants/${id}`),
    stats: () =>
      apiClient.get<{
        total: number;
        active: number;
        inactive: number;
        pendingApplications: number;
      }>('/tenants/stats'),
    uploadDocument: (id: string, formData: FormData) =>
      apiClient.post<{ url: string }>(`/tenants/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    // Tenant-specific data
    getLeases: (tenantId: string) =>
      apiClient.get<Lease[]>(`/tenants/${tenantId}/leases`),
    getPayments: (tenantId: string) =>
      apiClient.get<{ id: string; amount: number; date: string; status: string }[]>(`/tenants/${tenantId}/payments`),
    getMaintenance: (tenantId: string) =>
      apiClient.get<MaintenanceRequest[]>(`/tenants/${tenantId}/maintenance`),
    getDocuments: (tenantId: string) =>
      apiClient.get<Document[]>(`/tenants/${tenantId}/documents`),
    // Tenant portal specific
    inviteTenant: (id: string, email: string) =>
      apiClient.post<{ message: string }>(`/tenants/${id}/invite`, { email }),
  },

  // Units endpoints
  units: {
    list: (params?: UnitQuery) =>
      apiClient.get('/units', { params }),
    get: (id: string) =>
      apiClient.get(`/units/${id}`),
    create: (data: CreateUnitInput) =>
      apiClient.post('/units', data as Record<string, unknown>),
    update: (id: string, data: UpdateUnitInput) =>
      apiClient.put(`/units/${id}`, data as Record<string, unknown>),
    delete: (id: string) =>
      apiClient.delete(`/units/${id}`),
    // Unit availability
    updateAvailability: (id: string, isAvailable: boolean) =>
      apiClient.patch(`/units/${id}/availability`, { isAvailable }),
  },

  // Leases endpoints
  leases: {
    list: (params?: LeaseQuery) =>
      apiClient.get('/leases', { params }),
    get: (id: string) =>
      apiClient.get(`/leases/${id}`),
    create: (data: CreateLeaseInput) =>
      apiClient.post('/leases', data as Record<string, unknown>),
    update: (id: string, data: UpdateLeaseInput) =>
      apiClient.put(`/leases/${id}`, data as Record<string, unknown>),
    delete: (id: string) =>
      apiClient.delete(`/leases/${id}`),
    // Lease documents
    generatePDF: (id: string) =>
      apiClient.post(`/leases/${id}/generate-pdf`),
    uploadDocument: (id: string, formData: FormData) =>
      apiClient.post(`/leases/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    // Lease lifecycle
    activate: (id: string) =>
      apiClient.post(`/leases/${id}/activate`),
    terminate: (id: string, reason: string) =>
      apiClient.post(`/leases/${id}/terminate`, { reason }),
    renew: (id: string, data: { endDate: string; newRent?: number }) =>
      apiClient.post(`/leases/${id}/renew`, data as Record<string, unknown>),
  },

  // Maintenance endpoints
  maintenance: {
    list: (params?: MaintenanceQuery) =>
      apiClient.get('/maintenance', { params }),
    get: (id: string) =>
      apiClient.get(`/maintenance/${id}`),
    create: (data: CreateMaintenanceInput) =>
      apiClient.post('/maintenance', data as Record<string, unknown>),
    update: (id: string, data: UpdateMaintenanceInput) =>
      apiClient.put(`/maintenance/${id}`, data as Record<string, unknown>),
    delete: (id: string) =>
      apiClient.delete(`/maintenance/${id}`),
    // Status updates
    updateStatus: (id: string, status: string) =>
      apiClient.patch(`/maintenance/${id}/status`, { status }),
    assignVendor: (id: string, vendorId: string) =>
      apiClient.post(`/maintenance/${id}/assign`, { vendorId }),
    // Comments and attachments
    addComment: (id: string, comment: string) =>
      apiClient.post(`/maintenance/${id}/comments`, { comment }),
    uploadImage: (id: string, formData: FormData) =>
      apiClient.post(`/maintenance/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
  },

  // Billing/Stripe endpoints
  billing: {
    // Subscriptions
    createCheckoutSession: (data: CreateCheckoutSessionRequest) =>
      apiClient.post('/billing/create-checkout-session', data as unknown as Record<string, unknown>),
    createPortalSession: (data: CreatePortalInput) =>
      apiClient.post('/billing/create-portal-session', data as Record<string, unknown>),
    getSubscription: () =>
      apiClient.get('/billing/subscription'),
    updateSubscription: (params: UpdateSubscriptionParams) =>
      apiClient.put('/billing/subscription', params as unknown as Record<string, unknown>),
    cancelSubscription: () =>
      apiClient.delete('/billing/subscription'),
    // Payments
    getPaymentMethods: () =>
      apiClient.get('/billing/payment-methods'),
    addPaymentMethod: (paymentMethodId: string) =>
      apiClient.post('/billing/payment-methods', { paymentMethodId }),
    setDefaultPaymentMethod: (paymentMethodId: string) =>
      apiClient.put('/billing/payment-methods/default', { paymentMethodId }),
    // Invoices
    getInvoices: () =>
      apiClient.get('/billing/invoices'),
    downloadInvoice: (invoiceId: string) =>
      apiClient.get(`/billing/invoices/${invoiceId}/download`),
    // Usage
    getUsage: () =>
      apiClient.get('/billing/usage'),
  },

  // User Management
  users: {
    list: () =>
      apiClient.get('/users'),
    get: (id: string) =>
      apiClient.get(`/users/${id}`),
    update: (id: string, data: UpdateUserProfileInput) =>
      apiClient.put(`/users/${id}`, data as Record<string, unknown>),
    delete: (id: string) =>
      apiClient.delete(`/users/${id}`),
    // User roles and permissions
    updateRole: (id: string, role: string) =>
      apiClient.patch(`/users/${id}/role`, { role }),
    getPermissions: (id: string) =>
      apiClient.get(`/users/${id}/permissions`),
  },

  // Organization Management
  organization: {
    get: () =>
      apiClient.get('/organization'),
    update: (data: UpdateOrganizationInput) =>
      apiClient.put('/organization', data as Record<string, unknown>),
    getMembers: () =>
      apiClient.get('/organization/members'),
    inviteMember: (email: string, role: string) =>
      apiClient.post('/organization/invite', { email, role }),
    removeMember: (userId: string) =>
      apiClient.delete(`/organization/members/${userId}`),
    // Settings
    getSettings: () =>
      apiClient.get('/organization/settings'),
    updateSettings: (settings: OrganizationSettings) =>
      apiClient.put('/organization/settings', settings as unknown as Record<string, unknown>),
  },

  // Reports and Analytics
  reports: {
    // Financial reports
    getRentRoll: (params?: { month?: string; year?: number }) =>
      apiClient.get('/reports/rent-roll', { params }),
    getIncomeStatement: (params?: { startDate?: string; endDate?: string }) =>
      apiClient.get('/reports/income-statement', { params }),
    getCashFlow: (params?: { startDate?: string; endDate?: string }) =>
      apiClient.get('/reports/cash-flow', { params }),
    // Occupancy reports
    getOccupancyRate: () =>
      apiClient.get('/reports/occupancy-rate'),
    getVacancyReport: () =>
      apiClient.get('/reports/vacancy'),
    // Maintenance reports
    getMaintenanceCosts: (params?: { startDate?: string; endDate?: string }) =>
      apiClient.get('/reports/maintenance-costs', { params }),
    getMaintenanceByProperty: (propertyId: string) =>
      apiClient.get(`/reports/maintenance/property/${propertyId}`),
  },

  // Notifications
  notifications: {
    list: (params?: { read?: boolean; limit?: number }) =>
      apiClient.get('/notifications', { params }),
    markAsRead: (id: string) =>
      apiClient.patch(`/notifications/${id}/read`),
    markAllAsRead: () =>
      apiClient.patch('/notifications/read-all'),
    delete: (id: string) =>
      apiClient.delete(`/notifications/${id}`),
    // Preferences
    getPreferences: () =>
      apiClient.get('/notifications/preferences'),
    updatePreferences: (preferences: NotificationPreferences) =>
      apiClient.put('/notifications/preferences', preferences as unknown as Record<string, unknown>),
  },

  // Documents
  documents: {
    list: (params?: { type?: string; entityId?: string }) =>
      apiClient.get('/documents', { params }),
    get: (id: string) =>
      apiClient.get(`/documents/${id}`),
    upload: (formData: FormData) =>
      apiClient.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    delete: (id: string) =>
      apiClient.delete(`/documents/${id}`),
    download: (id: string) =>
      apiClient.get(`/documents/${id}/download`),
  },

  // Dashboard
  dashboard: {
    getOverview: () =>
      apiClient.get('/dashboard/overview'),
    getRecentActivity: () =>
      apiClient.get('/dashboard/activity'),
    getUpcomingTasks: () =>
      apiClient.get('/dashboard/tasks'),
    getAlerts: () =>
      apiClient.get('/dashboard/alerts'),
  },
};