"use client"

import * as React from 'react'
import { ArrowRight, Play, Sparkles, CheckCircle, TrendingUp, Settings, Shield, Star, Users, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BlurFade } from "@/components/magicui/blur-fade"
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text"
import { ShimmerButton } from "@/components/magicui/shimmer-button"
import { BorderBeam } from "@/components/magicui/border-beam"
import Particles from "@/components/magicui/particles"
import { BentoGrid, BentoCard, BentoTitle, BentoDescription } from "@/components/ui/bento-grid"
import Link from 'next/link'
import { 
  cn, 
  TYPOGRAPHY_SCALE,
  ANIMATION_DURATIONS
} from "@/lib/design-system"

export interface PremiumHeroSectionProps extends React.ComponentProps<'section'> {
  announcementText?: string
  headline?: string
  subheadline?: string
  primaryCTAText?: string
  primaryCTAHref?: string
  secondaryCTAText?: string
  secondaryCTAHref?: string
}

export const PremiumHeroSection = React.forwardRef<HTMLElement, PremiumHeroSectionProps>(
  ({ 
    announcementText = "Trusted by 10,000+ property managers",
    headline: _headline = "Simplify Property Management",
    subheadline = "Professional property managers streamline operations, automate workflows, and scale their business with TenantFlow's enterprise-grade platform.",
    primaryCTAText = "Start 14-day transformation",
    primaryCTAHref = "/auth/sign-up",
    secondaryCTAText = "See ROI calculator",
    secondaryCTAHref = "/demo",
    className,
    ...props
  }, ref) => {

    return (
      <section 
        ref={ref}
        className={cn(
          "relative min-h-screen flex items-center justify-center overflow-hidden",
          "bg-background",
          "pt-32 pb-24 sm:pt-40 sm:pb-32",
          className
        )}
        {...props}
      >
        {/* Background Effects */}
        <div className="absolute inset-0 gradient-authority opacity-10" />
        <div className="absolute inset-0 bg-grid-small-black/[0.02] dark:bg-grid-small-white/[0.02]" />
        <Particles
          className="absolute inset-0"
          quantity={30}
          ease={80}
          color="#64748b"
          refresh
        />
        
        {/* Content Container */}
        <div className="relative z-10 container px-4 mx-auto">
          <div className="max-w-7xl mx-auto">
            
            {/* Enhanced Announcement Banner */}
            <BlurFade delay={0.1} inView>
              <div className="text-center mb-12">
                <AnimatedGradientText className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-primary/20 hover:border-primary/40 bg-gradient-to-r from-background/90 via-card/90 to-background/90 backdrop-blur-sm shadow-lg hover:shadow-primary/25 cursor-pointer group"
                  style={{
                    transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2 text-primary animate-pulse" />
                  <span className="inline animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent font-semibold">
                    {announcementText}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-2 text-primary transition-transform group-hover:translate-x-1" />
                </AnimatedGradientText>
              </div>
            </BlurFade>

            {/* Enhanced Main Headline */}
            <BlurFade delay={0.2} inView>
              <div className="text-center mb-8">
                <h1 className="text-balance leading-tight mb-6 text-gradient-authority" style={TYPOGRAPHY_SCALE['display-2xl']}>
                  Simplify
                  <br />
                  Property Management
                </h1>
                <p 
                  className="text-muted-foreground leading-relaxed text-balance max-w-3xl mx-auto"
                  style={TYPOGRAPHY_SCALE['body-lg']}
                >
                  {subheadline}
                </p>
              </div>
            </BlurFade>

            {/* Premium Bento Grid Layout */}
            <BlurFade delay={0.3} inView>
              <BentoGrid className="mb-16">
                
                {/* Main CTA Cards - Full Width */}
                <BentoCard 
                  variant="interactive" 
                  colSpan={3}
                  className="gradient-authority text-primary-foreground border-0"
                >
                  <div className="flex flex-col items-center text-center h-full justify-center py-8">
                    <Sparkles className="w-12 h-12 mb-4 animate-pulse" />
                    <BentoTitle size="xl" className="text-white mb-4">
                      {primaryCTAText}
                    </BentoTitle>
                    <BentoDescription size="lg" className="text-primary-foreground/80 mb-6">
                      No setup fees • Enterprise security • 99.9% uptime SLA
                    </BentoDescription>
                    <ShimmerButton
                      className="px-8 py-4 text-lg font-bold shadow-xl"
                      asChild
                    >
                      <Link href={primaryCTAHref}>
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5" />
                          Get Started Free
                          <ArrowRight className="w-5 h-5" />
                        </span>
                      </Link>
                    </ShimmerButton>
                  </div>
                  <BorderBeam size={300} duration={12} />
                </BentoCard>

                <BentoCard 
                  variant="elevated" 
                  colSpan={3}
                  className="group cursor-pointer"
                >
                  <div className="flex flex-col items-center text-center h-full justify-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                    <BentoTitle size="lg" className="mb-4">
                      {secondaryCTAText}
                    </BentoTitle>
                    <BentoDescription size="md" className="mb-6">
                      See how TenantFlow increases NOI by 40% average
                    </BentoDescription>
                    <Button
                      variant="outline"
                      size="lg"
                      className="px-8 py-3 font-semibold border-2 hover:shadow-lg transform hover:scale-105 active:scale-95 bg-background/80 backdrop-blur-sm"
                      asChild
                    >
                      <Link href={secondaryCTAHref}>
                        <Play className="w-5 h-5 mr-2" />
                        View Demo
                      </Link>
                    </Button>
                  </div>
                </BentoCard>

                {/* Feature Highlight Cards */}
                <BentoCard variant="minimal" colSpan={2}>
                  <div className="flex items-center gap-4 h-full">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <BentoTitle size="sm">ROI in 90 days</BentoTitle>
                      <BentoDescription size="sm">Guaranteed return on investment or money back</BentoDescription>
                    </div>
                  </div>
                </BentoCard>

                <BentoCard variant="minimal" colSpan={2}>
                  <div className="flex items-center gap-4 h-full">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <BentoTitle size="sm">Enterprise Security</BentoTitle>
                      <BentoDescription size="sm">SOC 2 Type II certified with advanced encryption</BentoDescription>
                    </div>
                  </div>
                </BentoCard>

                <BentoCard variant="minimal" colSpan={2}>
                  <div className="flex items-center gap-4 h-full">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Settings className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <BentoTitle size="sm">API & Integrations</BentoTitle>
                      <BentoDescription size="sm">Connect with 100+ property management tools</BentoDescription>
                    </div>
                  </div>
                </BentoCard>

                {/* Social Proof Cards */}
                <BentoCard variant="elevated" colSpan={1}>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">10K+</div>
                    <BentoDescription size="sm">Property Managers</BentoDescription>
                  </div>
                </BentoCard>

                <BentoCard variant="elevated" colSpan={1}>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">40%</div>
                    <BentoDescription size="sm">Average NOI Increase</BentoDescription>
                  </div>
                </BentoCard>

                <BentoCard variant="elevated" colSpan={1}>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
                    <BentoDescription size="sm">Uptime SLA</BentoDescription>
                  </div>
                </BentoCard>

                <BentoCard variant="elevated" colSpan={1}>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                      ))}
                    </div>
                    <BentoDescription size="sm">Customer Rating</BentoDescription>
                  </div>
                </BentoCard>

                <BentoCard variant="elevated" colSpan={1}>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">2.3</div>
                    <BentoDescription size="sm">Months Payback</BentoDescription>
                  </div>
                </BentoCard>

                <BentoCard variant="elevated" colSpan={1}>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                    <BentoDescription size="sm">Support Available</BentoDescription>
                  </div>
                </BentoCard>

              </BentoGrid>
            </BlurFade>

            {/* Trust Indicators */}
            <BlurFade delay={0.4} inView>
              <div className="text-center text-muted-foreground">
                <p className="font-medium mb-2" style={TYPOGRAPHY_SCALE['body-sm']}>
                  Join property managers who've transformed their business
                </p>
                <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="size-4" />
                    <span>Pays for itself in 2.3 months</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600">
                    <Users className="size-4" />
                    <span>Dedicated success manager</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-600">
                    <Clock className="size-4" />
                    <span>Cancel anytime</span>
                  </div>
                </div>
              </div>
            </BlurFade>
          </div>
        </div>

        {/* Bottom Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>
    )
  }
)

PremiumHeroSection.displayName = 'PremiumHeroSection'
