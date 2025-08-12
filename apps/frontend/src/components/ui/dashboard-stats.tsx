"use client"

import * as React from "react"
import { logger } from '@/lib/logger'
import { 
import { logger } from '@/lib/logger'
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Users,
  Home,
  Wrench,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react"

import { cn } from "@/lib/utils"
import { logger } from '@/lib/logger'
import { 
import { logger } from '@/lib/logger'
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { logger } from '@/lib/logger'
import { Badge } from "@/components/ui/badge"
import { logger } from '@/lib/logger'
import { useDashboardStats } from "@/hooks/api/use-dashboard"
import { logger } from '@/lib/logger'

interface DashboardStatsProps {
  loading?: boolean
  className?: string
}

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    label?: string
    period?: string
  }
  icon?: React.ReactNode
  className?: string
  loading?: boolean
  variant?: "default" | "revenue" | "users" | "properties" | "maintenance"
}

const statVariants = {
  default: {
    iconBg: "bg-primary/10 text-primary",
    cardBg: "bg-gradient-subtle"
  },
  revenue: {
    iconBg: "bg-green-500/10 text-green-600",
    cardBg: "bg-gradient-to-br from-green-50/50 to-emerald-50/30"
  },
  users: {
    iconBg: "bg-blue-500/10 text-blue-600", 
    cardBg: "bg-gradient-to-br from-blue-50/50 to-indigo-50/30"
  },
  properties: {
    iconBg: "bg-orange-500/10 text-orange-600",
    cardBg: "bg-gradient-to-br from-orange-50/50 to-amber-50/30"
  },
  maintenance: {
    iconBg: "bg-red-500/10 text-red-600",
    cardBg: "bg-gradient-to-br from-red-50/50 to-rose-50/30"
  }
}

export function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  className,
  loading = false,
  variant = "default"
}: StatCardProps) {
  const variantStyles = statVariants[variant]

  if (loading) {
    return (
      <Card className={cn("card-modern", variantStyles.cardBg, className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-[140px]" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-[100px]" />
          <Skeleton className="h-4 w-[160px]" />
        </CardContent>
      </Card>
    )
  }

  const getTrendIcon = () => {
    if (!trend) return null
    
    if (trend.value > 0) {
      return <ArrowUpRight className="h-4 w-4" />
    } else if (trend.value < 0) {
      return <ArrowDownRight className="h-4 w-4" />
    } else {
      return <Minus className="h-4 w-4" />
    }
  }

  const getTrendColor = () => {
    if (!trend) return "text-muted-foreground"
    
    if (trend.value > 0) {
      return "text-green-600 dark:text-green-400"
    } else if (trend.value < 0) {
      return "text-red-600 dark:text-red-400"
    } else {
      return "text-muted-foreground"
    }
  }

  return (
    <Card className={cn(
      "card-modern hover:bg-gradient-radial-steel transition-all duration-300",
      variantStyles.cardBg,
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-heading text-muted-foreground tracking-tight">
          {title}
        </CardTitle>
        {icon && (
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            variantStyles.iconBg
          )}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-3xl font-bold font-display text-foreground tracking-tight">
          {value}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {trend && (
            <div className={cn("flex items-center gap-1", getTrendColor())}>
              {getTrendIcon()}
              <span className="font-semibold">
                {trend.value > 0 ? "+" : ""}{trend.value}%
              </span>
              {trend.period && (
                <span className="text-muted-foreground">
                  {trend.period}
                </span>
              )}
            </div>
          )}
          {description && (
            <p className="text-muted-foreground font-medium">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardStats({ loading: forcedLoading = false, className }: DashboardStatsProps) {
  // Use React Query hook for real-time data
  const { data: dashboardStats, isLoading, error } = useDashboardStats({
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const isLoadingState = forcedLoading || isLoading;

  // Show error state with fallback data
  if (error && !isLoadingState) {
    logger.error('Dashboard stats error:', error instanceof Error ? error : new Error(String(error)), { component: 'dashboardstats' });
  }

  const stats = [
    {
      title: "Total Revenue",
      value: dashboardStats?.leases?.totalRentRoll ? 
        `$${dashboardStats.leases.totalRentRoll.toLocaleString()}` : 
        "$0",
      description: "Monthly collected rent", 
      trend: { 
        value: 0, // TODO: Add growth calculation
        period: "from last month" 
      },
      icon: <DollarSign className="h-4 w-4" />,
      variant: "revenue" as const
    },
    {
      title: "Active Tenants",
      value: dashboardStats?.tenants?.activeTenants?.toLocaleString() || "0",
      description: "Currently occupied units",
      trend: { value: 8.2, period: "from last month" },
      icon: <Users className="h-4 w-4" />,
      variant: "users" as const
    },
    {
      title: "Properties",
      value: dashboardStats?.properties?.totalProperties?.toString() || "0",
      description: "Total properties managed",
      trend: { value: 4.1, period: "from last quarter" },
      icon: <Home className="h-4 w-4" />,
      variant: "properties" as const
    },
    {
      title: "Maintenance Requests",
      value: dashboardStats?.maintenanceRequests?.open?.toString() || "0",
      description: "Pending requests",
      trend: { value: -15.3, period: "from last week" },
      icon: <Wrench className="h-4 w-4" />,
      variant: "maintenance" as const
    }
  ]

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          description={stat.description}
          trend={stat.trend}
          icon={stat.icon}
          variant={stat.variant}
          loading={isLoadingState}
        />
      ))}
    </div>
  )
}

// Enhanced stat card with chart area (following shadcn dashboard patterns)
interface StatCardWithChartProps extends StatCardProps {
  chart?: React.ReactNode
  footerContent?: React.ReactNode
}

export function StatCardWithChart({
  title,
  value,
  description,
  trend,
  icon,
  chart,
  footerContent,
  className,
  loading = false,
  variant = "default"
}: StatCardWithChartProps) {
  const variantStyles = statVariants[variant]

  if (loading) {
    return (
      <Card className={cn("card-modern", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-[140px]" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-[100px]" />
          <Skeleton className="h-3 w-[160px]" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "card-modern",
      variantStyles.cardBg,
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-2xl font-bold font-display text-foreground">
            {value}
          </div>
        </div>
        {icon && (
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            variantStyles.iconBg
          )}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {trend && (
          <div className="flex items-center gap-2 text-xs">
            <div className={cn(
              "flex items-center gap-1",
              trend.value > 0 ? "text-green-600" : "text-red-600"
            )}>
              {trend.value > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span className="font-medium">
                {trend.value > 0 ? "+" : ""}{trend.value}%
              </span>
            </div>
            {trend.period && (
              <span className="text-muted-foreground">{trend.period}</span>
            )}
          </div>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        
        {chart && (
          <div className="h-[200px]">{chart}</div>
        )}
        
        {footerContent && (
          <div className="pt-2 border-t border-border/50">
            {footerContent}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Property Management Overview Component
interface PropertyOverviewProps {
  occupancyRate: number
  totalUnits: number
  occupiedUnits: number
  maintenanceCount: number
  className?: string
}

export function PropertyOverview({
  occupancyRate,
  totalUnits,
  occupiedUnits,
  maintenanceCount,
  className
}: PropertyOverviewProps) {
  return (
    <Card className={cn("card-modern", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-heading">Property Overview</CardTitle>
        <CardDescription>
          Current occupancy and maintenance status across all properties
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Occupancy Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Occupancy Rate</span>
            <span className="font-semibold text-foreground">{occupancyRate}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-primary transition-all duration-300"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{occupiedUnits} occupied</span>
            <span>{totalUnits} total units</span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs font-medium">
            {occupiedUnits}/{totalUnits} Units Occupied
          </Badge>
          {maintenanceCount > 0 && (
            <Badge variant="outline" className="text-xs font-medium text-orange-600 border-orange-200">
              {maintenanceCount} Maintenance Requests
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}