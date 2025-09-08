import Navbar from '@/components/navbar'
import {
	FAQSection,
	commonPricingFAQs
} from '@/components/sections/faq-section'
import { StripePricingSection } from '@/components/sections/stripe-pricing-section'

export default function StripePricingPage() {
	return (
		<main className="min-h-screen surface-glow">
			<Navbar />
			<div className="pt-20">
				<StripePricingSection />

				<FAQSection
					faqs={commonPricingFAQs}
					showCategories={true}
					className="bg-muted/30"
				/>
			</div>
		</main>
	)
}
