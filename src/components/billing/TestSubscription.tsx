import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_CONFIG } from '@/lib/stripe-config';

const stripePromise = loadStripe(STRIPE_CONFIG.publishableKey!);

function CheckoutForm({ planName }: { priceId: string; planName: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    try {
      // Create subscription via API
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planName.toLowerCase().replace(' ', ''),
          billingPeriod: 'monthly',
          userEmail: 'test@example.com',
          userName: 'Test User',
          createAccount: false
        })
      });

      const { clientSecret } = await response.json();

      // Confirm payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      });

      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success('Subscription created successfully!');
      }
    } catch {
      toast.error('Failed to create subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement className="p-3 border rounded-md" />
      <Button type="submit" disabled={!stripe || isLoading} className="w-full">
        {isLoading ? 'Processing...' : `Subscribe to ${planName}`}
      </Button>
    </form>
  );
}

export default function TestSubscription() {
  const plans = [
    {
      name: 'Starter',
      price: 29,
      priceId: 'price_1Rbnyk00PMlKUSP0oGJV2i1G',
      features: ['Up to 10 properties', 'Up to 50 tenants', 'Email support']
    },
    {
      name: 'Professional',
      price: 79,
      priceId: 'price_1Rbnzv00PMlKUSP0fq5R5MNV',
      features: ['Up to 50 properties', 'Up to 500 tenants', 'Priority support', 'API access']
    },
    {
      name: 'Enterprise',
      price: 199,
      priceId: 'price_1Rbo0P00PMlKUSP0Isi7U1Wr',
      features: ['Unlimited properties', 'Unlimited tenants', 'Phone support', 'Custom integrations']
    }
  ];

  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Test Subscription Flow</h1>
      
      {!selectedPlan ? (
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.priceId} className="relative">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold">${plan.price}</span>/month
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-success">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => setSelectedPlan(plan)}
                  className="w-full"
                  variant={plan.name === 'Professional' ? 'default' : 'outline'}
                >
                  Select {plan.name}
                </Button>
              </CardContent>
              {plan.name === 'Professional' && (
                <Badge className="absolute -top-3 right-4">Most Popular</Badge>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Complete Your Subscription</CardTitle>
            <CardDescription>
              Subscribe to {selectedPlan.name} - ${selectedPlan.price}/month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise}>
              <CheckoutForm priceId={selectedPlan.priceId} planName={selectedPlan.name} />
            </Elements>
            <Button 
              variant="ghost" 
              className="w-full mt-4"
              onClick={() => setSelectedPlan(null)}
            >
              ← Back to plans
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Test Card Numbers:</h3>
        <ul className="space-y-1 text-sm">
          <li>✅ Success: 4242 4242 4242 4242</li>
          <li>❌ Decline: 4000 0000 0000 9995</li>
          <li>🔐 3D Secure: 4000 0025 0000 3155</li>
        </ul>
        <p className="text-xs mt-2 text-muted-foreground">Use any future expiry date and any 3-digit CVC</p>
      </div>
    </div>
  );
}