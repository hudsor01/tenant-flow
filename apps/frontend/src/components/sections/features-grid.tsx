"use client"

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface FeaturesGridProps {
  className?: string
}

export function FeaturesGrid({ className }: FeaturesGridProps) {
  const features = [
    {
      title: "Automated rent collection",
      description: "Set up recurring payments and never chase rent again"
    },
    {
      title: "Maintenance tracking",
      description: "Handle requests efficiently with our ticketing system"
    },
    {
      title: "Financial reporting",
      description: "Real-time insights into your portfolio performance"
    }
  ]

  return (
    <section className={cn("py-16 lg:py-20", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-16 lg:items-center">
          {/* Images Grid */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-12 gap-2 sm:gap-6 items-center lg:-translate-x-10">
              <div className="col-span-4">
                <img
                  className="rounded-xl object-cover w-full h-full"
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=920&q=80"
                  alt="Modern apartment building"
                />
              </div>
              <div className="col-span-3">
                <img
                  className="rounded-xl object-cover w-full h-full"
                  src="https://images.unsplash.com/photo-1565043666747-69f6646db940?w=920&q=80"
                  alt="Property interior"
                />
              </div>
              <div className="col-span-5">
                <img
                  className="rounded-xl object-cover w-full h-full"
                  src="https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=920&q=80"
                  alt="Property management dashboard"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mt-10 lg:mt-0 lg:col-span-5">
            <div className="space-y-6 sm:space-y-8">
              {/* Title */}
              <div className="space-y-3">
                <h2 className="text-3xl font-bold lg:text-4xl text-foreground">
                  Streamline your property management workflow
                </h2>
                <p className="text-muted-foreground">
                  Save hours every week with automated tools that handle the repetitive tasks, so you can focus on growing your portfolio.
                </p>
              </div>

              {/* Features List */}
              <ul className="space-y-3 sm:space-y-4">
                {features.map((feature, index) => (
                  <li key={index} className="flex gap-x-3">
                    <span className="mt-0.5 h-5 w-5 flex justify-center items-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <div className="grow">
                      <span className="text-sm sm:text-base text-muted-foreground">
                        <span className="font-semibold text-foreground">{feature.title}</span> – {feature.description}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="pt-2">
                <a
                  href="/auth/signup"
                  className="inline-flex items-center gap-x-2 text-primary font-medium hover:text-primary/80 transition-colors"
                >
                  Start your free trial
                  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeaturesGrid