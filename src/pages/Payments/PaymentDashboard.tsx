import { useState } from 'react';
import { usePayments, usePaymentAnalytics } from '@/hooks/usePayments';
import { usePropertiesSafe as useProperties } from '@/hooks/usePropertiesSafe';
import PaymentFormModal from '@/components/payments/PaymentFormModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
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
  TrendingUp,
  TrendingDown,
  Calendar,
  MoreHorizontal,
  Download,
  Plus,
  CreditCard,
  PiggyBank,
  AlertTriangle,
  Home,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import type { Payment, PaymentType } from '@/types/entities';

export default function PaymentDashboard() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');

  const { data: properties = [] } = useProperties();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: analytics, isLoading: analyticsLoading } = usePaymentAnalytics(
    selectedPropertyId !== 'all' ? selectedPropertyId : undefined
  );

  // Filter payments by property
  const filteredPayments = selectedPropertyId === 'all'
    ? payments
    : payments.filter(payment => {
        const unit = Array.isArray(payment.lease?.unit) ? payment.lease.unit[0] : payment.lease?.unit;
        const property = Array.isArray(unit?.property) ? unit.property[0] : unit?.property;
        return property?.id === selectedPropertyId;
      });

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

  // Calculate month-over-month change
  const monthOverMonthChange = analytics ?
    ((analytics.currentMonthAmount - analytics.lastMonthAmount) / analytics.lastMonthAmount) * 100 : 0;

  if (paymentsLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Dashboard</h1>
          <p className="text-muted-foreground">
            Track and manage rent payments across your properties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  All Properties
                </div>
              </SelectItem>
              <SelectSeparator />
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCreatePayment}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics?.totalAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">
              All time revenue collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics?.currentMonthAmount || 0)}</div>
            <div className="flex items-center text-xs">
              {monthOverMonthChange > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">+{monthOverMonthChange.toFixed(1)}%</span>
                </>
              ) : monthOverMonthChange < 0 ? (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  <span className="text-red-600">{monthOverMonthChange.toFixed(1)}%</span>
                </>
              ) : (
                <span className="text-muted-foreground">No change</span>
              )}
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics?.currentYearAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Year to date collections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalPayments || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.currentMonthPayments || 0} this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Payments</TabsTrigger>
          <TabsTrigger value="by-type">By Type</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Trends</TabsTrigger>
        </TabsList>

        {/* Recent Payments Tab */}
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>
                    All payments recorded in the system
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No payments recorded yet. Click "Record Payment" to add your first payment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => {
                      const unit = Array.isArray(payment.lease?.unit) ? payment.lease.unit[0] : payment.lease?.unit;
                      const property = Array.isArray(unit?.property) ? unit.property[0] : unit?.property;
                      const tenant = Array.isArray(payment.lease?.tenant) ? payment.lease.tenant[0] : payment.lease?.tenant;

                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {format(new Date(payment.date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{property?.name || 'N/A'}</TableCell>
                          <TableCell>Unit {unit?.unitNumber || 'N/A'}</TableCell>
                          <TableCell>{tenant?.name || 'N/A'}</TableCell>
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleEditPayment(payment as unknown as Payment)}>
                                  Edit payment
                                </DropdownMenuItem>
                                <DropdownMenuItem>View details</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  Delete payment
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Type Tab */}
        <TabsContent value="by-type" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(analytics?.paymentTypes || {}).map(([type, amount]) => (
              <Card key={type}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {type.replace('_', ' ')}
                  </CardTitle>
                  {getPaymentTypeIcon(type as PaymentType)}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(amount as number)}</div>
                  <p className="text-xs text-muted-foreground">
                    {filteredPayments.filter(p => p.type === type).length} payments
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Monthly Trends Tab */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Payment Trends</CardTitle>
              <CardDescription>
                Revenue collected by month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(analytics?.monthlyData || {})
                  .sort((a: { month: string }, b: { month: string }) => b.month.localeCompare(a.month))
                  .slice(0, 12)
                  .map((monthData: { month: string; amount: number; count: number }) => (
                    <div key={monthData.month} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {format(new Date(monthData.month + '-01'), 'MMMM yyyy')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {monthData.count} payment{monthData.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(monthData.amount)}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(monthData.amount / monthData.count)} avg
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Form Modal */}
      <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedPayment(null);
        }}
        propertyId={selectedPropertyId !== 'all' ? selectedPropertyId : undefined}
        payment={selectedPayment || undefined}
        mode={editMode}
      />
    </div>
  );
}
