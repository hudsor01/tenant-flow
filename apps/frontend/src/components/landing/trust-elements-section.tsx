/**
 * Trust Elements Section - Client Component
 * Displays security badges, certifications, guarantees, and trust indicators
 * Optimized for conversion and mobile responsiveness
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Shield, Lock, Award, Users, Clock, CheckCircle, Star, Zap } from 'lucide-react'
import { BlurFade, NumberTicker, BorderBeam } from '@/components/magicui'
import { motion } from 'framer-motion'
import { ANIMATION_DELAYS, INTERACTION_ANIMATIONS } from '@/lib/animations/constants'

const trustElements = [
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'SOC 2 Type II certified with 256-bit SSL encryption',
    color: 'text-blue-500',
    bgColor: 'from-blue-500/20 to-blue-500/10'
  },
  {
    icon: Lock,
    title: 'GDPR Compliant',
    description: 'Full data protection compliance for global operations',
    color: 'text-green-500',
    bgColor: 'from-green-500/20 to-green-500/10'
  },
  {
    icon: Award,
    title: 'Industry Awards',
    description: '2024 PropTech Innovation Award Winner',
    color: 'text-yellow-500',
    bgColor: 'from-yellow-500/20 to-yellow-500/10'
  },
  {
    icon: Users,
    title: '99.9% Uptime SLA',
    description: 'Enterprise-grade reliability guarantee',
    color: 'text-purple-500',
    bgColor: 'from-purple-500/20 to-purple-500/10'
  }
]

const guarantees = [
  {
    icon: CheckCircle,
    title: '30-Day Money Back',
    description: 'Full refund if you\'re not completely satisfied',
    highlight: true
  },
  {
    icon: Clock,
    title: 'No Setup Fees',
    description: 'Get started immediately with zero upfront costs'
  },
  {
    icon: Zap,
    title: 'Free Migration',
    description: 'We\'ll help you migrate from your current system'
  },
  {
    icon: Star,
    title: 'Dedicated Support',
    description: '24/7 customer success team always ready to help'
  }
]

const industryStats = [
  {
    value: 10000,
    suffix: '+',
    label: 'Active Property Managers',
    subtext: 'Trust TenantFlow daily'
  },
  {
    value: 50000,
    suffix: '+',
    label: 'Properties Under Management',
    subtext: 'Across 50 states'
  },
  {
    value: 4.9,
    suffix: '/5',
    label: 'Customer Satisfaction',
    subtext: 'From 1,200+ reviews'
  },
  {
    value: 99.9,
    suffix: '%',
    label: 'Platform Uptime',
    subtext: 'Guaranteed reliability'
  }
]

export function TrustElementsSection() {
  return (
    <section className="section-spacing relative overflow-hidden bg-gradient-to-b from-background via-base2/50 to-background">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="animate-blob absolute left-10 top-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="animate-blob animation-delay-2000 absolute bottom-10 right-10 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="container relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 0}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Shield className="h-4 w-4" />
              Trusted & Secure Platform
            </div>
          </BlurFade>
          <BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 1}>
            <h2 className="mb-4 text-3xl font-bold md:text-4xl lg:text-5xl">
              Built for <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Enterprise Security</span>
            </h2>
          </BlurFade>
          <BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 2}>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Your data and your tenants' information are protected by industry-leading security measures and compliance standards.
            </p>
          </BlurFade>
        </div>

        {/* Security & Compliance Cards */}
        <div className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trustElements.map((element, index) => {
            const IconComponent = element.icon
            return (
              <BlurFade
                key={index}
                delay={ANIMATION_DELAYS.FAST_STAGGER * (3 + index)}
              >
                <Card className="group relative border-2 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
                  <BorderBeam className="rounded-lg opacity-0 group-hover:opacity-100" />
                  <CardContent className="p-6">
                    <div className={`mb-4 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br ${element.bgColor} p-3`}>
                      <IconComponent className={`h-6 w-6 ${element.color}`} />
                    </div>
                    <h3 className="mb-2 font-semibold">{element.title}</h3>
                    <p className="text-sm text-muted-foreground">{element.description}</p>
                  </CardContent>
                </Card>
              </BlurFade>
            )
          })}
        </div>

        {/* Guarantees Section */}
        <div className="mb-16">
          <BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 7}>
            <h3 className="mb-8 text-center text-2xl font-bold">
              Risk-Free Trial with Industry-Leading Guarantees
            </h3>
          </BlurFade>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {guarantees.map((guarantee, index) => {
              const IconComponent = guarantee.icon
              return (
                <BlurFade
                  key={index}
                  delay={ANIMATION_DELAYS.FAST_STAGGER * (8 + index)}
                >
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    className={`group relative overflow-hidden rounded-2xl border-2 p-6 text-center transition-all duration-300 ${
                      guarantee.highlight
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border bg-card hover:border-primary/30'
                    }`}
                  >
                    {guarantee.highlight && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <div className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                          Most Popular
                        </div>
                      </div>
                    )}
                    <div className="mb-3 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="mb-2 font-semibold">{guarantee.title}</h4>
                    <p className="text-sm text-muted-foreground">{guarantee.description}</p>
                  </motion.div>
                </BlurFade>
              )
            })}
          </div>
        </div>

        {/* Industry Stats */}
        <div className="mb-8">
          <BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 12}>
            <h3 className="mb-8 text-center text-2xl font-bold">
              Trusted by the Industry
            </h3>
          </BlurFade>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {industryStats.map((stat, index) => (
              <BlurFade
                key={index}
                delay={ANIMATION_DELAYS.FAST_STAGGER * (13 + index)}
              >
                <motion.div
                  whileHover={INTERACTION_ANIMATIONS.PROMINENT_TAP.whileHover}
                  className="text-center"
                >
                  <div className="mb-2 text-3xl font-bold text-primary lg:text-4xl">
                    <NumberTicker value={stat.value} className="inline" />
                    {stat.suffix}
                  </div>
                  <div className="mb-1 text-sm font-medium">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.subtext}</div>
                </motion.div>
              </BlurFade>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <BlurFade delay={ANIMATION_DELAYS.FAST_STAGGER * 17}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="mx-auto max-w-2xl rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-8 backdrop-blur-sm">
              <h3 className="mb-4 text-2xl font-bold">
                Start Your Risk-Free Trial Today
              </h3>
              <p className="mb-6 text-muted-foreground">
                Join thousands of property managers who trust TenantFlow with their business.
                14-day free trial, no credit card required.
              </p>
              <motion.button
                {...INTERACTION_ANIMATIONS.PROMINENT_TAP}
                className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Start Free Trial Now
                <motion.span
                  className="ml-2"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.button>
              <div className="mt-4 flex justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>No Credit Card</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Cancel Anytime</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Money Back Guarantee</span>
                </div>
              </div>
            </div>
          </motion.div>
        </BlurFade>
      </div>
    </section>
  )
}
