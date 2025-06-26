import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePostHog } from 'posthog-js/react';
import { useFacebookPixel } from '@/hooks/useFacebookPixel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Check, 
  Star, 
  Building, 
  FileText, 
  Zap,
  ArrowRight,
  Crown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCreateCheckoutSession } from '@/hooks/useSubscription';
import SubscriptionModal from '@/components/billing/SubscriptionModal';
import { PLANS, calculateAnnualSavings, getAnnualSavingsMessage, getAnnualOnlyFeatures } from '@/types/subscription';
import { SEO } from '@/components/seo/SEO';
import { generatePricingSEO } from '@/lib/seo-utils';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { LimitedTimeOffer } from '@/components/billing/LimitedTimeOffer';

// Convert centralized PLANS to PricingPage format
const convertToPricingPlan = (plan: typeof PLANS[0]): PricingPlan => ({
  id: plan.id,
  name: plan.name,
  description: plan.description,
  monthlyPrice: plan.monthlyPrice,
  annualPrice: plan.annualPrice,
  features: plan.features,
  limits: {
    properties: plan.limits.properties,
    tenants: plan.limits.tenants,
    storage: typeof plan.limits.storage === 'number' ? `${plan.limits.storage}MB` : plan.limits.storage.toString(),
    support: plan.id === 'free' ? 'Community forum' : 
             plan.id === 'starter' ? 'Email support' :
             plan.id === 'growth' ? 'Priority email & chat' : 'Dedicated success manager'
  },
  popular: plan.id === 'starter', // Mark starter as popular
  cta: plan.id === 'free' ? 'Start Free Trial' :
       plan.id === 'enterprise' ? 'Contact Sales' : 'Start 14-Day Free Trial',
  ctaVariant: plan.id === 'free' ? 'outline' : 
              plan.id === 'enterprise' ? 'secondary' : 'default'
});

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  limits: {
    properties: number | 'unlimited';
    tenants: number | 'unlimited';
    storage: string;
    support: string;
  };
  popular?: boolean;
  cta: string;
  ctaVariant?: 'default' | 'outline' | 'secondary';
}

// Use centralized pricing data
const pricingPlans: PricingPlan[] = PLANS.map(convertToPricingPlan);

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>('growth'); // Default to popular plan
  const [isModalOpen, setIsModalOpen] = useState(false);
  const createCheckoutSession = useCreateCheckoutSession();
  const posthog = usePostHog();
  const facebookPixel = useFacebookPixel();

  // Generate optimized SEO data
  const seoData = generatePricingSEO();

  // Track pricing page view
  useEffect(() => {
    posthog?.capture('pricing_page_viewed', {
      default_billing_period: billingPeriod,
      default_selected_package: selectedPackage,
      timestamp: new Date().toISOString(),
    });
    
    // Track pricing page view in Facebook Pixel
    facebookPixel.trackPricingPageView(selectedPackage || undefined, billingPeriod);
  }, [posthog, facebookPixel, billingPeriod, selectedPackage]);

  const handleSubscribe = (planId: string) => {
    const plan = PLANS.find(p => p.id === planId);
    const price = billingPeriod === 'monthly' ? plan?.monthlyPrice : plan?.annualPrice;
    
    posthog?.capture('pricing_plan_subscribe_clicked', {
      plan_id: planId,
      billing_period: billingPeriod,
      timestamp: new Date().toISOString(),
    });
    
    // Track subscription initiation in Facebook Pixel
    if (plan && price) {
      facebookPixel.trackInitiateCheckout(price, 'USD', [planId]);
      facebookPixel.trackPlanSelection(planId, plan.name, price, billingPeriod);
    }
    
    setSelectedPlan(planId);
    setIsModalOpen(true);
  };

  return (
    <>
      <SEO
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        canonical={seoData.canonical}
        structuredData={seoData.structuredData}
        breadcrumbs={seoData.breadcrumbs}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          {/* Breadcrumbs */}
          <Breadcrumbs 
            items={seoData.breadcrumbs!} 
            className="mb-4"
          />
          
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">TenantFlow</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/auth/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/auth/signup">
                <Button>Get Started Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div {...fadeInUp}>
            <Badge variant="secondary" className="mb-4">
              <Star className="h-4 w-4 mr-1" />
              14-Day Free Trial • No Credit Card Required
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Simple, Transparent
              <br />
              <span className="text-primary">Pricing for Everyone</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Choose the perfect plan for your property management needs. Start free, upgrade when you grow, 
              and only pay for what you use.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Limited Time Offer */}
      <section className="px-4 mb-8">
        <div className="container mx-auto max-w-4xl">
          <LimitedTimeOffer 
            offerType="new-year" 
            isVisible={true}
          />
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="px-4 mb-12">
        <div className="container mx-auto">
          <motion.div 
            className="flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Tabs 
              value={billingPeriod} 
              onValueChange={(value) => {
                const newPeriod = value as 'monthly' | 'annual';
                posthog?.capture('pricing_billing_period_changed', {
                  from: billingPeriod,
                  to: newPeriod,
                  timestamp: new Date().toISOString(),
                });
                setBillingPeriod(newPeriod);
              }} 
              className="w-auto"
            >
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 p-1 h-12 bg-muted">
                <TabsTrigger value="monthly" className="text-sm font-medium">Monthly</TabsTrigger>
                <TabsTrigger value="annual" className="text-sm font-medium relative">
                  Annual
                  <Badge variant="default" className="ml-2 text-xs bg-green-600 text-white">
                    🎉 Save 2 Months!
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 pb-20">
        <div className="container mx-auto">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto"
            variants={staggerChildren}
            initial="initial"
            animate="animate"
          >
            {pricingPlans.map((plan) => {
              const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
              const originalPlan = PLANS.find(p => p.id === plan.id)!;
              const annualSavings = calculateAnnualSavings(originalPlan);
              const savingsMessage = getAnnualSavingsMessage(originalPlan);
              const annualOnlyFeatures = getAnnualOnlyFeatures(plan.id);
              
              return (
                <motion.div
                  key={plan.id}
                  variants={fadeInUp}
                  className="relative"
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Card 
                    className={`h-full flex flex-col relative cursor-pointer transition-all duration-300 ${
                      selectedPackage === plan.id
                        ? 'border-2 border-primary shadow-xl ring-2 ring-primary/20 bg-gradient-to-b from-primary/10 to-primary/5 scale-[1.02]'
                        : plan.popular 
                          ? 'border-primary/30 shadow-lg scale-105 hover:shadow-xl hover:border-primary/50' 
                          : 'border-border hover:shadow-md hover:border-primary/50 transition-all'
                    }`}
                    onClick={() => {
                      const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
                      
                      posthog?.capture('pricing_plan_selected', {
                        plan_id: plan.id,
                        plan_name: plan.name,
                        billing_period: billingPeriod,
                        price: price,
                        timestamp: new Date().toISOString(),
                      });
                      
                      // Track plan selection in Facebook Pixel
                      facebookPixel.trackViewContent(plan.name, 'product', price);
                      
                      setSelectedPackage(plan.id);
                    }}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground px-3 py-1">
                          <Crown className="h-3 w-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    
                    {selectedPackage === plan.id && (
                      <div className="absolute -top-2 -right-2">
                        <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                          <Check className="h-3 w-3" />
                        </div>
                      </div>
                    )}
                    
                    <CardHeader className="text-center pb-6">
                      <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                      <CardDescription className="text-sm">{plan.description}</CardDescription>
                      
                      <div className="mt-4">
                        <div className="flex items-baseline justify-center">
                          <span className="text-2xl sm:text-3xl md:text-4xl font-bold">${price}</span>
                          {plan.monthlyPrice > 0 && (
                            <span className="text-muted-foreground ml-1">
                              /{billingPeriod === 'monthly' ? 'month' : 'year'}
                            </span>
                          )}
                        </div>
                        
                        {billingPeriod === 'annual' && plan.monthlyPrice > 0 && annualSavings.dollarsSaved > 0 && (
                          <div className="mt-2 space-y-1">
                            <Badge variant="default" className="text-xs bg-green-600 text-white font-medium">
                              🎉 {savingsMessage}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              Save ${annualSavings.dollarsSaved} per year
                            </div>
                          </div>
                        )}
                        
                        {billingPeriod === 'annual' && plan.monthlyPrice > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            ${Math.round(price / 12)}/month billed annually
                          </p>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 space-y-6">
                      {/* Features */}
                      <div>
                        <h4 className="font-semibold mb-3 text-sm">Features Included:</h4>
                        <ul className="space-y-2">
                          {plan.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-start">
                              <Check className="h-4 w-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                          {billingPeriod === 'annual' && annualOnlyFeatures.length > 0 && (
                            <>
                              <li className="pt-2 border-t">
                                <div className="flex items-center">
                                  <Badge variant="default" className="text-xs bg-green-600 text-white">
                                    Annual Only
                                  </Badge>
                                </div>
                              </li>
                              {annualOnlyFeatures.map((feature, featureIndex) => (
                                <li key={`annual-${featureIndex}`} className="flex items-start">
                                  <Zap className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                                  <span className="text-sm font-medium text-green-700">{feature}</span>
                                </li>
                              ))}
                            </>
                          )}
                        </ul>
                      </div>
                      
                      {/* Limits */}
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3 text-sm">Plan Limits:</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Properties:</span>
                            <span className="font-medium">{plan.limits.properties}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tenants:</span>
                            <span className="font-medium">{plan.limits.tenants}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Storage:</span>
                            <span className="font-medium">{plan.limits.storage}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Support:</span>
                            <span className="font-medium">{plan.limits.support}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* CTA Button */}
                      <div className="pt-4">
                        {plan.id === 'enterprise' ? (
                          <Button 
                            className={`w-full transition-all ${
                              selectedPackage === plan.id ? 'ring-2 ring-primary/30 shadow-lg' : ''
                            }`} 
                            variant={selectedPackage === plan.id ? 'default' : plan.ctaVariant}
                            size="lg"
                          >
                            {plan.cta}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        ) : plan.id === 'free' ? (
                          <Link to="/auth/signup" className="block">
                            <Button 
                              className={`w-full transition-all ${
                                selectedPackage === plan.id ? 'ring-2 ring-primary/30 shadow-lg' : ''
                              }`} 
                              variant={selectedPackage === plan.id ? 'default' : plan.ctaVariant}
                              size="lg"
                            >
                              {plan.cta}
                              {selectedPackage === plan.id && <ArrowRight className="h-4 w-4 ml-2" />}
                            </Button>
                          </Link>
                        ) : (
                          <Button 
                            className={`w-full transition-all ${
                              selectedPackage === plan.id ? 'ring-2 ring-primary/30 shadow-lg' : ''
                            }`} 
                            variant={selectedPackage === plan.id ? 'default' : plan.ctaVariant}
                            size="lg"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click when clicking button
                              handleSubscribe(plan.id);
                            }}
                            disabled={createCheckoutSession.isPending}
                          >
                            {createCheckoutSession.isPending ? 'Processing...' : plan.cta}
                            {(selectedPackage === plan.id || plan.popular) && <Zap className="h-4 w-4 ml-2" />}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.div className="text-center mb-12" {...fadeInUp}>
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about TenantFlow pricing and plans.
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
            variants={staggerChildren}
            initial="initial"
            animate="animate"
          >
            {[
              {
                question: "Can I change plans anytime?",
                answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate your billing accordingly."
              },
              {
                question: "What happens if I exceed my plan limits?",
                answer: "We'll notify you when you approach your limits. You can upgrade to a higher plan or we'll help you optimize your usage."
              },
              {
                question: "Is there a setup fee?",
                answer: "No setup fees, ever. You only pay the monthly or annual subscription fee for your chosen plan."
              },
              {
                question: "Can I cancel anytime?",
                answer: "Absolutely. You can cancel your subscription at any time. Your account will remain active until the end of your billing period."
              },
              {
                question: "Do you offer refunds?",
                answer: "We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, we'll refund your payment."
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards (Visa, MasterCard, American Express) and bank transfers for annual plans."
              }
            ].map((faq, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div {...fadeInUp}>
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of property managers who trust TenantFlow to streamline their operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth/signup">
                <Button size="lg" className="text-lg px-8">
                  <Building className="mr-2 h-5 w-5" />
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/lease-generator">
                <Button variant="outline" size="lg" className="text-lg px-8">
                  <FileText className="mr-2 h-5 w-5" />
                  Try Lease Generator
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Comparison Table (Optional) */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.div className="text-center mb-12" {...fadeInUp}>
            <h2 className="text-3xl font-bold mb-4">Compare All Features</h2>
            <p className="text-muted-foreground">
              See exactly what's included in each plan
            </p>
          </motion.div>
          
          <motion.div className="text-center" {...fadeInUp}>
            <Button variant="outline">
              View Full Feature Comparison
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Subscription Modal */}
      {selectedPlan && (
        <SubscriptionModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          planId={selectedPlan}
          billingPeriod={billingPeriod}
        />
      )}
    </div>
    </>
  );
}