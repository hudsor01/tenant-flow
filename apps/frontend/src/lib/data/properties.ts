import { cache } from 'react';
import { apiClient } from '@/lib/api-client';
import { notFound } from 'next/navigation';
import type { Property, PropertyQuery } from '@repo/shared';

// Cached data fetchers for Server Components
export const getProperties = cache(async (query?: PropertyQuery): Promise<Property[]> => {
  try {
    const response = await apiClient.get('/properties', { params: query });
    
    if (!response.success) {
      console.error('Failed to fetch properties:', response.message);
      return [];
    }

    return (response.data as Property[]) || [];
  } catch (error) {
    console.error('Get properties error:', error);
    return [];
  }
});

export const getProperty = cache(async (propertyId: string): Promise<Property> => {
  try {
    const response = await apiClient.get(`/properties/${propertyId}`);
    
    if (!response.success) {
      console.error('Failed to fetch property:', response.message);
      notFound();
    }

    return response.data as Property;
  } catch (error) {
    console.error('Get property error:', error);
    notFound();
  }
});

export const getPropertyStats = cache(async () => {
  try {
    const response = await apiClient.get('/properties/stats');
    
    if (!response.success) {
      console.error('Failed to fetch property stats:', response.message);
      return null;
    }

    return response.data as {
      total: number;
      occupied: number;
      vacant: number;
      occupancyRate: number;
      totalMonthlyRent: number;
      averageRent: number;
    };
  } catch (error) {
    console.error('Get property stats error:', error);
    return null;
  }
});

export const getPropertyUnits = cache(async (propertyId: string) => {
  try {
    const response = await apiClient.get(`/properties/${propertyId}/units`);
    
    if (!response.success) {
      console.error('Failed to fetch property units:', response.message);
      return [];
    }

    return (response.data as unknown[]) || [];
  } catch (error) {
    console.error('Get property units error:', error);
    return [];
  }
});

export const getPropertyTenants = cache(async (propertyId: string) => {
  try {
    const response = await apiClient.get(`/properties/${propertyId}/tenants`);
    
    if (!response.success) {
      console.error('Failed to fetch property tenants:', response.message);
      return [];
    }

    return (response.data as unknown[]) || [];
  } catch (error) {
    console.error('Get property tenants error:', error);
    return [];
  }
});

export const getPropertyLeases = cache(async (propertyId: string) => {
  try {
    const response = await apiClient.get(`/properties/${propertyId}/leases`);
    
    if (!response.success) {
      console.error('Failed to fetch property leases:', response.message);
      return [];
    }

    return (response.data as unknown[]) || [];
  } catch (error) {
    console.error('Get property leases error:', error);
    return [];
  }
});

export const getPropertyMaintenance = cache(async (propertyId: string) => {
  try {
    const response = await apiClient.get(`/properties/${propertyId}/maintenance`);
    
    if (!response.success) {
      console.error('Failed to fetch property maintenance:', response.message);
      return [];
    }

    return (response.data as unknown[]) || [];
  } catch (error) {
    console.error('Get property maintenance error:', error);
    return [];
  }
});