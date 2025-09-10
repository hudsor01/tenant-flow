"use client"

import * as React from 'react'
import { ArrowRight, Play, Sparkles, CheckCircle } from "lucide-react"
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
  TYPOGRAPHY_SCALE 
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
    announcementText = "Introducing TenantFlow 2.0",
    headline = "Property management made effortless",
    subheadline = "Streamline your property operations with intelligent automation, powerful analytics, and seamless tenant experiences.",
    primaryCTAText = "Start free trial",
    primaryCTAHref = "/auth/sign-up",
    secondaryCTAText = "Watch demo",
    secondaryCTAHref = "/demo",
    showFeaturePills = true,
    showProductPreview = true,
    showSocialProof = true,
    className,
    ...props
  }, ref) => {
    const featurePills = [
      { text: "No credit card required", icon: CheckCircle },
      { text: "14-day free trial", icon: Sparkles },
      { text: "Cancel anytime", icon: CheckCircle },
      { text: "SOC 2 compliant", icon: CheckCircle }
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
            
            {/* Announcement Banner */}
            <BlurFade delay={0.1} inView>
              <AnimatedGradientText className="inline-flex items-center justify-center px-1 py-1 mb-6">
                <Sparkles className="w-4 h-4 mr-2" />
                <span className="inline animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent font-medium">
                  {announcementText}
                </span>
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </AnimatedGradientText>
            </BlurFade>

            {/* Main Headline */}
            <BlurFade delay={0.2} inView>
              <h1 
                className="text-foreground tracking-tight text-balance leading-tight"
                style={TYPOGRAPHY_SCALE['display-2xl']}
              >
                <span className="inline-block">Property management</span>
                <br />
                <span className="inline-block bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                  made effortless
                </span>
              </h1>
            </BlurFade>

            {/* Subtitle */}
            <BlurFade delay={0.3} inView>
              <div className="max-w-4xl mx-auto space-y-4">
                <p 
                  className="text-muted-foreground leading-relaxed text-balance"
                  style={TYPOGRAPHY_SCALE['body-lg']}
                >
                  {subheadline}
                </p>
                {showSocialProof && (
                  <p 
                    className="text-foreground font-medium"
                    style={TYPOGRAPHY_SCALE['body-md']}
                  >
                    Join 10,000+ property managers who trust TenantFlow.
                  </p>
                )}
              </div>
            </BlurFade>

            {/* CTA Buttons */}
            <BlurFade delay={0.4} inView>
              <div className="flex flex-col sm:flex-row items-center gap-6 mt-8">
                <ShimmerButton
                  className="px-8 py-4 text-base font-semibold"
                  asChild
                >
                  <Link href={primaryCTAHref}>
                    <span className="flex items-center gap-2">
                      {primaryCTAText}
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </ShimmerButton>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 text-base font-medium border-2 hover:shadow-lg transition-all duration-200"
                  asChild
                >
                  <Link href={secondaryCTAHref}>
                    <Play className="w-5 h-5 mr-2" />
                    {secondaryCTAText}
                  </Link>
                </Button>
              </div>
            </BlurFade>

            {/* Feature Pills */}
            {showFeaturePills && (
              <BlurFade delay={0.5} inView>
                <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
                  {featurePills.map((feature, index) => {
                    const Icon = feature.icon
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border text-sm text-muted-foreground hover:bg-muted/80 transition-colors"
                      >
                        <Icon className="w-4 h-4 text-green-600" />
                        <span>{feature.text}</span>
                      </div>
                    )
                  })}
                </div>
              </BlurFade>
            )}

            {/* Interactive Product Preview */}
            {showProductPreview && (
              <BlurFade delay={0.6} inView>
                <div className="relative mt-20 w-full max-w-7xl group">
                  <div className={cn(
                    cardClasses('elevated'),
                    "relative p-3 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] cursor-pointer"
                  )}>
                    <BorderBeam size={250} duration={12} delay={9} />
                    <div className="aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted/20">
                      {/* Dashboard Preview Placeholder */}
                      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <div className="text-center space-y-4">
                          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                            <Play className="w-8 h-8 text-white" />
                          </div>
                          <p 
                            className="text-muted-foreground"
                            style={TYPOGRAPHY_SCALE['body-md']}
                          >
                            Interactive Dashboard Preview
                          </p>
                          <Button variant="outline" size="sm">
                            View Live Demo
                          </Button>
                        </div>
                        
                        {/* Feature Callouts */}
                        <div className="absolute top-8 left-8 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-200">
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Real-time Analytics
                          </Badge>
                        </div>
                        <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-300">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            Automated Workflows
                          </Badge>
                        </div>
                        <div className="absolute bottom-8 left-8 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-400">
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                            Smart Insights
                          </Badge>
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