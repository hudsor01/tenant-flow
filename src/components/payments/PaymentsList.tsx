import React, { useState } from 'react';
import { usePayments, usePaymentsByProperty, usePaymentsByTenant } from '@/hooks/usePayments';
import PaymentFormModal from './PaymentFormModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DollarSign,
  MoreHorizontal,
  Plus,
  Home,
  PiggyBank,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import type { PaymentType, Payment } from '@/types/entities';
import { useDeletePayment } from '@/hooks/usePayments';
import { toast } from 'sonner';

interface PaymentsListProps {
  leaseId?: string;
  propertyId?: string;
  tenantId?: string;
  showAddButton?: boolean;
  compact?: boolean;
  title?: string;
  description?: string;
}

export default function PaymentsList({
  leaseId,
  propertyId,
  tenantId,
  showAddButton = true,
  compact = false,
  title = 'Payment History',
  description = 'All payments for this lease'
}: PaymentsListProps) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');

  // Call all hooks unconditionally, then filter the data
  const { data: tenantPayments = [], isLoading: tenantLoading } = usePaymentsByTenant(tenantId || '');
  const { data: propertyPayments = [], isLoading: propertyLoading } = usePaymentsByProperty(propertyId || '');
  const { data: leasePayments = [], isLoading: leaseLoading } = usePayments(leaseId || '');

  // Use the appropriate data based on props
  const payments = tenantId
    ? tenantPayments
    : propertyId
    ? propertyPayments
    : leasePayments;

  const isLoading = tenantId
    ? tenantLoading
    : propertyId
    ? propertyLoading
    : leaseLoading;
  const deletePayment = useDeletePayment();

  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setEditMode('edit');
    setIsPaymentModalOpen(true);
  };

  const handleCreatePayment = () => {
    setSelectedPayment(null);
    setEditMode('create');
    setIsPaymentModalOpen(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (confirm('Are you sure you want to delete this payment record?')) {
      try {
        await deletePayment.mutateAsync(paymentId);
        toast.success('Payment deleted successfully');
      } catch {
        // Error handled by mutation hook
        toast.error('Failed to delete payment');
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getPaymentTypeIcon = (type: PaymentType) => {
    switch (type) {
      case 'RENT': return <Home className="h-4 w-4" />;
      case 'DEPOSIT': return <PiggyBank className="h-4 w-4" />;
      case 'LATE_FEE': return <AlertTriangle className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaymentTypeBadgeVariant = (type: PaymentType): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (type) {
      case 'RENT': return 'default';
      case 'DEPOSIT': return 'secondary';
      case 'LATE_FEE': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {title}
              </CardTitle>
              <CardDescription>
                {description}
              </CardDescription>
            </div>
            {showAddButton && (
              <Button onClick={handleCreatePayment} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No payments recorded yet</p>
              {showAddButton && (
                <Button onClick={handleCreatePayment} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Record First Payment
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{payments.length}</div>
                  <div className="text-sm text-muted-foreground">Total Payments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
                  <div className="text-sm text-muted-foreground">Total Collected</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {payments.filter(p => p.type === 'RENT').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Rent Payments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatCurrency(totalAmount / payments.length)}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Payment</div>
                </div>
              </div>

              {/* Payments Table */}
              {compact ? (
                <div className="space-y-2">
                  {payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={getPaymentTypeBadgeVariant(payment.type)}>
                          {getPaymentTypeIcon(payment.type)}
                        </Badge>
                        <div>
                          <div className="font-medium">{formatCurrency(payment.amount)}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(payment.date), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              handleEditPayment({
                                dueDate: 'dueDate' in payment ? payment.dueDate ?? null : null,
                                lateFee: 'lateFee' in payment ? payment.lateFee ?? null : null,
                                stripePaymentIntentId: 'stripePaymentIntentId' in payment ? payment.stripePaymentIntentId ?? null : null,
                                processingFee: 'processingFee' in payment ? payment.processingFee ?? null : null,
                                ...payment
                              })
                            }
                          >
                            Edit payment
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeletePayment(payment.id)}
                          >
                            Delete payment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                  {payments.length > 5 && (
                    <div className="text-center pt-2">
                      <Button variant="link" size="sm">
                        View all {payments.length} payments
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {format(new Date(payment.date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPaymentTypeBadgeVariant(payment.type)}>
                            <span className="flex items-center gap-1">
                              {getPaymentTypeIcon(payment.type)}
                              {payment.type.replace('_', ' ')}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {payment.notes || '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleEditPayment({
                                    dueDate: 'dueDate' in payment ? payment.dueDate ?? null : null,
                                    lateFee: 'lateFee' in payment ? payment.lateFee ?? null : null,
                                    stripePaymentIntentId: 'stripePaymentIntentId' in payment ? payment.stripePaymentIntentId ?? null : null,
                                    processingFee: 'processingFee' in payment ? payment.processingFee ?? null : null,
                                    ...payment
                                  })
                                }
                              >
                                Edit payment
                              </DropdownMenuItem>
                              <DropdownMenuItem>Generate receipt</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeletePayment(payment.id)}
                              >
                                Delete payment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Form Modal */}
      <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedPayment(null);
        }}
        leaseId={leaseId}
        propertyId={propertyId}
        tenantId={tenantId}
        payment={selectedPayment || undefined}
        mode={editMode}
      />
    </>
  );
}
