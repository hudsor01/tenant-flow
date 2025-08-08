/**
 * Lease Management hook
 * Provides lease data and actions using Jotai queries
 * Migrated from Vite/TanStack Router backup
 */
import { useCallback } from 'react';
import { useAtom, atom } from 'jotai';
import { toast } from 'sonner';
import { apiClient } from '../lib/api-client';
import type { CreateLeaseInput, UpdateLeaseInput, LeaseQuery, Lease, AppError } from '@repo/shared';

// Mock atoms for now - will be created when needed
interface LeasesAtomData {
  data: Lease[];
  isLoading: boolean;
  error: AppError | null;
  refetch: () => void;
}

// Create proper Jotai atoms
const leasesAtom = atom<LeasesAtomData>({ data: [], isLoading: false, error: null, refetch: () => {} });
const selectedLeaseAtom = atom<Lease | null>(null);

export function useLeaseManagement() {
  const [leasesQuery] = useAtom(leasesAtom);
  const [selectedLease, setSelectedLease] = useAtom(selectedLeaseAtom);

  // Get all leases
  const getLeases = useCallback(async (params?: LeaseQuery) => {
    try {
      const response = await apiClient.get('/leases', { params });
      return { success: true, data: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch leases';
      return { success: false, error: message };
    }
  }, []);

  // Get single lease
  const getLease = useCallback(async (id: string) => {
    try {
      const response = await apiClient.get(`/leases/${id}`);
      return { success: true, data: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch lease';
      return { success: false, error: message };
    }
  }, []);

  // Create lease
  const createLease = useCallback(async (data: CreateLeaseInput) => {
    try {
      const response = await apiClient.post('/leases', data as unknown as Record<string, unknown>);
      
      // Refetch leases to update the list
      leasesQuery.refetch?.();
      
      toast.success('Lease created successfully');
      return { success: true, data: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create lease';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [leasesQuery]);

  // Update lease
  const updateLease = useCallback(async (id: string, data: UpdateLeaseInput) => {
    try {
      const response = await apiClient.put(`/leases/${id}`, data as unknown as Record<string, unknown>);
      
      // Refetch leases to update the list
      leasesQuery.refetch?.();
      
      // Update selected lease if it's the one being updated
      if (selectedLease?.id === id) {
        setSelectedLease({ ...selectedLease, ...(response.data as Partial<Lease>) });
      }
      
      toast.success('Lease updated successfully');
      return { success: true, data: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update lease';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [leasesQuery, selectedLease, setSelectedLease]);

  // Delete lease
  const deleteLease = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/leases/${id}`);
      
      // Refetch leases to update the list
      leasesQuery.refetch?.();
      
      // Clear selected lease if it's the one being deleted
      if (selectedLease?.id === id) {
        setSelectedLease(null);
      }
      
      toast.success('Lease deleted successfully');
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete lease';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [leasesQuery, selectedLease, setSelectedLease]);

  // Generate lease document
  const generateLeaseDocument = useCallback(async (id: string) => {
    try {
      const response = await apiClient.post(`/leases/${id}/generate-document`);
      
      toast.success('Lease document generated successfully');
      return { success: true, data: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to generate lease document';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  // Get lease expiration alerts
  const getExpirationAlerts = useCallback(async (daysAhead = 30) => {
    try {
      const response = await apiClient.get('/leases/expiration-alerts', {
        params: { daysAhead }
      });
      return { success: true, data: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch expiration alerts';
      return { success: false, error: message };
    }
  }, []);

  return {
    // Data
    leases: leasesQuery.data || [],
    selectedLease,
    
    // Loading states
    isLoading: leasesQuery.isLoading,
    isError: leasesQuery.error,
    error: leasesQuery.error,
    
    // Actions
    getLeases,
    getLease,
    createLease,
    updateLease,
    deleteLease,
    generateLeaseDocument,
    getExpirationAlerts,
    setSelectedLease,
    refetch: leasesQuery.refetch,
  };
}