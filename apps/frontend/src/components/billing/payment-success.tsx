'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Loader2, ArrowRight, FileText, Users, Home } from 'lucide-react'
import { toast } from 'sonner'

interface SubscriptionDetails {
  planName: string
  billingInterval: 'monthly' | 'annual'
  amount: number
  currency: string
  nextBillingDate: string
  features: string[]
}

interface PaymentSuccessProps {
  subscriptionData?: SubscriptionDetails | null
  sessionId?: string | null
  isLoading?: boolean
  error?: string | null
}

/**
 * Client Component - PaymentSuccess
 * Handles success state, animations, and user interactions
 */
export function PaymentSuccess({ 
  subscriptionData, 
  sessionId, 
  isLoading = false, 
  error 
}: PaymentSuccessProps) {
  // unused variable for function signature compatibility
  void sessionId
  const _router = useRouter()
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (subscriptionData && !isLoading) {
      // Show success message and trigger confetti animation
      toast.success('🎉 Subscription activated successfully!')
      setShowConfetti(true)
      
      // Hide confetti after animation
      const timer = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [subscriptionData, isLoading])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-muted-foreground">Activating your subscription...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Success Header with Animation */}
      <div className="text-center relative">
        <div className={`transition-all duration-1000 ${showConfetti ? 'animate-bounce' : ''}`}>
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        </div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Welcome to TenantFlow!
        </h1>
        <p className="text-xl text-muted-foreground">
          Your subscription is now active and ready to use.
        </p>
      </div>

      {/* Subscription Details Card */}
      {subscriptionData && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-700 dark:text-green-400">
                Your Subscription
              </CardTitle>
              <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200">
                Active
              </Badge>
            </div>
            <CardDescription className="text-green-600 dark:text-green-300">
              {subscriptionData.planName} Plan - Billed {subscriptionData.billingInterval === 'annual' ? 'Annually' : 'Monthly'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border">
                <div className="text-sm text-muted-foreground">Amount</div>
                <div className="font-semibold text-lg">
                  ${(subscriptionData.amount / 100).toFixed(2)} {subscriptionData.currency.toUpperCase()}
                </div>
                <div className="text-xs text-muted-foreground">
                  per {subscriptionData.billingInterval === 'annual' ? 'year' : 'month'}
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border">
                <div className="text-sm text-muted-foreground">Next billing</div>
                <div className="font-semibold text-lg">
                  {new Date(subscriptionData.nextBillingDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {subscriptionData.features && subscriptionData.features.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-3">Included features:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {subscriptionData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <QuickActions />

      {/* Error Display */}
      {error && <ErrorDisplay error={error} />}
    </div>
  )
}

/**
 * Quick Actions Component - Next Steps
 */
function QuickActions() {
  const router = useRouter()

  const actions = [
    {
      icon: Home,
      title: 'Add your first property',
      description: 'Start by adding property details and units',
      action: () => router.push('/properties?action=add'),
      primary: true
    },
    {
      icon: Users,
      title: 'Invite tenants',
      description: 'Send invitations to your tenants to join the portal',
      action: () => router.push('/tenants?action=invite')
    },
    {
      icon: FileText,
      title: 'Create a lease',
      description: 'Set up lease agreements and track important dates',
      action: () => router.push('/leases?action=create')
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Get Started with TenantFlow</CardTitle>
        <CardDescription>
          Here are some recommended next steps to get the most out of your subscription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all duration-200 text-left group ${
              action.primary 
                ? 'border-primary bg-primary/5 hover:bg-primary/10 ring-1 ring-primary/20' 
                : 'hover:bg-muted/50 hover:border-primary/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-md ${
                action.primary ? 'bg-primary/10' : 'bg-muted'
              }`}>
                <action.icon className={`h-5 w-5 ${
                  action.primary ? 'text-primary' : 'text-muted-foreground'
                }`} />
              </div>
              <div>
                <p className="font-medium group-hover:text-primary transition-colors">
                  {action.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </button>
        ))}

        {/* Primary Actions */}
        <div className="pt-4 flex gap-3">
          <Button
            onClick={() => router.push('/dashboard')}
            className="flex-1"
            size="lg"
          >
            Go to Dashboard
          </Button>
          <Button
            onClick={() => router.push('/settings/billing')}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Manage Billing
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Error Display Component
 */
function ErrorDisplay({ error }: { error: string }) {
  const router = useRouter()
  
  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
      <CardHeader>
        <CardTitle className="text-orange-600 dark:text-orange-400">
          Subscription Verification Issue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <p className="text-sm text-muted-foreground mb-4">
          Don't worry - your payment was processed successfully. Please contact our support team if you need assistance.
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => router.push('/support')}
            variant="outline"
          >
            Contact Support
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Retry Verification
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}