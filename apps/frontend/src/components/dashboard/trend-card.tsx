'use client'

import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '#lib/utils'
import type { MetricTrend } from '@repo/shared/types/dashboard-repository'

interface TrendCardProps {
  title: string
  metric: MetricTrend | undefined
  isLoading?: boolean
  valueFormatter?: (value: number) => string
  className?: string
}

export function TrendCard({
  title,
  metric,
  isLoading,
  valueFormatter = (v) => v.toString(),
  className,
}: TrendCardProps) {
  if (isLoading) {
    return (
      <Card className={cn('dashboard-card-surface animate-pulse', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-24 bg-muted rounded" />
          <div className="mt-2 h-4 w-32 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!metric) {
    return (
      <Card className={cn('dashboard-card-surface', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">--</div>
          <p className="text-xs text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  const { current, change, percentChange } = metric
  const isPositive = change > 0
  const isNegative = change < 0
  const isNeutral = change === 0

  const TrendIcon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus
  const trendColor = isPositive
    ? 'text-success'
    : isNegative
      ? 'text-destructive'
      : 'text-muted-foreground'

  return (
    <Card className={cn('dashboard-card-surface', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <TrendIcon className={cn('h-4 w-4', trendColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{valueFormatter(current)}</div>
        <div className="flex items-center gap-1 mt-1">
          <span className={cn('text-xs font-medium', trendColor)}>
            {isPositive && '+'}
            {percentChange.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
        {!isNeutral && (
          <p className="text-xs text-muted-foreground mt-1">
            {isPositive ? '+' : ''}
            {valueFormatter(change)} from previous period
          </p>
        )}
      </CardContent>
    </Card>
  )
}
