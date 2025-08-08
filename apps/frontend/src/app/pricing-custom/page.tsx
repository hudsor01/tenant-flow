/**
 * Custom Pricing Page - Server Component with Client Island
 * Next.js 15 + React 19 optimized architecture
 * 
 * This page is now a lightweight server component that imports the
 * client component for dynamic functionality
 */

import type { Metadata } from 'next'
import { CustomPricingClient } from '@/components/pricing'

export const metadata: Metadata = {
  title: 'Custom Pricing Plans | TenantFlow',
  description: 'Choose the perfect TenantFlow plan for your property portfolio. Start with a free 14-day trial, then scale as you grow with our flexible pricing options.',
  keywords: 'property management pricing, landlord software cost, rental management plans, tenantflow pricing',
  openGraph: {
    title: 'Custom Pricing Plans | TenantFlow',
    description: 'Choose the perfect TenantFlow plan for your property portfolio. Start with a free 14-day trial.',
    type: 'website',
  },
}

/**
 * Server component page - lightweight and SEO-optimized
 * All dynamic functionality is handled by the client component
 */
export default function CustomPricingPage() {
  return <CustomPricingClient />
}