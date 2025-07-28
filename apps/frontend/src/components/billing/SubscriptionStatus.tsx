import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Building, Calendar, CreditCard } from 'lucide-react'
import { useSubscription, useCanAccessPremiumFeatures } from '@/hooks/useSubscription'
import { CustomerPortalButton } from './CustomerPortalButton'

/**
 * Subscription Status Component
 * Simple display of current subscription with portal access
 */
export function SubscriptionStatus() {
    const { data: subscription, isLoading } = useSubscription()
    const { data: premiumAccess } = useCanAccessPremiumFeatures()

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (!subscription) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Active Subscription</CardTitle>
                    <CardDescription>
                        Start with our free plan or upgrade for more features
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <a href="/pricing">View Plans</a>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const statusColors = {
        ACTIVE: 'default',
        TRIALING: 'secondary',
        PAST_DUE: 'destructive',
        CANCELED: 'secondary',
        UNPAID: 'destructive'
    } as const

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{subscription?.planType || 'Unknown'} Plan</CardTitle>
                            <CardDescription>
                                Active subscription
                            </CardDescription>
                        </div>
                        <Badge variant={statusColors[subscription?.status as keyof typeof statusColors] || 'default'}>
                            {subscription?.status || 'Unknown'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm">
                                <p className="font-medium">Properties</p>
                                <p className="text-muted-foreground">
                                    {premiumAccess?.hasAccess ? 'Unlimited' : 'Limited'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm">
                                <p className="font-medium">Current Period</p>
                                <p className="text-muted-foreground">
                                    {subscription?.currentPeriodEnd ? `Ends ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : 'No end date'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <div className="text-sm">
                                <p className="font-medium">Billing</p>
                                <p className="text-muted-foreground">
                                    {subscription?.cancelAtPeriodEnd ? 'Cancels at period end' : 'Auto-renews'}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <CustomerPortalButton variant="outline" className="w-full" />
        </div>
    )
}