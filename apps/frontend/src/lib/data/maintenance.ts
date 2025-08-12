import { cache } from 'react';
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api-client';
import { notFound } from 'next/navigation';
import type { MaintenanceRequest, MaintenanceQuery } from '@repo/shared';

// Cached data fetchers for Server Components
export const getMaintenanceRequests = cache(async (query?: MaintenanceQuery): Promise<MaintenanceRequest[]> => {
  try {
    const response = await apiClient.get('/maintenance', { params: query });
    
    if (!response.success) {
      logger.error('Failed to fetch maintenance requests:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UmaintenanceData' });
      return [];
    }

    return (response.data as MaintenanceRequest[]) || [];
  } catch (error) {
    logger.error('Get maintenance requests error:', error instanceof Error ? error : new Error(String(error)), { component: 'UmaintenanceData' });
    return [];
  }
});

export const getMaintenanceRequest = cache(async (maintenanceId: string): Promise<MaintenanceRequest> => {
  try {
    const response = await apiClient.get(`/maintenance/${maintenanceId}`);
    
    if (!response.success) {
      logger.error('Failed to fetch maintenance request:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UmaintenanceData' });
      notFound();
    }

    return response.data as MaintenanceRequest;
  } catch (error) {
    logger.error('Get maintenance request error:', error instanceof Error ? error : new Error(String(error)), { component: 'UmaintenanceData' });
    notFound();
  }
});

export const getOpenMaintenanceRequests = cache(async (): Promise<MaintenanceRequest[]> => {
  try {
    const response = await apiClient.get('/maintenance', { 
      params: { status: 'open' } 
    });
    
    if (!response.success) {
      logger.error('Failed to fetch open maintenance requests:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UmaintenanceData' });
      return [];
    }

    return (response.data as MaintenanceRequest[]) || [];
  } catch (error) {
    logger.error('Get open maintenance requests error:', error instanceof Error ? error : new Error(String(error)), { component: 'UmaintenanceData' });
    return [];
  }
});

export const getUrgentMaintenanceRequests = cache(async (): Promise<MaintenanceRequest[]> => {
  try {
    const response = await apiClient.get('/maintenance', { 
      params: { priority: 'urgent' } 
    });
    
    if (!response.success) {
      logger.error('Failed to fetch urgent maintenance requests:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UmaintenanceData' });
      return [];
    }

    return (response.data as MaintenanceRequest[]) || [];
  } catch (error) {
    logger.error('Get urgent maintenance requests error:', error instanceof Error ? error : new Error(String(error)), { component: 'UmaintenanceData' });
    return [];
  }
});

export const getMaintenanceByProperty = cache(async (propertyId: string): Promise<MaintenanceRequest[]> => {
  try {
    const response = await apiClient.get('/maintenance', { 
      params: { propertyId } 
    });
    
    if (!response.success) {
      logger.error('Failed to fetch maintenance by property:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UmaintenanceData' });
      return [];
    }

    return (response.data as MaintenanceRequest[]) || [];
  } catch (error) {
    logger.error('Get maintenance by property error:', error instanceof Error ? error : new Error(String(error)), { component: 'UmaintenanceData' });
    return [];
  }
});

export const getMaintenanceByTenant = cache(async (tenantId: string): Promise<MaintenanceRequest[]> => {
  try {
    const response = await apiClient.get('/maintenance', { 
      params: { tenantId } 
    });
    
    if (!response.success) {
      logger.error('Failed to fetch maintenance by tenant:', response.message instanceof Error ? response.message : new Error(String(response.message)), { component: 'UmaintenanceData' });
      return [];
    }

    return (response.data as MaintenanceRequest[]) || [];
  } catch (error) {
    logger.error('Get maintenance by tenant error:', error instanceof Error ? error : new Error(String(error)), { component: 'UmaintenanceData' });
    return [];
  }
});