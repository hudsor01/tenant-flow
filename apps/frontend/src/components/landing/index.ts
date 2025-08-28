/**
 * Landing Page Components Export - Server Components Only
 *
 * This barrel export only contains Server Components to avoid
 * client reference manifest generation issues with Next.js 15.
 * Client Components should be imported directly from their files.
 */

// Core Landing Sections (Server Components Only)
export { OptimizedHeroSection as HeroSection } from './optimized-hero-section'
export { StatsSection } from './stats-section'
export { OptimizedFeaturesSection as FeaturesSection } from './optimized-features-section'
export { PricingSection } from './pricing-section'
export { OptimizedTestimonialsSection as TestimonialsSection } from './optimized-testimonials-section'
export { OptimizedFooterSection as FooterSection } from './optimized-footer-section'

// NOTE: Client Components (NavigationSection, CtaSection, HeroButtons) are NOT exported here
// to prevent client reference manifest generation issues. Import them directly from their files.
