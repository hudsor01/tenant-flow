'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLayout } from '@/components/layout/page-layout'
import { BlurFade } from '@/components/magicui/blur-fade'

// Icons
import { Check, Star, ArrowRight } from 'lucide-react'

// Design System
import { TYPOGRAPHY_SCALE } from '@repo/shared'

// Pricing Plans Configuration
const pricingPlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 29, yearly: 290 },
    description: 'Perfect for small property managers',
    features: [
      'Up to 5 properties',
      'Professional tenant management',
      'Automated rent collection',
      'Email support',
      'Mobile app access',
      'Basic reporting'
    ],
    popular: false
  },
  {
    id: 'growth',
    name: 'Growth',
    price: { monthly: 79, yearly: 790 },
    description: 'For expanding property portfolios',
    features: [
      'Up to 20 properties',
      'Advanced analytics & insights',
      'Automated workflows',
      'Priority support',
      'API access',
      'Custom branding',
      'Advanced reporting',
      'Maintenance tracking',
      'Document management'
    ],
    popular: true
  },
  {
    id: 'max',
    name: 'TenantFlow Max',
    price: { monthly: 299, yearly: 2990 },
    description: 'Enterprise features for serious professionals',
    features: [
      'Unlimited properties',
      'White-label portal',
      'Custom integrations',
      'Dedicated account manager',
      '24/7 priority support',
      'Advanced security features',
      'Custom training',
      'SLA guarantees'
    ],
    popular: false
  }
]

export default function PricingPage() {
  const router = useRouter()
  const [isYearly, setIsYearly] = useState(false)

  const handleSelectPlan = (planId: string) => {
    const plan = pricingPlans.find(p => p.id === planId)
    
    if (!plan) return
    
    if (plan.id === 'enterprise') {
      toast.info('Redirecting to contact form...', {
        description: 'We\'ll help you find the perfect enterprise solution.'
      })
      router.push('/contact?plan=enterprise')
      return
    }
    
    toast.success(`Selected ${plan.name} plan!`, {
      description: 'Redirecting to checkout...'
    })
    
    router.push(`/pricing/checkout?plan=${planId}&interval=${isYearly ? 'yearly' : 'monthly'}`)
  }

  return (
    <PageLayout>
      <section className="py-8 md:py-16">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <BlurFade delay={0.1} inView>
            <div className="mx-auto max-w-4xl space-y-6 text-center mb-16">
              <Badge variant="outline" className="mb-4">
                <Star className="w-3 h-3 mr-1" />
                Trusted by 10,000+ property managers
              </Badge>
              
              <h1 
                className="text-center text-foreground font-bold tracking-tight leading-tight"
                style={TYPOGRAPHY_SCALE['display-lg']}
              >
                Choose the perfect plan to{' '}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                  scale your business
                </span>
              </h1>
              
              <p 
                className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
                style={TYPOGRAPHY_SCALE['body-lg']}
              >
                Professional property managers increase NOI by 40% with TenantFlow's enterprise-grade 
                automation, advanced analytics, and scalable operations platform.
              </p>
            
              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-4 mt-8">
                <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Monthly
                </span>
                <button
                  onClick={() => setIsYearly(!isYearly)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    isYearly ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      isYearly ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Yearly
                  <Badge className="ml-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
                    Save 17%
                  </Badge>
                </span>
              </div>
            </div>
          </BlurFade>

          {/* Pricing Grid */}
          <BlurFade delay={0.2} inView>
            <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
            {pricingPlans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative flex flex-col ${
                  plan.popular 
                    ? 'border-2 border-primary shadow-lg' 
                    : 'border'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="font-medium">{plan.name}</CardTitle>
                  
                  {plan.price ? (
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">
                          ${isYearly ? plan.price.yearly : plan.price.monthly}
                        </span>
                        <span className="text-sm font-normal text-muted-foreground">
                          /{isYearly ? 'year' : 'month'}
                        </span>
                      </div>
                      {isYearly && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          2 months free • ${(plan.price.monthly * 12).toFixed(0)} value
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-3xl font-bold">Custom</span>
                  )}
                  
                  <CardDescription className="text-sm">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <hr className="border-dashed mb-6" />
                  
                  <ul className="space-y-3 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full ${
                      plan.popular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'variant-outline'
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.id === 'enterprise' ? 'Contact Sales' : 'Get Started'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
            </div>
          </BlurFade>

          {/* Features Section */}
          <BlurFade delay={0.3} inView>
            <div className="mt-32">
              <div className="text-center mb-12 space-y-4">
                <h2 
                  className="text-foreground font-bold tracking-tight"
                  style={TYPOGRAPHY_SCALE['heading-xl']}
                >
                  Proven results that transform property management
                </h2>
                <p 
                  className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
                  style={TYPOGRAPHY_SCALE['body-lg']}
                >
                  Professional property managers use TenantFlow to reduce costs by 32%, increase NOI by 40%, and automate 80% of repetitive tasks
                </p>
              </div>
            
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-primary" />
                  </div>
                  <h3 
                    className="font-semibold mb-2 text-foreground"
                    style={TYPOGRAPHY_SCALE['heading-sm']}
                  >
                    Increase NOI by 40% Average
                  </h3>
                  <p 
                    className="text-muted-foreground leading-relaxed"
                    style={TYPOGRAPHY_SCALE['body-sm']}
                  >
                    Real-time financial analytics and automated rent optimization maximize property returns. ROI in 90 days guaranteed.
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </div>
                  <h3 
                    className="font-semibold mb-2 text-foreground"
                    style={TYPOGRAPHY_SCALE['heading-sm']}
                  >
                    Automate 80% of Daily Tasks
                  </h3>
                  <p 
                    className="text-muted-foreground leading-relaxed"
                    style={TYPOGRAPHY_SCALE['body-sm']}
                  >
                    Smart workflows handle rent collection, lease renewals, and tenant communications automatically. Save 20+ hours per week.
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Star className="w-6 h-6 text-primary" />
                  </div>
                  <h3 
                    className="font-semibold mb-2 text-foreground"
                    style={TYPOGRAPHY_SCALE['heading-sm']}
                  >
                    Enterprise Security
                  </h3>
                  <p 
                    className="text-muted-foreground leading-relaxed"
                    style={TYPOGRAPHY_SCALE['body-sm']}
                  >
                    Bank-level security with SOC 2 compliance ensures your sensitive property and tenant data is always protected.
                  </p>
                </div>
              </div>
            </div>
          </BlurFade>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <p className="text-sm text-muted-foreground">
              Questions about our plans?{' '}
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm" 
                onClick={() => router.push('/contact')}
              >
                Contact our sales team
              </Button>
            </p>
          </div>
        </div>
      </section>
    </PageLayout>
  )
}