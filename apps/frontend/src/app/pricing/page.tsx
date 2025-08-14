/**
 * Enhanced pricing page with server-first architecture
 * Optimized for Core Web Vitals and progressive enhancement
 */

import type { Metadata } from 'next/types'
import { Suspense } from 'react'
import { PricingHeader } from '@/components/pricing/pricing-header'
import { StaticPricingGrid } from '@/components/pricing/static-pricing-grid'
import { SecurityBadges } from '@/components/pricing/security-badges'
import { CustomerTestimonials } from '@/components/pricing/customer-testimonials'
import { PricingFAQ } from '@/components/pricing/pricing-faq'
import { PricingAnalytics } from '@/components/pricing/pricing-analytics'
import { PricingErrorBoundary } from '@/components/pricing/pricing-error-boundary'
import { ENHANCED_PRODUCT_TIERS } from '@repo/shared/config/pricing'
import { warmPricingCache } from '@/lib/pricing-cache'
import '@/styles/pricing.css'

// Static metadata for SEO
export const metadata: Metadata = {
  title: 'Pricing Plans - TenantFlow Property Management',
  description: 'Simple, transparent pricing for property management software. Start with a free trial, then scale as your portfolio grows. No hidden fees.',
  keywords: [
    'property management pricing',
    'rental software cost',
    'property management software plans',
    'landlord tools pricing',
    'tenant management pricing'
  ],
  openGraph: {
    title: 'TenantFlow Pricing - Property Management Software',
    description: 'Professional property management starting at $29/month. Free trial included.',
    type: 'website',
    images: [
      {
        url: '/og-pricing.jpg',
        width: 1200,
        height: 630,
        alt: 'TenantFlow Pricing Plans'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TenantFlow Pricing Plans',
    description: 'Professional property management starting at $29/month',
    images: ['/og-pricing.jpg']
  },
  alternates: {
    canonical: 'https://tenantflow.app/pricing'
  }
}

// Static data for immediate rendering
function getStaticPricingData() {
  const plans = Object.values(ENHANCED_PRODUCT_TIERS)
  
  return {
    plans,
    cheapestPlan: plans.find(p => p.price.monthly > 0 && p.planId === 'starter'),
    mostPopular: plans.find(p => p.planId === 'growth'), // Growth plan is typically most popular
    recommended: plans.find(p => p.planId === 'starter'), // Starter plan is typically recommended for new users
    totalPlans: plans.length
  }
}

// Loading fallbacks for each section
function PricingTableSkeleton() {
  return (
    <div className="animate-pulse py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-96"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TestimonialsSkeleton() {
  return (
    <div className="animate-pulse py-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Server component sections
function TrustSection() {
  return (
    <div className="bg-gray-50">
      <SecurityBadges />
    </div>
  )
}

// Main pricing page component (Server Component)
export default async function PricingPage() {
  const staticData = getStaticPricingData()
  
  // Warm cache for better performance
  await warmPricingCache().catch(console.warn)
  
  return (
    <div className="min-h-screen bg-white">
      {/* Hero section - Server Component */}
      <section className="bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <PricingHeader />
        </div>
      </section>

      {/* Pricing table section - Progressive enhancement */}
      <section className="bg-white" id="pricing-plans">
        <div className="max-w-7xl mx-auto px-4">
          {/* Static pricing grid loads immediately */}
          <noscript>
            <StaticPricingGrid showRecommended showPopular />
          </noscript>
          
          {/* Enhanced pricing table with client features */}
          <div className="js-only">
            <Suspense fallback={<PricingTableSkeleton />}>
              <PricingErrorBoundary>
                <StaticPricingGrid showRecommended showPopular />
              </PricingErrorBoundary>
            </Suspense>
          </div>
        </div>
      </section>

      {/* Trust indicators section - Server Component */}
      <TrustSection />

      {/* Customer testimonials - Lazy loaded */}
      <section className="bg-white">
        <Suspense fallback={<TestimonialsSkeleton />}>
          <PricingErrorBoundary>
            <CustomerTestimonials />
          </PricingErrorBoundary>
        </Suspense>
      </section>

      {/* FAQ section - Client component for interactions */}
      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <Suspense fallback={<div className="h-96 animate-pulse bg-gray-200 rounded-lg" />}>
            <PricingErrorBoundary>
              <PricingFAQ />
            </PricingErrorBoundary>
          </Suspense>
        </div>
      </section>

      {/* Final CTA section - Server Component */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Property Management?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of property managers who've streamlined their operations with TenantFlow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/signup?plan=starter"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Start Free Trial
            </a>
            <a
              href="/contact"
              className="border border-blue-400 text-white hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Contact Sales
            </a>
          </div>
          <p className="text-sm text-blue-200 mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Schema.org structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'TenantFlow Property Management Software',
            description: 'Professional property management software for landlords and property managers',
            offers: staticData.plans.map(plan => ({
              '@type': 'Offer',
              name: plan.name,
              description: plan.description,
              price: plan.price.monthly,
              priceCurrency: 'USD',
              priceSpecification: {
                '@type': 'UnitPriceSpecification',
                price: plan.price.monthly,
                priceCurrency: 'USD',
                unitCode: 'MON'
              },
              availability: 'https://schema.org/InStock',
              url: `https://tenantflow.app/signup?plan=${plan.planId}`
            })),
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              reviewCount: '500+'
            },
            brand: {
              '@type': 'Brand',
              name: 'TenantFlow'
            }
          })
        }}
      />

      {/* Analytics and performance tracking */}
      <PricingErrorBoundary>
        <PricingAnalytics 
          trackInteractions={true}
          trackPerformance={true}
          trackErrors={true}
        />
      </PricingErrorBoundary>

      {/* Performance monitoring script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Track pricing page performance
            window.addEventListener('load', function() {
              if (typeof gtag === 'function') {
                gtag('event', 'page_view', {
                  page_title: 'Pricing Page',
                  page_location: window.location.href,
                  custom_map: {
                    load_time: performance.now(),
                    plans_shown: ${Number(staticData.totalPlans) || 0}
                  }
                });
              }
            });
          `
        }}
      />

    </div>
  )
}

// Pre-render optimization - use ISR for better performance with React Query
export const dynamic = 'force-dynamic' // Changed to dynamic to support React Query
export const revalidate = 3600 // Revalidate every hour