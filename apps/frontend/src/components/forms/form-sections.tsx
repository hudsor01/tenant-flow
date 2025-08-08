/**
 * Form Section Components - Server Components
 * 
 * Reusable form section patterns for organizing complex forms
 * Server components for optimal performance and SEO
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

// ============================================================================
// FORM SECTION
// ============================================================================

interface FormSectionProps {
  title?: string
  description?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'card' | 'bordered'
}

export function FormSection({
  title,
  description,
  required = false,
  children,
  className,
  variant = 'default'
}: FormSectionProps) {
  const content = (
    <div className="space-y-6">
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h3 className="text-lg font-medium">
              {title}
              {required && <span className="text-red-500 ml-1">*</span>}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {title && <Separator className="my-4" />}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          {content}
        </CardContent>
      </Card>
    )
  }

  if (variant === 'bordered') {
    return (
      <div className={cn("border rounded-lg p-6", className)}>
        {content}
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {content}
    </div>
  )
}

// ============================================================================
// GRID FORM SECTION
// ============================================================================

interface GridFormSectionProps extends FormSectionProps {
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
}

export function GridFormSection({
  children,
  columns = 2,
  gap = 'md',
  className,
  ...props
}: GridFormSectionProps) {
  const gridClass = cn(
    "grid gap-4",
    columns === 1 && "grid-cols-1",
    columns === 2 && "grid-cols-1 md:grid-cols-2",
    columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    gap === 'sm' && "gap-2",
    gap === 'md' && "gap-4",
    gap === 'lg' && "gap-6"
  )

  return (
    <FormSection {...props} className={className}>
      <div className={gridClass}>
        {children}
      </div>
    </FormSection>
  )
}

// ============================================================================
// COLLAPSIBLE FORM SECTION
// ============================================================================

interface CollapsibleFormSectionProps extends FormSectionProps {
  defaultExpanded?: boolean
}

export function CollapsibleFormSection({
  defaultExpanded: _defaultExpanded = true,
  children,
  ...props
}: CollapsibleFormSectionProps) {
  // For now, render as regular section since we need client component for collapsible
  // TODO: Create separate client component for collapsible behavior
  return (
    <FormSection {...props}>
      {children}
    </FormSection>
  )
}