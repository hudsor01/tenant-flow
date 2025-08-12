import { cache } from 'react';
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api-client';
import { notFound } from 'next/navigation';
import type { Property, PropertyQuery } from '@repo/shared';

// Cached data fetchers for Server Components
export const getProperties = cache(async (query?: PropertyQuery): Promise<Property[]> => {
  try {
    const response = await apiClient.get('/properties', { params: query });
    
    if (!response.success) {
      logger.error('Failed to fetch properties:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UpropertiesData' });
      return [];
    }

    return (response.data as Property[]) || [];
  } catch (error) {
    logger.error('Get properties error:', error instanceof Error ? error : new Error(String(error)), { component: 'UpropertiesData' });
    return [];
  }
});

export const getProperty = cache(async (propertyId: string): Promise<Property> => {
  try {
    const response = await apiClient.get(`/properties/${propertyId}`);
    
    if (!response.success) {
      logger.error('Failed to fetch property:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UpropertiesData' });
      notFound();
    }

    return response.data as Property;
  } catch (error) {
    logger.error('Get property error:', error instanceof Error ? error : new Error(String(error)), { component: 'UpropertiesData' });
    notFound();
  }
});

export const getPropertyStats = cache(async () => {
  try {
    const response = await apiClient.get('/properties/stats');
    
    if (!response.success) {
      logger.error('Failed to fetch property stats:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UpropertiesData' });
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
    logger.error('Get property stats error:', error instanceof Error ? error : new Error(String(error)), { component: 'UpropertiesData' });
    return null;
  }
});

export const getPropertyUnits = cache(async (propertyId: string) => {
  try {
    const response = await apiClient.get(`/properties/${propertyId}/units`);
    
    if (!response.success) {
      logger.error('Failed to fetch property units:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UpropertiesData' });
      return [];
    }

    return (response.data as unknown[]) || [];
  } catch (error) {
    logger.error('Get property units error:', error instanceof Error ? error : new Error(String(error)), { component: 'UpropertiesData' });
    return [];
  }
});

export const getPropertyTenants = cache(async (propertyId: string) => {
  try {
    const response = await apiClient.get(`/properties/${propertyId}/tenants`);
    
    if (!response.success) {
      logger.error('Failed to fetch property tenants:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UpropertiesData' });
      return [];
    }

    return (response.data as unknown[]) || [];
  } catch (error) {
    logger.error('Get property tenants error:', error instanceof Error ? error : new Error(String(error)), { component: 'UpropertiesData' });
    return [];
  }
});

export const getPropertyLeases = cache(async (propertyId: string) => {
  try {
    const response = await apiClient.get(`/properties/${propertyId}/leases`);
    
    if (!response.success) {
      logger.error('Failed to fetch property leases:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UpropertiesData' });
      return [];
    }

    return (response.data as unknown[]) || [];
  } catch (error) {
    logger.error('Get property leases error:', error instanceof Error ? error : new Error(String(error)), { component: 'UpropertiesData' });
    return [];
  }
});

export const getPropertyMaintenance = cache(async (propertyId: string) => {
  try {
    const response = await apiClient.get(`/properties/${propertyId}/maintenance`);
    
    if (!response.success) {
      logger.error('Failed to fetch property maintenance:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UpropertiesData' });
      return [];
    }

    return (response.data as unknown[]) || [];
  } catch (error) {
    logger.error('Get property maintenance error:', error instanceof Error ? error : new Error(String(error)), { component: 'UpropertiesData' });
    return [];
  }
});