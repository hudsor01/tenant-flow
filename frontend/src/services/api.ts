// Unified API Service Layer
// Centralized handling of all API calls with proper error handling and types

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { CustomerInvoice } from '@/types/invoice';
import type { 
  Property, 
  Unit, 
  Lease, 
  Tenant, 
  Payment, 
  MaintenanceRequest,
  UnitStatus,
  PaymentType,
  LeaseStatus,
  MaintenanceStatus,
  MaintenancePriority
} from '@/types/entities';

// Base API configuration for production
const API_BASE_URL = 'https://tenantflow.app';
const NESTJS_API_URL = 'https://api.tenantflow.app/api/v1';

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

// Core Entity DTOs
export interface CreatePropertyDto {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  description?: string;
  propertyType?: string;
}

export interface UpdatePropertyDto {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  description?: string;
  propertyType?: string;
}

export interface CreateUnitDto {
  unitNumber: string;
  propertyId: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  rent: number;
  status?: UnitStatus;
}

export interface UpdateUnitDto {
  unitNumber?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  rent?: number;
  status?: UnitStatus;
  lastInspectionDate?: string;
}

export interface CreateLeaseDto {
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  securityDeposit: number;
  status?: LeaseStatus;
}

export interface UpdateLeaseDto {
  startDate?: string;
  endDate?: string;
  rentAmount?: number;
  securityDeposit?: number;
  status?: LeaseStatus;
}

export interface CreateTenantDto {
  name: string;
  email: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export interface UpdateTenantDto {
  name?: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export interface CreatePaymentDto {
  leaseId: string;
  amount: number;
  paymentDate: string;
  type: PaymentType;
  status?: string;
  notes?: string;
}

export interface UpdatePaymentDto {
  amount?: number;
  paymentDate?: string;
  type?: PaymentType;
  status?: string;
  notes?: string;
}

export interface CreateMaintenanceRequestDto {
  unitId: string;
  title: string;
  description: string;
  priority?: MaintenancePriority;
  status?: MaintenanceStatus;
}

export interface UpdateMaintenanceRequestDto {
  title?: string;
  description?: string;
  priority?: MaintenancePriority;
  status?: MaintenanceStatus;
}

// Generic API call function with proper error handling
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  useNestJS = false
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

    // Choose base URL based on API type
    const baseUrl = useNestJS ? NESTJS_API_URL : API_BASE_URL;
    
    // Use full URL if endpoint starts with http, otherwise use appropriate base URL
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
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

// Core Entity API Services
export const propertiesApi = {
  async getProperties(): Promise<ApiResponse<Property[]>> {
    return apiCall<Property[]>('/properties', { method: 'GET' }, true);
  },

  async getProperty(id: string): Promise<ApiResponse<Property>> {
    return apiCall<Property>(`/properties/${id}`, { method: 'GET' }, true);
  },

  async getPropertyStats(): Promise<ApiResponse<{ totalProperties: number; totalUnits: number; occupiedUnits: number; vacantUnits: number }>> {
    return apiCall(`/properties/stats`, { method: 'GET' }, true);
  },

  async createProperty(data: CreatePropertyDto): Promise<ApiResponse<Property>> {
    return apiCall<Property>('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  async updateProperty(id: string, data: UpdatePropertyDto): Promise<ApiResponse<Property>> {
    return apiCall<Property>(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },

  async deleteProperty(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiCall(`/properties/${id}`, { method: 'DELETE' }, true);
  },
};

export const unitsApi = {
  async getUnits(propertyId?: string): Promise<ApiResponse<Unit[]>> {
    const endpoint = propertyId ? `/units?propertyId=${propertyId}` : '/units';
    return apiCall<Unit[]>(endpoint, { method: 'GET' }, true);
  },

  async getUnit(id: string): Promise<ApiResponse<Unit>> {
    return apiCall<Unit>(`/units/${id}`, { method: 'GET' }, true);
  },

  async getUnitStats(): Promise<ApiResponse<{ totalUnits: number; occupied: number; vacant: number; maintenance: number }>> {
    return apiCall(`/units/stats`, { method: 'GET' }, true);
  },

  async createUnit(data: CreateUnitDto): Promise<ApiResponse<Unit>> {
    return apiCall<Unit>('/units', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  async updateUnit(id: string, data: UpdateUnitDto): Promise<ApiResponse<Unit>> {
    return apiCall<Unit>(`/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },

  async deleteUnit(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiCall(`/units/${id}`, { method: 'DELETE' }, true);
  },
};

export const leasesApi = {
  async getLeases(): Promise<ApiResponse<Lease[]>> {
    return apiCall<Lease[]>('/leases', { method: 'GET' }, true);
  },

  async getLease(id: string): Promise<ApiResponse<Lease>> {
    return apiCall<Lease>(`/leases/${id}`, { method: 'GET' }, true);
  },

  async getLeaseStats(): Promise<ApiResponse<{ totalLeases: number; activeLeases: number; expiredLeases: number; terminatedLeases: number }>> {
    return apiCall(`/leases/stats`, { method: 'GET' }, true);
  },

  async getExpiringLeases(days = 30): Promise<ApiResponse<Lease[]>> {
    return apiCall<Lease[]>(`/leases/expiring?days=${days}`, { method: 'GET' }, true);
  },

  async createLease(data: CreateLeaseDto): Promise<ApiResponse<Lease>> {
    return apiCall<Lease>('/leases', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  async updateLease(id: string, data: UpdateLeaseDto): Promise<ApiResponse<Lease>> {
    return apiCall<Lease>(`/leases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },

  async deleteLease(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiCall(`/leases/${id}`, { method: 'DELETE' }, true);
  },
};

export const tenantsApi = {
  async getTenants(): Promise<ApiResponse<Tenant[]>> {
    return apiCall<Tenant[]>('/tenants', { method: 'GET' }, true);
  },

  async getTenant(id: string): Promise<ApiResponse<Tenant>> {
    return apiCall<Tenant>(`/tenants/${id}`, { method: 'GET' }, true);
  },

  async createTenant(data: CreateTenantDto): Promise<ApiResponse<Tenant>> {
    return apiCall<Tenant>('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  async updateTenant(id: string, data: UpdateTenantDto): Promise<ApiResponse<Tenant>> {
    return apiCall<Tenant>(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },

  async deleteTenant(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiCall(`/tenants/${id}`, { method: 'DELETE' }, true);
  },
};

export const paymentsApi = {
  async getPayments(leaseId?: string): Promise<ApiResponse<Payment[]>> {
    const endpoint = leaseId ? `/payments?leaseId=${leaseId}` : '/payments';
    return apiCall<Payment[]>(endpoint, { method: 'GET' }, true);
  },

  async getPayment(id: string): Promise<ApiResponse<Payment>> {
    return apiCall<Payment>(`/payments/${id}`, { method: 'GET' }, true);
  },

  async createPayment(data: CreatePaymentDto): Promise<ApiResponse<Payment>> {
    return apiCall<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  async updatePayment(id: string, data: UpdatePaymentDto): Promise<ApiResponse<Payment>> {
    return apiCall<Payment>(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },

  async deletePayment(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiCall(`/payments/${id}`, { method: 'DELETE' }, true);
  },
};

export const maintenanceApi = {
  async getMaintenanceRequests(): Promise<ApiResponse<MaintenanceRequest[]>> {
    return apiCall<MaintenanceRequest[]>('/maintenance-requests', { method: 'GET' }, true);
  },

  async getMaintenanceRequest(id: string): Promise<ApiResponse<MaintenanceRequest>> {
    return apiCall<MaintenanceRequest>(`/maintenance-requests/${id}`, { method: 'GET' }, true);
  },

  async createMaintenanceRequest(data: CreateMaintenanceRequestDto): Promise<ApiResponse<MaintenanceRequest>> {
    return apiCall<MaintenanceRequest>('/maintenance-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  async updateMaintenanceRequest(id: string, data: UpdateMaintenanceRequestDto): Promise<ApiResponse<MaintenanceRequest>> {
    return apiCall<MaintenanceRequest>(`/maintenance-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },

  async deleteMaintenanceRequest(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiCall(`/maintenance-requests/${id}`, { method: 'DELETE' }, true);
  },
};

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
  async get<T>(endpoint: string, useNestJS = false): Promise<ApiResponse<T>> {
    return apiCall<T>(endpoint, { method: 'GET' }, useNestJS);
  },

  // Generic POST request
  async post<T>(endpoint: string, data?: unknown, useNestJS = false): Promise<ApiResponse<T>> {
    return apiCall<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, useNestJS);
  },

  // Generic PUT request
  async put<T>(endpoint: string, data?: unknown, useNestJS = false): Promise<ApiResponse<T>> {
    return apiCall<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, useNestJS);
  },

  // Generic DELETE request
  async delete<T>(endpoint: string, useNestJS = false): Promise<ApiResponse<T>> {
    return apiCall<T>(endpoint, { method: 'DELETE' }, useNestJS);
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

// Enhanced Invoice API Types and Methods
export interface CustomerInvoiceRequest {
  invoice: {
    businessName: string;
    businessEmail: string;
    businessAddress?: string;
    businessCity?: string;
    businessState?: string;
    businessZip?: string;
    businessPhone?: string;
    clientName: string;
    clientEmail: string;
    clientAddress?: string;
    clientCity?: string;
    clientState?: string;
    clientZip?: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
    }>;
    taxRate: number;
    notes?: string;
    terms?: string;
  };
  emailCapture?: {
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    source?: string;
  };
  userTier: 'FREE_TIER' | 'PRO_TIER';
}

export interface CustomerInvoiceResponse {
  id: string;
  invoiceNumber: string;
  downloadUrl: string;
  status: string;
  total: number;
}

export interface EmailCaptureRequest {
  email: string;
  invoiceId: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  source?: string;
}

// Customer Invoice API Methods
export const invoiceApi = {
  // Generate and download invoice
  async generateInvoice(request: CustomerInvoiceRequest): Promise<CustomerInvoiceResponse> {
    const response = await fetch(`${API_BASE_URL}/api/customer-invoices/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate invoice');
    }

    return response.json();
  },

  // Save invoice for authenticated users
  async saveInvoice(invoice: CustomerInvoice): Promise<CustomerInvoiceResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${API_BASE_URL}/api/customer-invoices`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
      },
      body: JSON.stringify(invoice),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save invoice');
    }

    return response.json();
  },

  // Get user's invoices
  async getInvoices(): Promise<CustomerInvoiceResponse[]> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/api/customer-invoices`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch invoices');
    }

    return response.json();
  },

  // Capture email for lead generation
  async captureEmail(request: EmailCaptureRequest): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/invoice-leads/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to capture email');
    }

    return response.json();
  },

  // Get usage stats for current user/session
  async getUsageStats(): Promise<{ monthlyUsage: number; tier: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${API_BASE_URL}/api/customer-invoices/usage`, {
        headers: session?.access_token ? {
          'Authorization': `Bearer ${session.access_token}`,
        } : {},
      });

      if (!response.ok) {
        // Default for unauthenticated users
        return { monthlyUsage: 0, tier: 'FREE_TIER' };
      }

      return response.json();
    } catch (error) {
      logger.warn('Failed to fetch usage stats', { error });
      return { monthlyUsage: 0, tier: 'FREE_TIER' };
    }
  },
};

// Log API configuration status in development
if (import.meta.env.DEV) {
  const { isValid, errors } = validateApiConfig();
  if (isValid) {
    logger.info('API configuration is valid');
  } else {
    logger.warn('API configuration issues detected', { errors });
  }
}