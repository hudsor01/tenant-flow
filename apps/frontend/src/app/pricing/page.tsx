'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Building2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EnhancedSEO, COMMON_FAQS, COMMON_BREADCRUMBS } from '@/components/seo/enhanced-seo'
import { PricingComponent } from '@/components/pricing/pricing-component'
import { useAuth } from '@/hooks/use-auth'
import type { ProductTierConfig } from '@repo/shared/types/billing'
import type { BillingPeriod } from '@repo/shared/types/stripe'

export default function PricingPage() {
  const [scrollY, setScrollY] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handlePlanSelect = (tierConfig: ProductTierConfig, billingInterval: BillingPeriod) => {
    console.log('Plan selected:', tierConfig.name, billingInterval)
  }

  const handleError = (error: unknown) => {
    console.error('Pricing error:', error)
  }

  return (
    <>
      {/* Enhanced SEO */}
      <EnhancedSEO 
        breadcrumbs={COMMON_BREADCRUMBS.pricing}
        faqs={COMMON_FAQS.pricing}
        includeProduct={true}
      />

      {/* Navigation */}
      <nav className={cn(
        'border-b bg-white/80 backdrop-blur-sm fixed w-full top-0 z-50 transition-all duration-300',
        scrollY > 50 && 'shadow-lg',
      )}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <Building2 className="h-8 w-8 text-blue-600 transition-transform group-hover:scale-110" />
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TenantFlow
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
            <Link href="/pricing"  className="text-gray-900 font-semibold">Pricing</Link>
            <Link href="/blog"     className="text-gray-600 hover:text-gray-900 transition-colors">Blog</Link>
          </div>

          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Link href="/auth/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content - Stripe-enabled PricingComponent */}
      <div className="pt-20 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <PricingComponent
            currentPlan={undefined}
            customerId={user?.stripeCustomerId || undefined}
            onPlanSelect={handlePlanSelect}
            onError={handleError}
            className="max-w-7xl mx-auto"
          />
        </div>
      </div>

      {/* Simple Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 TenantFlow. All rights reserved.</p>
        </div>
      </footer>
    </>
  )
}
