import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Star, 
  Building, 
  FileText, 
  Check,
  Zap,
  Shield,
  Users,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { STRIPE_CONFIG } from '@/lib/stripe-config';
import '@/types/stripe-embed.d.ts';

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

// Features that complement the pricing table
const platformFeatures = [
  {
    icon: Shield,
    title: 'Bank-Level Security',
    description: 'Your data is protected with enterprise-grade encryption and security protocols.'
  },
  {
    icon: Users,
    title: 'Tenant Portal Included',
    description: 'Every plan includes a modern tenant portal for payments and communication.'
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Track occupancy, rent collection, and maintenance with live dashboards.'
  },
  {
    icon: FileText,
    title: 'Legal Lease Templates',
    description: 'State-specific lease templates updated by legal professionals.'
  }
];

export default function PricingPageEmbedded() {
  useEffect(() => {
    // Load Stripe pricing table script if not already loaded
    if (!document.querySelector('script[src="https://js.stripe.com/v3/pricing-table.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/pricing-table.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

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

      {/* Trust Indicators */}
      <section className="px-4 mb-12">
        <div className="container mx-auto">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
            variants={staggerChildren}
            initial="initial"
            animate="animate"
          >
            {platformFeatures.map((feature, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="text-center p-4 border-none shadow-sm">
                  <CardContent className="pt-4">
                    <feature.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stripe Embeddable Pricing Table */}
      <section className="px-4 pb-20">
        <div className="container mx-auto">
          <motion.div 
            className="max-w-6xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {/* Note: This would be replaced with actual pricing table ID once created in Stripe Dashboard */}
            <div className="text-center mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Stripe Embeddable Pricing Table Integration
                </h3>
                <p className="text-blue-700 mb-4">
                  This section would contain Stripe's no-code pricing table component. 
                  To implement, you need to:
                </p>
                <div className="text-left max-w-md mx-auto">
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                    <li>Create a pricing table in Stripe Dashboard</li>
                    <li>Add your products/prices to the table</li>
                    <li>Copy the pricing-table-id</li>
                    <li>Replace the placeholder below</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Placeholder for Stripe Pricing Table */}
            {STRIPE_CONFIG.publishableKey ? (
              <div className="text-center py-8">
                {/* This would be the actual Stripe pricing table once configured */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
                  <p className="text-gray-600 mb-2">Stripe Embeddable Pricing Table would appear here</p>
                  <code className="text-xs text-gray-500 bg-white px-3 py-1 rounded">
                    &lt;stripe-pricing-table pricing-table-id="prctbl_xxxxx" publishable-key="{STRIPE_CONFIG.publishableKey}" /&gt;
                  </code>
                </div>
                
                {/* Actual Stripe Pricing Table Component */}
                <stripe-pricing-table 
                  pricing-table-id="prctbl_1Rgh0JP3WCR53SdokBcoBPDs"
                  publishable-key={STRIPE_CONFIG.publishableKey}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="border-2 border-dashed border-red-300 rounded-lg p-8 bg-red-50">
                  <p className="text-red-600 mb-2">Stripe publishable key not configured</p>
                  <p className="text-sm text-red-500">Set VITE_STRIPE_PUBLISHABLE_KEY in your environment variables</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.div className="text-center mb-12" {...fadeInUp}>
            <h2 className="text-3xl font-bold mb-4">Why Choose TenantFlow?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built specifically for property managers who want simplicity without sacrificing power.
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            variants={staggerChildren}
            initial="initial"
            animate="animate"
          >
            {[
              {
                title: "Setup in Minutes",
                description: "Get started immediately with our intuitive setup process. No complex configurations or lengthy onboarding.",
                features: ["Quick property import", "Automated tenant invitations", "Instant tenant portal access"]
              },
              {
                title: "Secure & Compliant",
                description: "Bank-level security and compliance features to protect your data and ensure regulatory adherence.",
                features: ["SOC 2 Type II certified", "GDPR compliant", "Regular security audits"]
              },
              {
                title: "24/7 Support",
                description: "Get help when you need it with our comprehensive support system and extensive documentation.",
                features: ["Live chat support", "Video tutorials", "Community forum"]
              }
            ].map((benefit, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-xl">{benefit.title}</CardTitle>
                    <CardDescription>{benefit.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {benefit.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center">
                          <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
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
      <section className="py-20 px-4 bg-muted/30">
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
    </div>
  );
}