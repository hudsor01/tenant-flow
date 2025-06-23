import React, { useState } from 'react';
import { motion } from 'framer-motion';
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

const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free Trial',
    description: 'Perfect for getting started with property management',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      'Free lease generator (Texas)',
      'Up to 2 properties',
      'Up to 5 tenants',
      'Basic payment tracking',
      'Maintenance requests',
      'Email notifications',
      'Mobile responsive design'
    ],
    limits: {
      properties: 2,
      tenants: 5,
      storage: '100MB',
      support: 'Community forum'
    },
    cta: 'Start Free Trial',
    ctaVariant: 'outline'
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Ideal for small property owners and landlords',
    monthlyPrice: 29,
    annualPrice: 290, // 2 months free
    features: [
      'Everything in Free',
      'Up to 10 properties',
      'Up to 50 tenants',
      'Advanced payment tracking',
      'Lease management',
      'Property analytics',
      'Tenant portal access',
      'Email support',
      'Custom lease templates',
      'Rent collection tools'
    ],
    limits: {
      properties: 10,
      tenants: 50,
      storage: '1GB',
      support: 'Email support'
    },
    popular: true,
    cta: 'Start 14-Day Free Trial',
    ctaVariant: 'default'
  },
  {
    id: 'professional',
    name: 'Growth',
    description: 'Best for growing property management businesses',
    monthlyPrice: 79,
    annualPrice: 790, // 2 months free
    features: [
      'Everything in Starter',
      'Up to 50 properties',
      'Up to 500 tenants',
      'Advanced reporting & analytics',
      'Bulk operations',
      'API access',
      'Multi-user accounts',
      'Priority support',
      'Custom branding',
      'Integration support',
      'Late fee automation',
      'Financial reporting'
    ],
    limits: {
      properties: 50,
      tenants: 500,
      storage: '10GB',
      support: 'Priority email & chat'
    },
    cta: 'Start 14-Day Free Trial',
    ctaVariant: 'default'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large property management companies',
    monthlyPrice: 199,
    annualPrice: 1990, // 2 months free
    features: [
      'Everything in Professional',
      'Unlimited properties',
      'Unlimited tenants',
      'Custom integrations',
      'Dedicated account manager',
      'Phone support',
      'Custom onboarding',
      'SLA guarantees',
      'Advanced security',
      'Custom reporting',
      'White-label options',
      'Training & consulting'
    ],
    limits: {
      properties: 'unlimited',
      tenants: 'unlimited',
      storage: 'Unlimited',
      support: 'Dedicated success manager'
    },
    cta: 'Contact Sales',
    ctaVariant: 'secondary'
  }
];

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
  const [selectedPackage, setSelectedPackage] = useState<string | null>('professional'); // Default to popular plan
  const [isModalOpen, setIsModalOpen] = useState(false);
  const createCheckoutSession = useCreateCheckoutSession();

  const calculateSavings = (monthlyPrice: number, annualPrice: number) => {
    if (monthlyPrice === 0) return 0;
    const monthlyTotal = monthlyPrice * 12;
    return Math.round(((monthlyTotal - annualPrice) / monthlyTotal) * 100);
  };

  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
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

      {/* Billing Toggle */}
      <section className="px-4 mb-12">
        <div className="container mx-auto">
          <motion.div 
            className="flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Tabs value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as 'monthly' | 'annual')} className="w-auto">
              <TabsList className="grid w-full grid-cols-2 p-1 h-12 bg-muted">
                <TabsTrigger value="monthly" className="text-sm font-medium">Monthly</TabsTrigger>
                <TabsTrigger value="annual" className="text-sm font-medium relative">
                  Annual
                  <Badge variant="secondary" className="ml-2 text-xs">Save 17%</Badge>
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
              const savings = calculateSavings(plan.monthlyPrice, plan.annualPrice);
              
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
                    onClick={() => setSelectedPackage(plan.id)}
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
                          <span className="text-4xl font-bold">${price}</span>
                          {plan.monthlyPrice > 0 && (
                            <span className="text-muted-foreground ml-1">
                              /{billingPeriod === 'monthly' ? 'month' : 'year'}
                            </span>
                          )}
                        </div>
                        
                        {billingPeriod === 'annual' && plan.monthlyPrice > 0 && savings > 0 && (
                          <div className="mt-2">
                            <Badge variant="secondary" className="text-xs">
                              Save {savings}% annually
                            </Badge>
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
  );
}