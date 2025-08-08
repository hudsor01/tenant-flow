/**
 * Maintenance Management hook
 * Provides maintenance request data and actions using Jotai queries
 * Migrated from Vite/TanStack Router backup
 */
import { useState } from 'react';
import { useCallback } from 'react';
import { useAtom, atom } from 'jotai';
import { toast } from 'sonner';
import { apiClient } from '../lib/api-client';
import type { CreateMaintenanceInput, UpdateMaintenanceInput, MaintenanceQuery, MaintenanceRequest, AppError, RequestStatus } from '@repo/shared';

// Mock atoms for now - will be created when needed
interface MaintenanceAtomData {
  data: MaintenanceRequest[];
  isLoading: boolean;
  error: AppError | null;
  refetch: () => void;
}

// Create proper Jotai atoms
const maintenanceAtom = atom<MaintenanceAtomData>({ data: [], isLoading: false, error: null, refetch: () => {} });
const selectedMaintenanceAtom = atom<MaintenanceRequest | null>(null);

export function useMaintenance() {
  const [maintenanceQuery] = useAtom(maintenanceAtom);
  const [selectedMaintenance, setSelectedMaintenance] = useAtom(selectedMaintenanceAtom);

  // Get all maintenance requests
  const getMaintenanceRequests = useCallback(async (params?: MaintenanceQuery) => {
    try {
      const response = await apiClient.get('/maintenance', { params });
      return { success: true, data: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch maintenance requests';
      return { success: false, error: message };
    }
  }, []);

  // Get single maintenance request
  const getMaintenanceRequest = useCallback(async (id: string) => {
    try {
      const response = await apiClient.get(`/maintenance/${id}`);
      return { success: true, data: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch maintenance request';
      return { success: false, error: message };
    }
  }, []);

  // Create maintenance request
  const createMaintenanceRequest = useCallback(async (data: CreateMaintenanceInput) => {
    try {
      const response = await apiClient.post('/maintenance', data as unknown as Record<string, unknown>);
      
      // Refetch maintenance requests to update the list
      maintenanceQuery.refetch?.();
      
      toast.success('Maintenance request created successfully');
      return { success: true, data: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create maintenance request';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [maintenanceQuery]);

  // Update maintenance request
  const updateMaintenanceRequest = useCallback(async (id: string, data: UpdateMaintenanceInput) => {
    try {
      const response = await apiClient.put(`/maintenance/${id}`, data as unknown as Record<string, unknown>);
      
      // Refetch maintenance requests to update the list
      maintenanceQuery.refetch?.();
      
      // Update selected maintenance request if it's the one being updated
      if (selectedMaintenance?.id === id) {
        setSelectedMaintenance({ ...selectedMaintenance, ...(response.data as Partial<MaintenanceRequest>) });
      }
      
      toast.success('Maintenance request updated successfully');
      return { success: true, data: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update maintenance request';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [maintenanceQuery, selectedMaintenance, setSelectedMaintenance]);

  // Delete maintenance request
  const deleteMaintenanceRequest = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/maintenance/${id}`);
      
      // Refetch maintenance requests to update the list
      maintenanceQuery.refetch?.();
      
      // Clear selected maintenance request if it's the one being deleted
      if (selectedMaintenance?.id === id) {
        setSelectedMaintenance(null);
      }
      
      toast.success('Maintenance request deleted successfully');
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete maintenance request';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [maintenanceQuery, selectedMaintenance, setSelectedMaintenance]);

  // Update maintenance status
  const updateMaintenanceStatus = useCallback(async (id: string, status: RequestStatus) => {
    try {
      const response = await apiClient.patch(`/maintenance/${id}/status`, { status });
      
      // Refetch maintenance requests to update the list
      maintenanceQuery.refetch?.();
      
      // Update selected maintenance request if it's the one being updated
      if (selectedMaintenance?.id === id) {
        setSelectedMaintenance({ ...selectedMaintenance, status: status });
      }
      
      toast.success(`Maintenance request ${status.toLowerCase()}`);
      return { success: true, data: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update maintenance status';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [maintenanceQuery, selectedMaintenance, setSelectedMaintenance]);

  // Get maintenance alerts
  const getMaintenanceAlerts = useCallback(async () => {
    try {
      const response = await apiClient.get('/maintenance/alerts');
      return { success: true, data: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch maintenance alerts';
      return { success: false, error: message };
    }
  }, []);

  // Upload maintenance photos
  const uploadMaintenancePhotos = useCallback(async (id: string, files: File[]) => {
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`photos[${index}]`, file);
      });

      const response = await apiClient.post(`/maintenance/${id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Photos uploaded successfully');
      return { success: true, data: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload photos';
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  return {
    maintenanceRequests: maintenanceQuery.data || [],
    selectedMaintenance,

    isLoading: maintenanceQuery.isLoading,
    isError: maintenanceQuery.error,
    error: maintenanceQuery.error,

    getMaintenanceRequests,
    getMaintenanceRequest,
    createMaintenanceRequest,
    updateMaintenanceRequest,
    deleteMaintenanceRequest,
    updateMaintenanceStatus,
    getMaintenanceAlerts,
    uploadMaintenancePhotos,
    setSelectedMaintenance,
    refetch: maintenanceQuery.refetch,
  };
}

export function useCreateMaintenanceRequest() {
  const { createMaintenanceRequest } = useMaintenance();
  const [isPending, setIsPending] = useState(false);

  return {
    mutateAsync: async (data: CreateMaintenanceInput) => {
      setIsPending(true);
      try {
        const result = await createMaintenanceRequest(data);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.data;
      } finally {
        setIsPending(false);
      }
    },
    isPending,
  };
}
