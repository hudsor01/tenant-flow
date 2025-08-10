/**
 * Official Stripe Pricing Table - Server Component with Client Island
 * Next.js 15 + React 19 optimized architecture
 */

import type { Metadata } from '@/types/next.d'
import { OfficialStripePricingClient } from '@/components/pricing/official-stripe-pricing-client'

export const metadata: Metadata = {
  title: 'Official Stripe Pricing | TenantFlow',
  description: 'Official Stripe-powered pricing table for TenantFlow property management software. Start your free 14-day trial today.',
  keywords: 'stripe pricing, property management cost, tenantflow plans, landlord software pricing',
  openGraph: {
    title: 'Official Stripe Pricing | TenantFlow',
    description: 'Official Stripe-powered pricing for TenantFlow property management software.',
    type: 'website',
  },
}

/**
 * Server component page - lightweight and SEO-optimized
 * Delegates to client component for Stripe integration
 */
export default function OfficialPricingPage() {
  return <OfficialStripePricingClient />
}