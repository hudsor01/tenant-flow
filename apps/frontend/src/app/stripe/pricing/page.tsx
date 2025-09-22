import Navbar from '@/components/layout/navbar'
import { StripePricingSection } from '@/components/pricing/stripe-pricing-section'

export default function StripePricingPage() {
	return (
		<main className="min-h-screen surface-glow">
			<Navbar />
			<div className="pt-20">
				<StripePricingSection />
			</div>
		</main>
	)
}
