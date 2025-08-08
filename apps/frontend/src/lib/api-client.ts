/**
 * Simplified API Client for TenantFlow Backend
 * Basic implementation for build compatibility
 */
import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import { config } from './config';
import { getSession } from './supabase';

export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  timestamp?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

class ApiClient {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.api.baseURL,
      timeout: config.api.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true,
      validateStatus: (status) => status < 500,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const { session } = await getSession();
          if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
          }
        } catch (error) {
          console.warn('[API] Failed to add authentication:', error);
        }
        return config;
      },
      (error) => {
        // Ensure the rejection reason is always an Error
        if (error instanceof Error) {
          return Promise.reject(error);
        }
        return Promise.reject(new Error(typeof error === 'string' ? error : JSON.stringify(error)));
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle authentication errors
          console.warn('[API] Authentication error - redirecting to login');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    data?: Record<string, unknown> | FormData,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await this.client.request({
        method,
        url,
        data,
        ...config,
      });

      return {
        data: response.data,
        success: response.status >= 200 && response.status < 300,
        message: response.data?.message,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const responseData = axiosError.response?.data as Record<string, unknown> | undefined;
      
      const apiError: ApiError = {
        message: (responseData?.message as string) || axiosError.message || 'Request failed',
        code: (responseData?.code as string) || axiosError.code,
        details: responseData?.details as Record<string, unknown> || responseData,
        timestamp: new Date().toISOString(),
      };

      throw apiError;
    }
  }

  // HTTP Methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('GET', url, undefined, config);
  }

  async post<T>(url: string, data?: Record<string, unknown> | FormData, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('POST', url, data, config);
  }

  async put<T>(url: string, data?: Record<string, unknown> | FormData, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PUT', url, data, config);
  }

  async patch<T>(url: string, data?: Record<string, unknown> | FormData, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PATCH', url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('DELETE', url, undefined, config);
  }

  // Health check method
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.get<{ status: string; timestamp: string }>('/health');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
