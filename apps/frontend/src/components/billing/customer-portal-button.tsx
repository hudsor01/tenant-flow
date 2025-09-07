"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Settings } from 'lucide-react'
import { stripeApi } from '@/lib/api-client'

interface CustomerPortalButtonProps {
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'sm' | 'default' | 'lg'
  children?: React.ReactNode
}

export function CustomerPortalButton({ 
  className,
  variant = 'outline',
  size = 'default',
  children = 'Manage Billing'
}: CustomerPortalButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePortalAccess = async () => {
    setLoading(true)
    
    try {
      const response = await stripeApi.createPortal({
        returnUrl: window.location.href
      })
      
      // Redirect to Stripe Customer Portal
      window.location.href = response.url
    } catch (error) {
      console.error('Portal access error:', error)
      // TODO: Add toast notification for error
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePortalAccess}
      disabled={loading}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 me-2 animate-spin" />
      ) : (
        <Settings className="w-4 h-4 me-2" />
      )}
      {children}
    </Button>
  )
}