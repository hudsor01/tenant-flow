// Landing Page Component Builder
// This file defines the available components for each section

export const availableComponents = {
	cta: {
		1: {
			name: 'Simple CTA',
			import: "import { CTASimple } from '#components/sections/cta-simple'"
		}
	},
	testimonials: {
		1: {
			name: 'Minimal Testimonials',
			import:
				"import { TestimonialsMinimal } from '#components/sections/testimonials-minimal'"
		}
	},
	footer: {
		1: {
			name: 'Standard Footer',
			import: "import Footer from '#components/layout/footer'"
		}
	}
}

// Selected components (to be updated as user selects)
export const selectedComponents = {
	navbar: 1,
	hero: 1,
	features: 1,
	pricing: 1,
	cta: null,
	testimonials: null,
	footer: null
}

// Component mapping for easy replacement
export const componentMap = {
	cta: {
		1: 'CTASimple'
	},
	testimonials: {
		1: 'TestimonialsMinimal'
	},
	footer: {
		1: 'Footer'
	}
}

// Helper function to generate the component JSX for selected components
export const generateLandingPageComponents = () => {
	const imports = []
	const components = []

	// Always include selected components
	imports.push(
		"import { PremiumHeroSection } from '#components/sections/hero-section'"
	)
	imports.push(
		"import { FeaturesSection } from '#components/sections/features-section'"
	)
	imports.push(
		"import { StripePricingSection } from '#components/pricing/stripe-pricing-section'"
	)

	components.push('<PremiumHeroSection />')
	components.push('<FeaturesSection />')

	// Add selected CTA if chosen
	if (
		selectedComponents.cta &&
		selectedComponents.cta in availableComponents.cta
	) {
		const ctaComponent =
			availableComponents.cta[
				selectedComponents.cta as keyof typeof availableComponents.cta
			]
		imports.push(ctaComponent.import)
		components.push(
			`<${componentMap.cta[selectedComponents.cta as keyof typeof componentMap.cta]} />`
		)
	}

	// Add selected testimonials if chosen
	if (
		selectedComponents.testimonials &&
		selectedComponents.testimonials in availableComponents.testimonials
	) {
		const testimonialsComponent =
			availableComponents.testimonials[
				selectedComponents.testimonials as keyof typeof availableComponents.testimonials
			]
		imports.push(testimonialsComponent.import)
		components.push(
			`<${componentMap.testimonials[selectedComponents.testimonials as keyof typeof componentMap.testimonials]} />`
		)
	}

	// Always add pricing after testimonials
	components.push('<StripePricingSection />')

	// Add selected footer if chosen
	if (
		selectedComponents.footer &&
		selectedComponents.footer in availableComponents.footer
	) {
		const footerComponent =
			availableComponents.footer[
				selectedComponents.footer as keyof typeof availableComponents.footer
			]
		imports.push(footerComponent.import)
		components.push(
			`<${componentMap.footer[selectedComponents.footer as keyof typeof componentMap.footer]} />`
		)
	}

	return { imports, components }
}
