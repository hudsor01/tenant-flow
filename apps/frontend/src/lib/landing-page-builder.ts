// Landing Page Component Builder
// This file defines the available components for each section

export const availableComponents = {
  cta: {
    1: { name: 'Simple CTA', import: "import { CTASimple } from '@/components/sections/cta-simple'" },
    2: { name: 'Gradient CTA', import: "import { CTAGradient } from '@/components/sections/cta-gradient'" },
    3: { name: 'Card-Based CTA', import: "import { CTACards } from '@/components/sections/cta-cards'" },
    4: { name: 'Minimal CTA', import: "import { CTAMinimal } from '@/components/sections/cta-minimal'" },
    5: { name: 'Stats-Driven CTA', import: "import { CTAStats } from '@/components/sections/cta-stats'" }
  },
  testimonials: {
    1: { name: 'Testimonials Grid', import: "import { TestimonialsGrid } from '@/components/sections/testimonials-grid'" },
    2: { name: 'Testimonials Carousel', import: "import { TestimonialsCarousel } from '@/components/sections/testimonials-carousel'" },
    3: { name: 'Minimal Testimonials', import: "import { TestimonialsMinimal } from '@/components/sections/testimonials-minimal'" }
  },
  footer: {
    1: { name: 'Comprehensive Footer', import: "import { FooterComprehensive } from '@/components/sections/footer-comprehensive'" },
    2: { name: 'Minimal Footer', import: "import { FooterMinimal } from '@/components/sections/footer-minimal'" },
    3: { name: 'Gradient Footer', import: "import { FooterGradient } from '@/components/sections/footer-gradient'" }
  }
}

// Selected components (to be updated as user selects)
export const selectedComponents = {
  navbar: 1, // Main Navbar - already selected
  hero: 1,   // SaaS Hero Section - already selected
  features: 1, // Canonical Bento Features Section  
  pricing: 3,  // Minimalist Pricing Section - already selected
  cta: null,        // To be selected
  testimonials: null, // To be selected
  footer: null      // To be selected
}

// Component mapping for easy replacement
export const componentMap = {
  cta: {
    1: 'CTASimple',
    2: 'CTAGradient', 
    3: 'CTACards',
    4: 'CTAMinimal',
    5: 'CTAStats'
  },
  testimonials: {
    1: 'TestimonialsGrid',
    2: 'TestimonialsCarousel',
    3: 'TestimonialsMinimal'
  },
  footer: {
    1: 'FooterComprehensive',
    2: 'FooterMinimal',
    3: 'FooterGradient'
  }
}

// Helper function to generate the component JSX for selected components
export const generateLandingPageComponents = () => {
  const imports = []
  const components = []
  
  // Always include selected components
  imports.push("import { SaasHeroSection } from '@/components/sections/saas-hero-section'")
  imports.push("import { FeaturesSection } from '@/components/sections/features-section'")
  imports.push("import { MinimalistPricingSection } from '@/components/sections/minimalist-pricing-section'")
  
  components.push('<SaasHeroSection />')
  components.push('<FeaturesSection />')
  
  // Add selected CTA if chosen
  if (selectedComponents.cta && selectedComponents.cta in availableComponents.cta) {
    const ctaComponent = availableComponents.cta[selectedComponents.cta as keyof typeof availableComponents.cta]
    imports.push(ctaComponent.import)
    components.push(`<${componentMap.cta[selectedComponents.cta as keyof typeof componentMap.cta]} />`)
  }
  
  // Add selected testimonials if chosen
  if (selectedComponents.testimonials && selectedComponents.testimonials in availableComponents.testimonials) {
    const testimonialsComponent = availableComponents.testimonials[selectedComponents.testimonials as keyof typeof availableComponents.testimonials]
    imports.push(testimonialsComponent.import)
    components.push(`<${componentMap.testimonials[selectedComponents.testimonials as keyof typeof componentMap.testimonials]} />`)
  }
  
  // Always add pricing after testimonials
  components.push('<MinimalistPricingSection />')
  
  // Add selected footer if chosen
  if (selectedComponents.footer && selectedComponents.footer in availableComponents.footer) {
    const footerComponent = availableComponents.footer[selectedComponents.footer as keyof typeof availableComponents.footer]
    imports.push(footerComponent.import)
    components.push(`<${componentMap.footer[selectedComponents.footer as keyof typeof componentMap.footer]} />`)
  }
  
  return { imports, components }
}
