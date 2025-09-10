'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLayout } from '@/components/layout/page-layout'

// Icons
import { Check, Star, ArrowRight } from 'lucide-react'

// Pricing Plans Configuration
const pricingPlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 29, yearly: 290 },
    description: 'Perfect for individual property owners',
    features: [
      'Up to 5 properties',
      'Basic tenant management',
      'Rent collection tracking',
      'Email support',
      'Mobile app access',
      'Basic reporting'
    ],
    popular: false
  },
  {
    id: 'professional',
    name: 'Professional',
    price: { monthly: 99, yearly: 990 },
    description: 'Best for growing property businesses',
    features: [
      'Up to 50 properties',
      'Advanced analytics',
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
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    description: 'Tailored for large property portfolios',
    features: [
      'Unlimited properties',
      'Custom integrations',
      'Dedicated support manager',
      'Custom training sessions',
      'SLA guarantees',
      'Advanced security features',
      'White-label solution',
      'Custom reporting'
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
          <div className="mx-auto max-w-2xl space-y-6 text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Star className="w-3 h-3 mr-1" />
              14-day free trial • No credit card required
            </Badge>
            
            <h1 className="text-center text-4xl font-semibold lg:text-5xl">
              Pricing that Scales with You
            </h1>
            
            <p className="text-muted-foreground">
              TenantFlow is evolving to be more than just property management. 
              It supports an entire ecosystem to help property managers and landlords innovate.
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

          {/* Pricing Grid */}
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

          {/* Features Section */}
          <div className="mt-32">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">
                Everything you need to manage your properties
              </h2>
              <p className="text-muted-foreground">
                All plans include our core features to help you succeed
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Bank-Level Security</h3>
                <p className="text-sm text-muted-foreground">
                  Your data is protected with enterprise-grade encryption and security measures.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <ArrowRight className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground">
                  Built for speed with modern technology that keeps your workflow smooth.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">24/7 Support</h3>
                <p className="text-sm text-muted-foreground">
                  Get help when you need it with our dedicated customer success team.
                </p>
              </div>
            </div>
          </div>

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