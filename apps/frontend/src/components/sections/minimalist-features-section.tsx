"use client"

import { Building2, Users, BarChart3, Shield } from "lucide-react"
import { BlurFade } from "@/components/magicui/blur-fade"
import { cn } from "@/lib/utils"

interface MinimalistFeaturesSectionProps {
  className?: string
}

const features = [
  {
    icon: Building2,
    title: "Portfolio Management",
    description: "Centralized view of all your properties with automated maintenance scheduling and unit tracking."
  },
  {
    icon: Users,
    title: "Tenant Relations",
    description: "Streamlined tenant onboarding, digital lease signing, and 24/7 tenant portal access."
  },
  {
    icon: BarChart3,
    title: "Financial Analytics",
    description: "Real-time financial reporting, automated rent collection, and comprehensive profit analysis."
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade security with SOC 2 compliance, encrypted data storage, and audit trails."
  }
]

export function MinimalistFeaturesSection({ className }: MinimalistFeaturesSectionProps) {
  return (
    <section className={cn(
      "py-24 lg:py-32 bg-gray-50 dark:bg-gray-900",
      className
    )}>
      <div className="container px-4 mx-auto">
        <div className="max-w-6xl mx-auto">
          
          {/* Section Header */}
          <div className="text-center mb-20">
            <BlurFade delay={0.1} inView>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-gray-900 dark:text-white mb-6">
                Everything you need.
                <br />
                Nothing you don't.
              </h2>
            </BlurFade>
            
            <BlurFade delay={0.2} inView>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-light">
                Simple, powerful tools that help property managers focus on growth, 
                not administrative overhead.
              </p>
            </BlurFade>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
            {features.map((feature, index) => (
              <BlurFade key={index} delay={0.1 + index * 0.1} inView>
                <div className="flex gap-6">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-light">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>

          {/* Simple CTA */}
          <BlurFade delay={0.6} inView>
            <div className="text-center mt-20">
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Used by property managers worldwide
              </p>
              <div className="flex items-center justify-center gap-8 opacity-40">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-24 h-8 bg-gray-300 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}