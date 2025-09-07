'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: {
      monthly: 29,
      yearly: 24,
    },
    description: 'Perfect for individual property managers getting started.',
    features: [
      'Up to 5 properties',
      'Basic tenant management',
      'Monthly reporting',
      'Email support',
      'Mobile app access',
    ],
    cta: 'Start free trial',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: {
      monthly: 79,
      yearly: 66,
    },
    description: 'Everything you need for growing property portfolios.',
    features: [
      'Up to 50 properties',
      'Advanced analytics',
      'Automated workflows',
      'Priority support',
      'Team collaboration',
      'API access',
    ],
    cta: 'Start free trial',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: {
      monthly: 'Custom pricing',
      yearly: 'Custom pricing',
    },
    description: 'Advanced features for large-scale property management.',
    features: [
      'Unlimited properties',
      'White-label solution',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantees',
      'Advanced security',
    ],
    cta: 'Contact sales',
  },
];

export default function ShadcnPricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl text-center">
          <Badge variant="secondary" className="mb-6">
            Pricing
          </Badge>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Choose the perfect plan for your property management needs. 
            Start with our free trial and scale as you grow.
          </p>

          <Tabs
            value={billingCycle}
            onValueChange={(value) => setBillingCycle(value as 'monthly' | 'yearly')}
            className="mb-12"
          >
            <TabsList className="grid w-full max-w-sm mx-auto grid-cols-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">
                Yearly
                <Badge variant="secondary" className="ml-2 text-xs">
                  Save 20%
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const price = plan.price[billingCycle];
              const isCustom = typeof price === 'string' && price.includes('Custom');
              
              return (
                <Card 
                  key={plan.id} 
                  className={cn(
                    'relative overflow-hidden',
                    plan.popular && 'border-primary shadow-lg scale-105'
                  )}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-0 right-0">
                      <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                        Most Popular
                      </div>
                    </div>
                  )}
                  
                  <CardHeader className={cn(plan.popular && 'pt-8')}>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      {isCustom ? (
                        <div className="text-3xl font-bold">{price}</div>
                      ) : (
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold">
                            ${typeof price === 'number' ? price : '0'}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            /{billingCycle === 'yearly' ? 'year' : 'month'}
                          </span>
                        </div>
                      )}
                      {billingCycle === 'yearly' && !isCustom && (
                        <p className="text-sm text-muted-foreground">
                          Billed annually
                        </p>
                      )}
                    </div>
                    
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <BadgeCheck className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <div className="mt-16 text-center">
            <p className="text-muted-foreground mb-4">
              All plans include 14-day free trial • No credit card required
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <span>99.9% uptime SLA</span>
              <span>SOC 2 compliant</span>
              <span>24/7 support</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}