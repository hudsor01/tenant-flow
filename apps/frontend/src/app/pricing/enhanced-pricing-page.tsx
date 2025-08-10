'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  Building2, 
  Sparkles, 
  ArrowRight,
  Star,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EnhancedSEO, COMMON_FAQS, COMMON_BREADCRUMBS } from '@/components/seo/enhanced-seo'

const pricingPlans = [
  {
    name: 'Starter',
    price: 29,
    period: 'month',
    units: 'Up to 10 units',
    description: 'Perfect for individual landlords',
    features: [
      'Tenant Portal',
      'Online Rent Collection',
      'Basic Maintenance Tracking',
      'Financial Reports',
      'Email Support'
    ],
    popular: false,
    badge: null,
    gradient: 'from-gray-600 to-gray-700',
    icon: Building2
  },
  {
    name: 'Professional',
    price: 79,
    period: 'month',
    units: 'Up to 50 units',
    description: 'For growing property managers',
    features: [
      'Everything in Starter',
      'Advanced Analytics Dashboard',
      'Automated Rent Reminders',
      'Maintenance Vendor Management',
      'Priority Support',
      'Custom Branding',
      'API Access'
    ],
    popular: true,
    badge: 'Most Popular',
    gradient: 'from-blue-600 to-purple-600',
    icon: TrendingUp
  },
  {
    name: 'Enterprise',
    price: null,
    period: null,
    units: 'Unlimited units',
    description: 'For large portfolios',
    features: [
      'Everything in Professional',
      'Dedicated Account Manager',
      'Custom Integrations',
      'White-label Solution',
      'Advanced Security Features',
      'SLA Guarantee',
      'On-premise Deployment Option',
      'Custom Training & Onboarding'
    ],
    popular: false,
    badge: 'Custom',
    gradient: 'from-purple-600 to-pink-600',
    icon: Shield
  }
]

export function EnhancedPricingPage() {
  const [scrollY, setScrollY] = useState(0)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const getPrice = (plan: typeof pricingPlans[0]) => {
    if (!plan.price) return 'Custom'
    const price = billingCycle === 'yearly' ? plan.price * 10 : plan.price
    return `$${price}`
  }

  const getPeriod = (plan: typeof pricingPlans[0]) => {
    if (!plan.period) return ''
    return billingCycle === 'yearly' ? '/year' : '/mo'
  }

  return (
    <>
      {/* Enhanced SEO */}
      <EnhancedSEO 
        breadcrumbs={COMMON_BREADCRUMBS.pricing}
        faqs={COMMON_FAQS.pricing}
        includeProduct={true}
      />

      {/* Navigation */}
      <nav className={cn(
        'border-b bg-white/80 backdrop-blur-sm fixed w-full top-0 z-50 transition-all duration-300',
        scrollY > 50 && 'shadow-lg',
      )}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative">
              <Building2 className="h-8 w-8 text-blue-600 transition-transform group-hover:scale-110" />
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TenantFlow
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
            <Link href="/pricing"  className="text-gray-900 font-semibold">Pricing</Link>
            <Link href="/demo"     className="text-gray-600 hover:text-gray-900 transition-colors">Demo</Link>
            <Link href="/blog"     className="text-gray-600 hover:text-gray-900 transition-colors">Blog</Link>
          </div>

          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
          <div className="absolute top-40 left-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />
        </div>

        <div className="container mx-auto relative">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <Zap className="w-3 h-3 mr-1" />
              Save 20% with yearly billing
            </Badge>
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Start free and scale as you grow. No hidden fees, no surprises.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  'px-6 py-2 rounded-md font-medium transition-all duration-200',
                  billingCycle === 'monthly' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={cn(
                  'px-6 py-2 rounded-md font-medium transition-all duration-200',
                  billingCycle === 'yearly' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Yearly
                <Badge className="ml-2 bg-green-100 text-green-700 text-xs">
                  Save 20%
                </Badge>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => {
              const Icon = plan.icon
              return (
                <Card 
                  key={index}
                  className={cn(
                    "relative p-8 hover:shadow-2xl transition-all duration-300 border-2",
                    plan.popular 
                      ? "border-blue-600 scale-105 shadow-xl" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  {plan.badge && (
                    <Badge 
                      className={cn(
                        "absolute -top-3 left-1/2 transform -translate-x-1/2",
                        plan.popular 
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                          : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {plan.badge}
                    </Badge>
                  )}

                  <div className="text-center mb-8">
                    <div className={cn(
                      "inline-flex p-3 rounded-lg mb-4",
                      `bg-gradient-to-br ${plan.gradient} bg-opacity-10`
                    )}>
                      <Icon className="h-8 w-8 text-gray-700" />
                    </div>
                    
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                    
                    <div className="flex items-baseline justify-center mb-2">
                      <span className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        {getPrice(plan)}
                      </span>
                      {plan.price && (
                        <span className="text-gray-500 ml-1">{getPeriod(plan)}</span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">{plan.units}</p>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/signup" className="block">
                    <Button 
                      className={cn(
                        "w-full group",
                        plan.popular 
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                          : "bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200"
                      )}
                    >
                      {plan.price ? 'Start Free Trial' : 'Contact Sales'}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>

                  {plan.popular && (
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg opacity-20 blur-lg" />
                  )}
                </Card>
              )
            })}
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 text-center">
            <div className="flex items-center justify-center space-x-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-gray-600">
              Trusted by <span className="font-semibold">10,000+</span> property managers
            </p>
            <p className="text-sm text-gray-500 mt-2">
              14-day free trial • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            {[
              {
                q: "Can I change plans anytime?",
                a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, debit cards, and ACH transfers for enterprise customers."
              },
              {
                q: "Is there a setup fee?",
                a: "No setup fees ever. Start your free trial today and only pay when you're ready."
              },
              {
                q: "Do you offer custom pricing for large portfolios?",
                a: "Yes! Contact our sales team for custom enterprise pricing tailored to your needs."
              }
            ].map((faq, index) => (
              <Card key={index} className="p-6">
                <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <Button variant="outline" asChild>
              <Link href="/contact">Contact Support</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to streamline your property management?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of property managers saving 10+ hours per week
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              <Link href="/demo">
                Watch Demo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 TenantFlow. All rights reserved.</p>
        </div>
      </footer>
    </>
  )
}