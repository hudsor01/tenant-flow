'use client'

import * as React from 'react'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { HeroVariant } from '@/types/marketing'
import { 
  cn, 
  buttonClasses,
  cardClasses,
  ANIMATION_DURATIONS,
  TYPOGRAPHY_SCALE 
} from '@/lib/utils'

export interface HeroSectionProps extends React.ComponentProps<'section'> {
  variant?: HeroVariant;
  badgeText?: string;
  ctaPrimaryLabel?: string;
  ctaSecondaryLabel?: string;
}

export const HeroSection = React.forwardRef<HTMLElement, HeroSectionProps>(
  ({
    variant = 'simple',
    badgeText = 'Property Management Platform',
    ctaPrimaryLabel = 'Get Started Free',
    ctaSecondaryLabel = 'Watch Demo',
    className,
    ...props
  }, ref) => {
  return (
    <section ref={ref} className={cn("marketing-hero relative scroll-smooth overscroll-contain bg-gradient-to-br from-background via-background to-muted/20", className)} {...props}>
      {/* Enhanced Background with positioning */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary background layer */}
        <div className="absolute inset-0 transition-all duration-500 ease-out">
          {variant === 'simple' && (
            <div className="surface absolute inset-0 animate-fade-in bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
          )}
          {variant === 'glow' && (
            <div className="surface-glow absolute inset-0 animate-fade-in bg-gradient-radial from-primary/10 via-transparent to-transparent" />
          )}
          {variant === 'pattern' && (
            <div className="surface-pattern absolute inset-0 animate-fade-in bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
          )}
        </div>
        
        {/* Positioned decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-radial from-primary/20 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-radial from-accent/15 to-transparent rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        
        <DotPattern
          className="[mask-image:radial-gradient(600px_circle_at_center,white,transparent)] opacity-10 transition-opacity duration-700 ease-in-out bg-fixed"
          width={20}
          height={20}
          cx={1}
          cy={1}
          cr={1}
        />
      </div>

      <div className="relative container text-center scroll-snap-start">
        {/* Enhanced Badge with advanced borders */}
        <div className="mb-8 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          <span className="badge inline-flex items-center gap-2 cursor-default hover:scale-105 transition-all duration-300 ease-out border-2 border-primary/20 hover:border-primary/40 bg-gradient-to-r from-background via-card to-background backdrop-blur-sm shadow-lg hover:shadow-primary/25">
            <Sparkles className="size-4 animate-pulse text-primary drop-shadow-sm" />
            {badgeText}
          </span>
        </div>

        {/* Enhanced Headline with text effects */}
        <h1 className="text-display text-foreground mb-6 tracking-tight animate-fade-in-up bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent" style={{animationDelay: '0.4s'}}>
          Streamline Your <span className="text-primary animate-pulse drop-shadow-lg">Property Portfolio</span>
        </h1>

        {/* Description */}
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up transition-colors duration-300" style={{animationDelay: '0.6s'}}>
          Modern property management with intelligent automation and real-time insights.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{animationDelay: '0.8s'}}>
          <ShimmerButton className="button-lg transform transition-all duration-200 ease-out hover:scale-105 active:scale-95 cursor-pointer">
            <span className="flex items-center gap-2">
              {ctaPrimaryLabel}
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          </ShimmerButton>

          <Link href="/demo">
            <button className="button-secondary text-lg font-medium transition-all duration-200 ease-out transform hover:scale-105 active:scale-95 hover:shadow-md cursor-pointer">
              {ctaSecondaryLabel}
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
})
HeroSection.displayName = 'HeroSection'

export default HeroSection
