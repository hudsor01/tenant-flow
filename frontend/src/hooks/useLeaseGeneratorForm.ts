import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { LeaseGeneratorForm, LeaseOutputFormat } from '@/types/lease-generator';

// Comprehensive lease generator schema
const leaseGeneratorSchema = z.object({
  // Property Information
  propertyAddress: z.string().min(1, 'Property address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'Valid ZIP code is required'),
  unitNumber: z.string().optional(),
  
  // Landlord Information
  landlordName: z.string().min(1, 'Landlord name is required'),
  landlordEmail: z.string().email('Valid email is required'),
  landlordPhone: z.string().optional(),
  landlordAddress: z.string().min(1, 'Landlord address is required'),
  
  // Tenant Information
  tenantNames: z.array(z.string().min(1, 'Tenant name is required')).min(1, 'At least one tenant is required'),
  
  // Lease Terms
  rentAmount: z.number().min(1, 'Rent amount must be greater than 0'),
  securityDeposit: z.number().min(0, 'Security deposit cannot be negative'),
  leaseStartDate: z.string().min(1, 'Lease start date is required'),
  leaseEndDate: z.string().min(1, 'Lease end date is required'),
  
  // Payment Information
  paymentDueDate: z.number().min(1).max(31),
  lateFeeAmount: z.number().min(0),
  lateFeeDays: z.number().min(1),
  paymentMethod: z.enum(['check', 'online', 'bank_transfer', 'cash']),
  paymentAddress: z.string().optional(),
  
  // Additional Terms
  petPolicy: z.enum(['allowed', 'not_allowed', 'with_deposit']),
  petDeposit: z.number().optional(),
  smokingPolicy: z.enum(['allowed', 'not_allowed']),
  maintenanceResponsibility: z.enum(['landlord', 'tenant', 'shared']),
  utilitiesIncluded: z.array(z.string()),
  additionalTerms: z.string().optional(),
});

export type LeaseGeneratorFormData = z.infer<typeof leaseGeneratorSchema>;

interface UseLeaseGeneratorFormProps {
  onGenerate: (data: LeaseGeneratorForm, format: LeaseOutputFormat) => Promise<void>;
  requiresPayment: boolean;
  selectedFormat: LeaseOutputFormat;
}

/**
 * Custom hook for managing lease generator form state and logic
 * Separates form logic from UI components
 */
export function useLeaseGeneratorForm({
  onGenerate,
  requiresPayment,
  selectedFormat,
}: UseLeaseGeneratorFormProps) {
  const form = useForm<LeaseGeneratorFormData>({
    resolver: zodResolver(leaseGeneratorSchema),
    defaultValues: {
      tenantNames: [''],
      paymentDueDate: 1,
      lateFeeAmount: 50,
      lateFeeDays: 5,
      paymentMethod: 'check',
      petPolicy: 'not_allowed',
      smokingPolicy: 'not_allowed',
      maintenanceResponsibility: 'landlord',
      utilitiesIncluded: [],
      rentAmount: 0,
      securityDeposit: 0,
    },
  });

  // Tenant names field array management
  const { fields: tenantFields, append: addTenant, remove: removeTenant } = useFieldArray({
    control: form.control,
    name: 'tenantNames',
  });

  // Form submission handler
  const handleSubmit = async (data: LeaseGeneratorFormData) => {
    if (requiresPayment) {
      toast.error('Payment required to generate additional leases');
      return;
    }

    try {
      await onGenerate(data, selectedFormat);
    } catch (error) {
      toast.error('Failed to generate lease agreement');
      console.error('Lease generation error:', error);
    }
  };

  return {
    form,
    tenantFields,
    addTenant,
    removeTenant,
    handleSubmit: form.handleSubmit(handleSubmit),
    leaseGeneratorSchema,
  };
}