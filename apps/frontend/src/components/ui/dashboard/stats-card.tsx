"use client"

import * as React from "react"
import { 
  TrendingUp, 
  TrendingDown,
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

// Container query aware stats card (inspired by tweakcn)
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
        {/* Trend badge positioned absolutely */}
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
        
        {/* Responsive typography using container queries */}
        <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums font-display text-foreground tracking-tight">
          {value}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Icon container with gradient background */}
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