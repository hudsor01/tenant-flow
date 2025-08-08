/**
 * Hook for managing lease form state and validation
 * Provides form handling for lease creation and editing
 */
import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Lease, CreateLeaseInput, UpdateLeaseInput } from '@repo/shared';

// Lease form schema - aligned with API input types and component usage
const leaseFormSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  unitId: z.string().min(1, 'Unit is required'),
  tenantId: z.string().min(1, 'Tenant is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  rentAmount: z.number().min(0, 'Rent amount must be positive'),
  securityDeposit: z.number().min(0, 'Security deposit must be positive').optional(),
  lateFeeDays: z.number().min(0).optional(),
  lateFeeAmount: z.number().min(0).optional(),
  leaseTerms: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']).optional(),
});

export type LeaseFormData = z.infer<typeof leaseFormSchema>;

// Updated interface to match component usage patterns
export interface LeaseFormOptions {
  lease?: Lease;
  mode?: 'create' | 'edit';
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  defaultValues?: Partial<LeaseFormData>;
  onSubmit?: (data: LeaseFormData) => Promise<void>;
  onSuccess?: (lease?: Lease) => void;
  onClose?: () => void;
}

export function useLeaseForm(options: LeaseFormOptions = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { lease, mode = 'create', propertyId, unitId, tenantId } = options;

  // Set up default values based on mode and provided data
  const getDefaultValues = (): Partial<LeaseFormData> => {
    const baseDefaults: LeaseFormData = {
      propertyId: propertyId || '',
      unitId: unitId || '',
      tenantId: tenantId || '',
      startDate: '',
      endDate: '',
      rentAmount: 0,
      securityDeposit: 0,
      leaseTerms: '',
      status: 'DRAFT',
    };

    if (lease && mode === 'edit') {
      return {
        propertyId: propertyId || '', // Will need to be derived from unit relationship
        unitId: lease.unitId,
        tenantId: lease.tenantId,
        startDate: typeof lease.startDate === 'string' ? lease.startDate : lease.startDate.toISOString().split('T')[0],
        endDate: typeof lease.endDate === 'string' ? lease.endDate : lease.endDate.toISOString().split('T')[0],
        rentAmount: lease.rentAmount,
        securityDeposit: lease.securityDeposit || 0,
        leaseTerms: lease.terms || '',
        status: (lease.status as 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED') || undefined,
      };
    }

    return { ...baseDefaults, ...options.defaultValues };
  };

  const form = useForm<LeaseFormData>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: getDefaultValues(),
    mode: 'onChange',
  });

  const onSubmit = useCallback(async (data: LeaseFormData) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      
      if (options.onSubmit) {
        await options.onSubmit(data);
      } else {
        // Default API behavior based on mode
        if (mode === 'create') {
          const createData: CreateLeaseInput = {
            unitId: data.unitId,
            tenantId: data.tenantId,
            propertyId: data.propertyId,
            startDate: data.startDate,
            endDate: data.endDate,
            rentAmount: data.rentAmount,
            securityDeposit: data.securityDeposit,
            lateFeeDays: data.lateFeeDays,
            lateFeeAmount: data.lateFeeAmount,
            leaseTerms: data.leaseTerms,
          };
          // API integration would go here
          console.log('Creating lease with data:', createData);
        } else if (mode === 'edit' && lease) {
          const updateData: UpdateLeaseInput = {
            startDate: data.startDate,
            endDate: data.endDate,
            rentAmount: data.rentAmount,
            securityDeposit: data.securityDeposit,
            lateFeeDays: data.lateFeeDays,
            lateFeeAmount: data.lateFeeAmount,
            leaseTerms: data.leaseTerms,
            status: data.status,
          };
          // API integration would go here
          console.log('Updating lease with data:', updateData);
        }
      }
      
      toast.success(`Lease ${mode === 'create' ? 'created' : 'updated'} successfully`);
      options.onSuccess?.(lease);
      options.onClose?.();
    } catch (error) {
      console.error('Failed to save lease:', error);
      const message = error instanceof Error ? error.message : 'Failed to save lease. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, options, mode, lease]);

  const reset = useCallback(() => {
    form.reset();
    setIsSubmitting(false);
  }, [form]);

  const cancel = useCallback(() => {
    if (options.onClose) {
      options.onClose();
    }
    reset();
  }, [options, reset]);

  return {
    form,
    isSubmitting,
    isPending: isSubmitting, // Alias for compatibility
    handleSubmit: onSubmit, // Return the raw handler for flexibility
    onSubmit: form.handleSubmit(onSubmit),
    reset,
    cancel,
    isDirty: form.formState.isDirty,
    isValid: form.formState.isValid,
    errors: form.formState.errors,
    mode,
    lease,
  };
}

// Additional hooks for lease form data - simplified implementation
export function useLeaseFormData(_selectedPropertyId?: string) {
  // This would normally use React Query or similar for data fetching
  // For now, return empty data structure to prevent component errors
  return {
    properties: [],
    tenants: [],
    propertyUnits: [],
    selectedProperty: null,
    hasUnits: false,
    availableUnits: [],
    isLoading: false,
  };
}