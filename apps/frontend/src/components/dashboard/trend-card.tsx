'use client'

import { MetricCard } from '#components/dashboard/metric-card'
import type { MetricTrend } from '@repo/shared/types/dashboard-repository'
import { type LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'

export type TrendCardProps = {
  title: string
  metric: MetricTrend | null | undefined
  isLoading?: boolean
  valueFormatter?: (value: number) => string
  className?: string
  comparisonLabel?: string
  changeLabel?: string
  emptyLabel?: string
  icon?: LucideIcon
  badge?: ReactNode
  testId?: string
}

export function TrendCard(props: TrendCardProps) {
  return <MetricCard variant="trend" {...props} />
}
