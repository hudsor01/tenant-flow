/**
 * Subscriptions List Component
 * Phase 4: Autopay Subscriptions
 *
 * Main dashboard view for managing rent subscriptions
 */

'use client'

import { AddPaymentMethodDialog } from '@/app/(protected)/tenant/payments/add-payment-method-dialog'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import {
	useCancelSubscription,
	usePauseSubscription,
	useResumeSubscription,
	useSubscriptions
} from '@/hooks/api/use-subscriptions'
import type { RentSubscriptionResponse } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import {
	Calendar,
	CreditCard,
	DollarSign,
	MoreVertical,
	Pause,
	Play,
	Plus,
	X
} from 'lucide-react'
import { useState } from 'react'
import { CreateSubscriptionDialog } from './create-subscription-dialog'

type Lease = Database['public']['Tables']['lease']['Row'] & {
	Unit: Database['public']['Tables']['unit']['Row'] & {
		Property: Database['public']['Tables']['property']['Row']
	}
}

interface SubscriptionsListProps {
	leases: Lease[]
}

// Helper functions inlined from subscription-card.tsx
function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD'
	}).format(amount)
}

function getStatusVariant(
	status: RentSubscriptionResponse['status']
): 'default' | 'secondary' | 'destructive' | 'outline' {
	switch (status) {
		case 'active':
			return 'default'
		case 'paused':
			return 'secondary'
		case 'canceled':
		case 'past_due':
		case 'incomplete':
			return 'destructive'
		default:
			return 'outline'
	}
}

function formatStatus(status: RentSubscriptionResponse['status']): string {
	switch (status) {
		case 'active':
			return 'Active'
		case 'paused':
			return 'Paused'
		case 'canceled':
			return 'Canceled'
		case 'past_due':
			return 'Past Due'
		case 'incomplete':
			return 'Incomplete'
		default:
			return status
	}
}

/**
 * Main subscriptions list component
 */
export function SubscriptionsList({ leases }: SubscriptionsListProps) {
	const [showCreateDialog, setShowCreateDialog] = useState(false)
	const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false)
	const [showCancelDialog, setShowCancelDialog] = useState<string | null>(null)
	const [showPauseDialog, setShowPauseDialog] = useState<string | null>(null)

	const { data: subscriptions, isLoading, error } = useSubscriptions()
	const pauseSubscription = usePauseSubscription()
	const resumeSubscription = useResumeSubscription()
	const cancelSubscription = useCancelSubscription()

	const handleCreateSuccess = () => {
		// Query will auto-refresh via invalidation in the mutation
	}

	const handlePaymentMethodSuccess = () => {
		// Open create subscription dialog after payment method is added
		setShowCreateDialog(true)
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="h-8 w-8 animate-spin text-accent-main" />
			</div>
		)
	}

	if (error) {
		return (
			<div className="rounded-lg border border-system-red-25 bg-system-red-10 p-6">
				<p className="text-sm text-system-red-85">
					Failed to load subscriptions. Please try again.
				</p>
			</div>
		)
	}

	const activeSubscriptions =
		subscriptions?.filter(s => s.status === 'active') || []
	const inactiveSubscriptions =
		subscriptions?.filter(s => s.status !== 'active') || []

	return (
		<div className="space-y-6">
			{/* Header with Actions */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-title-1 font-semibold text-label-primary">
						Autopay Subscriptions
					</h2>
					<p className="text-sm text-label-secondary mt-1">
						Manage automatic rent payments for your leases
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => setShowPaymentMethodDialog(true)}
					>
						<CreditCard className="mr-2 h-4 w-4" />
						Add Payment Method
					</Button>
					<Button onClick={() => setShowCreateDialog(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Enable Autopay
					</Button>
				</div>
			</div>

			{/* Empty State */}
			{!subscriptions || subscriptions.length === 0 ? (
				<div className="rounded-lg border border-separator bg-fill-tertiary p-12 text-center">
					<div className="mx-auto max-w-sm space-y-4">
						<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
							<CreditCard className="h-6 w-6 text-accent-main" />
						</div>
						<div className="space-y-2">
							<h3 className="text-base font-semibold text-label-primary">
								No autopay subscriptions
							</h3>
							<p className="text-sm text-label-secondary">
								Set up automatic rent payments to never miss a payment. Your
								landlord will receive funds directly.
							</p>
						</div>
						<div className="flex justify-center gap-3">
							<Button
								variant="outline"
								onClick={() => setShowPaymentMethodDialog(true)}
							>
								Add Payment Method
							</Button>
							<Button onClick={() => setShowCreateDialog(true)}>
								Enable Autopay
							</Button>
						</div>
					</div>
				</div>
			) : (
				<>
					{/* Active Subscriptions */}
					{activeSubscriptions.length > 0 && (
						<div className="space-y-4">
							<h3 className="text-title-3 font-semibold text-label-primary">
								Active ({activeSubscriptions.length})
							</h3>
							<div className="grid gap-4 md:grid-cols-2">
								{activeSubscriptions.map(subscription => {
									const lease = leases.find(l => l.id === subscription.leaseId)
									const isProcessing =
										pauseSubscription.isPending ||
										resumeSubscription.isPending ||
										cancelSubscription.isPending

									return (
										<Card key={subscription.id}>
											<CardHeader>
												<div className="flex items-start justify-between">
													<div className="space-y-1">
														<CardTitle className="text-base">
															{lease?.Unit.Property.name &&
															lease?.Unit.unitNumber
																? `${lease.Unit.Property.name} - Unit ${lease.Unit.unitNumber}`
																: 'Subscription'}
														</CardTitle>
														<CardDescription>
															Autopay enabled for monthly rent
														</CardDescription>
													</div>
													<div className="flex items-center gap-2">
														<Badge
															variant={getStatusVariant(subscription.status)}
														>
															{formatStatus(subscription.status)}
														</Badge>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-8 w-8"
																	disabled={isProcessing}
																>
																	{isProcessing ? (
																		<Spinner className="h-4 w-4 animate-spin" />
																	) : (
																		<MoreVertical className="h-4 w-4" />
																	)}
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																{subscription.status === 'active' && (
																	<>
																		<DropdownMenuItem
																			onClick={() =>
																				setShowPauseDialog(subscription.id)
																			}
																		>
																			<Pause className="mr-2 h-4 w-4" />
																			Pause Subscription
																		</DropdownMenuItem>
																		<DropdownMenuSeparator />
																	</>
																)}
																{subscription.status === 'paused' && (
																	<>
																		<DropdownMenuItem
																			onClick={() =>
																				resumeSubscription.mutate(
																					subscription.id
																				)
																			}
																		>
																			<Play className="mr-2 h-4 w-4" />
																			Resume Subscription
																		</DropdownMenuItem>
																		<DropdownMenuSeparator />
																	</>
																)}
																{subscription.status !== 'canceled' && (
																	<DropdownMenuItem
																		onClick={() =>
																			setShowCancelDialog(subscription.id)
																		}
																		className="text-system-red-85"
																	>
																		<X className="mr-2 h-4 w-4" />
																		Cancel Subscription
																	</DropdownMenuItem>
																)}
															</DropdownMenuContent>
														</DropdownMenu>
													</div>
												</div>
											</CardHeader>
											<CardContent className="space-y-4">
												<div className="grid grid-cols-2 gap-4">
													<div className="space-y-1">
														<div className="flex items-center gap-2 text-label-tertiary">
															<DollarSign className="h-4 w-4" />
															<span className="text-xs uppercase tracking-wide">
																Amount
															</span>
														</div>
														<p className="text-lg font-semibold text-label-primary">
															{formatCurrency(subscription.amount)}
														</p>
													</div>
													<div className="space-y-1">
														<div className="flex items-center gap-2 text-label-tertiary">
															<Calendar className="h-4 w-4" />
															<span className="text-xs uppercase tracking-wide">
																Billing Day
															</span>
														</div>
														<p className="text-lg font-semibold text-label-primary">
															Day {subscription.billingDayOfMonth}
														</p>
													</div>
												</div>

												<div className="space-y-1">
													<div className="flex items-center gap-2 text-label-tertiary">
														<CreditCard className="h-4 w-4" />
														<span className="text-xs uppercase tracking-wide">
															Platform Fee
														</span>
													</div>
													<p className="text-sm text-label-secondary">
														{subscription.platformFeePercentage}% (
														{formatCurrency(
															subscription.amount *
																(subscription.platformFeePercentage / 100)
														)}
														)
													</p>
												</div>

												{subscription.status === 'active' && (
													<div className="rounded-lg bg-accent p-3">
														<p className="text-xs text-label-primary">
															Next charge on day{' '}
															{subscription.billingDayOfMonth} of next month
														</p>
													</div>
												)}

												{subscription.status === 'paused' &&
													subscription.pausedAt && (
														<div className="rounded-lg bg-fill-tertiary p-3">
															<p className="text-xs text-label-secondary">
																Paused on{' '}
																{new Date(
																	subscription.pausedAt
																).toLocaleDateString()}
															</p>
														</div>
													)}

												{subscription.status === 'canceled' &&
													subscription.canceledAt && (
														<div className="rounded-lg bg-system-red-10 p-3">
															<p className="text-xs text-system-red-85">
																Canceled on{' '}
																{new Date(
																	subscription.canceledAt
																).toLocaleDateString()}
															</p>
														</div>
													)}
											</CardContent>
										</Card>
									)
								})}
							</div>
						</div>
					)}

					{/* Inactive Subscriptions */}
					{inactiveSubscriptions.length > 0 && (
						<div className="space-y-4">
							<h3 className="text-title-3 font-semibold text-label-secondary">
								Inactive ({inactiveSubscriptions.length})
							</h3>
							<div className="grid gap-4 md:grid-cols-2">
								{inactiveSubscriptions.map(subscription => {
									const lease = leases.find(l => l.id === subscription.leaseId)
									const isProcessing =
										pauseSubscription.isPending ||
										resumeSubscription.isPending ||
										cancelSubscription.isPending

									return (
										<Card key={subscription.id}>
											<CardHeader>
												<div className="flex items-start justify-between">
													<div className="space-y-1">
														<CardTitle className="text-base">
															{lease?.Unit.Property.name &&
															lease?.Unit.unitNumber
																? `${lease.Unit.Property.name} - Unit ${lease.Unit.unitNumber}`
																: 'Subscription'}
														</CardTitle>
														<CardDescription>
															Autopay enabled for monthly rent
														</CardDescription>
													</div>
													<div className="flex items-center gap-2">
														<Badge
															variant={getStatusVariant(subscription.status)}
														>
															{formatStatus(subscription.status)}
														</Badge>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-8 w-8"
																	disabled={isProcessing}
																>
																	{isProcessing ? (
																		<Spinner className="h-4 w-4 animate-spin" />
																	) : (
																		<MoreVertical className="h-4 w-4" />
																	)}
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																{subscription.status === 'active' && (
																	<>
																		<DropdownMenuItem
																			onClick={() =>
																				setShowPauseDialog(subscription.id)
																			}
																		>
																			<Pause className="mr-2 h-4 w-4" />
																			Pause Subscription
																		</DropdownMenuItem>
																		<DropdownMenuSeparator />
																	</>
																)}
																{subscription.status === 'paused' && (
																	<>
																		<DropdownMenuItem
																			onClick={() =>
																				resumeSubscription.mutate(
																					subscription.id
																				)
																			}
																		>
																			<Play className="mr-2 h-4 w-4" />
																			Resume Subscription
																		</DropdownMenuItem>
																		<DropdownMenuSeparator />
																	</>
																)}
																{subscription.status !== 'canceled' && (
																	<DropdownMenuItem
																		onClick={() =>
																			setShowCancelDialog(subscription.id)
																		}
																		className="text-system-red-85"
																	>
																		<X className="mr-2 h-4 w-4" />
																		Cancel Subscription
																	</DropdownMenuItem>
																)}
															</DropdownMenuContent>
														</DropdownMenu>
													</div>
												</div>
											</CardHeader>
											<CardContent className="space-y-4">
												<div className="grid grid-cols-2 gap-4">
													<div className="space-y-1">
														<div className="flex items-center gap-2 text-label-tertiary">
															<DollarSign className="h-4 w-4" />
															<span className="text-xs uppercase tracking-wide">
																Amount
															</span>
														</div>
														<p className="text-lg font-semibold text-label-primary">
															{formatCurrency(subscription.amount)}
														</p>
													</div>
													<div className="space-y-1">
														<div className="flex items-center gap-2 text-label-tertiary">
															<Calendar className="h-4 w-4" />
															<span className="text-xs uppercase tracking-wide">
																Billing Day
															</span>
														</div>
														<p className="text-lg font-semibold text-label-primary">
															Day {subscription.billingDayOfMonth}
														</p>
													</div>
												</div>

												<div className="space-y-1">
													<div className="flex items-center gap-2 text-label-tertiary">
														<CreditCard className="h-4 w-4" />
														<span className="text-xs uppercase tracking-wide">
															Platform Fee
														</span>
													</div>
													<p className="text-sm text-label-secondary">
														{subscription.platformFeePercentage}% (
														{formatCurrency(
															subscription.amount *
																(subscription.platformFeePercentage / 100)
														)}
														)
													</p>
												</div>

												{subscription.status === 'paused' &&
													subscription.pausedAt && (
														<div className="rounded-lg bg-fill-tertiary p-3">
															<p className="text-xs text-label-secondary">
																Paused on{' '}
																{new Date(
																	subscription.pausedAt
																).toLocaleDateString()}
															</p>
														</div>
													)}

												{subscription.status === 'canceled' &&
													subscription.canceledAt && (
														<div className="rounded-lg bg-system-red-10 p-3">
															<p className="text-xs text-system-red-85">
																Canceled on{' '}
																{new Date(
																	subscription.canceledAt
																).toLocaleDateString()}
															</p>
														</div>
													)}
											</CardContent>
										</Card>
									)
								})}
							</div>
						</div>
					)}
				</>
			)}

			{/* Dialogs */}
			<CreateSubscriptionDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				leases={leases}
				onSuccess={handleCreateSuccess}
			/>

			<AddPaymentMethodDialog
				open={showPaymentMethodDialog}
				onOpenChange={setShowPaymentMethodDialog}
				onSuccess={handlePaymentMethodSuccess}
			/>

			{/* Pause Confirmation Dialog */}
			<AlertDialog
				open={!!showPauseDialog}
				onOpenChange={() => setShowPauseDialog(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Pause Autopay?</AlertDialogTitle>
						<AlertDialogDescription>
							Your subscription will be paused and no automatic charges will be
							made. You can resume at any time.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (showPauseDialog) {
									pauseSubscription.mutate(showPauseDialog, {
										onSuccess: () => setShowPauseDialog(null)
									})
								}
							}}
							disabled={pauseSubscription.isPending}
						>
							{pauseSubscription.isPending && (
								<Spinner className="mr-2 h-4 w-4 animate-spin" />
							)}
							Pause Subscription
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Cancel Confirmation Dialog */}
			<AlertDialog
				open={!!showCancelDialog}
				onOpenChange={() => setShowCancelDialog(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel Autopay?</AlertDialogTitle>
						<AlertDialogDescription>
							Your subscription will be canceled at the end of the current
							billing period. You will not be charged after that.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep Subscription</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (showCancelDialog) {
									cancelSubscription.mutate(showCancelDialog, {
										onSuccess: () => setShowCancelDialog(null)
									})
								}
							}}
							disabled={cancelSubscription.isPending}
							className="bg-system-red-85 text-white hover:bg-system-red-50"
						>
							{cancelSubscription.isPending && (
								<Spinner className="mr-2 h-4 w-4 animate-spin" />
							)}
							Cancel Subscription
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
