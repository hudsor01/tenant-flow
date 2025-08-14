/**
 * Static pricing grid component (Server Component)
 * Works without JavaScript - progressive enhancement target
 */

import { Check, Star, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ENHANCED_PRODUCT_TIERS } from '@repo/shared/config/pricing'

interface StaticPricingGridProps {
  className?: string
  showRecommended?: boolean
  showPopular?: boolean
}

/**
 * Server-side pricing grid that works without JavaScript
 * Enhanced progressively with Stripe integration
 */
export function StaticPricingGrid({ 
  className, 
  showRecommended = true, 
  showPopular = true 
}: StaticPricingGridProps) {
  const plans = Object.values(ENHANCED_PRODUCT_TIERS)

  return (
    <div className={`py-16 ${className || ''}`}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const isRecommended = showRecommended && ('recommended' in plan ? plan.recommended : false)
            const isPopular = showPopular && ('popular' in plan ? plan.popular : false)
            
            return (
              <Card 
                key={plan.id}
                className={`relative ${
                  isRecommended || isPopular 
                    ? 'border-2 border-blue-500 shadow-lg scale-105' 
                    : 'hover:shadow-md border'
                } transition-all duration-200`}
              >
                {(isRecommended || isPopular) && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">
                      {isRecommended && <Star className="w-3 h-3 mr-1" />}
                      {isRecommended ? 'Recommended' : 'Most Popular'}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {plan.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    {plan.description}
                  </p>
                  
                  {/* Pricing */}
                  <div className="mt-4">
                    {plan.price.monthly === 0 ? (
                      <div className="text-4xl font-bold text-gray-900">
                        Free
                      </div>
                    ) : (
                      <>
                        <div className="text-4xl font-bold text-gray-900">
                          ${plan.price.monthly}
                          <span className="text-lg font-normal text-gray-600">/month</span>
                        </div>
                        {plan.price.annual > 0 && (
                          <div className="text-sm text-green-600 font-medium mt-1">
                            Or ${plan.price.annual}/year (save ${
                              plan.price.monthly * 12 - plan.price.annual
                            })
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Trial info */}
                  {plan.trial.trialPeriodDays > 0 && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-xs text-blue-600">
                      <Zap className="w-3 h-3" />
                      <span>{plan.trial.trialPeriodDays}-day free trial</span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="space-y-3">
                    <Button 
                      className={`w-full ${
                        isRecommended || isPopular
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-gray-900 hover:bg-gray-800'
                      }`}
                      asChild
                    >
                      <a href={`/signup?plan=${plan.planId}`}>
                        {plan.price.monthly === 0 ? 'Start Free Trial' : 'Get Started'}
                      </a>
                    </Button>
                    
                    {plan.price.monthly > 0 && (
                      <div className="text-xs text-center text-gray-500">
                        No setup fees • Cancel anytime
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Need a custom solution?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            We offer custom enterprise solutions for larger property management companies 
            with specific requirements.
          </p>
          <Button variant="outline" asChild>
            <a href="/contact">Contact Our Sales Team</a>
          </Button>
        </div>
      </div>
    </div>
  )
}