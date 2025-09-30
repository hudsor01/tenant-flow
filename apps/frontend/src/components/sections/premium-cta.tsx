'use client'

import { Button } from '@/components/ui/button'
import { GlowingEffect } from '@/components/magicui/glowing-effect'
import { BlurFade } from '@/components/magicui/blur-fade'
import { cn } from '@/lib/utils'
import { ArrowRight, Check, TrendingUp, Clock } from 'lucide-react'

interface PremiumCtaProps {
  className?: string
}

export function PremiumCta({ className }: PremiumCtaProps) {

  return (
    <section className={cn(
      "relative py-16 lg:py-20 overflow-hidden bg-transparent",
      className
    )}>

      <div className="container px-4 mx-auto relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Headline */}
          <BlurFade delay={0.1} inView>
            <div className="mb-8">
              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[0.9]">
                Stop losing
                <span className="block text-primary relative">
                  $30,000+ annually
                  <div className="absolute -inset-1 bg-primary/10 blur-xl rounded-lg" />
                </span>
                <span className="block text-foreground/80 text-4xl sm:text-5xl lg:text-6xl">
                  to inefficiency
                </span>
              </h2>
            </div>
          </BlurFade>

          {/* Value Proposition */}
          <BlurFade delay={0.2} inView>
            <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed mb-10 max-w-4xl mx-auto font-light">
              Join 2,847 property managers saving 20+ hours weekly and increasing NOI by 40%.
              <span className="block mt-3 text-foreground font-medium">
                Your transformation starts with a 14-day free trial.
              </span>
            </p>
          </BlurFade>

          {/* CTA Buttons */}
          <BlurFade delay={0.3} inView>
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              {/* Primary CTA with Glow */}
              <GlowingEffect
                glowColor="hsl(var(--primary))"
                glowOpacity={0.6}
                className="group"
              >
                <Button
                  size="lg"
                  className="relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-bold px-10 py-6 rounded shadow-2xl hover:shadow-primary/25 transform hover:scale-[1.02] transition-all duration-500 group"
                  asChild
                >
                  <a href="/signup" aria-label="Start free trial">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span className="relative z-10 flex items-center">
                      Start Free Trial
                      <ArrowRight className="w-6 h-6 ml-3 transition-transform group-hover:translate-x-2 duration-500" />
                    </span>
                  </a>
                </Button>
              </GlowingEffect>

              {/* Secondary CTA */}
              <Button
                variant="outline"
                size="lg"
                className="group border-2 border-border/50 hover:border-primary/40 hover:bg-primary/5 text-lg font-semibold px-10 py-6 rounded transition-all duration-500 backdrop-blur-sm hover:shadow-lg"
                asChild
              >
                <a href="/contact" aria-label="Calculate savings">
                  <TrendingUp className="w-6 h-6 mr-3 opacity-70 group-hover:opacity-100 group-hover:text-primary transition-all duration-500" />
                  Calculate Your Savings
                </a>
              </Button>
            </div>
          </BlurFade>

          {/* Trust Signals Grid */}
          <BlurFade delay={0.4} inView>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-3xl mx-auto">
              <div className="group flex flex-col items-center p-6 rounded bg-card/20 backdrop-blur-sm border border-border/30 hover:border-primary/30 hover:bg-card/40 transition-all duration-500">
                <Check className="w-8 h-8 text-accent mb-4 group-hover:scale-110 transition-transform duration-500" />
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground mb-1">
                    No Setup Fees
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Start immediately with zero upfront costs
                  </div>
                </div>
              </div>

              <div className="group flex flex-col items-center p-6 rounded bg-card/20 backdrop-blur-sm border border-border/30 hover:border-primary/30 hover:bg-card/40 transition-all duration-500">
                <Clock className="w-8 h-8 text-accent mb-4 group-hover:scale-110 transition-transform duration-500" />
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground mb-1">
                    ROI in 30 Days
                  </div>
                  <div className="text-sm text-muted-foreground">
                    See measurable results within first month
                  </div>
                </div>
              </div>
            </div>
          </BlurFade>


        </div>
      </div>
    </section>
  )
}
