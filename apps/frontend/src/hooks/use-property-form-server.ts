'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { useServerAction } from '@/hooks';
import { createProperty, updateProperty, type PropertyFormState } from '@/lib/actions/property-actions';
import { toast } from 'sonner';
import type { Property } from '@repo/shared';

interface UsePropertyFormServerProps {
  property?: Property;
  mode?: 'create' | 'edit';
  onSuccess?: () => void;
}

interface PropertyFormServerHookReturn {
  // Form state and submission
  formState: PropertyFormState;
  isPending: boolean;
  handleSubmit: (formData: FormData) => Promise<void>;
  
  // Amenities management
  amenities: string[];
  updateAmenities: (amenities: string[]) => void;
  
  // Form configuration
  mode: 'create' | 'edit';
}

const initialState: PropertyFormState = {};

export function usePropertyFormServer({ 
  property, 
  mode = 'create', 
  onSuccess 
}: UsePropertyFormServerProps): PropertyFormServerHookReturn {
  const [amenities, setAmenities] = useState<string[]>([]);

  // Determine the server action based on mode
  const action = mode === 'create' 
    ? createProperty 
    : (prevState: PropertyFormState, formData: FormData) => 
        updateProperty(property!.id, prevState, formData);

  // Initialize form state with server action
  const [formState] = useFormState(action, initialState);

  // Server action wrapper with amenities and success handling
  const [executeAction, isPending] = useServerAction(
    async (formData: FormData) => {
      // Add amenities to form data
      amenities.forEach(amenity => {
        formData.append('amenities', amenity);
      });
      
      // Execute the server action
      const result = await action(formState, formData);
      return result;
    },
    {
      onSuccess: () => {
        const successMessage = mode === 'create' 
          ? 'Property created successfully' 
          : 'Property updated successfully';
        
        toast.success(successMessage);
        onSuccess?.();
      },
      showErrorToast: false, // Handle errors through form state
    }
  );

  const handleSubmit = async (formData: FormData) => {
    await executeAction(formData);
  };

  const updateAmenities = (newAmenities: string[]) => {
    setAmenities(newAmenities);
  };

  return {
    formState,
    isPending,
    handleSubmit,
    amenities,
    updateAmenities,
    mode,
  };
}