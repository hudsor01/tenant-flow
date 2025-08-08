/**
 * Optimized Homepage - Lightweight Server Component
 * Follows Next.js 15 + React 19 architecture with proper component separation
 */

import { isValidLocale } from '@/lib/i18n/config'
import { AnnouncementBar } from '@/components/landing/announcement-bar'
import { OptimizedNavigation } from '@/components/landing/optimized-navigation'
import { OptimizedHeroSection } from '@/components/landing/optimized-hero-section'
import { InteractiveRoiCalculator } from '@/components/landing/interactive-roi-calculator'
import { OptimizedFeaturesSection } from '@/components/landing/optimized-features-section'
import { OptimizedTestimonialsSection } from '@/components/landing/optimized-testimonials-section'
import { InteractivePricingSection } from '@/components/landing/interactive-pricing-section'
import { StickyCtaBar } from '@/components/landing/sticky-cta-bar'
import { OptimizedFooterSection } from '@/components/landing/optimized-footer-section'

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function OptimizedHomePage({ params }: HomePageProps) {
  // Resolve locale server-side
  const resolved = await params
  const locale = isValidLocale(resolved.locale) ? resolved.locale : 'en'

  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <OptimizedNavigation locale={locale} />
      <OptimizedHeroSection locale={locale} />
      <InteractiveRoiCalculator locale={locale} />
      <OptimizedFeaturesSection locale={locale} />
      <OptimizedTestimonialsSection />
      <InteractivePricingSection locale={locale} />
      <StickyCtaBar locale={locale} />
      <OptimizedFooterSection locale={locale} />
    </div>
  )
}