'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import type { Lease } from '@repo/shared/types/leases';
import type { Document } from '@repo/shared/types/documents';

// Lease form schema
const LeaseSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  tenantId: z.string().min(1, 'Tenant is required'),
  unitId: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  monthlyRent: z.number().min(1, 'Monthly rent must be greater than 0'),
  securityDeposit: z.number().min(0, 'Security deposit cannot be negative'),
  leaseTerm: z.number().min(1, 'Lease term must be at least 1 month'),
  status: z.enum(['draft', 'active', 'expired', 'terminated']).optional(),
  leaseType: z.enum(['fixed', 'month_to_month']).optional(),
  petPolicy: z.string().optional(),
  smokingPolicy: z.enum(['allowed', 'not_allowed']).optional(),
  utilities: z.array(z.string()).optional(),
  additionalTerms: z.string().optional(),
});

const LeaseRenewalSchema = z.object({
  endDate: z.string().min(1, 'New end date is required'),
  newRent: z.number().min(1, 'New rent amount must be greater than 0').optional(),
  renewalTerms: z.string().optional(),
});

const LeaseTerminationSchema = z.object({
  terminationDate: z.string().min(1, 'Termination date is required'),
  reason: z.string().min(1, 'Termination reason is required'),
  earlyTerminationFee: z.number().min(0, 'Early termination fee cannot be negative').optional(),
  refundableDeposit: z.number().min(0, 'Refundable deposit cannot be negative').optional(),
  notes: z.string().optional(),
});

export interface LeaseFormState {
  errors?: {
    propertyId?: string[];
    tenantId?: string[];
    unitId?: string[];
    startDate?: string[];
    endDate?: string[];
    monthlyRent?: string[];
    securityDeposit?: string[];
    leaseTerm?: string[];
    status?: string[];
    leaseType?: string[];
    petPolicy?: string[];
    smokingPolicy?: string[];
    utilities?: string[];
    additionalTerms?: string[];
    terminationDate?: string[];
    reason?: string[];
    earlyTerminationFee?: string[];
    refundableDeposit?: string[];
    notes?: string[];
    renewalTerms?: string[];
    newRent?: string[];
    _form?: string[];
  };
  success?: boolean;
  message?: string;
  data?: Lease | { url?: string; document?: Document };
}

export async function createLease(
  prevState: LeaseFormState,
  formData: FormData
): Promise<LeaseFormState> {
  const rawData = {
    propertyId: formData.get('propertyId'),
    tenantId: formData.get('tenantId'),
    unitId: formData.get('unitId') || undefined,
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    monthlyRent: Number(formData.get('monthlyRent')),
    securityDeposit: Number(formData.get('securityDeposit')),
    leaseTerm: Number(formData.get('leaseTerm')),
    status: formData.get('status') || 'draft',
    leaseType: formData.get('leaseType') || 'fixed',
    petPolicy: formData.get('petPolicy'),
    smokingPolicy: formData.get('smokingPolicy'),
    utilities: formData.getAll('utilities'),
    additionalTerms: formData.get('additionalTerms'),
  };

  const result = LeaseSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiClient.post('/leases', result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to create lease'],
        },
      };
    }

    // Revalidate relevant caches
    revalidateTag('leases');
    revalidateTag('properties');
    revalidateTag('tenants');
    revalidatePath('/leases');

    // Redirect to new lease
    redirect(`/leases/${(response.data as Lease).id}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      errors: {
        _form: [message],
      },
    };
  }
}

export async function updateLease(
  leaseId: string,
  prevState: LeaseFormState,
  formData: FormData
): Promise<LeaseFormState> {
  const rawData = {
    propertyId: formData.get('propertyId'),
    tenantId: formData.get('tenantId'),
    unitId: formData.get('unitId') || undefined,
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    monthlyRent: Number(formData.get('monthlyRent')),
    securityDeposit: Number(formData.get('securityDeposit')),
    leaseTerm: Number(formData.get('leaseTerm')),
    status: formData.get('status'),
    leaseType: formData.get('leaseType'),
    petPolicy: formData.get('petPolicy'),
    smokingPolicy: formData.get('smokingPolicy'),
    utilities: formData.getAll('utilities'),
    additionalTerms: formData.get('additionalTerms'),
  };

  const result = LeaseSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiClient.put(`/leases/${leaseId}`, result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to update lease'],
        },
      };
    }

    // Revalidate caches
    revalidateTag('leases');
    revalidateTag('lease');
    revalidateTag('properties');
    revalidateTag('tenants');
    revalidatePath(`/leases/${leaseId}`);
    revalidatePath('/leases');

    return {
      success: true,
      message: 'Lease updated successfully',
      data: response.data as Lease,
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

export async function deleteLease(leaseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await apiClient.delete(`/leases/${leaseId}`);

    if (!response.success) {
      return {
        success: false,
        error: response.message || 'Failed to delete lease',
      };
    }

    // Revalidate caches
    revalidateTag('leases');
    revalidateTag('properties');
    revalidateTag('tenants');
    revalidatePath('/leases');

    // Redirect to leases list
    redirect('/leases');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function activateLease(leaseId: string): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const response = await apiClient.post(`/leases/${leaseId}/activate`);

    if (!response.success) {
      return {
        success: false,
        error: response.message || 'Failed to activate lease',
      };
    }

    // Revalidate caches
    revalidateTag('leases');
    revalidateTag('lease');
    revalidateTag('properties');
    revalidateTag('tenants');
    revalidatePath(`/leases/${leaseId}`);

    return {
      success: true,
      message: 'Lease activated successfully',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function renewLease(
  leaseId: string,
  prevState: LeaseFormState,
  formData: FormData
): Promise<LeaseFormState> {
  const rawData = {
    endDate: formData.get('endDate'),
    newRent: formData.get('newRent') ? Number(formData.get('newRent')) : undefined,
    renewalTerms: formData.get('renewalTerms'),
  };

  const result = LeaseRenewalSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiClient.post(`/leases/${leaseId}/renew`, result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to renew lease'],
        },
      };
    }

    // Revalidate caches
    revalidateTag('leases');
    revalidateTag('lease');
    revalidatePath(`/leases/${leaseId}`);

    return {
      success: true,
      message: 'Lease renewed successfully',
      data: response.data as Lease,
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

export async function terminateLease(
  leaseId: string,
  prevState: LeaseFormState,
  formData: FormData
): Promise<LeaseFormState> {
  const rawData = {
    terminationDate: formData.get('terminationDate'),
    reason: formData.get('reason'),
    earlyTerminationFee: formData.get('earlyTerminationFee') ? Number(formData.get('earlyTerminationFee')) : undefined,
    refundableDeposit: formData.get('refundableDeposit') ? Number(formData.get('refundableDeposit')) : undefined,
    notes: formData.get('notes'),
  };

  const result = LeaseTerminationSchema.safeParse(rawData);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const response = await apiClient.post(`/leases/${leaseId}/terminate`, result.data);

    if (!response.success) {
      return {
        errors: {
          _form: [response.message || 'Failed to terminate lease'],
        },
      };
    }

    // Revalidate caches
    revalidateTag('leases');
    revalidateTag('lease');
    revalidateTag('properties');
    revalidateTag('tenants');
    revalidatePath(`/leases/${leaseId}`);
    revalidatePath('/leases');

    return {
      success: true,
      message: 'Lease terminated successfully',
      data: response.data as Lease,
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

export async function generateLeasePDF(leaseId: string): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const response = await apiClient.post(`/leases/${leaseId}/generate-pdf`);

    if (!response.success) {
      return {
        success: false,
        error: response.message || 'Failed to generate lease PDF',
      };
    }

    return {
      success: true,
      url: (response.data as { url: string }).url,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      success: false,
      error: message,
    };
  }
}

export async function uploadLeaseDocument(
  leaseId: string,
  file: File
): Promise<{ success: boolean; error?: string; document?: Document }> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/leases/${leaseId}/documents`, formData);

    if (!response.success) {
      return {
        success: false,
        error: response.message || 'Failed to upload document',
      };
    }

    // Revalidate lease data
    revalidateTag('lease');
    revalidatePath(`/leases/${leaseId}`);

    return {
      success: true,
      document: response.data as Document,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return {
      success: false,
      error: message,
    };
  }
}