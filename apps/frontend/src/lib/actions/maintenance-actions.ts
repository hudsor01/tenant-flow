'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import type { MaintenanceRequest } from '@repo/shared/types/maintenance';

// Maintenance request form schema
const MaintenanceSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  tenantId: z.string().optional(),
  unitId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.enum(['plumbing', 'electrical', 'hvac', 'appliances', 'general', 'pest_control', 'security']),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
  requestedBy: z.string().optional(),
  assignedTo: z.string().optional(),
  scheduledDate: z.string().optional(),
  estimatedCost: z.number().min(0, 'Estimated cost cannot be negative').optional(),
  actualCost: z.number().min(0, 'Actual cost cannot be negative').optional(),
  notes: z.string().optional(),
});

const MaintenanceUpdateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']),
  assignedTo: z.string().optional(),
  scheduledDate: z.string().optional(),
  actualCost: z.number().min(0, 'Actual cost cannot be negative').optional(),
  completionNotes: z.string().optional(),
});

const CommentSchema = z.object({
  comment: z.string().min(1, 'Comment cannot be empty'),
});

export type MaintenanceFormState = {
  errors?: {
    propertyId?: string[];
    tenantId?: string[];
    unitId?: string[];
    title?: string[];
    description?: string[];
    priority?: string[];
    category?: string[];
    status?: string[];
    requestedBy?: string[];
    assignedTo?: string[];
    scheduledDate?: string[];
    estimatedCost?: string[];
    actualCost?: string[];
    notes?: string[];
    completionNotes?: string[];
    comment?: string[];
    _form?: string[];
  };
  success?: boolean;
  message?: string;
  data?: MaintenanceRequest | { image?: { id: string; url: string; filename: string } };
};

export async function createMaintenanceRequest(
  prevState: MaintenanceFormState,
  formData: FormData
): Promise<MaintenanceFormState> {
  const rawData = {
    propertyId: formData.get('propertyId'),
    tenantId: formData.get('tenantId') || undefined,
    unitId: formData.get('unitId') || undefined,
    title: formData.get('title'),
    description: formData.get('description'),
    priority: formData.get('priority'),
    category: formData.get('category'),
    status: formData.get('status') || 'open',
    requestedBy: formData.get('requestedBy'),
    assignedTo: formData.get('assignedTo'),
    scheduledDate: formData.get('scheduledDate'),
    estimatedCost: formData.get('estimatedCost') ? Number(formData.get('estimatedCost')) : undefined,
    actualCost: formData.get('actualCost') ? Number(formData.get('actualCost')) : undefined,
    notes: formData.get('notes'),
  };

  const result = MaintenanceSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiClient.post('/maintenance', result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to create maintenance request'],
        },
      };
    }

    // Revalidate relevant caches
    revalidateTag('maintenance');
    revalidateTag('properties');
    revalidatePath('/maintenance');

    // Redirect to new maintenance request
    redirect(`/maintenance/${(response.data as MaintenanceRequest).id}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      errors: {
        _form: [message],
      },
    };
  }
}

export async function updateMaintenanceRequest(
  maintenanceId: string,
  prevState: MaintenanceFormState,
  formData: FormData
): Promise<MaintenanceFormState> {
  const rawData = {
    propertyId: formData.get('propertyId'),
    tenantId: formData.get('tenantId') || undefined,
    unitId: formData.get('unitId') || undefined,
    title: formData.get('title'),
    description: formData.get('description'),
    priority: formData.get('priority'),
    category: formData.get('category'),
    status: formData.get('status'),
    requestedBy: formData.get('requestedBy'),
    assignedTo: formData.get('assignedTo'),
    scheduledDate: formData.get('scheduledDate'),
    estimatedCost: formData.get('estimatedCost') ? Number(formData.get('estimatedCost')) : undefined,
    actualCost: formData.get('actualCost') ? Number(formData.get('actualCost')) : undefined,
    notes: formData.get('notes'),
  };

  const result = MaintenanceSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiClient.put(`/maintenance/${maintenanceId}`, result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to update maintenance request'],
        },
      };
    }

    // Revalidate caches
    revalidateTag('maintenance');
    revalidateTag('maintenance-request');
    revalidatePath(`/maintenance/${maintenanceId}`);
    revalidatePath('/maintenance');

    return {
      success: true,
      message: 'Maintenance request updated successfully',
      data: response.data as MaintenanceRequest,
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

export async function deleteMaintenanceRequest(maintenanceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await apiClient.delete(`/maintenance/${maintenanceId}`);

    if (!response.success) {
      return {
        success: false,
        error: response.message || 'Failed to delete maintenance request',
      };
    }

    // Revalidate caches
    revalidateTag('maintenance');
    revalidatePath('/maintenance');

    // Redirect to maintenance list
    redirect('/maintenance');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function updateMaintenanceStatus(
  maintenanceId: string,
  prevState: MaintenanceFormState,
  formData: FormData
): Promise<MaintenanceFormState> {
  const rawData = {
    status: formData.get('status'),
    assignedTo: formData.get('assignedTo'),
    scheduledDate: formData.get('scheduledDate'),
    actualCost: formData.get('actualCost') ? Number(formData.get('actualCost')) : undefined,
    completionNotes: formData.get('completionNotes'),
  };

  const result = MaintenanceUpdateSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiClient.patch(`/maintenance/${maintenanceId}/status`, result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to update maintenance status'],
        },
      };
    }

    // Revalidate caches
    revalidateTag('maintenance');
    revalidateTag('maintenance-request');
    revalidatePath(`/maintenance/${maintenanceId}`);

    return {
      success: true,
      message: 'Maintenance status updated successfully',
      data: response.data as MaintenanceRequest,
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

export async function assignMaintenanceToVendor(
  maintenanceId: string,
  vendorId: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const response = await apiClient.post(`/maintenance/${maintenanceId}/assign`, { vendorId });

    if (!response.success) {
      return {
        success: false,
        error: response.message || 'Failed to assign maintenance to vendor',
      };
    }

    // Revalidate caches
    revalidateTag('maintenance');
    revalidateTag('maintenance-request');
    revalidatePath(`/maintenance/${maintenanceId}`);

    return {
      success: true,
      message: 'Maintenance request assigned successfully',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function addMaintenanceComment(
  maintenanceId: string,
  prevState: MaintenanceFormState,
  formData: FormData
): Promise<MaintenanceFormState> {
  const rawData = {
    comment: formData.get('comment'),
  };

  const result = CommentSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiClient.post(`/maintenance/${maintenanceId}/comments`, result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to add comment'],
        },
      };
    }

    // Revalidate maintenance request data
    revalidateTag('maintenance-request');
    revalidatePath(`/maintenance/${maintenanceId}`);

    return {
      success: true,
      message: 'Comment added successfully',
      data: response.data as MaintenanceRequest,
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

export async function uploadMaintenanceImage(
  maintenanceId: string,
  file: File
): Promise<{ success: boolean; error?: string; image?: { id: string; url: string; filename: string } }> {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiClient.post(`/maintenance/${maintenanceId}/images`, formData);

    if (!response.success) {
      return {
        success: false,
        error: response.message || 'Failed to upload image',
      };
    }

    // Revalidate maintenance request data
    revalidateTag('maintenance-request');
    revalidatePath(`/maintenance/${maintenanceId}`);

    return {
      success: true,
      image: response.data as { id: string; url: string; filename: string },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

// Quick status update actions for optimistic UI updates
export async function markMaintenanceInProgress(maintenanceId: string) {
  try {
    const response = await apiClient.patch(`/maintenance/${maintenanceId}/status`, { 
      status: 'in_progress' 
    });

    // Revalidate maintenance data
    revalidateTag('maintenance');
    revalidatePath(`/maintenance/${maintenanceId}`);

    return { success: response.success };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function markMaintenanceCompleted(maintenanceId: string) {
  try {
    const response = await apiClient.patch(`/maintenance/${maintenanceId}/status`, { 
      status: 'completed' 
    });

    // Revalidate maintenance data
    revalidateTag('maintenance');
    revalidatePath(`/maintenance/${maintenanceId}`);

    return { success: response.success };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}