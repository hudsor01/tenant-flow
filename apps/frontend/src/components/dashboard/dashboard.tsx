'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/use-auth';
import { useDashboardData } from '../../hooks/use-dashboard-data';
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

  // Use custom hook for dashboard data
  const { stats, activities, isLoading } = useDashboardData(user?.id, selectedPeriod);

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
      <DashboardMetrics stats={stats} isLoading={false} />

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
        <DashboardActivityFeed activities={activities || []} isLoading={false} />
      </div>
    </motion.div>
  );
}