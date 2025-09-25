'use client'

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { createLogger } from '@repo/shared'
import type { StripePricingTableProps } from '@repo/shared'

const logger = createLogger({ component: 'StripePricingTable' })

export function StripePricingTable({
  pricingTableId = 'prctbl_placeholder', // Default placeholder ID
  clientReferenceId,
  customerEmail,
  customerSessionClientSecret,
  className
}: StripePricingTableProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Show helpful message in development if using placeholder or getting error
    if (pricingTableId === 'prctbl_placeholder' || pricingTableId === 'prctbl_1234567890') {
      container.innerHTML = `
        <div style="padding: 3rem; text-align: center; border: 2px dashed var(--color-border); border-radius: 0.75rem; background: var(--color-fill-secondary);">
          <h3 style="font-weight: 600; margin-bottom: 1rem; color: var(--color-label-primary); font-size: 1.25rem;">
            Stripe Pricing Table Configuration Required
          </h3>
          <p style="color: var(--color-label-secondary); margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto;">
            Stripe Pricing Tables provide a no-code solution for displaying your products and prices.
            To use this component, you need to create a pricing table in your Stripe Dashboard.
          </p>
          <div style="background: var(--color-fill-primary); border-radius: 0.5rem; padding: 1.5rem; max-width: 600px; margin: 0 auto;">
            <h4 style="font-weight: 500; margin-bottom: 1rem; color: var(--color-label-primary);">Setup Instructions:</h4>
            <ol style="text-align: left; color: var(--color-label-secondary); line-height: 1.8;">
              <li><strong>1.</strong> Go to <a href="https://dashboard.stripe.com/pricing-tables" target="_blank" style="color: var(--color-primary-brand); text-decoration: underline;">Stripe Dashboard → Pricing tables</a></li>
              <li><strong>2.</strong> Click "Create pricing table"</li>
              <li><strong>3.</strong> Add your products (Starter: $29, Growth: $79, Max: $299)</li>
              <li><strong>4.</strong> Configure appearance to match your brand</li>
              <li><strong>5.</strong> Copy the pricing table ID (starts with prctbl_)</li>
              <li><strong>6.</strong> Add to Doppler: <code style="background: var(--color-fill-secondary); padding: 0.25rem 0.5rem; border-radius: 0.25rem;">doppler secrets set STRIPE_PRICING_TABLE_ID prctbl_xxxxx</code></li>
            </ol>
          </div>
          <div style="margin-top: 1.5rem; padding: 1rem; background: var(--color-system-yellow-bg); border-radius: 0.5rem; max-width: 600px; margin-left: auto; margin-right: auto;">
            <p style="color: var(--color-system-yellow); font-size: 0.875rem;">
              <strong>Note:</strong> Pricing tables are created in the Stripe Dashboard, not via API.
              They provide built-in checkout, customer portal links, and automatic tax calculation.
            </p>
          </div>
        </div>
      `
      logger.info('Stripe pricing table needs configuration', {
        action: 'stripe_pricing_table_placeholder',
        metadata: { pricingTableId }
      })
      return
    }

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