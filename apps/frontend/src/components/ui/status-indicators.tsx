/**
 * Status Indicator Components - Server Components
 * 
 * Reusable status indicators for different states
 * Server components for optimal performance
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Info
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// ============================================================================
// STATUS BADGE
// ============================================================================

interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'in-progress' | 'completed' | 'cancelled' | 'draft'
  text?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function StatusBadge({ 
  status, 
  text, 
  className,
  size = 'md' 
}: StatusBadgeProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      variant: 'secondary' as const,
      text: text || 'Pending',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    },
    approved: {
      icon: CheckCircle,
      variant: 'default' as const,
      text: text || 'Approved',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    rejected: {
      icon: XCircle,
      variant: 'destructive' as const,
      text: text || 'Rejected',
      className: 'bg-red-100 text-red-800 border-red-200'
    },
    'in-progress': {
      icon: Clock,
      variant: 'secondary' as const,
      text: text || 'In Progress',
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    completed: {
      icon: CheckCircle,
      variant: 'default' as const,
      text: text || 'Completed',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    cancelled: {
      icon: XCircle,
      variant: 'secondary' as const,
      text: text || 'Cancelled',
      className: 'bg-gray-100 text-gray-800 border-gray-200'
    },
    draft: {
      icon: Info,
      variant: 'outline' as const,
      text: text || 'Draft',
      className: 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        "flex items-center gap-1",
        config.className,
        size === 'sm' && "text-xs py-0.5 px-2",
        size === 'md' && "text-sm py-1 px-3", 
        size === 'lg' && "text-base py-1.5 px-4",
        className
      )}
    >
      <Icon className={cn(
        size === 'sm' && "h-3 w-3",
        size === 'md' && "h-4 w-4",
        size === 'lg' && "h-5 w-5"
      )} />
      {config.text}
    </Badge>
  )
}

// ============================================================================
// PRIORITY INDICATOR
// ============================================================================

interface PriorityIndicatorProps {
  priority: 'low' | 'medium' | 'high' | 'urgent'
  showText?: boolean
  className?: string
}

export function PriorityIndicator({ 
  priority, 
  showText = true, 
  className 
}: PriorityIndicatorProps) {
  const priorityConfig = {
    low: {
      color: 'bg-green-500',
      text: 'Low Priority',
      textColor: 'text-green-700'
    },
    medium: {
      color: 'bg-yellow-500',
      text: 'Medium Priority',
      textColor: 'text-yellow-700'
    },
    high: {
      color: 'bg-orange-500',
      text: 'High Priority',
      textColor: 'text-orange-700'
    },
    urgent: {
      color: 'bg-red-500',
      text: 'Urgent',
      textColor: 'text-red-700'
    }
  }

  const config = priorityConfig[priority]

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("w-3 h-3 rounded-full", config.color)} />
      {showText && (
        <span className={cn("text-sm font-medium", config.textColor)}>
          {config.text}
        </span>
      )}
    </div>
  )
}

// ============================================================================
// HEALTH INDICATOR
// ============================================================================

interface HealthIndicatorProps {
  health: 'excellent' | 'good' | 'warning' | 'critical'
  label?: string
  showText?: boolean
  className?: string
}

export function HealthIndicator({
  health,
  label,
  showText = true,
  className
}: HealthIndicatorProps) {
  const healthConfig = {
    excellent: {
      color: 'bg-green-500',
      text: label || 'Excellent',
      icon: CheckCircle,
      textColor: 'text-green-700'
    },
    good: {
      color: 'bg-blue-500', 
      text: label || 'Good',
      icon: CheckCircle,
      textColor: 'text-blue-700'
    },
    warning: {
      color: 'bg-yellow-500',
      text: label || 'Warning',
      icon: AlertCircle,
      textColor: 'text-yellow-700'
    },
    critical: {
      color: 'bg-red-500',
      text: label || 'Critical',
      icon: XCircle,
      textColor: 'text-red-700'
    }
  }

  const config = healthConfig[health]
  const Icon = config.icon

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("w-3 h-3 rounded-full", config.color)} />
      <Icon className={cn("w-4 h-4", config.textColor)} />
      {showText && (
        <span className={cn("text-sm font-medium", config.textColor)}>
          {config.text}
        </span>
      )}
    </div>
  )
}