"use client"

import * as React from "react"
import { 
  TrendingUp, 
  TrendingDown
} from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    label?: string
    period?: string
    isPositive?: boolean
  }
  icon?: React.ReactNode
  className?: string
  loading?: boolean
  variant?: "revenue" | "tenants" | "properties" | "maintenance" | "occupancy" | "default"
}

const cardVariants = {
  default: {
    gradient: "bg-gradient-to-br from-slate-50/80 to-gray-50/60 dark:from-slate-900/80 dark:to-gray-900/60",
    iconBg: "bg-primary/10 text-primary",
    border: "border-border/50"
  },
  revenue: {
    gradient: "bg-gradient-to-br from-emerald-50/80 to-green-50/60 dark:from-emerald-950/80 dark:to-green-950/60",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200/50 dark:border-emerald-800/50"
  },
  tenants: {
    gradient: "bg-gradient-to-br from-blue-50/80 to-indigo-50/60 dark:from-blue-950/80 dark:to-indigo-950/60",
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    border: "border-blue-200/50 dark:border-blue-800/50"
  },
  properties: {
    gradient: "bg-gradient-to-br from-amber-50/80 to-orange-50/60 dark:from-amber-950/80 dark:to-orange-950/60",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    border: "border-amber-200/50 dark:border-amber-800/50"
  },
  maintenance: {
    gradient: "bg-gradient-to-br from-red-50/80 to-rose-50/60 dark:from-red-950/80 dark:to-rose-950/60",
    iconBg: "bg-red-500/10 text-red-600 dark:text-red-400",
    border: "border-red-200/50 dark:border-red-800/50"
  },
  occupancy: {
    gradient: "bg-gradient-to-br from-purple-50/80 to-violet-50/60 dark:from-purple-950/80 dark:to-violet-950/60",
    iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    border: "border-purple-200/50 dark:border-purple-800/50"
  }
}

export function StatsCard({
  title,
  value,
  description,
  trend,
  icon,
  className,
  loading = false,
  variant = "default"
}: StatsCardProps) {
  const styles = cardVariants[variant]

  if (loading) {
    return (
      <Card className={cn("@container/card card-modern", className)}>
        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="@[250px]/card:h-12 h-10 @[250px]/card:w-32 w-24 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    )
  }

  const trendColor = trend?.isPositive !== false 
    ? trend?.value && trend.value > 0 
      ? "text-emerald-600 dark:text-emerald-400" 
      : trend?.value && trend.value < 0 
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground"
    : trend?.value && trend.value > 0
      ? "text-red-600 dark:text-red-400"
      : "text-emerald-600 dark:text-emerald-400"

  const trendIcon = trend?.value && trend.value > 0 
    ? (trend.isPositive !== false ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />)
    : trend?.value && trend.value < 0
      ? (trend.isPositive !== false ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />)
      : null

  return (
    <Card className={cn(
      "@container/card card-modern transition-all duration-300 hover:shadow-md",
      styles.gradient,
      styles.border,
      className
    )}>
      <CardHeader className="relative pb-2">
        {trend && (
          <Badge 
            variant="secondary" 
            className={cn(
              "absolute top-4 right-4 @[200px]/card:flex hidden items-center gap-1 text-xs font-medium",
              trendColor
            )}
          >
            {trendIcon}
            <span>
              {trend.value > 0 ? "+" : ""}{Math.abs(trend.value)}%
            </span>
          </Badge>
        )}
        
        <CardDescription className="text-sm font-medium text-muted-foreground">
          {title}
        </CardDescription>
        
        <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums font-display text-foreground tracking-tight">
          {value}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {icon && (
          <div className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg mb-2",
            styles.iconBg
          )}>
            {icon}
          </div>
        )}
      </CardContent>

      {(description || trend) && (
        <CardFooter className="pt-0">
          <div className="flex @[250px]/card:items-center items-start @[250px]/card:justify-between @[250px]/card:flex-row flex-col gap-2 text-xs">
            {description && (
              <span className="text-muted-foreground font-medium">
                {description}
              </span>
            )}
            {trend && (
              <div className={cn(
                "@[250px]/card:hidden flex items-center gap-1 font-medium",
                trendColor
              )}>
                {trendIcon}
                <span>{trend.value > 0 ? "+" : ""}{Math.abs(trend.value)}%</span>
                {trend.period && (
                  <span className="text-muted-foreground ml-1">{trend.period}</span>
                )}
              </div>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

interface StatsGridProps {
  children: React.ReactNode
  className?: string
  columns?: 2 | 3 | 4
}

export function StatsGrid({ children, className, columns = 4 }: StatsGridProps) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  }

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  )
}

// Property Management specific stats cards
export function PropertyStatsCards({ loading = false }: { loading?: boolean }) {
  return (
    <StatsGrid>
      <StatsCard
        title="Total Properties"
        value="24"
        description="Active properties"
        trend={{ value: 8, label: "from last month" }}
        icon={<TrendingUp className="h-4 w-4" />}
        loading={loading}
      />
      <StatsCard
        title="Occupancy Rate"
        value="92%"
        description="Currently occupied"
        trend={{ value: 3.2, label: "from last month" }}
        icon={<TrendingUp className="h-4 w-4" />}
        loading={loading}
      />
      <StatsCard
        title="Monthly Revenue"
        value="$45,231"
        description="Total collected rent"
        trend={{ value: 12.5, label: "from last month" }}
        icon={<TrendingUp className="h-4 w-4" />}
        loading={loading}
      />
      <StatsCard
        title="Maintenance Requests"
        value="7"
        description="Pending requests"
        trend={{ value: -15, label: "from last week" }}
        icon={<TrendingDown className="h-4 w-4" />}
        loading={loading}
      />
    </StatsGrid>
  )
}

// Enhanced stats card with chart
interface StatsCardWithChartProps extends StatsCardProps {
  chart?: React.ReactNode
}

export function StatsCardWithChart({
  title,
  value,
  description,
  trend,
  icon,
  chart,
  className,
  loading = false,
}: StatsCardWithChartProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-[120px] mb-2" />
          <Skeleton className="h-3 w-[80px] mb-4" />
          <Skeleton className="h-[80px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mb-4">
          {trend && (
            <span className={cn(
              "font-medium",
              trend.value > 0 ? "text-green-600" : "text-red-600"
            )}>
              {trend.value > 0 ? "+" : ""}{trend.value}%
            </span>
          )}
          {trend?.label && ` ${trend.label}`}
          {description && ` • ${description}`}
        </p>
        {chart && <div className="h-[80px]">{chart}</div>}
      </CardContent>
    </Card>
  )
}