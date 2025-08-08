import { cache } from 'react';
import { apiClient } from '@/lib/api-client';
import { notFound } from 'next/navigation';
import type { Tenant, TenantQuery } from '@repo/shared';

// Cached data fetchers for Server Components
export const getTenants = cache(async (query?: TenantQuery): Promise<Tenant[]> => {
  try {
    const response = await apiClient.get('/tenants', { params: query });
    
    if (!response.success) {
      console.error('Failed to fetch tenants:', response.message);
      return [];
    }

    return (response.data as Tenant[]) || [];
  } catch (error) {
    console.error('Get tenants error:', error);
    return [];
  }
});

export const getTenant = cache(async (tenantId: string): Promise<Tenant> => {
  try {
    const response = await apiClient.get(`/tenants/${tenantId}`);
    
    if (!response.success) {
      console.error('Failed to fetch tenant:', response.message);
      notFound();
    }

    return response.data as Tenant;
  } catch (error) {
    console.error('Get tenant error:', error);
    notFound();
  }
});

export const getTenantStats = cache(async () => {
  try {
    const response = await apiClient.get('/tenants/stats');
    
    if (!response.success) {
      console.error('Failed to fetch tenant stats:', response.message);
      return null;
    }

    return response.data as {
      total: number;
      active: number;
      inactive: number;
      pendingApplications: number;
    };
  } catch (error) {
    console.error('Get tenant stats error:', error);
    return null;
  }
});

export const getTenantLeases = cache(async (tenantId: string) => {
  try {
    const response = await apiClient.get(`/tenants/${tenantId}/leases`);
    
    if (!response.success) {
      console.error('Failed to fetch tenant leases:', response.message);
      return [];
    }

    return (response.data as unknown[]) || [];
  } catch (error) {
    console.error('Get tenant leases error:', error);
    return [];
  }
});

export const getTenantPayments = cache(async (tenantId: string) => {
  try {
    const response = await apiClient.get(`/tenants/${tenantId}/payments`);
    
    if (!response.success) {
      console.error('Failed to fetch tenant payments:', response.message);
      return [];
    }

    return (response.data as unknown[]) || [];
  } catch (error) {
    console.error('Get tenant payments error:', error);
    return [];
  }
});

export const getTenantMaintenance = cache(async (tenantId: string) => {
  try {
    const response = await apiClient.get(`/tenants/${tenantId}/maintenance`);
    
    if (!response.success) {
      console.error('Failed to fetch tenant maintenance:', response.message);
      return [];
    }

    return (response.data as unknown[]) || [];
  } catch (error) {
    console.error('Get tenant maintenance error:', error);
    return [];
  }
});

export const getTenantDocuments = cache(async (tenantId: string) => {
  try {
    const response = await apiClient.get(`/tenants/${tenantId}/documents`);
    
    if (!response.success) {
      console.error('Failed to fetch tenant documents:', response.message);
      return [];
    }

    return (response.data as unknown[]) || [];
  } catch (error) {
    console.error('Get tenant documents error:', error);
    return [];
  }
});