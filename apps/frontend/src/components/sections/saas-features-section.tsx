"use client"

import { Building2, Users, DollarSign, BarChart3, Shield, Zap, Clock, Globe } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CardContent } from "@/components/ui/card"
import { BlurFade } from "@/components/magicui/blur-fade"
import { MagicCard } from "@/components/magicui/magic-card"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { GridPattern } from "@/components/magicui/grid-pattern"
import { cn } from "@/lib/utils"

interface SaasFeaturesSection {
  className?: string
}

const features = [
  {
    icon: Building2,
    title: "Property Portfolio Management",
    description: "Centralized dashboard to manage multiple properties, units, and portfolios with real-time insights and automated workflows.",
    benefits: ["Multi-property overview", "Unit-level tracking", "Automated maintenance scheduling"],
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Users,
    title: "Tenant Relationship Management",
    description: "Streamlined tenant onboarding, lease management, and communication tools that enhance tenant satisfaction.",
    benefits: ["Digital lease signing", "Tenant portal access", "Automated rent collection"],
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: DollarSign,
    title: "Financial Analytics & Reporting",
    description: "Comprehensive financial tracking with automated rent collection, expense management, and profit analysis.",
    benefits: ["Real-time financial dashboards", "Automated invoicing", "Tax-ready reports"],
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Data-driven insights to optimize occupancy rates, rental pricing, and property performance with predictive analytics.",
    benefits: ["Market trend analysis", "Vacancy predictions", "ROI optimization"],
    color: "from-orange-500 to-red-500"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade security with SOC 2 compliance, encrypted data storage, and comprehensive audit trails.",
    benefits: ["SOC 2 Type II certified", "End-to-end encryption", "Role-based access control"],
    color: "from-slate-500 to-gray-600"
  },
  {
    icon: Zap,
    title: "Automation & Workflows",
    description: "Intelligent automation for routine tasks including maintenance requests, lease renewals, and tenant communications.",
    benefits: ["Smart maintenance routing", "Automated lease renewals", "Custom workflow builder"],
    color: "from-yellow-500 to-amber-500"
  }
]

const stats = [
  { number: 10000, suffix: "+", label: "Property managers", description: "trust TenantFlow globally" },
  { number: 500, suffix: "K+", label: "Units managed", description: "across 50+ countries" },
  { number: 99.9, suffix: "%", label: "Uptime", description: "guaranteed SLA" },
  { number: 50, suffix: "%", label: "Time saved", description: "on property operations" }
]

export function SaasFeaturesSection({ className }: SaasFeaturesSection) {
  return (
    <section className={cn(
      "relative py-24 surface overflow-hidden",
      className
    )}>
      <GridPattern
        width={40}
        height={40}
        x={-1}
        y={-1}
        className="absolute inset-0 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6),rgba(255,255,255,0.1))]"
        strokeDasharray="0"
      />
      <div className="container px-4 mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <BlurFade delay={0.1} inView>
            <Badge variant="outline" className="mb-4 px-3 py-1">
              <Zap className="w-4 h-4 mr-2" />
              Features
            </Badge>
          </BlurFade>
          
          <BlurFade delay={0.2} inView>
            <h2 className="text-4xl sm:text-5xl font-bold font-heading tracking-tight mb-6">
              Everything you need to manage
              <span className="block text-gradient-innovation">
                properties like a pro
              </span>
            </h2>
          </BlurFade>
          
          <BlurFade delay={0.3} inView>
            <p className="text-xl text-muted-foreground leading-relaxed">
              From tenant management to financial analytics, TenantFlow provides all the tools 
              you need to scale your property management business efficiently.
            </p>
          </BlurFade>
        </div>

        {/* Stats Grid */}
        <BlurFade delay={0.4} inView>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                  <NumberTicker
                    value={stat.number}
                    className="text-3xl sm:text-4xl font-bold text-foreground"
                  />
                  <span className="text-gradient-energy">{stat.suffix}</span>
                </div>
                <div className="text-sm font-medium text-foreground mb-1">
                  {stat.label}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </BlurFade>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <BlurFade key={index} delay={0.1 + index * 0.1} inView>
              <MagicCard
                className="h-full cursor-pointer card-elevated-gradient transition-all duration-300 hover:scale-105"
                gradientColor="#262626"
                gradientOpacity={0.1}
              >
                <CardContent className="p-8 h-full flex flex-col">
                  {/* Icon */}
                  <div className="mb-6">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4",
                      feature.color
                    )}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-3 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  {/* Benefits List */}
                  <div className="space-y-2">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <div key={benefitIndex} className="flex items-center text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-3 flex-shrink-0"></div>
                        {benefit}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </MagicCard>
            </BlurFade>
          ))}
        </div>

        {/* Bottom CTA Section */}
        <BlurFade delay={0.8} inView>
          <div className="mt-20 text-center">
            <div className="inline-flex items-center gap-3 text-sm text-muted-foreground mb-6 flex-wrap justify-center">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-500" />
                <span>Implementation in under 24 hours</span>
              </div>
              <span className="text-border hidden sm:inline">•</span>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span>Available globally</span>
              </div>
            </div>
            <p className="text-xl font-semibold text-foreground">
              Ready to transform your property management?
            </p>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}