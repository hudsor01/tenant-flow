"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BlurFade } from "@/components/magicui/blur-fade"
import { cn } from "@/lib/utils"

interface MinimalistPricingSectionProps {
  className?: string
}

const plans = [
  {
    name: "Starter",
    price: 29,
    description: "For individual property owners",
    features: [
      "Up to 5 properties",
      "Basic tenant management", 
      "Rent collection",
      "Email support"
    ]
  },
  {
    name: "Professional",
    price: 99,
    description: "For growing property businesses",
    features: [
      "Up to 50 properties",
      "Advanced analytics",
      "Automated workflows",
      "Priority support",
      "API access"
    ],
    popular: true
  },
  {
    name: "Enterprise",
    price: null,
    description: "For large property portfolios",
    features: [
      "Unlimited properties",
      "Custom integrations",
      "Dedicated support",
      "Custom training",
      "SLA guarantees"
    ]
  }
]

export function MinimalistPricingSection({ className }: MinimalistPricingSectionProps) {
  return (
    <section className={cn(
      "py-24 lg:py-32 bg-white dark:bg-gray-950",
      className
    )}>
      <div className="container px-4 mx-auto">
        <div className="max-w-6xl mx-auto">
          
          {/* Section Header */}
          <div className="text-center mb-20">
            <BlurFade delay={0.1} inView>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-gray-900 dark:text-white mb-6">
                Simple pricing.
                <br />
                No surprises.
              </h2>
            </BlurFade>
            
            <BlurFade delay={0.2} inView>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-light">
                Choose the plan that fits your portfolio size. Upgrade or downgrade anytime.
              </p>
            </BlurFade>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <BlurFade key={index} delay={0.1 + index * 0.1} inView>
                <div className={cn(
                  "relative bg-white dark:bg-gray-900 rounded-2xl border p-8 transition-all duration-200 hover:shadow-lg",
                  plan.popular 
                    ? "border-indigo-200 dark:border-indigo-800 shadow-lg scale-105" 
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                )}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-8">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                      {plan.description}
                    </p>
                    
                    <div className="mb-4">
                      {plan.price ? (
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold text-gray-900 dark:text-white">
                            ${plan.price}
                          </span>
                          <span className="text-gray-600 dark:text-gray-300">/month</span>
                        </div>
                      ) : (
                        <div className="text-4xl font-bold text-gray-900 dark:text-white">
                          Custom
                        </div>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={cn(
                      "w-full py-3 font-medium rounded-lg transition-all duration-200",
                      plan.popular
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                    )}
                  >
                    {plan.price ? 'Start free trial' : 'Contact sales'}
                  </Button>
                </div>
              </BlurFade>
            ))}
          </div>

          {/* Bottom Text */}
          <BlurFade delay={0.5} inView>
            <div className="text-center mt-16">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                All plans include a 14-day free trial. No credit card required.
              </p>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  )
}