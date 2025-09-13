'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BlurFade } from '@/components/magicui/blur-fade'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { ArrowRight, CheckCircle, Clock, Users, Zap } from 'lucide-react'
import Link from 'next/link'
import { 
  cn, 
  cardClasses, 
  buttonClasses,
  TYPOGRAPHY_SCALE,
  ANIMATION_DURATIONS
} from '@/lib/design-system'

const benefits = [
  { icon: Zap, text: 'Setup in 5 minutes', highlight: 'instant' },
  { icon: Users, text: 'No credit card required', highlight: 'risk-free' },
  { icon: CheckCircle, text: '14-day free trial', highlight: 'trial' },
  { icon: Clock, text: '24/7 support included', highlight: 'support' }
]

const testimonialStats = [
  {
    value: '98%',
    label: 'Customer satisfaction',
    description: 'Average rating from 2,000+ reviews'
  },
  {
    value: '10,000+',
    label: 'Active users',
    description: 'Property managers worldwide'
  },
  {
    value: '40%',
    label: 'Revenue increase',
    description: 'Average portfolio growth'
  }
]

export interface CTASimpleProps extends React.ComponentProps<'section'> {
  variant?: 'simple' | 'enhanced' | 'testimonial'
  showBenefits?: boolean
  showTestimonialStat?: boolean
  primaryCTAText?: string
  secondaryCTAText?: string
  primaryCTAHref?: string
  secondaryCTAHref?: string
}

export const CTASimple = React.forwardRef<HTMLElement, CTASimpleProps>(
  ({
    variant = 'enhanced',
    showBenefits = true,
    showTestimonialStat = true,
    primaryCTAText = 'Start Free Trial',
    secondaryCTAText = 'Schedule Demo',
    primaryCTAHref = '/auth/sign-up',
    secondaryCTAHref = '/contact',
    className,
    ...props
  }, ref) => {
    const variantStyles = {
      simple: 'section-content md:py-20 bg-background',
      enhanced: 'section-hero md:py-32 bg-gradient-to-br from-primary/5 via-background to-accent/5',
      testimonial: 'py-20 md:py-28 bg-gradient-to-r from-background via-primary/5 to-background'
    }

    return (
      <section 
        ref={ref}
        className={cn(
          'relative overflow-hidden',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-small-black/[0.02] dark:bg-grid-small-white/[0.02]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative container mx-auto max-w-5xl px-6">
          <BlurFade delay={0.1}>
            <div className="text-center">
              {/* Enhanced Badge */}
              <Badge 
                variant="secondary" 
                className="mb-8 text-sm font-medium bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:border-primary/40 transition-all duration-200"
              >
                <Zap className="mr-2 size-4 text-primary animate-pulse" />
                Ready to transform your property management?
              </Badge>

              {/* Enhanced Headlines */}
              <h2 
                className="text-balance text-foreground mb-6 tracking-tight"
                style={TYPOGRAPHY_SCALE['display-lg']}
              >
                Ready to <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Scale Your Success</span>?
              </h2>
              
              <div className="max-w-3xl mx-auto mb-8 space-y-4">
                <p 
                  className="text-muted-foreground leading-relaxed"
                  style={TYPOGRAPHY_SCALE['body-lg']}
                >
                  Join thousands of property managers who've transformed their business with TenantFlow's intelligent automation and real-time insights.
                </p>
                <div className="flex items-center justify-center gap-8 text-sm">
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle className="size-4" />
                    <span>Trusted by 10,000+ managers</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 font-medium">
                    <CheckCircle className="size-4" />
                    <span>SOC 2 Type II certified</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Benefits Grid */}
              {showBenefits && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 max-w-4xl mx-auto">
                  {benefits.map((benefit, index) => {
                    const Icon = benefit.icon
                    const highlightColors = {
                      instant: 'from-orange-500 to-red-500',
                      'risk-free': 'from-green-500 to-emerald-500', 
                      trial: 'from-blue-500 to-cyan-500',
                      support: 'from-purple-500 to-pink-500'
                    }
                    
                    return (
                      <div key={index} 
                           className={cn(
                             cardClasses('interactive'),
                             "p-4 text-center group cursor-pointer bg-gradient-to-br from-card to-muted/20"
                           )}
                           style={{
                             transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
                           }}
                      >
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${highlightColors[benefit.highlight as keyof typeof highlightColors]} mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{benefit.text}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Enhanced CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
                <ShimmerButton 
                  className="px-10 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95"
                  asChild
                  style={{
                    transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
                  }}
                >
                  <Link href={primaryCTAHref}>
                    <span className="flex items-center gap-2">
                      <Zap className="size-5" />
                      {primaryCTAText}
                      <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </ShimmerButton>

                <Button
                  variant="outline"
                  size="lg"
                  className={cn(
                    buttonClasses('outline', 'lg'),
                    "px-10 py-4 text-lg font-medium border-2 hover:shadow-lg transform hover:scale-105 active:scale-95 bg-background/80 backdrop-blur-sm"
                  )}
                  style={{
                    transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
                  }}
                  asChild
                >
                  <Link href={secondaryCTAHref}>
                    <span className="flex items-center gap-2">
                      <Users className="size-5" />
                      {secondaryCTAText}
                    </span>
                  </Link>
                </Button>
              </div>

              {/* Enhanced Testimonial Stats */}
              {showTestimonialStat && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {testimonialStats.map((stat, index) => (
                    <div key={index} 
                         className={cn(
                           cardClasses('interactive'), 
                           'p-6 text-center group cursor-pointer bg-gradient-to-br from-card via-background to-muted/30'
                         )}
                         style={{
                           transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
                         }}
                    >
                      <div 
                        className="font-bold text-primary mb-2 group-hover:scale-110 transition-transform"
                        style={TYPOGRAPHY_SCALE['heading-lg']}
                      >
                        {stat.value}
                      </div>
                      <div 
                        className="text-foreground font-semibold mb-1 group-hover:text-primary transition-colors"
                        style={TYPOGRAPHY_SCALE['body-sm']}
                      >
                        {stat.label}
                      </div>
                      <p 
                        className="text-muted-foreground text-xs leading-relaxed"
                      >
                        {stat.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </BlurFade>
        </div>
      </section>
    )
  }
)

CTASimple.displayName = 'CTASimple'
