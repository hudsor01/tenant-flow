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
import { SEO } from '@/components/seo/seo'

const COMMON_FAQS = {
  homepage: [
    {
      question: "How does TenantFlow help save time?",
      answer: "TenantFlow automates routine tasks like rent collection, maintenance requests, and tenant communication, saving property managers 10+ hours per week."
    },
    {
      question: "Is my data secure with TenantFlow?",
      answer: "Yes, we use bank-level encryption and security measures to protect your data. Your information is stored securely and backed up regularly."
    },
    {
      question: "Can I try TenantFlow before purchasing?",
      answer: "Absolutely! We offer a 14-day free trial with no credit card required. You can explore all features and see how TenantFlow works for your properties."
    },
    {
      question: "How many properties can I manage?",
      answer: "TenantFlow supports unlimited properties and tenants on all plans. Whether you manage 1 property or 1,000, we've got you covered."
    }
  ]
}

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
      <SEO 
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