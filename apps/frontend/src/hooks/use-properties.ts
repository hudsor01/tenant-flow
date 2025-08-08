/**
 * Properties hook
 * Provides properties data and actions using Jotai queries
 */
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { toast } from 'sonner';
import {
  propertiesQueryAtom,
  propertyStatsQueryAtom,
  selectedPropertyAtom,
  propertyFiltersAtom,
} from '../atoms/business/properties';
import { PropertiesApi } from '../lib/api/properties';
import type { CreatePropertyInput, UpdatePropertyInput } from '@repo/shared';

export function useProperties() {
  const [propertiesQuery] = useAtom(propertiesQueryAtom);
  const [propertyStatsQuery] = useAtom(propertyStatsQueryAtom);
  const [selectedProperty, setSelectedProperty] = useAtom(selectedPropertyAtom);
  const [filters, setFilters] = useAtom(propertyFiltersAtom);

  // Create property
  const createProperty = useCallback(async (data: CreatePropertyInput) => {
    try {
      const property = await PropertiesApi.createProperty(data);
      
      // Invalidate queries to refetch data
      propertiesQuery.refetch?.();
      propertyStatsQuery.refetch?.();
      
      toast.success('Property created successfully');
      return { success: true, data: property };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create property';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [propertiesQuery, propertyStatsQuery]);

  // Update property
  const updateProperty = useCallback(async (id: string, data: UpdatePropertyInput) => {
    try {
      const property = await PropertiesApi.updateProperty(id, data);
      
      // Invalidate queries to refetch data
      propertiesQuery.refetch?.();
      propertyStatsQuery.refetch?.();
      
      // Update selected property if it's the one being updated
      if (selectedProperty?.id === id) {
        setSelectedProperty({ ...selectedProperty, ...property });
      }
      
      toast.success('Property updated successfully');
      return { success: true, data: property };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update property';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [propertiesQuery, propertyStatsQuery, selectedProperty, setSelectedProperty]);

  // Delete property
  const deleteProperty = useCallback(async (id: string) => {
    try {
      await PropertiesApi.deleteProperty(id);
      
      // Invalidate queries to refetch data
      propertiesQuery.refetch?.();
      propertyStatsQuery.refetch?.();
      
      // Clear selected property if it's the one being deleted
      if (selectedProperty?.id === id) {
        setSelectedProperty(null);
      }
      
      toast.success('Property deleted successfully');
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete property';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [propertiesQuery, propertyStatsQuery, selectedProperty, setSelectedProperty]);

  // Get single property
  const getProperty = useCallback(async (id: string) => {
    try {
      const property = await PropertiesApi.getProperty(id);
      return { success: true, data: property };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch property';
      return { success: false, error: message };
    }
  }, []);

  return {
    // Data
    properties: propertiesQuery.data || [],
    stats: propertyStatsQuery.data || null,
    selectedProperty,
    filters,
    
    // Loading states
    isLoading: propertiesQuery.isLoading,
    isLoadingStats: propertyStatsQuery.isLoading,
    isFetching: propertiesQuery.isFetching,
    isError: propertiesQuery.isError || propertyStatsQuery.isError,
    error: propertiesQuery.error || propertyStatsQuery.error,
    
    // Actions
    createProperty,
    updateProperty,
    deleteProperty,
    getProperty,
    setSelectedProperty,
    setFilters,
    refetch: propertiesQuery.refetch,
    refetchStats: propertyStatsQuery.refetch,
  };
}