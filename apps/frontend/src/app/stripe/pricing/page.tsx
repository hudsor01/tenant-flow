import Navbar from 'src/components/navbar'
import { StripePricingSection } from 'src/components/sections/stripe-pricing-section'

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
