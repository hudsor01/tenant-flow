/**
 * Stripe Pricing Page - Server Component with Client Island
 * Next.js 15 + React 19 optimized architecture
 */

import type { Metadata } from '@/types/next.d'
import { StripePricingClient } from '@/components/pricing/stripe-pricing-client'

export const metadata: Metadata = {
  title: 'Stripe Pricing Plans | TenantFlow',
  description: 'Simple, transparent pricing for TenantFlow property management. Compare features across all plans and start your free 14-day trial.',
  keywords: 'stripe pricing table, property management plans, tenantflow cost, landlord software pricing',
  openGraph: {
    title: 'Stripe Pricing Plans | TenantFlow',
    description: 'Simple, transparent pricing for TenantFlow property management software.',
    type: 'website',
  },
}

/**
 * Server component page - lightweight and SEO-optimized
 * Delegates to client component for Stripe integration and user auth
 */
export default function StripePricingPage() {
  return <StripePricingClient />
}