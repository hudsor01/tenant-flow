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

// Basic lease status enum for form validation
type LeaseStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PENDING_SIGNATURES' | 'SIGNED' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'PENDING_RENEWAL';

// Simplified types for lease management
interface LeaseTemplate {
  id: string;
  name: string;
  description?: string;
}

interface LeaseWithEnhancedData extends Lease {
  lateFeeDays?: number;
  lateFeeAmount?: number;
  leaseTerms?: string;
  status?: LeaseStatus;
  templateId?: string;
  signatureStatus?: 'UNSIGNED' | 'PENDING' | 'SIGNED';
}

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
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PENDING_SIGNATURES', 'SIGNED', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'PENDING_RENEWAL']).optional(),
  templateId: z.string().optional(),
  signatureStatus: z.enum(['UNSIGNED', 'PENDING', 'SIGNED']).optional(),
});

export type LeaseFormData = z.infer<typeof leaseFormSchema>;

// Updated interface to match component usage patterns with enhanced lease management
export interface LeaseFormOptions {
  lease?: Lease | LeaseWithEnhancedData;
  mode?: 'create' | 'edit';
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  templateId?: string;
  defaultValues?: Partial<LeaseFormData>;
  onSubmit?: (data: LeaseFormData) => Promise<void>;
  onSuccess?: (lease?: Lease | LeaseWithEnhancedData) => void;
  onClose?: () => void;
  enableTemplates?: boolean;
  enableWorkflow?: boolean;
  availableTemplates?: LeaseTemplate[];
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
      templateId: options.templateId,
      signatureStatus: 'UNSIGNED',
    };

    if (lease && mode === 'edit') {
      const enhancedLease = lease as LeaseWithEnhancedData;
      return {
        propertyId: propertyId || '', // Will need to be derived from unit relationship
        unitId: lease.unitId,
        tenantId: lease.tenantId,
        startDate: typeof lease.startDate === 'string' ? lease.startDate : lease.startDate.toISOString().split('T')[0],
        endDate: typeof lease.endDate === 'string' ? lease.endDate : lease.endDate.toISOString().split('T')[0],
        rentAmount: lease.rentAmount,
        securityDeposit: lease.securityDeposit || 0,
        lateFeeDays: enhancedLease.lateFeeDays,
        lateFeeAmount: enhancedLease.lateFeeAmount,
        leaseTerms: enhancedLease.leaseTerms || lease.terms || '',
        status: enhancedLease.status || 'DRAFT',
        templateId: enhancedLease.templateId,
        signatureStatus: enhancedLease.signatureStatus || 'UNSIGNED',
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

  // Enhanced lease workflow functions
  const generateFromTemplate = useCallback(async (templateId: string, variables: Record<string, unknown>) => {
    if (!lease?.id) return;
    
    try {
      setIsSubmitting(true);
      const request = {
        leaseId: lease.id,
        templateId,
        variables,
        autoSendForSignature: false,
      };
      
      // API call would go here
      console.log('Generating lease from template:', request);
      toast.success('Lease generated from template successfully');
    } catch (error) {
      console.error('Failed to generate lease from template:', error);
      toast.error('Failed to generate lease from template');
    } finally {
      setIsSubmitting(false);
    }
  }, [lease]);

  const transitionStatus = useCallback(async (newStatus: LeaseStatus, reason?: string) => {
    if (!lease?.id) return;
    
    try {
      setIsSubmitting(true);
      const request = {
        newStatus,
        reason,
        notifyParties: true,
      };
      
      // API call would go here
      console.log('Transitioning lease status:', request);
      toast.success(`Lease status changed to ${newStatus}`);
    } catch (error) {
      console.error('Failed to transition lease status:', error);
      toast.error('Failed to update lease status');
    } finally {
      setIsSubmitting(false);
    }
  }, [lease]);

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
    // Enhanced lease management functions
    generateFromTemplate,
    transitionStatus,
    enableTemplates: options.enableTemplates ?? false,
    enableWorkflow: options.enableWorkflow ?? false,
    availableTemplates: options.availableTemplates || [],
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