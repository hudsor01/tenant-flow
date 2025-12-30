'use client'

import * as React from 'react'
import { Download, RefreshCw, Calendar, FileText, Zap } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { Skeleton } from '#components/ui/skeleton'
import { Button } from '#components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#components/ui/tabs'
import type { PaymentMethodResponse } from '@repo/shared/types/core'

import {
	useFailedPaymentAttempts,
	useBillingHistory
} from '#hooks/api/use-billing-history'
import { usePaymentMethods } from '#hooks/api/use-payment-methods'
import {
	useCancelSubscription,
	usePauseSubscription,
	useResumeSubscription,
	useSubscriptions
} from '#hooks/api/use-subscriptions'
import {
	usePaymentAnalytics,
	useUpcomingPayments,
	useOverduePayments,
	useExportPayments
} from '#hooks/api/use-rent-collection'
import { formatCents } from '#lib/formatters/currency'
import { toast } from 'sonner'

import { RecordPaymentDialog } from './components/record-payment-dialog'
import { StatsSection } from './components/stats-section'
import { OverduePaymentsAlert } from './components/overdue-payments-alert'
import { FailedPaymentsAlert } from './components/failed-payments-alert'
import { SubscriptionsTab } from './components/subscriptions-tab'
import { UpcomingPaymentsTab } from './components/upcoming-payments-tab'
import { PaymentHistoryTab } from './components/payment-history-tab'

export default function RentCollectionPage() {
	const { data: subscriptions, isLoading } = useSubscriptions()
	const { data: paymentMethods } = usePaymentMethods()
	const { data: paymentHistory } = useBillingHistory()
	const { data: failedAttempts } = useFailedPaymentAttempts()
	const { data: analytics } = usePaymentAnalytics()
	const { data: upcomingPayments } = useUpcomingPayments()
	const { data: overduePayments } = useOverduePayments()
	const pauseSubscription = usePauseSubscription()
	const resumeSubscription = useResumeSubscription()
	const cancelSubscription = useCancelSubscription()
	const exportPayments = useExportPayments()

	const [actioningId, setActioningId] = React.useState<string | null>(null)
	const [failedOpen, setFailedOpen] = React.useState(true)
	const [overdueOpen, setOverdueOpen] = React.useState(true)
	const [activeTab, setActiveTab] = React.useState('subscriptions')

	const handlePause = React.useCallback(
		async (id: string) => {
			setActioningId(id)
			try {
				await pauseSubscription.mutateAsync(id)
			} finally {
				setActioningId(null)
			}
		},
		[pauseSubscription]
	)

	const handleResume = React.useCallback(
		async (id: string) => {
			setActioningId(id)
			try {
				await resumeSubscription.mutateAsync(id)
			} finally {
				setActioningId(null)
			}
		},
		[resumeSubscription]
	)

	const handleCancel = React.useCallback(
		async (id: string) => {
			setActioningId(id)
			try {
				await cancelSubscription.mutateAsync(id)
			} finally {
				setActioningId(null)
			}
		},
		[cancelSubscription]
	)

	const handleExport = React.useCallback(async () => {
		try {
			await exportPayments.mutateAsync({})
			toast.success('Payments exported successfully')
		} catch {
			toast.error('Failed to export payments')
		}
	}, [exportPayments])

	const getPaymentMethodInfo = React.useCallback(
		(paymentMethodId: string) => {
			const paymentMethod = paymentMethods?.find(
				(pm: PaymentMethodResponse) => pm.id === paymentMethodId
			)
			if (!paymentMethod) return null

			return {
				type: paymentMethod.type === 'card' ? 'Card' : 'Bank',
				last4: paymentMethod.last4,
				brand: paymentMethod.brand
			}
		},
		[paymentMethods]
	)

	// Calculate stats from analytics or subscriptions
	const activeSubscriptions =
		subscriptions?.filter(s => s.status === 'active') || []

	const totalMonthlyRevenue = activeSubscriptions.reduce(
		(sum, sub) => sum + (sub.amount || 0),
		0
	)
	const platformFees = Math.round(totalMonthlyRevenue * 0.029)

	// Use analytics data if available
	const collectionRate = analytics?.collectionRate ?? 0
	const onTimeRate = analytics?.onTimePaymentRate ?? 0
	const totalCollected = analytics?.totalCollected ?? 0
	const totalPending = analytics?.totalPending ?? 0
	const totalOverdue = analytics?.totalOverdue ?? 0

	if (isLoading) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				{/* Header skeleton */}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-48 mb-2" />
						<Skeleton className="h-4 w-72" />
					</div>
					<Skeleton className="h-10 w-24" />
				</div>
				{/* Stats skeleton */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					{[1, 2, 3, 4].map(i => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
				{/* Table skeleton */}
				<div className="bg-card border border-border rounded-lg p-4 space-y-3">
					{[1, 2, 3, 4, 5].map(i => (
						<Skeleton key={i} className="h-12 w-full" />
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="typography-h1">Rent Collection</h1>
						<p className="text-muted-foreground">
							Manage payments, subscriptions, and collection analytics
						</p>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={handleExport}
							disabled={exportPayments.isPending}
							className="gap-2"
						>
							{exportPayments.isPending ? (
								<RefreshCw className="h-4 w-4 animate-spin" />
							) : (
								<Download className="h-4 w-4" />
							)}
							Export
						</Button>
						<RecordPaymentDialog />
					</div>
				</div>
			</BlurFade>

			{/* Enhanced Stats */}
			<StatsSection
				totalCollected={totalCollected}
				totalPending={totalPending}
				totalOverdue={totalOverdue}
				collectionRate={collectionRate}
				onTimeRate={onTimeRate}
				upcomingCount={upcomingPayments?.length ?? 0}
				overdueCount={overduePayments?.length ?? 0}
				activeSubscriptionsCount={activeSubscriptions.length}
			/>

			{/* Fee Summary */}
			<BlurFade delay={0.35} inView>
				<div className="bg-card border border-border rounded-lg p-4 mb-6">
					<div className="flex flex-wrap items-center gap-6 text-sm">
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground">Monthly Revenue:</span>
							<span className="font-medium text-foreground">
								{formatCents(totalMonthlyRevenue)}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground">Est. Platform Fees:</span>
							<span className="font-medium text-foreground">
								-{formatCents(platformFees)}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground">Net Monthly:</span>
							<span className="font-medium text-foreground">
								{formatCents(totalMonthlyRevenue - platformFees)}
							</span>
						</div>
					</div>
				</div>
			</BlurFade>

			{/* Overdue Payments Alert */}
			<OverduePaymentsAlert
				payments={overduePayments ?? []}
				open={overdueOpen}
				onOpenChange={setOverdueOpen}
			/>

			{/* Failed Payments Alert */}
			<FailedPaymentsAlert
				attempts={failedAttempts ?? []}
				open={failedOpen}
				onOpenChange={setFailedOpen}
			/>

			{/* Tabs for different views */}
			<BlurFade delay={0.45} inView>
				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="space-y-4"
				>
					<TabsList className="grid w-full grid-cols-3 max-w-md">
						<TabsTrigger value="subscriptions" className="gap-2">
							<Zap className="h-4 w-4" />
							Autopay
						</TabsTrigger>
						<TabsTrigger value="upcoming" className="gap-2">
							<Calendar className="h-4 w-4" />
							Upcoming
						</TabsTrigger>
						<TabsTrigger value="history" className="gap-2">
							<FileText className="h-4 w-4" />
							History
						</TabsTrigger>
					</TabsList>

					<TabsContent value="subscriptions">
						<SubscriptionsTab
							subscriptions={subscriptions ?? []}
							getPaymentMethodInfo={getPaymentMethodInfo}
							onPause={handlePause}
							onResume={handleResume}
							onCancel={handleCancel}
							actioningId={actioningId}
						/>
					</TabsContent>

					<TabsContent value="upcoming">
						<UpcomingPaymentsTab payments={upcomingPayments ?? []} />
					</TabsContent>

					<TabsContent value="history">
						<PaymentHistoryTab payments={paymentHistory ?? []} />
					</TabsContent>
				</Tabs>
			</BlurFade>
		</div>
	)
}
