'use client'

import { format } from 'date-fns'
import {
	AlertCircle,
	AlertTriangle,
	CheckCircle,
	CreditCard,
	DollarSign,
	History,
	MoreVertical,
	Pause,
	Play,
	XCircle
} from 'lucide-react'

import { Spinner } from '#components/ui/spinner'
import type { PaymentMethodResponse } from '@repo/shared/types/core'
import { useState } from 'react'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#components/ui/tabs'

import {
	useFailedPaymentAttempts,
	usePaymentHistory
} from '#hooks/api/use-payment-history'
import { usePaymentMethods } from '#hooks/api/use-payment-methods'
import {
	useCancelSubscription,
	usePauseSubscription,
	useResumeSubscription,
	useSubscriptions
} from '#hooks/api/use-subscriptions'

export default function RentCollectionPage() {
	return <RentCollectionContent />
}

function RentCollectionContent() {
	const { data: subscriptions, isLoading } = useSubscriptions()
	const { data: paymentMethods } = usePaymentMethods()
	const { data: paymentHistory } = usePaymentHistory()
	const { data: failedAttempts } = useFailedPaymentAttempts()
	const pauseSubscription = usePauseSubscription()
	const resumeSubscription = useResumeSubscription()
	const cancelSubscription = useCancelSubscription()

	const [actioningId, setActioningId] = useState<string | null>(null)

	const handlePause = async (id: string) => {
		setActioningId(id)
		try {
			await pauseSubscription.mutateAsync(id)
		} finally {
			setActioningId(null)
		}
	}

	const handleResume = async (id: string) => {
		setActioningId(id)
		try {
			await resumeSubscription.mutateAsync(id)
		} finally {
			setActioningId(null)
		}
	}

	const handleCancel = async (id: string) => {
		setActioningId(id)
		try {
			await cancelSubscription.mutateAsync(id)
		} finally {
			setActioningId(null)
		}
	}

	const activeSubscriptions =
		subscriptions?.filter(s => s.status === 'active') || []
	const pausedSubscriptions =
		subscriptions?.filter(s => s.status === 'paused') || []
	const canceledSubscriptions =
		subscriptions?.filter(s => s.status === 'canceled') || []

	const totalMonthlyRevenue = activeSubscriptions.reduce(
		(sum, sub) => sum + (sub.amount || 0),
		0
	)

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'active':
				return <Badge variant="default">Active</Badge>
			case 'paused':
				return <Badge variant="outline">Paused</Badge>
			case 'canceled':
				return <Badge variant="destructive">Canceled</Badge>
			default:
				return <Badge variant="outline">{status}</Badge>
		}
	}

	const getPaymentMethodInfo = (paymentMethodId: string) => {
		const paymentMethod = paymentMethods?.find(
			(pm: PaymentMethodResponse) => pm.id === paymentMethodId
		)
		if (!paymentMethod) return null

		return {
			type: paymentMethod.type === 'card' ? 'Card' : 'Bank Account',
			last4: paymentMethod.last4,
			brand: paymentMethod.brand
		}
	}

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-foreground">
						Rent Collection
					</h1>
					<p className="text-muted-foreground mt-1">
						Manage tenant autopay subscriptions and payment history
					</p>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Monthly Revenue
						</CardTitle>
						<DollarSign className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							${(totalMonthlyRevenue / 100).toFixed(2)}
						</div>
						<p className="text-xs text-muted-foreground">
							From {activeSubscriptions.length} active subscriptions
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Active Subscriptions
						</CardTitle>
						<CheckCircle className="size-4 text-success" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{activeSubscriptions.length}
						</div>
						<p className="text-xs text-muted-foreground">
							Auto-collecting rent
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Paused Subscriptions
						</CardTitle>
						<Pause className="size-4 text-amber-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{pausedSubscriptions.length}
						</div>
						<p className="text-xs text-muted-foreground">Temporarily on hold</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Failed Payments
						</CardTitle>
						<AlertTriangle className="size-4 text-destructive" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{failedAttempts?.length || 0}
						</div>
						<p className="text-xs text-muted-foreground">Need attention</p>
					</CardContent>
				</Card>
			</div>

			{/* Subscriptions Table */}
			<Card>
				<CardHeader>
					<CardTitle>Tenant Subscriptions</CardTitle>
					<CardDescription>
						Manage automatic rent collection for all tenants
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue="active" className="space-y-4">
						<TabsList>
							<TabsTrigger value="active" className="flex items-center gap-2">
								Active ({activeSubscriptions.length})
							</TabsTrigger>
							<TabsTrigger value="paused" className="flex items-center gap-2">
								Paused ({pausedSubscriptions.length})
							</TabsTrigger>
							<TabsTrigger value="canceled" className="flex items-center gap-2">
								Canceled ({canceledSubscriptions.length})
							</TabsTrigger>
						</TabsList>

						<TabsContent value="active">
							{isLoading ? (
								<div className="flex items-center justify-center py-8">
									<Spinner className="size-8 animate-spin text-muted-foreground" />
								</div>
							) : activeSubscriptions.length === 0 ? (
								<div className="rounded-lg border p-8 text-center">
									<AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
									<p className="text-muted-foreground">
										No active subscriptions
									</p>
									<p className="text-sm text-muted-foreground mt-2">
										Create subscriptions for tenants to enable autopay
									</p>
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Tenant</TableHead>
											<TableHead>Property / Unit</TableHead>
											<TableHead>Amount</TableHead>
											<TableHead>Payment Method</TableHead>
											<TableHead>Next Charge</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{activeSubscriptions.map(sub => {
											const paymentMethodInfo = getPaymentMethodInfo(
												sub.paymentMethodId
											)

											return (
												<TableRow key={sub.id}>
													<TableCell className="font-medium">
														{sub.tenantId}
													</TableCell>
													<TableCell>{sub.leaseId}</TableCell>
													<TableCell>
														${(sub.amount / 100).toFixed(2)}/mo
													</TableCell>
													<TableCell>
														{paymentMethodInfo ? (
															<div className="flex items-center gap-2">
																<CreditCard className="size-4" />
																<span className="text-sm">
																	{paymentMethodInfo.type} ending in{' '}
																	{paymentMethodInfo.last4}
																</span>
															</div>
														) : (
															<span className="text-sm text-muted-foreground">
																No payment method
															</span>
														)}
													</TableCell>
													<TableCell>
														{sub.nextChargeDate
															? format(
																	new Date(sub.nextChargeDate),
																	'MMM d, yyyy'
																)
															: 'N/A'}
													</TableCell>
													<TableCell>{getStatusBadge(sub.status)}</TableCell>
													<TableCell className="text-right">
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="sm"
																	disabled={actioningId === sub.id}
																>
																	{actioningId === sub.id ? (
																		<Spinner className="size-4 animate-spin" />
																	) : (
																		<MoreVertical className="size-4" />
																	)}
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuLabel>Actions</DropdownMenuLabel>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	onClick={() => handlePause(sub.id)}
																>
																	<Pause className="mr-2 size-4" />
																	Pause Subscription
																</DropdownMenuItem>
																<DropdownMenuItem
																	onClick={() => handleCancel(sub.id)}
																	className="text-destructive"
																>
																	<XCircle className="mr-2 size-4" />
																	Cancel Subscription
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
							)}
						</TabsContent>

						<TabsContent value="paused">
							{pausedSubscriptions.length === 0 ? (
								<div className="rounded-lg border p-8 text-center">
									<p className="text-muted-foreground">
										No paused subscriptions
									</p>
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Tenant</TableHead>
											<TableHead>Property / Unit</TableHead>
											<TableHead>Amount</TableHead>
											<TableHead>Payment Method</TableHead>
											<TableHead>Paused On</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{pausedSubscriptions.map(sub => {
											const paymentMethodInfo = getPaymentMethodInfo(
												sub.paymentMethodId
											)

											return (
												<TableRow key={sub.id}>
													<TableCell className="font-medium">
														{sub.tenantId}
													</TableCell>
													<TableCell>{sub.leaseId}</TableCell>
													<TableCell>
														${(sub.amount / 100).toFixed(2)}/mo
													</TableCell>
													<TableCell>
														{paymentMethodInfo ? (
															<div className="flex items-center gap-2">
																<CreditCard className="size-4" />
																<span className="text-sm">
																	{paymentMethodInfo.type} ending in{' '}
																	{paymentMethodInfo.last4}
																</span>
															</div>
														) : (
															<span className="text-sm text-muted-foreground">
																No payment method
															</span>
														)}
													</TableCell>
													<TableCell>
														{sub.updatedAt
															? format(new Date(sub.updatedAt), 'MMM d, yyyy')
															: 'N/A'}
													</TableCell>
													<TableCell>{getStatusBadge(sub.status)}</TableCell>
													<TableCell className="text-right">
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button
																	variant="ghost"
																	size="sm"
																	disabled={actioningId === sub.id}
																>
																	{actioningId === sub.id ? (
																		<Spinner className="size-4 animate-spin" />
																	) : (
																		<MoreVertical className="size-4" />
																	)}
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuLabel>Actions</DropdownMenuLabel>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	onClick={() => handleResume(sub.id)}
																>
																	<Play className="mr-2 size-4" />
																	Resume Subscription
																</DropdownMenuItem>
																<DropdownMenuItem
																	onClick={() => handleCancel(sub.id)}
																	className="text-destructive"
																>
																	<XCircle className="mr-2 size-4" />
																	Cancel Subscription
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
							)}
						</TabsContent>

						<TabsContent value="canceled">
							{canceledSubscriptions.length === 0 ? (
								<div className="rounded-lg border p-8 text-center">
									<p className="text-muted-foreground">
										No canceled subscriptions
									</p>
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Tenant</TableHead>
											<TableHead>Property / Unit</TableHead>
											<TableHead>Amount</TableHead>
											<TableHead>Payment Method</TableHead>
											<TableHead>Canceled On</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{canceledSubscriptions.map(sub => {
											const paymentMethodInfo = getPaymentMethodInfo(
												sub.paymentMethodId
											)

											return (
												<TableRow key={sub.id}>
													<TableCell className="font-medium">
														{sub.tenantId}
													</TableCell>
													<TableCell>{sub.leaseId}</TableCell>
													<TableCell>
														${(sub.amount / 100).toFixed(2)}/mo
													</TableCell>
													<TableCell>
														{paymentMethodInfo ? (
															<div className="flex items-center gap-2">
																<CreditCard className="size-4" />
																<span className="text-sm">
																	{paymentMethodInfo.type} ending in{' '}
																	{paymentMethodInfo.last4}
																</span>
															</div>
														) : (
															<span className="text-sm text-muted-foreground">
																No payment method
															</span>
														)}
													</TableCell>
													<TableCell>
														{sub.updatedAt
															? format(new Date(sub.updatedAt), 'MMM d, yyyy')
															: 'N/A'}
													</TableCell>
													<TableCell>{getStatusBadge(sub.status)}</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
							)}
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			{/* Payment History Section */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<History className="size-5" />
						Payment History & Failed Attempts
					</CardTitle>
					<CardDescription>
						View recent payment activity and failed payment attempts across all
						subscriptions
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue="recent-payments" className="space-y-4">
						<TabsList>
							<TabsTrigger value="recent-payments">
								Recent Payments ({paymentHistory?.length || 0})
							</TabsTrigger>
							<TabsTrigger
								value="failed-attempts"
								className="flex items-center gap-2"
							>
								<AlertTriangle className="size-4" />
								Failed Attempts ({failedAttempts?.length || 0})
							</TabsTrigger>
						</TabsList>

						<TabsContent value="recent-payments">
							{!paymentHistory || paymentHistory.length === 0 ? (
								<div className="rounded-lg border p-8 text-center">
									<p className="text-muted-foreground">
										No payment history available
									</p>
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date</TableHead>
											<TableHead>Subscription</TableHead>
											<TableHead>Tenant</TableHead>
											<TableHead>Amount</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Description</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{paymentHistory.slice(0, 10).map(payment => (
											<TableRow key={payment.id}>
												<TableCell>
													{format(new Date(payment.createdAt), 'MMM d, yyyy')}
												</TableCell>
												<TableCell>{payment.subscriptionId}</TableCell>
												<TableCell>{payment.tenantId}</TableCell>
												<TableCell>
													${(payment.amount / 100).toFixed(2)}
												</TableCell>
												<TableCell>
													<Badge
														variant={
															payment.isSuccessful ? 'default' : 'destructive'
														}
													>
														{payment.status}
													</Badge>
												</TableCell>
												<TableCell className="max-w-xs truncate">
													{payment.description || 'Rent payment'}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</TabsContent>

						<TabsContent value="failed-attempts">
							{!failedAttempts || failedAttempts.length === 0 ? (
								<div className="rounded-lg border p-8 text-center">
									<p className="text-muted-foreground">
										No failed payment attempts
									</p>
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date</TableHead>
											<TableHead>Subscription</TableHead>
											<TableHead>Tenant</TableHead>
											<TableHead>Amount</TableHead>
											<TableHead>Attempt #</TableHead>
											<TableHead>Reason</TableHead>
											<TableHead>Next Retry</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{failedAttempts.slice(0, 10).map(attempt => (
											<TableRow key={attempt.id}>
												<TableCell>
													{format(new Date(attempt.createdAt), 'MMM d, yyyy')}
												</TableCell>
												<TableCell>{attempt.subscriptionId}</TableCell>
												<TableCell>{attempt.tenantId}</TableCell>
												<TableCell>
													${(attempt.amount / 100).toFixed(2)}
												</TableCell>
												<TableCell>{attempt.attemptNumber}</TableCell>
												<TableCell className="max-w-xs">
													<span className="text-sm text-destructive">
														{attempt.failureReason}
													</span>
												</TableCell>
												<TableCell>
													{attempt.nextRetryDate
														? format(new Date(attempt.nextRetryDate), 'MMM d')
														: 'No retry'}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	)
}
