import FAQsFour from '@/components/faqs-4'
import FooterSection from '@/components/footer'
import { HeroSection } from '@/components/marketing/hero-section'
import { Navbar } from '@/components/navbar'
import { CTAMinimal } from '@/components/sections/cta-minimal'
import { FeaturesGrid } from '@/components/sections/features-grid'
import { MinimalistPricingSection } from '@/components/sections/minimalist-pricing-section'
import { TestimonialsMinimal } from '@/components/sections/testimonials-minimal'
import StatsSection from '@/components/stats-4'

export default function HomePage() {
	return (
		<div className="min-h-screen bg-background">
			{/* Navigation - Floating Glass Effect */}
			<Navbar />

			{/* Hero Section - Premium Video Background */}
			<HeroSection />

			{/* Stats Section - Social Proof */}
			<StatsSection />

			{/* Features Grid - Visual Showcase */}
			<FeaturesGrid className="py-24" />

			{/* Testimonials - Trust Building */}
			<TestimonialsMinimal className="bg-accent/5 py-24" />

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
