"use client"

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Zap } from 'lucide-react'
import { cn } from '@/lib/design-system'
import { ANIMATION_DURATIONS, Z_INDEX_SCALE } from '@repo/shared'

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'
type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'

interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
  position?: ToastPosition
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

// Global toast state
let toastState: ToastState = {
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
  clearAll: () => {}
}

// Toast icons
const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Zap
}

// Toast styles
const toastVariants = {
  success: {
    container: 'bg-card border-l-4 border-green-500 shadow-lg',
    icon: 'text-green-500',
    title: 'text-green-900 dark:text-green-100',
    description: 'text-green-700 dark:text-green-200'
  },
  error: {
    container: 'bg-card border-l-4 border-red-500 shadow-lg',
    icon: 'text-red-500',
    title: 'text-red-900 dark:text-red-100',
    description: 'text-red-700 dark:text-red-200'
  },
  warning: {
    container: 'bg-card border-l-4 border-yellow-500 shadow-lg',
    icon: 'text-yellow-500',
    title: 'text-yellow-900 dark:text-yellow-100', 
    description: 'text-yellow-700 dark:text-yellow-200'
  },
  info: {
    container: 'bg-card border-l-4 border-blue-500 shadow-lg',
    icon: 'text-blue-500',
    title: 'text-blue-900 dark:text-blue-100',
    description: 'text-blue-700 dark:text-blue-200'
  },
  loading: {
    container: 'bg-card border-l-4 border-primary shadow-lg',
    icon: 'text-primary animate-pulse',
    title: 'text-foreground',
    description: 'text-muted-foreground'
  }
}

// Position classes
const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4', 
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
}

// Individual toast component
function ToastItem({ 
  toast, 
  onRemove 
}: { 
  toast: Toast
  onRemove: (id: string) => void 
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  
  const Icon = toastIcons[toast.type]
  const styles = toastVariants[toast.type]

  const handleRemove = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => onRemove(toast.id), 300)
  }, [toast.id, onRemove])

  // Show animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  // Auto dismiss
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleRemove()
      }, toast.duration)
      
      return () => clearTimeout(timer)
    }
    
    return undefined
  }, [toast.duration, toast.id, handleRemove])

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 p-4 rounded-lg border transition-all duration-300 ease-out transform max-w-sm w-full",
        styles.container,
        isVisible && !isExiting 
          ? "translate-x-0 opacity-100 scale-100" 
          : toast.position?.includes('right') 
            ? "translate-x-full opacity-0 scale-95"
            : toast.position?.includes('left')
            ? "-translate-x-full opacity-0 scale-95"
            : "translate-y-2 opacity-0 scale-95"
      )}
      style={{ zIndex: Z_INDEX_SCALE.toast }}
    >
      {/* Icon */}
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", styles.icon)} />
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={cn("font-semibold text-sm leading-tight", styles.title)}>
          {toast.title}
        </div>
        
        {toast.description && (
          <div className={cn("text-sm mt-1 leading-relaxed", styles.description)}>
            {toast.description}
          </div>
        )}
        
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="inline-flex items-center gap-1 mt-2 text-xs font-medium px-2 py-1 rounded bg-background/50 hover:bg-background transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      {/* Close button */}
      <button
        onClick={handleRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background/50 rounded"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* Progress bar for timed toasts */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 h-1 bg-current opacity-30 rounded-b-lg animate-pulse" />
      )}
    </div>
  )
}

// Toast container component
function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Set up global toast state
  useEffect(() => {
    toastState.addToast = (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substr(2, 9)
      const newToast = { ...toast, id }
      setToasts(prev => [...prev, newToast])
    }

    toastState.removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }

    toastState.clearAll = () => {
      setToasts([])
    }
  }, [])

  // Group toasts by position
  const toastsByPosition = toasts.reduce((acc, toast) => {
    const position = toast.position || 'top-right'
    if (!acc[position]) acc[position] = []
    acc[position].push(toast)
    return acc
  }, {} as Record<ToastPosition, Toast[]>)

  if (!mounted) return null

  return createPortal(
    <>
      {Object.entries(toastsByPosition).map(([position, positionToasts]) => (
        <div
          key={position}
          className={cn(
            "fixed flex flex-col gap-2 z-50 pointer-events-none",
            positionClasses[position as ToastPosition],
            position.includes('bottom') ? "flex-col-reverse" : ""
          )}
        >
          {positionToasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem 
                toast={toast} 
                onRemove={toastState.removeToast} 
              />
            </div>
          ))}
        </div>
      ))}
    </>,
    document.body
  )
}

// Toast utility functions
const toast = {
  success: (title: string, options?: Partial<Toast>) => {
    toastState.addToast({
      type: 'success',
      title,
      duration: 4000,
      position: 'top-right',
      ...options
    })
  },

  error: (title: string, options?: Partial<Toast>) => {
    toastState.addToast({
      type: 'error', 
      title,
      duration: 6000,
      position: 'top-right',
      ...options
    })
  },

  warning: (title: string, options?: Partial<Toast>) => {
    toastState.addToast({
      type: 'warning',
      title,
      duration: 5000,
      position: 'top-right',
      ...options
    })
  },

  info: (title: string, options?: Partial<Toast>) => {
    toastState.addToast({
      type: 'info',
      title,
      duration: 4000,
      position: 'top-right',
      ...options
    })
  },

  loading: (title: string, options?: Partial<Toast>) => {
    toastState.addToast({
      type: 'loading',
      title,
      duration: 0, // Don't auto-dismiss loading toasts
      position: 'top-right',
      ...options
    })
  },

  promise: async <T,>(
    promise: Promise<T>,
    {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage,
      ...options
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    } & Partial<Toast>
  ): Promise<T> => {
    const loadingToast = Math.random().toString(36).substr(2, 9)
    
    // Show loading toast
    toastState.addToast({
      id: loadingToast,
      type: 'loading',
      title: loadingMessage,
      duration: 0,
      ...options
    })

    try {
      const result = await promise
      
      // Remove loading toast
      toastState.removeToast(loadingToast)
      
      // Show success toast
      const successText = typeof successMessage === 'function' 
        ? successMessage(result) 
        : successMessage
      
      toastState.addToast({
        type: 'success',
        title: successText,
        duration: 4000,
        ...options
      })
      
      return result
    } catch (error) {
      // Remove loading toast
      toastState.removeToast(loadingToast)
      
      // Show error toast
      const errorText = typeof errorMessage === 'function' 
        ? errorMessage(error) 
        : errorMessage
      
      toastState.addToast({
        type: 'error',
        title: errorText,
        duration: 6000,
        ...options
      })
      
      throw error
    }
  },

  dismiss: (id?: string) => {
    if (id) {
      toastState.removeToast(id)
    } else {
      toastState.clearAll()
    }
  }
}

export { ToastContainer, toast }