import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Mail, CheckCircle, ArrowRight, Calendar } from 'lucide-react';
import StripeCheckoutForm from './StripeCheckoutForm';
import { getPlanById } from '@/types/subscription';
import { useAuthStore } from '@/store/authStore';

interface SubscriptionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  billingPeriod: 'monthly' | 'annual';
}

export default function SubscriptionModal({ 
  isOpen, 
  onOpenChange, 
  planId, 
  billingPeriod 
}: SubscriptionModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [subscriptionData] = useState<{subscriptionId: string, status: string} | null>(null);
  const { user } = useAuthStore();

  const plan = getPlanById(planId);
  if (!plan) return null;

  const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  const priceId = billingPeriod === 'monthly' ? plan.stripePriceIdMonthly : plan.stripePriceIdAnnual;

  const handleEmbeddedCheckout = async () => {
    // For unauthenticated users, require email and name
    if (!user && (!email || !name)) {
      alert('Please enter your email and name to continue');
      return;
    }

    if (!priceId) return;

    setIsCreatingSubscription(true);
    try {
      // Call Vercel API route instead of Supabase Edge Function
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingPeriod,
          userId: user?.id || null,
          userEmail: user?.email || email,
          userName: user?.name || name,
          createAccount: !user, // Flag to create account if user doesn't exist
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      const data = await response.json();
      
      // Handle both payment and trial scenarios
      if (data.clientSecret) {
        // Payment method required - show Stripe form (works for both payment intents and setup intents)
        setClientSecret(data.clientSecret);
      } else if (data.subscriptionId && data.status) {
        // Subscription created successfully - show success modal
        setShowSuccessModal(true);
        onOpenChange(false);
      } else {
        // Something went wrong
        console.error('Invalid response from subscription creation:', data);
        alert('Failed to start subscription. Please try again.');
        return;
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Failed to start subscription. Please try again.');
    } finally {
      setIsCreatingSubscription(false);
    }
  };


  const handleSuccess = async () => {
    // Show success modal first, then redirect
    setShowSuccessModal(true);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setClientSecret(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscribe to {plan.name}
            </DialogTitle>
            <DialogDescription>
              Complete your subscription securely without leaving TenantFlow
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Plan Summary */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{plan.name}</h3>
                <Badge variant="default">${price}/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              
              {billingPeriod === 'annual' && plan.monthlyPrice > 0 && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Save {Math.round(((plan.monthlyPrice * 12 - plan.annualPrice) / (plan.monthlyPrice * 12)) * 100)}% annually
                  </Badge>
                </div>
              )}
            </div>

            {/* Start Subscription */}
            {!clientSecret && (
              <div className="space-y-4">
                {/* Show email/name form for unauthenticated users */}
                {!user && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-4 w-4" />
                      Create your account
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Enter your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Your account will be created automatically when you complete payment
                    </div>
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground text-center">
                  🔒 Secure checkout powered by Stripe
                </div>
                <Button 
                  onClick={handleEmbeddedCheckout}
                  disabled={isCreatingSubscription || (!user && (!email || !name))}
                  className="w-full"
                  size="lg"
                >
                  {isCreatingSubscription ? 'Setting up your subscription...' : 'Start Subscription'}
                </Button>
              </div>
            )}

            {/* Embedded Checkout Form */}
            {clientSecret && (
              <StripeCheckoutForm
                clientSecret={clientSecret}
                planId={planId}
                planName={plan.name}
                price={price}
                billingPeriod={billingPeriod}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            )}

            {/* Features List */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">What's included:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {plan.features.slice(0, 4).map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
                {plan.features.length > 4 && (
                  <li className="text-xs">+ {plan.features.length - 4} more features</li>
                )}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-[500px] text-center">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">
              🎉 Welcome to TenantFlow!
            </DialogTitle>
            <DialogDescription className="text-center text-lg">
              Your 14-day free trial has started successfully
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Plan Details */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">14 Days Free</span>
              </div>
              <p className="text-sm text-blue-700">
                Full access to {plan.name} features • ${price}/{billingPeriod === 'monthly' ? 'month' : 'year'} billing starts after trial
              </p>
            </div>

            {/* Billing Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CreditCard className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-800 mb-1">Payment Method Secured</p>
                  <p className="text-amber-700">
                    Your card ending in ****{subscriptionData?.paymentMethod || 'XXXX'} will be charged ${price} on {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()} when your trial ends.
                  </p>
                  <p className="text-amber-700 font-medium mt-1">
                    You'll receive email reminders 7, 3, and 1 day before billing starts.
                  </p>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="text-left space-y-3">
              <h4 className="font-semibold text-gray-900">What happens next:</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Set up your secure account with a password</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Access your personalized property management dashboard</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Start adding properties and managing tenants</span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Button 
              onClick={() => {
                if (!user) {
                  // For new users, redirect to account setup
                  window.location.href = `/auth/setup-account?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&subscription=${subscriptionData?.subscriptionId}`;
                } else {
                  // For existing users, redirect to dashboard
                  window.location.href = '/dashboard?trial=started';
                }
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 text-lg"
              size="lg"
            >
              Complete Account Setup
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            {/* Billing Terms */}
            <p className="text-xs text-gray-500 text-center">
              🔒 Secure • 💳 Payment method required • ✨ Cancel anytime during trial to avoid charges
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}