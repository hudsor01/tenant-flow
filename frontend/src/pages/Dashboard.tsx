import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, Home, AlertTriangle, PlusCircle, UserPlus, TrendingUp, LucideIcon, ClipboardList, BookOpen, ArrowRight } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import type { MaintenanceRequestWithRelations } from '@/types/relationships';
import PropertyFormModal from '@/components/properties/PropertyFormModal';
import InviteTenantModal from '@/components/tenants/InviteTenantModal';
import QuickPropertySetup from '@/components/properties/QuickPropertySetup';
// Removed unused useAuthStore import
import PaymentInsights from '@/components/payments/PaymentInsights';
import { RealtimeActivityFeed } from '@/components/dashboard/RealtimeActivityFeed';
import { CriticalAlerts } from '@/components/dashboard/CriticalAlerts';
import { DashboardUpgradeCTA } from '@/components/billing/ContextualUpgradeCTA';
import { useCanPerformAction, useUserPlan } from '@/hooks/useSubscription';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
  gradient: string;
  delay: number;
  onClick?: () => void;
}


// interface QuickAction {
//   label: string;
//   icon: LucideIcon;
//   delay: number;
//   onClick: () => void;
// }

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, description, gradient, delay, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: delay, ease: "easeOut" }}
    whileHover={{ 
      y: -8, 
      boxShadow: "0 12px 25px -8px rgba(0,0,0,0.2)", 
      transition: { duration: 0.25, ease: "circOut" } 
    }}
    className={`rounded-xl h-full ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <Card className={`text-white shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl ${gradient} h-full flex flex-col justify-between p-1`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-5">
        <CardTitle className="text-md font-semibold font-sans tracking-wide">{title}</CardTitle>
        <Icon className="h-7 w-7 text-white/80" />
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-5">
        <div className="text-2xl sm:text-3xl md:text-4xl font-bold font-sans mb-1">{value}</div>
        <p className="text-sm text-white/90 font-sans flex items-center">
          <TrendingUp className="w-4 h-4 mr-1.5 text-white/70" />
          {description}
        </p>
      </CardContent>
    </Card>
  </motion.div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  // Removed unused user destructuring from useAuthStore()
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isInviteTenantModalOpen, setIsInviteTenantModalOpen] = useState(false);
  const { canAddProperty, canAddTenant } = useCanPerformAction();
  const { data: userPlan } = useUserPlan();
  
  // Fetch real data
  const { data: properties = [], isLoading: propertiesLoading, error: propertiesError } = useProperties();
  const { data: tenants = [], isLoading: tenantsLoading, error: tenantsError } = useTenants();
  const { data: maintenanceRequests = [], isLoading: maintenanceLoading, error: maintenanceError } = useMaintenanceRequests();

  // Calculate real statistics
  const totalProperties = properties.length;
  const totalUnits = properties.reduce((sum, property) => sum + (property.units?.length || 0), 0);
  const activeTenants = tenants.filter(tenant => 
    tenant.invitationStatus === 'ACCEPTED'
  ).length;
  const totalRevenue = properties.reduce((sum, property) => 
    sum + (property.units?.reduce((unitSum, unit) => 
      unitSum + (unit.leases?.some(lease => lease.status === 'ACTIVE') ? unit.rent : 0), 0) || 0), 0
  );
  const openMaintenanceTickets = maintenanceRequests.filter((request: MaintenanceRequestWithRelations) => 
    request.status === 'OPEN' || request.status === 'IN_PROGRESS'
  ).length;
  const urgentTickets = maintenanceRequests.filter((request: MaintenanceRequestWithRelations) => 
    request.priority === 'HIGH' || request.priority === 'EMERGENCY'
  ).length;

  const headlineVariants: Variants = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: 1,
      transition: {
        delay: i * 0.15,
        duration: 0.8,
        ease: "easeOut"
      },
    }),
  };

  // Error handling
  const hasError = propertiesError || tenantsError || maintenanceError;
  const isLoading = propertiesLoading || tenantsLoading || maintenanceLoading;

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground mb-4">
            {propertiesError?.message || tenantsError?.message || maintenanceError?.message || 'Failed to load dashboard data. Please try again.'}
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const quickActions = [
    { 
      label: "Add New Property", 
      icon: PlusCircle, 
      delay: 0.9,
      onClick: () => setIsPropertyModalOpen(true)
    },
    { 
      label: "Invite New Tenant", 
      icon: UserPlus, 
      delay: 1.0,
      onClick: () => setIsInviteTenantModalOpen(true)
    },
    { 
      label: "View All Maintenance", 
      icon: ClipboardList, 
      delay: 1.1,
      onClick: () => navigate('/maintenance')
    },
  ];

  return (
    <div data-testid="dashboard-content" className="space-y-10 p-2 md:p-4 lg:p-6">
      <motion.div
        initial="hidden"
        animate="visible"
        className="mb-10 text-center lg:text-left"
      >
        <motion.h1 
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-extrabold tracking-tighter"
          custom={0}
          variants={headlineVariants}
        >
          <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 text-transparent bg-clip-text">
            SIMPLIFY
          </span>
        </motion.h1>
        <motion.h1 
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-extrabold tracking-tighter text-foreground"
          custom={1}
          variants={headlineVariants}
        >
          PROPERTY MANAGEMENT
        </motion.h1>
        <motion.p 
          className="text-xl md:text-2xl text-muted-foreground font-sans mt-4 max-w-2xl mx-auto lg:mx-0"
          custom={2}
          variants={headlineVariants}
        >
          TenantFlow helps you manage your properties with ease and efficiency.
        </motion.p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Monthly Revenue" 
          value={propertiesLoading ? "Loading..." : `$${totalRevenue.toLocaleString()}`}
          icon={DollarSign} 
          description={`From ${totalUnits} units`}
          gradient="bg-gradient-revenue"
          delay={0.3}
        />
        <StatCard 
          title="Active Tenants" 
          value={tenantsLoading ? "Loading..." : activeTenants.toString()}
          icon={Users} 
          description={`${tenants.length} total tenants`}
          gradient="bg-gradient-tenants"
          delay={0.4}
          onClick={() => navigate('/tenants')}
        />
        <StatCard 
          title="Properties" 
          value={propertiesLoading ? "Loading..." : totalProperties.toString()}
          icon={Home} 
          description={`${totalUnits} total units`}
          gradient="bg-gradient-properties"
          delay={0.5}
          onClick={() => navigate('/properties')}
        />
        <StatCard 
          title="Open Tickets" 
          value={maintenanceLoading ? "Loading..." : openMaintenanceTickets.toString()}
          icon={AlertTriangle} 
          description={`${urgentTickets} urgent`}
          gradient="bg-gradient-tickets"
          delay={0.6}
          onClick={() => navigate('/maintenance')}
        />
      </div>

      {/* Quick Setup for New Users */}
      {totalProperties === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
          className="flex justify-center"
        >
          <QuickPropertySetup onComplete={() => navigate('/properties')} />
        </motion.div>
      )}

      {/* Critical Alerts Section - High Priority */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
      >
        <CriticalAlerts />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
          className="lg:col-span-2"
        >
          <RealtimeActivityFeed />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9, ease: "easeOut" }}
        >
          <Card className="h-full bg-card shadow-xl rounded-xl border-border/60 overflow-hidden">
            <CardHeader className="pb-3 pt-4 sm:pt-6 px-4 sm:px-6 bg-card">
              <CardTitle className="text-xl sm:text-2xl text-foreground font-serif">Quick Actions</CardTitle>
              <CardDescription className="text-muted-foreground font-sans text-sm sm:text-base">Common tasks at your fingertips.</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
              {quickActions.map((action, i) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: action.delay, ease: "easeOut" }}
                  whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    variant={i === 0 ? "default" : "outline"} 
                    className={`w-full font-sans py-3.5 text-base flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 ${i === 0 ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'border-primary text-primary hover:bg-primary/10 hover:text-primary'}`}
                    onClick={action.onClick}
                  >
                    <action.icon className="mr-2.5 h-5 w-5" /> {action.label}
                  </Button>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Contextual Upgrade CTA */}
      {userPlan && userPlan.id !== 'enterprise' && totalProperties > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0, ease: "easeOut" }}
          className="flex justify-center"
        >
          <DashboardUpgradeCTA 
            size="default"
            customMessage={
              !canAddProperty() ? "You've reached your property limit" :
              !canAddTenant() ? "You've reached your tenant limit" :
              `Unlock advanced features for ${totalProperties} properties`
            }
          />
        </motion.div>
      )}

      {/* Blog CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.0, ease: "easeOut" }}
      >
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-500 rounded-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Property Management Tips & Insights
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Stay updated with expert advice, industry trends, and proven strategies to maximize your rental income.
                  </p>
                </div>
              </div>
              <Link to="/blog">
                <Button variant="outline" className="bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/50">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Read Blog
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Financial Insights Section */}
      {totalProperties > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
        >
          <PaymentInsights />
        </motion.div>
      )}

      {/* Modals */}
      <PropertyFormModal 
        isOpen={isPropertyModalOpen}
        onClose={() => setIsPropertyModalOpen(false)}
        mode="create"
      />
      
      <InviteTenantModal
        isOpen={isInviteTenantModalOpen}
        onClose={() => setIsInviteTenantModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;