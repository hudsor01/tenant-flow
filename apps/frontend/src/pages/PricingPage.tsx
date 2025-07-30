import { useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'
import { motion } from 'framer-motion'
import { Clock, ArrowRight, Mail, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Navigation } from '@/components/layout/Navigation'
import { PricingComponent } from '@/components/pricing/PricingComponent'
import { SEO } from '@/components/seo/SEO'
import { generatePricingSEO } from '@/lib/utils/seo-utils'
import { useAuth } from '@/hooks/useAuth'
import type { BillingInterval } from '@tenantflow/shared/types/stripe-pricing'

export default function PricingPage() {
  const { user } = useAuth()
  const posthog = usePostHog()

  // Generate optimized SEO data
  const seoData = generatePricingSEO()

  // Analytics tracking
  useEffect(() => {
    posthog?.capture('pricing_page_viewed', {
      timestamp: new Date().toISOString(),
      user_id: user?.id,
    })
  }, [posthog, user])

  const handlePlanSelect = (plan: { id: string; name: string }, billingInterval: BillingInterval) => {
    posthog?.capture('pricing_plan_selected', {
      plan_id: plan.id,
      plan_name: plan.name,
      billing_interval: billingInterval,
      user_id: user?.id,
      timestamp: new Date().toISOString(),
    })
  }

  const handleError = (error: { type: string; message: string }) => {
    posthog?.capture('pricing_error', {
      error_type: error.type,
      error_message: error.message,
      user_id: user?.id,
      timestamp: new Date().toISOString(),
    })
  }

  return (
    <>
      <SEO
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        canonical={seoData.canonical}
        structuredData={seoData.structuredData}
        breadcrumb={seoData.breadcrumb}
      />

      <div className="min-h-screen bg-white">
        <Navigation context="public" />

        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
          </div>
          
          <div className="relative">
            <div className="container mx-auto px-6 py-20 lg:py-32">
              <motion.div 
                className="max-w-4xl mx-auto text-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.h1 
                  className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  Simple, Transparent{' '}
                  <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
                    Pricing
                  </span>
                </motion.h1>
                
                <motion.p 
                  className="text-xl lg:text-2xl text-blue-100/90 mb-8 max-w-3xl mx-auto leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                >
                  Choose the perfect plan for your property management needs. 
                  Start free, upgrade when you grow. No hidden fees, cancel anytime.
                </motion.p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Main Pricing Section */}
        <section className="py-16 lg:py-24 bg-gray-50">
          <div className="container mx-auto px-6">
            <PricingComponent
              currentPlan={user?.subscription?.planId}
              customerId={user?.stripeCustomerId}
              customerEmail={user?.email}
              onPlanSelect={handlePlanSelect}
              onError={handleError}
            />
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 lg:py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Get answers to common questions about our pricing and plans.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {[
                {
                  question: 'Can I change my plan at any time?',
                  answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated.'
                },
                {
                  question: 'What happens during the free trial?',
                  answer: 'You get full access to all features for 14 days. No credit card required, and you can cancel anytime without being charged.'
                },
                {
                  question: 'Are there any setup fees?',
                  answer: 'No setup fees, ever. You only pay the monthly or annual subscription fee based on your chosen plan.'
                },
                {
                  question: 'What if I need to cancel?',
                  answer: 'You can cancel anytime through your billing portal. Your subscription will remain active until the end of your billing period.'
                },
                {
                  question: 'Do you offer discounts for annual plans?',
                  answer: 'Yes! Annual plans save you 20% compared to monthly billing. The savings are automatically applied.'
                },
                {
                  question: 'Is my data secure?',
                  answer: 'Absolutely. We use bank-level encryption, secure cloud infrastructure, and comply with industry security standards.'
                }
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {faq.question}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="py-16 lg:py-24 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-3xl mx-auto"
            >
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Still have questions?
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Our team is here to help you find the perfect plan for your property management needs. 
                Get personalized recommendations and answers to all your questions.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  onClick={() =>
                    window.open(
                      'mailto:support@tenantflow.app?subject=Pricing Question',
                      '_blank'
                    )
                  }
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Support
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  onClick={() => handlePlanSelect({ id: 'free', name: 'Free Trial' }, 'monthly')}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 lg:py-24 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-3xl mx-auto"
            >
              <Clock className="w-16 h-16 mx-auto mb-6 text-blue-200" />
              
              <h3 className="text-3xl font-bold mb-4">
                Ready to streamline your property management?
              </h3>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Join thousands of property owners who've simplified their workflow with TenantFlow.
                Start your free trial today – no credit card required.
              </p>
              
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold px-8"
                onClick={() => handlePlanSelect({ id: 'free', name: 'Free Trial' }, 'monthly')}
              >
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  )
}