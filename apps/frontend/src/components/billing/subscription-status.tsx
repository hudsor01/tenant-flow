'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Building, 
  Calendar, 
  CreditCard, 
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Clock 
} from 'lucide-react'
import Link from 'next/link'
import { useSubscription, useCanAccessPremiumFeatures } from '@/hooks/useSubscription'
import { CustomerPortalButton } from './customer-portal-button'

/**
 * Subscription Status Component
 * Simple display of current subscription with portal access
 */
export function SubscriptionStatus() {
    const { subscription, isLoading } = useSubscription()
    const premiumAccess = useCanAccessPremiumFeatures()

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
                        <Link href="/pricing">View Plans</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    // Enhanced status configuration with icons and colors
    const statusConfig = {
        ACTIVE: {
            variant: 'default' as const,
            icon: CheckCircle2,
            bgClass: 'bg-green-50 border-green-200 dark:bg-green-950/20',
            textClass: 'text-green-700 dark:text-green-400',
            label: 'Active'
        },
        TRIALING: {
            variant: 'secondary' as const,
            icon: Clock,
            bgClass: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20',
            textClass: 'text-blue-700 dark:text-blue-400',
            label: 'Trial'
        },
        PAST_DUE: {
            variant: 'destructive' as const,
            icon: AlertCircle,
            bgClass: 'bg-red-50 border-red-200 dark:bg-red-950/20',
            textClass: 'text-red-700 dark:text-red-400',
            label: 'Past Due'
        },
        CANCELED: {
            variant: 'secondary' as const,
            icon: XCircle,
            bgClass: 'bg-gray-50 border-gray-200 dark:bg-gray-950/20',
            textClass: 'text-gray-700 dark:text-gray-400',
            label: 'Cancelled'
        },
        UNPAID: {
            variant: 'destructive' as const,
            icon: AlertTriangle,
            bgClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20',
            textClass: 'text-amber-700 dark:text-amber-400',
            label: 'Unpaid'
        }
    } as const

    const config = statusConfig[subscription?.status as keyof typeof statusConfig] || statusConfig.ACTIVE
    const StatusIcon = config.icon

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
                        <Badge variant={config.variant} className="flex items-center gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
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
                                    {premiumAccess ? 'Unlimited' : 'Limited'}
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

                    {/* Status-specific alerts */}
                    {subscription?.status === 'PAST_DUE' && (
                        <div className={`p-3 rounded-lg ${config.bgClass}`}>
                            <div className="flex items-start gap-2">
                                <StatusIcon className="h-4 w-4 mt-0.5 shrink-0" />
                                <div>
                                    <p className={`text-sm font-medium ${config.textClass}`}>
                                        Payment Required
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Please update your payment method to continue service.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {subscription?.status === 'CANCELED' && (
                        <div className={`p-3 rounded-lg ${config.bgClass}`}>
                            <div className="flex items-start gap-2">
                                <StatusIcon className="h-4 w-4 mt-0.5 shrink-0" />
                                <div>
                                    <p className={`text-sm font-medium ${config.textClass}`}>
                                        Subscription Cancelled
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Access continues until {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'end of period'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {subscription?.status === 'TRIALING' && (
                        <div className={`p-3 rounded-lg ${config.bgClass}`}>
                            <div className="flex items-start gap-2">
                                <StatusIcon className="h-4 w-4 mt-0.5 shrink-0" />
                                <div>
                                    <p className={`text-sm font-medium ${config.textClass}`}>
                                        Free Trial Active
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Trial ends {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'soon'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <CustomerPortalButton variant="outline" className="w-full" />
        </div>
    )
}