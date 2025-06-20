import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsListEnhanced, TabsTriggerWithIcon } from '@/components/ui/tabs';
import {
  Users,
  Mail,
  Phone,
  MapPin,
  Eye,
  FileText,
  Wrench,
  Clock,
  DollarSign,
  Calendar,
  Building,
  CheckCircle,
  AlertCircle,
  XCircle,
  MoreVertical,
  Trash2,
  UserX
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import type { Tenant } from '@/types/entities';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteTenant } from '@/hooks/useTenants';
import { toast } from 'sonner';

interface EnhancedTenantCardProps {
  tenant: Tenant & {
    leases?: Array<{
      id: string;
      status: string;
      startDate: string;
      endDate: string;
      monthlyRent: number;
      unit?: {
        unitNumber: string;
        property?: {
          name: string;
          address: string;
          city: string;
          state: string;
        };
      };
    }>;
    maintenanceRequests?: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      createdAt: string;
      description: string;
    }>;
  };
  onViewDetails: (tenant: Tenant) => void;
  delay?: number;
}

interface DataRowProps {
  label: string;
  value: string | React.ReactNode;
  icon?: React.ReactNode;
}

const DataRow: React.FC<DataRowProps> = ({ label, value, icon }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="font-medium">{label}</span>
    </div>
    <div className="text-sm text-foreground font-medium">{value}</div>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return { variant: 'default' as const, icon: <CheckCircle className="h-3 w-3" /> };
      case 'pending':
        return { variant: 'secondary' as const, icon: <Clock className="h-3 w-3" /> };
      case 'completed':
        return { variant: 'outline' as const, icon: <CheckCircle className="h-3 w-3" /> };
      case 'high':
        return { variant: 'destructive' as const, icon: <AlertCircle className="h-3 w-3" /> };
      case 'medium':
        return { variant: 'secondary' as const, icon: <AlertCircle className="h-3 w-3" /> };
      case 'low':
        return { variant: 'outline' as const, icon: <AlertCircle className="h-3 w-3" /> };
      default:
        return { variant: 'secondary' as const, icon: <XCircle className="h-3 w-3" /> };
    }
  };

  const { variant, icon } = getStatusStyle(status);

  return (
    <Badge variant={variant} className="flex items-center gap-1 text-xs">
      {icon}
      {status}
    </Badge>
  );
};

export const EnhancedTenantCard: React.FC<EnhancedTenantCardProps> = ({
  tenant,
  onViewDetails,
  delay = 0
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const deleteTenant = useDeleteTenant();

  // Get active lease
  const activeLease = tenant.leases?.find(lease => lease.status === 'ACTIVE');
  const leaseHistory = tenant.leases?.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()) || [];
  const maintenanceRequests = tenant.maintenanceRequests?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

  const handleDeleteTenant = async () => {
    const isPending = tenant.invitationStatus === 'PENDING';
    const isAccepted = tenant.invitationStatus === 'ACCEPTED';
    
    let confirmMessage: string;
    if (isPending) {
      confirmMessage = `Are you sure you want to delete the pending invitation for ${tenant.name}? This will permanently remove the invitation and cannot be undone.`;
    } else if (isAccepted) {
      confirmMessage = `Are you sure you want to deactivate ${tenant.name}? This will mark them as inactive but preserve all historical data.`;
    } else {
      toast.error('Cannot manage tenant with current status');
      return;
    }

    if (window.confirm(confirmMessage)) {
      try {
        const result = await deleteTenant.mutateAsync(tenant.id);
        
        if (result.action === 'deleted') {
          toast.success(`Pending invitation for ${tenant.name} has been deleted`);
        } else if (result.action === 'deactivated') {
          toast.success(`${tenant.name} has been marked as inactive`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to manage tenant';
        toast.error(message);
        console.error('Delete tenant error:', error);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
        {/* Enhanced Header */}
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="h-12 w-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                {/* Status indicator dot */}
                <div className={`absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${
                  tenant.invitationStatus === 'ACCEPTED' ? 'bg-green-500' :
                  tenant.invitationStatus === 'PENDING' ? 'bg-yellow-500' : 'bg-gray-400'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {tenant.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={tenant.invitationStatus === 'ACCEPTED' ? 'default' : 'secondary'} className="text-xs">
                    {tenant.invitationStatus}
                  </Badge>
                  {activeLease && (
                    <Badge variant="outline" className="text-xs">
                      Active Lease
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(tenant);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Tenant Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onViewDetails(tenant)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {tenant.invitationStatus === 'PENDING' ? (
                    <DropdownMenuItem
                      onClick={handleDeleteTenant}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Invitation
                    </DropdownMenuItem>
                  ) : tenant.invitationStatus === 'ACCEPTED' ? (
                    <DropdownMenuItem
                      onClick={handleDeleteTenant}
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Mark as Inactive
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        {/* Enhanced Tabbed Content */}
        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsListEnhanced
              variant="premium"
              className="grid w-full grid-cols-3 h-12 mb-4 bg-transparent gap-1 p-0"
            >
              <TabsTriggerWithIcon
                value="overview"
                icon={<Users className="h-4 w-4" />}
                label="Overview"
              />
              <TabsTriggerWithIcon
                value="leases"
                icon={<FileText className="h-4 w-4" />}
                label="Leases"
              />
              <TabsTriggerWithIcon
                value="maintenance"
                icon={<Wrench className="h-4 w-4" />}
                label="Maintenance"
              />
            </TabsListEnhanced>

            {/* Overview Tab - Personal Information */}
            <TabsContent value="overview" className="mt-0">
              <div className="space-y-1">
                <DataRow
                  label="Email"
                  value={tenant.email}
                  icon={<Mail className="h-4 w-4" />}
                />
                {tenant.phone && (
                  <DataRow
                    label="Phone"
                    value={tenant.phone}
                    icon={<Phone className="h-4 w-4" />}
                  />
                )}
                {activeLease?.unit?.property && (
                  <>
                    <DataRow
                      label="Property"
                      value={`${activeLease.unit.property.name} - Unit ${activeLease.unit.unitNumber}`}
                      icon={<Building className="h-4 w-4" />}
                    />
                    <DataRow
                      label="Location"
                      value={`${activeLease.unit.property.city}, ${activeLease.unit.property.state}`}
                      icon={<MapPin className="h-4 w-4" />}
                    />
                    <DataRow
                      label="Monthly Rent"
                      value={`$${activeLease.monthlyRent.toLocaleString()}`}
                      icon={<DollarSign className="h-4 w-4" />}
                    />
                    <DataRow
                      label="Lease End"
                      value={format(new Date(activeLease.endDate), 'MMM d, yyyy')}
                      icon={<Calendar className="h-4 w-4" />}
                    />
                  </>
                )}
                {!activeLease && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No active lease
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Leases Tab - Timeline of Lease History */}
            <TabsContent value="leases" className="mt-0">
              {leaseHistory.length > 0 ? (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {leaseHistory.map((lease, index) => (
                    <div key={lease.id} className="relative">
                      {/* Timeline connector */}
                      {index < leaseHistory.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
                      )}

                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full mt-1 ${
                          lease.status === 'ACTIVE' ? 'bg-green-500' :
                          lease.status === 'COMPLETED' ? 'bg-blue-500' : 'bg-gray-400'
                        }`} />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">
                              {lease.unit?.property?.name} - Unit {lease.unit?.unitNumber}
                            </div>
                            <StatusBadge status={lease.status} />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(lease.startDate), 'MMM d, yyyy')} - {format(new Date(lease.endDate), 'MMM d, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${lease.monthlyRent.toLocaleString()}/month
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No lease history
                </div>
              )}
            </TabsContent>

            {/* Maintenance Tab - Maintenance Requests */}
            <TabsContent value="maintenance" className="mt-0">
              {maintenanceRequests.length > 0 ? (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {maintenanceRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="border border-border/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm">{request.title}</div>
                        <div className="flex items-center gap-1">
                          <StatusBadge status={request.priority} />
                          <StatusBadge status={request.status} />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {request.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(request.createdAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                  ))}
                  {maintenanceRequests.length > 3 && (
                    <div className="text-center text-xs text-muted-foreground">
                      +{maintenanceRequests.length - 3} more requests
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No maintenance requests
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(tenant);
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `mailto:${tenant.email}`;
              }}
            >
              <Mail className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default EnhancedTenantCard;
