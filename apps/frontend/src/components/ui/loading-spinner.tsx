"use client"

import { cn } from '@/lib/utils'
import { Loader2, RefreshCw, RotateCw } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'default' | 'lg' | 'xl'
  variant?: 'default' | 'primary' | 'muted'
  className?: string
  text?: string
  icon?: 'loader' | 'refresh' | 'rotate'
}

const sizeClasses = {
  sm: 'w-4 h-4',
  default: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
}

const variantClasses = {
  default: 'text-foreground',
  primary: 'text-primary',
  muted: 'text-muted-foreground'
}

const textSizeClasses = {
  sm: 'text-xs',
  default: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg'
}

function LoadingSpinner({
  size = 'default',
  variant = 'default',
  className,
  text,
  icon = 'loader',
  ...props
}: LoadingSpinnerProps & React.HTMLAttributes<HTMLDivElement>) {
  const IconComponent = {
    loader: Loader2,
    refresh: RefreshCw,
    rotate: RotateCw
  }[icon]

  const content = (
    <div className={cn(
      "flex items-center justify-center",
      text ? "flex-col gap-3" : "",
      className
    )} {...props}>
      <IconComponent
        className={cn(
          sizeClasses[size],
          variantClasses[variant],
          // Apple motion - smooth spinner rotation with satisfying timing
          "animate-spin [animation-duration:var(--duration-breathe)] [animation-timing-function:linear]"
        )}
      />
      {text && (
        <p className={cn(
          textSizeClasses[size],
          variantClasses[variant],
          "font-medium",
          // Apple breathing animation for text
          "animate-pulse [animation-duration:var(--duration-breathe)] [animation-timing-function:var(--ease-in-out-circ)]"
        )}>
          {text}
        </p>
      )}
    </div>
  )

  return content
}

// Page-level loading component
function PageLoader({ 
  text = "Loading...", 
  className,
  ...props 
}: { text?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(
      "flex items-center justify-center min-h-screen bg-background",
      className
    )} {...props}>
      <div className="text-center space-y-4">
        <LoadingSpinner size="xl" variant="primary" />
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground">{text}</p>
          <p className="text-sm text-muted-foreground">
            This should only take a moment
          </p>
        </div>
      </div>
    </div>
  )
}

// Button loading state
function ButtonLoader({ 
  size = 'sm',
  text,
  className,
  ...props 
}: LoadingSpinnerProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <LoadingSpinner size={size} className="text-current" />
      {text && <span>{text}</span>}
    </div>
  )
}

// Card/Section loading overlay with Apple glass morphism
function SectionLoader({
  text,
  className,
  children,
  ...props
}: {
  text?: string
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative", className)} {...props}>
      {/* Apple Glass Backdrop */}
      <div className="absolute inset-0 glass-apple z-10 flex items-center justify-center rounded-lg">
        <div className="card-elevated p-6">
          <LoadingSpinner
            size="lg"
            variant="primary"
            text={text}
          />
        </div>
      </div>

      {/* Content (blurred with Apple motion) */}
      <div className="opacity-50 pointer-events-none transition-all [transition-duration:var(--duration-medium)] [transition-timing-function:var(--ease-out-expo)]">
        {children}
      </div>
    </div>
  )
}

// Inline loading for tables/lists
function InlineLoader({ 
  size = 'sm',
  className,
  ...props 
}: LoadingSpinnerProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)} {...props}>
      <LoadingSpinner size={size} variant="muted" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  )
}

// Apple Loading Dots - Satisfying bounce animation with Apple timing
function LoadingDots({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: {
  variant?: 'default' | 'primary' | 'muted'
  size?: 'sm' | 'default' | 'lg'
} & React.HTMLAttributes<HTMLDivElement>) {
  const dotSize = {
    sm: 'w-1 h-1',
    default: 'w-2 h-2',
    lg: 'w-3 h-3'
  }[size]

  const dotSpacing = {
    sm: 'gap-1',
    default: 'gap-1.5',
    lg: 'gap-2'
  }[size]

  return (
    <div className={cn("flex items-center", dotSpacing, className)} {...props}>
      <div
        className={cn(
          dotSize,
          "rounded-full animate-bounce bg-current",
          variantClasses[variant],
          // Apple motion - satisfying bounce with spring easing
          "[animation-duration:var(--duration-breathe)] [animation-timing-function:var(--ease-spring)]"
        )}
        style={{ animationDelay: '0ms' }}
      />
      <div
        className={cn(
          dotSize,
          "rounded-full animate-bounce bg-current",
          variantClasses[variant],
          "[animation-duration:var(--duration-breathe)] [animation-timing-function:var(--ease-spring)]"
        )}
        style={{ animationDelay: '200ms' }}
      />
      <div
        className={cn(
          dotSize,
          "rounded-full animate-bounce bg-current",
          variantClasses[variant],
          "[animation-duration:var(--duration-breathe)] [animation-timing-function:var(--ease-spring)]"
        )}
        style={{ animationDelay: '400ms' }}
      />
    </div>
  )
}

export {
  LoadingSpinner,
  PageLoader,
  ButtonLoader,
  SectionLoader,
  InlineLoader,
  LoadingDots
}