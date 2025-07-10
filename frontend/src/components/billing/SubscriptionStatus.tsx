import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CustomerPortalButton } from './portal/CustomerPortalButton'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase-client'
import { Loader2, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import type { Subscription } from '@/types/subscription'

export function SubscriptionStatus() {
  const { user } = useAuth()
  
  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async (): Promise<Subscription | null> => {
      if (!user?.id) return null
      
      const { data, error } = await supabase
        .from('Subscription')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        // If no subscription found, that's okay
        if (error.code === 'PGRST116') return null
        throw error
      }
      
      return data
    },
    enabled: !!user?.id,
  })

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          variant: 'default' as const,
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200'
        }
      case 'trialing':
        return {
          label: 'Trial',
          variant: 'secondary' as const,
          icon: <Clock className="w-4 h-4" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200'
        }
      case 'past_due':
        return {
          label: 'Past Due',
          variant: 'destructive' as const,
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 border-orange-200'
        }
      case 'canceled':
      case 'cancelled':
        return {
          label: 'Cancelled',
          variant: 'outline' as const,
          icon: <XCircle className="w-4 h-4" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200'
        }
      default:
        return {
          label: status,
          variant: 'outline' as const,
          icon: <Clock className="w-4 h-4" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200'
        }
    }
  }

  const formatPlanName = (planId: string) => {
    const planNames: Record<string, string> = {
      freeTrial: 'Free Trial',
      starter: 'Starter',
      growth: 'Growth',
      enterprise: 'Enterprise'
    }
    return planNames[planId] || planId
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading subscription status...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load subscription status. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
          <CardDescription>
            You don't have an active subscription yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Subscribe to a plan to start managing your properties with TenantFlow.
          </p>
        </CardContent>
      </Card>
    )
  }

  const statusInfo = getStatusInfo(subscription.status)

  return (
    <Card className={statusInfo.bgColor}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={statusInfo.color}>
              {statusInfo.icon}
            </div>
            <CardTitle className="text-lg">
              {formatPlanName(subscription.planId)} Plan
            </CardTitle>
          </div>
          <Badge variant={statusInfo.variant}>
            {statusInfo.label}
          </Badge>
        </div>
        <CardDescription>
          Your current subscription details
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">Billing Period</p>
            <p className="text-gray-600 capitalize">
              {subscription.billingPeriod || 'Monthly'}
            </p>
          </div>
          
          <div>
            <p className="font-medium text-gray-700">Current Period</p>
            <p className="text-gray-600">
              {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
        </div>
        
        {subscription.cancelAtPeriodEnd && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your subscription will cancel on {formatDate(subscription.currentPeriodEnd)}.
              You can reactivate it anytime before then.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="pt-4 border-t">
          <CustomerPortalButton className="w-full" />
          <p className="text-xs text-gray-500 mt-2 text-center">
            Manage your subscription, update payment methods, and view billing history
          </p>
        </div>
      </CardContent>
    </Card>
  )
}