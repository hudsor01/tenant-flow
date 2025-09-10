"use client";

import * as React from 'react'
import { BlurFade } from '@/components/magicui/blur-fade'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { MagicCard } from '@/components/magicui/magic-card'
import Particles from '@/components/magicui/particles'
import { Building, Users, BarChart, Shield, TrendingUp, Calendar, MessageSquare, Settings } from 'lucide-react'
import { 
  cn, 
  buttonClasses,
  cardClasses,
  ANIMATION_DURATIONS,
  TYPOGRAPHY_SCALE 
} from '@/lib/utils'

const features = [
  {
    name: 'Smart Property Analytics',
    description: 'Real-time insights and performance metrics for your entire portfolio with predictive analytics and automated reporting.',
    Icon: TrendingUp,
    className: 'col-span-3 lg:col-span-1',
    background: (
      <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-primary/10 to-accent/10" />
    ),
    cta: 'View Analytics'
  },
  {
    name: 'Property Portfolio Management', 
    description: 'Comprehensive property management with detailed profiles, documentation, photos, and performance tracking.',
    Icon: Building,
    className: 'col-span-3 lg:col-span-2',
    background: (
      <div className="absolute inset-0">
        <Particles className="absolute inset-0" quantity={100} ease={80} color="#3b82f6" refresh />
      </div>
    ),
    cta: 'Manage Properties'
  },
  {
    name: 'Tenant Lifecycle',
    description: 'End-to-end tenant management from screening to move-out with automated workflows.',
    Icon: Users,
    className: 'col-span-3 lg:col-span-2',
    background: (
      <div className="absolute inset-0 opacity-30">
        <DotPattern width={20} height={20} />
      </div>
    ),
    cta: 'View Tenants'
  },
  {
    name: 'Maintenance Hub',
    description: 'Streamlined maintenance requests with vendor management and real-time tracking.',
    Icon: Shield,
    className: 'col-span-3 lg:col-span-1',
    background: (
      <div className="absolute inset-0 opacity-25 bg-gradient-to-br from-success/10 to-info/10" />
    ),
    cta: 'Track Requests'
  },
  {
    name: 'Communication Center',
    description: 'Centralized messaging platform for tenants, vendors, and property managers.',
    Icon: MessageSquare,
    className: 'col-span-3 lg:col-span-1',
    background: (
      <div className="absolute inset-0 opacity-20">
        <DotPattern width={16} height={16} />
      </div>
    ),
    cta: 'View Messages'
  },
  {
    name: 'Automated Scheduling',
    description: 'Smart scheduling for maintenance, inspections, and tenant appointments.',
    Icon: Calendar,
    className: 'col-span-3 lg:col-span-1',
    background: (
      <div className="absolute inset-0">
        <Particles className="absolute inset-0" quantity={50} ease={60} color="#10b981" refresh />
      </div>
    ),
    cta: 'Schedule Now'
  },
  {
    name: 'Advanced Settings',
    description: 'Customize workflows, notifications, and integrations to match your business needs.',
    Icon: Settings,
    className: 'col-span-3 lg:col-span-1',
    background: (
      <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-warning/10 to-destructive/10" />
    ),
    cta: 'Configure'
  }
];

type FeaturesSectionProps = React.ComponentProps<'section'>

export const FeaturesSection = React.forwardRef<HTMLElement, FeaturesSectionProps>(
  ({ className, ...props }, ref) => {
  return (
    <section ref={ref} className={cn("marketing-hero surface-pattern", className)} {...props}>
      <div className="container">
        <BlurFade delay={0.1}>
          <div className="text-center mb-16">
            <div className="badge mb-6">
              <BarChart className="size-4" />
              Complete Property Management Suite
              <BarChart className="size-4" />
            </div>
            <h2 className="text-display tracking-tight text-foreground">
              Everything You Need in{' '}
              <span className="text-gradient-primary">One Platform</span>
            </h2>
            <p className="mt-6 text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to streamline every aspect of property management, 
              from tenant screening to maintenance tracking and financial analytics.
            </p>
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <div className="adaptive-layout max-w-6xl mx-auto">
            {features.map((feature, idx) => (
              <MagicCard
                key={idx}
                className="card-elevated-gradient p-6 relative overflow-hidden group cursor-pointer bg-gradient-to-br from-card to-muted/20 border-2 border-border/50 hover:border-primary/30 rounded-2xl backdrop-blur-sm"
              >
                {feature.background}
                <div className="relative z-10">
                  <feature.Icon className="size-8 mb-4 text-primary transition-transform group-hover:scale-110" />
                  <h3 className="text-lg font-semibold mb-2 tracking-tight">{feature.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{feature.description}</p>
                  <span className="text-primary text-sm font-medium group-hover:underline transition-colors">
                    {feature.cta} →
                  </span>
                </div>
              </MagicCard>
            ))}
          </div>
        </BlurFade>
        
        {/* Additional Features Showcase */}
        <BlurFade delay={0.4}>
          <div className="mt-20 adaptive-layout">
            {[
              {
                title: 'AI-Powered Insights',
                description: 'Get intelligent recommendations based on market data and property performance.',
                icon: TrendingUp,
                gradient: 'from-blue-500 to-purple-600'
              },
              {
                title: 'Mobile First Design', 
                description: 'Manage your properties on-the-go with our responsive mobile interface.',
                icon: MessageSquare,
                gradient: 'from-green-500 to-teal-600'
              },
              {
                title: 'Enterprise Security',
                description: 'Bank-level security with end-to-end encryption and compliance standards.',
                icon: Shield,
                gradient: 'from-orange-500 to-red-600'
              }
            ].map((item, index) => (
              <MagicCard key={index} className="card-glass cursor-pointer group bg-gradient-to-bl from-card via-background to-muted/30 border-dashed border-2 hover:border-solid hover:border-accent rounded-3xl backdrop-blur-md">
                <div className={`inline-flex items-center justify-center size-12 rounded-xl bg-gradient-to-r ${item.gradient} mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                  <item.icon className="size-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </MagicCard>
            ))}
          </div>
        </BlurFade>
      </div>
    </section>
  )
})
FeaturesSection.displayName = 'FeaturesSection'

export default FeaturesSection