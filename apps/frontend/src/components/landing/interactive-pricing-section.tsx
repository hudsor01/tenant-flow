/**
 * Interactive Pricing Section - Client Component
 * Handles billing toggle and interactive pricing display
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Shield, Lock, HeadphonesIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InteractivePricingSectionProps {
  locale: string
}

export function InteractivePricingSection({ locale }: InteractivePricingSectionProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')

  const pricingPlans = [
    {
      name: 'Starter',
      price: billingCycle === 'monthly' ? 29 : 24,
      originalPrice: billingCycle === 'monthly' ? null : 29,
      units: 'Up to 10 units',
      features: [
        'Tenant & Owner Portals',
        'Online Rent Collection',
        'Maintenance Tracking',
        'Basic Reporting',
        'Email Support'
      ],
      cta: 'Start Free Trial',
      popular: false
    },
    {
      name: 'Professional',
      price: billingCycle === 'monthly' ? 79 : 66,
      originalPrice: billingCycle === 'monthly' ? null : 79,
      units: 'Up to 50 units',
      features: [
        'Everything in Starter',
        'Advanced Analytics',
        'Automated Late Fees',
        'Lease Management',
        'Priority Support',
        'API Access'
      ],
      cta: 'Start Free Trial',
      popular: true,
      badge: 'MOST POPULAR'
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      units: 'Unlimited units',
      features: [
        'Everything in Pro',
        'Custom Integrations',
        'Dedicated Account Manager',
        'Custom Training',
        'SLA Guarantee',
        'White-label Options'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ]

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <Badge className="bg-purple-100 text-purple-700 mb-4">SIMPLE PRICING</Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan, Start Saving Today
          </h2>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <span className={cn("font-medium", billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500')}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              <span className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition",
                billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
            <span className={cn("font-medium", billingCycle === 'annual' ? 'text-gray-900' : 'text-gray-500')}>
              Annual
              <Badge className="ml-2 bg-green-100 text-green-700">Save 20%</Badge>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <Card 
              key={index}
              className={cn(
                "relative p-6 transition-all duration-300",
                plan.popular ? "border-2 border-orange-500 shadow-2xl scale-105" : "border hover:shadow-xl"
              )}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-4">
                  {plan.badge}
                </Badge>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-1">
                  {plan.price === 'Custom' ? (
                    <span className="text-4xl font-bold">Custom</span>
                  ) : (
                    <>
                      {plan.originalPrice && (
                        <span className="text-2xl text-gray-400 line-through mr-2">
                          ${plan.originalPrice}
                        </span>
                      )}
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-gray-500">/mo</span>
                    </>
                  )}
                </div>
                <p className="text-gray-600">{plan.units}</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link href={`/${locale}/signup`} className="block">
                <Button 
                  className={cn(
                    "w-full transition-colors",
                    plan.popular 
                      ? "bg-orange-500 hover:bg-orange-600 text-white" 
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  {plan.cta}
                </Button>
              </Link>
              
              {plan.popular && (
                <p className="text-center text-sm text-gray-500 mt-3">
                  Chosen by 67% of customers
                </p>
              )}
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              30-day money-back guarantee
            </span>
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              Bank-level security
            </span>
            <span className="flex items-center gap-2">
              <HeadphonesIcon className="w-4 h-4 text-purple-600" />
              24/7 Priority support
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}