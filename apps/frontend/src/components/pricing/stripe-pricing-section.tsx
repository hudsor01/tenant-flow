"use client"

import { useState } from 'react'
import { Check, Crown, Building, Zap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { BlurFade } from '@/components/magicui/blur-fade'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { BorderBeam } from '@/components/magicui/border-beam'
import { cn } from '@/lib/utils'
import { PLANS } from '@repo/shared'
import { stripeApi } from '@/lib/api-client'

interface StripePricingSectionProps {
  className?: string
}

// Enhanced plan configuration with Stripe integration
const enhancedPlans = [
  {
    ...PLANS[1], // STARTER  
    icon: Building,
    popular: false,
    enhanced_features: [
      'Up to 10 properties',
      'Advanced tenant screening',
      'Automated rent collection', 
      'Smart maintenance routing',
      '50GB storage',
      'Email & phone support',
      'Financial reporting'
    ],
    cta: 'Start Free Trial'
  },
  {
    ...PLANS[2], // GROWTH
    icon: Zap,
    popular: true,
    enhanced_features: [
      'Up to 50 properties',
      'Advanced workflow automation',
      'Custom lease templates',
      'White-label tenant portal',
      '200GB storage', 
      'Priority support',
      'Advanced analytics',
      'API access'
    ],
    cta: 'Start Free Trial'
  },
  {
    ...PLANS[3], // TENANTFLOW_MAX
    icon: Crown, 
    popular: false,
    enhanced_features: [
      'Unlimited properties',
      'Multi-location management',
      'Predictive analytics & AI insights',
      'Custom integrations',
      'Dedicated account manager',
      'Unlimited storage',
      '24/7 support',
      'SOC 2 compliance',
      'Single sign-on (SSO)'
    ],
    cta: 'Contact Sales'
  }
]

export function StripePricingSection({ className }: StripePricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleSubscribe = async (planId: string) => {
    // Handle special cases
    if (planId === 'TENANTFLOW_MAX') {
      window.location.href = '/contact'
      return
    }

    setLoadingPlan(planId)
    
    try {
      // Create checkout session via backend API
      const response = await stripeApi.createCheckout({
        planId: planId as 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX',
        interval: isYearly ? 'annual' : 'monthly',
        successUrl: `${window.location.origin}/dashboard?payment=success`,
        cancelUrl: `${window.location.origin}/pricing?payment=cancelled`
      })

      // Redirect to Stripe Checkout
      if (response.url) {
        window.location.href = response.url
      }
    } catch (error) {
      console.error('Subscription error:', error)
      // TODO: Add toast notification for error
    } finally {
      setLoadingPlan(null)
    }
  }

  const formatPrice = (price: { monthly: number; annual: number }) => {
    const amount = isYearly ? price.annual : price.monthly
    return Math.floor(amount / 100) // Convert from cents
  }

  const calculateSavings = (monthly: number, annual: number) => {
    const monthlyCost = monthly * 12
    const savings = ((monthlyCost - annual) / monthlyCost * 100)
    return Math.round(savings)
  }

  return (
    <section className={cn(
      "relative py-24 bg-gradient-to-b from-muted/20 to-background",
      className
    )}>
      <div className="container px-4 mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <BlurFade delay={0.1} inView>
            <Badge variant="outline" className="mb-4 px-3 py-1">
              <Crown className="w-4 h-4 me-2" />
              Pricing
            </Badge>
          </BlurFade>
          
          <BlurFade delay={0.2} inView>
            <h2 className="text-4xl sm:text-5xl font-bold font-heading tracking-tight mb-6">
              Simple, transparent pricing
              <span className="block text-gradient-premium text-2xl sm:text-3xl font-normal mt-2">
                that grows with your business
              </span>
            </h2>
          </BlurFade>
          
          <BlurFade delay={0.3} inView>
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              Start with our 14-day free trial. No credit card required. 
              Cancel anytime.
            </p>
          </BlurFade>

          {/* Billing Toggle */}
          <BlurFade delay={0.4} inView>
            <div className="flex items-center justify-center gap-4 mb-2">
              <span className={cn(
                "text-sm font-medium transition-colors",
                !isYearly ? "text-foreground" : "text-muted-foreground"
              )}>
                Monthly
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
                className="data-[state=checked]:bg-primary"
              />
              <span className={cn(
                "text-sm font-medium transition-colors",
                isYearly ? "text-foreground" : "text-muted-foreground"
              )}>
                Yearly
              </span>
              <Badge variant="secondary" className="ms-2 bg-green-500/10 text-green-600 dark:text-green-400">
                Save {calculateSavings(enhancedPlans[0].price!.monthly, enhancedPlans[0].price!.annual)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              All plans include a 14-day free trial
            </p>
          </BlurFade>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {enhancedPlans.map((plan, index) => (
            <BlurFade key={index} delay={0.1 + index * 0.1} inView>
              <Card className={cn(
                "relative h-full transition-all duration-300 hover:scale-105",
                plan.popular 
                  ? "border-2 border-primary shadow-xl scale-105" 
                  : "border border-border hover:border-primary/50"
              )}>
                {plan.popular && (
                  <>
                    <BorderBeam size={250} duration={12} delay={9} />
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  </>
                )}

                <CardHeader className="text-center pb-8 pt-8">
                  <div className="mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mx-auto mb-4",
                      plan.popular 
                        ? "from-primary to-primary/80" 
                        : "from-muted to-muted/50"
                    )}>
                      <plan.icon className={cn(
                        "w-6 h-6",
                        plan.popular ? "text-primary-foreground" : "text-foreground"
                      )} />
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    {plan.description}
                  </p>
                  
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">
                        ${formatPrice(plan.price!)}
                      </span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                    {isYearly && plan.price!.annual > 0 && (
                      <div className="text-xs text-muted-foreground">
                        ${plan.price!.annual / 100} billed annually
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="px-6 pb-6">
                  <ul className="space-y-3 mb-6">
                    {plan.enhanced_features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm">
                        <Check className="w-4 h-4 text-green-500 me-3 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="px-6 pb-8">
                  {plan.popular ? (
                    <ShimmerButton
                      shimmerColor="#ffffff"
                      shimmerSize="0.05em"
                      shimmerDuration="3s"
                      borderRadius="8px"
                      background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      className="button-primary button-lg w-full"
                      disabled={loadingPlan === plan.id}
                      onClick={() => handleSubscribe(plan.id!)}
                    >
                      {loadingPlan === plan.id && (
                        <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      )}
                      {plan.cta}
                    </ShimmerButton>
                  ) : (
                    <Button 
                      variant={plan.id === "TENANTFLOW_MAX" ? "outline" : "default"}
                      className={`w-full ${plan.id === "TENANTFLOW_MAX" ? "button-secondary" : "button-primary"} button-lg`}
                      disabled={loadingPlan === plan.id}
                      onClick={() => handleSubscribe(plan.id!)}
                    >
                      {loadingPlan === plan.id && (
                        <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      )}
                      {plan.cta}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </BlurFade>
          ))}
        </div>

        {/* Trust Signals */}
        <BlurFade delay={0.6} inView>
          <div className="text-center">
            <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
              <Badge variant="secondary" className="badge-success px-4 py-2">
                <Check className="w-4 h-4 me-2" />
                14-day free trial
              </Badge>
              <Badge variant="secondary" className="badge-info px-4 py-2">
                <Crown className="w-4 h-4 me-2" />
                No credit card required
              </Badge>
              <Badge variant="secondary" className="badge px-4 py-2">
                Cancel anytime
              </Badge>
              <Badge variant="secondary" className="badge-success px-4 py-2">
                SOC 2 compliant
              </Badge>
            </div>
            
            <p className="text-muted-foreground mb-6">
              Questions about our pricing?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button className="button-secondary button-lg">
                View FAQ
              </Button>
              <Button className="button-ghost button-lg">
                Contact support
              </Button>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}