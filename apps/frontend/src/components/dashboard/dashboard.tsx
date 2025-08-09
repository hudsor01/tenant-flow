'use client';

import { useState } from 'react';
import { motion } from '@/lib/framer-motion';
import { useAuth } from '../../hooks/use-auth';
import { useDashboardStats, useDashboardActivity } from '../../hooks/api/use-dashboard';
import { 
  DashboardHeader,
  DashboardMetrics, 
  DashboardQuickActions,
  DashboardActivityFeed,
  contentVariants
} from './index';


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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 mb-2">Failed to load dashboard data</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-[#60a5fa] hover:underline"
          >
            Try refreshing the page
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#60a5fa] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading dashboard...</p>
        </div>
      </div>
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