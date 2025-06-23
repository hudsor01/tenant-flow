import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, CreditCard, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerPortalProps {
  customerId?: string;
  subscription?: {
    id: string;
    status: string;
    plan: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    amount: number;
    interval: string;
  };
}

export default function CustomerPortal({ customerId, subscription }: CustomerPortalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePortalAccess = async () => {
    if (!customerId) {
      toast.error('Customer ID not found. Please contact support.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error) {
      console.error('Error accessing customer portal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to access billing portal');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'trialing':
        return <Badge variant="secondary">Free Trial</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Canceled</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, interval: string) => {
    const price = (amount / 100).toFixed(2);
    return `$${price}/${interval}`;
  };

  return (
    <div className="space-y-6">
      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Subscription
              </CardTitle>
              {getStatusBadge(subscription.status)}
            </div>
            <CardDescription>
              Manage your TenantFlow subscription and billing information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{subscription.plan} Plan</p>
                  <p className="text-sm text-muted-foreground">
                    {formatAmount(subscription.amount, subscription.interval)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {subscription.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Billing Status</p>
                  <p className="text-sm text-muted-foreground">
                    {subscription.status === 'active' ? 'Up to date' : 
                     subscription.status === 'trialing' ? 'Free trial' : 
                     'Needs attention'}
                  </p>
                </div>
              </div>
            </div>

            {subscription.cancelAtPeriodEnd && (
              <Alert>
                <AlertDescription>
                  Your subscription will be canceled on {formatDate(subscription.currentPeriodEnd)}. 
                  You can reactivate it anytime before then.
                </AlertDescription>
              </Alert>
            )}

            {subscription.status === 'past_due' && (
              <Alert variant="destructive">
                <AlertDescription>
                  Your payment is past due. Please update your payment method to continue using TenantFlow.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Billing Management</CardTitle>
          <CardDescription>
            Access your Stripe Customer Portal to manage billing details, view invoices, and update payment methods.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              In the Customer Portal, you can:
            </div>
            <ul className="text-sm space-y-1 ml-4">
              <li>• Update payment methods</li>
              <li>• Download invoices and receipts</li>
              <li>• View billing history</li>
              <li>• Update billing address</li>
              <li>• Cancel or pause subscription</li>
            </ul>
            
            <Button 
              onClick={handlePortalAccess}
              disabled={isLoading || !customerId}
              className="w-full md:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening Portal...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Billing Portal
                </>
              )}
            </Button>

            {!customerId && (
              <Alert>
                <AlertDescription>
                  No billing information found. You may need to complete your subscription setup first.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}