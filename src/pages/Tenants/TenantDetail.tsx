import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Home,
  DollarSign,
  FileText,
  Clock,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsListEnhanced, TabsTriggerWithIcon } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { MaintenanceRequest } from '@/types/entities';
import type { TenantWithLeases } from '@/types/relationships';
import PaymentsList from '@/components/payments/PaymentsList';

export default function TenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState('overview');

  // Check for tab parameter in URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'leases', 'payments', 'maintenance'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Fetch tenant with all related data
  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Tenant')
        .select(`
          *,
          user:User (*),
          leases:Lease (
            *,
            unit:Unit (
              *,
              property:Property (*)
            ),
            payments:Payment (*)
          )
        `)
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      return data as TenantWithLeases;
    },
    enabled: !!tenantId,
  });

  // Fetch maintenance requests for units this tenant has leased
  const { data: maintenanceRequests = [] } = useQuery({
    queryKey: ['tenant-maintenance', tenantId],
    queryFn: async () => {
      if (!tenant?.leases) return [];

      const unitIds = tenant.leases.map(lease => lease.unitId);
      const { data, error } = await supabase
        .from('MaintenanceRequest')
        .select(`
          *,
          unit:Unit (
            *,
            property:Property (*)
          )
        `)
        .in('unitId', unitIds)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      return data as MaintenanceRequest[];
    },
    enabled: !!tenant?.leases,
  });

  const handleSendEmail = () => {
    if (tenant?.email) {
      window.location.href = `mailto:${tenant.email}`;
    }
  };

  const handleCall = () => {
    if (tenant?.phone) {
      window.location.href = `tel:${tenant.phone}`;
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 bg-gray-200 rounded" />
          <div className="h-8 bg-gray-200 rounded w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Tenant not found</h3>
        <p className="text-muted-foreground mt-2">The tenant you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/tenants')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tenants
        </Button>
      </div>
    );
  }

  // Get current lease
  const currentLease = tenant.leases?.find(lease => lease.status === 'ACTIVE');
  const currentUnit = currentLease?.unit;
  const currentProperty = currentUnit?.property;

  // Calculate statistics
  const totalPayments = tenant.leases?.reduce((sum, lease) =>
    sum + (lease.payments?.reduce((pSum, payment) => pSum + payment.amount, 0) || 0), 0
  ) || 0;

  const totalLeases = tenant.leases?.length || 0;
  const activeLeases = tenant.leases?.filter(lease => lease.status === 'ACTIVE').length || 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'EXPIRED':
      case 'TERMINATED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/tenants')}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
            <div className="flex items-center space-x-4 mt-1">
              <div className="flex items-center text-muted-foreground">
                <Mail className="h-4 w-4 mr-1" />
                <span className="text-sm">{tenant.email}</span>
              </div>
              {tenant.phone && (
                <div className="flex items-center text-muted-foreground">
                  <Phone className="h-4 w-4 mr-1" />
                  <span className="text-sm">{tenant.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSendEmail}>
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </DropdownMenuItem>
            {tenant.phone && (
              <DropdownMenuItem onClick={handleCall}>
                <Phone className="mr-2 h-4 w-4" />
                Call Tenant
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Current Lease Alert */}
      {currentLease && currentUnit && currentProperty && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Alert>
            <Home className="h-4 w-4" />
            <AlertTitle>Current Residence</AlertTitle>
            <AlertDescription>
              {currentProperty.name} - Unit {currentUnit.unitNumber} "
              Lease expires {format(new Date(currentLease.endDate), 'MMMM d, yyyy')}
              ({formatDistanceToNow(new Date(currentLease.endDate), { addSuffix: true })})
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mr-4">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Leases</p>
              <p className="text-2xl font-bold">{totalLeases}</p>
              <p className="text-xs text-muted-foreground">{activeLeases} active</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold">${totalPayments.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mr-4">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="text-lg font-bold">{format(new Date(tenant.createdAt), 'MMM yyyy')}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-card/90 p-2 shadow-lg shadow-black/5 border border-border/50 backdrop-blur-sm">
            <TabsListEnhanced
              variant="premium"
              className="grid w-full grid-cols-4 bg-transparent p-0 h-auto gap-1"
            >
              <TabsTriggerWithIcon
                value="overview"
                icon={<User className="h-4 w-4" />}
                label="Overview"
              />
              <TabsTriggerWithIcon
                value="leases"
                icon={<FileText className="h-4 w-4" />}
                label="Lease History"
              />
              <TabsTriggerWithIcon
                value="payments"
                icon={<DollarSign className="h-4 w-4" />}
                label="Payments"
              />
              <TabsTriggerWithIcon
                value="maintenance"
                icon={<AlertCircle className="h-4 w-4" />}
                label="Maintenance"
              />
            </TabsListEnhanced>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{tenant.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{tenant.email}</p>
                  </div>
                  {tenant.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{tenant.phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Account Status</p>
                    <Badge variant={tenant.invitationStatus === 'ACCEPTED' ? 'default' : 'secondary'}>
                      {tenant.invitationStatus}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Current Lease Info */}
              {currentLease && currentUnit && currentProperty && (
                <Card>
                  <CardHeader>
                    <CardTitle>Current Lease</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Property</p>
                      <p className="font-medium">{currentProperty.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unit</p>
                      <p className="font-medium">
                        Unit {currentUnit.unitNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Rent</p>
                      <p className="font-medium text-green-600">
                        ${currentLease.rentAmount.toLocaleString()}/mo
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Lease Period</p>
                      <p className="font-medium">
                        {format(new Date(currentLease.startDate), 'MMM d, yyyy')} -
                        {format(new Date(currentLease.endDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Leases Tab */}
          <TabsContent value="leases" className="space-y-4">
            <div className="space-y-4">
              {tenant.leases?.map((lease) => (
                <Card key={lease.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold">
                            {lease.unit?.property?.name} - Unit {lease.unit?.unitNumber}
                          </h4>
                          <Badge variant={
                            lease.status === 'ACTIVE' ? 'default' :
                            lease.status === 'EXPIRED' ? 'secondary' :
                            'destructive'
                          }>
                            {lease.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Lease Period</p>
                            <p className="font-medium">
                              {format(new Date(lease.startDate), 'MMM yyyy')} -
                              {format(new Date(lease.endDate), 'MMM yyyy')}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Monthly Rent</p>
                            <p className="font-medium">${lease.rentAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Security Deposit</p>
                            <p className="font-medium">${lease.securityDeposit.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      {getStatusIcon(lease.status)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {(!tenant.leases || tenant.leases.length === 0) && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No lease history found</p>
              </div>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <PaymentsList
              tenantId={tenantId}
              showAddButton={true}
              title="Payment History"
              description={`All payments made by ${tenant.name}`}
            />
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-4">
            <div className="space-y-4">
              {maintenanceRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold">{request.title}</h4>
                          <Badge variant={
                            request.status === 'COMPLETED' ? 'default' :
                            request.status === 'IN_PROGRESS' ? 'secondary' :
                            request.priority === 'EMERGENCY' ? 'destructive' :
                            'outline'
                          }>
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Maintenance Request
                        </p>
                        <p className="text-sm">{request.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Submitted {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {maintenanceRequests.length === 0 && (
              <div className="text-center py-12">
                <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No maintenance requests found</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
