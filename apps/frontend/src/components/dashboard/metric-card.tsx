'use client'

import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { ErrorBoundary } from '#components/ui/error-boundary'
import { cn } from '#lib/utils'
import type { MetricTrend } from '@repo/shared/types/dashboard-repository'
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'

type BaseMetricCardProps = {
  title: string
  className?: string
  icon?: LucideIcon
  badge?: ReactNode
  /**
   * Customise the rendered data-testid. Defaults to `stat-card` or `trend-card` based on the variant.
   * Keeping these defaults preserves our existing e2e selectors.
   */
  testId?: string
}

type StatVariantProps = BaseMetricCardProps & {
  variant?: 'stat'
  value: ReactNode
  description?: ReactNode
  isLoading?: boolean
}

type TrendVariantProps = BaseMetricCardProps & {
  variant: 'trend'
  metric: MetricTrend | null | undefined
  isLoading?: boolean
  valueFormatter?: (value: number) => string
  comparisonLabel?: string
  changeLabel?: string
  emptyLabel?: string
}

export type MetricCardProps = StatVariantProps | TrendVariantProps

const defaultValueFormatter = (value: number) => value.toString()

export function MetricCard(props: MetricCardProps) {
  if (props.variant === 'trend') {
    return <TrendMetricCard {...props} />
  }

  return <StatMetricCard {...props} />
}

function StatMetricCard(props: StatVariantProps) {
  const {
    title,
    value,
    description,
    icon: Icon,
    badge,
    className,
    testId,
    isLoading,
  } = props

  if (isLoading) {
    return (
      <div
        data-testid={testId ?? 'stat-card'}
        role="region"
        aria-label={title}
        className={cn('stat-card-professional p-6 animate-pulse', className)}
      >
        <div className="h-5 w-32 bg-muted rounded mb-4" />
        <div className="h-9 w-24 bg-muted rounded mb-2" />
        <div className="h-4 w-full bg-muted rounded" />
      </div>
    )
  }

  return (
    <div
      data-testid={testId ?? 'stat-card'}
      role="region"
      aria-label={title}
      className={cn('stat-card-professional', className)}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase leading-tight">
            {title}
          </p>
          <div className="flex items-center gap-2">
            {badge}
            {Icon && (
              <div className="icon-bg-primary rounded-full p-2">
                <Icon className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-responsive-h1 font-bold tracking-tight text-foreground">
            {value}
          </h3>
          {description && (
            <p className="text-muted leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function TrendMetricCard(props: TrendVariantProps) {
  const {
    title,
    metric,
    isLoading = false,
    valueFormatter = defaultValueFormatter,
    className,
    comparisonLabel = 'vs last month',
    changeLabel = 'from previous period',
    emptyLabel = 'No data available',
    icon: Icon,
    badge,
    testId,
  } = props

  const fallback = (
    <Card
      data-testid={testId ?? 'trend-card'}
      className={cn('dashboard-card-surface', className)}
      role="region"
      aria-label={`${title} trend`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">--</div>
        <p className="text-xs text-muted-foreground">Error loading data</p>
      </CardContent>
    </Card>
  )

  return (
    <ErrorBoundary fallback={fallback}>
      {isLoading ? (
        <Card
          data-testid={testId ?? 'trend-card'}
          className={cn('dashboard-card-surface animate-pulse', className)}
          role="region"
          aria-label={`${title} trend`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {Icon && (
              <div className="icon-bg-primary rounded-full p-2">
                <Icon className="h-4 w-4" />
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-8 w-24 bg-muted rounded" />
            <div className="mt-2 h-4 w-32 bg-muted rounded" />
          </CardContent>
        </Card>
      ) : !metric ? (
        <Card
          data-testid={testId ?? 'trend-card'}
          className={cn('dashboard-card-surface', className)}
          role="region"
          aria-label={`${title} trend`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {Icon && (
              <div className="icon-bg-primary rounded-full p-2">
                <Icon className="h-4 w-4" />
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">{emptyLabel}</p>
          </CardContent>
        </Card>
      ) : (
        <Card
          data-testid={testId ?? 'trend-card'}
          className={cn('dashboard-card-surface', className)}
          role="region"
          aria-label={`${title} trend`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              {badge}
              {Icon && (
                <div className="icon-bg-primary rounded-full p-2">
                  <Icon className="h-4 w-4" />
                </div>
              )}
            </div>
            {renderTrendIndicator(metric)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {valueFormatter(metric.current ?? 0)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className={cn('text-xs font-medium', getTrendColor(metric))}>
                {metric.change > 0 && '+'}
                {(metric.percentChange ?? 0).toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">{comparisonLabel}</span>
            </div>
            {metric.change !== 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {metric.change > 0 ? '+' : ''}
                {valueFormatter(metric.change ?? 0)} {changeLabel}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </ErrorBoundary>
  )
}

function renderTrendIndicator(metric: MetricTrend) {
  const isPositive = (metric.change ?? 0) > 0
  const isNegative = (metric.change ?? 0) < 0
  const TrendIcon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus

  return (
    <TrendIcon
      className={cn('h-4 w-4', getTrendColor(metric))}
      aria-hidden="true"
    />
  )
}

function getTrendColor(metric: MetricTrend) {
  if ((metric.change ?? 0) > 0) return 'text-success'
  if ((metric.change ?? 0) < 0) return 'text-destructive'
  return 'text-muted-foreground'
}
