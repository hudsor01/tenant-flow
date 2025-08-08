"use client"

import * as React from "react"
import {
  DollarSign,
  Users,
  Home,
  Wrench,
  FileText,
  BarChart3,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { StatsCard } from "./stats-card"
import { useDashboardStats, useRevenueAnalytics, useOccupancyTrends } from "@/hooks/api/use-dashboard"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

// Type imports for dashboard data
interface DashboardStats {
  totalProperties: number
  totalTenants: number
  activeLeases: number
  occupancyRate: number
  maintenanceRequests: {
    pending: number
  }
  revenueMetrics: {
    currentMonth: number
    growth: number
  }
}

interface RevenueData {
  revenueByProperty: Array<{
    revenue: number
  }>
}

interface OccupancyData {
  occupancyRate: number
}

// Extract complex stats creation logic
function createDashboardStats(
  data: PropertyDashboardProps['data'], 
  dashboardStats: DashboardStats | undefined, 
  revenueData: RevenueData | undefined, 
  occupancyData: OccupancyData[] | undefined
) {
  // Use either provided data or fetched data
  const currentMonth = data?.revenue?.value || revenueData?.revenueByProperty?.[0]?.revenue || dashboardStats?.revenueMetrics?.currentMonth;
  const currentOccupancy = data?.occupancy?.value || occupancyData?.[0]?.occupancyRate || dashboardStats?.occupancyRate;

  return [
    {
      title: "Monthly Revenue",
      value: typeof currentMonth === 'number' ? `$${currentMonth.toLocaleString()}` : data?.revenue?.value || "$0",
      description: "Collected rent payments",
      trend: { 
        value: data?.revenue?.trend || dashboardStats?.revenueMetrics?.growth || 0, 
        period: "vs last month",
        isPositive: true 
      },
      icon: <DollarSign className="h-4 w-4" />,
      variant: "revenue" as const
    },
    {
      title: "Active Tenants", 
      value: data?.tenants?.value || dashboardStats?.totalTenants?.toString() || "0",
      description: "Currently occupied units",
      trend: { 
        value: data?.tenants?.trend || 4.2, 
        period: "vs last month",
        isPositive: true 
      },
      icon: <Users className="h-4 w-4" />,
      variant: "tenants" as const
    },
    {
      title: "Properties",
      value: data?.properties?.value || dashboardStats?.totalProperties?.toString() || "0",
      description: "Total managed properties", 
      trend: { 
        value: data?.properties?.trend || 8.1, 
        period: "vs last quarter",
        isPositive: true 
      },
      icon: <Home className="h-4 w-4" />,
      variant: "properties" as const
    },
    {
      title: "Maintenance",
      value: data?.maintenance?.value || dashboardStats?.maintenanceRequests?.pending?.toString() || "0",
      description: "Pending requests",
      trend: { 
        value: data?.maintenance?.trend || -15.3, 
        period: "vs last week",
        isPositive: false // Lower maintenance is better
      },
      icon: <Wrench className="h-4 w-4" />,
      variant: "maintenance" as const
    },
    {
      title: "Occupancy Rate",
      value: typeof currentOccupancy === 'number' ? `${Math.round(currentOccupancy)}%` : data?.occupancy?.value || "0%",
      description: "Current occupancy",
      trend: { 
        value: data?.occupancy?.trend || 2.1, 
        period: "vs last month",
        isPositive: true 
      },
      icon: <BarChart3 className="h-4 w-4" />,
      variant: "occupancy" as const
    },
    {
      title: "Active Leases",
      value: data?.leases?.value || dashboardStats?.activeLeases?.toString() || "0",
      description: "Currently active",
      trend: { 
        value: data?.leases?.trend || 5.8, 
        period: "vs last month",
        isPositive: true 
      },
      icon: <FileText className="h-4 w-4" />,
      variant: "default" as const
    }
  ];
}

// Property Management Dashboard Stats
interface PropertyDashboardProps {
  loading?: boolean
  className?: string
  data?: {
    revenue?: { value: string, trend: number }
    tenants?: { value: string, trend: number }
    properties?: { value: string, trend: number }
    maintenance?: { value: string, trend: number }
    occupancy?: { value: string, trend: number }
    leases?: { value: string, trend: number }
  }
}

export function PropertyDashboard({ 
  loading: forcedLoading = false, 
  className,
  data 
}: PropertyDashboardProps) {
  // Use React Query hooks for real-time data
  const { data: dashboardStats, isLoading: isStatsLoading, error: statsError } = useDashboardStats({
    enabled: !data, // Only fetch if no data prop provided
  });
  
  const { data: revenueData, isLoading: isRevenueLoading, error: revenueError } = useRevenueAnalytics({
    enabled: !data?.revenue, // Only fetch if revenue not provided
  });

  const { data: occupancyData, isLoading: isOccupancyLoading, error: occupancyError } = useOccupancyTrends({
    enabled: !data?.occupancy, // Only fetch if occupancy not provided
  });

  const isLoading = forcedLoading || isStatsLoading || isRevenueLoading || isOccupancyLoading;
  const hasError = statsError || revenueError || occupancyError;

  // Show error state
  if (hasError && !data) {
    return (
      <div className={cn("grid gap-4", className)}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = createDashboardStats(data, dashboardStats, revenueData, occupancyData);

  return (
    <div className={cn(
      "grid gap-4 @container",
      // Responsive grid using container queries
      "@[640px]:grid-cols-2 @[960px]:grid-cols-3 @[1280px]:grid-cols-6 grid-cols-1",
      className
    )}>
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          description={stat.description}
          trend={stat.trend}
          icon={stat.icon}
          variant={stat.variant}
          loading={isLoading}
        />
      ))}
    </div>
  )
}