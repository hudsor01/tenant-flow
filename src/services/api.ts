// Unified API Service Layer
// Centralized handling of all API calls with proper error handling and types

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// Base API configuration
const API_BASE_URL = import.meta.env.PROD ? 'https://tenantflow.app' : '';

// API Response Types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface SubscriptionCreateRequest {
  planId: string;
  billingPeriod: 'monthly' | 'annual';
  userId?: string | null;
  userEmail: string;
  userName: string;
  createAccount?: boolean;
}

export interface SubscriptionCreateResponse {
  clientSecret: string;
  subscriptionId: string;
  customerId: string;
  status: string;
}

export interface CustomerPortalRequest {
  customerId: string;
  returnUrl?: string;
}

export interface CustomerPortalResponse {
  url: string;
}

export interface StripeSubscription {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  customer: string;
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        unit_amount: number;
        currency: string;
        recurring: {
          interval: string;
        };
      };
    }>;
  };
}

// Generic API call function with proper error handling
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    // Default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    // Add auth headers - use session token if available, otherwise use anon key
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      defaultHeaders['Authorization'] = `Bearer ${session.access_token}`;
    } else {
      // For unauthenticated requests (e.g., during signup), use anon key
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (anonKey) {
        defaultHeaders['Authorization'] = `Bearer ${anonKey}`;
      }
    }

    // Use full URL if endpoint starts with http, otherwise use API_BASE_URL
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If not JSON, use the raw text
        errorMessage = errorText || errorMessage;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    logger.error(`API call failed for ${endpoint}`, error as Error, { endpoint, options });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Subscription API Service
export const subscriptionApi = {
  // Create subscription with payment setup
  async createSubscription(
    request: SubscriptionCreateRequest
  ): Promise<ApiResponse<SubscriptionCreateResponse>> {
    logger.apiCall('POST', '/api/create-subscription', { planId: request.planId, billingPeriod: request.billingPeriod });
    
    // Call Supabase Edge Function directly
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL is not configured');
    }
    
    const functionUrl = `${supabaseUrl}/functions/v1/create-subscription`;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    return apiCall<SubscriptionCreateResponse>(functionUrl, {
      method: 'POST',
      body: JSON.stringify(request),
      headers: {
        'apikey': anonKey,
      },
    });
  },

  // Create customer portal session
  async createPortalSession(
    request: CustomerPortalRequest
  ): Promise<ApiResponse<CustomerPortalResponse>> {
    logger.apiCall('POST', '/api/create-portal-session', { customerId: request.customerId });
    
    return apiCall<CustomerPortalResponse>('/api/create-portal-session', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // Cancel subscription
  async cancelSubscription(subscriptionId: string): Promise<ApiResponse<{ status: string }>> {
    logger.apiCall('POST', '/api/cancel-subscription', { subscriptionId });
    
    return apiCall<{ status: string }>('/api/cancel-subscription', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId }),
    });
  },

  // Update subscription (change plan, billing period, etc.)
  async updateSubscription(
    subscriptionId: string,
    updates: { planId?: string; billingPeriod?: 'monthly' | 'annual' }
  ): Promise<ApiResponse<{ subscription: StripeSubscription }>> {
    logger.apiCall('POST', '/api/update-subscription', { subscriptionId, updates });
    
    return apiCall<{ subscription: StripeSubscription }>('/api/update-subscription', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId, ...updates }),
    });
  },
};

// Generic API service for other endpoints
export const api = {
  // Generic GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return apiCall<T>(endpoint, { method: 'GET' });
  },

  // Generic POST request
  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return apiCall<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  // Generic PUT request
  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return apiCall<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  // Generic DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return apiCall<T>(endpoint, { method: 'DELETE' });
  },
};

// Error handling utilities
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper function to throw ApiError from response
export function throwIfError<T>(response: ApiResponse<T>): asserts response is ApiResponse<T> & { success: true; data: T } {
  if (!response.success) {
    throw new ApiError(response.error || 'API request failed');
  }
}

// Configuration validation
export function validateApiConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    errors.push('VITE_STRIPE_PUBLISHABLE_KEY is not configured');
  }
  
  if (!import.meta.env.VITE_SUPABASE_URL) {
    errors.push('VITE_SUPABASE_URL is not configured');
  }
  
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    errors.push('VITE_SUPABASE_ANON_KEY is not configured');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Log API configuration status in development
if (import.meta.env.DEV) {
  const { isValid, errors } = validateApiConfig();
  if (isValid) {
    logger.info('API configuration is valid');
  } else {
    logger.warn('API configuration issues detected', { errors });
  }
}