"use client"

import * as React from 'react'
import { cn } from '@/lib/design-system'

export interface StatCardProps extends React.ComponentProps<'div'> {
  label: React.ReactNode
  value: React.ReactNode
  hint?: React.ReactNode
  accent?: 'blue' | 'green' | 'amber' | 'purple' | 'primary'
}

export function StatCard({ className, label, value, hint, accent = 'primary', ...props }: StatCardProps) {
  const dot = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    primary: 'bg-primary',
  }[accent]

  return (
    <div className={cn('card-elevated-authority rounded-2xl p-6 text-center', className)} {...props}>
      <div className="flex items-center justify-center gap-2 mb-2 text-muted-foreground">
        <span className={cn('w-2 h-2 rounded-full', dot)} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {hint && <div className="text-xs mt-1 text-muted-foreground">{hint}</div>}
    </div>
  )
}

StatCard.displayName = 'StatCard'

export default StatCard

