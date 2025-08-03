import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios'
import { supabaseSafe } from '@/lib/clients'
import { toast } from 'sonner'

// Production API URL - using Vercel deployment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.tenantflow.app'

// Create axios instance with base configuration
export const apiClient: AxiosInstance = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            const { data: { session } } = await supabaseSafe.auth.getSession()
            
            if (session?.access_token) {
                config.headers.Authorization = `Bearer ${session.access_token}`
            }
        } catch {
            // Silently handle auth session errors to avoid console noise
            // Error will be handled by the auth system
        }
        
        return config
    },
    (error: AxiosError) => {
        return Promise.reject(error)
    }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<{ message?: string; error?: string }>) => {
        // Handle token refresh
        if (error.response?.status === 401) {
            try {
                const { data: { session }, error: refreshError } = await supabaseSafe.auth.refreshSession()
                
                if (!refreshError && session && error.config) {
                    // Retry the original request with new token
                    error.config.headers.Authorization = `Bearer ${session.access_token}`
                    return apiClient.request(error.config)
                }
            } catch {
                // Redirect to login on refresh failure
                window.location.href = '/auth/login'
            }
        }
        
        // Handle other errors
        const message = error.response?.data?.message || 
                       error.response?.data?.error || 
                       error.message || 
                       'An unexpected error occurred'
        
        // Show error toast for user-facing errors
        if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
            toast.error(message)
        } else if (error.response?.status && error.response.status >= 500) {
            toast.error('Server error. Please try again later.')
        }
        
        return Promise.reject(error)
    }
)

// Helper function to handle API errors consistently
export function handleApiError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message || 
               error.response?.data?.error || 
               error.message || 
               'An unexpected error occurred'
    }
    
    if (error instanceof Error) {
        return error.message
    }
    
    return 'An unexpected error occurred'
}

// Type-safe API endpoints
export const api = {
    // Auth endpoints
    auth: {
        login: (data: { email: string; password: string }) => 
            apiClient.post('/auth/login', data),
        logout: () => 
            apiClient.post('/auth/logout'),
        me: () => 
            apiClient.get('/auth/me'),
    },
    
    // Properties endpoints
    properties: {
        list: (params?: Record<string, unknown>) => 
            apiClient.get('/properties', { params }),
        get: (id: string) => 
            apiClient.get(`/properties/${id}`),
        create: (data: Record<string, unknown>) => 
            apiClient.post('/properties', data),
        update: (id: string, data: Record<string, unknown>) => 
            apiClient.put(`/properties/${id}`, data),
        delete: (id: string) => 
            apiClient.delete(`/properties/${id}`),
        stats: () => 
            apiClient.get('/properties/stats'),
        uploadImage: (id: string, formData: FormData) => 
            apiClient.post(`/properties/${id}/upload-image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            }),
    },
    
    // Tenants endpoints
    tenants: {
        list: (params?: Record<string, unknown>) => 
            apiClient.get('/tenants', { params }),
        get: (id: string) => 
            apiClient.get(`/tenants/${id}`),
        create: (data: Record<string, unknown>) => 
            apiClient.post('/tenants', data),
        update: (id: string, data: Record<string, unknown>) => 
            apiClient.put(`/tenants/${id}`, data),
        delete: (id: string) => 
            apiClient.delete(`/tenants/${id}`),
        stats: () => 
            apiClient.get('/tenants/stats'),
        uploadDocument: (id: string, formData: FormData) =>
            apiClient.post(`/tenants/${id}/documents`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            }),
    },
    
    // Units endpoints
    units: {
        list: (params?: Record<string, unknown>) => 
            apiClient.get('/units', { params }),
        get: (id: string) => 
            apiClient.get(`/units/${id}`),
        create: (data: Record<string, unknown>) => 
            apiClient.post('/units', data),
        update: (id: string, data: Record<string, unknown>) => 
            apiClient.put(`/units/${id}`, data),
        delete: (id: string) => 
            apiClient.delete(`/units/${id}`),
    },
    
    // Leases endpoints
    leases: {
        list: (params?: Record<string, unknown>) => 
            apiClient.get('/leases', { params }),
        get: (id: string) => 
            apiClient.get(`/leases/${id}`),
        create: (data: Record<string, unknown>) => 
            apiClient.post('/leases', data),
        update: (id: string, data: Record<string, unknown>) => 
            apiClient.put(`/leases/${id}`, data),
        delete: (id: string) => 
            apiClient.delete(`/leases/${id}`),
    },
    
    // Maintenance endpoints
    maintenance: {
        list: (params?: Record<string, unknown>) => 
            apiClient.get('/maintenance', { params }),
        get: (id: string) => 
            apiClient.get(`/maintenance/${id}`),
        create: (data: Record<string, unknown>) => 
            apiClient.post('/maintenance', data),
        update: (id: string, data: Record<string, unknown>) => 
            apiClient.put(`/maintenance/${id}`, data),
        delete: (id: string) => 
            apiClient.delete(`/maintenance/${id}`),
    },
    
    // Subscription endpoints
    subscriptions: {
        current: () => 
            apiClient.get('/subscriptions/current'),
        plans: () => 
            apiClient.get('/subscriptions/plans'),
        createCheckout: (data: { priceId: string }) => 
            apiClient.post('/subscriptions/create-checkout-session', data),
        createPortal: () => 
            apiClient.post('/subscriptions/create-portal-session'),
        cancel: (data: Record<string, unknown>) => 
            apiClient.post('/subscriptions/cancel', data),
        billingPortal: (data: Record<string, unknown>) => 
            apiClient.post('/subscriptions/billing-portal', data),
        customerPortal: (data: Record<string, unknown>) => 
            apiClient.post('/subscriptions/customer-portal', data),
        checkout: (data: Record<string, unknown>) => 
            apiClient.post('/subscriptions/checkout', data),
        checkoutSession: (data: Record<string, unknown>) => 
            apiClient.post('/subscriptions/checkout-session', data),
        upgradeCheckout: (data: Record<string, unknown>) => 
            apiClient.post('/subscriptions/upgrade-checkout', data),
        cancelSubscription: (data: Record<string, unknown>) => 
            apiClient.post('/subscriptions/cancel-subscription', data),
        status: (params?: Record<string, unknown>) => 
            apiClient.get('/subscriptions/status', { params }),
        checkFeatures: (data: Record<string, unknown>) => 
            apiClient.post('/subscriptions/features/check', data),
    },
    
    // User endpoints
    users: {
        profile: () => 
            apiClient.get('/users/profile'),
        updateProfile: (data: Record<string, unknown>) => 
            apiClient.put('/users/profile', data),
        uploadAvatar: (formData: FormData) => 
            apiClient.post('/users/upload-avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            }),
    },
    
    // Billing endpoints
    billing: {
        createCheckoutSession: (data: Record<string, unknown>) =>
            apiClient.post('/billing/checkout/session', data),
        createPortalSession: (data: { returnUrl: string }) =>
            apiClient.post('/billing/portal/session', data),
        createFreeTrial: () =>
            apiClient.post('/billing/trial/create'),
        previewSubscriptionUpdate: (data: Record<string, unknown>) =>
            apiClient.post('/billing/subscription/preview', data),
        getPaymentMethods: () =>
            apiClient.get('/billing/payment-methods'),
        updatePaymentMethod: (data: Record<string, unknown>) =>
            apiClient.post('/billing/payment-methods/update', data),
        handleCheckoutSuccess: (sessionId: string) =>
            apiClient.get('/billing/checkout/success', { params: { session_id: sessionId } }),
    },

    // Dashboard endpoints
    dashboard: {
        getStats: (params: { period: string }) =>
            apiClient.get('/dashboard/stats', { params }),
        getRecentActivities: (params: { limit: number }) =>
            apiClient.get('/dashboard/recent-activities', { params }),
    },
}

export default apiClient
