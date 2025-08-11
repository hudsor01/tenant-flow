/**
 * Enhanced Toast Utilities with Sonner Integration
 * Professional notification system designed for Stripe payments and business operations
 */

import { toast } from 'sonner'
import { CheckCircle, AlertCircle, XCircle, Info, CreditCard, Loader2, Sparkles } from 'lucide-react'

// Toast configuration optimized for professional SaaS interface
const TOAST_CONFIG = {
  duration: 4000,
  position: 'top-right' as const,
  closeButton: true,
  richColors: true,
  style: {
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
    fontSize: '14px',
    lineHeight: '1.5',
    borderRadius: '8px',
  }
}

/**
 * Enhanced toast utilities with premium styling and icons
 */
export const notifications = {
  // Success notifications with green accent
  success: (message: string, options?: { description?: string; action?: { label: string; onClick: () => void } }) => {
    return toast.success(message, {
      ...TOAST_CONFIG,
      description: options?.description,
      action: options?.action,
      icon: <CheckCircle className="w-5 h-5" />,
      style: {
        ...TOAST_CONFIG.style,
        background: 'rgba(240, 253, 244, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(34, 197, 94, 0.2)',
        color: 'hsl(140, 60%, 30%)',
      }
    })
  },

  // Error notifications with red accent
  error: (message: string, options?: { description?: string; action?: { label: string; onClick: () => void } }) => {
    return toast.error(message, {
      ...TOAST_CONFIG,
      duration: 6000, // Longer duration for errors
      description: options?.description,
      action: options?.action,
      icon: <XCircle className="w-5 h-5" />,
      style: {
        ...TOAST_CONFIG.style,
        background: 'rgba(254, 242, 242, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        color: 'hsl(0, 65%, 45%)',
      }
    })
  },

  // Warning notifications with orange accent
  warning: (message: string, options?: { description?: string; action?: { label: string; onClick: () => void } }) => {
    return toast.warning(message, {
      ...TOAST_CONFIG,
      description: options?.description,
      action: options?.action,
      icon: <AlertCircle className="w-5 h-5" />,
      style: {
        ...TOAST_CONFIG.style,
        background: 'rgba(255, 247, 237, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(251, 146, 60, 0.2)',
        color: 'hsl(32, 70%, 45%)',
      }
    })
  },

  // Info notifications with blue accent
  info: (message: string, options?: { description?: string; action?: { label: string; onClick: () => void } }) => {
    return toast.info(message, {
      ...TOAST_CONFIG,
      description: options?.description,
      action: options?.action,
      icon: <Info className="w-5 h-5" />,
      style: {
        ...TOAST_CONFIG.style,
        background: 'rgba(239, 246, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        color: 'hsl(213, 70%, 45%)',
      }
    })
  },

  // Loading notifications with animated spinner
  loading: (message: string, options?: { description?: string }) => {
    return toast.loading(message, {
      ...TOAST_CONFIG,
      duration: Infinity, // Keep until dismissed
      description: options?.description,
      icon: <Loader2 className="w-5 h-5 animate-spin" />,
      style: {
        ...TOAST_CONFIG.style,
        background: 'rgba(248, 250, 252, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        color: 'hsl(215, 15%, 35%)',
      }
    })
  },

  // Custom toast with full control
  custom: (message: string, options: {
    type?: 'success' | 'error' | 'warning' | 'info'
    description?: string
    icon?: React.ReactNode
    duration?: number
    action?: { label: string; onClick: () => void }
    style?: React.CSSProperties
  }) => {
    const { type = 'info', ...restOptions } = options
    
    return toast[type](message, {
      ...TOAST_CONFIG,
      ...restOptions,
      style: {
        ...TOAST_CONFIG.style,
        ...restOptions.style,
      }
    })
  }
}

/**
 * Stripe-specific notifications with payment branding
 */
export const stripeNotifications = {
  // Payment processing started
  processingPayment: () => {
    return notifications.loading('Processing your payment...', {
      description: 'Please wait while we securely process your subscription.'
    })
  },

  // Payment successful
  paymentSuccess: (planName: string) => {
    return notifications.success('Payment successful!', {
      description: `Welcome to ${planName}. Your subscription is now active.`,
      action: {
        label: 'View Dashboard',
        onClick: () => window.location.href = '/dashboard'
      }
    })
  },

  // Payment failed
  paymentFailed: (error?: string) => {
    return notifications.error('Payment failed', {
      description: error || 'There was an issue processing your payment. Please try again.',
      action: {
        label: 'Try Again',
        onClick: () => window.location.reload()
      }
    })
  },

  // Subscription updated
  subscriptionUpdated: (newPlan: string) => {
    return notifications.success('Subscription updated', {
      description: `Successfully upgraded to ${newPlan}. Changes take effect immediately.`
    })
  },

  // Subscription cancelled
  subscriptionCancelled: () => {
    return notifications.warning('Subscription cancelled', {
      description: 'Your subscription will remain active until the end of the billing period.'
    })
  },

  // Trial started
  trialStarted: (trialDays: number) => {
    return toast.success('Free trial activated!', {
      ...TOAST_CONFIG,
      description: `You now have ${trialDays} days of full access to explore all features.`,
      icon: <Sparkles className="w-5 h-5" />,
      style: {
        ...TOAST_CONFIG.style,
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05), rgba(34, 197, 94, 0.05))',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(79, 70, 229, 0.2)',
        color: 'hsl(235, 26%, 35%)',
      }
    })
  },

  // Checkout redirect
  redirectingToCheckout: () => {
    return notifications.loading('Redirecting to secure checkout...', {
      description: 'You will be redirected to Stripe for secure payment processing.'
    })
  },

  // Customer portal redirect
  redirectingToPortal: () => {
    return notifications.loading('Opening billing portal...', {
      description: 'Redirecting to manage your subscription and billing details.'
    })
  },

  // Custom Stripe notification
  custom: (message: string, options?: {
    type?: 'success' | 'error' | 'warning' | 'info'
    description?: string
    duration?: number
  }) => {
    const icon = <CreditCard className="w-5 h-5" />
    
    return toast[options?.type || 'info'](message, {
      ...TOAST_CONFIG,
      duration: options?.duration,
      description: options?.description,
      icon,
      style: {
        ...TOAST_CONFIG.style,
        background: 'rgba(99, 102, 241, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(99, 102, 241, 0.15)',
        color: 'hsl(235, 26%, 35%)',
      }
    })
  }
}

/**
 * Utility to dismiss all active toasts
 */
export const dismissAllToasts = () => {
  toast.dismiss()
}

/**
 * Utility to dismiss a specific toast by ID
 */
export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId)
}

/**
 * Promise-based toast for async operations
 */
export const promiseToast = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: unknown) => string)
  }
) => {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
    style: TOAST_CONFIG.style
  })
}