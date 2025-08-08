/**
 * Property Management Service Hooks
 * 
 * React hooks that integrate property management services with React state management.
 * Provides clean separation between UI and business logic.
 */

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { usePropertyService } from '@/services';
import type { Property, CreatePropertyInput, UpdatePropertyInput, Unit } from '@repo/shared';
import type { Result } from '@repo/shared';
import type { PropertyStats } from '@/services';
import { toast } from 'sonner';

export interface UsePropertiesReturn {
  // State
  properties: Property[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadProperties: (ownerId: string) => Promise<Result<Property[]>>;
  createProperty: (input: CreatePropertyInput, ownerId: string) => Promise<Result<Property>>;
  updateProperty: (id: string, input: UpdatePropertyInput) => Promise<Result<Property>>;
  deleteProperty: (id: string) => Promise<Result<void>>;
  uploadImage: (id: string, imageFile: File) => Promise<Result<{ url: string }>>;
  
  // Utilities
  clearError: () => void;
  validatePropertyData: (input: CreatePropertyInput | UpdatePropertyInput) => Result<void>;
}

export function useProperties(): UsePropertiesReturn {
  const propertyService = usePropertyService();
  
  const [state, setState] = useState<{
    properties: Property[];
    isLoading: boolean;
    error: string | null;
  }>({
    properties: [],
    isLoading: false,
    error: null,
  });

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading, error: null }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  };

  const setProperties = (properties: Property[]) => {
    setState(prev => ({ ...prev, properties, isLoading: false, error: null }));
  };

  const updatePropertyInState = (updatedProperty: Property) => {
    setState(prev => ({
      ...prev,
      properties: prev.properties.map(p => 
        p.id === updatedProperty.id ? updatedProperty : p
      ),
      isLoading: false,
      error: null,
    }));
  };

  const removePropertyFromState = (id: string) => {
    setState(prev => ({
      ...prev,
      properties: prev.properties.filter(p => p.id !== id),
      isLoading: false,
      error: null,
    }));
  };

  const addPropertyToState = (newProperty: Property) => {
    setState(prev => ({
      ...prev,
      properties: [newProperty, ...prev.properties],
      isLoading: false,
      error: null,
    }));
  };

  const loadProperties = useCallback(async (ownerId: string): Promise<Result<Property[]>> => {
    setLoading(true);
    
    const result = await propertyService.getAllProperties(ownerId);
    
    if (result.success) {
      setProperties(result.value);
      return result;
    } else {
      setError(result.error.message);
      return result;
    }
  }, [propertyService]);

  const createProperty = useCallback(async (input: CreatePropertyInput, ownerId: string): Promise<Result<Property>> => {
    setLoading(true);
    
    const result = await propertyService.createProperty(input, ownerId);
    
    if (result.success) {
      addPropertyToState(result.value);
      toast.success(`Property "${result.value.name}" created successfully!`);
      return result;
    } else {
      setError(result.error.message);
      toast.error(result.error.message);
      return result;
    }
  }, [propertyService]);

  const updateProperty = useCallback(async (id: string, input: UpdatePropertyInput): Promise<Result<Property>> => {
    setLoading(true);
    
    const result = await propertyService.updateProperty(id, input);
    
    if (result.success) {
      updatePropertyInState(result.value);
      toast.success(`Property "${result.value.name}" updated successfully!`);
      return result;
    } else {
      setError(result.error.message);
      toast.error(result.error.message);
      return result;
    }
  }, [propertyService]);

  const deleteProperty = useCallback(async (id: string): Promise<Result<void>> => {
    setLoading(true);
    
    const result = await propertyService.deleteProperty(id);
    
    if (result.success) {
      removePropertyFromState(id);
      toast.success('Property deleted successfully!');
      return result;
    } else {
      setError(result.error.message);
      toast.error(result.error.message);
      return result;
    }
  }, [propertyService]);

  const uploadImage = useCallback(async (id: string, imageFile: File): Promise<Result<{ url: string }>> => {
    setLoading(true);
    
    const result = await propertyService.uploadPropertyImage(id, imageFile);
    
    if (result.success) {
      toast.success('Property image uploaded successfully!');
      setState(prev => ({ ...prev, isLoading: false, error: null }));
      return result;
    } else {
      setError(result.error.message);
      toast.error(result.error.message);
      return result;
    }
  }, [propertyService]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const validatePropertyData = useCallback((input: CreatePropertyInput | UpdatePropertyInput) => {
    return propertyService.validatePropertyData(input);
  }, [propertyService]);

  return {
    properties: state.properties,
    isLoading: state.isLoading,
    error: state.error,
    loadProperties,
    createProperty,
    updateProperty,
    deleteProperty,
    uploadImage,
    clearError,
    validatePropertyData,
  };
}

/**
 * Hook for managing a single property
 */
export function useProperty(id?: string) {
  const propertyService = usePropertyService();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [state, setState] = useState<{
    property: Property | null;
    units: Unit[];
    occupancyRate: number;
    isLoading: boolean;
    error: string | null;
  }>({
    property: null,
    units: [],
    occupancyRate: 0,
    isLoading: false,
    error: null,
  });

  const loadProperty = useCallback(async (propertyId: string): Promise<Result<Property>> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    const result = await propertyService.getProperty(propertyId);
    
    if (result.success) {
      setState(prev => ({ 
        ...prev, 
        property: result.value, 
        isLoading: false, 
        error: null 
      }));
      return result;
    } else {
      setState(prev => ({ 
        ...prev, 
        error: result.error.message, 
        isLoading: false 
      }));
      return result;
    }
  }, [propertyService]);

  const loadPropertyUnits = useCallback(async (propertyId: string) => {
    const result = await propertyService.getPropertyUnits(propertyId);
    
    if (result.success) {
      setState(prev => ({ ...prev, units: result.value }));
    }
  }, [propertyService]);

  const calculateOccupancyRate = useCallback(async (propertyId: string) => {
    const result = await propertyService.calculateOccupancyRate(propertyId);
    
    if (result.success) {
      setState(prev => ({ ...prev, occupancyRate: result.value }));
    }
  }, [propertyService]);

  const updateProperty = useCallback(async (input: UpdatePropertyInput): Promise<Result<Property>> => {
    if (!id) {
      return {
        success: false,
        error: new Error('Property ID is required'),
      };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    const result = await propertyService.updateProperty(id, input);
    
    if (result.success) {
      setState(prev => ({ 
        ...prev, 
        property: result.value, 
        isLoading: false, 
        error: null 
      }));
      toast.success(`Property "${result.value.name}" updated successfully!`);
      return result;
    } else {
      setState(prev => ({ 
        ...prev, 
        error: result.error.message, 
        isLoading: false 
      }));
      toast.error(result.error.message);
      return result;
    }
  }, [id, propertyService]);

  const deleteProperty = useCallback(async (): Promise<Result<void>> => {
    if (!id) {
      return {
        success: false,
        error: new Error('Property ID is required'),
      };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    const result = await propertyService.deleteProperty(id);
    
    if (result.success) {
      toast.success('Property deleted successfully!');
      
      // Navigate back to properties list
      startTransition(() => {
        router.push('/properties');
      });
      
      return result;
    } else {
      setState(prev => ({ 
        ...prev, 
        error: result.error.message, 
        isLoading: false 
      }));
      toast.error(result.error.message);
      return result;
    }
  }, [id, propertyService, router]);

  return {
    ...state,
    isLoading: state.isLoading || isPending,
    loadProperty,
    loadPropertyUnits,
    calculateOccupancyRate,
    updateProperty,
    deleteProperty,
  };
}

/**
 * Hook for property statistics
 */
export function usePropertyStats(ownerId: string) {
  const propertyService = usePropertyService();
  const [state, setState] = useState<{
    stats: PropertyStats | null;
    isLoading: boolean;
    error: string | null;
  }>({
    stats: null,
    isLoading: false,
    error: null,
  });

  const loadStats = useCallback(async (): Promise<Result<PropertyStats>> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    const result = await propertyService.getPropertyStats(ownerId);
    
    if (result.success) {
      setState({
        stats: result.value,
        isLoading: false,
        error: null,
      });
      return result;
    } else {
      setState({
        stats: null,
        isLoading: false,
        error: result.error.message,
      });
      return result;
    }
  }, [ownerId, propertyService]);

  return {
    ...state,
    loadStats,
  };
}