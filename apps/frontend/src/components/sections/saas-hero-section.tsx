"use client"

import { ArrowRight, Play, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { BlurFade } from "@/components/magicui/blur-fade"
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text"
import { ShimmerButton } from "@/components/magicui/shimmer-button"
import { BorderBeam } from "@/components/magicui/border-beam"
import Particles from "@/components/magicui/particles"
import { 
  cn, 
  buttonClasses,
  cardClasses,
  ANIMATION_DURATIONS,
  TYPOGRAPHY_SCALE 
} from "@/lib/utils"

interface SaasHeroSectionProps {
  className?: string
}

export function SaasHeroSection({ className }: SaasHeroSectionProps) {
  return (
    <section className={cn(
      "surface-glow marketing-hero overflow-hidden",
      className
    )}>
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
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto space-y-8">
          
          {/* Announcement Banner */}
          <BlurFade delay={0.1} inView>
            <AnimatedGradientText className="inline-flex items-center justify-center">
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="inline animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent">
                Introducing TenantFlow 2.0
              </span>
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </AnimatedGradientText>
          </BlurFade>

          {/* Main Headline */}
          <BlurFade delay={0.2} inView>
            <h1 className="text-display font-heading">
              <span className="inline-block">Property management</span>
              <br />
              <span className="inline-block text-gradient-dominance">
                made effortless
              </span>
            </h1>
          </BlurFade>

          {/* Subtitle */}
          <BlurFade delay={0.3} inView>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl leading-relaxed">
              Streamline your property operations with intelligent automation, 
              powerful analytics, and seamless tenant experiences.
              <span className="block mt-2 font-medium text-foreground">
                Join 10,000+ property managers who trust TenantFlow.
              </span>
            </p>
          </BlurFade>

          {/* CTA Buttons */}
          <BlurFade delay={0.4} inView>
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
              <ShimmerButton
                shimmerColor="#ffffff"
                shimmerSize="0.05em"
                shimmerDuration="3s"
                borderRadius="8px"
                background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                className="button-primary button-lg group relative overflow-hidden"
              >
                Start free trial
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </ShimmerButton>
              
              <button className="relative inline-flex h-12 overflow-hidden rounded-lg p-[2px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 group">
                <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2E8F0_0%,#3B82F6_50%,#E2E8F0_100%)]" />
                <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-medium text-slate-900 backdrop-blur-3xl gap-2 transition-all duration-200 hover:bg-slate-50">
                  <Play className="w-5 h-5" />
                  Watch demo
                </span>
              </button>
            </div>
          </BlurFade>

          {/* Feature Pills */}
          <BlurFade delay={0.5} inView>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              {[
                { text: "No credit card required", type: "success" },
                { text: "14-day free trial", type: "info" },
                { text: "Cancel anytime", type: "default" },
                { text: "SOC 2 compliant", type: "success" }
              ].map((feature, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className={`badge ${
                    feature.type === 'success' ? 'badge-success' : 
                    feature.type === 'info' ? 'badge-info' : 'badge'
                  }`}
                >
                  {feature.text}
                </Badge>
              ))}
            </div>
          </BlurFade>

          {/* Interactive Product Preview */}
          <BlurFade delay={0.6} inView>
            <div className="relative mt-16 w-full max-w-6xl group">
              <div className="relative surface-glow rounded-2xl border border-border/20 p-2 shadow-2xl transition-all duration-500 hover:shadow-3xl hover:scale-[1.02] cursor-pointer">
                <BorderBeam size={250} duration={12} delay={9} />
                <div className="aspect-video card-elevated-gradient rounded-xl overflow-hidden">
                  {/* Real Dashboard Preview with Interactive Overlay */}
                  <div className="relative w-full h-full">
                    <img 
                      src="/assets/dashboard-clean-demo.png" 
                      alt="TenantFlow Dashboard Preview" 
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                    {/* Interactive Demo Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end justify-center pb-8">
                      <div className="surface-glow badge-info px-6 py-3 rounded-xl backdrop-blur-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <Play className="w-5 h-5 mr-2 inline animate-pulse" />
                        <span className="text-sm font-medium">Click to explore live demo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Enhanced Demo Feature Callouts */}
              <div className="absolute -left-6 top-1/4 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-200 hover:scale-110">
                <div className="badge-success px-4 py-3 rounded-xl shadow-xl backdrop-blur-sm">
                  <span className="text-sm font-medium">Real-time Analytics</span>
                </div>
              </div>
              <div className="absolute -right-6 top-1/3 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-300 hover:scale-110">
                <div className="badge-info px-4 py-3 rounded-xl shadow-xl backdrop-blur-sm">
                  <span className="text-sm font-medium">Automated Workflows</span>
                </div>
              </div>
              <div className="absolute -left-8 bottom-1/4 transform translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-400 hover:scale-110">
                <div className="badge px-4 py-3 rounded-xl shadow-xl backdrop-blur-sm">
                  <span className="text-sm font-medium">Smart Insights</span>
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