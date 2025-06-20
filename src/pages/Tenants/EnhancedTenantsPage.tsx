import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsListEnhanced, TabsTriggerWithIcon } from '@/components/ui/tabs';
import {
  Users,
  Search,
  UserPlus,
  UserCheck,
  Clock,
  Building,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import InviteTenantModal from '@/components/tenants/InviteTenantModal';
import { EnhancedTenantCard } from '@/components/tenants/EnhancedTenantCard';
import { useTenants } from '@/hooks/useTenants';
import { EmptyState } from '@/components/ui/empty-state';
import type { Tenant } from '@/types/entities';

const EnhancedTenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: tenants = [], isLoading, error } = useTenants();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Filter tenants based on search and tab
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = (() => {
      switch (activeTab) {
        case 'active':
          return tenant.invitationStatus === 'ACCEPTED' &&
            tenant.leases?.some((lease: { status: string }) => lease.status === 'ACTIVE');
        case 'pending':
          return tenant.invitationStatus === 'PENDING';
        case 'inactive':
          return tenant.invitationStatus === 'ACCEPTED' &&
            !tenant.leases?.some((lease: { status: string }) => lease.status === 'ACTIVE');
        default:
          return true;
      }
    })();

    return matchesSearch && matchesTab;
  });

  // Calculate stats for tabs
  const stats = {
    all: tenants.length,
    active: tenants.filter(t => t.invitationStatus === 'ACCEPTED' &&
      t.leases?.some((lease: { status: string }) => lease.status === 'ACTIVE')).length,
    pending: tenants.filter(t => t.invitationStatus === 'PENDING').length,
    inactive: tenants.filter(t => t.invitationStatus === 'ACCEPTED' &&
      !t.leases?.some((lease: { status: string }) => lease.status === 'ACTIVE')).length,
  };

  const handleViewTenant = (tenant: Tenant) => {
    navigate(`/tenants/${tenant.id}`);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold">Error loading tenants</div>
          <p className="text-muted-foreground mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const getEmptyStateContent = () => {
    switch (activeTab) {
      case 'active':
        return {
          title: 'No Active Tenants',
          description: 'No tenants with active leases found. Invite tenants and assign them to properties to get started.',
        };
      case 'pending':
        return {
          title: 'No Pending Invitations',
          description: 'All invitations have been accepted or you haven\'t sent any invitations yet.',
        };
      case 'inactive':
        return {
          title: 'No Inactive Tenants',
          description: 'All accepted tenants have active leases.',
        };
      default:
        return {
          title: searchTerm ? 'No Tenants Found' : 'No Tenants Yet',
          description: searchTerm
            ? 'Try adjusting your search criteria to find the tenant you\'re looking for.'
            : 'Get started by inviting your first tenant to the platform.',
        };
    }
  };

  return (
    <div className="space-y-6 p-1">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tenant Management</h1>
          <p className="text-muted-foreground mt-1">Manage tenants, track leases, and monitor property assignments</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex"
          >
            <Filter className="mr-2 h-4 w-4" />
            Advanced Filter
          </Button>
          <Button
            data-testid="invite-tenant-button"
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Invite Tenant
          </Button>
        </motion.div>
      </div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Enhanced Tabs with Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="relative overflow-hidden rounded-2xl bg-card/90 p-2 shadow-lg shadow-black/5 border border-border/50 backdrop-blur-sm">
            <TabsListEnhanced
              variant="premium"
              className="grid w-full grid-cols-4 bg-transparent p-0 h-auto gap-1"
            >
              <TabsTriggerWithIcon
                value="all"
                icon={<Users className="h-4 w-4" />}
                label={`All (${stats.all})`}
              />
              <TabsTriggerWithIcon
                value="active"
                icon={<UserCheck className="h-4 w-4" />}
                label={`Active (${stats.active})`}
              />
              <TabsTriggerWithIcon
                value="pending"
                icon={<Clock className="h-4 w-4" />}
                label={`Pending (${stats.pending})`}
              />
              <TabsTriggerWithIcon
                value="inactive"
                icon={<Building className="h-4 w-4" />}
                label={`No Lease (${stats.inactive})`}
              />
            </TabsListEnhanced>
          </div>

          {/* All Tabs Content */}
          {['all', 'active', 'pending', 'inactive'].map((tabValue) => (
            <TabsContent key={tabValue} value={tabValue} className="mt-6">
              {/* Loading State */}
              {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-card rounded-lg border p-6 space-y-4">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-muted rounded-xl"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-muted rounded"></div>
                          <div className="h-3 bg-muted rounded w-5/6"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tenants Grid */}
              {!isLoading && filteredTenants.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTenants.map((tenant, index) => (
                    <EnhancedTenantCard
                      key={tenant.id}
                      tenant={{
                        ...tenant,
                        leases: tenant.leases?.map(lease => ({
                          ...lease,
                          monthlyRent: lease.rentAmount
                        }))
                      }}
                      onViewDetails={handleViewTenant}
                      delay={index * 0.05}
                    />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isLoading && filteredTenants.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <EmptyState
                    icon={<Users className="h-8 w-8" />}
                    title={getEmptyStateContent().title}
                    description={getEmptyStateContent().description}
                    action={!searchTerm && activeTab === 'all' ? {
                      label: "Invite Your First Tenant",
                      onClick: () => setIsInviteModalOpen(true)
                    } : undefined}
                  />
                </motion.div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>

      <InviteTenantModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
};

export default EnhancedTenantsPage;
