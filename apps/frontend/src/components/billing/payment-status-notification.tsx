"use client"

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Info } from 'lucide-react'

export function PaymentStatusNotification() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'success' | 'cancelled' | 'error' | null>(null)

  useEffect(() => {
    const paymentStatus = searchParams.get('payment')
    if (paymentStatus) {
      setStatus(paymentStatus as 'success' | 'cancelled' | 'error')
      
      // Clear the payment parameter from URL after showing notification
      const timeout = setTimeout(() => {
        const url = new URL(window.location.href)
        url.searchParams.delete('payment')
        window.history.replaceState({}, '', url.toString())
        setStatus(null)
      }, 5000)

      return () => clearTimeout(timeout)
    }
  }, [searchParams])

  if (!status) return null

  const notifications = {
    success: {
      icon: CheckCircle,
      title: 'Payment Successful!',
      description: 'Welcome to TenantFlow! Your subscription is now active.',
      className: 'border-green-200 bg-green-50 text-green-800'
    },
    cancelled: {
      icon: XCircle,
      title: 'Payment Cancelled',
      description: 'Your payment was cancelled. You can try again anytime.',
      className: 'border-yellow-200 bg-yellow-50 text-yellow-800'
    },
    error: {
      icon: XCircle,
      title: 'Payment Failed',
      description: 'Something went wrong with your payment. Please try again or contact support.',
      className: 'border-red-200 bg-red-50 text-red-800'
    }
  }

  const notification = notifications[status]
  const Icon = notification.icon

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert className={notification.className}>
        <Icon className="h-4 w-4" />
        <AlertDescription>
          <div className="font-medium">{notification.title}</div>
          <div className="text-sm">{notification.description}</div>
        </AlertDescription>
      </Alert>
    </div>
  )
}