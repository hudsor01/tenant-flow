import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios'
import { supabase } from '@/lib/clients/supabase-client'
import { toast } from 'sonner'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002'

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
            const { data: { session } } = await supabase.auth.getSession()
            
            if (session?.access_token) {
                config.headers.Authorization = `Bearer ${session.access_token}`
            }
        } catch (error) {
            console.error('Error getting auth session:', error)
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
                const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
                
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

    // v1 API with Hono-style RPC pattern for legacy code compatibility
    v1: {
        auth: {
            $get: async () => {
                const response = await apiClient.get('/auth/me')
                return {
                    ok: response.status >= 200 && response.status < 300,
                    json: async () => response.data
                }
            }
        },
        maintenance: {
            $get: async (options?: { query?: Record<string, unknown> }) => {
                const response = await apiClient.get('/maintenance', { params: options?.query })
                return {
                    ok: response.status >= 200 && response.status < 300,
                    json: async () => response.data
                }
            },
            $post: async (options: { json: Record<string, unknown> }) => {
                const response = await apiClient.post('/maintenance', options.json)
                return {
                    ok: response.status >= 200 && response.status < 300,
                    json: async () => response.data
                }
            },
            stats: {
                $get: async () => {
                    const response = await apiClient.get('/maintenance/stats')
                    return {
                        ok: response.status >= 200 && response.status < 300,
                        json: async () => response.data
                    }
                }
            },
            ':id': {
                $get: async (options: { param: { id: string } }) => {
                    const response = await apiClient.get(`/maintenance/${options.param.id}`)
                    return {
                        ok: response.status >= 200 && response.status < 300,
                        json: async () => response.data
                    }
                },
                $put: async (options: { param: { id: string }, json: Record<string, unknown> }) => {
                    const response = await apiClient.put(`/maintenance/${options.param.id}`, options.json)
                    return {
                        ok: response.status >= 200 && response.status < 300,
                        json: async () => response.data
                    }
                },
                $delete: async (options: { param: { id: string } }) => {
                    const response = await apiClient.delete(`/maintenance/${options.param.id}`)
                    return {
                        ok: response.status >= 200 && response.status < 300,
                        json: async () => response.data
                    }
                }
            }
        },
        subscriptions: {
            direct: {
                $post: async (options: { json: Record<string, unknown> }) => {
                    const response = await apiClient.post('/subscriptions/direct', options.json)
                    return {
                        ok: response.status >= 200 && response.status < 300,
                        json: async () => response.data
                    }
                }
            },
            ':id': {
                $put: async (options: { param: { id: string }, json: Record<string, unknown> }) => {
                    const response = await apiClient.put(`/subscriptions/${options.param.id}`, options.json)
                    return {
                        ok: response.status >= 200 && response.status < 300,
                        json: async () => response.data
                    }
                },
                cancel: {
                    $post: async (options: { param: { id: string }, json?: Record<string, unknown> }) => {
                        const response = await apiClient.post(`/subscriptions/${options.param.id}/cancel`, options.json || {})
                        return {
                            ok: response.status >= 200 && response.status < 300,
                            json: async () => response.data
                        }
                    }
                },
                preview: {
                    $post: async (options: { param: { id: string }, json: Record<string, unknown> }) => {
                        const response = await apiClient.post(`/subscriptions/${options.param.id}/preview`, options.json)
                        return {
                            ok: response.status >= 200 && response.status < 300,
                            json: async () => response.data
                        }
                    }
                }
            }
        },
        leases: {
            $get: async (options?: { query?: Record<string, unknown> }) => {
                const response = await apiClient.get('/leases', { params: options?.query })
                return {
                    ok: response.status >= 200 && response.status < 300,
                    json: async () => response.data
                }
            }
        }
    }
}

export default apiClient