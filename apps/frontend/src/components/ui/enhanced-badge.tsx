import React, { forwardRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { badgeVariants, statusVariants, type BadgeVariants, type StatusVariants } from './variants'

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    BadgeVariants {
  dismissible?: boolean
  onDismiss?: () => void
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({
    className,
    variant,
    size,
    rounded,
    interactive,
    dismissible = false,
    onDismiss,
    leftIcon,
    rightIcon,
    children,
    ...props
  }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant, size, rounded, interactive, className }))}
      {...props}
    >
      {leftIcon && (
        <span className="mr-1">{leftIcon}</span>
      )}
      
      {children}
      
      {rightIcon && !dismissible && (
        <span className="ml-1">{rightIcon}</span>
      )}
      
      {dismissible && (
        <button
          onClick={onDismiss}
          className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
          aria-label="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
)
Badge.displayName = "Badge"

// Status Badge specifically for property management states
export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Omit<StatusVariants, 'status'> {
  status: string
  animated?: boolean
  showIcon?: boolean
}

const StatusBadge = forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({
    className,
    status,
    size,
    animated = false,
    showIcon = false,
    ...props
  }, ref) => {
    // Map status to icon
    const getStatusIcon = (status: string) => {
      const statusLower = status.toLowerCase()
      switch (statusLower) {
        case 'active':
        case 'occupied':
        case 'completed':
        case 'accepted':
          return '✓'
        case 'vacant':
        case 'pending':
        case 'invited':
          return '○'
        case 'maintenance':
        case 'high':
        case 'urgent':
          return '⚠'
        case 'emergency':
          return '🚨'
        case 'expired':
        case 'terminated':
        case 'failed':
        case 'declined':
          return '✗'
        default:
          return null
      }
    }

    const icon = showIcon ? getStatusIcon(status) : null
    
    return (
      <div
        ref={ref}
        className={cn(
          statusVariants({ 
            status: status.toLowerCase() as any, 
            size, 
            animated,
            className 
          })
        )}
        {...props}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
      </div>
    )
  }
)
StatusBadge.displayName = "StatusBadge"

// Priority Badge for maintenance requests
export interface PriorityBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Pick<StatusVariants, 'size' | 'animated'> {
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'emergency'
  showDot?: boolean
}

const PriorityBadge = forwardRef<HTMLDivElement, PriorityBadgeProps>(
  ({
    className,
    priority,
    size,
    animated = false,
    showDot = true,
    ...props
  }, ref) => {
    const getDotColor = (priority: string) => {
      switch (priority) {
        case 'low': return 'bg-gray-400'
        case 'medium': return 'bg-yellow-400'
        case 'high': return 'bg-orange-400'
        case 'urgent': return 'bg-red-400'
        case 'emergency': return 'bg-red-600'
        default: return 'bg-gray-400'
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          statusVariants({ 
            status: priority, 
            size, 
            animated: animated || priority === 'emergency',
            className 
          })
        )}
        {...props}
      >
        {showDot && (
          <span 
            className={cn(
              "inline-block w-2 h-2 rounded-full mr-2",
              getDotColor(priority)
            )}
          />
        )}
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </div>
    )
  }
)
PriorityBadge.displayName = "PriorityBadge"

// Metric Badge for displaying numbers with context
export interface MetricBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Pick<BadgeVariants, 'variant' | 'size'> {
  value: number | string
  label?: string
  trend?: 'up' | 'down' | 'neutral'
  formatValue?: (value: number | string) => string
}

const MetricBadge = forwardRef<HTMLDivElement, MetricBadgeProps>(
  ({
    className,
    variant = 'default',
    size,
    value,
    label,
    trend,
    formatValue,
    ...props
  }, ref) => {
    const formattedValue = formatValue ? formatValue(value) : value.toString()
    
    const getTrendIcon = (trend?: string) => {
      switch (trend) {
        case 'up': return '↗'
        case 'down': return '↘'
        case 'neutral': return '→'
        default: return null
      }
    }
    
    const getTrendColor = (trend?: string) => {
      switch (trend) {
        case 'up': return 'text-green-600'
        case 'down': return 'text-red-600'
        case 'neutral': return 'text-gray-600'
        default: return ''
      }
    }

    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        <span className="font-bold">{formattedValue}</span>
        {label && <span className="ml-1 font-normal">{label}</span>}
        {trend && (
          <span className={cn("ml-1", getTrendColor(trend))}>
            {getTrendIcon(trend)}
          </span>
        )}
      </div>
    )
  }
)
MetricBadge.displayName = "MetricBadge"

export { Badge, StatusBadge, PriorityBadge, MetricBadge }