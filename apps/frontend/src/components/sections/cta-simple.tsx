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
  TYPOGRAPHY_SCALE 
} from '@/lib/design-system'

const benefits = [
  { icon: Zap, text: 'Setup in 5 minutes' },
  { icon: Users, text: 'No credit card required' },
  { icon: CheckCircle, text: '14-day free trial' },
  { icon: Clock, text: '24/7 support included' }
]

const testimonialStat = {
  value: '98%',
  label: 'Customer satisfaction',
  description: 'Join 10,000+ happy property managers'
}

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
    return (
      <section 
        ref={ref}
        className={cn(
          'py-24 md:py-32 relative overflow-hidden',
          'bg-gradient-to-br from-primary/5 via-background to-accent/5',
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
              <Badge variant="secondary" className="mb-8 text-sm font-medium">
                <Zap className="mr-2 size-4" />
                Ready to get started?
              </Badge>

              {/* Enhanced Headlines */}
              <h2 
                className="text-balance text-foreground mb-6 tracking-tight"
                style={TYPOGRAPHY_SCALE['display-lg']}
              >
                Start Managing Properties Today
              </h2>
              
              <p 
                className="text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8"
                style={TYPOGRAPHY_SCALE['body-lg']}
              >
                Join thousands of property managers who trust TenantFlow to streamline their operations and increase efficiency.
              </p>

              {/* Benefits Grid */}
              {showBenefits && (
                <div className="flex flex-wrap justify-center gap-6 mb-12 max-w-3xl mx-auto">
                  {benefits.map((benefit, index) => {
                    const Icon = benefit.icon
                    return (
                      <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Icon className="h-3 w-3 text-green-600 dark:text-green-400" />
                        </div>
                        <span>{benefit.text}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Enhanced CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <ShimmerButton 
                  className="px-8 py-3 text-base font-medium"
                  asChild
                >
                  <Link href={primaryCTAHref}>
                    <span className="flex items-center gap-2">
                      {primaryCTAText}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </ShimmerButton>

                <Button 
                  asChild 
                  size="lg" 
                  variant="outline"
                  className="px-8 py-3 text-base font-medium hover:shadow-md transition-all duration-200"
                >
                  <Link href={secondaryCTAHref}>
                    <span>{secondaryCTAText}</span>
                  </Link>
                </Button>
              </div>

              {/* Testimonial Stat */}
              {showTestimonialStat && (
                <div className={cn(cardClasses('default'), 'inline-flex items-center gap-4 px-8 py-4')}>
                  <div className="text-center">
                    <div 
                      className="font-bold text-primary mb-1"
                      style={TYPOGRAPHY_SCALE['heading-md']}
                    >
                      {testimonialStat.value}
                    </div>
                    <div 
                      className="text-muted-foreground"
                      style={TYPOGRAPHY_SCALE['body-xs']}
                    >
                      {testimonialStat.label}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <p 
                    className="text-muted-foreground"
                    style={TYPOGRAPHY_SCALE['body-sm']}
                  >
                    {testimonialStat.description}
                  </p>
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