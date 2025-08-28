import type { Metadata } from 'next/types'
import { OptimizedHeroSection as HeroSection } from '@/components/landing/optimized-hero-section'
import { StatsSection } from '@/components/landing/stats-section'
import { OptimizedFeaturesSection as FeaturesSection } from '@/components/landing/optimized-features-section'
import { OptimizedTestimonialsSection as TestimonialsSection } from '@/components/landing/optimized-testimonials-section'
import { PricingSection } from '@/components/landing/pricing-section'
import { OptimizedFooterSection as FooterSection } from '@/components/landing/optimized-footer-section'
// Import Client Components directly to avoid barrel export issues with client reference manifests  
import { NavigationSection } from '@/components/landing/navigation-section'
import { CtaSection as CTASection } from '@/components/landing/cta-section'
import { SEO } from '@/components/seo/SEO'

export const metadata: Metadata = {
	title: 'TenantFlow - Property_ Management Made Simple',
	description:
		'Save 10+ hours per week with the all-in-one property management platform trusted by 10,000+ property managers. Start your free 14-day trial.',
	openGraph: {
		title: 'TenantFlow - Property_ Management Made Simple',
		description:
			'Save 10+ hours per week with the all-in-one property management platform trusted by 10,000+ property managers.',
		type: 'website'
	}
}

export default function HomePage(): React.ReactElement {
	return (
		<>
			<SEO
				title="Property_ Management Made Simple"
				description="Save 10+ hours per week with the all-in-one platform trusted by 10,000+ property managers. Start your free 14-day trial."
				keywords="property management software, tenant management, rental properties, landlord tools, property managers"
				includeProduct={true}
				faqs={[
					{
						question:
							'How quickly can I get started with TenantFlow?',
						answer: 'You can get started in just 5 minutes with our guided setup process. No technical expertise required.'
					},
					{
						question: 'Do I need a credit card for the free trial?',
						answer: 'No, our 14-day free trial requires no credit card. You can explore all features risk-free.'
					}
				]}
			/>
			<NavigationSection />
			<HeroSection locale="en" />
			<StatsSection />
			<FeaturesSection locale="en" />
			<TestimonialsSection />
			<PricingSection />
			<CTASection />
			<FooterSection locale="en" />
		</>
	)
}
