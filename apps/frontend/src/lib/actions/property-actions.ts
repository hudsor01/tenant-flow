'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import type { Property } from '@repo/shared/types/properties';

// Property form schema
const PropertySchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  address: z.string().min(1, 'Address is required'),
  type: z.enum(['single_family', 'multi_family', 'apartment', 'commercial']),
  units: z.number().min(1, 'Must have at least 1 unit'),
  description: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
});

export type PropertyFormState = {
  errors?: {
    name?: string[];
    address?: string[];
    type?: string[];
    units?: string[];
    description?: string[];
    _form?: string[];
  };
  success?: boolean;
  data?: Property;
};

export async function createProperty(
  prevState: PropertyFormState,
  formData: FormData
): Promise<PropertyFormState> {
  // Extract form data
  const rawData = {
    name: formData.get('name'),
    address: formData.get('address'),
    type: formData.get('type'),
    units: Number(formData.get('units')),
    description: formData.get('description'),
    amenities: formData.getAll('amenities'),
    images: formData.getAll('images'),
  };

  // Validate form data
  const result = PropertySchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    // Create property via API
    const response = await apiClient.post('/properties', result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to create property'],
        },
      };
    }

    // Revalidate relevant caches
    revalidateTag('properties');
    revalidatePath('/properties');

    // Redirect to new property
    redirect(`/properties/${(response.data as Property).id}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      errors: {
        _form: [message],
      },
    };
  }
}

export async function updateProperty(
  propertyId: string,
  prevState: PropertyFormState,
  formData: FormData
): Promise<PropertyFormState> {
  const rawData = {
    name: formData.get('name'),
    address: formData.get('address'),
    type: formData.get('type'),
    units: Number(formData.get('units')),
    description: formData.get('description'),
    amenities: formData.getAll('amenities'),
    images: formData.getAll('images'),
  };

  const result = PropertySchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiClient.put(`/properties/${propertyId}`, result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to update property'],
        },
      };
    }

    // Revalidate caches
    revalidateTag('properties');
    revalidateTag('property');
    revalidatePath(`/properties/${propertyId}`);
    revalidatePath('/properties');

    return {
      success: true,
      data: response.data as Property,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      errors: {
        _form: [message],
      },
    };
  }
}

export async function deleteProperty(propertyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await apiClient.delete(`/properties/${propertyId}`);

    if (!response.success) {
      return {
        success: false,
        error: response.message || 'Failed to delete property',
      };
    }

    // Revalidate caches
    revalidateTag('properties');
    revalidatePath('/properties');

    // Redirect to properties list
    redirect('/properties');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

// Optimistic update action for quick UI updates
export async function togglePropertyStatus(propertyId: string, status: 'active' | 'inactive') {
  try {
    const response = await apiClient.patch(`/properties/${propertyId}/status`, { status });

    // Revalidate specific property
    revalidateTag('properties');
    revalidatePath(`/properties/${propertyId}`);

    return { success: response.success };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}