"use client"

import { containerClasses, cn } from "@/lib/design-system"
import { TYPOGRAPHY_SCALE } from "@repo/shared"
import { TrendingUp, BarChart3, Users, Shield, ArrowRight } from "lucide-react"

type FeaturesSectionProps = React.ComponentProps<'section'>

function FeaturesSection({ className, ...props }: FeaturesSectionProps) {
  return (
    <section className={cn("section-content md:py-16 lg:py-20", className)} {...props}>
      <div className={containerClasses('xl')}>
        <div className="grid grid-cols-12 gap-3 lg:gap-4">
          <div className="col-span-12 lg:col-span-7 row-span-2 card-elevated-authority card-padding rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="mb-2 text-foreground" style={TYPOGRAPHY_SCALE['heading-lg']}>Reduce Vacancy by 65%</h3>
                <p className="text-muted-foreground max-w-prose" style={TYPOGRAPHY_SCALE['body-md']}>
                  Smart tenant screening and automated marketing fill units faster while ensuring quality tenants.
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="col-span-12 sm:col-span-6 lg:col-span-5 card-elevated-authority card-padding rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-foreground font-semibold" style={TYPOGRAPHY_SCALE['body-md']}>Increase NOI</div>
                <div className="text-muted-foreground text-sm" style={TYPOGRAPHY_SCALE['body-sm']}>+40% average</div>
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 card-elevated-authority card-padding rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="mb-1 text-foreground" style={TYPOGRAPHY_SCALE['heading-md']}>Automate 80% of Tasks</div>
                <p className="text-muted-foreground" style={TYPOGRAPHY_SCALE['body-sm']}>Workflows handle rent collection, renewals, and communications.</p>
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 card-elevated-authority card-padding rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="mb-1 text-foreground" style={TYPOGRAPHY_SCALE['heading-md']}>Enterprise Security</div>
                <p className="text-muted-foreground" style={TYPOGRAPHY_SCALE['body-sm']}>SOC 2 compliant with role-based access and audit logs.</p>
              </div>
            </div>
          </div>

          <div className="col-span-12 card-elevated-authority card-padding rounded-2xl flex items-center justify-between">
            <div>
              <div className="mb-1 text-foreground" style={TYPOGRAPHY_SCALE['heading-lg']}>See it in action</div>
              <p className="text-muted-foreground" style={TYPOGRAPHY_SCALE['body-sm']}>Schedule a free demo tailored to your portfolio.</p>
            </div>
            <button className="btn-gradient-primary px-4 py-2 rounded-lg inline-flex items-center">
              Schedule Demo
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export { FeaturesSection }
