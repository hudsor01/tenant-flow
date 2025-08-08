'use client';

import { motion } from 'framer-motion';
import { Building2, Users, Wrench, DollarSign, TrendingUp } from 'lucide-react';
import { cardVariants } from './dashboard-animations';
import type { DashboardStats } from '@repo/shared';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; isPositive: boolean };
  color: 'navy' | 'steel' | 'emerald' | 'gold';
  index: number;
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, color, index }: MetricCardProps) {
  const colorClasses = {
    navy: 'from-[#1e3a5f] to-[#2d5a87] border-[#4a7ba3]/30',
    steel: 'from-[#475569] to-[#64748b] border-[#94a3b8]/30',
    emerald: 'from-[#065f46] to-[#047857] border-[#10b981]/30',
    gold: 'from-[#92400e] to-[#b45309] border-[#f59e0b]/30'
  };

  const iconColors = {
    navy: 'text-[#60a5fa]',
    steel: 'text-[#94a3b8]',
    emerald: 'text-[#34d399]',
    gold: 'text-[#fbbf24]'
  };

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className={`
        relative overflow-hidden rounded-xl border backdrop-blur-sm
        bg-gradient-to-br ${colorClasses[color]}
        shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20
        transition-all duration-300
      `}
    >
      {/* Subtle geometric pattern overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
      </div>
      
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg bg-white/10 ${iconColors[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`flex items-center text-sm font-medium ${
              trend.isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}>
              <TrendingUp className={`w-4 h-4 mr-1 ${!trend.isPositive ? 'rotate-180' : ''}`} />
              {trend.value}%
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-white/70 uppercase tracking-wide">
            {title}
          </h3>
          <p className="text-3xl font-bold text-white">
            {value}
          </p>
          <p className="text-sm text-white/60">
            {subtitle}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Using shared DashboardStats interface from @repo/shared

interface DashboardMetricsProps {
  stats: DashboardStats | null;
  isLoading?: boolean;
}

export function DashboardMetrics({ stats, isLoading }: DashboardMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white/10 rounded-xl h-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Total Properties"
        value={stats?.properties?.totalUnits || 0}
        subtitle={`${Math.round(stats?.properties?.occupancyRate || 0)}% occupancy rate`}
        icon={Building2}
        trend={{ value: 12, isPositive: true }}
        color="navy"
        index={0}
      />
      <MetricCard
        title="Active Tenants"
        value={stats?.tenants?.activeTenants || 0}
        subtitle={`${stats?.leases?.activeLeases || 0} active leases`}
        icon={Users}
        trend={{ value: 8, isPositive: true }}
        color="steel"
        index={1}
      />
      <MetricCard
        title="Maintenance Requests"
        value={stats?.maintenanceRequests?.open || 0}
        subtitle={`${stats?.maintenanceRequests?.inProgress || 0} in progress`}
        icon={Wrench}
        trend={{ value: 5, isPositive: false }}
        color="emerald"
        index={2}
      />
      <MetricCard
        title="Monthly Revenue"
        value={`$${(stats?.leases?.totalRentRoll || 0).toLocaleString()}`}
        subtitle="Total rent roll"
        icon={DollarSign}
        trend={{ 
          value: 5, 
          isPositive: true 
        }}
        color="gold"
        index={3}
      />
    </div>
  );
}