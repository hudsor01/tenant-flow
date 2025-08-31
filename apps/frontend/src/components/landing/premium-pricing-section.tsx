/**
 * Premium Pricing Section with Magic UI
 * Interactive pricing cards with beautiful animations and effects
 */

"use client";

import { BlurFade, BorderBeam, ShimmerButton, RainbowButton, AnimatedGradientText, NumberTicker } from '@/components/magicui'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { BORDER_BEAM_PRESETS, INTERACTION_ANIMATIONS } from '@/lib/animations/constants'

import { useState } from 'react'
import { Check, Sparkles, Zap, Shield, ArrowRight } from 'lucide-react'

interface PricingTier {
  id: string
  name: string
  description: string
  price: {
    monthly: number
    yearly: number
  }
  features: string[]
  highlighted?: boolean
  badge?: string
  icon: React.ReactNode
}

const pricingTiers: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for individual landlords',
    price: {
      monthly: 29,
      yearly: 290
    },
    icon: <Zap className="w-6 h-6" />,
    features: [
      'Up to 10 properties',
      'Basic dashboard & analytics',
      'Tenant portal access',
      'Maintenance tracking',
      'Email support',
      'Mobile app access'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing property management companies',
    price: {
      monthly: 79,
      yearly: 790
    },
    icon: <Sparkles className="w-6 h-6" />,
    features: [
      'Up to 50 properties',
      'Advanced analytics & reporting',
      'Automated rent collection',
      'Document e-signatures',
      'Priority support',
      'API access',
      'Custom integrations',
      'Team collaboration tools'
    ],
    highlighted: true,
    badge: 'Most Popular'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited scale for large portfolios',
    price: {
      monthly: 199,
      yearly: 1990
    },
    icon: <Shield className="w-6 h-6" />,
    features: [
      'Unlimited properties',
      'White-label options',
      'Dedicated account manager',
      'Custom workflows',
      'Advanced security features',
      'SLA guarantee',
      'On-premise deployment option',
      'Custom training & onboarding'
    ]
  }
]

function PricingCard({ tier, billing, index }: { tier: PricingTier; billing: 'monthly' | 'yearly'; index: number }) {
  const price = billing === 'monthly' ? tier.price.monthly : tier.price.yearly
  const period = billing === 'monthly' ? '/month' : '/year'
  const savings = billing === 'yearly' ? Math.round(tier.price.monthly * 12 - tier.price.yearly) : 0

  return (
    <BlurFade delay={0.1 * index}>
      <motion.div
        whileHover={{ y: -10, scale: 1.02 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "group relative overflow-hidden rounded-3xl border bg-card/50 backdrop-blur-sm p-8",
          tier.highlighted
            ? "border-primary shadow-2xl shadow-primary/20 scale-105"
            : "border-border/50 hover:border-primary/50"
        )}
      >
        {/* Border Beam for highlighted tier */}
        {tier.highlighted && (
          <BorderBeam {...BORDER_BEAM_PRESETS.PREMIUM} />
        )}

        {/* Badge */}
        {tier.badge && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <AnimatedGradientText className="px-4 py-1.5 text-xs font-semibold">
              {tier.badge}
            </AnimatedGradientText>
          </div>
        )}

        {/* Limited Time Offer for Professional */}
        {tier.highlighted && (
          <div className="absolute -top-2 -right-2">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white shadow-lg"
            >
              🔥 Save 20%
            </motion.div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-primary/10 p-3 text-primary">
            {tier.icon}
          </div>
          <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
          <p className="text-muted-foreground">{tier.description}</p>
        </div>

        {/* Price */}
        <div className="mb-8">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">
              $<NumberTicker value={price} className="inline" />
            </span>
            <span className="text-muted-foreground">{period}</span>
          </div>
          {billing === 'yearly' && savings > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400"
            >
              Save $<NumberTicker value={savings} className="inline" />/year
            </motion.div>
          )}
        </div>

        {/* Features */}
        <ul className="mb-6 space-y-3">
          {tier.features.map((feature, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className="flex items-start gap-3"
            >
              <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                <Check className="w-3 h-3 text-primary" />
              </div>
              <span className="text-sm">{feature}</span>
            </motion.li>
          ))}
        </ul>

        {/* Value Proposition for Professional */}
        {tier.highlighted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 rounded-2xl bg-gradient-to-r from-green-500/10 to-blue-500/10 p-4 border border-green-500/20"
          >
            <div className="text-center space-y-2">
              <div className="text-xs font-medium text-green-600 dark:text-green-400">
                💰 AVERAGE ROI
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                <NumberTicker value={340} className="inline" />% in Year 1
              </div>
              <div className="text-xs text-muted-foreground">
                Save 15-20 hrs/week + increase revenue 12%
              </div>
            </div>
          </motion.div>
        )}

        {/* Money-back guarantee */}
        {tier.highlighted && (
          <div className="mb-4 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>30-day money-back guarantee</span>
            </div>
          </div>
        )}

        {/* CTA Button */}
        {tier.highlighted ? (
          <RainbowButton className="w-full">
            Get Started
            <ArrowRight className="ml-2 w-4 h-4" />
          </RainbowButton>
        ) : (
          <ShimmerButton className="w-full">
            <span className="flex items-center justify-center gap-2">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </span>
          </ShimmerButton>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl" />
      </motion.div>
    </BlurFade>
  )
}

export function PremiumPricingSection() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <section className="section-spacing relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      <div className="container relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <BlurFade delay={0}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-4">
                💎 Transparent Pricing
              </span>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Choose the Perfect Plan for
                <span className="block bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Your Property Portfolio
                </span>
              </h2>
              <div className="space-y-4 mb-8">
                <p className="text-lg text-muted-foreground">
                  Start with a 14-day free trial. No credit card required.
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-green-600 dark:text-green-400">
                    <Check className="w-4 h-4" />
                    <span>Cancel anytime</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-blue-600 dark:text-blue-400">
                    <Shield className="w-4 h-4" />
                    <span>No setup fees</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1 text-purple-600 dark:text-purple-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Migration support</span>
                  </div>
                </div>
              </div>

              {/* Billing Toggle */}
              <div className="inline-flex items-center gap-4 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm p-1">
                <button
                  onClick={() => setBilling('monthly')}
                  className={cn(
                    "rounded-full px-6 py-2 text-sm font-medium transition-all duration-300",
                    billing === 'monthly'
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBilling('yearly')}
                  className={cn(
                    "rounded-full px-6 py-2 text-sm font-medium transition-all duration-300",
                    billing === 'yearly'
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Yearly
                  <span className="ml-2 text-xs">Save 20%</span>
                </button>
              </div>
            </motion.div>
          </BlurFade>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6 lg:gap-8">
          {pricingTiers.map((tier, index) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              billing={billing}
              index={index}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <BlurFade delay={0.6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-20 mx-auto max-w-2xl"
          >
            <h3 className="text-2xl font-bold text-center mb-8">
              Frequently Asked Questions
            </h3>
            <div className="space-y-4">
              {[
                {
                  q: 'Can I change plans anytime?',
                  a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.'
                },
                {
                  q: 'Is there a setup fee?',
                  a: 'No, there are no hidden fees. You only pay the subscription price.'
                },
                {
                  q: 'Do you offer custom pricing?',
                  a: 'Yes, we offer custom pricing for portfolios over 500 units. Contact our sales team.'
                }
              ].map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * i }}
                  className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-6"
                >
                  <h4 className="font-semibold mb-2">{faq.q}</h4>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </BlurFade>

        {/* CTA */}
        <BlurFade delay={0.8}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 text-center"
          >
            <p className="mb-6 text-lg text-muted-foreground">
              Still have questions? We're here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                {...INTERACTION_ANIMATIONS.PROMINENT_TAP}
                className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-base font-medium text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Start Free Trial
                <motion.span
                  className="ml-2"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.button>
              <button className="inline-flex items-center justify-center rounded-full border border-border bg-background/50 backdrop-blur-sm px-8 py-3 text-base font-medium hover:bg-muted transition-all duration-300">
                Schedule Demo
              </button>
            </div>
          </motion.div>
        </BlurFade>
      </div>
    </section>
  )
}
