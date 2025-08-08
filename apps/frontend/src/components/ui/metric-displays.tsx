/**
 * Metric Display Components - Server Components
 * 
 * Reusable metric and statistic display patterns
 * Server components for optimal performance and SEO
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@repo/shared/utils'

// ============================================================================
// METRIC CARD
// ============================================================================

interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period: string
  }
  icon?: React.ReactNode
  className?: string
  format?: 'currency' | 'percentage' | 'number' | 'text'
}

export function MetricCard({
  title,
  value,
  change,
  icon,
  className,
  format = 'text'
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(Number(val))
      case 'percentage':
        return `${val}%`
      case 'number':
        return Number(val).toLocaleString()
      default:
        return val
    }
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(value)}
        </div>
        {change && (
          <p className={cn(
            "text-xs flex items-center gap-1 mt-1",
            change.type === 'increase' ? "text-green-600" : "text-red-600"
          )}>
            <span>
              {change.type === 'increase' ? '↗' : '↘'} {Math.abs(change.value)}%
            </span>
            <span className="text-muted-foreground">
              {change.period}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// STAT GRID
// ============================================================================

interface StatItem {
  label: string
  value: string | number
  icon?: React.ReactNode
  format?: 'currency' | 'percentage' | 'number' | 'text'
  change?: {
    value: number
    type: 'increase' | 'decrease'
  }
}

interface StatGridProps {
  stats: StatItem[]
  columns?: 2 | 3 | 4
  className?: string
}

export function StatGrid({ 
  stats, 
  columns = 4,
  className 
}: StatGridProps) {
  return (
    <div className={cn(
      "grid gap-4",
      columns === 2 && "grid-cols-1 md:grid-cols-2",
      columns === 3 && "grid-cols-1 md:grid-cols-3",
      columns === 4 && "grid-cols-2 md:grid-cols-4",
      className
    )}>
      {stats.map((stat, index) => (
        <MetricCard
          key={index}
          title={stat.label}
          value={stat.value}
          icon={stat.icon}
          format={stat.format}
          change={stat.change ? { ...stat.change, period: 'vs last period' } : undefined}
        />
      ))}
    </div>
  )
}

// ============================================================================
// INLINE METRIC
// ============================================================================

interface InlineMetricProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  format?: 'currency' | 'percentage' | 'number' | 'text'
  className?: string
}

export function InlineMetric({
  label,
  value,
  icon,
  format = 'text',
  className
}: InlineMetricProps) {
  const formatValue = (val: string | number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(Number(val))
      case 'percentage':
        return `${val}%`
      case 'number':
        return Number(val).toLocaleString()
      default:
        return val
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon && (
        <div className="text-muted-foreground flex-shrink-0">
          {icon}
        </div>
      )}
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-base font-semibold">{formatValue(value)}</div>
      </div>
    </div>
  )
}

// ============================================================================
// COMPARISON METRIC
// ============================================================================

interface ComparisonMetricProps {
  title: string
  current: {
    label: string
    value: string | number
  }
  previous: {
    label: string
    value: string | number
  }
  format?: 'currency' | 'percentage' | 'number' | 'text'
  className?: string
}

export function ComparisonMetric({
  title,
  current,
  previous,
  format = 'text',
  className
}: ComparisonMetricProps) {
  const formatValue = (val: string | number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(Number(val))
      case 'percentage':
        return `${val}%`
      case 'number':
        return Number(val).toLocaleString()
      default:
        return val
    }
  }

  const currentNum = Number(current.value)
  const previousNum = Number(previous.value)
  const changePercent = previousNum !== 0 
    ? ((currentNum - previousNum) / previousNum) * 100 
    : 0

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{current.label}</span>
            <span className="font-semibold">{formatValue(current.value)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{previous.label}</span>
            <span className="text-sm">{formatValue(previous.value)}</span>
          </div>
          {changePercent !== 0 && (
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-foreground">Change</span>
              <span className={cn(
                "text-sm font-medium",
                changePercent > 0 ? "text-green-600" : "text-red-600"
              )}>
                {changePercent > 0 ? '↗' : '↘'} {Math.abs(changePercent).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}