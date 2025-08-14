// apps/frontend/src/app/page.tsx
export const dynamic = 'force-dynamic' // remove if you can statically generate

import type { Metadata } from 'next/types'
import {
  NavigationSection,
  HeroSection,
  StatsSection,
  FeaturesSection,
  TestimonialsSection,
  PricingSection,
  CTASection,
  FooterSection,
} from '@/components/landing'
import { OAuthRedirectHandler } from '@/components/auth/oauth-redirect-handler'
import { EnhancedSEO, COMMON_FAQS } from '@/components/seo/enhanced-seo'

export const metadata: Metadata = {
  title: 'TenantFlow - Property Management Made Simple',
  description:
    'Save 10+ hours per week with the all-in-one property management platform trusted by 10,000+ property managers. Start your free 14-day trial.',
  openGraph: {
    title: 'TenantFlow - Property Management Made Simple',
    description:
      'Save 10+ hours per week with the all-in-one property management platform trusted by 10,000+ property managers.',
    type: 'website',
  },
}

export default function HomePage(): React.ReactElement {
  return (
    <>
      {/* Enhanced SEO with FAQ schema and local business data */}
      <EnhancedSEO 
        faqs={COMMON_FAQS.homepage}
        includeLocalBusiness={true}
        includeProduct={true}
      />
      
      <NavigationSection />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <FooterSection />
      <OAuthRedirectHandler />
    </>
  )
}