'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { tenantInputSchema } from '@repo/shared/validation/tenants';
import type { Tenant } from '@repo/shared/types/tenants';
import type { MaintenanceRequest } from '@repo/shared/types/maintenance';

export interface TenantFormState {
  errors?: {
    firstName?: string[];
    lastName?: string[];
    email?: string[];
    phone?: string[];
    propertyId?: string[];
    unitId?: string[];
    leaseStartDate?: string[];
    leaseEndDate?: string[];
    rentAmount?: string[];
    depositAmount?: string[];
    _form?: string[];
  };
  success?: boolean;
  data?: Tenant;
}

export async function createTenant(
  prevState: TenantFormState,
  formData: FormData
): Promise<TenantFormState> {
  const rawData = {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    propertyId: formData.get('propertyId'),
    unitId: formData.get('unitId'),
    leaseStartDate: formData.get('leaseStartDate'),
    leaseEndDate: formData.get('leaseEndDate'),
    rentAmount: Number(formData.get('rentAmount')),
    depositAmount: Number(formData.get('depositAmount')),
    notes: formData.get('notes'),
  };

  const result = tenantInputSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiClient.post('/tenants', result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to create tenant'],
        },
      };
    }

    // Revalidate relevant caches
    revalidateTag('tenants');
    revalidateTag('properties');
    revalidatePath('/tenants');
    revalidatePath(`/properties/${result.data.propertyId}`);

    redirect(`/tenants/${(response.data as Tenant).id}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      errors: {
        _form: [message],
      },
    };
  }
}

export async function updateTenant(
  tenantId: string,
  prevState: TenantFormState,
  formData: FormData
): Promise<TenantFormState> {
  const rawData = {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    propertyId: formData.get('propertyId'),
    unitId: formData.get('unitId'),
    leaseStartDate: formData.get('leaseStartDate'),
    leaseEndDate: formData.get('leaseEndDate'),
    rentAmount: Number(formData.get('rentAmount')),
    depositAmount: Number(formData.get('depositAmount')),
    notes: formData.get('notes'),
  };

  const result = tenantInputSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiClient.put(`/tenants/${tenantId}`, result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to update tenant'],
        },
      };
    }

    // Revalidate caches
    revalidateTag('tenants');
    revalidateTag('properties');
    revalidatePath(`/tenants/${tenantId}`);
    revalidatePath('/tenants');

    return {
      success: true,
      data: response.data as Tenant,
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

export async function deleteTenant(tenantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await apiClient.delete(`/tenants/${tenantId}`);

    if (!response.success) {
      return {
        success: false,
        error: response.message || 'Failed to delete tenant',
      };
    }

    // Revalidate caches
    revalidateTag('tenants');
    revalidateTag('properties');
    revalidatePath('/tenants');

    redirect('/tenants');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

// Maintenance request action
export async function createMaintenanceRequest(
  prevState: { success?: boolean; errors?: Record<string, string[]>; data?: MaintenanceRequest },
  formData: FormData
): Promise<{ success?: boolean; errors?: { _form?: string[] }; data?: MaintenanceRequest }> {
  const requestData = {
    tenantId: formData.get('tenantId'),
    propertyId: formData.get('propertyId'),
    unitId: formData.get('unitId'),
    title: formData.get('title'),
    description: formData.get('description'),
    priority: formData.get('priority'),
    category: formData.get('category'),
    images: formData.getAll('images'),
  };

  try {
    const response = await apiClient.post('/maintenance-requests', requestData);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to create maintenance request'],
        },
      };
    }

    // Revalidate maintenance requests
    revalidateTag('maintenance-requests');
    revalidatePath('/maintenance');

    return {
      success: true,
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