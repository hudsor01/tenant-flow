import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border font-medium transition-all duration-200 w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md hover:scale-105",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md hover:scale-105",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md hover:scale-105",
        success:
          "border-transparent bg-success text-success-foreground shadow-sm hover:bg-success/90 hover:shadow-md hover:scale-105",
        warning:
          "border-transparent bg-warning text-warning-foreground shadow-sm hover:bg-warning/90 hover:shadow-md hover:scale-105",
        info:
          "border-transparent bg-info text-info-foreground shadow-sm hover:bg-info/90 hover:shadow-md hover:scale-105",
        outline:
          "border-border bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:scale-105",
        ghost:
          "border-transparent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground hover:scale-105",
        premium:
          "border-transparent bg-gradient-to-r from-primary to-primary/80 text-white shadow-md hover:shadow-lg hover:from-primary/90 hover:to-primary/70 hover:scale-105",
        brand:
          "border-transparent bg-gradient-to-r from-primary via-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg hover:scale-105 animate-gradient-x bg-size-200",
        glass:
          "border-border/50 bg-background/60 backdrop-blur-sm text-foreground shadow-sm hover:bg-background/80 hover:border-primary/30 hover:scale-105",
        glow:
          "border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:scale-105",
      },
      size: {
        xs: "px-1.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        default: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm",
        xl: "px-4 py-2 text-sm font-semibold",
      },
      shape: {
        default: "rounded-full",
        square: "rounded-md",
        pill: "rounded-full px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, shape, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'span'
    
    return (
      <Comp
        ref={ref}
        className={cn(badgeVariants({ variant, size, shape, className }))}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'

// Status Badge Component for common status indicators
export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending' | 'active' | 'inactive'
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const statusVariants = {
      success: 'success',
      warning: 'warning',
      error: 'destructive',
      info: 'info',
      pending: 'outline',
      active: 'success',
      inactive: 'secondary',
    } as const

    return (
      <Badge
        ref={ref}
        variant={statusVariants[status]}
        className={cn(className)}
        {...props}
      />
    )
  }
)

StatusBadge.displayName = 'StatusBadge'

// Notification Badge Component for counts/numbers
export interface NotificationBadgeProps extends Omit<BadgeProps, 'children'> {
  count: number
  max?: number
  showZero?: boolean
}

const NotificationBadge = React.forwardRef<HTMLSpanElement, NotificationBadgeProps>(
  ({ count, max = 99, showZero = false, className, ...props }, ref) => {
    if (count === 0 && !showZero) return null
    
    const displayCount = count > max ? `${max}+` : count.toString()
    
    return (
      <Badge
        ref={ref}
        variant="destructive"
        size="xs"
        className={cn(
          "absolute -top-2 -right-2 h-5 min-w-5 px-1 py-0 text-xs font-bold",
          className
        )}
        {...props}
      >
        {displayCount}
      </Badge>
    )
  }
)

NotificationBadge.displayName = 'NotificationBadge'

export { Badge, StatusBadge, NotificationBadge, badgeVariants }