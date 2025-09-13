"use client"

import * as React from 'react'
import { cn, containerClasses } from '@/lib/design-system'

type SectionSize = 'sm' | 'md' | 'lg' | 'xl'
type SectionBackground = 'none' | 'authority' | 'professional'

export interface SectionProps extends React.ComponentProps<'section'> {
  size?: SectionSize
  background?: SectionBackground
  center?: boolean
  containerClassName?: string
}

export function Section({
  className,
  children,
  size = 'lg',
  background = 'none',
  center = false,
  containerClassName,
  ...props
}: SectionProps) {
  const pad = size === 'sm' ? 'py-8' : size === 'md' ? 'py-12' : size === 'lg' ? 'py-16' : 'py-24'
  const bg = background === 'authority' ? 'gradient-authority' : background === 'professional' ? 'gradient-professional' : ''

  return (
    <section className={cn(pad, bg, className)} {...props}>
      <div className={cn(containerClasses('xl'), center && 'text-center', containerClassName)}>
        {children}
      </div>
    </section>
  )
}

Section.displayName = 'Section'

export default Section

