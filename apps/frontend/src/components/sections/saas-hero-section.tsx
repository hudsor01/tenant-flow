"use client"

import * as React from 'react'
import { ArrowRight, Play, Sparkles, CheckCircle, TrendingUp, Settings, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BlurFade } from "@/components/magicui/blur-fade"
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text"
import { ShimmerButton } from "@/components/magicui/shimmer-button"
import { BorderBeam } from "@/components/magicui/border-beam"
import Particles from "@/components/magicui/particles"
import Link from 'next/link'
import { 
  cn, 
  buttonClasses,
  cardClasses,
  TYPOGRAPHY_SCALE,
  ANIMATION_DURATIONS
} from "@/lib/design-system"

export interface SaasHeroSectionProps extends React.ComponentProps<'section'> {
  announcementText?: string
  headline?: string
  subheadline?: string
  primaryCTAText?: string
  primaryCTAHref?: string
  secondaryCTAText?: string
  secondaryCTAHref?: string
  showFeaturePills?: boolean
  showProductPreview?: boolean
  showSocialProof?: boolean
}

export const SaasHeroSection = React.forwardRef<HTMLElement, SaasHeroSectionProps>(
  ({ 
    announcementText = "Trusted by 10,000+ property managers",
    headline: _headline = "Simplify Property Management",
    subheadline = "Professional property managers streamline operations, automate workflows, and scale their business with TenantFlow's enterprise-grade platform.",
    primaryCTAText = "Start 14-day transformation",
    primaryCTAHref = "/auth/sign-up",
    secondaryCTAText = "See ROI calculator",
    secondaryCTAHref = "/demo",
    showFeaturePills = true,
    showProductPreview = true,
    showSocialProof = true,
    className,
    ...props
  }, ref) => {
    const featurePills = [
      { text: "ROI in 90 days guaranteed", icon: TrendingUp },
      { text: "Enterprise security included", icon: Shield },
      { text: "API & integrations ready", icon: Settings },
      { text: "Dedicated success manager", icon: CheckCircle }
    ]

    return (
      <section 
        ref={ref}
        className={cn(
          "relative min-h-screen flex items-center justify-center overflow-hidden",
          "bg-gradient-to-br from-background via-background to-muted/20",
          "py-24 sm:py-32",
          className
        )}
        {...props}
      >
        {/* Background Effects */}
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
          <div className="flex flex-col items-center text-center max-w-6xl mx-auto space-y-12">
            
            {/* Enhanced Announcement Banner */}
            <BlurFade delay={0.1} inView>
              <div className="mb-8">
                <AnimatedGradientText className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-primary/20 hover:border-primary/40 bg-gradient-to-r from-background/80 via-card/80 to-background/80 backdrop-blur-sm shadow-lg hover:shadow-primary/25 cursor-pointer group"
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
              <h1 
                className="text-foreground tracking-tight text-balance leading-tight mb-6"
                style={TYPOGRAPHY_SCALE['display-2xl']}
              >
                <span className="inline-block bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent drop-shadow-lg">
                  Simplify
                </span>
                <br />
                <span className="text-foreground">
                  Property Management
                </span>
              </h1>
            </BlurFade>

            {/* Enhanced Subtitle */}
            <BlurFade delay={0.3} inView>
              <div className="max-w-4xl mx-auto space-y-6 mb-12">
                <p 
                  className="text-muted-foreground leading-relaxed text-balance"
                  style={TYPOGRAPHY_SCALE['body-lg']}
                >
                  {subheadline}
                </p>
                {showSocialProof && (
                  <div className="space-y-4">
                    <p 
                      className="text-foreground font-semibold"
                      style={TYPOGRAPHY_SCALE['body-md']}
                    >
                      Join property managers who've transformed their business
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium">
                      <div className="flex items-center gap-2 text-green-600">
                        <TrendingUp className="size-4" />
                        <span>40% NOI increase average</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-600">
                        <CheckCircle className="size-4" />
                        <span>Pays for itself in 2.3 months</span>
                      </div>
                      <div className="flex items-center gap-2 text-purple-600">
                        <Shield className="size-4" />
                        <span>Enterprise-grade security</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </BlurFade>

            {/* Enhanced CTA Buttons */}
            <BlurFade delay={0.4} inView>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ShimmerButton
                  className="px-12 py-5 text-lg font-bold shadow-2xl hover:shadow-3xl transform hover:scale-105 active:scale-95"
                  asChild
                  style={{
                    transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
                  }}
                >
                  <Link href={primaryCTAHref}>
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      {primaryCTAText}
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </ShimmerButton>
                
                <Button
                  variant="outline"
                  size="lg"
                  className={cn(
                    buttonClasses('outline', 'lg'),
                    "px-12 py-5 text-lg font-semibold border-2 hover:shadow-xl transform hover:scale-105 active:scale-95 bg-background/80 backdrop-blur-sm"
                  )}
                  asChild
                  style={{
                    transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
                  }}
                >
                  <Link href={secondaryCTAHref}>
                    <Play className="w-5 h-5 mr-2" />
                    {secondaryCTAText}
                  </Link>
                </Button>
              </div>
              
              {/* Trust Indicators */}
              <div className="mt-8 text-center text-muted-foreground space-y-2">
                <p className="font-medium" style={TYPOGRAPHY_SCALE['body-sm']}>Start your 14-day business transformation</p>
                <p className="text-xs">No setup fees • Enterprise security • 99.9% uptime SLA • Cancel anytime</p>
              </div>
            </BlurFade>

            {/* Enhanced Feature Pills */}
            {showFeaturePills && (
              <BlurFade delay={0.5} inView>
                <div className="flex flex-wrap items-center justify-center gap-6 mt-16">
                  {featurePills.map((feature, index) => {
                    const Icon = feature.icon
                    const colors = {
                      0: 'from-green-500 to-emerald-500',
                      1: 'from-blue-500 to-cyan-500', 
                      2: 'from-purple-500 to-pink-500',
                      3: 'from-orange-500 to-red-500'
                    }
                    
                    return (
                      <div
                        key={index}
                        className={cn(
                          cardClasses('interactive'),
                          "flex items-center gap-3 px-6 py-3 rounded-full border-2 text-sm font-medium group cursor-pointer bg-gradient-to-r from-background/80 to-card/80 backdrop-blur-sm hover:shadow-lg"
                        )}
                        style={{
                          transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
                        }}
                      >
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${colors[index % 4 as keyof typeof colors]} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-foreground group-hover:text-primary transition-colors">{feature.text}</span>
                      </div>
                    )
                  })}
                </div>
              </BlurFade>
            )}

            {/* Enhanced Interactive Product Preview */}
            {showProductPreview && (
              <BlurFade delay={0.6} inView>
                <div className="relative mt-24 w-full max-w-7xl group">
                  <div className={cn(
                    cardClasses('elevated'),
                    "relative p-4 bg-gradient-to-br from-card via-background to-muted/20 border-2 border-border hover:border-primary/30 rounded-3xl shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] cursor-pointer"
                  )}
                  style={{
                    transition: `all ${ANIMATION_DURATIONS.medium} cubic-bezier(0.4, 0, 0.2, 1)`
                  }}
                  >
                    <BorderBeam size={300} duration={12} delay={9} />
                    <div className="aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted/20 relative">
                      {/* Enhanced Dashboard Preview */}
                      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10">
                        <div className="text-center space-y-6 z-10">
                          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                            <Play className="w-10 h-10 text-white" />
                          </div>
                          <div className="space-y-2">
                            <p 
                              className="text-foreground font-semibold"
                              style={TYPOGRAPHY_SCALE['heading-sm']}
                            >
                              Interactive Dashboard Preview
                            </p>
                            <p 
                              className="text-muted-foreground"
                              style={TYPOGRAPHY_SCALE['body-sm']}
                            >
                              See TenantFlow in action with real property data
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="lg"
                            className="px-8 py-3 font-semibold border-2 hover:shadow-lg transform hover:scale-105 active:scale-95 bg-background/80 backdrop-blur-sm"
                            style={{
                              transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
                            }}
                          >
                            <Play className="mr-2 size-4" />
                            View Live Demo
                          </Button>
                        </div>
                        
                        {/* Enhanced Feature Callouts */}
                        <div className="absolute top-6 left-6 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-200 transform translate-y-2 group-hover:translate-y-0">
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg px-4 py-2">
                            <TrendingUp className="mr-1 size-3" />
                            Real-time Analytics
                          </Badge>
                        </div>
                        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-300 transform translate-y-2 group-hover:translate-y-0">
                          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-lg px-4 py-2">
                            <Settings className="mr-1 size-3" />
                            Automated Workflows
                          </Badge>
                        </div>
                        <div className="absolute bottom-6 left-6 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-400 transform translate-y-2 group-hover:translate-y-0">
                          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg px-4 py-2">
                            <Sparkles className="mr-1 size-3" />
                            AI-Powered Insights
                          </Badge>
                        </div>
                        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-500 transform translate-y-2 group-hover:translate-y-0">
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-lg px-4 py-2">
                            <Shield className="mr-1 size-3" />
                            Enterprise Security
                          </Badge>
                        </div>
                        
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-5">
                          <div className="w-full h-full bg-grid-pattern"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </BlurFade>
            )}
          </div>
        </div>

        {/* Bottom Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </section>
    )
  }
)

SaasHeroSection.displayName = 'SaasHeroSection'