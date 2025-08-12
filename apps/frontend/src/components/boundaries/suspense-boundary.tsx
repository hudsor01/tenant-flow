import React, { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type LoadingVariant = 'spinner' | 'skeleton' | 'minimal' | 'page'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: LoadingVariant
  className?: string
  message?: string
}

function LoadingSpinner({ 
  size = 'md', 
  variant = 'spinner', 
  className, 
  message 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center justify-center p-2", className)}>
        <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      </div>
    )
  }

  if (variant === 'page') {
    return (
      <div className={cn("flex min-h-screen items-center justify-center", className)}>
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          {message && <p className="text-muted-foreground">{message}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <div className="text-center">
        <Loader2 className={cn("mx-auto mb-2 animate-spin", sizeClasses[size])} />
        {message && <p className="text-muted-foreground text-sm">{message}</p>}
      </div>
    </div>
  )
}

interface SuspenseBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  variant?: LoadingVariant
  className?: string
  message?: string
}

export function SuspenseBoundary({ 
  children, 
  fallback, 
  variant = 'spinner', 
  className, 
  message 
}: SuspenseBoundaryProps) {
  const defaultFallback = (
    <LoadingSpinner 
      variant={variant} 
      className={className} 
      message={message} 
    />
  )

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  )
}

// Specific boundary variations
export function DataTableBoundary({ children }: { children: React.ReactNode }) {
  return (
    <SuspenseBoundary variant="minimal" className="min-h-[200px]">
      {children}
    </SuspenseBoundary>
  )
}

export function FormBoundary({ children }: { children: React.ReactNode }) {
  return (
    <SuspenseBoundary variant="spinner" message="Loading form...">
      {children}
    </SuspenseBoundary>
  )
}

export function CardListBoundary({ children }: { children: React.ReactNode }) {
  return (
    <SuspenseBoundary variant="skeleton" className="grid gap-4">
      {children}
    </SuspenseBoundary>
  )
}

export function MinimalBoundary({ children }: { children: React.ReactNode }) {
  return (
    <SuspenseBoundary variant="minimal">
      {children}
    </SuspenseBoundary>
  )
}