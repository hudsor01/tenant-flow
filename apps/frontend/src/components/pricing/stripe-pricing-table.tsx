'use client'

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { createLogger } from '@repo/shared'

const logger = createLogger({ component: 'StripePricingTable' })

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
      pricingTable.setAttribute('publishable-key',
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || (() => {
          throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required for Stripe pricing table')
        })()
      )
      
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

    loadScript().catch((error) => {
      logger.error('Failed to load Stripe pricing table script', {
        action: 'stripe_script_load_failed',
        metadata: {
          pricingTableId,
          error: error instanceof Error ? error.message : String(error)
        }
      })
    })
  }, [pricingTableId, clientReferenceId, customerEmail, customerSessionClientSecret])

  return (
    <div 
      ref={containerRef}
      className={cn('stripe-pricing-table-container', className)}
    />
  )
}