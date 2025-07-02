import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useCreateProperty, useUpdateProperty } from './useProperties';
import { useCanPerformAction, useUserPlan } from './useSubscription';
import type { Property } from '@/types/entities';

export interface PropertyFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  imageUrl?: string;
  propertyType: 'SINGLE_FAMILY' | 'MULTI_UNIT' | 'APARTMENT' | 'COMMERCIAL';
  hasGarage?: boolean;
  hasPool?: boolean;
  numberOfUnits?: number;
  createUnitsNow?: boolean;
}

interface UsePropertyFormDataProps {
  property?: Property;
  mode: 'create' | 'edit';
  isOpen: boolean;
}

/**
 * Custom hook for managing property form data and state
 * Separates data fetching and state management from UI components
 */
export function usePropertyFormData({ property, mode, isOpen }: UsePropertyFormDataProps) {
  // Upgrade modal state  
  const [, setShowUpgradeModal] = useState(false);

  // Data fetching hooks
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const { canAddProperty, getUpgradeReason } = useCanPerformAction();
  const { data: userPlan } = useUserPlan();

  // Form initialization logic
  const initializeForm = (form: UseFormReturn<PropertyFormData>) => {
    if (isOpen) {
      if (property && mode === 'edit') {
        form.reset({
          name: property.name,
          address: property.address,
          city: property.city,
          state: property.state,
          zipCode: property.zipCode,
          imageUrl: property.imageUrl || '',
          propertyType: property.propertyType,
          hasGarage: property.hasGarage || false,
          hasPool: property.hasPool || false,
          numberOfUnits: property.numberOfUnits || undefined,
          createUnitsNow: false,
        });
      } else {
        // Create mode - reset to defaults
        form.reset({
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          imageUrl: '',
          propertyType: 'SINGLE_FAMILY',
          hasGarage: false,
          hasPool: false,
          numberOfUnits: undefined,
          createUnitsNow: false,
        });
      }
    } else {
      // Modal closed - reset form
      form.reset();
    }
  };

  // Check if user can create property
  const checkCanCreateProperty = () => {
    if (mode === 'create' && !canAddProperty()) {
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  };

  // Get form default values
  const getDefaultValues = (): PropertyFormData => ({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    imageUrl: '',
    propertyType: 'SINGLE_FAMILY',
    hasGarage: false,
    hasPool: false,
    numberOfUnits: undefined,
    createUnitsNow: false,
  });

  return {
    // State
    setShowUpgradeModal,
    userPlan,

    // Mutations
    createProperty,
    updateProperty,

    // Subscription
    canAddProperty,
    getUpgradeReason,

    // Utilities
    initializeForm,
    checkCanCreateProperty,
    getDefaultValues,
  };
}