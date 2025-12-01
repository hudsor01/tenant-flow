'use client'

import { MetricCard } from '#components/dashboard/metric-card'
import { type LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'

export type StatCardProps = {
  title: string
  value: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  badge?: ReactNode
  className?: string
  testId?: string
  isLoading?: boolean
}

export function StatCard(props: StatCardProps) {
  return <MetricCard variant="stat" {...props} />
}
