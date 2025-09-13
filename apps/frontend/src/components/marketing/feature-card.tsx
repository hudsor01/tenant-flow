"use client"

import * as React from 'react'
import { cn } from '@/lib/design-system'
import { TYPOGRAPHY_SCALE } from '@repo/shared'

export interface FeatureCardProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  icon?: React.ComponentType<{ className?: string }>
  title: React.ReactNode
  description?: React.ReactNode
  accent?: 'blue' | 'green' | 'amber' | 'purple' | 'primary'
}

export function FeatureCard({
  className,
  icon: Icon,
  title,
  description,
  accent = 'primary',
  ...props
}: FeatureCardProps) {
  const accentMap = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-purple-500 to-fuchsia-500',
    primary: 'from-primary to-primary/80',
  }

  return (
    <div className={cn('card-elevated-authority rounded-2xl p-6', className)} {...props}>
      <div className="flex items-start gap-4">
        {Icon && (
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white', `bg-gradient-to-r ${accentMap[accent]}`)}>
            <Icon className="w-6 h-6" />
          </div>
        )}
        <div>
          <h3 className="mb-1 text-foreground" style={TYPOGRAPHY_SCALE['heading-md']}>
            {title}
          </h3>
          {description && (
            <p className="text-muted-foreground" style={TYPOGRAPHY_SCALE['body-sm']}>
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

FeatureCard.displayName = 'FeatureCard'

export default FeatureCard

