import FAQsFour from '@/components/faqs-4'
import FooterSection from '@/components/footer'
import { HeroSection } from '@/components/marketing/hero-section'
import { Navbar } from '@/components/navbar'
import { CTAMinimal } from '@/components/sections/cta-minimal'
import { FeaturesGrid } from '@/components/sections/features-grid'
import { MinimalistPricingSection } from '@/components/sections/minimalist-pricing-section'
import { Stats } from '@/components/sections/stats'
import { TestimonialsBento } from '@/components/sections/testimonials-bento'

export default function HomePage() {
	return (
		<div className="min-h-screen bg-background">
			{/* Navigation - Floating Glass Effect */}
			<Navbar />

			{/* Hero Section - Premium Video Background */}
			<HeroSection />

			{/* Stats Section - Social Proof */}
			<Stats />

			{/* Features Grid - Visual Showcase */}
			<FeaturesGrid className="py-24" />

			{/* Testimonials - Trust Building */}
			<TestimonialsBento />

			{/* Pricing - Clear Value Proposition */}
			<MinimalistPricingSection className="py-24" />

			{/* FAQ - Address Concerns */}
			<FAQsFour />

			{/* CTA - Final Conversion */}
			<CTAMinimal className="py-24" />

			{/* Footer - Clean and Functional */}
			<FooterSection />
		</div>
	)
}
