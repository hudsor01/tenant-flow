/**
 * Centered Container Components
 * 
 * Consolidated utility components for consistent full-height centered layouts.
 * Eliminates duplication of common centering patterns for loading, error, and content states.
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const centeredContainerVariants = cva(
  'flex items-center justify-center',
  {
    variants: {
      height: {
        screen: 'min-h-screen',
        large: 'min-h-[400px]',
        medium: 'min-h-[300px]',
        small: 'min-h-[200px]',
        auto: 'h-auto'
      },
      background: {
        none: '',
        muted: 'bg-gray-50',
        gradient: 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800',
        card: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'
      },
      padding: {
        none: 'p-0',
        sm: 'p-4', 
        md: 'p-6',
        lg: 'p-8'
      }
    },
    defaultVariants: {
      height: 'screen',
      background: 'none',
      padding: 'md'
    }
  }
)

interface CenteredContainerProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof centeredContainerVariants> {
  children: React.ReactNode
}

export const CenteredContainer = React.forwardRef<HTMLDivElement, CenteredContainerProps>(
  ({ className, height, background, padding, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(centeredContainerVariants({ height, background, padding, className }))}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CenteredContainer.displayName = 'CenteredContainer'

// Specialized variants for common use cases
export const LoadingScreen: React.FC<{ 
  children: React.ReactNode
  background?: VariantProps<typeof centeredContainerVariants>['background']
  className?: string
}> = ({ children, background = 'muted', className }) => (
  <CenteredContainer height="screen" background={background} className={className}>
    <div className="text-center">
      {children}
    </div>
  </CenteredContainer>
)

export const ErrorScreen: React.FC<{
  children: React.ReactNode
  background?: VariantProps<typeof centeredContainerVariants>['background'] 
  className?: string
}> = ({ children, background = 'card', className }) => (
  <CenteredContainer height="screen" background={background} className={className}>
    <div className="text-center space-y-6 max-w-md mx-auto">
      {children}
    </div>
  </CenteredContainer>
)

export const EmptyState: React.FC<{
  children: React.ReactNode
  height?: VariantProps<typeof centeredContainerVariants>['height']
  className?: string
}> = ({ children, height = 'large', className }) => (
  <CenteredContainer height={height} background="none" className={className}>
    <div className="text-center">
      {children}
    </div>
  </CenteredContainer>
)