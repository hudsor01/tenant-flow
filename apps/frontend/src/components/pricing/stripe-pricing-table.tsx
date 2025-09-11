'use client'

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface StripePricingTableProps {
  pricingTableId: string
  clientReferenceId?: string
  customerEmail?: string
  customerSessionClientSecret?: string
  className?: string
}

export function StripePricingTable({ 
  pricingTableId,
  clientReferenceId,
  customerEmail,
  customerSessionClientSecret,
  className
}: StripePricingTableProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Load Stripe pricing table script if not already loaded
    const loadScript = async () => {
      if (!document.querySelector('script[src*="pricing-table"]')) {
        const script = document.createElement('script')
        script.async = true
        script.src = 'https://js.stripe.com/v3/pricing-table.js'
        document.head.appendChild(script)
        
        // Wait for script to load
        await new Promise<void>((resolve) => {
          script.onload = () => resolve()
          script.onerror = () => resolve() // Continue even if script fails
        })
      }

      // Create the pricing table element
      const pricingTable = document.createElement('stripe-pricing-table') as HTMLElement
      pricingTable.setAttribute('pricing-table-id', pricingTableId)
      pricingTable.setAttribute('publishable-key', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')
      
      if (clientReferenceId) {
        pricingTable.setAttribute('client-reference-id', clientReferenceId)
      }
      if (customerEmail) {
        pricingTable.setAttribute('customer-email', customerEmail)
      }
      if (customerSessionClientSecret) {
        pricingTable.setAttribute('customer-session-client-secret', customerSessionClientSecret)
      }

      // Clear container and append new element
      container.innerHTML = ''
      container.appendChild(pricingTable)
    }

    loadScript().catch(console.error)
  }, [pricingTableId, clientReferenceId, customerEmail, customerSessionClientSecret])

  return (
    <div 
      ref={containerRef}
      className={cn('stripe-pricing-table-container', className)}
    />
  )
}