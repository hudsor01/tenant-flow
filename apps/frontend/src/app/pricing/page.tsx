import { Metadata } from 'next'
import { PricingHeader } from '@/components/pricing/pricing-header'
import { PricingPageClient } from '@/components/pricing/pricing-page-client'
import { pricingPlans } from '@/components/pricing/pricing-data'

// Using static generation for better performance
export const dynamic = 'force-static'
export const revalidate = 3600 // Revalidate every hour

export const metadata: Metadata = {
  title: 'Pricing Plans - TenantFlow',
  description: 'Choose the perfect plan for your property management needs. Start with a free trial, then scale as your portfolio grows.',
  keywords: 'property management pricing, rental property software, landlord tools, tenant management plans',
}

/**
 * Next.js 15 Server Component - Lightweight pricing page
 * 
 * Architecture:
 * - Server component by default for optimal performance
 * - Static generation for faster loading
 * - Client components only where needed (interactivity)
 * - Modular component structure for maintainability
 */
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Server-rendered header */}
        <PricingHeader />
        
        {/* Client components for interactivity */}
        <PricingPageClient plans={pricingPlans} />
      </div>
    </div>
  )
}