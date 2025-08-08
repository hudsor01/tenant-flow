export const dynamic = 'force-dynamic'

import { Metadata } from 'next'
import { NavigationSection } from '@/components/landing/navigation-section'
import { HeroSection } from '@/components/landing/hero-section'
import { StatsSection } from '@/components/landing/stats-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { PricingSection } from '@/components/landing/pricing-section'
import { CtaSection } from '@/components/landing/cta-section'
import { FooterSection } from '@/components/landing/footer-section'

export const metadata: Metadata = {
  title: 'TenantFlow - Property Management Made Simple',
  description: 'Save 10+ hours per week with the all-in-one property management platform trusted by 10,000+ property managers. Start your free 14-day trial.',
  keywords: 'property management, tenant portal, rent collection, maintenance tracking, landlord software',
  openGraph: {
    title: 'TenantFlow - Property Management Made Simple',
    description: 'Save 10+ hours per week with the all-in-one property management platform trusted by 10,000+ property managers.',
    type: 'website',
  },
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <NavigationSection />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <CtaSection />
      <FooterSection />
    </div>
  )
}