import { Card } from '@/components/ui/card'
"use client"

import { cn } from '@/lib/utils'
import {
  Building2,
  Users,
  FileText,
  TrendingUp,
  Wrench,
  CreditCard
} from 'lucide-react'

interface FeaturesShowcaseProps {
  className?: string
}

export function FeaturesShowcase({ className }: FeaturesShowcaseProps) {
  return (
    <section className={cn("py-12 lg:py-16", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="aspect-w-16 aspect-h-7">
          <img
            className="w-full object-cover rounded-xl"
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&q=80"
            alt="Modern property management platform"
          />
        </div>

        {/* Grid */}
        <div className="mt-10 lg:mt-16 grid lg:grid-cols-3 gap-8 lg:gap-12">
          <div className="lg:col-span-1">
            <h2 className="font-bold text-2xl md:text-3xl text-foreground">
              We tackle the challenges landlords face
            </h2>
            <p className="mt-2 md:mt-4 text-muted-foreground">
              From small portfolios to large estates, we've built enterprise-grade solutions for common pain points that property managers encounter daily.
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="grid sm:grid-cols-2 gap-8 md:gap-12">
              {/* Property Management */}
              <div className="flex gap-x-5">
                <Building2 className="shrink-0 mt-1 h-6 w-6 text-primary" />
                <div className="grow">
                  <h3 className="text-lg font-semibold text-foreground">
                    Centralized property hub
                  </h3>
                  <p className="mt-1 text-muted-foreground">
                    Manage all your properties, units, and amenities from a single dashboard.
                  </p>
                </div>
              </div>

              {/* Tenant Management */}
              <div className="flex gap-x-5">
                <Users className="shrink-0 mt-1 h-6 w-6 text-primary" />
                <div className="grow">
                  <h3 className="text-lg font-semibold text-foreground">
                    Tenant lifecycle management
                  </h3>
                  <p className="mt-1 text-muted-foreground">
                    From application to move-out, track every step of the tenant journey.
                  </p>
                </div>
              </div>

              {/* Digital Leases */}
              <div className="flex gap-x-5">
                <FileText className="shrink-0 mt-1 h-6 w-6 text-primary" />
                <div className="grow">
                  <h3 className="text-lg font-semibold text-foreground">
                    Digital lease automation
                  </h3>
                  <p className="mt-1 text-muted-foreground">
                    Generate, sign, and store legally compliant lease agreements digitally.
                  </p>
                </div>
              </div>

              {/* Financial Analytics */}
              <div className="flex gap-x-5">
                <TrendingUp className="shrink-0 mt-1 h-6 w-6 text-primary" />
                <div className="grow">
                  <h3 className="text-lg font-semibold text-foreground">
                    Financial intelligence
                  </h3>
                  <p className="mt-1 text-muted-foreground">
                    Real-time insights into cash flow, expenses, and portfolio performance.
                  </p>
                </div>
              </div>

              {/* Maintenance */}
              <div className="flex gap-x-5">
                <Wrench className="shrink-0 mt-1 h-6 w-6 text-primary" />
                <div className="grow">
                  <h3 className="text-lg font-semibold text-foreground">
                    Smart maintenance system
                  </h3>
                  <p className="mt-1 text-muted-foreground">
                    AI-powered ticketing with vendor management and predictive maintenance.
                  </p>
                </div>
              </div>

              {/* Payments */}
              <div className="flex gap-x-5">
                <CreditCard className="shrink-0 mt-1 h-6 w-6 text-primary" />
                <div className="grow">
                  <h3 className="text-lg font-semibold text-foreground">
                    Automated payments
                  </h3>
                  <p className="mt-1 text-muted-foreground">
                    Set up recurring rent collection with late fees and payment reminders.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeaturesShowcase