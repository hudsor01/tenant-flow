import type { Metadata } from 'next/types'
import { HeroSection } from '@/components/landing/hero-section'
import { StatsSection } from '@/components/landing/stats-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { PricingSection } from '@/components/landing/pricing-section'
import { TestimonialsSection } from '@/components/landing/testimonials-section'
import { FooterSection } from '@/components/landing/footer-section'
import { NavigationSection } from '@/components/landing/navigation-section'
import { CtaSection as CTASection } from '@/components/landing/cta-section'
import { SEO } from '@/components/seo/SEO'

export const metadata: Metadata = {
  title: 'TenantFlow - Property Management Made Simple',
  description:
    'Streamline your property portfolio with real-time occupancy tracking, maintenance management, and comprehensive analytics. Start your free trial.',
  openGraph: {
    title: 'TenantFlow - Property Management Made Simple',
    description:
      'Streamline your property portfolio with real-time occupancy tracking, maintenance management, and comprehensive analytics.',
    type: 'website',
  },
}

export default function HomePage(): React.ReactElement {
  return (
    <>
      <SEO
        title="Property Management Made Simple"
        description="Streamline your property portfolio with real-time occupancy tracking, maintenance management, and comprehensive analytics."
        keywords="property management software, tenant management, rental properties, landlord tools, property managers"
        includeProduct={true}
        faqs={[
          {
            question: 'How quickly can I get started with TenantFlow?',
            answer:
              'You can get started in just 5 minutes with our guided setup process. No technical expertise required.',
          },
          {
            question: 'Do I need a credit card for the free trial?',
            answer:
              'No, our free trial requires no credit card. You can explore all features risk-free.',
          },
        ]}
      />
      <NavigationSection />
      <HeroSection />
      <StatsSection />
      <FeaturesSection locale="en" />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <FooterSection locale="en" />
    </>
  )
}

