'use client';

import { useState } from 'react';
import { motion } from '@/lib/framer-motion';
import { useAuth } from '../../hooks/use-auth';
import { useDashboardStats, useDashboardActivity } from '../../hooks/api/use-dashboard';
import { Spinner } from '@/components/ui/spinner';
import { 
  DashboardHeader,
  DashboardMetrics, 
  DashboardQuickActions,
  DashboardActivityFeed,
  contentVariants
} from './index';
import { ErrorScreen, LoadingScreen } from '@/components/common/centered-container';


export default function Dashboard() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  // Use React Query hooks for dashboard data
  const { data: stats, isLoading: isStatsLoading, error: statsError } = useDashboardStats({
    enabled: !!user?.id,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const { data: activities, isLoading: isActivitiesLoading, error: activitiesError } = useDashboardActivity(10, {
    enabled: !!user?.id,
  });

  const isLoading = isStatsLoading || isActivitiesLoading;
  const hasError = statsError || activitiesError;

  // Quick action handlers
  const handleAddProperty = () => {
    // TODO: Implement property creation modal
    console.log('Add property clicked');
  };

  const handleNewTenant = () => {
    // TODO: Navigate to tenant creation
    console.log('New tenant clicked');
  };

  const handleScheduleMaintenance = () => {
    // TODO: Implement maintenance request modal
    console.log('Schedule maintenance clicked');
  };

  const handleGenerateReport = () => {
    // TODO: Navigate to reports page
    console.log('Generate report clicked');
  };

  if (hasError) {
    return (
      <ErrorScreen>
        <Spinner size="xl" color="red" className="mx-auto mb-4" />
        <p className="text-white/70 mb-2">Failed to load dashboard data</p>
        <button 
          onClick={() => window.location.reload()} 
          className="text-[#60a5fa] hover:underline"
        >
          Try refreshing the page
        </button>
      </ErrorScreen>
    );
  }

  if (isLoading) {
    return (
      <LoadingScreen>
        <Spinner size="xl" color="blue" className="mx-auto mb-4" />
        <p className="text-white/70">Loading dashboard...</p>
      </LoadingScreen>
    );
  }

  return (
    <motion.div
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header Section */}
      <DashboardHeader 
        userEmail={user?.email}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Metrics Grid */}
      <DashboardMetrics stats={stats || null} isLoading={isStatsLoading} />

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <DashboardQuickActions
          onAddProperty={handleAddProperty}
          onNewTenant={handleNewTenant}
          onScheduleMaintenance={handleScheduleMaintenance}
          onGenerateReport={handleGenerateReport}
        />

        {/* Recent Activity */}
        <DashboardActivityFeed activities={activities || []} isLoading={isActivitiesLoading} />
      </div>
    </motion.div>
  );
}