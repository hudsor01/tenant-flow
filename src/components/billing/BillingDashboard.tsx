import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Users, 
  Building, 
  HardDrive, 
  Zap,
  Crown,
  AlertTriangle
} from 'lucide-react';
import { 
  useSubscription, 
  useUserPlan, 
  useUsageMetrics, 
  useBillingHistory,
  useCancelSubscription
} from '@/hooks/useSubscription';
import { CustomerPortalButton } from './CustomerPortalButton';
import { calculateUsagePercentage } from '@/types/subscription';

export default function BillingDashboard() {
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const { data: userPlan, isLoading: planLoading } = useUserPlan();
  const { data: usage, isLoading: usageLoading } = useUsageMetrics();
  const { data: billingHistory } = useBillingHistory();
  const cancelSubscription = useCancelSubscription();

  const isLoading = subscriptionLoading || planLoading || usageLoading;

  const handleCancelSubscription = () => {
    if (confirm('Are you sure you want to cancel your subscription? It will remain active until the end of your billing period.')) {
      if (subscription?.id) {
        cancelSubscription.mutate(subscription.id);
      } else {
        alert('No subscription ID found.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {userPlan?.id === 'free' ? (
              <CreditCard className="h-5 w-5" />
            ) : (
              <Crown className="h-5 w-5 text-primary" />
            )}
            Current Plan
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{userPlan?.name}</h3>
              <p className="text-sm text-muted-foreground">{userPlan?.description}</p>
            </div>
            <div className="text-right">
              {userPlan?.id === 'free' ? (
                <Badge variant="secondary">Free</Badge>
              ) : (
                <Badge variant="default" className="bg-primary">
                  ${userPlan?.monthlyPrice}/month
                </Badge>
              )}
            </div>
          </div>

          {subscription && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div>
                <p className="text-sm font-medium">Next billing date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge 
                  variant={subscription.status === 'active' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {subscription.status}
                </Badge>
              </div>
            </div>
          )}

          {userPlan?.trialDaysRemaining && userPlan.trialDaysRemaining > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-700">
                Your free trial ends in {userPlan.trialDaysRemaining} days
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {subscription && (
              <CustomerPortalButton variant="outline" />
            )}
            
            {userPlan?.id === 'free' ? (
              <Button asChild>
                <a href="/pricing">Upgrade Plan</a>
              </Button>
            ) : (
              <Button 
                onClick={handleCancelSubscription}
                disabled={cancelSubscription.isPending}
                variant="destructive"
              >
                {cancelSubscription.isPending ? 'Canceling...' : 'Cancel Subscription'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Metrics */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage Overview
            </CardTitle>
            <CardDescription>
              Current usage for {usage.month}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Properties */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span className="text-sm font-medium">Properties</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {usage.propertiesCount} / {usage.limits?.properties || '∞'}
                  </span>
                </div>
                <Progress 
                  value={calculateUsagePercentage(usage.propertiesCount, usage.limits?.properties || 'unlimited')}
                  className="h-2"
                />
              </div>

              {/* Tenants */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">Tenants</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {usage.tenantsCount} / {usage.limits?.tenants || '∞'}
                  </span>
                </div>
                <Progress 
                  value={calculateUsagePercentage(usage.tenantsCount, usage.limits?.tenants || 'unlimited')}
                  className="h-2"
                />
              </div>

              {/* Storage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    <span className="text-sm font-medium">Storage</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {usage.storageUsed}MB / {usage.limits?.storage || '∞'}MB
                  </span>
                </div>
                <Progress 
                  value={calculateUsagePercentage(usage.storageUsed, usage.limits?.storage || 'unlimited')}
                  className="h-2"
                />
              </div>

              {/* API Calls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-medium">API Calls</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {usage.apiCallsCount} / {usage.limits?.apiCalls || '∞'}
                  </span>
                </div>
                <Progress 
                  value={calculateUsagePercentage(usage.apiCallsCount, usage.limits?.apiCalls || 'unlimited')}
                  className="h-2"
                />
              </div>
            </div>

            {usage.limitChecks && Object.values(usage.limitChecks).some(exceeded => exceeded) && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <p className="text-sm text-orange-700">
                  You're approaching or have exceeded some plan limits. Consider upgrading your plan.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      {billingHistory && billingHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Billing History
            </CardTitle>
            <CardDescription>
              Your recent invoices and payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {billingHistory.slice(0, 5).map((invoice, index) => (
                <div key={invoice.id}>
                  {index > 0 && <Separator />}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">
                        {invoice.description || `Invoice ${invoice.stripeInvoiceId.slice(-8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(invoice.amountPaid)}
                      </p>
                      <Badge 
                        variant={invoice.status === 'paid' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}