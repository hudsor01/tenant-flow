"use client"

import * as React from "react"
import { ArrowDownIcon, ArrowUpIcon, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    label?: string
  }
  icon?: React.ReactNode
  className?: string
  loading?: boolean
}

export function StatsCard({
  title,
  value,
  description,
  trend,
  icon,
  className,
  loading = false,
}: StatsCardProps) {
  if (loading) {
    return (
      <Card className={cn("card-modern bg-gradient-subtle", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-5 w-5 rounded-lg" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-[120px]" />
          <Skeleton className="h-3 w-[80px]" />
        </CardContent>
      </Card>
    )
  }

  const getTrendIcon = () => {
    if (!trend) return null
    
    if (trend.value > 0) {
      return <ArrowUpIcon className="h-4 w-4 text-green-600" />
    } else if (trend.value < 0) {
      return <ArrowDownIcon className="h-4 w-4 text-red-600" />
    } else {
      return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTrendColor = () => {
    if (!trend) return ""
    
    if (trend.value > 0) {
      return "text-green-600"
    } else if (trend.value < 0) {
      return "text-red-600"
    } else {
      return "text-muted-foreground"
    }
  }

  return (
    <Card className={cn("card-modern bg-gradient-subtle hover:bg-gradient-radial-steel transition-all duration-300", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium font-heading text-foreground tracking-tight">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-primary/70 p-2 rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-bold font-display text-foreground tracking-tight">
          {value}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {trend && (
            <div className={cn("flex items-center gap-1.5", getTrendColor())}>
              {getTrendIcon()}
              <span className="font-semibold">
                {trend.value > 0 ? "+" : ""}{trend.value}%
              </span>
              {trend.label && (
                <span className="text-muted-foreground font-medium">
                  {trend.label}
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