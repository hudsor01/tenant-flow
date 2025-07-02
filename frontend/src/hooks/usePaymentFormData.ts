import { useMemo } from 'react';
import { format } from 'date-fns';
import { useLeases } from './useLeases';
import { useCreatePayment, useUpdatePayment } from './useApiPayments';
import { toast } from 'sonner';
import type { Payment, PaymentType } from '@/types/entities';

export interface PaymentFormData {
  leaseId: string;
  amount: number;
  date: string;
  type: PaymentType;
  notes?: string;
}

interface UsePaymentFormDataProps {
  propertyId?: string;
  leaseId?: string;
  tenantId?: string;
  payment?: Payment;
  mode: 'create' | 'edit';
  defaultAmount?: number;
  defaultType?: PaymentType;
  onClose: () => void;
}

/**
 * Custom hook for managing payment form data and state
 * Separates data fetching and business logic from UI components
 */
export function usePaymentFormData({
  propertyId,
  leaseId,
  tenantId,
  payment,
  mode,
  defaultAmount,
  defaultType,
  onClose,
}: UsePaymentFormDataProps) {
  // Data queries
  const { data: allLeases = [], isLoading: leasesLoading } = useLeases();
  
  // Mutations
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();

  // Filter available leases based on context
  const availableLeases = useMemo(() => {
    let filtered = allLeases.filter(lease => 
      lease.status === 'ACTIVE' || lease.status === 'PENDING'
    );

    // Filter by property if specified
    if (propertyId) {
      filtered = filtered.filter(lease => 
        lease.unit?.propertyId === propertyId
      );
    }

    // Filter by tenant if specified
    if (tenantId) {
      filtered = filtered.filter(lease => 
        lease.tenantId === tenantId
      );
    }

    return filtered;
  }, [allLeases, propertyId, tenantId]);

  // Get default form values
  const getDefaultValues = (): PaymentFormData => {
    if (mode === 'edit' && payment) {
      return {
        leaseId: payment.leaseId,
        amount: payment.amount,
        date: format(new Date(payment.date), 'yyyy-MM-dd'),
        type: payment.type,
        notes: payment.notes || '',
      };
    }

    // Create mode defaults
    const today = format(new Date(), 'yyyy-MM-dd');
    
    return {
      leaseId: leaseId || '',
      amount: defaultAmount || 0,
      date: today,
      type: defaultType || 'RENT',
      notes: '',
    };
  };

  // Auto-populate amount based on lease selection
  const getAmountForLease = (selectedLeaseId: string): number => {
    if (!selectedLeaseId) return defaultAmount || 0;
    
    const selectedLease = availableLeases.find(lease => lease.id === selectedLeaseId);
    if (!selectedLease?.unit) return defaultAmount || 0;

    // Return rent amount for RENT type, otherwise use default
    return selectedLease.unit.rent || defaultAmount || 0;
  };

  // Handle form submission
  const handleSubmit = async (data: PaymentFormData) => {
    try {
      if (mode === 'create') {
        await createPayment.mutateAsync({
          leaseId: data.leaseId,
          amount: data.amount,
          date: data.date,
          type: data.type,
          notes: data.notes || null,
        });
        
        toast.success('💰 Payment recorded successfully!', {
          description: `Payment of $${data.amount.toFixed(2)} has been recorded.`,
          duration: 4000,
        });
      } else if (payment) {
        await updatePayment.mutateAsync({
          id: payment.id,
          leaseId: data.leaseId,
          amount: data.amount,
          date: data.date,
          type: data.type,
          notes: data.notes || null,
        });
        
        toast.success('✏️ Payment updated successfully!', {
          description: 'Your changes have been saved.',
          duration: 4000,
        });
      }

      onClose();
    } catch (error) {
      console.error('Payment operation failed:', error);
      toast.error(
        mode === 'create' 
          ? 'Failed to record payment. Please try again.' 
          : 'Failed to update payment. Please try again.'
      );
    }
  };

  // Get selected lease details
  const getSelectedLease = (leaseId: string) => {
    return availableLeases.find(lease => lease.id === leaseId);
  };

  return {
    // Data
    availableLeases,
    leasesLoading,

    // Mutations
    createPayment,
    updatePayment,
    isSubmitting: createPayment.isPending || updatePayment.isPending,

    // Utilities
    getDefaultValues,
    getAmountForLease,
    getSelectedLease,
    handleSubmit,
  };
}