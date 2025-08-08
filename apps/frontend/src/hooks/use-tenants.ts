/**
 * Tenants hook
 * Provides tenants data and actions using Jotai queries
 */
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { toast } from 'sonner';
import {
  tenantsQueryAtom,
  selectedTenantAtom,
  tenantFiltersAtom,
} from '../atoms/business/tenants';
import { TenantsApi } from '../lib/api/tenants';
import type { CreateTenantInput, UpdateTenantInput } from '@repo/shared';

export function useTenants() {
  const [tenantsQuery] = useAtom(tenantsQueryAtom);
  const [selectedTenant, setSelectedTenant] = useAtom(selectedTenantAtom);
  const [filters, setFilters] = useAtom(tenantFiltersAtom);

  // Create tenant
  const createTenant = useCallback(async (data: CreateTenantInput) => {
    try {
      const tenant = await TenantsApi.createTenant(data);
      
      // Invalidate query to refetch data
      tenantsQuery.refetch?.();
      
      toast.success('Tenant created successfully');
      return { success: true, data: tenant };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create tenant';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [tenantsQuery]);

  // Update tenant
  const updateTenant = useCallback(async (id: string, data: UpdateTenantInput) => {
    try {
      const tenant = await TenantsApi.updateTenant(id, data);
      
      // Invalidate query to refetch data
      tenantsQuery.refetch?.();
      
      // Update selected tenant if it's the one being updated
      if (selectedTenant?.id === id) {
        setSelectedTenant({ ...selectedTenant, ...tenant });
      }
      
      toast.success('Tenant updated successfully');
      return { success: true, data: tenant };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update tenant';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [tenantsQuery, selectedTenant, setSelectedTenant]);

  // Delete tenant
  const deleteTenant = useCallback(async (id: string) => {
    try {
      await TenantsApi.deleteTenant(id);
      
      // Invalidate query to refetch data
      tenantsQuery.refetch?.();
      
      // Clear selected tenant if it's the one being deleted
      if (selectedTenant?.id === id) {
        setSelectedTenant(null);
      }
      
      toast.success('Tenant deleted successfully');
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete tenant';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [tenantsQuery, selectedTenant, setSelectedTenant]);

  // Get single tenant
  const getTenant = useCallback(async (id: string) => {
    try {
      const tenant = await TenantsApi.getTenant(id);
      return { success: true, data: tenant };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch tenant';
      return { success: false, error: message };
    }
  }, []);

  return {
    // Data
    tenants: tenantsQuery.data || [],
    selectedTenant,
    filters,
    
    // Loading states
    isLoading: tenantsQuery.isLoading,
    isFetching: tenantsQuery.isFetching,
    isError: tenantsQuery.isError,
    error: tenantsQuery.error,
    
    // Actions
    createTenant,
    updateTenant,
    deleteTenant,
    getTenant,
    setSelectedTenant,
    setFilters,
    refetch: tenantsQuery.refetch,
  };
}