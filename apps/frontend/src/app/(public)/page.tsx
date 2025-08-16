import type { Metadata } from 'next/types'
import {
	NavigationSection,
	HeroSection,
	StatsSection,
	FeaturesSection,
	TestimonialsSection,
	PricingSection,
	CTASection,
	FooterSection
} from '@/components/landing'
import { SEO } from '@/components/seo/seo'
import { OAuthRedirectHandler } from '@/components/auth/oauth-redirect-handler'

export const metadata: Metadata = {
	title: 'TenantFlow - Property Management Made Simple',
	description:
		'Save 10+ hours per week with the all-in-one property management platform trusted by 10,000+ property managers. Start your free 14-day trial.',
	openGraph: {
		title: 'TenantFlow - Property Management Made Simple',
		description:
			'Save 10+ hours per week with the all-in-one property management platform trusted by 10,000+ property managers.',
		type: 'website'
	}
}

export default function HomePage(): React.ReactElement {
	return (
		<>
			<SEO
				title="Property Management Made Simple"
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
			<OAuthRedirectHandler />
			<NavigationSection />
			<HeroSection />
			<StatsSection />
			<FeaturesSection />
			<TestimonialsSection />
			<PricingSection />
			<CTASection />
			<FooterSection />
		</>
	)
}
