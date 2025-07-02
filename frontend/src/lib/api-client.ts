import type {
  ApiError,
  AuthCredentials,
  RegisterData,
  AuthResponse,
  UserProfileResponse,
  UpdateUserProfileDto,
  CreatePropertyDto,
  UpdatePropertyDto,
  PropertyStats,
  PropertyWithDetails,
  CreateTenantDto,
  UpdateTenantDto,
  TenantStats,
  TenantWithDetails,
  CreateUnitDto,
  UpdateUnitDto,
  UnitStats,
  UnitWithDetails,
  CreateLeaseDto,
  UpdateLeaseDto,
  LeaseStats,
  LeaseWithDetails,
  ExpiringLease,
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentStats,
  PaymentWithDetails,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  MaintenanceWithDetails,
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationWithDetails,
  FileUploadResponse,
} from '../types/api'

// Extend query types to satisfy Record<string, unknown>
export type PropertyQuery = Record<string, unknown> & {
  propertyType?: string
  status?: string
  search?: string
  limit?: number
  offset?: number
}

export type TenantQuery = Record<string, unknown> & {
  status?: string
  search?: string
  limit?: number
  offset?: number
}

export type UnitQuery = Record<string, unknown> & {
  propertyId?: string
  status?: string
  search?: string
  limit?: number
  offset?: number
}

export type LeaseQuery = Record<string, unknown> & {
  unitId?: string
  tenantId?: string
  status?: string
  search?: string
  limit?: number
  offset?: number
}

export type PaymentQuery = Record<string, unknown> & {
  leaseId?: string
  status?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

export type MaintenanceQuery = Record<string, unknown> & {
  unitId?: string
  status?: string
  priority?: string
  search?: string
  limit?: number
  offset?: number
}

export type NotificationQuery = Record<string, unknown> & {
  read?: boolean
  type?: string
  priority?: string
  limit?: number
  offset?: number
}

// Environment configuration
const getApiBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL
  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL environment variable is not set')
  }
  return baseUrl.replace(/\/$/, '') // Remove trailing slash
}

// Token management
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'access_token'
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token'

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY)
  }

  static setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token)
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY)
  }

  static setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token)
  }

  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
  }

  static setTokens(accessToken: string, refreshToken?: string): void {
    this.setAccessToken(accessToken)
    if (refreshToken) {
      this.setRefreshToken(refreshToken)
    }
  }
}

// HTTP client with error handling and authentication
class HttpClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = getApiBaseUrl()
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const token = TokenManager.getAccessToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const hasAuthHeader =
      options.headers &&
      (
        (typeof options.headers === 'object' &&
          !Array.isArray(options.headers) &&
          'Authorization' in options.headers) ||
        (options.headers instanceof Headers && options.headers.has('Authorization'))
      )
    if (token && !hasAuthHeader) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const config: RequestInit = {
      ...options,
      headers,
    }
    try {
      let response = await fetch(url, config)

      // Handle 401 (Unauthorized) - attempt token refresh
      if (response.status === 401 && token) {
        const refreshed = await this.tryRefreshToken()
        if (refreshed) {
          (headers as Record<string, string>)['Authorization'] = `Bearer ${TokenManager.getAccessToken()}`
          response = await fetch(url, { ...config, headers })
        } else {
          // If refresh failed, clear tokens and throw error
          TokenManager.clearTokens()
          throw new ApiClientError('Unauthorized', 401)
        }
      }

      return this.handleResponse<T>(response)
    } catch (error: unknown) {
      throw this.handleNetworkError(error)
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    if (!response.ok) {
      let errorData: ApiError

      if (isJson) {
        errorData = await response.json()
      } else {
        errorData = {
          message: response.statusText || 'An error occurred',
          statusCode: response.status,
        }
      }

      throw new ApiClientError(
        errorData.message || 'API request failed',
        response.status,
        errorData
      )
    }

    if (isJson) {
      return response.json()
    }

    // For non-JSON responses (like file downloads)
    return response as unknown as T
  }
    // For non-JSON responses (like file downloads)
  private handleNetworkError(error: unknown): ApiClientError {
    if (error instanceof TypeError && error.message && error.message.includes('fetch')) {
      return new ApiClientError('Network error - please check your connection', 0)
    }

    if (error instanceof ApiClientError) {
      return error
    }

    return new ApiClientError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      0
    )
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = TokenManager.getRefreshToken()
    if (!refreshToken) {
      TokenManager.clearTokens()
      return false
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (response.ok) {
        const data: AuthResponse = await response.json()
        TokenManager.setTokens(data.access_token, data.refresh_token)
        return true
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
    }

    TokenManager.clearTokens()
    return false
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = params 
      ? `${endpoint}?${new URLSearchParams(params).toString()}`
      : endpoint
    
    return this.request<T>(url, {
      method: 'GET',
    })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }

  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>
  ): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    const token = TokenManager.getAccessToken()
    const headers: HeadersInit = {}
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers,
    })
  }
}

// Custom error class for API errors
export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: ApiError
  ) {
    super(message)
    this.name = 'ApiClientError'
  }

  get isNetworkError(): boolean {
    return this.statusCode === 0
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401
  }

  get isForbidden(): boolean {
    return this.statusCode === 403
  }

  get isNotFound(): boolean {
    return this.statusCode === 404
  }

  get isValidationError(): boolean {
    return this.statusCode === 400
  }

  get isServerError(): boolean {
    return this.statusCode >= 500
  }
}

// Main API client class
export class ApiClient {
  private http: HttpClient

  constructor() {
    this.http = new HttpClient()
  }

  // Auth endpoints
  auth = {
    login: async (credentials: AuthCredentials): Promise<AuthResponse> => {
      const response = await this.http.post<AuthResponse>('/auth/login', credentials)
      if (response.access_token) {
        TokenManager.setTokens(response.access_token, response.refresh_token)
      }
      return response
    },

    register: async (data: RegisterData): Promise<AuthResponse> => {
      const response = await this.http.post<AuthResponse>('/auth/register', data)
      if (response.access_token) {
        TokenManager.setTokens(response.access_token, response.refresh_token)
      }
      return response
    },

    refresh: async (refreshToken: string): Promise<AuthResponse> => {
      const response = await this.http.post<AuthResponse>('/auth/refresh', {
        refresh_token: refreshToken,
      })
      if (response.access_token) {
        TokenManager.setTokens(response.access_token, response.refresh_token)
      }
      return response
    },

    logout: (): void => {
      TokenManager.clearTokens()
    },

    getToken: (): string | null => {
      return TokenManager.getAccessToken()
    },

    isAuthenticated: (): boolean => {
      return !!TokenManager.getAccessToken()
    },
  }

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

    update: async (id: string, data: UpdatePropertyDto): Promise<PropertyWithDetails> => {
      return this.http.put<PropertyWithDetails>(`/properties/${id}`, data)
    },

    delete: async (id: string): Promise<{ message: string }> => {
      return this.http.delete<{ message: string }>(`/properties/${id}`)
    },

    uploadImage: async (id: string, file: File): Promise<FileUploadResponse> => {
      return this.http.uploadFile<FileUploadResponse>(
        `/properties/${id}/upload-image`,
        file
      )
    },
  }

  // Tenants endpoints
  tenants = {
    getAll: async (query?: TenantQuery): Promise<TenantWithDetails[]> => {
      const params = query ? this.buildQueryParams(query) : undefined
      return this.http.get<TenantWithDetails[]>('/tenants', params)
    },

    getById: async (id: string): Promise<TenantWithDetails> => {
      return this.http.get<TenantWithDetails>(`/tenants/${id}`)
    },

    getStats: async (): Promise<TenantStats> => {
      return this.http.get<TenantStats>('/tenants/stats')
    },

    create: async (data: CreateTenantDto): Promise<TenantWithDetails> => {
      return this.http.post<TenantWithDetails>('/tenants', data)
    },

    update: async (id: string, data: UpdateTenantDto): Promise<TenantWithDetails> => {
      return this.http.put<TenantWithDetails>(`/tenants/${id}`, data)
    },

    delete: async (id: string): Promise<{ message: string }> => {
      return this.http.delete<{ message: string }>(`/tenants/${id}`)
    },

    uploadDocument: async (id: string, file: File, documentType: string): Promise<FileUploadResponse> => {
      return this.http.uploadFile<FileUploadResponse>(
        `/tenants/${id}/upload-document`,
        file,
        { documentType }
      )
    },
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

    update: async (id: string, data: UpdateUnitDto): Promise<UnitWithDetails> => {
      return this.http.put<UnitWithDetails>(`/units/${id}`, data)
    },

    delete: async (id: string): Promise<{ message: string }> => {
      return this.http.delete<{ message: string }>(`/units/${id}`)
    },
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

    getExpiring: async (days: number = 30): Promise<ExpiringLease[]> => {
      return this.http.get<ExpiringLease[]>('/leases/expiring', { days: days.toString() })
    },

    create: async (data: CreateLeaseDto): Promise<LeaseWithDetails> => {
      return this.http.post<LeaseWithDetails>('/leases', data)
    },

    update: async (id: string, data: UpdateLeaseDto): Promise<LeaseWithDetails> => {
      return this.http.put<LeaseWithDetails>(`/leases/${id}`, data)
    },

    delete: async (id: string): Promise<{ message: string }> => {
      return this.http.delete<{ message: string }>(`/leases/${id}`)
    },
  }

  // Payments endpoints
  payments = {
    getAll: async (query?: PaymentQuery): Promise<PaymentWithDetails[]> => {
      const params = query ? this.buildQueryParams(query) : undefined
      return this.http.get<PaymentWithDetails[]>('/payments', params)
    },

    getById: async (id: string): Promise<PaymentWithDetails> => {
      return this.http.get<PaymentWithDetails>(`/payments/${id}`, undefined)
    },

    getStats: async (): Promise<PaymentStats> => {
      return this.http.get<PaymentStats>('/payments/stats')
    },

    create: async (data: CreatePaymentDto): Promise<PaymentWithDetails> => {
      return this.http.post<PaymentWithDetails>('/payments', data)
    },

    update: async (id: string, data: UpdatePaymentDto): Promise<PaymentWithDetails> => {
      return this.http.put<PaymentWithDetails>(`/payments/${id}`, data)
    },

    delete: async (id: string): Promise<{ message: string }> => {
      return this.http.delete<{ message: string }>(`/payments/${id}`)
    },
  }

  // Maintenance endpoints
  maintenance = {
    getAll: async (query?: MaintenanceQuery): Promise<MaintenanceWithDetails[]> => {
      const params = query ? this.buildQueryParams(query) : undefined
      return this.http.get<MaintenanceWithDetails[]>('/maintenance', params)
    },

    getById: async (id: string): Promise<MaintenanceWithDetails> => {
      return this.http.get<MaintenanceWithDetails>(`/maintenance/${id}`)
    },

    getStats: async (): Promise<{ total: number; open: number; inProgress: number; completed: number }> => {
      return this.http.get<{ total: number; open: number; inProgress: number; completed: number }>('/maintenance/stats')
    },

    create: async (data: CreateMaintenanceDto): Promise<MaintenanceWithDetails> => {
      return this.http.post<MaintenanceWithDetails>('/maintenance', data)
    },

    update: async (id: string, data: UpdateMaintenanceDto): Promise<MaintenanceWithDetails> => {
      return this.http.put<MaintenanceWithDetails>(`/maintenance/${id}`, data)
    },

    delete: async (id: string): Promise<{ message: string }> => {
      return this.http.delete<{ message: string }>(`/maintenance/${id}`)
    },
  }

  // Notifications endpoints
  notifications = {
    getAll: async (query?: NotificationQuery): Promise<NotificationWithDetails[]> => {
      const params = query ? this.buildQueryParams(query) : undefined
      return this.http.get<NotificationWithDetails[]>('/notifications', params)
    },

    getById: async (id: string): Promise<NotificationWithDetails> => {
      return this.http.get<NotificationWithDetails>(`/notifications/${id}`)
    },

    getStats: async (): Promise<{ total: number; unread: number }> => {
      return this.http.get<{ total: number; unread: number }>('/notifications/stats')
    },

    create: async (data: CreateNotificationDto): Promise<NotificationWithDetails> => {
      return this.http.post<NotificationWithDetails>('/notifications', data)
    },

    update: async (id: string, data: UpdateNotificationDto): Promise<NotificationWithDetails> => {
      return this.http.put<NotificationWithDetails>(`/notifications/${id}`, data)
    },

    markAsRead: async (id: string): Promise<NotificationWithDetails> => {
      return this.http.put<NotificationWithDetails>(`/notifications/${id}/mark-read`)
    },

    delete: async (id: string): Promise<{ message: string }> => {
      return this.http.delete<{ message: string }>(`/notifications/${id}`)
    },
  }

  // User endpoints
  users = {
    me: async (): Promise<UserProfileResponse> => {
      return this.http.get<UserProfileResponse>('/users/me')
    },

    updateProfile: async (data: UpdateUserProfileDto): Promise<UserProfileResponse> => {
      return this.http.put<UserProfileResponse>('/users/me', data)
    },
  }

  // Health check
  health = {
    check: async (): Promise<{ status: string; timestamp: string }> => {
      return this.http.get<{ status: string; timestamp: string }>('/health')
    },
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

// Create and export a default instance
export const apiClient = new ApiClient()

export { TokenManager }