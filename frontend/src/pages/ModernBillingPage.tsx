import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SubscriptionSelector } from '@/components/billing/checkout/SubscriptionSelector'
import { CheckoutForm } from '@/components/billing/checkout/CheckoutForm'
import { SubscriptionStatus } from '@/components/billing/SubscriptionStatus'
import { CustomerPortalButton } from '@/components/billing/portal/CustomerPortalButton'
import { useStripeCheckout } from '@/hooks/useStripeCheckout'
import { useAuth } from '@/hooks/useAuth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CreditCard, Settings, History } from 'lucide-react'

export default function ModernBillingPage() {
  const { user } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [showCheckout, setShowCheckout] = useState(false)
  const [clientSecret, setClientSecret] = useState<string>('')
  
  const { redirectToCheckout, error } = useStripeCheckout()

  // Check if user has an active subscription
  useQuery({
    queryKey: ['user-subscription-status', user?.id],
    queryFn: async () => {
      // This would be implemented in your subscription hook
      return false // Placeholder
    },
    enabled: !!user?.id,
  })

  const handlePlanSelect = async (planId: string, period: 'monthly' | 'annual') => {
    setSelectedPlan(planId)
    setBillingPeriod(period)
    
    if (planId === 'freeTrial') {
      // For free trial, redirect directly to checkout
      try {
        await redirectToCheckout({
          planId,
          billingPeriod: period,
          successUrl: `${window.location.origin}/dashboard?trial=started`,
          cancelUrl: window.location.href
        })
      } catch (err) {
        console.error('Free trial setup failed:', err)
      }
    } else {
      // For paid plans, create payment intent and show checkout form
      try {
        const response = await fetch('/api/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId,
            billingPeriod: period,
            userId: user?.id,
          })
        })
        
        const data = await response.json()
        if (data.clientSecret) {
          setClientSecret(data.clientSecret)
          setShowCheckout(true)
        }
      } catch (err) {
        console.error('Failed to create subscription:', err)
      }
    }
  }

  const handleCheckoutSuccess = () => {
    setShowCheckout(false)
    setClientSecret('')
    // Redirect to success page or refresh subscription status
    window.location.href = '/dashboard?subscription=success'
  }

  const handleCheckoutCancel = () => {
    setShowCheckout(false)
    setClientSecret('')
    setSelectedPlan('')
  }

  if (showCheckout && clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={handleCheckoutCancel}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Plans
            </Button>
            <h1 className="text-2xl font-bold">Complete Your Subscription</h1>
            <p className="text-gray-600">
              You're subscribing to our {selectedPlan} plan
            </p>
          </div>
          
          <CheckoutForm
            planId={selectedPlan}
            planName={selectedPlan}
            onSuccess={handleCheckoutSuccess}
            returnUrl={`${window.location.origin}/dashboard?subscription=success`}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your property management needs. 
            All plans include a 30-day money-back guarantee.
          </p>
        </div>

        {error && (
          <div className="mb-8">
            <Alert variant="destructive">
              <AlertDescription>
                {error instanceof Error ? error.message : 'An error occurred'}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <Tabs defaultValue="plans" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="plans">
              <CreditCard className="w-4 h-4 mr-2" />
              Plans
            </TabsTrigger>
            <TabsTrigger value="subscription">
              <Settings className="w-4 h-4 mr-2" />
              Current Plan
            </TabsTrigger>
            <TabsTrigger value="billing">
              <History className="w-4 h-4 mr-2" />
              Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-8">
            <SubscriptionSelector
              onSelect={handlePlanSelect}
              selectedPlan={selectedPlan}
              billingPeriod={billingPeriod}
            />
          </TabsContent>

          <TabsContent value="subscription" className="space-y-8">
            <div className="max-w-2xl mx-auto">
              <SubscriptionStatus />
            </div>
          </TabsContent>

          <TabsContent value="billing" className="space-y-8">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Billing Management</CardTitle>
                  <CardDescription>
                    Manage your payment methods, view billing history, and update your subscription
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CustomerPortalButton 
                    variant="default"
                    size="lg"
                    className="w-full"
                  >
                    Open Billing Portal
                  </CustomerPortalButton>
                  
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>In the billing portal you can:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Update payment methods</li>
                      <li>View and download invoices</li>
                      <li>Change your subscription plan</li>
                      <li>Cancel your subscription</li>
                      <li>Update billing information</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}