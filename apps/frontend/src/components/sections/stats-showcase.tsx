'use client'

import { BorderBeam } from '@/components/magicui/border-beam'
import { BlurFade } from '@/components/magicui/blur-fade'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { cn } from '@/lib/utils'

interface StatsShowcaseProps {
  className?: string
}

export function StatsShowcase({ className }: StatsShowcaseProps) {

  const stats = [
    {
      number: "2,847",
      value: 2847,
      label: "Property Owners",
      description: "Trust TenantFlow daily",
      suffix: "",
      prefix: ""
    },
    {
      number: "18,947",
      value: 18947,
      label: "Units Managed",
      description: "Across our platform",
      suffix: "",
      prefix: ""
    },
    {
      number: "96%",
      value: 96,
      label: "On-Time Payments",
      description: "Average collection rate",
      suffix: "%",
      prefix: ""
    },
    {
      number: "40%",
      value: 40,
      label: "NOI Increase",
      description: "Within 90 days",
      suffix: "%",
      prefix: "+"
    }
  ]

  return (
    <section className={cn(
      "relative py-12 lg:py-16 overflow-hidden bg-transparent",
      className
    )}>

      <div className="container px-4 mx-auto relative z-10">
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <BlurFade delay={0.1} inView>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6 leading-tight">
              Trusted by property managers
              <span className="text-primary block">nationwide</span>
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Join thousands who&apos;ve transformed their operations with TenantFlow
            </p>
          </BlurFade>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <BlurFade key={stat.label} delay={0.2 + index * 0.1} inView>
              <div className="relative group">
                <div className="relative bg-card/50 border border-border/40 rounded p-6 text-center backdrop-blur-sm hover:bg-card/90 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 overflow-hidden hover:-translate-y-1 hover:scale-[1.02]">
                  {/* Animated border beam */}
                  <BorderBeam
                    size={120}
                    duration={15 + index * 2}
                    delay={index * 2}
                    colorFrom="var(--color-primary)"
                    colorTo="var(--color-accent)"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  />

                  {/* Background glow effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-primary/[0.08] via-transparent to-accent/[0.08] rounded pointer-events-none transition-all duration-500 blur-sm" />

                  <div className="relative z-10">
                    {/* Animated number with enhanced styling */}
                    <div className="text-3xl lg:text-4xl font-bold text-primary mb-2 tracking-tight group-hover:scale-105 transition-transform duration-300">
                      {stat.prefix}
                      <NumberTicker
                        value={stat.value}
                        delay={0.3 + index * 0.1}
                        className="font-bold"
                      />
                      {stat.suffix}
                    </div>

                    {/* Enhanced label with hover effect */}
                    <div className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors duration-300">
                      {stat.label}
                    </div>

                    {/* Enhanced description */}
                    <div className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                      {stat.description}
                    </div>
                  </div>

                  {/* Enhanced hover gradient with animation */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-primary/[0.04] to-accent/[0.04] rounded pointer-events-none transition-all duration-500" />

                  {/* Floating accent particles */}
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-125 animate-pulse" />
                  <div className="absolute bottom-3 left-3 w-1.5 h-1.5 rounded-full bg-primary/60 opacity-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-150" />
                </div>
              </div>
            </BlurFade>
          ))}
        </div>

      </div>
    </section>
  )
}