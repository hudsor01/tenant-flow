import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Calendar, FileText, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { Payment, PaymentType } from '@/types/database';
import { useCreatePayment, useUpdatePayment } from '@/hooks/usePayments';
import { useLeases } from '@/hooks/useLeases';
import { toast } from 'sonner';

const paymentSchema = z.object({
  leaseId: z.string().min(1, 'Please select a lease'),
  amount: z.number().min(0.01, 'Amount must be greater than 0').max(100000, 'Amount too high'),
  date: z.string().min(1, 'Payment date is required'),
  type: z.enum(['RENT', 'DEPOSIT', 'LATE_FEE', 'MAINTENANCE', 'OTHER'] as const),
  notes: z.string().optional(),
});

type LocalPaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
  leaseId?: string;
  tenantId?: string;
  payment?: Payment;
  mode: 'create' | 'edit';
  defaultAmount?: number;
  defaultType?: PaymentType;
}

export default function PaymentFormModal({
  isOpen,
  onClose,
  propertyId,
  leaseId,
  tenantId,
  payment,
  mode,
  defaultAmount,
  defaultType = 'RENT'
}: PaymentFormModalProps) {
  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const { data: leases = [] } = useLeases();

  // Filter leases by property, tenant, or show all if neither provided
  const availableLeases = tenantId
    ? leases.filter(lease =>
        lease.tenantId === tenantId &&
        lease.status === 'ACTIVE'
      )
    : propertyId
    ? leases.filter(lease =>
        lease.unit?.property?.id === propertyId &&
        lease.status === 'ACTIVE'
      )
    : leases.filter(lease => lease.status === 'ACTIVE');

  const form = useForm<LocalPaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      leaseId: leaseId || payment?.leaseId || '',
      amount: defaultAmount || payment?.amount || 0,
      date: payment?.date
        ? format(new Date(payment.date), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
      type: payment?.type || defaultType,
      notes: payment?.notes || '',
    },
  });

  // Auto-populate amount when lease is selected (for rent payments)
  const selectedLeaseId = form.watch('leaseId');
  const selectedType = form.watch('type');

  useEffect(() => {
    if (selectedLeaseId && selectedType === 'RENT' && mode === 'create') {
      const selectedLease = availableLeases.find(lease => lease.id === selectedLeaseId);
      if (selectedLease && !defaultAmount) {
        form.setValue('amount', selectedLease.rentAmount);
      }
    }
  }, [selectedLeaseId, selectedType, availableLeases, form, mode, defaultAmount]);

  const onSubmit = async (data: LocalPaymentFormData) => {
    try {
      if (mode === 'create') {
        await createPayment.mutateAsync(data);
        toast.success('Payment recorded successfully');
      } else if (payment) {
        await updatePayment.mutateAsync({
          id: payment.id,
          data,
        });
        toast.success('Payment updated successfully');
      }
      form.reset();
      onClose();
    } catch {
      // Error handled by mutation hook
      toast.error(mode === 'create' ? 'Failed to record payment' : 'Failed to update payment');
    }
  };

  const getPaymentTypeIcon = (type: PaymentType) => {
    switch (type) {
      case 'RENT': return '🏠';
      case 'DEPOSIT': return '🔒';
      case 'LATE_FEE': return '⏰';
      case 'MAINTENANCE': return '🔧';
      default: return '💰';
    }
  };

  const getPaymentTypeDescription = (type: PaymentType) => {
    switch (type) {
      case 'RENT': return 'Monthly rent payment';
      case 'DEPOSIT': return 'Security deposit or refund';
      case 'LATE_FEE': return 'Late payment fee';
      case 'MAINTENANCE': return 'Maintenance-related payment';
      case 'OTHER': return 'Other miscellaneous payment';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {mode === 'create' ? 'Record Payment' : 'Edit Payment'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Record a payment that was received from a tenant.'
              : 'Update the payment details.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lease Selection */}
              <FormField
                control={form.control}
                name="leaseId"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>
                      <FileText className="inline h-4 w-4 mr-1" />
                      Lease
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a lease" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableLeases.map((lease) => (
                          <SelectItem key={lease.id} value={lease.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>
                                {lease.unit?.property?.name} - Unit {lease.unit?.unitNumber}
                              </span>
                              <span className="text-muted-foreground ml-4">
                                {lease.tenant?.name} - ${lease.rentAmount}/mo
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the lease this payment is for
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      Amount
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-8"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Payment amount received
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Calendar className="inline h-4 w-4 mr-1" />
                      Payment Date
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      When the payment was received
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Payment Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(['RENT', 'DEPOSIT', 'LATE_FEE', 'MAINTENANCE', 'OTHER'] as const).map((type) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <span>{getPaymentTypeIcon(type)}</span>
                              <div>
                                <div className="font-medium">{type.replace('_', ' ')}</div>
                                <div className="text-xs text-muted-foreground">
                                  {getPaymentTypeDescription(type)}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Categorize this payment for reporting
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes about this payment..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional notes about the payment (payment method, special circumstances, etc.)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Selected Lease Summary */}
            {selectedLeaseId && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Payment Summary</h4>
                {(() => {
                  const selectedLease = availableLeases.find(l => l.id === selectedLeaseId);
                  return selectedLease ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Property:</span>
                        <div className="font-medium">{selectedLease.unit?.property?.name}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Unit:</span>
                        <div className="font-medium">Unit {selectedLease.unit?.unitNumber}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tenant:</span>
                        <div className="font-medium">{selectedLease.tenant?.name}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Monthly Rent:</span>
                        <div className="font-medium text-green-600">${selectedLease.rentAmount}</div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPayment.isPending || updatePayment.isPending}
              >
                {createPayment.isPending || updatePayment.isPending
                  ? 'Saving...'
                  : mode === 'create' ? 'Record Payment' : 'Update Payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
