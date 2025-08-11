"use client"

import React from 'react'
import { Check, AlertCircle, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading'
type AnimationType = 'slide' | 'fade' | 'bounce' | 'shake'

interface EnhancedVisualFeedbackProps {
  type: FeedbackType
  message: string
  animation?: AnimationType
  showIcon?: boolean
  className?: string
  onClose?: () => void
  autoClose?: boolean
  autoCloseDelay?: number
}

const FEEDBACK_CONFIGS = {
  success: {
    icon: Check,
    styles: 'bg-green-50 border-green-200 text-green-800',
    iconStyles: 'text-green-600'
  },
  error: {
    icon: AlertCircle,
    styles: 'bg-red-50 border-red-200 text-red-800',
    iconStyles: 'text-red-600'
  },
  warning: {
    icon: AlertCircle,
    styles: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    iconStyles: 'text-yellow-600'
  },
  info: {
    icon: Info,
    styles: 'bg-blue-50 border-blue-200 text-blue-800',
    iconStyles: 'text-blue-600'
  },
  loading: {
    icon: Loader2,
    styles: 'bg-gray-50 border-gray-200 text-gray-800',
    iconStyles: 'text-gray-600 animate-spin'
  }
}

const ANIMATION_CLASSES = {
  slide: 'animate-in slide-in-from-top-1 fade-in-0 duration-300',
  fade: 'animate-in fade-in-0 duration-300',
  bounce: 'animate-in zoom-in-95 duration-300',
  shake: 'animate-pulse'
}

export function EnhancedVisualFeedback({
  type,
  message,
  animation = 'slide',
  showIcon = true,
  className,
  onClose,
  autoClose = false,
  autoCloseDelay = 3000
}: EnhancedVisualFeedbackProps) {
  const config = FEEDBACK_CONFIGS[type]
  const Icon = config.icon

  React.useEffect(() => {
    if (autoClose && onClose && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, autoCloseDelay)
      
      return () => clearTimeout(timer)
    }
    return undefined
  }, [autoClose, onClose, autoCloseDelay])

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-all duration-300',
        config.styles,
        ANIMATION_CLASSES[animation],
        className
      )}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      {showIcon && (
        <div className={cn('flex-shrink-0 mt-0.5', config.iconStyles)}>
          <Icon className="h-4 w-4" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-relaxed">
          {message}
        </p>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className={cn(
            'flex-shrink-0 p-1 rounded-md transition-colors hover:bg-black/5',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            type === 'success' && 'focus:ring-green-500',
            type === 'error' && 'focus:ring-red-500',
            type === 'warning' && 'focus:ring-yellow-500',
            type === 'info' && 'focus:ring-blue-500'
          )}
          aria-label="Dismiss message"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  )
}

// Field-specific feedback component
interface FieldFeedbackProps {
  isValid?: boolean | null
  error?: string
  success?: string
  isValidating?: boolean
  className?: string
}

export function FieldFeedback({ 
  isValid, 
  error, 
  success, 
  isValidating, 
  className 
}: FieldFeedbackProps) {
  if (isValidating) {
    return (
      <EnhancedVisualFeedback
        type="loading"
        message="Validating..."
        animation="fade"
        className={cn("mt-1", className)}
      />
    )
  }

  if (isValid === false && error) {
    return (
      <EnhancedVisualFeedback
        type="error"
        message={error}
        animation="shake"
        className={cn("mt-1", className)}
      />
    )
  }

  if (isValid === true && success) {
    return (
      <EnhancedVisualFeedback
        type="success"
        message={success}
        animation="bounce"
        className={cn("mt-1", className)}
      />
    )
  }

  return null
}