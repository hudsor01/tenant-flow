"use client"

import { useState } from "react"
import { Check, ArrowRight, Zap, Shield, Crown } from "lucide-react"
import { useSpring, animated } from "@react-spring/web"
import { BlurFade } from "@/components/magicui/blur-fade"
import { MagicCard } from "@/components/magicui/magic-card"
import { ShimmerButton } from "@/components/magicui/shimmer-button"
import { BorderBeam } from "@/components/magicui/border-beam"
import { cn } from "@/lib/utils"

interface MinimalistPricingSectionProps {
  className?: string
}

const plans = [
  {
    name: "Starter",
    price: 29,
    description: "For individual property owners",
    icon: Zap,
    features: [
      "Up to 5 properties",
      "Basic tenant management", 
      "Rent collection",
      "Email support"
    ],
    gradient: "from-green-400 to-blue-500"
  },
  {
    name: "Professional",
    price: 99,
    description: "For growing property businesses",
    icon: Shield,
    features: [
      "Up to 50 properties",
      "Advanced analytics",
      "Automated workflows",
      "Priority support",
      "API access"
    ],
    popular: true,
    gradient: "from-purple-400 to-pink-500"
  },
  {
    name: "Enterprise",
    price: null,
    description: "For large property portfolios",
    icon: Crown,
    features: [
      "Unlimited properties",
      "Custom integrations",
      "Dedicated support",
      "Custom training",
      "SLA guarantees"
    ],
    gradient: "from-orange-400 to-red-500"
  }
]

export function MinimalistPricingSection({ className }: MinimalistPricingSectionProps) {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  const headerSpring = useSpring({
    from: { opacity: 0, y: 30 },
    to: { opacity: 1, y: 0 },
    config: { tension: 200, friction: 25 },
    delay: 100
  })

  return (
    <section className={cn(
      "py-24 lg:py-32 bg-white dark:bg-gray-950",
      className
    )}>
      <div className="container px-4 mx-auto">
        <div className="max-w-6xl mx-auto">
          
          {/* Section Header */}
          <animated.div style={headerSpring} className="text-center mb-20">
            <BlurFade delay={0.1} inView>
              <h2 className="text-3xl sm:text-4xl lg:text-6xl font-medium text-gray-900 dark:text-white mb-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white bg-clip-text text-transparent">
                Simple pricing.
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  No surprises.
                </span>
              </h2>
            </BlurFade>
            
            <BlurFade delay={0.2} inView>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-light leading-relaxed">
                Choose the plan that fits your portfolio size. Upgrade or downgrade anytime.
              </p>
            </BlurFade>
          </animated.div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => {
              const IconComponent = plan.icon
              
              return (
                <BlurFade key={index} delay={0.1 + index * 0.1} inView>
                  <div
                    className={cn(
                      "transition-all duration-300",
                      hoveredCard === index ? "scale-[1.02] -translate-y-2" : "scale-100 translate-y-0"
                    )}
                    onMouseEnter={() => setHoveredCard(index)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <MagicCard
                      className={cn(
                        "relative p-8 transition-all duration-500 group cursor-pointer",
                        plan.popular 
                          ? "border-2 border-purple-200 dark:border-purple-800 shadow-xl" 
                          : "border border-gray-200 dark:border-gray-800"
                      )}
                      gradientColor={plan.popular ? "#a855f7" : "#64748b"}
                    >
                      {plan.popular && (
                        <>
                          <BorderBeam size={250} duration={12} delay={9} />
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                            <div className={`bg-gradient-to-r ${plan.gradient} text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg`}>
                              Most Popular
                            </div>
                          </div>
                        </>
                      )}

                      <div className="text-center mb-8">
                        {/* Plan Icon */}
                        <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-r ${plan.gradient} mb-4`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          {plan.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                          {plan.description}
                        </p>
                        
                        <div className="mb-6">
                          {plan.price ? (
                            <div className="flex items-baseline justify-center gap-1">
                              <span className={`text-5xl font-black bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                                ${plan.price}
                              </span>
                              <span className="text-gray-600 dark:text-gray-300 text-lg">/month</span>
                            </div>
                          ) : (
                            <div className={`text-5xl font-black bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                              Custom
                            </div>
                          )}
                        </div>
                      </div>

                      <ul className="space-y-4 mb-8">
                        {plan.features.map((feature, featureIndex) => (
                          <BlurFade key={featureIndex} delay={0.3 + featureIndex * 0.1} inView>
                            <li className="flex items-center gap-3">
                              <div className={`p-1 rounded-full bg-gradient-to-r ${plan.gradient}`}>
                                <Check className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-gray-700 dark:text-gray-300 font-medium">{feature}</span>
                            </li>
                          </BlurFade>
                        ))}
                      </ul>

                      {plan.popular ? (
                        <ShimmerButton
                          className="w-full h-12 text-base font-bold"
                          shimmerColor="#ffffff"
                          background={`linear-gradient(to right, ${plan.gradient.includes('purple') ? '#a855f7, #ec4899' : '#6366f1, #8b5cf6'})`}
                        >
                          <ArrowRight className="w-5 h-5 mr-2" />
                          {plan.price ? 'Start free trial' : 'Contact sales'}
                        </ShimmerButton>
                      ) : (
                        <button className={`w-full h-12 font-bold rounded-lg transition-all duration-300 bg-gradient-to-r ${plan.gradient} text-white hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}>
                          {plan.price ? 'Start free trial' : 'Contact sales'}
                        </button>
                      )}
                    </MagicCard>
                  </div>
                </BlurFade>
              )
            })}
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