/**
 * Icon Container Component
 * 
 * Consolidated utility component for consistent icon containers throughout the app.
 * Eliminates duplication of common flex+center+rounded+background patterns.
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const iconContainerVariants = cva(
  'flex items-center justify-center',
  {
    variants: {
      size: {
        xs: 'h-6 w-6',
        sm: 'h-8 w-8', 
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16'
      },
      variant: {
        primary: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary/10 text-secondary-foreground',
        success: 'bg-green-500/20 text-green-500',
        warning: 'bg-yellow-500/20 text-yellow-500',
        danger: 'bg-red-500/20 text-red-500',
        info: 'bg-blue-500/20 text-blue-500',
        purple: 'bg-purple-500/20 text-purple-500',
        muted: 'bg-muted text-muted-foreground'
      },
      shape: {
        circle: 'rounded-full',
        rounded: 'rounded-lg',
        square: 'rounded-none'
      }
    },
    defaultVariants: {
      size: 'md',
      variant: 'primary', 
      shape: 'circle'
    }
  }
)

interface IconContainerProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconContainerVariants> {
  children: React.ReactNode
}

export const IconContainer = React.forwardRef<HTMLDivElement, IconContainerProps>(
  ({ className, size, variant, shape, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(iconContainerVariants({ size, variant, shape, className }))}
        {...props}
      >
        {children}
      </div>
    )
  }
)

IconContainer.displayName = 'IconContainer'

// Specialized variants for common use cases
export const StatusIcon: React.FC<{ 
  children: React.ReactNode
  status: 'success' | 'warning' | 'danger' | 'info'
  size?: VariantProps<typeof iconContainerVariants>['size']
  className?: string
}> = ({ children, status, size = 'sm', className }) => (
  <IconContainer variant={status} size={size} className={className}>
    {children}
  </IconContainer>
)

export const FeatureIcon: React.FC<{
  children: React.ReactNode
  size?: VariantProps<typeof iconContainerVariants>['size']
  className?: string
}> = ({ children, size = 'md', className }) => (
  <IconContainer variant="primary" size={size} shape="rounded" className={className}>
    {children}
  </IconContainer>
)