import { PremiumHeroSection } from '@/components/sections/premium-hero-section'
import { FeaturesSection } from '@/components/sections/features-section'
import { MinimalistPricingSection } from '@/components/sections/minimalist-pricing-section'
import { FooterMinimal } from '@/components/sections/footer-minimal'
import ClientFeedback from '@/components/ui/testimonial'
import { Button } from '@/components/ui/button'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { Navbar } from '@/components/navbar'
import { BlurFade } from '@/components/magicui/blur-fade'
import { TYPOGRAPHY_SCALE } from '@repo/shared'
import { containerClasses } from '@/lib/design-system'
import { ArrowRight } from 'lucide-react'

// CTA Section with Design System Consistency
const CTASection = () => (
  <section className="section-hero gradient-authority">
    <div className={containerClasses('lg')}>
      <BlurFade delay={0.1} inView>
        <div className="text-center space-y-8">
          <h2 className="font-bold tracking-tight leading-tight text-gradient-authority" style={TYPOGRAPHY_SCALE['heading-xl']}>
            Ready to transform property management?
          </h2>
          <p 
            className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
            style={TYPOGRAPHY_SCALE['body-lg']}
          >
            Join thousands of property managers who've streamlined their operations and 
            scaled their business with TenantFlow's enterprise platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <ShimmerButton size="lg" className="group">
              <span className="inline-flex items-center">
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </span>
            </ShimmerButton>
            <Button 
              variant="outline"
              size="xl"
              className="btn-gradient-primary"
            >
              Schedule Demo
            </Button>
          </div>
          <p 
            className="text-muted-foreground"
            style={TYPOGRAPHY_SCALE['body-sm']}
          >
            No setup fees • Enterprise security • 99.9% uptime SLA • Cancel anytime
          </p>
        </div>
      </BlurFade>
    </div>
  </section>
)



export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navbar />
      
      {/* Hero Section - PREMIUM BENTO LAYOUT */}
      <PremiumHeroSection />
      
      {/* Features Section - Design System (MagicUI) */}
      <FeaturesSection />
      
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
