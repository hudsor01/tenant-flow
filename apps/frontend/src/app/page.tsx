import { SaasHeroSection } from '@/components/sections/saas-hero-section'
import { FeaturesSectionDemo3 } from '@/components/magicui/features-section-demo-3'
import { MinimalistPricingSection } from '@/components/sections/minimalist-pricing-section'
import { FooterMinimal } from '@/components/sections/footer-minimal'
import ClientFeedback from '@/components/ui/testimonial'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/navbar'

// CTA Section with Enhanced Typography
const CTASection = () => (
  <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
    <div className="mx-auto max-w-6xl px-6 text-center">
      <div className="prose prose-xl lg:prose-2xl prose-slate mx-auto mb-12">
        <h2 className="text-display text-gradient-primary mb-6 not-prose">
          Ready to transform your property management?
        </h2>
        <p className="text-xl leading-relaxed text-balance text-muted-foreground max-w-3xl mx-auto">
          Join thousands of property managers who've streamlined their operations and scaled their business with TenantFlow's enterprise platform.
        </p>
      </div>
      
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/50">
        <h3 className="text-2xl font-semibold mb-8 text-foreground tracking-tight">
          Transform Your Operations Today
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button size="lg" className="w-full font-medium">Start 14-day transformation</Button>
          <Button size="lg" variant="outline" className="w-full font-medium">See ROI calculator</Button>
          <Button size="lg" variant="secondary" className="w-full font-medium">Schedule Demo</Button>
        </div>
      </div>
    </div>
  </section>
)



export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navbar />
      
      {/* Hero Section - SELECTED */}
      <SaasHeroSection />
      
      {/* Features Section - SELECTED */}
      <FeaturesSectionDemo3 />
      
      {/* CTA Section - IMPLEMENTED */}
      <CTASection />
      
      {/* Testimonials Section - IMPLEMENTED */}
      <ClientFeedback />
      
      {/* Pricing Section - SELECTED */}
      <MinimalistPricingSection />
      
      {/* Footer Section - SELECTED: Minimal Footer */}
      <FooterMinimal />
    </div>
  )
}