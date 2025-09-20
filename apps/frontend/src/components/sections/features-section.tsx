"use client"

import { containerClasses, cn } from "@/lib/design-system"
import { TYPOGRAPHY_SCALE } from "@repo/shared"
import { BarChart3, Users, Shield, ArrowRight } from "lucide-react"

type FeaturesSectionProps = React.ComponentProps<'section'>

function FeaturesSection({ className, ...props }: FeaturesSectionProps) {
  return (
    <section className={cn("py-24 lg:py-32", className)} {...props}>
      <div className={containerClasses('xl')}>

        {/* Apple-Inspired: Radical Simplicity & Single Focus */}
        <div className="max-w-4xl mx-auto text-center">

          {/* Typography as Hierarchy - Bold, Confident Heading */}
          <h2 className="mb-8 text-foreground text-balance" style={TYPOGRAPHY_SCALE['display-lg']}>
            Reduce Vacancy by 65%
          </h2>

          {/* Generous White Space + Clean Typography */}
          <p className="text-muted-foreground max-w-2xl mx-auto mb-20 text-balance" style={TYPOGRAPHY_SCALE['body-lg']}>
            Smart tenant screening and automated marketing fill units faster while ensuring quality tenants.
          </p>

          {/* Minimal Supporting Stats - Apple's Three-Point Focus */}
          <div className="grid grid-cols-3 gap-16 mb-16">
            <div className="card-apple apple-hover-lift p-8">
              <div className="size-16 rounded-3xl bg-primary-10-opacity text-primary flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="size-8" />
              </div>
              <div className="text-4xl font-bold text-foreground mb-3">+40%</div>
              <p className="text-muted-foreground font-medium" style={TYPOGRAPHY_SCALE['body-sm']}>Average NOI Increase</p>
            </div>

            <div className="card-apple apple-hover-lift p-8">
              <div className="size-16 rounded-3xl bg-primary-10-opacity text-primary flex items-center justify-center mx-auto mb-6">
                <Users className="size-8" />
              </div>
              <div className="text-4xl font-bold text-foreground mb-3">80%</div>
              <p className="text-muted-foreground font-medium" style={TYPOGRAPHY_SCALE['body-sm']}>Tasks Automated</p>
            </div>

            <div className="card-apple apple-hover-lift p-8">
              <div className="size-16 rounded-3xl bg-primary-10-opacity text-primary flex items-center justify-center mx-auto mb-6">
                <Shield className="size-8" />
              </div>
              <div className="text-4xl font-bold text-foreground mb-3">SOC 2</div>
              <p className="text-muted-foreground font-medium" style={TYPOGRAPHY_SCALE['body-sm']}>Enterprise Security</p>
            </div>
          </div>

          {/* Single Clear CTA - Apple Button Design */}
          <button className="btn-apple btn-primary-apple apple-press-scale px-8 py-4 text-lg font-semibold">
            Schedule Demo
            <ArrowRight className="size-5" />
          </button>

        </div>
      </div>
    </section>
  )
}

export { FeaturesSection }
