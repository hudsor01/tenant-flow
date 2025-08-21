/**
 * New Simplified Checkout Hook
 * Handles subscription checkout with proper error handling
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { PlanType, BillingPeriod } from '@repo/shared'

interface CheckoutResponse {
  url: string
  sessionId: string
}

interface PortalResponse {
  url: string
}

export function useCheckoutNew() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkout = async (planId: PlanType, interval: BillingPeriod) => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.post<CheckoutResponse>('/stripe/checkout', {
        planId,
        interval,
        successUrl: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/pricing`
      })

      if (response.url) {
        // Redirect to Stripe checkout
        window.location.href = response.url
      } else {
        throw new Error('No checkout URL received from server')
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Checkout failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const openCustomerPortal = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.post<PortalResponse>('/stripe/portal', {
        returnUrl: window.location.href
      })

      if (response.url) {
        // Redirect to Stripe customer portal
        window.location.href = response.url
      } else {
        throw new Error('No portal URL received from server')
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Portal access failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return {
    checkout,
    openCustomerPortal,
    loading,
    error,
    clearError: () => setError(null)
  }
}

// Helper function to extract error messages
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'object' && error !== null) {
    // Handle API error responses
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }
    
    // Handle network/fetch errors
    if ('name' in error && error.name === 'NetworkError') {
      return 'Network connection failed. Please check your internet connection and try again.'
    }
    
    // Handle HTTP errors
    if ('status' in error && typeof error.status === 'number') {
      switch (error.status) {
        case 401:
          return 'Please log in to continue with your subscription.'
        case 403:
          return 'You do not have permission to perform this action.'
        case 404:
          return 'The requested service is not available.'
        case 429:
          return 'Too many requests. Please wait a moment and try again.'
        case 500:
          return 'Server error. Our team has been notified. Please try again in a few minutes.'
        default:
          return `Request failed with status ${error.status}. Please try again.`
      }
    }
  }
  
  return 'An unexpected error occurred. Please try again or contact support if the problem persists.'
}