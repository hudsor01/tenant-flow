import { cache } from 'react';
import { apiClient } from '@/lib/api-client';
import { notFound } from 'next/navigation';
import type { Lease, LeaseQuery } from '@repo/shared';

// Cached data fetchers for Server Components
export const getLeases = cache(async (query?: LeaseQuery): Promise<Lease[]> => {
  try {
    const response = await apiClient.get('/leases', { params: query });
    
    if (!response.success) {
      console.error('Failed to fetch leases:', response.message);
      return [];
    }

    return (response.data as Lease[]) || [];
  } catch (error) {
    console.error('Get leases error:', error);
    return [];
  }
});

export const getLease = cache(async (leaseId: string): Promise<Lease> => {
  try {
    const response = await apiClient.get(`/leases/${leaseId}`);
    
    if (!response.success) {
      console.error('Failed to fetch lease:', response.message);
      notFound();
    }

    return response.data as Lease;
  } catch (error) {
    console.error('Get lease error:', error);
    notFound();
  }
});

export const getActiveLeases = cache(async (): Promise<Lease[]> => {
  try {
    const response = await apiClient.get('/leases', { 
      params: { status: 'active' } 
    });
    
    if (!response.success) {
      console.error('Failed to fetch active leases:', response.message);
      return [];
    }

    return (response.data as Lease[]) || [];
  } catch (error) {
    console.error('Get active leases error:', error);
    return [];
  }
});

export const getExpiringLeases = cache(async (days: number = 30): Promise<Lease[]> => {
  try {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    
    const response = await apiClient.get('/leases', { 
      params: { 
        status: 'active',
        endDateBefore: endDate.toISOString().split('T')[0]
      } 
    });
    
    if (!response.success) {
      console.error('Failed to fetch expiring leases:', response.message);
      return [];
    }

    return (response.data as Lease[]) || [];
  } catch (error) {
    console.error('Get expiring leases error:', error);
    return [];
  }
});

export const getLeaseDocuments = cache(async (leaseId: string) => {
  try {
    const response = await apiClient.get(`/leases/${leaseId}/documents`);
    
    if (!response.success) {
      console.error('Failed to fetch lease documents:', response.message);
      return [];
    }

    return (response.data as Lease[]) || [];
  } catch (error) {
    console.error('Get lease documents error:', error);
    return [];
  }
});