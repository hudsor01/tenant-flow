"use client"

import * as React from 'react'
import { cn } from '@/lib/design-system'

export interface SectionHeaderProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  align?: 'left' | 'center'
  gradientTitle?: boolean
}

export function SectionHeader({
  className,
  eyebrow,
  title,
  subtitle,
  align = 'center',
  gradientTitle = true,
  ...props
}: SectionHeaderProps) {
  return (
    <div className={cn('space-y-4 mb-10', align === 'center' && 'text-center', className)} {...props}>
      {eyebrow && (
        <div className={cn('inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-muted/40 border', align === 'center' ? 'mx-auto' : '')}>
          {eyebrow}
        </div>
      )}
      <h2
        className={cn(gradientTitle && 'text-gradient', 'text-section-title')}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-muted-foreground max-w-2xl leading-relaxed text-body"> 
          {subtitle}
        </p>
      )}
    </div>
  )
}

SectionHeader.displayName = 'SectionHeader'

export default SectionHeader

